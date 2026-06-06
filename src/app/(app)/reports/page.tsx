import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import ReportsDashboard from '@/components/reports/ReportsDashboard';

export default async function ReportsPage() {
  const supabase = await createClient();

  // 1. Fetch current authenticated user profile details
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="print:hidden">
        <h1 className="text-2xl font-black text-white tracking-tight leading-none">Reports & Analytics</h1>
        <p className="text-xs text-slate-500 mt-2">
          Generate, visualize, and export sales, inventory, revenue, and debt reporting spreadsheets.
        </p>
      </div>

      <ReportsDashboard 
        branches={branches || []} 
        role={role} 
      />

    </div>
  );
}
