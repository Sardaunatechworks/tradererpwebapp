'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ShieldAlert, LogOut } from 'lucide-react';
import { signOut } from '@/app/actions/auth';

export default function BranchGuard({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    async function checkBranchAssignment() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const role = user.app_metadata?.role || 'STAFF';

        // Owners and Admins and Super Admins don't need branch assignments to access dashboard
        if (role === 'OWNER' || role === 'ADMIN' || role === 'super_admin') {
          setLoading(false);
          return;
        }

        // For MANAGER and STAFF, verify they are linked in user_branches
        const { data: userBranches, error } = await supabase
          .from('user_branches')
          .select('branch_id')
          .eq('user_id', user.id)
          .limit(1);

        if (error || !userBranches || userBranches.length === 0) {
          setIsBlocked(true);
        }
      } catch (err) {
        console.error('Error checking branch assignment:', err);
      } finally {
        setLoading(false);
      }
    }

    checkBranchAssignment();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-8 space-y-6 text-slate-100 shadow-2xl text-center animate-in zoom-in duration-250">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto animate-bounce" />
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white leading-none">No Branch Assigned</h3>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Workspace Blocked</p>
          </div>

          <p className="text-slate-300 text-xs leading-relaxed">
            You have not been assigned to a branch yet. Please contact your systems administrator or manager to assign you to a branch.
          </p>

          <div className="pt-2">
            <button
              onClick={async () => {
                await signOut();
              }}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg transition-all cursor-pointer shadow-lg shadow-blue-900/10"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
