-- CREATE REPAYMENTS TABLE FOR DEBT MANAGEMENT
CREATE TABLE IF NOT EXISTS public.repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0.00),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer')),
    recorded_by UUID NOT NULL REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.repayments ENABLE ROW LEVEL SECURITY;

-- POLICIES DEFINITIONS
CREATE POLICY repayments_select ON public.repayments 
  FOR SELECT TO authenticated 
  USING (business_id = public.current_business_id());

CREATE POLICY repayments_insert ON public.repayments 
  FOR INSERT TO authenticated 
  WITH CHECK (business_id = public.current_business_id());

CREATE POLICY repayments_block_update ON public.repayments 
  FOR UPDATE TO authenticated 
  USING (FALSE);

CREATE POLICY repayments_block_delete ON public.repayments 
  FOR DELETE TO authenticated 
  USING (FALSE);
