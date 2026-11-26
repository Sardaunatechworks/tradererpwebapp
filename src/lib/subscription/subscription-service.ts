import { getSubscriptionAdminClient } from './admin-client';
import { getPlanBySlug } from './plans';
import type {
  ActorType,
  BusinessSubscription,
  SubscriptionPayment,
  SubscriptionPlan,
} from './types';

export function isSubscriptionProEntitled(sub: BusinessSubscription | null): boolean {
  if (!sub) return false;
  const planSlug = sub.plan?.slug;
  if (planSlug !== 'pro') return false;

  const now = Date.now();

  if (sub.status === 'active') {
    return true;
  }

  if (sub.status === 'trialing') {
    return sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() > now : false;
  }

  if (sub.status === 'past_due') {
    // Retain Pro access during the configured grace period
    return sub.grace_period_ends_at ? new Date(sub.grace_period_ends_at).getTime() > now : false;
  }

  if (sub.status === 'cancelled') {
    // Cancelled subscriptions remain entitled until the end of the already-paid period
    return sub.current_period_end ? new Date(sub.current_period_end).getTime() > now : false;
  }

  return false;
}

export async function writeSubscriptionAuditLog(params: {
  businessId: string;
  subscriptionId?: string | null;
  actorUserId?: string | null;
  actorType: ActorType;
  action: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const admin = getSubscriptionAdminClient();
  const { error } = await admin.from('subscription_audit_logs').insert({
    business_id: params.businessId,
    subscription_id: params.subscriptionId ?? null,
    actor_user_id: params.actorUserId ?? null,
    actor_type: params.actorType,
    action: params.action,
    previous_value: params.previousValue ?? {},
    new_value: params.newValue ?? {},
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error('Failed to write subscription audit log:', error.message);
  }
}

export async function provisionFreeSubscription(businessId: string): Promise<string> {
  const admin = getSubscriptionAdminClient();
  const { data, error } = await admin.rpc('provision_free_subscription', {
    p_business_id: businessId,
  });

  if (error) {
    throw new Error(`Failed to provision Free subscription: ${error.message}`);
  }

  return data as string;
}

/**
 * Fetches the authoritative current subscription for a business.
 * Auto-provisions Free if missing, and reconciles expired trial/grace states lazily if needed.
 */
export async function getBusinessSubscription(
  businessId: string
): Promise<BusinessSubscription> {
  const admin = getSubscriptionAdminClient();

  const { data: initialData, error } = await admin
    .from('business_subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('business_id', businessId)
    .eq('is_current', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch business subscription: ${error.message}`);
  }

  let data = initialData;

  if (!data) {
    await provisionFreeSubscription(businessId);
    const refetched = await admin
      .from('business_subscriptions')
      .select('*, plan:subscription_plans(*)')
      .eq('business_id', businessId)
      .eq('is_current', true)
      .single();

    if (refetched.error || !refetched.data) {
      throw new Error('Failed to initialize business subscription.');
    }
    data = refetched.data;
  }

  const sub = normalizeSubscription(data);

  // Lazy safety reconciliation if a cron run hasn't processed an expired period yet
  const now = Date.now();
  if (sub.status === 'trialing' && sub.trial_ends_at && new Date(sub.trial_ends_at).getTime() <= now) {
    await admin.rpc('expire_due_trials');
    return getBusinessSubscriptionRaw(businessId);
  }

  if (sub.status === 'past_due' && sub.grace_period_ends_at && new Date(sub.grace_period_ends_at).getTime() <= now) {
    await admin.rpc('expire_due_grace_periods');
    return getBusinessSubscriptionRaw(businessId);
  }

  if (
    sub.status === 'cancelled' &&
    sub.current_period_end &&
    new Date(sub.current_period_end).getTime() <= now
  ) {
    await downgradeToFree({
      businessId,
      subscriptionId: sub.id,
      reason: 'cancelled_period_ended',
      actorType: 'system',
    });
    return getBusinessSubscriptionRaw(businessId);
  }

  return sub;
}

async function getBusinessSubscriptionRaw(businessId: string): Promise<BusinessSubscription> {
  const admin = getSubscriptionAdminClient();
  const { data, error } = await admin
    .from('business_subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('business_id', businessId)
    .eq('is_current', true)
    .single();

  if (error || !data) {
    throw new Error('Failed to fetch business subscription.');
  }
  return normalizeSubscription(data);
}

function normalizeSubscription(row: Record<string, unknown>): BusinessSubscription {
  const rawPlan = row.plan as Record<string, unknown> | undefined;
  const plan = rawPlan
    ? ({
        ...(rawPlan as unknown as SubscriptionPlan),
        price: Number(rawPlan.price ?? 0),
        trial_days: Number(rawPlan.trial_days ?? 0),
        branch_limit:
          rawPlan.branch_limit === null || rawPlan.branch_limit === undefined
            ? null
            : Number(rawPlan.branch_limit),
        feature_limits: (rawPlan.feature_limits as Record<string, number | null>) || {},
        feature_entitlements: (rawPlan.feature_entitlements as Record<string, boolean>) || {},
      } as SubscriptionPlan)
    : undefined;

  return {
    ...(row as unknown as BusinessSubscription),
    plan,
  };
}

export async function downgradeToFree(params: {
  businessId: string;
  subscriptionId: string;
  reason: string;
  actorType: ActorType;
  actorUserId?: string | null;
}) {
  const admin = getSubscriptionAdminClient();
  const freePlan = await getPlanBySlug('free');
  if (!freePlan) {
    throw new Error('Free plan not found.');
  }

  const { data: current } = await admin
    .from('business_subscriptions')
    .select('status, plan_id')
    .eq('id', params.subscriptionId)
    .single();

  const nowIso = new Date().toISOString();

  const { error } = await admin
    .from('business_subscriptions')
    .update({
      plan_id: freePlan.id,
      status: 'free',
      current_period_start: nowIso,
      current_period_end: null,
      next_payment_date: null,
      grace_period_ends_at: null,
      cancel_at_period_end: false,
      ended_at: nowIso,
      paystack_subscription_code: null,
      paystack_email_token: null,
      updated_at: nowIso,
    })
    .eq('id', params.subscriptionId)
    .eq('business_id', params.businessId);

  if (error) {
    throw new Error(`Failed to downgrade subscription: ${error.message}`);
  }

  await writeSubscriptionAuditLog({
    businessId: params.businessId,
    subscriptionId: params.subscriptionId,
    actorUserId: params.actorUserId,
    actorType: params.actorType,
    action: 'downgrade_to_free',
    previousValue: { status: current?.status, plan_id: current?.plan_id },
    newValue: { status: 'free', plan: 'free' },
    metadata: { reason: params.reason },
  });
}

export async function getBusinessPaymentHistory(
  businessId: string,
  limit = 25
): Promise<SubscriptionPayment[]> {
  const admin = getSubscriptionAdminClient();
  const { data, error } = await admin
    .from('subscription_payments')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch payment history: ${error.message}`);
  }

  return (data || []).map((row) => ({
    ...row,
    amount: Number(row.amount ?? 0),
  })) as SubscriptionPayment[];
}
