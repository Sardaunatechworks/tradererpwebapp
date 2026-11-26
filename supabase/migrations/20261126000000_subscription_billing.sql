-- Phase 2.1: Subscription Plans Table & Seed Data

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (billing_interval IN ('none', 'monthly')),
    trial_days INTEGER NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
    branch_limit INTEGER CHECK (branch_limit IS NULL OR branch_limit >= 0),
    feature_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
    feature_entitlements JSONB NOT NULL DEFAULT '{}'::jsonb,
    paystack_plan_code TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON public.subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);

DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Seed Free and Pro plans (idempotent)
-- NULL in branch_limit or feature_limits represents unlimited.
-- Free numeric limits for products, monthly_sales, and customers start as NULL (configurable via Super Admin)
-- until final values are approved for production enforcement.
INSERT INTO public.subscription_plans (
    name,
    slug,
    description,
    price,
    currency,
    billing_interval,
    trial_days,
    branch_limit,
    feature_limits,
    feature_entitlements,
    is_active
)
VALUES
(
    'Free',
    'free',
    'Essential business management tools for single-workspace merchants.',
    0.00,
    'NGN',
    'none',
    0,
    1,
    '{"products": null, "monthly_sales": null, "customers": null}'::jsonb,
    '{"basic_reports": true, "advanced_reports": false, "data_export": false}'::jsonb,
    TRUE
),
(
    'Pro',
    'pro',
    'Full TraderERP power with unlimited capacity, advanced reporting, and data exports.',
    1000.00,
    'NGN',
    'monthly',
    7,
    NULL,
    '{"products": null, "monthly_sales": null, "customers": null}'::jsonb,
    '{"basic_reports": true, "advanced_reports": true, "data_export": true}'::jsonb,
    TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- Phase 2.2: Business Subscriptions & Permanent Trial History

CREATE TABLE IF NOT EXISTS public.business_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status VARCHAR(30) NOT NULL DEFAULT 'free' CHECK (
        status IN ('free', 'trialing', 'active', 'past_due', 'cancelled', 'expired')
    ),
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    trial_consumed_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    next_payment_date TIMESTAMPTZ,
    grace_period_ends_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    paystack_customer_code TEXT,
    paystack_subscription_code TEXT,
    paystack_email_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce one authoritative current subscription per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_subscriptions_one_current
    ON public.business_subscriptions(business_id)
    WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business ON public.business_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_status ON public.business_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_trial_ends ON public.business_subscriptions(trial_ends_at)
    WHERE status = 'trialing';
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_grace_ends ON public.business_subscriptions(grace_period_ends_at)
    WHERE status = 'past_due';
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_paystack_sub ON public.business_subscriptions(paystack_subscription_code)
    WHERE paystack_subscription_code IS NOT NULL;

DROP TRIGGER IF EXISTS trg_business_subscriptions_updated_at ON public.business_subscriptions;
CREATE TRIGGER trg_business_subscriptions_updated_at
    BEFORE UPDATE ON public.business_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Permanent database-level enforcement of one free trial per business
CREATE TABLE IF NOT EXISTS public.subscription_trial_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    activated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    trial_started_at TIMESTAMPTZ NOT NULL,
    trial_ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_trial_history_business ON public.subscription_trial_history(business_id);

-- Phase 2.3: Subscription Payments Table

CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.business_subscriptions(id) ON DELETE CASCADE,
    payment_reference VARCHAR(120) NOT NULL UNIQUE,
    paystack_transaction_id TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'success', 'failed', 'abandoned', 'reversed')
    ),
    payment_channel VARCHAR(50),
    gateway VARCHAR(30) NOT NULL DEFAULT 'paystack',
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    failure_reason TEXT,
    raw_gateway_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_business ON public.subscription_payments(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON public.subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON public.subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_tx_id ON public.subscription_payments(paystack_transaction_id)
    WHERE paystack_transaction_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_subscription_payments_updated_at ON public.subscription_payments;
CREATE TRIGGER trg_subscription_payments_updated_at
    BEFORE UPDATE ON public.subscription_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Phase 2.4: Subscription Usage Tracking Table

CREATE TABLE IF NOT EXISTS public.subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    metric_key VARCHAR(60) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_subscription_usage_business_metric_period
        UNIQUE (business_id, metric_key, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_lookup
    ON public.subscription_usage(business_id, metric_key, period_start, period_end);

DROP TRIGGER IF EXISTS trg_subscription_usage_updated_at ON public.subscription_usage;
CREATE TRIGGER trg_subscription_usage_updated_at
    BEFORE UPDATE ON public.subscription_usage
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Phase 2.5: Paystack Webhook Events Table (Idempotency & Retry Log)

CREATE TABLE IF NOT EXISTS public.subscription_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payment_reference VARCHAR(120),
    processing_status VARCHAR(30) NOT NULL DEFAULT 'received' CHECK (
        processing_status IN ('received', 'processed', 'failed', 'ignored')
    ),
    payload_metadata JSONB DEFAULT '{}'::jsonb,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscription_webhook_events_status
    ON public.subscription_webhook_events(processing_status, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_webhook_events_ref
    ON public.subscription_webhook_events(payment_reference)
    WHERE payment_reference IS NOT NULL;

-- Phase 2.6: Subscription Audit Logs Table

CREATE TABLE IF NOT EXISTS public.subscription_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.business_subscriptions(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_type VARCHAR(30) NOT NULL CHECK (
        actor_type IN ('owner', 'admin', 'staff', 'system', 'webhook', 'platform_admin')
    ),
    action VARCHAR(100) NOT NULL,
    previous_value JSONB DEFAULT '{}'::jsonb,
    new_value JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_logs_business
    ON public.subscription_audit_logs(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_logs_subscription
    ON public.subscription_audit_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_logs_action
    ON public.subscription_audit_logs(action);

-- Phase 2.7: Subscription Row Level Security (RLS) Policies

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_trial_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. subscription_plans: Authenticated users can read active plans
DROP POLICY IF EXISTS "Authenticated users can read active subscription plans" ON public.subscription_plans;
CREATE POLICY "Authenticated users can read active subscription plans"
    ON public.subscription_plans
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

-- 2. business_subscriptions: Tenant members can view their own business subscription
DROP POLICY IF EXISTS "Tenant members can view own business subscription" ON public.business_subscriptions;
CREATE POLICY "Tenant members can view own business subscription"
    ON public.business_subscriptions
    FOR SELECT
    TO authenticated
    USING (business_id = public.current_business_id());

-- 3. subscription_trial_history: Tenant members can view their own trial history
DROP POLICY IF EXISTS "Tenant members can view own trial history" ON public.subscription_trial_history;
CREATE POLICY "Tenant members can view own trial history"
    ON public.subscription_trial_history
    FOR SELECT
    TO authenticated
    USING (business_id = public.current_business_id());

-- 4. subscription_payments: Owners and admins can view their business payment history
DROP POLICY IF EXISTS "Owners and admins can view own subscription payments" ON public.subscription_payments;
CREATE POLICY "Owners and admins can view own subscription payments"
    ON public.subscription_payments
    FOR SELECT
    TO authenticated
    USING (
        business_id = public.current_business_id()
        AND public.current_user_role() IN ('owner', 'admin')
    );

-- 5. subscription_usage: Tenant members can view their business usage
DROP POLICY IF EXISTS "Tenant members can view own subscription usage" ON public.subscription_usage;
CREATE POLICY "Tenant members can view own subscription usage"
    ON public.subscription_usage
    FOR SELECT
    TO authenticated
    USING (business_id = public.current_business_id());

-- 6. subscription_audit_logs: Owners and admins can view their business subscription audit logs
DROP POLICY IF EXISTS "Owners and admins can view own subscription audit logs" ON public.subscription_audit_logs;
CREATE POLICY "Owners and admins can view own subscription audit logs"
    ON public.subscription_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        business_id = public.current_business_id()
        AND public.current_user_role() IN ('owner', 'admin')
    );

-- 7. subscription_webhook_events: No client policies (service role only)
-- All writes to subscription tables are performed exclusively via server-side service role or SECURITY DEFINER RPCs.

-- Phase 2.8: Subscription Database Functions, Triggers & Safe Existing Business Backfill

-- 1. Idempotent Free subscription provisioning
CREATE OR REPLACE FUNCTION public.provision_free_subscription(p_business_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id UUID;
    v_free_plan_id UUID;
    v_new_id UUID;
BEGIN
    SELECT id INTO v_existing_id
    FROM public.business_subscriptions
    WHERE business_id = p_business_id AND is_current = TRUE
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN v_existing_id;
    END IF;

    SELECT id INTO v_free_plan_id
    FROM public.subscription_plans
    WHERE slug = 'free'
    LIMIT 1;

    IF v_free_plan_id IS NULL THEN
        RAISE EXCEPTION 'Free subscription plan is not seeded.';
    END IF;

    INSERT INTO public.business_subscriptions (
        business_id,
        plan_id,
        status,
        is_current
    )
    VALUES (
        p_business_id,
        v_free_plan_id,
        'free',
        TRUE
    )
    ON CONFLICT (business_id) WHERE is_current = TRUE DO NOTHING
    RETURNING id INTO v_new_id;

    IF v_new_id IS NULL THEN
        SELECT id INTO v_new_id
        FROM public.business_subscriptions
        WHERE business_id = p_business_id AND is_current = TRUE
        LIMIT 1;
    ELSE
        INSERT INTO public.subscription_audit_logs (
            business_id,
            subscription_id,
            actor_type,
            action,
            new_value,
            metadata
        )
        VALUES (
            p_business_id,
            v_new_id,
            'system',
            'provision_free_subscription',
            jsonb_build_object('plan', 'free', 'status', 'free'),
            jsonb_build_object('source', 'database_provisioning')
        );
    END IF;

    RETURN v_new_id;
END;
$$;

-- 2. Automatically provision Free plan when a new business is created
CREATE OR REPLACE FUNCTION public.handle_new_business_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.provision_free_subscription(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_free_subscription_on_business_insert ON public.businesses;
CREATE TRIGGER trg_provision_free_subscription_on_business_insert
    AFTER INSERT ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_business_subscription();

-- 3. Atomic 7-day Pro Trial activation (enforces 1 trial per business + owner role)
CREATE OR REPLACE FUNCTION public.activate_business_trial(
    p_business_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member_role VARCHAR;
    v_sub RECORD;
    v_pro_plan_id UUID;
    v_trial_exists BOOLEAN;
    v_now TIMESTAMPTZ := NOW();
    v_trial_ends TIMESTAMPTZ := v_now + INTERVAL '7 days';
BEGIN
    -- Verify active business ownership
    SELECT role INTO v_member_role
    FROM public.business_members
    WHERE business_id = p_business_id
      AND user_id = p_user_id
      AND status = 'active'
    LIMIT 1;

    IF v_member_role IS NULL OR v_member_role <> 'owner' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'FORBIDDEN',
            'message', 'Only an active business owner can activate the 7-day Pro trial.'
        );
    END IF;

    -- Ensure business has a current subscription row and lock it for update
    PERFORM public.provision_free_subscription(p_business_id);

    SELECT bs.*, sp.slug AS plan_slug
    INTO v_sub
    FROM public.business_subscriptions bs
    JOIN public.subscription_plans sp ON sp.id = bs.plan_id
    WHERE bs.business_id = p_business_id AND bs.is_current = TRUE
    FOR UPDATE;

    -- Check permanent trial history
    SELECT EXISTS(
        SELECT 1 FROM public.subscription_trial_history WHERE business_id = p_business_id
    ) INTO v_trial_exists;

    IF v_trial_exists OR v_sub.trial_consumed_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'TRIAL_ALREADY_USED',
            'message', 'This business has already used its 7-day Pro trial.'
        );
    END IF;

    IF v_sub.status IN ('active', 'trialing') AND v_sub.plan_slug = 'pro' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_PRO',
            'message', 'Your business already has active Pro access.'
        );
    END IF;

    SELECT id INTO v_pro_plan_id
    FROM public.subscription_plans
    WHERE slug = 'pro' AND is_active = TRUE
    LIMIT 1;

    IF v_pro_plan_id IS NULL THEN
        RAISE EXCEPTION 'Active Pro plan not found.';
    END IF;

    -- Record permanent trial consumption (unique constraint on business_id prevents race conditions)
    INSERT INTO public.subscription_trial_history (
        business_id,
        activated_by_user_id,
        trial_started_at,
        trial_ends_at
    )
    VALUES (
        p_business_id,
        p_user_id,
        v_now,
        v_trial_ends
    );

    -- Update current subscription to Pro trialing
    UPDATE public.business_subscriptions
    SET
        plan_id = v_pro_plan_id,
        status = 'trialing',
        trial_started_at = v_now,
        trial_ends_at = v_trial_ends,
        trial_consumed_at = v_now,
        current_period_start = v_now,
        current_period_end = v_trial_ends,
        cancel_at_period_end = FALSE,
        cancelled_at = NULL,
        ended_at = NULL,
        updated_at = v_now
    WHERE id = v_sub.id;

    INSERT INTO public.subscription_audit_logs (
        business_id,
        subscription_id,
        actor_user_id,
        actor_type,
        action,
        previous_value,
        new_value,
        metadata
    )
    VALUES (
        p_business_id,
        v_sub.id,
        p_user_id,
        'owner',
        'activate_trial',
        jsonb_build_object('plan', v_sub.plan_slug, 'status', v_sub.status),
        jsonb_build_object('plan', 'pro', 'status', 'trialing', 'trial_ends_at', v_trial_ends),
        jsonb_build_object('duration_days', 7)
    );

    RETURN jsonb_build_object(
        'success', true,
        'subscription_id', v_sub.id,
        'trial_started_at', v_now,
        'trial_ends_at', v_trial_ends
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'TRIAL_ALREADY_USED',
            'message', 'This business has already used its 7-day Pro trial.'
        );
END;
$$;

-- 4. Idempotent Trial Expiration (restores Free entitlements without billing)
CREATE OR REPLACE FUNCTION public.expire_due_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_free_plan_id UUID;
    v_row RECORD;
    v_count INTEGER := 0;
BEGIN
    SELECT id INTO v_free_plan_id
    FROM public.subscription_plans
    WHERE slug = 'free'
    LIMIT 1;

    IF v_free_plan_id IS NULL THEN
        RAISE EXCEPTION 'Free plan not seeded.';
    END IF;

    FOR v_row IN
        SELECT bs.id, bs.business_id, bs.trial_ends_at
        FROM public.business_subscriptions bs
        WHERE bs.is_current = TRUE
          AND bs.status = 'trialing'
          AND bs.trial_ends_at IS NOT NULL
          AND bs.trial_ends_at <= NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.business_subscriptions
        SET
            plan_id = v_free_plan_id,
            status = 'free',
            current_period_start = NOW(),
            current_period_end = NULL,
            ended_at = NOW(),
            updated_at = NOW()
        WHERE id = v_row.id;

        INSERT INTO public.subscription_audit_logs (
            business_id,
            subscription_id,
            actor_type,
            action,
            previous_value,
            new_value,
            metadata
        )
        VALUES (
            v_row.business_id,
            v_row.id,
            'system',
            'expire_trial',
            jsonb_build_object('plan', 'pro', 'status', 'trialing'),
            jsonb_build_object('plan', 'free', 'status', 'free'),
            jsonb_build_object('trial_ends_at', v_row.trial_ends_at)
        );

        -- Notify business owner via existing notifications table if present
        INSERT INTO public.notifications (
            business_id,
            title,
            message,
            category,
            link
        )
        SELECT
            v_row.business_id,
            'Pro Trial Ended',
            'Your 7-day TraderERP Pro trial has ended and your workspace has returned to the Free plan. All your business records remain intact.',
            'system',
            '/settings/subscription';

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- 5. Idempotent Past-Due Grace Period Expiration
CREATE OR REPLACE FUNCTION public.expire_due_grace_periods()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_free_plan_id UUID;
    v_row RECORD;
    v_count INTEGER := 0;
BEGIN
    SELECT id INTO v_free_plan_id
    FROM public.subscription_plans
    WHERE slug = 'free'
    LIMIT 1;

    IF v_free_plan_id IS NULL THEN
        RAISE EXCEPTION 'Free plan not seeded.';
    END IF;

    FOR v_row IN
        SELECT bs.id, bs.business_id, bs.grace_period_ends_at
        FROM public.business_subscriptions bs
        WHERE bs.is_current = TRUE
          AND bs.status = 'past_due'
          AND bs.grace_period_ends_at IS NOT NULL
          AND bs.grace_period_ends_at <= NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.business_subscriptions
        SET
            plan_id = v_free_plan_id,
            status = 'expired',
            grace_period_ends_at = NULL,
            ended_at = NOW(),
            updated_at = NOW()
        WHERE id = v_row.id;

        INSERT INTO public.subscription_audit_logs (
            business_id,
            subscription_id,
            actor_type,
            action,
            previous_value,
            new_value,
            metadata
        )
        VALUES (
            v_row.business_id,
            v_row.id,
            'system',
            'expire_grace_period',
            jsonb_build_object('plan', 'pro', 'status', 'past_due'),
            jsonb_build_object('plan', 'free', 'status', 'expired'),
            jsonb_build_object('grace_period_ends_at', v_row.grace_period_ends_at)
        );

        INSERT INTO public.notifications (
            business_id,
            title,
            message,
            category,
            link
        )
        VALUES (
            v_row.business_id,
            'Subscription Downgraded to Free',
            'Your Pro renewal grace period has ended. Your workspace is now on the Free plan with all historical data preserved.',
            'system',
            '/settings/subscription'
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- 6. Safe backfill for all existing businesses without a current subscription
DO $$
DECLARE
    v_biz RECORD;
BEGIN
    FOR v_biz IN
        SELECT b.id
        FROM public.businesses b
        LEFT JOIN public.business_subscriptions bs
            ON bs.business_id = b.id AND bs.is_current = TRUE
        WHERE bs.id IS NULL
    LOOP
        PERFORM public.provision_free_subscription(v_biz.id);
    END LOOP;
END;
$$;

