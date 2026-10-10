-- =======================================================
-- TraderERP Platform Owner (Super Admin) Database Enhancements
-- Migration: 20261010000000_super_admin_enhancements.sql
-- =======================================================

-- 1. Allow audit_logs to capture platform-level events where no specific tenant business_id exists
ALTER TABLE IF EXISTS public.audit_logs 
    ALTER COLUMN business_id DROP NOT NULL;

-- 2. Extend app_feedback table with administrative triage status and notes if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'app_feedback' 
          AND column_name = 'status'
    ) THEN
        ALTER TABLE public.app_feedback ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'app_feedback' 
          AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE public.app_feedback ADD COLUMN admin_notes TEXT;
    END IF;
END $$;

-- 3. Indexes for fast platform admin reporting
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON public.businesses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 4. Row Level Security policy for Super Admin platform access
-- Authenticated users with app_metadata->>'role' = 'super_admin' can inspect all audit logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'audit_logs' 
          AND policyname = 'super_admin_read_all_audit_logs'
    ) THEN
        CREATE POLICY "super_admin_read_all_audit_logs"
        ON public.audit_logs
        FOR SELECT
        TO authenticated
        USING (
            (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role') = 'super_admin'
        );
    END IF;
END $$;
