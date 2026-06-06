-- Migration to update user status constraint to support RESTRICTED and DELETED states.
-- Safe execution: keeps existing user tables and transactions intact.

-- 1. Drop existing status check constraints
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;

-- 2. Create updated constraint supporting all states (ACTIVE, SUSPENDED, RESTRICTED, DELETED)
ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK (
  status IN ('ACTIVE', 'SUSPENDED', 'RESTRICTED', 'DELETED', 'active', 'suspended', 'restricted', 'deleted')
);
