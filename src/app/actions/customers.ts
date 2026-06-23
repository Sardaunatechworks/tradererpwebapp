'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { validateWriteAccess, validateReadAccess } from '@/lib/security';

export async function createCustomer(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const branchId = formData.get('branchId') as string;

    if (!name) {
      return { error: 'Customer Name is required.' };
    }

    // Validate Name length to prevent database field size errors or DoS
    if (name.length > 255) {
      return { error: 'Customer Name cannot exceed 255 characters.' };
    }

    // Email format validation (if specified)
    const emailTrimmed = email ? email.trim() : '';
    if (emailTrimmed) {
      const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!EMAIL_REGEX.test(emailTrimmed)) {
        return { error: 'Invalid email address format.' };
      }
      if (emailTrimmed.length > 255) {
        return { error: 'Email address cannot exceed 255 characters.' };
      }
    }

    // Phone number validation (if specified)
    const phoneTrimmed = phone ? phone.trim() : '';
    if (phoneTrimmed) {
      const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;
      if (!PHONE_REGEX.test(phoneTrimmed)) {
        return { error: 'Invalid phone number format. Use 7-20 characters consisting of digits, spaces, hyphens, parentheses, and optional leading +.' };
      }
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

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // SECURITY CHECK: Verify branchId belongs to caller's business if specified (prevents IDOR)
    if (branchId && branchId !== 'all') {
      const { data: branchCheck } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('id', branchId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (!branchCheck) {
        return { error: 'Branch context not found or unauthorized.' };
      }
    }

    const { error } = await supabaseAdmin.from('customers').insert({
      business_id: businessId,
      name,
      email: emailTrimmed,
      phone: phoneTrimmed,
      branch_id: (branchId && branchId !== 'all') ? branchId : null,
      total_spend: 0,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/customers');
    return { success: true };
  } catch (err: any) {
    console.error('Create Customer Global Error:', err);
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
