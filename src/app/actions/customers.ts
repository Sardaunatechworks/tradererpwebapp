'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { validateWriteAccess, validateReadAccess } from '@/lib/security';

export async function createCustomer(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const branchId = formData.get('branchId') as string;

  if (!name) {
    return { error: 'Customer Name is required.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  // Live security check to bypass JWT status caching latency
  try {
    await validateWriteAccess(supabase, user.id);
  } catch (accessErr: any) {
    return { error: accessErr.message };
  }

  const businessId = user.app_metadata?.business_id;
  if (!businessId) return { error: 'No business workspace found.' };

  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin.from('customers').insert({
      business_id: businessId,
      name,
      email: email || '',
      phone: phone || '',
      branch_id: (branchId && branchId !== 'all') ? branchId : null,
      total_spend: 0,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/customers');
    return { success: true };
  } catch (err: any) {
    console.error('Create Customer Error:', err);
    return { error: err.message || 'An error occurred during customer creation.' };
  }
}

export async function getCustomers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // Live security check for read access
  try {
    await validateReadAccess(supabase, user.id);
  } catch (err) {
    return [];
  }

  const businessId = user.app_metadata?.business_id;
  if (!businessId) return [];

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }

  return data;
}
