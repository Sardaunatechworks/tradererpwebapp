import { getPlanBySlug } from './plans';
import { getBusinessSubscription, isSubscriptionProEntitled } from './subscription-service';
import { getFeatureUsageCount } from './usage-service';
import type {
  BooleanFeatureKey,
  EntitlementResult,
  FeatureKey,
  LimitFeatureKey,
} from './types';

const BOOLEAN_FEATURES: BooleanFeatureKey[] = [
  'basic_reports',
  'advanced_reports',
  'data_export',
];

const FEATURE_LABELS: Record<FeatureKey, string> = {
  products: 'product',
  monthly_sales: 'monthly sale',
  customers: 'customer',
  branches: 'branch',
  basic_reports: 'basic reporting',
  advanced_reports: 'advanced reporting',
  data_export: 'data export',
};

/**
 * Central server-side entitlement check.
 * Resolves the authoritative subscription, effective plan (Free vs Pro), and live usage.
 */
export async function checkEntitlement(
  businessId: string,
  featureKey: FeatureKey
): Promise<EntitlementResult> {
  const subscription = await getBusinessSubscription(businessId);
  const proEntitled = isSubscriptionProEntitled(subscription);

  let effectivePlan = subscription.plan;
  if (!proEntitled && subscription.plan?.slug === 'pro') {
    const freePlan = await getPlanBySlug('free');
    if (freePlan) effectivePlan = freePlan;
  }

  const planSlug = effectivePlan?.slug || 'free';
  const upgradeAvailable = planSlug !== 'pro';

  // 1. Boolean feature check
  if ((BOOLEAN_FEATURES as string[]).includes(featureKey)) {
    const enabled = effectivePlan?.feature_entitlements?.[featureKey] === true;
    return {
      allowed: enabled,
      reason: enabled ? 'OK' : 'FEATURE_RESTRICTED',
      feature: featureKey,
      plan: planSlug,
      status: subscription.status,
      upgradeAvailable,
      message: enabled
        ? undefined
        : `Your ${effectivePlan?.name || 'Free'} plan does not include ${FEATURE_LABELS[featureKey]}. Upgrade to TraderERP Pro to unlock it.`,
    };
  }

  // 2. Numeric limit check
  const limitKey = featureKey as LimitFeatureKey;
  const rawLimit =
    limitKey === 'branches'
      ? effectivePlan?.branch_limit
      : effectivePlan?.feature_limits?.[limitKey];

  // NULL explicitly means unlimited; missing key is NOT treated as unlimited for non-pro unless explicitly null
  const limit =
    rawLimit === null
      ? null
      : typeof rawLimit === 'number'
      ? rawLimit
      : proEntitled
      ? null
      : 0;

  const currentUsage = await getFeatureUsageCount(businessId, limitKey);

  if (limit !== null && currentUsage >= limit) {
    return {
      allowed: false,
      reason: 'PLAN_LIMIT_REACHED',
      feature: featureKey,
      currentUsage,
      limit,
      plan: planSlug,
      status: subscription.status,
      upgradeAvailable,
      message: `You have reached your ${effectivePlan?.name || 'Free'} plan ${FEATURE_LABELS[featureKey]} limit (${currentUsage} of ${limit}). Upgrade to TraderERP Pro for higher limits.`,
    };
  }

  return {
    allowed: true,
    reason: 'OK',
    feature: featureKey,
    currentUsage,
    limit,
    plan: planSlug,
    status: subscription.status,
    upgradeAvailable,
  };
}

