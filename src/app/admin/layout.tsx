import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ShieldCheck, LayoutDashboard, LogOut } from 'lucide-react';
import Logo from '@/components/layout/Logo';
import { signOut } from '@/app/actions/auth';
import { checkIsSuperAdmin } from '@/lib/auth/superAdmin';

export const metadata = {
  title: 'Platform Super Admin | TraderERP',
  description: 'TraderERP Multi-Tenant Management & Platform Administration Console',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  if (!checkIsSuperAdmin(user)) {
    redirect('/dashboard');
  }

  const adminName = user.user_metadata?.name || user.email?.split('@')[0] || 'Super Administrator';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Super Admin Top Navigation Bar */}
      <header className="bg-slate-950 border-b border-slate-800/80 px-4 sm:px-8 py-3.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand & Badge */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2">
              <Logo iconSize="w-7 h-7" showText={true} />
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>PLATFORM ADMIN</span>
            </div>
          </div>

          {/* User Profile & Workspace Link & Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{adminName}</p>
              <p className="text-[10px] text-slate-400">{user.email}</p>
            </div>

            {/* Jump to Tenant Workspace */}
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700/80 shadow-2xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Tenant Workspace</span>
              <span className="sm:hidden">App</span>
            </Link>

            {/* Sign Out */}
            <form action={signOut}>
              <button
                type="submit"
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Admin Console Container */}
      <main className="flex-1 bg-slate-100 text-slate-900 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-8 text-center text-xs text-slate-400">
        TraderERP Enterprise Multi-Tenant Management Console • v1.2.0 Rebuild
      </footer>
    </div>
  );
}
