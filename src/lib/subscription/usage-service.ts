import { getSubscriptionAdminClient } from './admin-client';
import type { BusinessSubscription, LimitFeatureKey, UsageSummaryItem } from './types';

export function getMonthlyUsagePeriod(referenceDate = new Date()): {
  startIso: string;
  endIso: string;
  label: string;
} {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  const label = referenceDate.toLocaleDateString('en-NG', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label,
  };
}

export async function getFeatureUsageCount(
  businessId: string,
  feature: LimitFeatureKey
): Promise<number> {
  const admin = getSubscriptionAdminClient();

  if (feature === 'products') {
    const { count, error } = await admin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'active');
    if (error) throw new Error(`Failed to count products: ${error.message}`);
    return count ?? 0;
  }

  if (feature === 'customers') {
    const { count, error } = await admin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'active');
    if (error) throw new Error(`Failed to count customers: ${error.message}`);
    return count ?? 0;
  }

  if (feature === 'monthly_sales') {
    const { startIso, endIso } = getMonthlyUsagePeriod();
    const { count, error } = await admin
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .neq('status', 'cancelled')
      .gte('created_at', startIso)
      .lt('created_at', endIso);
    if (error) throw new Error(`Failed to count monthly sales: ${error.message}`);
    const usageCount = count ?? 0;

    // Persist monthly usage snapshot in subscription_usage
    await admin.from('subscription_usage').upsert(
      {
        business_id: businessId,
        metric_key: 'monthly_sales',
        period_start: startIso,
        period_end: endIso,
        usage_count: usageCount,
      },
      { onConflict: 'business_id,metric_key,period_start,period_end' }
    );

    return usageCount;
  }

  // Single-workspace fallback until multi-branch module exists
  return 1;
}

export async function getBusinessUsageSummary(
  businessId: string,
  subscription: BusinessSubscription
): Promise<UsageSummaryItem[]> {
  const limits = subscription.plan?.feature_limits || {};
  const { label: monthLabel } = getMonthlyUsagePeriod();

  const [productsCount, monthlySalesCount, customersCount] = await Promise.all([
    getFeatureUsageCount(businessId, 'products'),
    getFeatureUsageCount(businessId, 'monthly_sales'),
    getFeatureUsageCount(businessId, 'customers'),
  ]);

  const toLimit = (val: unknown): number | null =>
    val === null || val === undefined ? null : Number(val);

  const productsLimit = toLimit(limits.products);
  const salesLimit = toLimit(limits.monthly_sales);
  const customersLimit = toLimit(limits.customers);

  return [
    {
      feature: 'products',
      label: 'Active Products',
      currentUsage: productsCount,
      limit: productsLimit,
      periodLabel: 'Total active',
      isExceeded: productsLimit !== null && productsCount >= productsLimit,
    },
    {
      feature: 'monthly_sales',
      label: 'Monthly Sales',
      currentUsage: monthlySalesCount,
      limit: salesLimit,
      periodLabel: monthLabel,
      isExceeded: salesLimit !== null && monthlySalesCount >= salesLimit,
    },
    {
      feature: 'customers',
      label: 'Active Customers',
      currentUsage: customersCount,
      limit: customersLimit,
      periodLabel: 'Total active',
      isExceeded: customersLimit !== null && customersCount >= customersLimit,
    },
  ];
}

