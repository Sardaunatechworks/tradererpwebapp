'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
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
  Sliders,
  Eye,
  HelpCircle,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import {
  SuperAdminStats,
  AdminBusinessRecord,
  AdminUserRecord,
  AdminFeedbackRecord,
  AdminAuditRecord,
  SystemHealthData,
  toggleBusinessStatus,
  toggleUserStatus,
  getSystemHealth,
} from '@/app/actions/admin';
import { formatDate, formatDateTime, formatNumber } from '@/utils/formatters';

interface AdminDashboardViewProps {
  stats: SuperAdminStats;
  businesses: AdminBusinessRecord[];
  users: AdminUserRecord[];
  feedback: AdminFeedbackRecord[];
  auditLogs: AdminAuditRecord[];
  initialHealth: SystemHealthData;
  adminEmail: string;
}

type TabType =
  | 'overview'
  | 'businesses'
  | 'users'
  | 'feedback'
  | 'audit'
  | 'health'
  | 'settings';

export default function AdminDashboardView({
  stats,
  businesses,
  users,
  feedback,
  auditLogs,
  initialHealth,
  adminEmail,
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isPending, startTransition] = useTransition();

  // Notification banners
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // System Health state
  const [healthData, setHealthData] = useState<SystemHealthData>(initialHealth);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Business Directory states
  const [bizSearch, setBizSearch] = useState('');
  const [bizStatusFilter, setBizStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [bizPage, setBizPage] = useState(1);
  const [selectedBiz, setSelectedBiz] = useState<AdminBusinessRecord | null>(null);

  // User Directory states
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [userPage, setUserPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);

  // Feedback states
  const [feedbackCatFilter, setFeedbackCatFilter] = useState<string>('all');
  const [feedbackPage, setFeedbackPage] = useState(1);

  // Audit Log states
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);

  // Confirmation Modal state for sensitive actions
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
  // FILTERED DATA
  // ─────────────────────────────────────────────────────────────────────────────

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

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q));
      const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, userSearch, userStatusFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, userPage]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));

  const filteredFeedback = useMemo(() => {
    return feedback.filter((f) => {
      return feedbackCatFilter === 'all' || f.category === feedbackCatFilter;
    });
  }, [feedback, feedbackCatFilter]);

  const paginatedFeedback = useMemo(() => {
    const start = (feedbackPage - 1) * ITEMS_PER_PAGE;
    return filteredFeedback.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredFeedback, feedbackPage]);

  const totalFeedbackPages = Math.max(1, Math.ceil(filteredFeedback.length / ITEMS_PER_PAGE));

  const filteredAudit = useMemo(() => {
    return auditLogs.filter((l) => {
      const q = auditSearch.toLowerCase().trim();
      return (
        !q ||
        l.action.toLowerCase().includes(q) ||
        l.entity_type.toLowerCase().includes(q) ||
        (l.user?.email && l.user.email.toLowerCase().includes(q)) ||
        (l.business?.name && l.business.name.toLowerCase().includes(q))
      );
    });
  }, [auditLogs, auditSearch]);

  const paginatedAudit = useMemo(() => {
    const start = (auditPage - 1) * ITEMS_PER_PAGE;
    return filteredAudit.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAudit, auditPage]);

  const totalAuditPages = Math.max(1, Math.ceil(filteredAudit.length / ITEMS_PER_PAGE));

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleRunHealthCheck = async () => {
    setIsCheckingHealth(true);
    setActionError(null);
    try {
      const res = await getSystemHealth();
      if (res.data) {
        setHealthData(res.data);
        setActionSuccess('Health diagnostics completed successfully.');
        setTimeout(() => setActionSuccess(null), 3000);
      } else if (res.error) {
        setActionError(res.error);
      }
    } catch (err: any) {
      setActionError(err.message || 'Health check failed.');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const promptToggleBusiness = (biz: AdminBusinessRecord) => {
    const nextStatus = biz.status === 'active' ? 'inactive' : 'active';
    setConfirmModal({
      open: true,
      title: nextStatus === 'inactive' ? 'Suspend Tenant Workspace' : 'Reactivate Tenant Workspace',
      description:
        nextStatus === 'inactive'
          ? `Are you sure you want to suspend "${biz.name}"? Workspace members will be prevented from accessing the app. No business data will be deleted.`
          : `Reactivate workspace "${biz.name}"? Members will regain normal access.`,
      actionLabel: nextStatus === 'inactive' ? 'Suspend Workspace' : 'Reactivate Workspace',
      isDestructive: nextStatus === 'inactive',
      onConfirm: () => {
        setConfirmModal(null);
        setActionError(null);
        setActionSuccess(null);
        startTransition(async () => {
          const res = await toggleBusinessStatus(biz.id, nextStatus);
          if (res.error) {
            setActionError(res.error);
          } else {
            setActionSuccess(`Workspace "${biz.name}" has been ${nextStatus === 'active' ? 'activated' : 'suspended'}.`);
            setTimeout(() => setActionSuccess(null), 4000);
          }
        });
      },
    });
  };

  const promptToggleUser = (user: AdminUserRecord) => {
    if (user.isPlatformOwner) {
      setActionError('Protected Account: The platform owner account cannot be suspended or modified.');
      setTimeout(() => setActionError(null), 4000);
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    setConfirmModal({
      open: true,
      title: nextStatus === 'inactive' ? 'Suspend Platform User' : 'Reactivate Platform User',
      description:
        nextStatus === 'inactive'
          ? `Suspend account for ${user.name} (${user.email})? This user will be blocked from logging into the platform until reactivated.`
          : `Reactivate account for ${user.name} (${user.email})? The user will regain platform access.`,
      actionLabel: nextStatus === 'inactive' ? 'Suspend Account' : 'Reactivate Account',
      isDestructive: nextStatus === 'inactive',
      onConfirm: () => {
        setConfirmModal(null);
        setActionError(null);
        setActionSuccess(null);
        startTransition(async () => {
          const res = await toggleUserStatus(user.id, nextStatus);
          if (res.error) {
            setActionError(res.error);
          } else {
            setActionSuccess(`User ${user.email} has been ${nextStatus === 'active' ? 'activated' : 'suspended'}.`);
            setTimeout(() => setActionSuccess(null), 4000);
          }
        });
      },
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  const breadcrumbLabels: Record<TabType, string> = {
    overview: 'Platform Overview',
    businesses: 'Business Management',
    users: 'Platform Users',
    feedback: 'Customer Experience & Feedback',
    audit: 'Audit Log Trail',
    health: 'System Health & Integrations',
    settings: 'Platform Settings & Governance',
  };

  return (
    <div className="space-y-6">
      {/* Contextual Breadcrumbs & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>TraderERP Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-indigo-600">{breadcrumbLabels[activeTab]}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{breadcrumbLabels[activeTab]}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Owner: <strong className="text-slate-700">Sardauna Tech Lab Ltd</strong> • Logged in as <span className="text-indigo-600 font-medium">{adminEmail}</span>
          </p>
        </div>

        {/* Global Action Status */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunHealthCheck}
            disabled={isCheckingHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
            title="Perform live database & auth connectivity check"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isCheckingHealth ? 'animate-spin' : ''}`} />
            <span>{isCheckingHealth ? 'Checking...' : 'Health Ping'}</span>
          </button>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Platform Online</span>
          </span>
        </div>
      </div>

      {/* Notification Banners */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm px-4 py-3 rounded-xl flex items-center gap-2.5 animate-in fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm px-4 py-3 rounded-xl flex items-center gap-2.5 animate-in fade-in shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-medium">{actionError}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-2xs overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('businesses')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'businesses'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Businesses</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/80 text-slate-700">
              {stats.totalBusinesses}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Platform Users</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/80 text-slate-700">
              {stats.totalUsers}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'feedback'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" />
            <span>Customer Feedback</span>
            {stats.totalFeedbackCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                {stats.totalFeedbackCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'health'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>System Health</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Settings & Roles</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 1. MODULE: OVERVIEW                                                    */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Metric Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Businesses */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Registered Businesses
                </span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black text-slate-900">
                  {formatNumber(stats.totalBusinesses)}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-slate-500">
                  <span className="text-emerald-600">{stats.activeBusinesses} Active</span>
                  <span>•</span>
                  <span className="text-slate-400">{stats.inactiveBusinesses} Suspended</span>
                </div>
              </div>
            </div>

            {/* Total Platform Users */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Total Platform Users
                </span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black text-slate-900">
                  {formatNumber(stats.totalUsers)}
                </p>
                <p className="text-[11px] font-semibold text-slate-500 mt-1">
                  Across all registered merchant workspaces
                </p>
              </div>
            </div>

            {/* Customer Satisfaction */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Customer Satisfaction
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black text-slate-900">
                  {stats.averageRating} <span className="text-sm font-bold text-slate-400">/ 5.0</span>
                </p>
                <p className="text-[11px] font-semibold text-slate-500 mt-1">
                  Based on {stats.totalFeedbackCount} merchant reviews
                </p>
              </div>
            </div>

            {/* System Status & Database Latency */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Database Latency
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Server className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black text-slate-900">
                  {healthData.databaseLatencyMs} <span className="text-sm font-bold text-slate-400">ms</span>
                </p>
                <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>PostgreSQL Connected</span>
                </p>
              </div>
            </div>
          </div>

          {/* Section: Registration Trends & User Role Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Business Registration Trends (2 columns) */}
            <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Business Onboarding Trends
                  </h2>
                  <p className="text-xs text-slate-500">
                    Real merchant registrations over time based on database records
                  </p>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>

              {stats.registrationTrends.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No registration trend history recorded yet.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {stats.registrationTrends.map((trend) => {
                    const maxVal = Math.max(...stats.registrationTrends.map((t) => t.count), 1);
                    const pct = Math.round((trend.count / maxVal) * 100);
                    return (
                      <div key={trend.period} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700">{trend.period}</span>
                          <span className="text-slate-900 font-bold">{trend.count} business{trend.count > 1 ? 'es' : ''}</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Platform Role Distribution (1 column) */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      Role Distribution
                    </h2>
                    <p className="text-xs text-slate-500">Platform-wide membership breakdown</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      <span className="text-xs font-semibold text-slate-700">Platform Super Admin</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {stats.roleDistribution.superAdmin}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span className="text-xs font-semibold text-slate-700">Business Owners</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {stats.roleDistribution.owner}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-semibold text-slate-700">Managers / Admins</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {stats.roleDistribution.admin}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-slate-700">Staff / Cashiers</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {stats.roleDistribution.staff}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 mt-4 text-[11px] text-indigo-900">
                <strong>Tenant Isolation:</strong> Permissions are strictly enforced via server-side authorization and PostgreSQL RLS.
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Activity Stream */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Recent Platform Administrative Activity
                </h2>
                <p className="text-xs text-slate-500">Live stream of recorded actions</p>
              </div>
              <button
                onClick={() => setActiveTab('audit')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                View Full Audit Trail →
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No audit logs recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Actor: {log.user?.email || 'System'} • Entity: {log.entity_type} {log.business?.name ? `(${log.business.name})` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 2. MODULE: BUSINESSES (TENANTS)                                       */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'businesses' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Business Tenants Directory
              </h2>
              <p className="text-xs text-slate-500">
                Manage registered tenant workspaces, inspect membership counts, and configure access status
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search businesses..."
                  value={bizSearch}
                  onChange={(e) => {
                    setBizSearch(e.target.value);
                    setBizPage(1);
                  }}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
                />
              </div>

              <select
                value={bizStatusFilter}
                onChange={(e) => {
                  setBizStatusFilter(e.target.value as any);
                  setBizPage(1);
                }}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Suspended Only</option>
              </select>
            </div>
          </div>

          {/* Directory Table */}
          {paginatedBusinesses.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No registered businesses match your search filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Business Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Owner / Contact</th>
                    <th className="py-3 px-4">Members</th>
                    <th className="py-3 px-4">Registration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedBusinesses.map((biz) => (
                    <tr key={biz.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{biz.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {biz.business_type || 'General Merchant'}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{biz.owner_name || 'N/A'}</p>
                        <p className="text-[11px] text-slate-400">{biz.email || biz.owner_email || 'No email'}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {biz.member_count} member{biz.member_count > 1 ? 's' : ''}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {formatDate(biz.created_at)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            biz.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {biz.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedBiz(biz)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Inspect business details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => promptToggleBusiness(biz)}
                            disabled={isPending}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              biz.status === 'active'
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {biz.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Showing {paginatedBusinesses.length} of {filteredBusinesses.length} businesses
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBizPage((p) => Math.max(1, p - 1))}
                disabled={bizPage === 1}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700">
                {bizPage} / {totalBizPages}
              </span>
              <button
                onClick={() => setBizPage((p) => Math.min(totalBizPages, p + 1))}
                disabled={bizPage >= totalBizPages}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 3. MODULE: PLATFORM USERS                                             */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Platform User Directory
              </h2>
              <p className="text-xs text-slate-500">
                Unified Supabase authentication identities, assigned roles, and workspace memberships
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-64"
                />
              </div>

              <select
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value as any);
                  setUserPage(1);
                }}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Suspended</option>
              </select>
            </div>
          </div>

          {paginatedUsers.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No platform users match your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Workspaces & Role</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{u.name}</span>
                          {u.isPlatformOwner && (
                            <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[9px] font-black tracking-wider uppercase">
                              Owner
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {u.phone || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.businesses.length === 0 ? (
                          <span className="text-slate-400 italic">No workspace assigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.businesses.map((b) => (
                              <span
                                key={b.id}
                                className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                              >
                                {b.name} ({b.role.toUpperCase()})
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {u.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Inspect user details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!u.isPlatformOwner && (
                            <button
                              onClick={() => promptToggleUser(u)}
                              disabled={isPending}
                              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                u.status === 'active'
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Showing {paginatedUsers.length} of {filteredUsers.length} platform users
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                disabled={userPage === 1}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700">
                {userPage} / {totalUserPages}
              </span>
              <button
                onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                disabled={userPage >= totalUserPages}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 4. MODULE: CUSTOMER EXPERIENCE & FEEDBACK HUB                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Customer Feedback & Experience Hub
              </h2>
              <p className="text-xs text-slate-500">
                Real feedback and satisfaction ratings submitted directly by merchants
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={feedbackCatFilter}
                onChange={(e) => {
                  setFeedbackCatFilter(e.target.value);
                  setFeedbackPage(1);
                }}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="experience">Experience</option>
                <option value="feature">Feature Request</option>
                <option value="bug">Bug Report</option>
                <option value="support">Support</option>
              </select>
            </div>
          </div>

          {paginatedFeedback.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No customer feedback submitted in this category yet.
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedFeedback.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: item.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-700 uppercase">
                        {item.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                    "{item.message}"
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>
                      Sender: <strong className="text-slate-700">{item.user_name || 'Anonymous Merchant'}</strong>
                    </span>
                    {item.user_email && <span>Email: {item.user_email}</span>}
                    {item.business_name && (
                      <span>Workspace: <strong className="text-slate-700">{item.business_name}</strong></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Showing {paginatedFeedback.length} of {filteredFeedback.length} reviews
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFeedbackPage((p) => Math.max(1, p - 1))}
                disabled={feedbackPage === 1}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700">
                {feedbackPage} / {totalFeedbackPages}
              </span>
              <button
                onClick={() => setFeedbackPage((p) => Math.min(totalFeedbackPages, p + 1))}
                disabled={feedbackPage >= totalFeedbackPages}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 5. MODULE: AUDIT LOG TRAIL                                            */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Platform Administrative Audit Trail
              </h2>
              <p className="text-xs text-slate-500">
                Tamper-resistant server-side log of platform events, workspace status alterations, and security actions
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit actions..."
                value={auditSearch}
                onChange={(e) => {
                  setAuditSearch(e.target.value);
                  setAuditPage(1);
                }}
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-60"
              />
            </div>
          </div>

          {paginatedAudit.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No audit records found matching your query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity Type</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Associated Workspace</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedAudit.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {log.entity_type}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {log.user?.email || 'System'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {log.business?.name || 'Platform-level'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-medium">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500 max-w-xs truncate" title={JSON.stringify(log.metadata)}>
                        {JSON.stringify(log.metadata || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Showing {paginatedAudit.length} of {filteredAudit.length} audit logs
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                disabled={auditPage === 1}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700">
                {auditPage} / {totalAuditPages}
              </span>
              <button
                onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                disabled={auditPage >= totalAuditPages}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 6. MODULE: SYSTEM HEALTH & INTEGRATIONS                                */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'health' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Live System Health & Integrations
              </h2>
              <p className="text-xs text-slate-500">
                Directly measured platform endpoints, database latency, and authentication connectivity
              </p>
            </div>

            <button
              onClick={handleRunHealthCheck}
              disabled={isCheckingHealth}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              <span>{isCheckingHealth ? 'Measuring Diagnostics...' : 'Run Diagnostics'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supabase Database */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">PostgreSQL Database</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {healthData.databaseStatus.toUpperCase()}
                </span>
              </div>
              <p className="text-xl font-black text-slate-900">
                {healthData.databaseLatencyMs} ms
              </p>
              <p className="text-[11px] text-slate-500">
                Round-trip query latency to Supabase PostgreSQL cluster
              </p>
            </div>

            {/* Supabase Auth */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Authentication Service</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {healthData.authStatus.toUpperCase()}
                </span>
              </div>
              <p className="text-xl font-black text-slate-900">Active</p>
              <p className="text-[11px] text-slate-500">
                Supabase Auth JWT issuer & session validation
              </p>
            </div>

            {/* Engine & Environment */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">App Runtime</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  NEXT.JS TURBOPACK
                </span>
              </div>
              <p className="text-xl font-black text-slate-900">v{healthData.platformVersion}</p>
              <p className="text-[11px] text-slate-500">
                Environment: {healthData.environment.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 space-y-2">
            <h3 className="font-bold text-slate-900">Diagnostics Summary</h3>
            <p className="text-[11px] text-slate-500">
              Last measured: {formatDateTime(healthData.lastChecked)}. All multi-tenant tenant-isolation constraints and Row Level Security policies are actively enforced. Service role keys remain strictly server-side and are never exposed in browser bundles.
            </p>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 7. MODULE: PLATFORM SETTINGS & ROLES MATRIX                           */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Platform Governance & Role Architecture
            </h2>
            <p className="text-xs text-slate-500">
              Sardauna Tech Lab Ltd governance parameters, security configurations, and permissions matrix
            </p>
          </div>

          {/* Platform Identity Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Platform Owner</h3>
              <p className="text-sm font-bold text-slate-800">Sardauna Tech Lab Ltd</p>
              <p className="text-xs text-slate-500">Official legal entity and creator of TraderERP</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Primary Region & Currency</h3>
              <p className="text-sm font-bold text-slate-800">Nigeria (NGN - ₦)</p>
              <p className="text-xs text-slate-500">Default multi-tenant currency standard</p>
            </div>
          </div>

          {/* Role Architecture Matrix */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900">System Role & Permissions Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">Role</th>
                    <th className="p-3">Scope</th>
                    <th className="p-3">Capabilities</th>
                    <th className="p-3">Restrictions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-indigo-50/30">
                    <td className="p-3 font-bold text-indigo-700">Platform Super Admin</td>
                    <td className="p-3 font-semibold text-slate-700">Platform-Wide (God Mode)</td>
                    <td className="p-3 text-slate-600">Activate/suspend workspaces, manage platform users, inspect feedback, view audit trails</td>
                    <td className="p-3 text-slate-500 italic">Does not peer into private merchant cart operations</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900">Business Owner</td>
                    <td className="p-3 font-semibold text-slate-700">Single Tenant Workspace</td>
                    <td className="p-3 text-slate-600">Full control over business inventory, sales, expenses, staff members, reports</td>
                    <td className="p-3 text-slate-500">Cannot access other merchants' data or platform admin</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900">Business Manager / Admin</td>
                    <td className="p-3 font-semibold text-slate-700">Single Tenant Workspace</td>
                    <td className="p-3 text-slate-600">Inventory stocking, recording sales, reviewing reports</td>
                    <td className="p-3 text-slate-500">Cannot delete the business or alter primary ownership</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900">Cashier / Staff</td>
                    <td className="p-3 font-semibold text-slate-700">Single Tenant Workspace</td>
                    <td className="p-3 text-slate-600">Fast POS sales, receipts, inventory lookup</td>
                    <td className="p-3 text-slate-500">No access to profit margins, expenses, or staff administration</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* BUSINESS DETAILS MODAL                                                 */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {selectedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">{selectedBiz.name}</h3>
              </div>
              <button
                onClick={() => setSelectedBiz(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Category</span>
                  <p className="font-bold text-slate-800">{selectedBiz.business_type || 'Retail Merchant'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Currency</span>
                  <p className="font-bold text-slate-800">{selectedBiz.currency}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Owner Name</span>
                  <p className="font-bold text-slate-800">{selectedBiz.owner_name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Owner Email</span>
                  <p className="font-bold text-slate-800 truncate">{selectedBiz.owner_email || selectedBiz.email || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Phone</span>
                  <p className="font-bold text-slate-800">{selectedBiz.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Registered On</span>
                  <p className="font-bold text-slate-800">{formatDate(selectedBiz.created_at)}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Address / Location</span>
                <p className="font-medium text-slate-700 mt-0.5">{selectedBiz.address || 'Not specified'}</p>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Workspace Members</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedBiz.member_count} registered users</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  selectedBiz.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                Status: {selectedBiz.status.toUpperCase()}
              </span>
              <button
                onClick={() => {
                  const b = selectedBiz;
                  setSelectedBiz(null);
                  promptToggleBusiness(b);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  selectedBiz.status === 'active'
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {selectedBiz.status === 'active' ? 'Suspend Workspace' : 'Reactivate Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* USER DETAILS MODAL                                                     */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">{selectedUser.name}</h3>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Email Address</span>
                  <p className="font-bold text-slate-800">{selectedUser.email}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Phone Number</span>
                  <p className="font-bold text-slate-800">{selectedUser.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Account Created</span>
                  <p className="font-bold text-slate-800">{formatDateTime(selectedUser.created_at)}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Associated Tenant Workspaces</span>
                {selectedUser.businesses.length === 0 ? (
                  <p className="text-slate-400 italic mt-1">No business memberships found.</p>
                ) : (
                  <div className="mt-1 space-y-1">
                    {selectedUser.businesses.map((b) => (
                      <div key={b.id} className="p-2 bg-slate-100 rounded-lg flex justify-between items-center">
                        <span className="font-semibold text-slate-800">{b.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white text-slate-700 text-[10px] font-bold">
                          {b.role.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  selectedUser.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                Status: {selectedUser.status.toUpperCase()}
              </span>
              {!selectedUser.isPlatformOwner && (
                <button
                  onClick={() => {
                    const u = selectedUser;
                    setSelectedUser(null);
                    promptToggleUser(u);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    selectedUser.status === 'active'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {selectedUser.status === 'active' ? 'Suspend User' : 'Reactivate User'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* CONFIRMATION MODAL                                                     */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  confirmModal.isDestructive ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">{confirmModal.title}</h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer ${
                  confirmModal.isDestructive
                    ? 'bg-red-600 hover:bg-red-700 shadow-xs'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
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
