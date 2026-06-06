-- Add branch_id to customers table to support multi-branch registration scoping
ALTER TABLE public.customers
ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
