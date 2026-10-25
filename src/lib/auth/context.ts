import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/supabase/config';

export const DEMO_BUSINESS_ID = 'd3300000-0000-0000-0000-000000000001';
export const DEMO_USER_ID = 'b8df3aee-f601-4594-b0b5-39563c07cfa0';

export interface AuthContext {
  user: User;
  businessId: string;
  role: string;
  supabase: SupabaseClient;
  isDemo: boolean;
}

export function getAdminClient(): SupabaseClient {
  return createAdminClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Returns authenticated session context.
 * In production: strictly requires an active authenticated Supabase user and businessId.
 * In demo mode (NEXT_PUBLIC_DEMO_MODE=true): safely falls back to the isolated DEMO_BUSINESS_ID
 * using the scoped administrative client for direct business owner access without login barriers.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && user.app_metadata?.business_id) {
    return {
      user,
      businessId: user.app_metadata.business_id,
      role: user.app_metadata.role || 'staff',
      supabase,
      isDemo: false,
    };
  }

  // Demo fallback when NEXT_PUBLIC_DEMO_MODE is active
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    const adminSupabase = getAdminClient();
    const mockDemoUser: Partial<User> = {
      id: DEMO_USER_ID,
      email: 'owner@apexmerchants.com.ng',
      app_metadata: {
        business_id: DEMO_BUSINESS_ID,
        role: 'owner',
      },
      user_metadata: {
        name: 'Alhaji Musa',
      },
    };

    return {
      user: mockDemoUser as User,
      businessId: DEMO_BUSINESS_ID,
      role: 'owner',
      supabase: adminSupabase,
      isDemo: true,
    };
  }

  throw new Error('Authentication required.');
}
