-- Migration to add staff management features to the users table
-- Safe execution: does not drop existing tables or delete existing user data.

-- 1. Add new columns to public.users if they do not exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- 2. Modify constraint on users.status to support upper case statuses
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'SUSPENDED', 'active', 'suspended'));

-- 3. Capitalize existing status values
UPDATE public.users SET status = 'ACTIVE' WHERE status IN ('active', 'ACTIVE');
UPDATE public.users SET status = 'SUSPENDED' WHERE status IN ('suspended', 'SUSPENDED');

-- 4. Set DEFAULT status to 'ACTIVE' for new records
ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'ACTIVE';

-- 5. Update the auth user trigger function handle_new_auth_user
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id UUID;
  v_role VARCHAR;
  v_must_change_password BOOLEAN;
  v_phone VARCHAR;
BEGIN
  v_business_id := NULLIF(NEW.raw_app_meta_data->>'business_id', '')::UUID;
  v_role := COALESCE(NULLIF(NEW.raw_app_meta_data->>'role', ''), 'STAFF')::VARCHAR;
  v_must_change_password := COALESCE((NEW.raw_app_meta_data->>'must_change_password')::BOOLEAN, TRUE);
  v_phone := NEW.raw_user_meta_data->>'phone';

  INSERT INTO public.users (id, business_id, email, name, role, status, must_change_password, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    v_business_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    v_role,
    'ACTIVE',
    v_must_change_password,
    v_phone,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      business_id = COALESCE(v_business_id, public.users.business_id),
      name = COALESCE(NEW.raw_user_meta_data->>'name', public.users.name),
      role = COALESCE(v_role, public.users.role),
      must_change_password = COALESCE(v_must_change_password, public.users.must_change_password),
      phone = COALESCE(v_phone, public.users.phone),
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply the auth trigger to capture update/insert actions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
