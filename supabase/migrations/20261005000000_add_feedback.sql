-- =======================================================
-- TraderERP MVP — App Feedback Table
-- =======================================================

CREATE TABLE IF NOT EXISTS public.app_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    business_name VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    category VARCHAR(50) NOT NULL DEFAULT 'experience',
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for querying feedback
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.app_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_business_id ON public.app_feedback(business_id);

-- Enable Row Level Security
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert feedback
CREATE POLICY "allow_authenticated_feedback_insert"
ON public.app_feedback
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view their own feedback
CREATE POLICY "allow_users_view_own_feedback"
ON public.app_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
