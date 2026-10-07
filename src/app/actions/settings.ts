'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Business } from '@/types';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Authentication required.');

  const businessId = user.app_metadata?.business_id;
  if (!businessId) throw new Error('No business workspace context found.');

  const role = user.app_metadata?.role || 'staff';
  return { user, businessId, role, supabase };
}

export async function getBusinessSettings(): Promise<{ data?: Business; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error) throw error;
    return { data: data as Business };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch business settings.' };
  }
}

export async function updateBusinessProfile(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  try {
    const { businessId, user, role } = await getAuthContext();
    if (role !== 'owner' && role !== 'admin') {
      return { error: 'Only owners and admins can update business profile settings.' };
    }

    const name = (formData.get('name') as string)?.trim();
    const businessType = (formData.get('businessType') as string)?.trim() || null;
    const phone = (formData.get('phone') as string)?.trim() || null;
    const email = (formData.get('email') as string)?.trim() || null;
    const address = (formData.get('address') as string)?.trim() || null;
    const currency = (formData.get('currency') as string)?.trim() || 'NGN';

    if (!name) return { error: 'Business name is required.' };

    const supabaseAdmin = getAdminClient();

    const { error } = await supabaseAdmin
      .from('businesses')
      .update({
        name,
        business_type: businessType,
        phone,
        email,
        address,
        currency,
      })
      .eq('id', businessId);

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'update_business_settings',
      entity_type: 'business',
      entity_id: businessId,
      metadata: { name, businessType },
    });

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to save business settings.' };
  }
}
