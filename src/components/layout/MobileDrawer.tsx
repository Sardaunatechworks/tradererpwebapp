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
  MessageSquareHeart,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUIStore } from '@/stores/uiStore';
import Logo from '@/components/layout/Logo';

export default function MobileDrawer({ businessName }: { businessName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { mobileMoreOpen, setMobileMoreOpen, setFeedbackModalOpen } = useUIStore();

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
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      window.location.href = '/dashboard';
      return;
    }
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => setMobileMoreOpen(false)}
      />

      {/* Drawer Content */}
      <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo iconSize="w-6 h-6" showText={true} />
          </div>
          <button
            onClick={() => setMobileMoreOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Business Badge */}
        {businessName && (
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Active Business
            </p>
            <p className="text-xs font-bold text-slate-800 truncate">{businessName}</p>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {moreItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
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

        {/* Share Feedback Action */}
        <div className="px-4 py-2 border-t border-slate-100">
          <button
            onClick={() => {
              setMobileMoreOpen(false);
              setFeedbackModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-700 font-semibold text-xs hover:bg-blue-100/70 transition-colors shadow-2xs cursor-pointer"
          >
            <MessageSquareHeart className="w-4 h-4 text-blue-600" />
            <span>Send App Feedback</span>
          </button>
        </div>

        {/* Footer with Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors border border-red-100"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
