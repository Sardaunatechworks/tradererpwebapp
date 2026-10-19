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
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col font-sans relative selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Ambient background glow accents for glassmorphic depth */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-indigo-600/10 via-cyan-500/5 to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[400px] bg-blue-600/5 blur-[140px]" />
      </div>

      {/* Super Admin Top Navigation Bar */}
      <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 sticky top-0 z-50 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand & Badge */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 group">
              <Logo iconSize="w-7 h-7" showText={true} />
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>PLATFORM GOVERNANCE</span>
            </div>
          </div>

          {/* User Profile & Workspace Link & Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{adminName}</p>
              <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
            </div>

            {/* Jump to Tenant Workspace */}
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition-colors border border-white/10 shadow-sm backdrop-blur-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Tenant Workspace</span>
              <span className="sm:hidden">App</span>
            </Link>

            {/* Sign Out */}
            <form action={signOut}>
              <button
                type="submit"
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Admin Console Container */}
      <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950/60 backdrop-blur-md border-t border-white/5 py-4 px-4 sm:px-8 text-center text-xs text-slate-500 relative z-10">
        TraderERP Enterprise Multi-Tenant Management Console • Platform Owner Telemetry & Accountability Hub
      </footer>
    </div>
  );
}
