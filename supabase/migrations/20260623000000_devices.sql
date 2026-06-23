-- Migration to create the devices table for authorized offline synchronization terminals
-- Scoped strictly to business_id and branch_id.

CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL, -- 'pos_terminal', 'mobile_register', etc.
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for devices scoped to current_business_id()
DROP POLICY IF EXISTS devices_select ON public.devices;
CREATE POLICY devices_select ON public.devices
    FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS devices_insert ON public.devices;
CREATE POLICY devices_insert ON public.devices
    FOR INSERT TO authenticated WITH CHECK (business_id = public.current_business_id());

DROP POLICY IF EXISTS devices_update ON public.devices;
CREATE POLICY devices_update ON public.devices
    FOR UPDATE TO authenticated USING (business_id = public.current_business_id())
    WITH CHECK (business_id = public.current_business_id());

DROP POLICY IF EXISTS devices_delete ON public.devices;
CREATE POLICY devices_delete ON public.devices
    FOR DELETE TO authenticated USING (business_id = public.current_business_id());
