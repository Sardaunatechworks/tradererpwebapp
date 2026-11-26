'use server';

import { revalidatePath } from 'next/cache';
import { resolveBusinessSubscriptionContext } from '@/lib/subscription/access-control';
import { getActivePlans } from '@/lib/subscription/plans';
import {
  getBusinessPaymentHistory,
  getBusinessSubscription,
  isSubscriptionProEntitled,
} from '@/lib/subscription/subscription-service';
import { checkTrialEligibility, activateTrial } from '@/lib/subscription/trial-service';
import { getBusinessUsageSummary } from '@/lib/subscription/usage-service';
import {
  cancelProSubscription,
  initializeProCheckout,
  verifyAndActivateProPayment,
} from '@/lib/subscription/billing-service';
import type {
  BusinessSubscription,
  SubscriptionPayment,
  SubscriptionPlan,
  TrialEligibilityResult,
  UsageSummaryItem,
} from '@/lib/subscription/types';
import type { TenantRole } from '@/types/database';

export interface SubscriptionOverviewPayload {
  subscription: BusinessSubscription;
  plans: SubscriptionPlan[];
  usage: UsageSummaryItem[];
  trialEligibility: TrialEligibilityResult;
  payments: SubscriptionPayment[];
  isProEntitled: boolean;
  userRole: TenantRole;
}

export async function getSubscriptionOverview(): Promise<{
  data?: SubscriptionOverviewPayload;
  error?: string;
}> {
  try {
    const ctx = await resolveBusinessSubscriptionContext({ requireWrite: false });
    const [subscription, plans, trialEligibility] = await Promise.all([
      getBusinessSubscription(ctx.businessId),
      getActivePlans(),
      checkTrialEligibility(ctx.businessId),
    ]);

    const [usage, payments] = await Promise.all([
      getBusinessUsageSummary(ctx.businessId, subscription),
      ctx.role === 'owner' || ctx.role === 'admin'
        ? getBusinessPaymentHistory(ctx.businessId)
        : Promise.resolve([]),
    ]);

    return {
      data: {
        subscription,
        plans,
        usage,
        trialEligibility,
        payments,
        isProEntitled: isSubscriptionProEntitled(subscription),
        userRole: ctx.role,
      },
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to load subscription details.' };
  }
}

export async function activateSevenDayTrial(): Promise<{
  success?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const ctx = await resolveBusinessSubscriptionContext({
      requireWrite: true,
      allowedRoles: ['owner'],
    });

    const result = await activateTrial({
      businessId: ctx.businessId,
      userId: ctx.userId,
    });

    if (!result.success) {
      return { error: result.message || 'Unable to activate trial.' };
    }

    revalidatePath('/settings/subscription');
    revalidatePath('/dashboard');
    return {
      success: true,
      message:
        'Your TraderERP Pro trial is now active. Enjoy seven days of access to Pro features. You will not be charged automatically when your trial ends.',
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to activate 7-day Pro trial.' };
  }
}

export async function startProUpgradeCheckout(): Promise<{
  authorizationUrl?: string;
  reference?: string;
  error?: string;
}> {
  try {
    const ctx = await resolveBusinessSubscriptionContext({
      requireWrite: true,
      allowedRoles: ['owner'],
    });

    const checkout = await initializeProCheckout({
      businessId: ctx.businessId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      userName: ctx.userName,
    });

    return {
      authorizationUrl: checkout.authorizationUrl,
      reference: checkout.reference,
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to initialize Paystack checkout.' };
  }
}

export async function verifySubscriptionPayment(reference: string): Promise<{
  verified?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    if (!reference?.trim()) {
      return { error: 'Payment reference is required.' };
    }

    const ctx = await resolveBusinessSubscriptionContext({
      requireWrite: false,
      allowedRoles: ['owner', 'admin'],
    });

    const result = await verifyAndActivateProPayment(reference.trim(), ctx.businessId);
    revalidatePath('/settings/subscription');
    revalidatePath('/dashboard');
    return {
      verified: result.verified,
      message: result.message,
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Payment verification failed.' };
  }
}

export async function cancelActiveProSubscription(): Promise<{
  success?: boolean;
  endsAt?: string | null;
  error?: string;
}> {
  try {
    const ctx = await resolveBusinessSubscriptionContext({
      requireWrite: true,
      allowedRoles: ['owner'],
    });

    const result = await cancelProSubscription({
      businessId: ctx.businessId,
      userId: ctx.userId,
    });

    revalidatePath('/settings/subscription');
    revalidatePath('/dashboard');
    return {
      success: true,
      endsAt: result.endsAt,
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to cancel subscription.' };
  }
}

export async function getTrialBannerState(): Promise<{
  status: string;
  planSlug: string;
  daysRemaining: number | null;
  endsAt: string | null;
} | null> {
  try {
    const ctx = await resolveBusinessSubscriptionContext({ requireWrite: false });
    const sub = await getBusinessSubscription(ctx.businessId);
    const now = Date.now();

    if (sub.status === 'trialing' && sub.trial_ends_at) {
      const diffMs = new Date(sub.trial_ends_at).getTime() - now;
      const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        status: 'trialing',
        planSlug: sub.plan?.slug || 'pro',
        daysRemaining: days,
        endsAt: sub.trial_ends_at,
      };
    }

    if (sub.status === 'past_due' && sub.grace_period_ends_at) {
      const diffMs = new Date(sub.grace_period_ends_at).getTime() - now;
      const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        status: 'past_due',
        planSlug: sub.plan?.slug || 'pro',
        daysRemaining: days,
        endsAt: sub.grace_period_ends_at,
      };
    }

    return null;
  } catch {
    return null;
  }
}
