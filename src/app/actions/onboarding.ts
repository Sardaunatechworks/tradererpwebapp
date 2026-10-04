'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function onboardBusiness(formData: FormData) {
  const businessName = (formData.get('businessName') as string)?.trim();
  const businessType = (formData.get('businessType') as string)?.trim() || 'General Merchant';
  const phone = (formData.get('phone') as string)?.trim() || null;
  const email = (formData.get('email') as string)?.trim() || null;
  const address = (formData.get('address') as string)?.trim() || null;
  const currency = (formData.get('currency') as string)?.trim() || 'NGN';

  if (!businessName) {
    return { error: 'Business name is required.' };
  }

  // 1. Get current authenticated user
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Authentication required. Please sign in.' };
  }

  // Admin client to safely handle auth app_metadata and multi-tenant setup
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 2. Ensure public.users profile exists
    await supabaseAdmin.from('users').upsert({
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Business Owner',
      email: user.email!,
      phone: phone,
      status: 'active',
    });

    // 3. Create Business
    const { data: business, error: bizErr } = await supabaseAdmin
      .from('businesses')
      .insert({
        name: businessName,
        business_type: businessType,
        owner_id: user.id,
        phone: phone,
        email: email || user.email,
        address: address,
        currency: currency,
        status: 'active',
      })
      .select('id, name')
      .single();

    if (bizErr || !business) {
      throw new Error(`Failed to create business: ${bizErr?.message}`);
    }

    const businessId = business.id;

    // 4. Create Business Member entry with role 'owner'
    const { error: memberErr } = await supabaseAdmin
      .from('business_members')
      .insert({
        business_id: businessId,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });

    if (memberErr) {
      throw new Error(`Failed to assign business owner role: ${memberErr.message}`);
    }

    // 5. Update user auth app_metadata with business_id and role
    const { error: authUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          business_id: businessId,
          role: 'owner',
        },
      }
    );

    if (authUpdateErr) {
      console.warn('Could not update user app_metadata:', authUpdateErr);
    }

    // 6. Seed Default Product Categories
    const defaultProductCategories = [
      { business_id: businessId, name: 'General', description: 'Default category' },
    ];
    await supabaseAdmin.from('categories').insert(defaultProductCategories);

    // 7. Seed Default Expense Categories per PRD/TRD specs
    const defaultExpenseCategories = [
      { business_id: businessId, name: 'Transport & Logistics' },
      { business_id: businessId, name: 'Utilities & Power' },
      { business_id: businessId, name: 'Rent & Space' },
      { business_id: businessId, name: 'Packaging & Bags' },
      { business_id: businessId, name: 'Marketing & Ads' },
      { business_id: businessId, name: 'Staff Wages' },
      { business_id: businessId, name: 'Repairs & Maintenance' },
      { business_id: businessId, name: 'Other Operating Expenses' },
    ];
    await supabaseAdmin.from('expense_categories').insert(defaultExpenseCategories);

    // 8. Log Audit record
    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'create_business',
      entity_type: 'business',
      entity_id: businessId,
      details: { name: businessName, type: businessType },
    });

    return { success: true, businessId };
  } catch (error: any) {
    console.error('Onboarding transaction failed:', error);
    return { error: error.message || 'Failed to complete business setup.' };
  }
}
