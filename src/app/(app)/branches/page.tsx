import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import BranchManagement from '@/components/branches/BranchManagement';
import { getAllBranches } from '@/app/actions/branches';

export default async function BranchesPage() {
  const supabase = await createClient();

  // 1. Get current workspace auth user
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

  // Redirect if not Owner or Admin
  if (role !== 'OWNER' && role !== 'ADMIN') {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <div className="space-y-2">
          <p className="text-red-400 font-bold text-sm">Unauthorized access.</p>
          <p className="text-xs text-slate-500">Only business Owners and Admins are permitted to access this module.</p>
        </div>
      </div>
    );
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // 2. Fetch all branches of the business (both active and inactive)
  const initialBranches = await getAllBranches();

  // 3. Fetch all active staff/managers/owners in the business (to select as managers)
  const { data: staffMembers } = await supabaseAdmin
    .from('users')
    .select('id, name, role, email')
    .eq('business_id', businessId)
    .neq('status', 'DELETED')
    .order('name', { ascending: true });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight leading-none">Branch Management</h1>
        <p className="text-xs text-slate-500 mt-2">
          Add new branches, update outlet addresses, restrict/activate branches, or assign primary managers.
        </p>
      </div>

      <BranchManagement 
        initialBranches={initialBranches} 
        staffMembers={staffMembers || []}
      />

    </div>
  );
}
