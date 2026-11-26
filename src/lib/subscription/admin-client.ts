import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

/**
 * Server-only Supabase service-role client for subscription, webhook, and admin operations.
 * Never import this file in client components.
 */
export function getSubscriptionAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase server configuration.');
  }

  return createSupabaseAdmin(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

