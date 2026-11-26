import { createClient } from '@/lib/supabase/server';
import { validateReadAccess, validateWriteAccess } from '@/lib/security';
import { getSubscriptionAdminClient } from './admin-client';
import type { TenantRole } from '@/types/database';

export interface SubscriptionAuthContext {
  userId: string;
  userEmail: string;
  userName: string;
  businessId: string;
  role: TenantRole;
}

/**
 * Resolves the authenticated user, validates account status, and verifies
 * active membership in their business workspace directly against the database.
 */
export async function resolveBusinessSubscriptionContext(options?: {
  requireWrite?: boolean;
  allowedRoles?: TenantRole[];
}): Promise<SubscriptionAuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Authentication required.');
  }

  if (options?.requireWrite) {
    await validateWriteAccess(supabase, user.id);
  } else {
    await validateReadAccess(supabase, user.id);
  }

  const businessId = user.app_metadata?.business_id as string | undefined;
  if (!businessId) {
    throw new Error('No business workspace context found.');
  }

  // Verify live membership and role in database (never trust client or stale claims alone)
  const adminClient = getSubscriptionAdminClient();
  const { data: membership, error: memberError } = await adminClient
    .from('business_members')
    .select('role, status')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (memberError || !membership || membership.status !== 'active') {
    throw new Error('Active business membership not found.');
  }

  const role = membership.role as TenantRole;
  if (options?.allowedRoles && !options.allowedRoles.includes(role)) {
    throw new Error('You do not have permission to perform this subscription action.');
  }

  return {
    userId: user.id,
    userEmail: user.email || '',
    userName: (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'Business Owner',
    businessId,
    role,
  };
}

