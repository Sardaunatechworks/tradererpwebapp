-- ==============================================================================
-- Migration: Privacy, Consent & Account Deletion Requests
-- Description: Adds tables, indexes, and RLS policies for tracking user privacy
--              consents, onboarding completion, and account deletion requests.
-- ==============================================================================

-- 1. USER CONSENTS TABLE
CREATE TABLE IF NOT EXISTS public.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL, -- 'terms_and_privacy', 'marketing_emails', 'analytics_cookies'
    policy_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    granted BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_consent_type UNIQUE(user_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON public.user_consents(user_id);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Consents RLS: Users can only select and manage their own consents
DROP POLICY IF EXISTS "Users can view their own consents" ON public.user_consents;
CREATE POLICY "Users can view their own consents" ON public.user_consents
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own consents" ON public.user_consents;
CREATE POLICY "Users can insert their own consents" ON public.user_consents
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own consents" ON public.user_consents;
CREATE POLICY "Users can update their own consents" ON public.user_consents
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 2. ACCOUNT DELETION REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'rejected')),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user ON public.account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON public.account_deletion_requests(status);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Deletion Requests RLS:
-- Users can view their own deletion requests
DROP POLICY IF EXISTS "Users can view their own deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can view their own deletion requests" ON public.account_deletion_requests
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR
        ((current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role') = 'super_admin')
    );

-- Users can insert their own deletion request
DROP POLICY IF EXISTS "Users can insert their own deletion request" ON public.account_deletion_requests;
CREATE POLICY "Users can insert their own deletion request" ON public.account_deletion_requests
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can cancel their pending request, or super admin can update status
DROP POLICY IF EXISTS "Users can cancel or admin update deletion request" ON public.account_deletion_requests;
CREATE POLICY "Users can cancel or admin update deletion request" ON public.account_deletion_requests
    FOR UPDATE TO authenticated
    USING (
        (user_id = auth.uid() AND status = 'pending')
        OR
        ((current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role') = 'super_admin')
    )
    WITH CHECK (
        (user_id = auth.uid() AND status = 'cancelled')
        OR
        ((current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role') = 'super_admin')
    );

-- 3. USER ONBOARDING TOUR PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tour_completed BOOLEAN NOT NULL DEFAULT FALSE,
    tour_dismissed_at TIMESTAMPTZ,
    tour_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_preferences UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON public.user_preferences(user_id);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences" ON public.user_preferences
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
