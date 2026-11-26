'use server';

import { revalidatePath } from 'next/cache';
import { getSuperAdminContext } from './admin';
import { writeSubscriptionAuditLog } from '@/lib/subscription/subscription-service';
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/subscription/types';

export interface AdminSubscriptionStats {
  totalFree: number;
  activePro: number;
  trialing: number;
  pastDue: number;
  expired: number;
  cancelled: number;
  verifiedMrr: number;
  grossCollections: number;
  failedPaymentsCount: number;
}

export interface AdminBusinessSubscriptionRow {
  id: string;
  business_id: string;
  business_name: string;
  business_email: string | null;
  plan_id: string;
  plan_slug: string;
  plan_name: string;
  status: SubscriptionStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  next_payment_date: string | null;
  cancel_at_period_end: boolean;
  paystack_customer_code: string | null;
  updated_at: string;
}

export interface AdminWebhookFailureRow {
  id: string;
  gateway_event_id: string;
  event_type: string;
  payment_reference: string | null;
  processing_status: string;
  error_message: string | null;
  received_at: string;
}

export interface AdminAuditLogRow {
  id: string;
  business_id: string;
  action: string;
  actor_type: string;
  created_at: string;
  business?: { name?: string } | null;
}

export interface AdminSubscriptionDashboardPayload {
  stats: AdminSubscriptionStats;
  subscriptions: AdminBusinessSubscriptionRow[];
  plans: SubscriptionPlan[];
  webhookFailures: AdminWebhookFailureRow[];
  recentAuditLogs: AdminAuditLogRow[];
}

export async function getAdminSubscriptionDashboard(): Promise<{
  data?: AdminSubscriptionDashboardPayload;
  error?: string;
}> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    const [
      { data: subs },
      { data: plans },
      { data: payments },
      { data: webhookFailures },
      { data: auditLogs },
    ] = await Promise.all([
      supabaseAdmin
        .from('business_subscriptions')
        .select('*, business:businesses(id, name, email), plan:subscription_plans(id, slug, name, price)')
        .eq('is_current', true)
        .order('updated_at', { ascending: false }),
      supabaseAdmin
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true }),
      supabaseAdmin
        .from('subscription_payments')
        .select('amount, status, paid_at'),
      supabaseAdmin
        .from('subscription_webhook_events')
        .select('id, gateway_event_id, event_type, payment_reference, processing_status, error_message, received_at')
        .eq('processing_status', 'failed')
        .order('received_at', { ascending: false })
        .limit(25),
      supabaseAdmin
        .from('subscription_audit_logs')
        .select('*, business:businesses(name)')
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

    const subRows: AdminBusinessSubscriptionRow[] = (subs || []).map((row) => {
      const biz = row.business as { name?: string; email?: string | null } | null;
      const plan = row.plan as { slug?: string; name?: string } | null;
      return {
        id: row.id,
        business_id: row.business_id,
        business_name: biz?.name || 'Unknown Business',
        business_email: biz?.email || null,
        plan_id: row.plan_id,
        plan_slug: plan?.slug || 'free',
        plan_name: plan?.name || 'Free',
        status: row.status as SubscriptionStatus,
        trial_started_at: row.trial_started_at,
        trial_ends_at: row.trial_ends_at,
        current_period_end: row.current_period_end,
        next_payment_date: row.next_payment_date,
        cancel_at_period_end: Boolean(row.cancel_at_period_end),
        paystack_customer_code: row.paystack_customer_code,
        updated_at: row.updated_at,
      };
    });

    const totalFree = subRows.filter((s) => s.plan_slug === 'free' && s.status === 'free').length;
    const activePro = subRows.filter((s) => s.plan_slug === 'pro' && s.status === 'active').length;
    const trialing = subRows.filter((s) => s.status === 'trialing').length;
    const pastDue = subRows.filter((s) => s.status === 'past_due').length;
    const expired = subRows.filter((s) => s.status === 'expired').length;
    const cancelled = subRows.filter((s) => s.status === 'cancelled').length;

    // Verified MRR counts only active paid Pro subscriptions with a verified successful payment
    const proPlanRow = (plans || []).find((p) => p.slug === 'pro');
    const proPrice = Number(proPlanRow?.price ?? 1000);
    const verifiedSuccessPayments = (payments || []).filter((p) => p.status === 'success');
    const grossCollections = verifiedSuccessPayments.reduce(
      (sum: number, p) => sum + Number(p.amount || 0),
      0
    );
    const failedPaymentsCount = (payments || []).filter((p) => p.status === 'failed').length;
    const verifiedMrr = activePro * proPrice;

    return {
      data: {
        stats: {
          totalFree,
          activePro,
          trialing,
          pastDue,
          expired,
          cancelled,
          verifiedMrr,
          grossCollections,
          failedPaymentsCount,
        },
        subscriptions: subRows,
        plans: (plans || []).map((p) => ({
          ...(p as unknown as SubscriptionPlan),
          price: Number(p.price ?? 0),
        })),
        webhookFailures: (webhookFailures || []) as AdminWebhookFailureRow[],
        recentAuditLogs: (auditLogs || []) as AdminAuditLogRow[],
      },
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to load subscription admin data.' };
  }
}

