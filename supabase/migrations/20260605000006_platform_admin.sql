-- =======================================================
-- TraderERP Platform Owner (Super Admin) Database Schema
-- =======================================================

-- Modify CHECK constraint on public.users to allow super_admin role
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'super_admin'));

-- Drop existing platform tables to ensure correct column schema formatting
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.feature_flags CASCADE;
DROP TABLE IF EXISTS public.platform_settings CASCADE;
DROP TABLE IF EXISTS public.faq CASCADE;
DROP TABLE IF EXISTS public.global_permissions CASCADE;


-- 1. support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
    category VARCHAR(100) NOT NULL DEFAULT 'support' CHECK (category IN ('support', 'complaint', 'feedback', 'contact_request')),
    contact_email VARCHAR(255) NOT NULL,
    admin_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'broadcast', 'notification')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('user_activity', 'business_activity', 'security_event', 'system_event')),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. email_logs
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. feature_flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
    key VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. platform_settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. faq
CREATE TABLE IF NOT EXISTS public.faq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT UNIQUE NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. global_permissions
CREATE TABLE IF NOT EXISTS public.global_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MANAGER', 'STAFF')),
    permission VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (role, permission)
);

-- Enable RLS for all new tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_permissions ENABLE ROW LEVEL SECURITY;

-- Create Super Admin & Business Owner Access Policies for support_tickets
-- 1. support_tickets
CREATE POLICY super_admin_all_support_tickets ON public.support_tickets
    FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role' = 'super_admin');
CREATE POLICY select_own_support_tickets ON public.support_tickets
    FOR SELECT USING (current_business_id() = business_id);
CREATE POLICY insert_own_support_tickets ON public.support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id AND current_business_id() = business_id);
CREATE POLICY update_own_support_tickets ON public.support_tickets
    FOR UPDATE TO authenticated
    USING (current_business_id() = business_id AND auth.uid() = user_id)
    WITH CHECK (current_business_id() = business_id AND auth.uid() = user_id);

-- 2. announcements
CREATE POLICY super_admin_all_announcements ON public.announcements
    FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role' = 'super_admin');
CREATE POLICY public_read_announcements ON public.announcements
    FOR SELECT USING (true); -- Allow all users to read announcements

-- 3. audit_logs
CREATE POLICY super_admin_all_audit_logs ON public.audit_logs
    FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role' = 'super_admin');

-- 4. email_logs
CREATE POLICY super_admin_all_email_logs ON public.email_logs
    FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role' = 'super_admin');

-- 5. feature_flags
CREATE POLICY super_admin_all_feature_flags ON public.feature_flags
    FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role' = 'super_admin');
CREATE POLICY public_read_feature_flags ON public.feature_flags
    FOR SELECT USING (true);

-- 6. platform_settings
CREATE POLICY super_admin_all_platform_settings ON public.platform_settings
    FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role' = 'super_admin');

-- 7. faq
CREATE POLICY super_admin_all_faq ON public.faq
    FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role' = 'super_admin');
CREATE POLICY public_read_faq ON public.faq
    FOR SELECT USING (true);

-- 8. global_permissions
CREATE POLICY super_admin_all_global_permissions ON public.global_permissions
    FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role' = 'super_admin');
CREATE POLICY public_read_global_permissions ON public.global_permissions
    FOR SELECT USING (true);


-- =======================================================
-- SEED INITIAL DATA
-- =======================================================

-- 1. Feature Flags
INSERT INTO public.feature_flags (key, name, is_enabled, description) VALUES
('multi_branch_analytics', 'Multi-Branch Analytics', true, 'Enables enterprise-wide performance tracking across multiple outlets.'),
('sms_receipts', 'SMS Receipts Gateway', false, 'Allows POS terminals to dispatch digital transaction receipts via SMS.'),
('ai_profit_forecast', 'AI Profit Forecasting', false, 'Uses predictive modelling to project future monthly revenues and net profit targets.'),
('custom_branding', 'Custom Whitelabel Branding', false, 'Allows tenants to replace TraderERP badges with their own custom company logos.')
ON CONFLICT (key) DO NOTHING;

-- 2. Platform Settings
INSERT INTO public.platform_settings (key, value) VALUES
('branding', '{"appName": "TraderERP", "primaryColor": "#2563eb", "maintenanceMode": false}'::jsonb),
('smtp', '{"host": "smtp.resend.com", "port": 587, "sender": "auth@tradererp.com"}'::jsonb),
('billing_plans', '[{"id": "starter", "name": "Starter Plan", "price": 15000}, {"id": "growth", "name": "Growth Plan", "price": 30000}, {"id": "enterprise", "name": "Enterprise Plan", "price": 75000}]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. FAQs
INSERT INTO public.faq (question, answer) VALUES
('How do I add new staff?', 'Navigate to Staff Management in the sidebar and click Add Staff Member. Enter their email, name, and choose their role.'),
('How do I handle customer credit?', 'In the POS, select a customer and choose Store Credit as the payment method. This adds to their balance, which can be tracked and settled under the Debts CRM.'),
('Can I run multiple branches under a single license?', 'Yes, TraderERP supports unlimited branches. You can assign managers to specific branches and compare overall Performance on the Reports dashboard.')
ON CONFLICT (question) DO NOTHING;

-- 4. Global Permissions Mapping
INSERT INTO public.global_permissions (role, permission) VALUES
('OWNER', 'all_privileges'),
('OWNER', 'manage_branches'),
('OWNER', 'manage_staff'),
('OWNER', 'view_reports'),
('ADMIN', 'manage_branches'),
('ADMIN', 'manage_staff'),
('ADMIN', 'view_reports'),
('MANAGER', 'manage_inventory'),
('MANAGER', 'process_sales'),
('MANAGER', 'view_branch_reports'),
('STAFF', 'process_sales'),
('STAFF', 'view_inventory')
ON CONFLICT DO NOTHING;

-- 5. Default Tickets
INSERT INTO public.support_tickets (title, description, status, category, contact_email) VALUES
('Issue processing visa card payments', 'POS gets stuck trying to authorize card transactions at Outlet A.', 'open', 'complaint', 'manager.outleta@gmail.com'),
('Requesting refund for double-billing', 'Accidentally recorded customer payment twice. Requesting balance adjustment.', 'open', 'support', 'owner.store@trader.com'),
('Love the design & theme toggle!', 'The dark mode toggle is absolutely premium. Thanks for the clean update!', 'resolved', 'feedback', 'user192@gmail.com')
ON CONFLICT (title) DO NOTHING;

-- 6. Default Announcements
INSERT INTO public.announcements (title, content, type) VALUES
('Platform Upgrade Notice (v1.2.0)', 'We have added real-time realized profit metrics and multi-branch sales filters to your workspaces.', 'announcement'),
('System Maintenance Scheduled', 'Supabase databases will undergo brief scheduled maintenance this Sunday at 02:00 UTC.', 'notification')
ON CONFLICT (title) DO NOTHING;
