'use client';

import React, { useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  UserCheck,
  TrendingUp,
  Star,
  MessageSquareHeart,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  Activity,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  Lock,
  Server,
  Eye,
  X,
  ExternalLink,
  ShieldAlert,
  Download,
  FileSpreadsheet,
  Radio,
  MapPin,
  FileText,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Megaphone,
  Package,
  ShoppingBag,
  CreditCard,
  Wallet,
  Smartphone,
  Info,
  ChevronDown,
  Code,
  Tag,
} from 'lucide-react';
import AdminAnnouncementsManager from './AdminAnnouncementsManager';
import {
  SuperAdminStats,
  AdminBusinessRecord,
  AdminUserRecord,
  AdminCustomerRecord,
  AdminFeedbackRecord,
  AdminAuditRecord,
  SystemHealthData,
  AdminTransactionAnalytics,
  AdminTransactionRecord,
  AdminInventoryAnalytics,
  AdminInventoryAlertRecord,
  AdminBusinessDetailPayload,
  toggleBusinessStatus,
  toggleUserStatus,
  getSystemHealth,
  getAllAdminData,
  getAdminBusinessDetails,
} from '@/app/actions/admin';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  type AdminDateRange,
  getDateRangeLabel,
} from '@/utils/formatters';
import {
  exportUsersToCsv,
  exportCustomersToCsv,
  exportFeedbackToCsv,
  exportBusinessesToCsv,
  exportAuditLogsToCsv,
  exportTransactionsToCsv,
  exportInventoryAlertsToCsv,
} from '@/utils/csvExport';
import { createClient } from '@/lib/supabase/client';

interface AdminDashboardViewProps {
  stats: SuperAdminStats;
  initialTransactions: AdminTransactionAnalytics;
  initialInventory: AdminInventoryAnalytics;
  businesses: AdminBusinessRecord[];
  users: AdminUserRecord[];
  customers: AdminCustomerRecord[];
  feedback: AdminFeedbackRecord[];
  auditLogs: AdminAuditRecord[];
  initialHealth: SystemHealthData;
  adminEmail: string;
}

type TabType =
  | 'overview'
  | 'transactions'
  | 'inventory'
  | 'businesses'
  | 'users'
  | 'customers'
  | 'feedback'
  | 'announcements'
  | 'audit'
  | 'health';

