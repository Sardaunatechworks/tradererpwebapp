'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  CreditCard,
  BarChart3,
  UserCheck,
  Settings,
  LogOut,
  PlusCircle,
  MessageSquareHeart,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/layout/Logo';
import { useUIStore } from '@/stores/uiStore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export default function Sidebar({ businessName }: { businessName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { setQuickActionOpen, setFeedbackModalOpen } = useUIStore();

  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('Staff');
  const [bName, setBName] = useState(businessName || 'My Business');

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'User');
        const role = user.app_metadata?.role || 'staff';
        setUserRole(role.charAt(0).toUpperCase() + role.slice(1));

        // Fetch business name if not passed
        if (!businessName) {
          const bId = user.app_metadata?.business_id;
          if (bId) {
            const { data: b } = await supabase
              .from('businesses')
              .select('name')
              .eq('id', bId)
              .maybeSingle();
            if (b?.name) setBName(b.name);
          }
        }
      }
    }
    loadUser();
  }, [businessName, supabase]);

  const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
    { name: 'Sales', href: '/sales', icon: ShoppingCart },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Credit', href: '/credit', icon: CreditCard },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Staff', href: '/staff', icon: UserCheck },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isLinkActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full select-none">
      {/* Brand & Business Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col gap-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo iconSize="w-8 h-8" showText={true} />
        </Link>
        <div className="bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-lg flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Active Business
            </p>
            <p className="text-xs font-bold text-slate-800 truncate" title={bName}>
              {bName}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="px-4 pt-4">
        <button
          onClick={() => setQuickActionOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Quick Record</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isLinkActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  active ? 'text-white' : 'text-slate-500'
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Send Feedback Button */}
      <div className="px-4 py-2 border-t border-slate-100">
        <button
          onClick={() => setFeedbackModalOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50/70 transition-colors cursor-pointer group"
        >
          <MessageSquareHeart className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          <span>Send Feedback</span>
        </button>
      </div>

      {/* User Profile & Logout Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
        <Link
          href="/settings?tab=profile"
          className="flex-1 min-w-0 flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
          title="Manage Your Profile"
        >
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors" title={userName}>
              {userName}
            </p>
            <span className="inline-block text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-200 text-slate-700 mt-0.5">
              {userRole}
            </span>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
