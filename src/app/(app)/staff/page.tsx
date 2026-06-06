import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import StaffManagement from '@/components/staff/StaffManagement';

export default async function StaffPage() {
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

  // 2. Fetch all staff members belonging to the business (exclude Super Admin if query overlaps)
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });

  // 3. Fetch all branches of the business
  const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  // 4. Fetch all user branch mappings
  const { data: userBranches } = await supabaseAdmin
    .from('user_branches')
    .select('*')
    .eq('business_id', businessId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight leading-none">Staff Management</h1>
        <p className="text-xs text-slate-500 mt-2">
          Add new staff members, configure branch authorization levels, reset credentials, or suspend access.
        </p>
      </div>

      <StaffManagement 
        initialUsers={users || []} 
        branches={branches || []} 
        userBranches={userBranches || []}
        currentAdminId={user.id}
      />

    </div>
  );
}
