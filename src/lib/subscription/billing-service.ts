import crypto from 'crypto';
import { getSubscriptionAdminClient } from './admin-client';
import { getPlanBySlug } from './plans';
import {
  getBusinessSubscription,
  writeSubscriptionAuditLog,
} from './subscription-service';
import {
  createOrFetchPaystackCustomer,
  disablePaystackSubscription,
  fetchPaystackSubscription,
  initializePaystackTransaction,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
} from './paystack';
import {
  PAST_DUE_GRACE_DAYS,
  PRO_MONTHLY_PRICE_KOBO,
  PRO_MONTHLY_PRICE_NGN,
} from './types';

function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export async function initializeProCheckout(params: {
  businessId: string;
  userId: string;
  userEmail: string;
  userName: string;
}): Promise<{ authorizationUrl: string; reference: string; accessCode: string }> {
  const admin = getSubscriptionAdminClient();
  const [subscription, proPlan] = await Promise.all([
    getBusinessSubscription(params.businessId),
    getPlanBySlug('pro'),
  ]);

  if (!proPlan || !proPlan.is_active) {
    throw new Error('TraderERP Pro plan is currently unavailable.');
  }

  if (subscription.plan?.slug === 'pro' && subscription.status === 'active') {
    throw new Error('Your business already has an active Pro subscription.');
  }

  const amountNgn = proPlan.price || PRO_MONTHLY_PRICE_NGN;
  const amountKobo = Math.round(amountNgn * 100) || PRO_MONTHLY_PRICE_KOBO;
  const paystackPlanCode =
    proPlan.paystack_plan_code || process.env.PAYSTACK_PRO_PLAN_CODE || null;

  // Create or retrieve Paystack customer
  let customerCode = subscription.paystack_customer_code;
  if (!customerCode) {
    const [firstName, ...rest] = params.userName.split(' ');
    const customer = await createOrFetchPaystackCustomer({
      email: params.userEmail,
      firstName: firstName || 'TraderERP',
      lastName: rest.join(' ') || 'Owner',
      businessId: params.businessId,
    });
    customerCode = customer.customer_code;

    await admin
      .from('business_subscriptions')
      .update({ paystack_customer_code: customerCode })
      .eq('id', subscription.id);
  }

  const reference = `TERP-${params.businessId.slice(0, 8).toUpperCase()}-${crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase()}`;

  // Store pending payment record before redirecting to Paystack
  const { error: payInsertErr } = await admin.from('subscription_payments').insert({
    business_id: params.businessId,
    subscription_id: subscription.id,
    payment_reference: reference,
    amount: amountNgn,
    currency: 'NGN',
    status: 'pending',
    gateway: 'paystack',
    raw_gateway_metadata: {
      initiated_by: params.userId,
      plan_slug: 'pro',
      paystack_plan_code: paystackPlanCode,
    },
  });

  if (payInsertErr) {
    throw new Error(`Failed to record pending payment: ${payInsertErr.message}`);
  }

  const callbackUrl = `${getAppBaseUrl()}/settings/subscription?payment_ref=${encodeURIComponent(reference)}`;

  const checkout = await initializePaystackTransaction({
    email: params.userEmail,
    amountKobo,
    reference,
    callbackUrl,
    planCode: paystackPlanCode,
    metadata: {
      business_id: params.businessId,
      subscription_id: subscription.id,
      user_id: params.userId,
      purpose: 'pro_subscription',
      custom_fields: [
        {
          display_name: 'Plan',
          variable_name: 'plan',
          value: 'TraderERP Pro (Monthly)',
        },
      ],
    },
  });

  await writeSubscriptionAuditLog({
    businessId: params.businessId,
    subscriptionId: subscription.id,
    actorUserId: params.userId,
    actorType: 'owner',
    action: 'checkout_initialized',
    newValue: { reference, amount: amountNgn, currency: 'NGN' },
  });

  return {
    authorizationUrl: checkout.authorization_url,
    reference: checkout.reference,
    accessCode: checkout.access_code,
  };
}

