'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { UserProfile, Business } from '@/types';

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

export interface UserFullProfile {
  profile: UserProfile;
  business: {
    id: string;
    name: string;
  } | null;
  role: string;
}

export async function getUserProfile(): Promise<{ data?: UserFullProfile; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      throw new Error('Authentication required.');
    }

    const { data: profile, error: profErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profErr) throw profErr;

    const businessId = user.app_metadata?.business_id;
    const role = user.app_metadata?.role || 'staff';

    let businessData: { id: string; name: string } | null = null;
    if (businessId) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('id', businessId)
        .single();

      if (biz) {
        businessData = biz;
      }
    }

    return {
      data: {
        profile: profile as UserProfile,
        business: businessData,
        role,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch personal profile.' };
  }
}

export async function updateUserProfile(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      throw new Error('Authentication required.');
    }

    const name = (formData.get('name') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim() || null;

    if (!name || name.length < 2) {
      return { error: 'Please enter a valid full name (at least 2 characters).' };
    }

    const admin = getAdminClient();

    // 1. Update public.users
    const { error: updateErr } = await admin
      .from('users')
      .update({
        name,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateErr) throw updateErr;

    // 2. Update auth user_metadata
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        name,
        phone,
      },
    });

    // 3. Audit log if user is assigned to a business
    const businessId = user.app_metadata?.business_id;
    if (businessId) {
      await admin.from('audit_logs').insert({
        business_id: businessId,
        user_id: user.id,
        action: 'update_user_profile',
        entity_type: 'user',
        entity_id: user.id,
        metadata: { name, phone },
      });
    }

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update personal profile.' };
  }
}
