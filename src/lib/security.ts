import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Validates that the current user account is active and has write privileges.
 * Directly queries the live database to bypass static JWT claims status latency.
 */
export async function validateWriteAccess(supabase: SupabaseClient, userId: string) {
  const { data: profile, error } = await supabase
    .from('users')
    .select('status, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error('User authorization profile not found.');
  }

  const status = profile.status?.toUpperCase() || 'ACTIVE';

  if (status === 'SUSPENDED' || status === 'DELETED') {
    throw new Error('Your account has been suspended or deleted. Access denied.');
  }

  if (status === 'RESTRICTED') {
    throw new Error('Your account is currently restricted and write operations are blocked.');
  }
}

/**
 * Validates that the current user account is active and has read privileges.
 * Directly queries the live database to check suspension or deletion.
 */
export async function validateReadAccess(supabase: SupabaseClient, userId: string) {
  const { data: profile, error } = await supabase
    .from('users')
    .select('status')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error('User authorization profile not found.');
  }

  const status = profile.status?.toUpperCase() || 'ACTIVE';

  if (status === 'SUSPENDED' || status === 'DELETED') {
    throw new Error('Your account has been suspended or deleted. Access denied.');
  }
}