export default function AdminDashboardView({
  stats: initialStats,
  initialTransactions,
  initialInventory,
  businesses: initialBusinesses,
  users: initialUsers,
  customers: initialCustomers,
  feedback: initialFeedback,
  auditLogs: initialAuditLogs,
  initialHealth,
  adminEmail,
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isPending, startTransition] = useTransition();

  // ─────────────────────────────────────────────────────────────────────────────
  // REAL-TIME DATA STATE & DATE RANGE
  // ─────────────────────────────────────────────────────────────────────────────
  const [selectedRange, setSelectedRange] = useState<AdminDateRange>('all');
  const [stats, setStats] = useState<SuperAdminStats>(initialStats);
  const [transactions, setTransactions] = useState<AdminTransactionAnalytics>(initialTransactions);
  const [inventory, setInventory] = useState<AdminInventoryAnalytics>(initialInventory);
  const [businesses, setBusinesses] = useState<AdminBusinessRecord[]>(initialBusinesses);
  const [users, setUsers] = useState<AdminUserRecord[]>(initialUsers);
  const [customers, setCustomers] = useState<AdminCustomerRecord[]>(initialCustomers);
  const [feedback, setFeedback] = useState<AdminFeedbackRecord[]>(initialFeedback);
  const [auditLogs, setAuditLogs] = useState<AdminAuditRecord[]>(initialAuditLogs);
  const [healthData, setHealthData] = useState<SystemHealthData>(initialHealth);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(20); // 20s default

  // Notification banners
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Business Directory filters & pagination
  const [bizSearch, setBizSearch] = useState('');
  const [bizStatusFilter, setBizStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [bizPage, setBizPage] = useState(1);
  const [selectedBizDetail, setSelectedBizDetail] = useState<AdminBusinessDetailPayload | null>(null);
  const [loadingBizDetail, setLoadingBizDetail] = useState(false);

  // Transaction tab filters & pagination
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [transactionPage, setTransactionPage] = useState(1);

  // Inventory tab filters & pagination
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'all' | 'out_of_stock' | 'critical_low' | 'reorder_soon'>('all');
  const [inventoryPage, setInventoryPage] = useState(1);

  // User Directory filters & pagination
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [userPage, setUserPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);

  // Customer Directory filters & pagination
  const [custSearch, setCustSearch] = useState('');
  const [custBizFilter, setCustBizFilter] = useState<string>('all');
  const [custStatusFilter, setCustStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [custPage, setCustPage] = useState(1);
  const [selectedCust, setSelectedCust] = useState<AdminCustomerRecord | null>(null);

  // Feedback filters & pagination
  const [feedbackCatFilter, setFeedbackCatFilter] = useState<string>('all');
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<string>('all');
  const [feedbackPage, setFeedbackPage] = useState(1);

  // Audit Log filters, pagination & inspector
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEventTypeFilter, setAuditEventTypeFilter] = useState<string>('all');
  const [auditBizFilter, setAuditBizFilter] = useState<string>('all');
  const [auditPage, setAuditPage] = useState(1);
  const [selectedLogMetadata, setSelectedLogMetadata] = useState<AdminAuditRecord | null>(null);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionLabel: string;
    isDestructive: boolean;
    onConfirm: () => void;
  } | null>(null);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // REAL-TIME SYNC & DATE RANGE HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const refreshAllData = useCallback(
    async (silent = false, range: AdminDateRange = selectedRange) => {
      if (!silent) setIsRefreshing(true);
      try {
        const res = await getAllAdminData(range);
        if (res.data) {
          setStats(res.data.stats);
          setTransactions(res.data.transactions);
          setInventory(res.data.inventory);
          setBusinesses(res.data.businesses);
          setUsers(res.data.users);
          setCustomers(res.data.customers);
          setFeedback(res.data.feedback);
          setAuditLogs(res.data.auditLogs);
          setHealthData(res.data.health);
          setLastRefreshedAt(new Date());
        }
      } catch (err: any) {
        console.warn('Real-time sync notice:', err);
      } finally {
        if (!silent) setIsRefreshing(false);
      }
    },
    [selectedRange]
  );

  const handleRangeChange = (range: AdminDateRange) => {
    setSelectedRange(range);
    refreshAllData(false, range);
  };

  // Periodic Auto-Refresh
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      refreshAllData(true, selectedRange);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, selectedRange, refreshAllData]);

  // Supabase Real-Time Channel Subscription (WebSocket push)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('platform_owner_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () =>
        refreshAllData(true, selectedRange)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () =>
        refreshAllData(true, selectedRange)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () =>
        refreshAllData(true, selectedRange)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () =>
        refreshAllData(true, selectedRange)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () =>
        refreshAllData(true, selectedRange)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_feedback' }, () =>
        refreshAllData(true, selectedRange)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () =>
        refreshAllData(true, selectedRange)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRange, refreshAllData]);

  // Deep drill-down inspection for a business
  const handleInspectBusiness = async (bizId: string) => {
    setLoadingBizDetail(true);
    setSelectedBizDetail(null);
    try {
      const res = await getAdminBusinessDetails(bizId);
      if (res.data) {
        setSelectedBizDetail(res.data);
      } else {
        setActionError(res.error || 'Failed to load business details.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error loading business details.');
    } finally {
      setLoadingBizDetail(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FILTERED DATASETS
  // ─────────────────────────────────────────────────────────────────────────────

  // Businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      const q = bizSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        (b.email && b.email.toLowerCase().includes(q)) ||
        (b.business_type && b.business_type.toLowerCase().includes(q)) ||
        (b.owner_name && b.owner_name.toLowerCase().includes(q));
      const matchesStatus = bizStatusFilter === 'all' || b.status === bizStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [businesses, bizSearch, bizStatusFilter]);

  const totalBizPages = Math.max(1, Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE));
  const paginatedBusinesses = useMemo(() => {
    const start = (bizPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, bizPage]);

  // Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.recentTransactions.filter((t) => {
      const q = transactionSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.sale_number.toLowerCase().includes(q) ||
        t.business_name.toLowerCase().includes(q) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
        t.payment_method.toLowerCase().includes(q);
      const matchesStatus =
        transactionStatusFilter === 'all' || t.status === transactionStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [transactions.recentTransactions, transactionSearch, transactionStatusFilter]);

  const totalTransactionPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const paginatedTransactions = useMemo(() => {
    const start = (transactionPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, transactionPage]);

  // Inventory Alerts
  const filteredInventoryAlerts = useMemo(() => {
    return inventory.alerts.filter((a) => {
      const q = inventorySearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.sku && a.sku.toLowerCase().includes(q)) ||
        a.business_name.toLowerCase().includes(q);
      const matchesStatus =
        inventoryStatusFilter === 'all' || a.status === inventoryStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [inventory.alerts, inventorySearch, inventoryStatusFilter]);

  const totalInventoryPages = Math.max(1, Math.ceil(filteredInventoryAlerts.length / ITEMS_PER_PAGE));
  const paginatedInventoryAlerts = useMemo(() => {
    const start = (inventoryPage - 1) * ITEMS_PER_PAGE;
    return filteredInventoryAlerts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInventoryAlerts, inventoryPage]);

  // Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        (u.businesses && u.businesses.some((b) => b.name.toLowerCase().includes(q)));
      const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, userSearch, userStatusFilter]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, userPage]);

  // Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = custSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.business_name && c.business_name.toLowerCase().includes(q));
      const matchesBiz = custBizFilter === 'all' || c.business_id === custBizFilter;
      const matchesStatus = custStatusFilter === 'all' || c.status === custStatusFilter;
      return matchesSearch && matchesBiz && matchesStatus;
    });
  }, [customers, custSearch, custBizFilter, custStatusFilter]);

  const totalCustPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE));
  const paginatedCustomers = useMemo(() => {
    const start = (custPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, custPage]);

  // Feedback
  const filteredFeedback = useMemo(() => {
    return feedback.filter((f) => {
      const matchesCat = feedbackCatFilter === 'all' || f.category === feedbackCatFilter;
      const matchesRating =
        feedbackRatingFilter === 'all' || String(f.rating) === feedbackRatingFilter;
      return matchesCat && matchesRating;
    });
  }, [feedback, feedbackCatFilter, feedbackRatingFilter]);

  const totalFeedbackPages = Math.max(1, Math.ceil(filteredFeedback.length / ITEMS_PER_PAGE));
  const paginatedFeedback = useMemo(() => {
    const start = (feedbackPage - 1) * ITEMS_PER_PAGE;
    return filteredFeedback.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredFeedback, feedbackPage]);

  // Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((l) => {
      const q = auditSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.action.toLowerCase().includes(q) ||
        l.entity_type.toLowerCase().includes(q) ||
        (l.user?.name && l.user.name.toLowerCase().includes(q)) ||
        (l.user?.email && l.user.email.toLowerCase().includes(q)) ||
        (l.business?.name && l.business.name.toLowerCase().includes(q));
      const matchesEvent =
        auditEventTypeFilter === 'all' || l.entity_type === auditEventTypeFilter;
      const matchesBiz =
        auditBizFilter === 'all' || (l.business && l.business.name === auditBizFilter);
      return matchesSearch && matchesEvent && matchesBiz;
    });
  }, [auditLogs, auditSearch, auditEventTypeFilter, auditBizFilter]);

  const totalAuditPages = Math.max(1, Math.ceil(filteredAuditLogs.length / ITEMS_PER_PAGE));
  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * ITEMS_PER_PAGE;
    return filteredAuditLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAuditLogs, auditPage]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleToggleBiz = (biz: AdminBusinessRecord) => {
    const nextStatus = biz.status === 'active' ? 'inactive' : 'active';
    setConfirmModal({
      open: true,
      title: `${nextStatus === 'inactive' ? 'Suspend' : 'Activate'} Tenant Account`,
      description: `Are you sure you want to ${
        nextStatus === 'inactive'
          ? 'suspend this business workspace? Its staff members will immediately be blocked from accessing operations.'
          : 'reactivate this business workspace? Full operational access will be restored.'
      } Business: "${biz.name}".`,
      actionLabel: nextStatus === 'inactive' ? 'Suspend Business' : 'Activate Business',
      isDestructive: nextStatus === 'inactive',
      onConfirm: () => {
        setConfirmModal(null);
        startTransition(async () => {
          setActionError(null);
          setActionSuccess(null);
          const res = await toggleBusinessStatus(biz.id, nextStatus);
          if (res.error) {
            setActionError(res.error);
          } else {
            setActionSuccess(`Business "${biz.name}" status updated to ${nextStatus.toUpperCase()}.`);
            refreshAllData(true, selectedRange);
          }
        });
      },
    });
  };

  const handleToggleUser = (user: AdminUserRecord) => {
    if (user.isPlatformOwner) {
      setActionError('Protected Root Account: Platform Owner credentials cannot be deactivated.');
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    setConfirmModal({
      open: true,
      title: `${nextStatus === 'inactive' ? 'Suspend' : 'Reactivate'} Platform User`,
      description: `Are you sure you want to ${
        nextStatus === 'inactive'
          ? 'suspend this user? They will be locked out of all associated businesses.'
          : 'reactivate this user? Access will be restored.'
      } User: "${user.name}" (${user.email}).`,
      actionLabel: nextStatus === 'inactive' ? 'Suspend User' : 'Reactivate User',
      isDestructive: nextStatus === 'inactive',
      onConfirm: () => {
        setConfirmModal(null);
        startTransition(async () => {
          setActionError(null);
          setActionSuccess(null);
          const res = await toggleUserStatus(user.id, nextStatus);
          if (res.error) {
            setActionError(res.error);
          } else {
            setActionSuccess(`User "${user.name}" status updated to ${nextStatus.toUpperCase()}.`);
            refreshAllData(true, selectedRange);
          }
        });
      },
    });
  };

  // Helper for inactivity badges
  const renderInactivityBadge = (status: AdminBusinessRecord['inactivity_status']) => {
    switch (status) {
      case 'active_today':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Active Today
          </span>
        );
      case 'active_recently':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Past 7 Days
          </span>
        );
      case 'dormant_14d':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Dormant (14d+)
          </span>
        );
      case 'dormant_30d':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Inactive (30d+)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/5">
            No Sales Yet
          </span>
        );
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER UI
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 text-slate-100">
      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP EXECUTIVE TELEMETRY & FILTER BAR */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Platform Identity & SLA status */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Platform Owner Dashboard & BI
              </h1>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>SYSTEM HEALTHY • {healthData.databaseLatencyMs}ms</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Cross-platform sales telemetry, real-time inventory alerts, multi-tenant customer intelligence, and audit governance.
            </p>
          </div>

          {/* Date Range Selector & Real-time controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Date Range Filter Pills */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/10">
              {(
                [
                  { id: 'today', label: 'Today' },
                  { id: '7d', label: '7D' },
                  { id: '30d', label: '30D' },
                  { id: 'year', label: 'Year' },
                  { id: 'all', label: 'All Time' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleRangeChange(tab.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedRange === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Auto-refresh interval selector */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-300">
              <RefreshCw
                className={`w-3.5 h-3.5 text-blue-400 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
              <span className="text-[11px] text-slate-400">Sync:</span>
              <select
                aria-label="Real-time refresh rate"
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent border-0 text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-slate-900 text-slate-300">
                  Manual Only
                </option>
                <option value={10} className="bg-slate-900 text-slate-300">
                  Every 10s
                </option>
                <option value={20} className="bg-slate-900 text-slate-300">
                  Every 20s
                </option>
                <option value={60} className="bg-slate-900 text-slate-300">
                  Every 60s
                </option>
              </select>
            </div>

            {/* Quick Export Hub Dropdown */}
            <div className="relative group">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-slate-900 border border-white/10 shadow-2xl py-1.5 z-40 hidden group-hover:block backdrop-blur-2xl">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5">
                  Business Intelligence Exports
                </div>
                <button
                  type="button"
                  onClick={() => exportTransactionsToCsv(transactions.recentTransactions)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Transactions Ledger ({transactions.recentTransactions.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportInventoryAlertsToCsv(inventory.alerts)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inventory Reorder Alerts ({inventory.alerts.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportBusinessesToCsv(businesses)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Registered Stores ({businesses.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportUsersToCsv(users)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Platform Users ({users.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportCustomersToCsv(customers)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Customers Network ({customers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportAuditLogsToCsv(auditLogs)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer transition-colors border-t border-white/5"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Audit Trail Logs ({auditLogs.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sync telemetry sub-banner */}
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Last Synchronized:{' '}
                <strong className="text-slate-200 font-mono" suppressHydrationWarning>
                  {mounted ? lastRefreshedAt.toLocaleTimeString() : '...'}
                </strong>
              </span>
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline">
              Period: <strong className="text-blue-300">{getDateRangeLabel(selectedRange)}</strong>
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline">
              Operator: <strong className="text-slate-300">{adminEmail}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="px-2 py-0.5 rounded bg-white/5 font-mono text-[10px]">v1.2.0-MVP</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 2. NOTIFICATIONS */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 3. GLASSMORHPIC TAB NAVIGATION */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 no-scrollbar">
        {[
          { id: 'overview', label: 'Platform Overview', icon: Activity, count: null },
          {
            id: 'transactions',
            label: 'Transactions & Sales',
            icon: TrendingUp,
            count: transactions.totalTransactions,
          },
          {
            id: 'inventory',
            label: 'Inventory Alerts',
            icon: Package,
            count: inventory.outOfStockCount + inventory.lowStockCount,
            alert: inventory.outOfStockCount > 0,
          },
          { id: 'businesses', label: 'Business Explorer', icon: Building2, count: stats.totalBusinesses },
          { id: 'users', label: 'Platform Users', icon: Users, count: stats.totalUsers },
          { id: 'customers', label: 'Customers Network', icon: UserCheck, count: stats.totalCustomers },
          { id: 'feedback', label: 'Experience Hub', icon: MessageSquareHeart, count: stats.totalFeedbackCount },
          { id: 'announcements', label: 'Announcements', icon: Megaphone, count: null },
          { id: 'audit', label: 'Audit Compliance', icon: ShieldCheck, count: stats.recentActivityCount },
          { id: 'health', label: 'System Health', icon: Server, count: null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.alert
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 4. TAB CONTENTS */}
      {/* ───────────────────────────────────────────────────────────────────── */}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TAB: OVERVIEW */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Filter Banner */}
          <div className="flex items-center justify-between text-xs px-1 text-slate-400">
            <span>
              Executive Telemetry Filtered By:{' '}
              <strong className="text-blue-400 font-semibold">{getDateRangeLabel(selectedRange)}</strong>
            </span>
            <span className="text-[11px] text-slate-500">Real database records • No synthetic figures</span>
          </div>

          {/* 6 Key Accountability Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Cumulative Recorded Sales */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Gross Recorded Sales
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {formatCurrency(stats.grossSalesValue)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{stats.totalSalesCount} completed sales</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('transactions')}
                  className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 2. Realized Cash & Transfers Collected */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Realized Cash / Transfers
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                  {formatCurrency(stats.totalCollected)}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Direct funds collected across customer checkouts
              </div>
            </div>

            {/* 3. Platform Customer Receivables / Debt */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Credit Receivables (Debt)
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-amber-400 font-mono">
                  {formatCurrency(stats.totalCustomerDebt)}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Open customer balances awaiting settlement
              </div>
            </div>

            {/* 4. Total Cataloged Products & Out of Stock */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Product Catalog & Stock
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {formatNumber(stats.totalProductsCount)}
                </span>
                <span className="text-xs text-slate-400">Products</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 font-semibold">{stats.outOfStockCount} Out of Stock</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-400 font-semibold">{stats.lowStockCount} Low</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                >
                  View
                </button>
              </div>
            </div>

            {/* 5. Registered Tenants */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Registered Tenants
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {formatNumber(stats.totalBusinesses)}
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  {stats.totalBusinesses > 0
                    ? Math.round((stats.activeBusinesses / stats.totalBusinesses) * 100)
                    : 100}
                  % Active
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 font-medium">{stats.activeBusinesses} active</span>
                <span>•</span>
                <span className="text-rose-400 font-medium">{stats.inactiveBusinesses} suspended</span>
              </div>
            </div>

            {/* 6. Platform Users */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Platform Users
                </span>
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {formatNumber(stats.totalUsers)}
                </span>
                <span className="text-xs text-cyan-400 font-semibold">
                  {stats.roleDistribution.owner} Owners
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{stats.roleDistribution.admin} Admins</span>
                <span>•</span>
                <span>{stats.roleDistribution.staff} Staff</span>
                <span>•</span>
                <span className="text-indigo-400">{stats.roleDistribution.superAdmin} Super</span>
              </div>
            </div>
          </div>

          {/* Registration Trends & Quick Export Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Visual */}
            <div className="lg:col-span-2 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <span>Tenant Onboarding Trajectory</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Monthly store registrations on TraderERP</p>
                </div>
                <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                  {stats.registrationTrends.length} Active Periods
                </span>
              </div>

              {stats.registrationTrends.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No historical registration telemetry recorded yet.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {stats.registrationTrends.map((t) => {
                    const maxVal = Math.max(...stats.registrationTrends.map((i) => i.count), 1);
                    const pct = Math.round((t.count / maxVal) * 100);
                    return (
                      <div key={t.period} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-300">{t.period}</span>
                          <span className="font-mono text-slate-400 font-bold">
                            {t.count} stores ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Export & Actions Card */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Accountability Reports (CSV)</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Export complete data sheets for stakeholders, offline reconciliation, and audit compliance.
                </p>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => exportTransactionsToCsv(transactions.recentTransactions)}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                      <span>Transactions Sheet</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      {transactions.recentTransactions.length} rows
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportInventoryAlertsToCsv(inventory.alerts)}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-amber-400" />
                      <span>Inventory Alerts Sheet</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      {inventory.alerts.length} rows
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportBusinessesToCsv(businesses)}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Registered Store Profiles</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      {businesses.length} rows
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportCustomersToCsv(customers)}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>All Platform Customers</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      {customers.length} rows
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-4 text-[11px] text-slate-400">
                UTF-8 formatted with Excel BOM headers.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TAB: TRANSACTIONS ANALYTICS */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Financial Disambiguation Banner */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-3 backdrop-blur-md">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white font-semibold">Strict Financial Disambiguation Rules:</strong>
              <p className="text-slate-300 leading-relaxed">
                Gross Recorded Sales represents completed sales value. Payments Received reflects actual cash/transfers realized. Customer Debt represents open credit receivables. Cancelled transactions are segregated and excluded from revenue totals.
              </p>
            </div>
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Gross Sales Value
              </span>
              <div className="text-2xl font-extrabold text-white font-mono">
                {formatCurrency(transactions.grossSalesValue)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Across all completed checkouts</div>
            </div>

            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Completed Transactions
              </span>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                {formatNumber(transactions.completedTransactions)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {transactions.cancelledTransactions} cancelled/voided
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Payments Realized
              </span>
              <div className="text-2xl font-extrabold text-blue-400 font-mono">
                {formatCurrency(transactions.totalCollected)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Cash & electronic transfers settled</div>
            </div>

            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Outstanding Credit Debt
              </span>
              <div className="text-2xl font-extrabold text-amber-400 font-mono">
                {formatCurrency(transactions.totalOutstandingCredit)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Unpaid customer balance on credit sales</div>
            </div>
          </div>

          {/* Payment Methods & Top Businesses Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Method Distribution */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span>Settlement Methods Distribution</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">How customer transactions are tendered</p>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  {
                    label: 'Cash In Hand',
                    icon: Wallet,
                    stat: transactions.paymentMethods.cash,
                    color: 'from-emerald-500 to-teal-400',
                  },
                  {
                    label: 'Bank Transfer',
                    icon: ArrowUpRight,
                    stat: transactions.paymentMethods.bank_transfer,
                    color: 'from-blue-500 to-cyan-400',
                  },
                  {
                    label: 'POS / Terminal',
                    icon: Smartphone,
                    stat: transactions.paymentMethods.pos,
                    color: 'from-purple-500 to-indigo-400',
                  },
                  {
                    label: 'Credit / Ledger',
                    icon: Clock,
                    stat: transactions.paymentMethods.credit,
                    color: 'from-amber-500 to-yellow-400',
                  },
                ].map((item) => {
                  const totalVal = Math.max(transactions.grossSalesValue, 1);
                  const pct = Math.round((item.stat.value / totalVal) * 100);
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.label}</span>
                        </span>
                        <span className="font-mono text-slate-200 font-bold">
                          {formatCurrency(item.stat.value)} ({item.stat.count})
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                        <div
                          className={`bg-gradient-to-r ${item.color} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(pct, item.stat.value > 0 ? 5 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Businesses by Volume */}
            <div className="lg:col-span-2 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>Top Stores by Transaction Volume</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Highest gross sales leaders in selected period</p>
                </div>
                <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                  Top 10 Rankings
                </span>
              </div>

              {transactions.topBusinesses.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No completed transactions recorded in this period.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Rank</th>
                        <th className="py-2.5 px-3">Store Name</th>
                        <th className="py-2.5 px-3">Sales Count</th>
                        <th className="py-2.5 px-3">Gross Sales (NGN)</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {transactions.topBusinesses.map((b, idx) => (
                        <tr key={b.business_id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-400">
                            #{idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">{b.business_name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {b.transaction_count} sales
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                            {formatCurrency(b.total_sales)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleInspectBusiness(b.business_id)}
                              className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Searchable Platform Transactions Table */}
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={transactionSearch}
                    onChange={(e) => {
                      setTransactionSearch(e.target.value);
                      setTransactionPage(1);
                    }}
                    placeholder="Search receipt #, store, customer, method..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  aria-label="Filter transactions by status"
                  value={transactionStatusFilter}
                  onChange={(e) => {
                    setTransactionStatusFilter(e.target.value as any);
                    setTransactionPage(1);
                  }}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed Only</option>
                  <option value="cancelled">Cancelled Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportTransactionsToCsv(filteredTransactions)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download CSV ({filteredTransactions.length})</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Store Scope</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Paid / Balance</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No transactions match your search filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {formatDateTime(tx.created_at)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {tx.sale_number}
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-medium">
                          {tx.business_name}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {tx.customer_name || 'Walk-in Customer'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {formatCurrency(tx.total)}
                        </td>
                        <td className="py-3 px-4 text-[11px] font-mono">
                          <span className="text-slate-300">{formatCurrency(tx.amount_paid)}</span>
                          {tx.balance_due > 0 && (
                            <span className="text-amber-400 ml-1.5 font-semibold">
                              (Due: {formatCurrency(tx.balance_due)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize px-2 py-0.5 rounded bg-white/5 font-mono text-[10px] text-slate-300">
                            {tx.payment_method.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tx.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalTransactionPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 text-xs text-slate-400">
                <span>
                  Page {transactionPage} of {totalTransactionPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={transactionPage <= 1}
                    onClick={() => setTransactionPage((p) => p - 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={transactionPage >= totalTransactionPages}
                    onClick={() => setTransactionPage((p) => p + 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TAB: INVENTORY & STOCK ALERTS */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Multi-Tenant Isolation Notice */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-3 backdrop-blur-md">
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white font-semibold">Store Boundary Isolation:</strong>
              <p className="text-slate-300 leading-relaxed">
                Stock counts and SKUs are strictly segregated per customer store. Cross-store physical quantities are not conflated into single unit sums. This view aggregates platform-wide catalog scale and identifies stores at risk of stock-outs.
              </p>
            </div>
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Total Products Cataloged
              </span>
              <div className="text-2xl font-extrabold text-white font-mono">
                {formatNumber(inventory.totalProducts)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Across {inventory.businessesWithProducts} active store catalogs
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Out of Stock (Zero Units)
              </span>
              <div className="text-2xl font-extrabold text-rose-400 font-mono">
                {formatNumber(inventory.outOfStockCount)}
              </div>
              <div className="text-xs text-rose-300/80 mt-1">Requires immediate restocking</div>
            </div>

            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Low-Stock Reorder Alerts
              </span>
              <div className="text-2xl font-extrabold text-amber-400 font-mono">
                {formatNumber(inventory.lowStockCount)}
              </div>
              <div className="text-xs text-amber-300/80 mt-1">At or below reorder threshold</div>
            </div>

            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Estimated Inventory Valuation
              </span>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                {formatCurrency(inventory.estimatedTotalValuation)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Based on known unit purchase costs</div>
            </div>
          </div>

          {/* Store Catalog Size Ranking */}
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-400" />
                  <span>Store Catalog Size & Health</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Top businesses by product catalog count</p>
              </div>
              <span className="text-xs font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg">
                {inventory.topCatalogs.length} Active Stores
              </span>
            </div>

            {inventory.topCatalogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No store has added products to the catalog yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {inventory.topCatalogs.map((store) => (
                  <div
                    key={store.business_id}
                    className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between hover:border-white/15 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs truncate max-w-[180px]">
                          {store.business_name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-300 font-bold">
                          {store.product_count} items
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11px]">
                        <span className="text-amber-400 font-medium">
                          {store.low_stock_count} low/out
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">
                          Val: {formatCurrency(store.estimated_valuation)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleInspectBusiness(store.business_id)}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                      >
                        Inspect Store
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform-Wide Reorder Alerts Table */}
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={(e) => {
                      setInventorySearch(e.target.value);
                      setInventoryPage(1);
                    }}
                    placeholder="Search product name, SKU, store..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <select
                  aria-label="Filter inventory alerts by severity"
                  value={inventoryStatusFilter}
                  onChange={(e) => {
                    setInventoryStatusFilter(e.target.value as any);
                    setInventoryPage(1);
                  }}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Alerts</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="critical_low">Critical Low</option>
                  <option value="reorder_soon">Reorder Soon</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportInventoryAlertsToCsv(filteredInventoryAlerts)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Download Alerts CSV ({filteredInventoryAlerts.length})</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Store Scope</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Min. Threshold</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Pricing</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paginatedInventoryAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No inventory items currently trigger reorder alerts.
                      </td>
                    </tr>
                  ) : (
                    paginatedInventoryAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-slate-200 font-medium">
                          {alert.business_name}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{alert.name}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {alert.sku || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span
                            className={
                              alert.current_stock <= 0
                                ? 'text-rose-400 font-extrabold'
                                : 'text-amber-400'
                            }
                          >
                            {alert.current_stock} {alert.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {alert.minimum_stock} {alert.unit}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              alert.status === 'out_of_stock'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : alert.status === 'critical_low'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30'
                            }`}
                          >
                            {alert.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] font-mono text-slate-300">
                          Sell: {formatCurrency(alert.selling_price)}
                          {alert.purchase_price > 0 && (
                            <span className="text-slate-500 ml-1.5">
                              (Cost: {formatCurrency(alert.purchase_price)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleInspectBusiness(alert.business_id)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalInventoryPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 text-xs text-slate-400">
                <span>
                  Page {inventoryPage} of {totalInventoryPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={inventoryPage <= 1}
                    onClick={() => setInventoryPage((p) => p - 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={inventoryPage >= totalInventoryPages}
                    onClick={() => setInventoryPage((p) => p + 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TAB: BUSINESS EXPLORER (TENANTS) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeTab === 'businesses' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={bizSearch}
                    onChange={(e) => {
                      setBizSearch(e.target.value);
                      setBizPage(1);
                    }}
                    placeholder="Search businesses by name, type, email..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  aria-label="Filter businesses by status"
                  value={bizStatusFilter}
                  onChange={(e) => {
                    setBizStatusFilter(e.target.value as any);
                    setBizPage(1);
                  }}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Suspended</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportBusinessesToCsv(filteredBusinesses)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Download CSV ({filteredBusinesses.length})</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Business</th>
                    <th className="py-3 px-4">Owner / Contact</th>
                    <th className="py-3 px-4">Activity Status</th>
                    <th className="py-3 px-4">Sales Telemetry</th>
                    <th className="py-3 px-4">Catalog</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paginatedBusinesses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No businesses matched your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedBusinesses.map((b) => (
                      <tr key={b.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{b.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="capitalize">{b.business_type || 'General'}</span>
                            <span>•</span>
                            <span className="font-mono">{b.currency}</span>
                            {b.address && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[140px]">{b.address}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-200">{b.owner_name || 'N/A'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {b.owner_email || b.email || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {renderInactivityBadge(b.inactivity_status)}
                          {b.last_activity_at && (
                            <div className="text-[10px] text-slate-500 mt-1 font-mono">
                              Last: {formatDate(b.last_activity_at)}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-white">
                            {formatCurrency(b.total_sales_value)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {b.total_sales_count} completed sales
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {b.total_products_count} items
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              b.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleInspectBusiness(b.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-blue-300 border border-white/10 cursor-pointer transition-all"
                          >
                            Inspect
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleBiz(b)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              b.status === 'active'
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {b.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalBizPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 text-xs text-slate-400">
                <span>
                  Page {bizPage} of {totalBizPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={bizPage <= 1}
                    onClick={() => setBizPage((p) => p - 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={bizPage >= totalBizPages}
                    onClick={() => setBizPage((p) => p + 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* BUSINESS DRILL-DOWN DRAWER / MODAL */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {(selectedBizDetail || loadingBizDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl space-y-6">
            {loadingBizDetail ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading business telemetry and audit records...</p>
              </div>
            ) : selectedBizDetail ? (
              <>
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-white/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-extrabold text-white">
                        {selectedBizDetail.business.name}
                      </h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          selectedBizDetail.business.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {selectedBizDetail.business.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Owner: <strong className="text-slate-200">{selectedBizDetail.business.owner_name}</strong> (
                      {selectedBizDetail.business.owner_email}) • Registered: {formatDate(selectedBizDetail.business.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBizDetail(null)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick KPI stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                      Gross Sales
                    </span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      {formatCurrency(selectedBizDetail.business.total_sales_value)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {selectedBizDetail.business.total_sales_count} sales completed
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                      Customer Debt
                    </span>
                    <span className="text-lg font-bold font-mono text-amber-400">
                      {formatCurrency(selectedBizDetail.totalCustomerDebt)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Across {selectedBizDetail.customerCount} customers
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                      Products Catalog
                    </span>
                    <span className="text-lg font-bold font-mono text-white">
                      {selectedBizDetail.business.total_products_count}
                    </span>
                    <span className="text-[10px] text-rose-300 block mt-0.5">
                      {selectedBizDetail.lowStockProducts.length} low stock alerts
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                      Team Members
                    </span>
                    <span className="text-lg font-bold font-mono text-blue-400">
                      {selectedBizDetail.members.length}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Active operators</span>
                  </div>
                </div>

                {/* Team Members */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Store Team & Role Hierarchy
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 text-slate-400 text-[10px] uppercase font-bold">
                        <tr>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">Role</th>
                          <th className="py-2 px-3">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {selectedBizDetail.members.map((m) => (
                          <tr key={m.id}>
                            <td className="py-2 px-3 font-semibold text-white">{m.name}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">{m.email}</td>
                            <td className="py-2 px-3">
                              <span className="capitalize px-2 py-0.5 rounded bg-white/5 font-mono text-[10px]">
                                {m.role}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{formatDate(m.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Sales */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Recent 10 Sales in this Store
                  </h4>
                  {selectedBizDetail.recentSales.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500">
                      No sales recorded in this workspace.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/5">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 text-slate-400 text-[10px] uppercase font-bold">
                          <tr>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Receipt #</th>
                            <th className="py-2 px-3">Total</th>
                            <th className="py-2 px-3">Paid</th>
                            <th className="py-2 px-3">Method</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                          {selectedBizDetail.recentSales.map((s) => (
                            <tr key={s.id}>
                              <td className="py-2 px-3 font-mono text-slate-400">{formatDateTime(s.created_at)}</td>
                              <td className="py-2 px-3 font-mono font-bold text-white">{s.sale_number}</td>
                              <td className="py-2 px-3 font-mono font-bold text-emerald-400">{formatCurrency(s.total)}</td>
                              <td className="py-2 px-3 font-mono text-slate-300">{formatCurrency(s.amount_paid)}</td>
                              <td className="py-2 px-3 capitalize">{s.payment_method}</td>
                              <td className="py-2 px-3 uppercase text-[10px] font-bold">{s.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Low Stock Alerts for this store */}
                {selectedBizDetail.lowStockProducts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      Low Stock Alerts for this Store ({selectedBizDetail.lowStockProducts.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedBizDetail.lowStockProducts.map((p) => (
                        <div key={p.id} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs flex justify-between items-center">
                          <div>
                            <div className="font-bold text-white">{p.name}</div>
                            <div className="text-[11px] text-slate-400">SKU: {p.sku || '—'}</div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-rose-400 font-bold">{p.current_stock} {p.unit}</span>
                            <span className="text-slate-500 text-[10px] block">min: {p.minimum_stock}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TAB: PLATFORM USERS */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    placeholder="Search users by name, email, phone, store..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  aria-label="Filter users by status"
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value as any);
                    setUserPage(1);
                  }}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Suspended</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportUsersToCsv(filteredUsers)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download CSV ({filteredUsers.length})</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Workspaces & Roles</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No users matched your search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{u.name || 'Unnamed User'}</span>
                            {u.isPlatformOwner && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[9px] font-extrabold uppercase tracking-wide">
                                <ShieldAlert className="w-2.5 h-2.5" />
                                <span>Platform Owner</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.businesses && u.businesses.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {u.businesses.map((b) => (
                                <span
                                  key={b.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-slate-300"
                                >
                                  <span className="font-semibold text-white">{b.name}</span>
                                  <span className="text-slate-500 font-mono">({b.role})</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">No workspaces assigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                          {u.phone || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            disabled={u.isPlatformOwner}
                            onClick={() => handleToggleUser(u)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              u.status === 'active'
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalUserPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 text-xs text-slate-400">
                <span>
                  Page {userPage} of {totalUserPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((p) => p - 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={userPage >= totalUserPages}
                    onClick={() => setUserPage((p) => p + 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TAB: PLATFORM CUSTOMERS */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 flex-1 max-w-lg flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={custSearch}
                    onChange={(e) => {
                      setCustSearch(e.target.value);
                      setCustPage(1);
                    }}
                    placeholder="Search customers by name, phone, email..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  aria-label="Filter customers by business"
                  value={custBizFilter}
                  onChange={(e) => {
                    setCustBizFilter(e.target.value);
                    setCustPage(1);
                  }}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Businesses</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id} className="bg-slate-900 text-slate-300">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportCustomersToCsv(filteredCustomers)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download CSV ({filteredCustomers.length})</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Associated Store</th>
                    <th className="py-3 px-4">Phone / Email</th>
                    <th className="py-3 px-4">Outstanding Credit (Debt)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No customers match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">{c.name}</td>
                        <td className="py-3.5 px-4 text-slate-200 font-medium">
                          {c.business_name || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                          <div>{c.phone || '—'}</div>
                          {c.email && <div className="text-slate-500">{c.email}</div>}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold">
                          {c.outstanding_balance && c.outstanding_balance > 0 ? (
                            <span className="text-amber-400">{formatCurrency(c.outstanding_balance)}</span>
                          ) : (
                            <span className="text-emerald-400">₦0.00 (Settled)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              c.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] text-right">
                          {formatDate(c.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCustPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 text-xs text-slate-400">
                <span>
                  Page {custPage} of {totalCustPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={custPage <= 1}
                    onClick={() => setCustPage((p) => p - 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={custPage >= totalCustPages}
                    onClick={() => setCustPage((p) => p + 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TAB: EXPERIENCE HUB & CSAT */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
            {/* CSAT Metric Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 rounded-xl bg-white/5 border border-white/5">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                  Overall CSAT Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white font-mono">
                    {stats.averageRating.toFixed(1)}
                  </span>
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round(stats.averageRating) ? 'fill-amber-400' : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                  Total Reviews Logged
                </span>
                <span className="text-3xl font-extrabold text-amber-400 font-mono">
                  {stats.totalFeedbackCount}
                </span>
              </div>
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => exportFeedbackToCsv(feedback)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download CSAT CSV</span>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {paginatedFeedback.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No feedback items have been recorded yet.
                </div>
              ) : (
                paginatedFeedback.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{item.user_name || 'User'}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({item.user_email})</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-indigo-400 font-semibold text-[11px]">
                            {item.business_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="capitalize px-2 py-0.5 rounded bg-white/5 font-mono text-[10px] text-slate-300">
                            {item.category}
                          </span>
                          <div className="flex items-center text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= (item.rating || 5) ? 'fill-amber-400' : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {formatDateTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-white/5">
                      {item.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalFeedbackPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 text-xs text-slate-400">
                <span>
                  Page {feedbackPage} of {totalFeedbackPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={feedbackPage <= 1}
                    onClick={() => setFeedbackPage((p) => p - 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={feedbackPage >= totalFeedbackPages}
                    onClick={() => setFeedbackPage((p) => p + 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TAB: AUDIT COMPLIANCE & ACTIVITY TRAIL */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 flex-1 max-w-xl flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => {
                      setAuditSearch(e.target.value);
                      setAuditPage(1);
                    }}
                    placeholder="Filter audit logs by action, user, entity..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <select
                  aria-label="Filter audit logs by event type"
                  value={auditEventTypeFilter}
                  onChange={(e) => {
                    setAuditEventTypeFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Event Types</option>
                  <option value="sale">Sales Events</option>
                  <option value="product">Product & Stock</option>
                  <option value="business">Store & Tenant</option>
                  <option value="user">User & Auth</option>
                  <option value="business_member">Staff Roles</option>
                  <option value="expense">Expenses</option>
                  <option value="privacy_consent">Privacy Consents</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportAuditLogsToCsv(filteredAuditLogs)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Download Audit Log CSV ({filteredAuditLogs.length})</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Tenant Scope</th>
                    <th className="py-3 px-4 text-right">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paginatedAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No audit events match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                          {log.action}
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize px-2 py-0.5 rounded bg-white/5 font-mono text-[10px] text-slate-300">
                            {log.entity_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-200 font-medium">{log.user?.name || 'System Operator'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{log.user?.email || 'automated'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {log.business?.name || 'Global Platform'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {log.metadata && Object.keys(log.metadata).length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedLogMetadata(log)}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                            >
                              Inspect JSON
                            </button>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalAuditPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 text-xs text-slate-400">
                <span>
                  Page {auditPage} of {totalAuditPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => p - 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={auditPage >= totalAuditPages}
                    onClick={() => setAuditPage((p) => p + 1)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* AUDIT METADATA INSPECTOR MODAL */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {selectedLogMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-400" />
                  <span>Audit Event Payload</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Action: <strong className="text-indigo-300">{selectedLogMetadata.action}</strong> • Entity:{' '}
                  {selectedLogMetadata.entity_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogMetadata(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-white/10 overflow-x-auto max-h-72">
              <pre className="text-[11px] font-mono text-emerald-300">
                {JSON.stringify(selectedLogMetadata.metadata, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>Timestamp: {formatDateTime(selectedLogMetadata.created_at)}</span>
              <button
                type="button"
                onClick={() => setSelectedLogMetadata(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TAB: SYSTEM INFRASTRUCTURE & HEALTH */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Platform Infrastructure & Security Posture</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-tenant database connection metrics, authentication server status, and deployment runtime.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="text-[11px] uppercase font-bold text-slate-400">Database Engine</div>
                <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PostgreSQL (Supabase)</span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Latency: {healthData.databaseLatencyMs}ms
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="text-[11px] uppercase font-bold text-slate-400">Authentication Service</div>
                <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Supabase Auth & SSR</span>
                </div>
                <div className="text-xs text-slate-400">Strict Multi-Tenant Row Level Security</div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="text-[11px] uppercase font-bold text-slate-400">Runtime Environment</div>
                <div className="text-lg font-bold text-indigo-400 capitalize">
                  {healthData.environment}
                </div>
                <div className="text-xs text-slate-400 font-mono">Version: {healthData.platformVersion}</div>
              </div>
            </div>

            {/* Subscription & Billing Transparency Notice */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-blue-300 font-bold">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Platform Subscription Model & Gateway Status</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                TraderERP is currently in an <strong>Alpha Pilot Stage</strong> where customer onboarding and store setups are complimentary. Automated recurring Paystack billing and subscription plan tiers are architecturally planned for Phase 3 rollout once the user base reaches operational maturity.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-white">Platform Owner Sign-off & Accountability</div>
              <p className="text-slate-400 leading-relaxed">
                Platform governed by <strong className="text-slate-200">{healthData.platformOwner}</strong>. All multi-tenant data isolations, staff role boundaries, customer data encryptions, and transaction receipts are cryptographically isolated per business identifier.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TAB: ANNOUNCEMENTS */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeTab === 'announcements' && <AdminAnnouncementsManager />}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 5. CONFIRMATION MODAL */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {confirmModal && confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  confirmModal.isDestructive
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}
              >
                {confirmModal.isDestructive ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </div>
              <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{confirmModal.description}</p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md ${
                  confirmModal.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                }`}
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
