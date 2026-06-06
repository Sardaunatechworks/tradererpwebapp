import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import DebtManagement from '@/components/debts/DebtManagement';

export default async function DebtsPage() {
  const supabase = await createClient();

  // 1. Authenticate user context
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = user?.app_metadata?.business_id;
  const role = user?.app_metadata?.role || 'STAFF';

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

  // 2. Fetch active branches (for filter dropdown on Owner/Admin views)
  const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('id, name')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  // 3. Fetch active business customers
  const { data: customers } = await supabaseAdmin
    .from('customers')
    .select('id, name, email, phone')
    .eq('business_id', businessId)
    .order('name', { ascending: true });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight leading-none">Debts & Repayments</h1>
        <p className="text-xs text-slate-500 mt-2">
          Manage outstanding customer store credit, track collection metrics, and log repayment audits.
        </p>
      </div>

      <DebtManagement 
        branches={branches || []} 
        customers={customers || []}
        role={role} 
      />

    </div>
  );
}
