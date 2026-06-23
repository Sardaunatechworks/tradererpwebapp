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
  LifeBuoy,
  Bell,
  RefreshCw
} from 'lucide-react';
import { getBranches } from '@/app/actions/branches';
import Logo from '@/components/layout/Logo';

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const { 
    currentBranchId, 
    setCurrentBranchId, 
    theme, 
    toggleTheme, 
    setSidebarOpen,
    lastAttendedInventory,
    lastAttendedSupport,
    lastAttendedNotifications,
    setLastAttendedInventory,
    setLastAttendedSupport,
    setLastAttendedNotifications
  } = useUIStore();

  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [branches, setBranches] = useState<any[]>([]);
  const [staffBranchId, setStaffBranchId] = useState<string | null>(null);

  // Alert/Notification states (red pulsing indicators)
  const [hasLowStock, setHasLowStock] = useState(false);
  const [hasSupportAlert, setHasSupportAlert] = useState(false);
  const [hasNotificationsAlert, setHasNotificationsAlert] = useState(false);

  // Observe pathname changes to update attended timestamps in Zustand store
  useEffect(() => {
    if (pathname === '/inventory') {
      setLastAttendedInventory(Date.now());
    } else if (pathname === '/support') {
      setLastAttendedSupport(Date.now());
    } else if (pathname === '/notifications') {
      setLastAttendedNotifications(Date.now());
    }
  }, [pathname, setLastAttendedInventory, setLastAttendedSupport, setLastAttendedNotifications]);

  useEffect(() => {
    async function fetchUserContext() {
      try {
        let user = null;
        if (typeof window !== 'undefined' && !navigator.onLine) {
          const { data: { session } } = await supabase.auth.getSession();
          user = session?.user || null;
        } else {
          try {
            const { data: { user: gotUser } } = await supabase.auth.getUser();
            user = gotUser;
          } catch (err) {
            const { data: { session } } = await supabase.auth.getSession();
            user = session?.user || null;
          }
        }

        if (user) {
          setRole(user.app_metadata?.role || 'STAFF');
          setName(user.user_metadata?.name || user.email?.split('@')[0] || 'User');

          // Retrieve cached values from localStorage immediately (resilient if offline)
          const cachedBranches = localStorage.getItem('tradererp_cached_branches');
          if (cachedBranches) {
            setBranches(JSON.parse(cachedBranches));
          }
          const cachedStaffBranchId = localStorage.getItem('tradererp_staff_branch_id');
          if (cachedStaffBranchId) {
            setStaffBranchId(cachedStaffBranchId);
            setCurrentBranchId(cachedStaffBranchId);
          }

          // Fetch fresh database context only when online
          if (typeof window !== 'undefined' && navigator.onLine) {
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
                localStorage.setItem('tradererp_cached_branches', JSON.stringify(branchData));
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
                  localStorage.setItem('tradererp_staff_branch_id', bId);
                } else {
                  setStaffBranchId(null);
                  localStorage.removeItem('tradererp_staff_branch_id');
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user context:', error);
      }
    }

    fetchUserContext();
  }, [supabase, setCurrentBranchId]);

  useEffect(() => {
    async function checkAlerts() {
      // Skip query alerts check when offline to prevent Supabase connection errors
      if (typeof window !== 'undefined' && !navigator.onLine) {
        return;
      }
      try {
        let user = null;
        try {
          const { data: { user: gotUser } } = await supabase.auth.getUser();
          user = gotUser;
        } catch (err) {
          const { data: { session } } = await supabase.auth.getSession();
          user = session?.user || null;
        }
        if (!user) return;

        const { data: profile } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .maybeSingle();

        const bizId = user.app_metadata?.business_id || profile?.business_id;
        if (!bizId) return;

        // 1. Check support tickets (time-based check against lastAttendedSupport)
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('status, admin_response, updated_at')
          .eq('business_id', bizId);

        const alertTickets = tickets ? tickets.filter(t => t.status === 'open' || (t.status === 'resolved' && t.admin_response)) : [];
        const newestTicketTime = alertTickets.reduce((max, t) => {
          const tTime = new Date(t.updated_at).getTime();
          return tTime > max ? tTime : max;
        }, 0);
        setHasSupportAlert(newestTicketTime > lastAttendedSupport);

        // 2. Check low stock items (time-based check against lastAttendedInventory)
        let query = supabase
          .from('inventory')
          .select('quantity, reorder_level, updated_at')
          .eq('business_id', bizId);

        const activeBranch = staffBranchId || currentBranchId;
        if (activeBranch && activeBranch !== 'all') {
          query = query.eq('branch_id', activeBranch);
        }

        const { data: inv } = await query;
        const lowStockItems = inv ? inv.filter(item => item.quantity <= item.reorder_level) : [];
        const newestLowStockTime = lowStockItems.reduce((max, item) => {
          const itemTime = new Date(item.updated_at).getTime();
          return itemTime > max ? itemTime : max;
        }, 0);
        setHasLowStock(newestLowStockTime > lastAttendedInventory);

        // 3. Check announcements/notifications (time-based check against lastAttendedNotifications)
        const { data: ann } = await supabase
          .from('announcements')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1);

        const newestAnnTime = ann && ann.length > 0 ? new Date(ann[0].created_at).getTime() : 0;
        setHasNotificationsAlert(newestAnnTime > lastAttendedNotifications);
      } catch (error) {
        console.error('Error checking alerts:', error);
      }
    }

    checkAlerts();
  }, [supabase, currentBranchId, staffBranchId, lastAttendedInventory, lastAttendedSupport, lastAttendedNotifications]);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentBranchId(e.target.value);
  };

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Inventory', href: '/inventory', icon: Package, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Sales POS', href: '/sales', icon: ShoppingCart, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Customers', href: '/customers', icon: Users, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Debts CRM', href: '/debts', icon: Coins, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Transaction History', href: '/history', icon: History, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Staff Management', href: '/staff', icon: Shield, roles: ['OWNER', 'ADMIN'] },
    { name: 'Branch Management', href: '/branches', icon: Building2, roles: ['OWNER', 'ADMIN'] },
    { name: 'Support Center', href: '/support', icon: LifeBuoy, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Sync Center', href: '/sync-center', icon: RefreshCw, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
  ];

  const allowedItems = menuItems.filter(item => !role || item.roles.includes(role));

  return (
    <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen h-dvh text-slate-300 select-none overflow-y-auto overscroll-contain scrollbar-thin">
      
      {/* Top Section */}
      <div className="flex-1 p-6 space-y-8">
        
        {/* Brand Header */}
        <Logo iconSize="w-9 h-9" textColorMode="dark" subtitle="Enterprise Dashboard" />

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
                <div className="flex items-center gap-3 pointer-events-none">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.name}</span>
                </div>

                {/* Pulsing red notification dot */}
                {((item.name === 'Inventory' && hasLowStock) || 
                  (item.name === 'Support Center' && hasSupportAlert) ||
                  (item.name === 'Notifications' && hasNotificationsAlert)) && (
                  <span className="relative flex h-2.5 w-2.5 mr-1 shrink-0 pointer-events-none">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                )}
              </Link>
            );
          })}

          {/* Exit POS / Logout button */}
          <button
            onClick={async () => {
              const { createClient } = await import('@/lib/supabase/client');
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border border-transparent text-slate-400 hover:text-red-400 hover:bg-slate-900/40 mt-4 group"
          >
            <div className="flex items-center gap-3 pointer-events-none">
              <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
              <span>Exit POS</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Bottom Profile Section */}
      <div className="p-6 border-t border-slate-800 shrink-0 bg-slate-950">
        
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
      </div>
    </div>
  );
}
