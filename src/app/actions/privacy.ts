'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { ConsentType, UserConsent, AccountDeletionRequest, UserPreferences } from '@/types';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required.');
  }

  const businessId = user.app_metadata?.business_id || null;
  const role = user.app_metadata?.role || 'staff';

  return { user, businessId, role, supabase };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONSENT PREFERENCES
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserConsents(): Promise<{ data?: UserConsent[]; error?: string }> {
  try {
    const { user, supabase } = await getAuthContext();

    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: (data as UserConsent[]) || [] };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch consent records.' };
  }
}

export async function updateConsentPreference(
  consentType: ConsentType,
  granted: boolean
): Promise<{ success?: boolean; error?: string }> {
  try {
    const { user, businessId, supabase } = await getAuthContext();
    const admin = getAdminClient();

    // Prevent revoking essential Terms & Privacy while active
    if (consentType === 'terms_and_privacy' && !granted) {
      return {
        error:
          'Terms of Service and Privacy Policy consent cannot be revoked while keeping an active account. If you wish to withdraw all consent, please request account deletion.',
      };
    }

    const reqHeaders = await headers();
    const userAgent = reqHeaders.get('user-agent') || 'browser';
    const ip = reqHeaders.get('x-forwarded-for') || 'direct';

    const { error } = await admin.from('user_consents').upsert(
      {
        user_id: user.id,
        consent_type: consentType,
        policy_version: 'v1.0',
        granted,
        ip_address: ip.slice(0, 45),
        user_agent: userAgent.slice(0, 255),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,consent_type' }
    );

    if (error) throw error;

    if (businessId) {
      await admin.from('audit_logs').insert({
        business_id: businessId,
        user_id: user.id,
        action: 'update_consent_preference',
        entity_type: 'consent',
        entity_id: user.id,
        metadata: { consentType, granted },
      });
    }

    revalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update consent preference.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ACCOUNT DELETION WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

export async function getAccountDeletionRequest(): Promise<{
  data?: AccountDeletionRequest | null;
  error?: string;
}> {
  try {
    const { user, supabase } = await getAuthContext();

    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) throw error;
    return { data: (data as AccountDeletionRequest) || null };
  } catch (err: any) {
    return { error: err.message || 'Failed to check deletion request status.' };
  }
}

export async function submitAccountDeletionRequest(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
  requestId?: string;
}> {
  try {
    const { user, businessId, role } = await getAuthContext();
    const reason = (formData.get('reason') as string)?.trim() || 'User requested account closure';
    const password = (formData.get('password') as string)?.trim();

    if (!password) {
      return { error: 'Please enter your current account password to confirm this request.' };
    }

    // Verify password via Supabase Auth
    const supabase = await createClient();
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (authErr) {
      return { error: 'Incorrect password. Deletion request rejected.' };
    }

    const admin = getAdminClient();

    // Check for existing pending request
    const { data: existing } = await admin
      .from('account_deletion_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .maybeSingle();

    if (existing) {
      return {
        error:
          'You already have an active deletion request in progress. Our support team is processing it.',
      };
    }

    // Insert deletion request
    const { data: request, error: insertErr } = await admin
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        business_id: businessId,
        user_email: user.email!,
        user_role: role,
        reason,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr) throw insertErr;

    // Record audit event
    if (businessId) {
      await admin.from('audit_logs').insert({
        business_id: businessId,
        user_id: user.id,
        action: 'request_account_deletion',
        entity_type: 'account',
        entity_id: user.id,
        metadata: {
          requestId: request?.id,
          reason,
          userRole: role,
          notice:
            'User requested account deletion. In accordance with financial retention laws, historical sales and transactions remain preserved under the business entity.',
        },
      });
    }

    revalidatePath('/settings');
    return { success: true, requestId: request?.id };
  } catch (err: any) {
    return { error: err.message || 'Failed to submit deletion request.' };
  }
}

export async function cancelAccountDeletionRequest(
  requestId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const { user, businessId } = await getAuthContext();
    const admin = getAdminClient();

    const { error } = await admin
      .from('account_deletion_requests')
      .update({
        status: 'cancelled',
        resolution_notes: 'Cancelled by user',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;

    if (businessId) {
      await admin.from('audit_logs').insert({
        business_id: businessId,
        user_id: user.id,
        action: 'cancel_account_deletion',
        entity_type: 'account',
        entity_id: user.id,
        metadata: { requestId },
      });
    }

    revalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to cancel deletion request.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PERSONAL DATA EXPORT (TRANSPARENCY & DATA PORTABILITY)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportPersonalUserData(): Promise<{
  data?: Record<string, any>;
  error?: string;
}> {
  try {
    const { user, businessId, role, supabase } = await getAuthContext();

    // 1. Fetch personal profile
    const { data: profile } = await supabase
      .from('users')
      .select('id, name, email, phone, status, created_at, updated_at')
      .eq('id', user.id)
      .single();

    // 2. Fetch business membership info
    let businessInfo = null;
    if (businessId) {
      const { data: b } = await supabase
        .from('businesses')
        .select('id, name, business_type, currency, created_at')
        .eq('id', businessId)
        .single();
      businessInfo = b;
    }

    // 3. Fetch consents
    const { data: consents } = await supabase
      .from('user_consents')
      .select('consent_type, policy_version, granted, created_at, updated_at')
      .eq('user_id', user.id);

    // 4. Fetch user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('tour_completed, tour_completed_at, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const exportPayload = {
      exportTimestamp: new Date().toISOString(),
      platform: 'TraderERP Nigeria',
      account: {
        id: user.id,
        name: profile?.name || user.user_metadata?.name || 'TraderERP User',
        email: profile?.email || user.email,
        phone: profile?.phone || user.user_metadata?.phone || null,
        status: profile?.status || 'active',
        createdAt: profile?.created_at || user.created_at,
        assignedRole: role,
      },
      businessMembership: businessInfo
        ? {
            businessId: businessInfo.id,
            businessName: businessInfo.name,
            businessType: businessInfo.business_type,
            currency: businessInfo.currency,
          }
        : null,
      consents: consents || [],
      preferences: preferences || { tour_completed: false },
      dataControlNotice:
        'This file contains a copy of your personal account information and registered consent history. Shared business transaction records (such as sales and receipts) remain preserved within the business workspace for accounting and audit compliance.',
    };

    return { data: exportPayload };
  } catch (err: any) {
    return { error: err.message || 'Failed to export personal data.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TOUR & ONBOARDING PREFERENCES
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserTourPreferences(): Promise<{
  tourCompleted: boolean;
  error?: string;
}> {
  try {
    const { user, supabase } = await getAuthContext();

    const { data, error } = await supabase
      .from('user_preferences')
      .select('tour_completed')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return { tourCompleted: !!data?.tour_completed };
  } catch {
    // If not authenticated or error, return default false without breaking page
    return { tourCompleted: false };
  }
}

export async function saveTourCompletion(completed: boolean): Promise<{ success?: boolean }> {
  try {
    const { user } = await getAuthContext();
    const admin = getAdminClient();

    await admin.from('user_preferences').upsert(
      {
        user_id: user.id,
        tour_completed: completed,
        tour_completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    return { success: true };
  } catch {
    return { success: false };
  }
}