export async function verifyAndActivateProPayment(
  reference: string,
  expectedBusinessId?: string
): Promise<{
  verified: boolean;
  status: string;
  message: string;
  alreadyProcessed?: boolean;
}> {
  const admin = getSubscriptionAdminClient();
  const tx = await verifyPaystackTransaction(reference);

  if (tx.status !== 'success') {
    await admin
      .from('subscription_payments')
      .update({
        status: tx.status === 'abandoned' ? 'abandoned' : 'failed',
        paystack_transaction_id: String(tx.id),
        failure_reason: tx.gateway_response || `Payment status: ${tx.status}`,
      })
      .eq('payment_reference', reference);

    return {
      verified: false,
      status: tx.status,
      message: tx.gateway_response || 'Payment was not successful.',
    };
  }

  if (tx.currency !== 'NGN') {
    throw new Error(`Invalid payment currency: ${tx.currency}`);
  }

  const proPlan = await getPlanBySlug('pro');
  if (!proPlan) throw new Error('Pro plan not found.');

  const expectedKobo = Math.round((proPlan.price || PRO_MONTHLY_PRICE_NGN) * 100);
  if (tx.amount < expectedKobo) {
    throw new Error(`Insufficient payment amount: expected ${expectedKobo} kobo, got ${tx.amount} kobo.`);
  }

  const metaBusinessId = (tx.metadata?.business_id as string | undefined) || undefined;

  const { data: existingPayment } = await admin
    .from('subscription_payments')
    .select('*')
    .eq('payment_reference', reference)
    .maybeSingle();

  const resolvedBusinessId = expectedBusinessId || existingPayment?.business_id || metaBusinessId;
  if (!resolvedBusinessId) {
    throw new Error('Unable to resolve business workspace for this payment.');
  }

  if (expectedBusinessId && metaBusinessId && expectedBusinessId !== metaBusinessId) {
    throw new Error('Payment business mismatch.');
  }

  if (existingPayment?.status === 'success') {
    return {
      verified: true,
      status: 'success',
      alreadyProcessed: true,
      message: 'Payment already verified and Pro subscription is active.',
    };
  }

  const subscription = await getBusinessSubscription(resolvedBusinessId);
  const now = tx.paid_at ? new Date(tx.paid_at) : new Date();
  const baseStart =
    subscription.status === 'active' &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() > now.getTime()
      ? new Date(subscription.current_period_end)
      : now;
  const periodEnd = addMonths(baseStart, 1);

  const sanitizedMeta = {
    gateway_response: tx.gateway_response,
    channel: tx.channel,
    authorization_reusable: tx.authorization?.reusable ?? false,
    card_last4: tx.authorization?.last4 ?? null,
    card_brand: tx.authorization?.brand ?? null,
  };

  if (existingPayment) {
    await admin
      .from('subscription_payments')
      .update({
        paystack_transaction_id: String(tx.id),
        amount: tx.amount / 100,
        currency: tx.currency,
        status: 'success',
        payment_channel: tx.channel || tx.authorization?.channel || null,
        period_start: baseStart.toISOString(),
        period_end: periodEnd.toISOString(),
        paid_at: now.toISOString(),
        failure_reason: null,
        raw_gateway_metadata: sanitizedMeta,
      })
      .eq('id', existingPayment.id);
  } else {
    await admin.from('subscription_payments').insert({
      business_id: resolvedBusinessId,
      subscription_id: subscription.id,
      payment_reference: reference,
      paystack_transaction_id: String(tx.id),
      amount: tx.amount / 100,
      currency: tx.currency,
      status: 'success',
      payment_channel: tx.channel || tx.authorization?.channel || null,
      gateway: 'paystack',
      period_start: baseStart.toISOString(),
      period_end: periodEnd.toISOString(),
      paid_at: now.toISOString(),
      raw_gateway_metadata: sanitizedMeta,
    });
  }

  await admin
    .from('business_subscriptions')
    .update({
      plan_id: proPlan.id,
      status: 'active',
      current_period_start: baseStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_payment_date: periodEnd.toISOString(),
      grace_period_ends_at: null,
      cancel_at_period_end: false,
      cancelled_at: null,
      ended_at: null,
      paystack_customer_code: tx.customer?.customer_code || subscription.paystack_customer_code,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);

  await writeSubscriptionAuditLog({
    businessId: resolvedBusinessId,
    subscriptionId: subscription.id,
    actorType: 'system',
    action: 'payment_verified_pro_activated',
    previousValue: { status: subscription.status, plan: subscription.plan?.slug },
    newValue: {
      status: 'active',
      plan: 'pro',
      current_period_end: periodEnd.toISOString(),
    },
    metadata: { reference, paystack_transaction_id: String(tx.id) },
  });

  return {
    verified: true,
    status: 'success',
    message: 'Payment verified! Your TraderERP Pro subscription is now active.',
  };
}

export async function cancelProSubscription(params: {
  businessId: string;
  userId: string;
}): Promise<{ endsAt: string | null }> {
  const admin = getSubscriptionAdminClient();
  const subscription = await getBusinessSubscription(params.businessId);

  if (subscription.plan?.slug !== 'pro' || !['active', 'past_due'].includes(subscription.status)) {
    throw new Error('No active paid Pro subscription found to cancel.');
  }

  // Synchronize cancellation with Paystack so recurring billing stops
  if (subscription.paystack_subscription_code) {
    let emailToken = subscription.paystack_email_token;
    if (!emailToken) {
      const remoteSub = await fetchPaystackSubscription(subscription.paystack_subscription_code);
      emailToken = remoteSub.email_token;
    }

    if (!emailToken) {
      throw new Error('Unable to retrieve Paystack subscription token for cancellation.');
    }

    await disablePaystackSubscription({
      code: subscription.paystack_subscription_code,
      token: emailToken,
    });
  }

  const nowIso = new Date().toISOString();

  const { error } = await admin
    .from('business_subscriptions')
    .update({
      status: 'cancelled',
      cancel_at_period_end: true,
      cancelled_at: nowIso,
      next_payment_date: null,
      updated_at: nowIso,
    })
    .eq('id', subscription.id);

  if (error) {
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }

  await writeSubscriptionAuditLog({
    businessId: params.businessId,
    subscriptionId: subscription.id,
    actorUserId: params.userId,
    actorType: 'owner',
    action: 'cancel_subscription',
    previousValue: { status: subscription.status, cancel_at_period_end: false },
    newValue: {
      status: 'cancelled',
      cancel_at_period_end: true,
      access_until: subscription.current_period_end,
    },
  });

  return { endsAt: subscription.current_period_end };
}

export async function processPaystackWebhookEvent(
  rawBody: string,
  signatureHeader: string | null
): Promise<{ ok: boolean; statusCode: number; message: string }> {
  if (!verifyPaystackWebhookSignature(rawBody, signatureHeader)) {
    return { ok: false, statusCode: 401, message: 'Invalid webhook signature.' };
  }

  let payload: { event?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody) as { event?: string; data?: Record<string, unknown> };
  } catch {
    return { ok: false, statusCode: 400, message: 'Invalid JSON payload.' };
  }

  const eventType = String(payload?.event || 'unknown');
  const data = (payload?.data || {}) as {
    id?: number | string;
    reference?: string;
    subscription_code?: string;
    email_token?: string;
    next_payment_date?: string;
    amount?: number;
    currency?: string;
    gateway_response?: string;
    customer?: { customer_code?: string };
    subscription?: { subscription_code?: string };
  };
  const reference = data?.reference ? String(data.reference) : null;
  const gatewayEventId = data?.id
    ? `${eventType}:${data.id}`
    : `${eventType}:${crypto.createHash('sha256').update(rawBody).digest('hex')}`;

  const admin = getSubscriptionAdminClient();

  // Idempotency check
  const { data: existingEvent } = await admin
    .from('subscription_webhook_events')
    .select('id, processing_status')
    .eq('gateway_event_id', gatewayEventId)
    .maybeSingle();

  if (existingEvent?.processing_status === 'processed') {
    return { ok: true, statusCode: 200, message: 'Duplicate event ignored.' };
  }

  let eventRowId = existingEvent?.id;
  if (!eventRowId) {
    const { data: inserted, error: insErr } = await admin
      .from('subscription_webhook_events')
      .insert({
        gateway_event_id: gatewayEventId,
        event_type: eventType,
        payment_reference: reference,
        processing_status: 'received',
        payload_metadata: {
          event: eventType,
          reference,
          customer_code: data?.customer?.customer_code || null,
          subscription_code: data?.subscription_code || null,
        },
      })
      .select('id')
      .single();

    if (insErr) {
      // Unique race condition -> already received
      return { ok: true, statusCode: 200, message: 'Event already recorded.' };
    }
    eventRowId = inserted.id;
  }

  try {
    if (eventType === 'charge.success' && reference) {
      await verifyAndActivateProPayment(reference);
    } else if (eventType === 'subscription.create') {
      const subCode = data?.subscription_code;
      const emailToken = data?.email_token;
      const customerCode = data?.customer?.customer_code;
      const nextPaymentDate = data?.next_payment_date || null;

      if (subCode && customerCode) {
        await admin
          .from('business_subscriptions')
          .update({
            paystack_subscription_code: subCode,
            paystack_email_token: emailToken || null,
            next_payment_date: nextPaymentDate,
            updated_at: new Date().toISOString(),
          })
          .eq('paystack_customer_code', customerCode)
          .eq('is_current', true);
      }
    } else if (eventType === 'subscription.not_renew' || eventType === 'subscription.disable') {
      const subCode = data?.subscription_code;
      if (subCode) {
        const { data: sub } = await admin
          .from('business_subscriptions')
          .select('id, business_id, status')
          .eq('paystack_subscription_code', subCode)
          .eq('is_current', true)
          .maybeSingle();

        if (sub && sub.status !== 'cancelled') {
          await admin
            .from('business_subscriptions')
            .update({
              status: 'cancelled',
              cancel_at_period_end: true,
              cancelled_at: new Date().toISOString(),
              next_payment_date: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id);

          await writeSubscriptionAuditLog({
            businessId: sub.business_id,
            subscriptionId: sub.id,
            actorType: 'webhook',
            action: `webhook_${eventType}`,
            previousValue: { status: sub.status },
            newValue: { status: 'cancelled', cancel_at_period_end: true },
          });
        }
      }
    } else if (eventType === 'invoice.payment_failed' || eventType === 'charge.failed') {
      const customerCode = data?.customer?.customer_code;
      const subCode = data?.subscription?.subscription_code || data?.subscription_code;
      const query = subCode
        ? admin
            .from('business_subscriptions')
            .select('id, business_id, status')
            .eq('paystack_subscription_code', subCode)
            .eq('is_current', true)
            .maybeSingle()
        : customerCode
        ? admin
            .from('business_subscriptions')
            .select('id, business_id, status')
            .eq('paystack_customer_code', customerCode)
            .eq('is_current', true)
            .maybeSingle()
        : null;

      if (query) {
        const { data: sub } = await query;
        if (sub && sub.status === 'active') {
          const graceEnds = new Date(
            Date.now() + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000
          ).toISOString();

          await admin
            .from('business_subscriptions')
            .update({
              status: 'past_due',
              grace_period_ends_at: graceEnds,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id);

          if (reference) {
            await admin.from('subscription_payments').upsert(
              {
                business_id: sub.business_id,
                subscription_id: sub.id,
                payment_reference: reference,
                amount: Number(data?.amount || PRO_MONTHLY_PRICE_KOBO) / 100,
                currency: data?.currency || 'NGN',
                status: 'failed',
                gateway: 'paystack',
                failure_reason: data?.gateway_response || 'Recurring renewal payment failed.',
              },
              { onConflict: 'payment_reference' }
            );
          }

          await admin.from('notifications').insert({
            business_id: sub.business_id,
            title: 'Pro Renewal Payment Failed',
            message: `Your monthly Pro renewal failed. You have a ${PAST_DUE_GRACE_DAYS}-day grace period to complete payment before returning to Free.`,
            category: 'system',
            link: '/settings/subscription',
          });

          await writeSubscriptionAuditLog({
            businessId: sub.business_id,
            subscriptionId: sub.id,
            actorType: 'webhook',
            action: 'renewal_payment_failed',
            previousValue: { status: sub.status },
            newValue: { status: 'past_due', grace_period_ends_at: graceEnds },
          });
        }
      }
    }

    await admin
      .from('subscription_webhook_events')
      .update({
        processing_status: 'processed',
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', eventRowId);

    return { ok: true, statusCode: 200, message: 'Webhook processed.' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown webhook processing error';
    await admin
      .from('subscription_webhook_events')
      .update({
        processing_status: 'failed',
        error_message: message,
      })
      .eq('id', eventRowId);

    return {
      ok: false,
      statusCode: 500,
      message,
    };
  }
}
