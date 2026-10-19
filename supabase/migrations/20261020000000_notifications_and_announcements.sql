-- ==============================================================================
-- Migration: Notifications & Announcements System
-- Description: Adds tables, indexes, and RLS policies for in-app notifications,
--              platform announcements, and announcement dismissals.
-- ==============================================================================

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means all users in business
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('sale', 'inventory', 'credit', 'security', 'system')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for speedy queries on user unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_business_user ON public.notifications(business_id, user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications RLS:
-- Users can view notifications belonging to their business, targeted to them or broadcast to all
DROP POLICY IF EXISTS "Users can view their business notifications" ON public.notifications;
CREATE POLICY "Users can view their business notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        business_id = public.current_business_id()
        AND (user_id IS NULL OR user_id = auth.uid())
    );

-- Users can update (mark as read) their notifications
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (
        business_id = public.current_business_id()
        AND (user_id IS NULL OR user_id = auth.uid())
    )
    WITH CHECK (
        business_id = public.current_business_id()
        AND (user_id IS NULL OR user_id = auth.uid())
    );

-- Business members can insert notifications within their business
DROP POLICY IF EXISTS "Users can insert notifications for their business" ON public.notifications;
CREATE POLICY "Users can insert notifications for their business" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (business_id = public.current_business_id());

-- 2. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'important', 'maintenance')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'expired', 'archived')),
    target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'owners', 'staff')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_announcements_status_dates ON public.announcements(status, starts_at, expires_at);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view published, active announcements matching their audience
DROP POLICY IF EXISTS "Users can view published announcements" ON public.announcements;
CREATE POLICY "Users can view published announcements" ON public.announcements
    FOR SELECT TO authenticated
    USING (
        (
            status = 'published'
            AND starts_at <= timezone('utc'::text, now())
            AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
            AND (
                target_audience = 'all'
                OR (target_audience = 'owners' AND public.current_user_role() IN ('owner', 'admin'))
                OR (target_audience = 'staff' AND public.current_user_role() = 'staff')
            )
        )
        OR
        -- Super admin can view all announcements regardless of status
        ((current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role') = 'super_admin')
    );

-- Super admin full management
DROP POLICY IF EXISTS "Super admin can manage announcements" ON public.announcements;
CREATE POLICY "Super admin can manage announcements" ON public.announcements
    FOR ALL TO authenticated
    USING (
        (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role') = 'super_admin'
    )
    WITH CHECK (
        (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role') = 'super_admin'
    );

-- 3. ANNOUNCEMENT DISMISSALS TABLE
CREATE TABLE IF NOT EXISTS public.announcement_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_announcement_user UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dismissals_user ON public.announcement_dismissals(user_id);

ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dismissals" ON public.announcement_dismissals;
CREATE POLICY "Users can view own dismissals" ON public.announcement_dismissals
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own dismissals" ON public.announcement_dismissals;
CREATE POLICY "Users can insert own dismissals" ON public.announcement_dismissals
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
