export type PlanSlug = 'free' | 'pro';

export type SubscriptionStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired';

export type PaymentRecordStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'abandoned'
  | 'reversed';

export type WebhookProcessingStatus =
  | 'received'
  | 'processed'
  | 'failed'
  | 'ignored';

export type ActorType =
  | 'owner'
  | 'admin'
  | 'staff'
  | 'system'
  | 'webhook'
  | 'platform_admin';

export type LimitFeatureKey = 'products' | 'monthly_sales' | 'customers' | 'branches';
export type BooleanFeatureKey = 'basic_reports' | 'advanced_reports' | 'data_export';
export type FeatureKey = LimitFeatureKey | BooleanFeatureKey;

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: PlanSlug | string;
  description: string | null;
  price: number;
  currency: string;
  billing_interval: 'none' | 'monthly';
  trial_days: number;
  branch_limit: number | null;
  feature_limits: Record<string, number | null>;
  feature_entitlements: Record<string, boolean>;
  paystack_plan_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessSubscription {
  id: string;
  business_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  is_current: boolean;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_consumed_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_payment_date: string | null;
  grace_period_ends_at: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  ended_at: string | null;
  paystack_customer_code: string | null;
  paystack_subscription_code: string | null;
  paystack_email_token: string | null;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface SubscriptionPayment {
  id: string;
  business_id: string;
  subscription_id: string;
  payment_reference: string;
  paystack_transaction_id: string | null;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
  payment_channel: string | null;
  gateway: string;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  failure_reason: string | null;
  raw_gateway_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsageRecord {
  id: string;
  business_id: string;
  metric_key: string;
  period_start: string;
  period_end: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionAuditLog {
  id: string;
  business_id: string;
  subscription_id: string | null;
  actor_user_id: string | null;
  actor_type: ActorType;
  action: string;
  previous_value: Record<string, unknown>;
  new_value: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EntitlementResult {
  allowed: boolean;
  reason: 'OK' | 'PLAN_LIMIT_REACHED' | 'FEATURE_RESTRICTED' | 'SUBSCRIPTION_INACTIVE';
  feature: FeatureKey;
  currentUsage?: number;
  limit?: number | null;
  plan: string;
  status: SubscriptionStatus;
  upgradeAvailable: boolean;
  message?: string;
}

export interface UsageSummaryItem {
  feature: LimitFeatureKey;
  label: string;
  currentUsage: number;
  limit: number | null;
  periodLabel: string;
  isExceeded: boolean;
}

export interface TrialEligibilityResult {
  eligible: boolean;
  hasUsedTrial: boolean;
  reason?: string;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
}

export const PRO_MONTHLY_PRICE_NGN = 1000;
export const PRO_MONTHLY_PRICE_KOBO = 100000;
export const TRIAL_DURATION_DAYS = 7;
export const PAST_DUE_GRACE_DAYS = 3;

