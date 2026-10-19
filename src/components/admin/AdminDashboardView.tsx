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
} from 'lucide-react';
import {
  SuperAdminStats,
  AdminBusinessRecord,
  AdminUserRecord,
  AdminCustomerRecord,
  AdminFeedbackRecord,
  AdminAuditRecord,
  SystemHealthData,
  toggleBusinessStatus,
  toggleUserStatus,
  getSystemHealth,
  getAllAdminData,
} from '@/app/actions/admin';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '@/utils/formatters';
import {
  exportUsersToCsv,
  exportCustomersToCsv,
  exportFeedbackToCsv,
  exportBusinessesToCsv,
  exportAuditLogsToCsv,
} from '@/utils/csvExport';
import { createClient } from '@/lib/supabase/client';

interface AdminDashboardViewProps {
  stats: SuperAdminStats;
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
  | 'businesses'
  | 'users'
  | 'customers'
  | 'feedback'
  | 'audit'
  | 'health'
  | 'settings';

export default function AdminDashboardView({
  stats: initialStats,
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
  // REAL-TIME DATA STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<SuperAdminStats>(initialStats);
  const [businesses, setBusinesses] = useState<AdminBusinessRecord[]>(initialBusinesses);
  const [users, setUsers] = useState<AdminUserRecord[]>(initialUsers);
  const [customers, setCustomers] = useState<AdminCustomerRecord[]>(initialCustomers);
  const [feedback, setFeedback] = useState<AdminFeedbackRecord[]>(initialFeedback);
  const [auditLogs, setAuditLogs] = useState<AdminAuditRecord[]>(initialAuditLogs);
  const [healthData, setHealthData] = useState<SystemHealthData>(initialHealth);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(20); // 20 seconds default

  // Notification banners
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Business Directory filters & pagination
  const [bizSearch, setBizSearch] = useState('');
  const [bizStatusFilter, setBizStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [bizPage, setBizPage] = useState(1);
  const [selectedBiz, setSelectedBiz] = useState<AdminBusinessRecord | null>(null);

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

  // Audit Log filters & pagination
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AdminAuditRecord | null>(null);

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

  // ─────────────────────────────────────────────────────────────────────────────
  // REAL-TIME SYNC LOGIC
  // ─────────────────────────────────────────────────────────────────────────────
  const refreshAllData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await getAllAdminData();
      if (res.data) {
        setStats(res.data.stats);
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
  }, []);

  // Periodic Auto-Refresh
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      refreshAllData(true);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, refreshAllData]);

