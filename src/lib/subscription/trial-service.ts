import { getSubscriptionAdminClient } from './admin-client';
import { getBusinessSubscription, isSubscriptionProEntitled } from './subscription-service';
import type { TrialEligibilityResult } from './types';

export async function checkTrialEligibility(businessId: string): Promise<TrialEligibilityResult> {
  const admin = getSubscriptionAdminClient();

  const [{ data: trialRow }, subscription] = await Promise.all([
    admin
      .from('subscription_trial_history')
      .select('trial_started_at, trial_ends_at')
      .eq('business_id', businessId)
      .maybeSingle(),
    getBusinessSubscription(businessId),
  ]);

  if (trialRow || subscription.trial_consumed_at) {
    return {
      eligible: false,
      hasUsedTrial: true,
      reason: 'This business has already used its one-time 7-day Pro trial.',
      trialStartedAt: trialRow?.trial_started_at || subscription.trial_started_at,
      trialEndsAt: trialRow?.trial_ends_at || subscription.trial_ends_at,
    };
  }

  if (isSubscriptionProEntitled(subscription)) {
    return {
      eligible: false,
      hasUsedTrial: false,
      reason: 'This business already has active Pro access.',
    };
  }

  return {
    eligible: true,
    hasUsedTrial: false,
  };
}

export async function activateTrial(params: {
  businessId: string;
  userId: string;
}): Promise<{
  success: boolean;
  message?: string;
  code?: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
}> {
  const admin = getSubscriptionAdminClient();

  const { data, error } = await admin.rpc('activate_business_trial', {
    p_business_id: params.businessId,
    p_user_id: params.userId,
  });

  if (error) {
    throw new Error(`Failed to activate trial: ${error.message}`);
  }

  const result = data as {
    success: boolean;
    code?: string;
    message?: string;
    trial_started_at?: string;
    trial_ends_at?: string;
  };

  return {
    success: result.success,
    code: result.code,
    message: result.message,
    trialStartedAt: result.trial_started_at,
    trialEndsAt: result.trial_ends_at,
  };
}

export async function expireDueTrials(): Promise<number> {
  const admin = getSubscriptionAdminClient();
  const { data, error } = await admin.rpc('expire_due_trials');
  if (error) {
    throw new Error(`Failed to expire due trials: ${error.message}`);
  }
  return Number(data ?? 0);
}

