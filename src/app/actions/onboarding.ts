'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function onboardBusiness(formData: FormData) {
  const businessName = formData.get('businessName') as string;
  const currency = formData.get('currency') as string;
  const branchName = formData.get('branchName') as string;
  const branchAddress = formData.get('branchAddress') as string;

  if (!businessName || !currency || !branchName) {
    return { error: 'Business Name, Currency, and Branch Name are required.' };
  }

  // 1. Get current authenticated user
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Authentication required. Please sign in.' };
  }

  // Initialize Supabase Admin client to check profile and perform auth updates
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if they already have a business (using admin client to bypass RLS)
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.business_id) {
    return { error: 'User is already linked to a business.' };
  }

  try {

    // 3. Create Business
    const { data: business, error: bizErr } = await supabaseAdmin
      .from('businesses')
      .insert({
        name: businessName,
        currency: currency,
        status: 'active',
      })
      .select('id')
      .single();

    if (bizErr || !business) {
      throw new Error(`Failed to create business: ${bizErr?.message}`);
    }

    const businessId = business.id;

    // 4. Create Default Branch
    const { data: branch, error: branchErr } = await supabaseAdmin
      .from('branches')
      .insert({
        business_id: businessId,
        name: branchName,
        address: branchAddress || '',
        is_active: true,
      })
      .select('id')
      .single();

    if (branchErr || !branch) {
      throw new Error(`Failed to create default branch: ${branchErr?.message}`);
    }

    const branchId = branch.id;

    // 5. Update User Profile inside public.users (triggers might create this, let's update)
    const { error: userErr } = await supabaseAdmin
      .from('users')
      .update({
        business_id: businessId,
        role: 'OWNER',
        status: 'active',
      })
      .eq('id', user.id);

    if (userErr) {
      throw new Error(`Failed to update user profile: ${userErr.message}`);
    }

    // 6. Link User to Branch in user_branches
    const { error: linkErr } = await supabaseAdmin
      .from('user_branches')
      .insert({
        user_id: user.id,
        branch_id: branchId,
        business_id: businessId,
      });

    if (linkErr) {
      throw new Error(`Failed to assign user to default branch: ${linkErr.message}`);
    }

    // 7. Update Auth Metadata (JWT Claims)
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          business_id: businessId,
          role: 'OWNER',
        },
      }
    );

    if (authErr) {
      throw new Error(`Failed to update auth metadata: ${authErr.message}`);
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Onboarding Transaction Error:', err);
    return { error: err.message || 'An error occurred during onboarding.' };
  }
}
