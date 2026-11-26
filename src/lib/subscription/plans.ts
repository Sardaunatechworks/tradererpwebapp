import { getSubscriptionAdminClient } from './admin-client';
import type { SubscriptionPlan } from './types';

function normalizePlan(row: Record<string, unknown>): SubscriptionPlan {
  return {
    ...(row as unknown as SubscriptionPlan),
    price: Number(row.price ?? 0),
    trial_days: Number(row.trial_days ?? 0),
    branch_limit: row.branch_limit === null || row.branch_limit === undefined ? null : Number(row.branch_limit),
    feature_limits: (row.feature_limits as Record<string, number | null>) || {},
    feature_entitlements: (row.feature_entitlements as Record<string, boolean>) || {},
  };
}

export async function getActivePlans(): Promise<SubscriptionPlan[]> {
  const admin = getSubscriptionAdminClient();
  const { data, error } = await admin
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) {
    throw new Error(`Failed to load subscription plans: ${error.message}`);
  }

  return (data || []).map(normalizePlan);
}

export async function getPlanBySlug(slug: string): Promise<SubscriptionPlan | null> {
  const admin = getSubscriptionAdminClient();
  const { data, error } = await admin
    .from('subscription_plans')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch plan "${slug}": ${error.message}`);
  }

  return data ? normalizePlan(data) : null;
}

export async function getPlanById(planId: string): Promise<SubscriptionPlan | null> {
  const admin = getSubscriptionAdminClient();
  const { data, error } = await admin
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch plan: ${error.message}`);
  }

  return data ? normalizePlan(data) : null;
}
