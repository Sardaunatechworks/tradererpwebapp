'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, Building2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export default function Header({ businessName }: { businessName?: string }) {
  const { setQuickActionOpen } = useUIStore();

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between print:hidden">
      {/* Mobile Top Bar Branding */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-2 h-2 rounded-full bg-slate-900" />
        <span className="font-bold text-sm tracking-tight text-slate-900 truncate max-w-[160px]">
          {businessName || 'TraderERP'}
        </span>
      </div>

      {/* Desktop Workspace Info */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>Workspace:</span>
          <span className="font-semibold text-slate-800">{businessName || 'My Business'}</span>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setQuickActionOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>New Entry</span>
        </button>

        <Link
          href="/settings"
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors text-xs font-medium"
        >
          Settings
        </Link>
      </div>
    </header>
  );
}
