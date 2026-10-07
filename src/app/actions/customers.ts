'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Customer } from '@/types';

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

  return { user, businessId, supabase };
}

export async function getCustomers(search?: string): Promise<{ data?: Customer[]; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();

    let query = supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (search?.trim()) {
      const s = search.trim();
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Attach outstanding balance for each customer
    const customersWithBalance = await Promise.all(
      (data || []).map(async (c) => {
        const { data: sales } = await supabase
          .from('sales')
          .select('balance_due')
          .eq('customer_id', c.id)
          .eq('business_id', businessId)
          .eq('status', 'completed')
          .gt('balance_due', 0);

        const totalBalance = (sales || []).reduce((acc, s) => acc + (Number(s.balance_due) || 0), 0);
        return {
          ...c,
          outstanding_balance: totalBalance,
        };
      })
    );

    return { data: customersWithBalance };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch customers.' };
  }
}

export async function getCustomerById(id: string): Promise<{ data?: Customer; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error) throw error;

    // Calculate customer total debt & fetch purchase history
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .eq('customer_id', id)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    const outstandingBalance = (sales || [])
      .filter((s) => s.status === 'completed')
      .reduce((acc, s) => acc + (Number(s.balance_due) || 0), 0);

    return {
      data: {
        ...customer,
        outstanding_balance: outstandingBalance,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Customer not found.' };
  }
}

export async function createCustomer(formData: FormData): Promise<{ data?: Customer; error?: string }> {
  try {
    const { businessId, user } = await getAuthContext();

    const name = (formData.get('name') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim() || null;
    const email = (formData.get('email') as string)?.trim() || null;
    const address = (formData.get('address') as string)?.trim() || null;
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!name) {
      return { error: 'Customer name is required.' };
    }

    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert({
        business_id: businessId,
        name,
        phone,
        email,
        address,
        notes,
        status: 'active',
      })
      .select('*')
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'create_customer',
      entity_type: 'customer',
      entity_id: data.id,
      metadata: { name, phone },
    });

    revalidatePath('/customers');
    revalidatePath('/sales');
    return { data: data as Customer };
  } catch (err: any) {
    return { error: err.message || 'Failed to create customer.' };
  }
}