export async function adminUpdatePlanConfig(params: {
  planId: string;
  productsLimit: number | null;
  monthlySalesLimit: number | null;
  customersLimit: number | null;
  advancedReports: boolean;
  dataExport: boolean;
  paystackPlanCode: string | null;
}): Promise<{ success?: boolean; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    const { error } = await supabaseAdmin
      .from('subscription_plans')
      .update({
        feature_limits: {
          products: params.productsLimit,
          monthly_sales: params.monthlySalesLimit,
          customers: params.customersLimit,
        },
        feature_entitlements: {
          basic_reports: true,
          advanced_reports: params.advancedReports,
          data_export: params.dataExport,
        },
        paystack_plan_code: params.paystackPlanCode?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.planId);

    if (error) throw error;

    revalidatePath('/admin');
    revalidatePath('/settings/subscription');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to update plan configuration.' };
  }
}

export async function adminOverrideBusinessSubscription(params: {
  businessId: string;
  targetPlanSlug: 'free' | 'pro';
  targetStatus: SubscriptionStatus;
  reason: string;
}): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!params.reason?.trim()) {
      return { error: 'A documented reason is required for every manual subscription override.' };
    }

    const { user, supabaseAdmin } = await getSuperAdminContext();

    const [{ data: currentSub }, { data: targetPlan }] = await Promise.all([
      supabaseAdmin
        .from('business_subscriptions')
        .select('*, plan:subscription_plans(slug)')
        .eq('business_id', params.businessId)
        .eq('is_current', true)
        .single(),
      supabaseAdmin
        .from('subscription_plans')
        .select('id, slug')
        .eq('slug', params.targetPlanSlug)
        .single(),
    ]);

    if (!currentSub || !targetPlan) {
      return { error: 'Business subscription or target plan not found.' };
    }

    const now = new Date();
    const periodEnd =
      params.targetPlanSlug === 'pro' && params.targetStatus === 'active'
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    // Manual activation does NOT create a false Paystack payment record
    const { error } = await supabaseAdmin
      .from('business_subscriptions')
      .update({
        plan_id: targetPlan.id,
        status: params.targetStatus,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd,
        updated_at: now.toISOString(),
      })
      .eq('id', currentSub.id);

    if (error) throw error;

    await writeSubscriptionAuditLog({
      businessId: params.businessId,
      subscriptionId: currentSub.id,
      actorUserId: user.id,
      actorType: 'platform_admin',
      action: 'admin_manual_override',
      previousValue: {
        plan: currentSub.plan?.slug,
        status: currentSub.status,
      },
      newValue: {
        plan: params.targetPlanSlug,
        status: params.targetStatus,
      },
      metadata: { reason: params.reason.trim() },
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to apply manual override.' };
  }
}
