import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import CustomerList from '@/components/customers/CustomerList';

export default async function CustomersPage() {
  const supabase = await createClient();

  // 1. Get current business workspace
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = user?.app_metadata?.business_id;

  if (!businessId) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <div className="space-y-2">
          <p className="text-red-400 font-bold text-sm">No business workspace found.</p>
          <p className="text-xs text-slate-500">Please complete onboarding or log in again.</p>
        </div>
      </div>
    );
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 2. Fetch customers (using admin client to bypass stale JWT RLS issues)
  const { data: customers } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });

  // 3. Fetch active branches
  const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const role = user?.app_metadata?.role || 'STAFF';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight leading-none">Customer CRM</h1>
        <p className="text-xs text-slate-500 mt-2">
          View customer spend profiles, transaction counts, and add new customers to CRM databases.
        </p>
      </div>

      <CustomerList 
        initialCustomers={customers || []} 
        branches={branches || []} 
        role={role} 
      />

    </div>
  );
}
