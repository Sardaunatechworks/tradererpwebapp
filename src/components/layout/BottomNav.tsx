'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Plus,
  Menu,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export default function BottomNav() {
  const pathname = usePathname();
  const { setQuickActionOpen, setMobileMoreOpen } = useUIStore();

  const isHome = pathname === '/dashboard' || pathname === '/';
  const isSales = pathname.startsWith('/sales');
  const isStock = pathname.startsWith('/inventory');

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 lg:hidden px-2 py-1 flex items-center justify-around shadow-lg">
      {/* Home */}
      <Link
        href="/dashboard"
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
          isHome ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <LayoutDashboard className={`w-5 h-5 mb-0.5 ${isHome ? 'text-slate-900' : 'text-slate-400'}`} />
        <span>Home</span>
      </Link>

      {/* Sales */}
      <Link
        href="/sales"
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
          isSales ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <ShoppingCart className={`w-5 h-5 mb-0.5 ${isSales ? 'text-slate-900' : 'text-slate-400'}`} />
        <span>Sales</span>
      </Link>

      {/* Central + FAB */}
      <div className="relative -top-3">
        <button
          onClick={() => setQuickActionOpen(true)}
          className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 active:scale-95 transition-all cursor-pointer ring-4 ring-white"
          aria-label="Quick Action"
        >
          <Plus className="w-6 h-6 text-white stroke-[2.5]" />
        </button>
      </div>

      {/* Stock */}
      <Link
        href="/inventory"
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
          isStock ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Package className={`w-5 h-5 mb-0.5 ${isStock ? 'text-slate-900' : 'text-slate-400'}`} />
        <span>Stock</span>
      </Link>

      {/* More Drawer */}
      <button
        onClick={() => setMobileMoreOpen(true)}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
        aria-label="More Navigation"
      >
        <Menu className="w-5 h-5 mb-0.5 text-slate-400" />
        <span>More</span>
      </button>
    </nav>
  );
}
