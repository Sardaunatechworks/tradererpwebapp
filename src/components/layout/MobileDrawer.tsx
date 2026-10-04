'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Receipt,
  Users,
  CreditCard,
  BarChart3,
  UserCheck,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUIStore } from '@/stores/uiStore';

export default function MobileDrawer({ businessName }: { businessName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { mobileMoreOpen, setMobileMoreOpen } = useUIStore();

  if (!mobileMoreOpen) return null;

  const moreItems = [
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Credit', href: '/credit', icon: CreditCard },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Staff Management', href: '/staff', icon: UserCheck },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    setMobileMoreOpen(false);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setMobileMoreOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-72 bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Menu & Modules</h3>
            {businessName && (
              <p className="text-xs text-slate-500 truncate max-w-[180px]">{businessName}</p>
            )}
          </div>
          <button
            onClick={() => setMobileMoreOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMoreOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 font-medium text-xs hover:bg-red-50 transition-colors shadow-2xs cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
