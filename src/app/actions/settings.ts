'use server';

import { revalidatePath } from 'next/cache';
import { Business } from '@/types';
import { getAuthContext, getAdminClient } from '@/lib/auth/context';

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
