'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import { createClient } from '@/lib/supabase/client';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  Shield, 
  Building2, 
  LogOut,
  ChevronDown,
  BarChart3,
  Coins,
  History,
  Sun,
  Moon,
  LifeBuoy
} from 'lucide-react';
import { getBranches } from '@/app/actions/branches';

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const { currentBranchId, setCurrentBranchId, theme, toggleTheme, setSidebarOpen } = useUIStore();

  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [branches, setBranches] = useState<any[]>([]);
  const [staffBranchId, setStaffBranchId] = useState<string | null>(null);

  // Alert/Notification states (red pulsing indicators)
  const [hasLowStock, setHasLowStock] = useState(false);
  const [hasSupportAlert, setHasSupportAlert] = useState(false);

  useEffect(() => {
    async function fetchUserContext() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setRole(user.app_metadata?.role || 'STAFF');
        setName(user.user_metadata?.name || user.email?.split('@')[0] || 'User');

        const { data: profile } = await supabase
          .from('users')
          .select('business_id, role')
          .eq('id', user.id)
          .maybeSingle();

        const bizId = user.app_metadata?.business_id || profile?.business_id;

        if (bizId) {
          // Fetch branches for this business via Server Action
          const branchData = await getBranches();
          if (branchData) {
            setBranches(branchData);
          }

          // Fetch user branch locks if STAFF or MANAGER
          const userRole = user.app_metadata?.role || profile?.role || 'STAFF';
          if (userRole === 'STAFF' || userRole === 'MANAGER') {
            const { data: userBranchData } = await supabase
              .from('user_branches')
              .select('branch_id')
              .eq('user_id', user.id)
              .limit(1);

            if (userBranchData && userBranchData.length > 0) {
              const bId = userBranchData[0].branch_id;
              setStaffBranchId(bId);
              setCurrentBranchId(bId);
            } else {
              setStaffBranchId(null);
            }
          }
        }
      }
    }

    fetchUserContext();
  }, [supabase, setCurrentBranchId]);

  // Periodic alert check effect (runs when branch context shifts)
  useEffect(() => {
    async function checkAlerts() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .maybeSingle();

      const bizId = user.app_metadata?.business_id || profile?.business_id;
      if (!bizId) return;

      // 1. Check support tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('status, admin_response')
        .eq('business_id', bizId);

      const hasTicketsAlert = tickets ? tickets.some(t => t.status === 'open' || (t.status === 'resolved' && t.admin_response)) : false;
      setHasSupportAlert(hasTicketsAlert);

      // 2. Check low stock items
      let query = supabase
        .from('inventory')
        .select('quantity, reorder_level')
        .eq('business_id', bizId);

      const activeBranch = staffBranchId || currentBranchId;
      if (activeBranch && activeBranch !== 'all') {
        query = query.eq('branch_id', activeBranch);
      }

      const { data: inv } = await query;
      const lowStock = inv ? inv.some(item => item.quantity <= item.reorder_level) : false;
      setHasLowStock(lowStock);
    }

    checkAlerts();
  }, [supabase, currentBranchId, staffBranchId]);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentBranchId(e.target.value);
  };

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Inventory', href: '/inventory', icon: Package, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Sales POS', href: '/sales', icon: ShoppingCart, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Customers', href: '/customers', icon: Users, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Debts CRM', href: '/debts', icon: Coins, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Transaction History', href: '/history', icon: History, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Staff Management', href: '/staff', icon: Shield, roles: ['OWNER', 'ADMIN'] },
    { name: 'Branch Management', href: '/branches', icon: Building2, roles: ['OWNER', 'ADMIN'] },
    { name: 'Support Center', href: '/support', icon: LifeBuoy, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
  ];

  const allowedItems = menuItems.filter(item => !role || item.roles.includes(role));

  return (
    <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between h-screen text-slate-300 select-none">
      
      {/* Top Section */}
      <div className="flex flex-col p-6 space-y-8">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/10">
            T
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-white tracking-tight leading-none">TraderERP</h2>
            <span className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase block mt-1">Enterprise Dashboard</span>
          </div>
        </div>

        {/* Branch Context Selector */}
        {role !== 'super_admin' && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-500" /> Active Branch
            </span>
            <div className="relative">
              {(role === 'STAFF' || role === 'MANAGER') ? (
                <div className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-semibold truncate">
                  {staffBranchId 
                    ? (branches.find(b => b.id === staffBranchId)?.name || 'Loading branch...') 
                    : 'No Branch Assigned'}
                </div>
              ) : (
                <select
                  value={currentBranchId}
                  onChange={handleBranchChange}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 pr-8 text-xs font-semibold outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none"
                >
                  <option value="all">All Outlets</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
              {role !== 'STAFF' && role !== 'MANAGER' && (
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isActive 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.name}</span>
                </div>

                {/* Pulsing red notification dot */}
                {((item.name === 'Inventory' && hasLowStock) || 
                  (item.name === 'Support Center' && hasSupportAlert)) && (
                  <span className="relative flex h-2.5 w-2.5 mr-1 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Section */}
      <div className="p-6 border-t border-slate-800 space-y-4">
        
        {/* User Badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase">
            {name[0] || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-white text-xs block truncate leading-none mb-1">{name}</span>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-blue-500" /> {role}
            </span>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 border border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-400 hover:text-white font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition-all cursor-pointer"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" /> Light Mode
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-400" /> Dark Mode
            </>
          )}
        </button>

        {/* Log Out */}
        <button
          onClick={async () => {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="w-full flex items-center justify-center gap-2 border border-slate-800 hover:border-red-900 hover:bg-red-950/20 text-slate-400 hover:text-red-400 font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Exit POS
        </button>
      </div>
    </div>
  );
}
