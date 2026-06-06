'use client';

import React from 'react';
import { LogOut } from 'lucide-react';

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Platform Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-4 flex justify-between items-center select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-base shadow-lg shadow-blue-500/10">
            T
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-none flex items-center gap-1.5">
              TraderERP <span className="text-[9px] uppercase tracking-wider font-extrabold bg-blue-600/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded">SaaS Platform</span>
            </h1>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-1">SaaS Control Plane</span>
          </div>
        </div>

        <button
          onClick={async () => {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="flex items-center gap-1.5 border border-slate-800 hover:border-red-950 hover:bg-red-950/20 text-slate-400 hover:text-red-400 font-bold text-[9px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