  // Supabase Real-Time Channel Subscription (WebSocket push)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('platform_admin_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'businesses' },
        () => refreshAllData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => refreshAllData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => refreshAllData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_feedback' },
        () => refreshAllData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        () => refreshAllData(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAllData]);

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

  const paginatedBusinesses = useMemo(() => {
    const start = (bizPage - 1) * ITEMS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBusinesses, bizPage]);

  const totalBizPages = Math.max(1, Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE));

  // Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.businesses && u.businesses.some((b) => b.name.toLowerCase().includes(q)));
      const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, userSearch, userStatusFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, userPage]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));

  // Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = custSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.business_name && c.business_name.toLowerCase().includes(q));
      const matchesBiz = custBizFilter === 'all' || c.business_id === custBizFilter;
      const matchesStatus = custStatusFilter === 'all' || c.status === custStatusFilter;
      return matchesSearch && matchesBiz && matchesStatus;
    });
  }, [customers, custSearch, custBizFilter, custStatusFilter]);

  const paginatedCustomers = useMemo(() => {
    const start = (custPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, custPage]);

  const totalCustPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE));

  // Feedback
  const filteredFeedback = useMemo(() => {
    return feedback.filter((f) => {
      const matchesCategory = feedbackCatFilter === 'all' || f.category === feedbackCatFilter;
      const matchesRating =
        feedbackRatingFilter === 'all' ||
        (feedbackRatingFilter === 'unrated'
          ? f.rating === null || f.rating === undefined
          : f.rating === Number(feedbackRatingFilter));
      return matchesCategory && matchesRating;
    });
  }, [feedback, feedbackCatFilter, feedbackRatingFilter]);

  const paginatedFeedback = useMemo(() => {
    const start = (feedbackPage - 1) * ITEMS_PER_PAGE;
    return filteredFeedback.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredFeedback, feedbackPage]);

  const totalFeedbackPages = Math.max(1, Math.ceil(filteredFeedback.length / ITEMS_PER_PAGE));

  // Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((l) => {
      const q = auditSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        l.action.toLowerCase().includes(q) ||
        l.entity_type.toLowerCase().includes(q) ||
        (l.user?.name && l.user.name.toLowerCase().includes(q)) ||
        (l.user?.email && l.user.email.toLowerCase().includes(q)) ||
        (l.business?.name && l.business.name.toLowerCase().includes(q))
      );
    });
  }, [auditLogs, auditSearch]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * ITEMS_PER_PAGE;
    return filteredAuditLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAuditLogs, auditPage]);

  const totalAuditPages = Math.max(1, Math.ceil(filteredAuditLogs.length / ITEMS_PER_PAGE));

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
            refreshAllData(true);
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
            refreshAllData(true);
          }
        });
      },
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER UI
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 text-slate-100">
      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP ACCOUNTABILITY & SLA TELEMETRY BAR */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Platform Identity & SLA status */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Platform Governance & Telemetry
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
              Real-time multi-tenant intelligence, audit compliance, customer directories, and accountability reporting.
            </p>
          </div>

          {/* Real-time controls & Quick CSV Downloads */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Auto-refresh interval selector */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-300">
              <Radio className={`w-3.5 h-3.5 ${autoRefreshInterval > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-[11px] text-slate-400">Sync:</span>
              <select
                aria-label="Real-time sync interval"
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value={10} className="bg-slate-900 text-white">10s</option>
                <option value={20} className="bg-slate-900 text-white">20s (Live)</option>
                <option value={60} className="bg-slate-900 text-white">60s</option>
                <option value={0} className="bg-slate-900 text-white">Paused</option>
              </select>
            </div>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={() => refreshAllData(false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="Instant Real-time Sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            {/* Quick Export All Telemetry Button */}
            <div className="relative group">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              {/* Quick CSV Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-56 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-2xl border border-white/10 shadow-2xl z-50 hidden group-hover:block transition-all">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5">
                  Download System Datasets
                </div>
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
                  onClick={() => exportFeedbackToCsv(feedback)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <MessageSquareHeart className="w-3.5 h-3.5 text-amber-400" />
                  <span>Customer Feedback ({feedback.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportBusinessesToCsv(businesses)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Registered Tenants ({businesses.length})</span>
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
              <span>Last Synchronized: <strong className="text-slate-200 font-mono">{lastRefreshedAt.toLocaleTimeString()}</strong></span>
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline">Operator: <strong className="text-slate-300">{adminEmail}</strong></span>
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
          <button type="button" onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-white cursor-pointer">
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
          <button type="button" onClick={() => setActionError(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 3. GLASSMORHPIC TAB NAVIGATION */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 no-scrollbar">
        {[
          { id: 'overview', label: 'Reporting & Overview', icon: Activity, count: null },
          { id: 'businesses', label: 'Tenants / Stores', icon: Building2, count: stats.totalBusinesses },
          { id: 'users', label: 'Platform Users', icon: Users, count: stats.totalUsers },
          { id: 'customers', label: 'Customers Network', icon: UserCheck, count: stats.totalCustomers },
          { id: 'feedback', label: 'Experience Hub', icon: MessageSquareHeart, count: stats.totalFeedbackCount },
          { id: 'audit', label: 'Audit Compliance', icon: ShieldCheck, count: stats.recentActivityCount },
          { id: 'health', label: 'Infrastructure', icon: Server, count: null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-500/20 to-blue-500/20 text-white border border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                    isActive ? 'bg-indigo-500/30 text-indigo-200' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {formatNumber(tab.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 4. TAB CONTENTS */}
      {/* ───────────────────────────────────────────────────────────────────── */}

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 6 Key Accountability Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Businesses */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Tenants</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-white font-mono">{formatNumber(stats.totalBusinesses)}</span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  {stats.totalBusinesses > 0 ? Math.round((stats.activeBusinesses / stats.totalBusinesses) * 100) : 100}% Active
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 font-medium">{stats.activeBusinesses} active</span>
                <span>•</span>
                <span className="text-rose-400 font-medium">{stats.inactiveBusinesses} suspended</span>
              </div>
            </div>

            {/* 2. Platform Users */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Users</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-white font-mono">{formatNumber(stats.totalUsers)}</span>
                <span className="text-xs text-blue-400 font-semibold">{stats.roleDistribution.owner} Owners</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{stats.roleDistribution.admin} Admins</span>
                <span>•</span>
                <span>{stats.roleDistribution.staff} Staff</span>
                <span>•</span>
                <span className="text-indigo-400">{stats.roleDistribution.superAdmin} Super</span>
              </div>
            </div>

            {/* 3. Platform Customers */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customers Network</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-white font-mono">{formatNumber(stats.totalCustomers)}</span>
                <span className="text-xs text-emerald-400 font-semibold">{stats.activeCustomers} Active</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Across all multi-tenant stores</span>
                <button
                  type="button"
                  onClick={() => exportCustomersToCsv(customers)}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* 4. Customer Receivables / Debt */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Customer Receivables</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-amber-400 font-mono">
                  {formatCurrency(stats.totalCustomerDebt)}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Aggregated open credit ledger balances across tenants
              </div>
            </div>

            {/* 5. Customer Satisfaction */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CSAT Experience Score</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-white font-mono">{stats.averageRating.toFixed(1)}</span>
                <span className="text-xs text-slate-400">/ 5.0 Rating</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{stats.totalFeedbackCount} User reviews</span>
                <button
                  type="button"
                  onClick={() => exportFeedbackToCsv(feedback)}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* 6. Audit & Health Telemetry */}
            <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compliance & Health</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-white font-mono">{formatNumber(stats.recentActivityCount)}</span>
                <span className="text-xs text-purple-400 font-semibold">Events Logged</span>
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Database: <strong className="text-emerald-400 font-mono">{healthData.databaseLatencyMs}ms</strong></span>
                <span className="text-slate-400">Auth: <strong className="text-emerald-400">Operational</strong></span>
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
                  <p className="text-xs text-slate-400 mt-0.5">Monthly store registrations in the platform</p>
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
                          <span className="font-mono text-slate-400 font-bold">{t.count} stores ({pct}%)</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-2 rounded-full transition-all duration-500"
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
                  Export complete data sheets for compliance, offline reconciliation, and stakeholders.
                </p>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => exportUsersToCsv(users)}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>Platform Users List</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">{users.length} rows</span>
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
                    <span className="text-[10px] text-slate-400 font-mono font-bold">{customers.length} rows</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportFeedbackToCsv(feedback)}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquareHeart className="w-3.5 h-3.5 text-amber-400" />
                      <span>User Feedback & CSAT</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">{feedback.length} rows</span>
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
                    <span className="text-[10px] text-slate-400 font-mono font-bold">{businesses.length} rows</span>
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

      {/* TAB: BUSINESSES */}
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
                    <th className="py-3 px-4">Members</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-right">Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paginatedBusinesses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No businesses matched your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedBusinesses.map((b) => (
                      <tr key={b.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{b.name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="capitalize">{b.business_type || 'General'}</span>
                            <span>•</span>
                            <span className="font-mono">{b.currency}</span>
                            {b.address && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[150px]">{b.address}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-200">{b.owner_name || 'N/A'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{b.owner_email || b.email || 'N/A'}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                          {b.member_count} staff
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
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {formatDate(b.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleBiz(b)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                <span>Page {bizPage} of {totalBizPages}</span>
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

      {/* TAB: PLATFORM USERS */}
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
                  <span>Download Users CSV ({filteredUsers.length})</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Associated Stores</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Signed Up</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No platform users matched your criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-white text-sm">{u.name || 'Unnamed'}</div>
                            {u.isPlatformOwner && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold">
                                ROOT OWNER
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                          {u.phone || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          {u.businesses && u.businesses.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.businesses.map((b) => (
                                <span
                                  key={b.id}
                                  className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-medium text-slate-300 border border-white/5"
                                >
                                  {b.name} (<span className="capitalize text-indigo-300">{b.role}</span>)
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">None</span>
                          )}
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
                          {!u.isPlatformOwner && (
                            <button
                              type="button"
                              onClick={() => handleToggleUser(u)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                u.status === 'active'
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
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
                <span>Page {userPage} of {totalUserPages}</span>
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

      {/* TAB: CUSTOMERS (NEW FEATURE) */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 flex-1 max-w-xl">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={custSearch}
                    onChange={(e) => {
                      setCustSearch(e.target.value);
                      setCustPage(1);
                    }}
                    placeholder="Search customers by name, phone, address, store..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  aria-label="Filter customers by business"
                  value={custBizFilter}
                  onChange={(e) => {
                    setCustBizFilter(e.target.value);
                    setCustPage(1);
                  }}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer max-w-[150px]"
                >
                  <option value="all">All Stores</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter customers by status"
                  value={custStatusFilter}
                  onChange={(e) => {
                    setCustStatusFilter(e.target.value as any);
                    setCustPage(1);
                  }}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportCustomersToCsv(filteredCustomers)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Customers CSV ({filteredCustomers.length})</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Store / Business</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Physical Address</th>
                    <th className="py-3 px-4">Outstanding Debt</th>
                    <th className="py-3 px-4">Date Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No customers found matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{c.name}</div>
                          {c.notes && <div className="text-[10px] text-slate-400 italic line-clamp-1">{c.notes}</div>}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-200">
                          {c.business_name}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-slate-300">{c.phone || '—'}</div>
                          {c.email && <div className="text-[11px] text-slate-400">{c.email}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 max-w-[200px]">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{c.address || 'No address registered'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {c.outstanding_balance && c.outstanding_balance > 0 ? (
                            <span className="font-mono font-bold text-amber-400">
                              {formatCurrency(c.outstanding_balance)}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500">₦0.00</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
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
                <span>Page {custPage} of {totalCustPages}</span>
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

      {/* TAB: FEEDBACK EXPERIENCE HUB */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
            {/* Header with CSV Download */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 flex-1">
                <select
                  aria-label="Filter feedback by category"
                  value={feedbackCatFilter}
                  onChange={(e) => {
                    setFeedbackCatFilter(e.target.value);
                    setFeedbackPage(1);
                  }}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="general">General</option>
                  <option value="feature_request">Feature Requests</option>
                  <option value="bug_report">Bug Reports</option>
                  <option value="ux_improvement">UX Improvements</option>
                </select>

                <select
                  aria-label="Filter feedback by star rating"
                  value={feedbackRatingFilter}
                  onChange={(e) => {
                    setFeedbackRatingFilter(e.target.value);
                    setFeedbackPage(1);
                  }}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportFeedbackToCsv(filteredFeedback)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download Feedback CSV ({filteredFeedback.length})</span>
                </button>
              </div>
            </div>

            {/* List */}
            {paginatedFeedback.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No customer feedback found for this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedFeedback.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{f.user_name || 'Anonymous User'}</span>
                        <span className="text-slate-400 text-xs">({f.business_name || 'Platform'})</span>
                        <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] uppercase font-bold text-slate-300">
                          {f.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {f.rating && (
                          <div className="flex items-center gap-1 text-amber-400 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{f.rating} / 5</span>
                          </div>
                        )}
                        <span className="font-mono text-[11px]">{formatDateTime(f.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                      {f.message}
                    </p>
                    {f.user_email && (
                      <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span className="font-mono">{f.user_email}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalFeedbackPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 text-xs text-slate-400">
                <span>Page {feedbackPage} of {totalFeedbackPages}</span>
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

      {/* TAB: AUDIT COMPLIANCE */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paginatedAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No audit events match your search.
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalAuditPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 text-xs text-slate-400">
                <span>Page {auditPage} of {totalAuditPages}</span>
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

      {/* TAB: INFRASTRUCTURE & HEALTH */}
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
                <div className="text-xs text-slate-400 font-mono">Latency: {healthData.databaseLatencyMs}ms</div>
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
      {/* 5. CONFIRMATION MODAL */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {confirmModal && confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                confirmModal.isDestructive ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              }`}>
                {confirmModal.isDestructive ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmModal.description}
            </p>
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
