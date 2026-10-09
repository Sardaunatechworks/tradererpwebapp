'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  TrendingUp,
  Receipt,
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
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  RefreshCw,
  MoreVertical,
  HelpCircle,
  Mail,
  Phone,
  Calendar,
  Lock,
} from 'lucide-react';
import {
  SuperAdminStats,
  AdminBusinessRecord,
  AdminUserRecord,
  AdminFeedbackRecord,
  AdminAuditRecord,
  toggleBusinessStatus,
  updateFeedbackStatus,
} from '@/app/actions/admin';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '@/utils/formatters';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface AdminDashboardViewProps {
  stats: SuperAdminStats;
  businesses: AdminBusinessRecord[];
  users: AdminUserRecord[];
  feedback: AdminFeedbackRecord[];
  auditLogs: AdminAuditRecord[];
  adminEmail: string;
}

type TabType = 'overview' | 'businesses' | 'users' | 'feedback' | 'audit';

export default function AdminDashboardView({
  stats,
  businesses,
  users,
  feedback,
  auditLogs,
  adminEmail,
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isPending, startTransition] = useTransition();

  // Search and filter states
  const [bizSearch, setBizSearch] = useState('');
  const [bizStatusFilter, setBizStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<string>('all');
  const [feedbackCatFilter, setFeedbackCatFilter] = useState<string>('all');

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Business Action handler
  const handleToggleBiz = (bizId: string, currentStatus: 'active' | 'inactive', name: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const confirmMsg =
      nextStatus === 'inactive'
        ? `Are you sure you want to suspend "${name}"? Members will be restricted from accessing the workspace.`
        : `Reactivate workspace "${name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const res = await toggleBusinessStatus(bizId, nextStatus);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(`Workspace "${name}" has been ${nextStatus === 'active' ? 'activated' : 'suspended'}.`);
        setTimeout(() => setActionSuccess(null), 4000);
      }
    });
  };

  // Feedback status update handler
  const handleUpdateFeedbackStatus = (
    feedbackId: string,
    status: 'new' | 'reviewed' | 'archived'
  ) => {
    setActionError(null);
    startTransition(async () => {
      const res = await updateFeedbackStatus(feedbackId, status);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess('Feedback status updated successfully.');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    });
  };

  // Filtered lists
  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(bizSearch.toLowerCase()) ||
      (b.email && b.email.toLowerCase().includes(bizSearch.toLowerCase())) ||
      (b.business_type && b.business_type.toLowerCase().includes(bizSearch.toLowerCase()));
    const matchesStatus = bizStatusFilter === 'all' || b.status === bizStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.business_name && u.business_name.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesRole =
      userRoleFilter === 'all' ||
      (u.role && u.role.toLowerCase() === userRoleFilter.toLowerCase());
    return matchesSearch && matchesRole;
  });

  const filteredFeedback = feedback.filter((f) => {
    const matchesStatus =
      feedbackStatusFilter === 'all' || f.status === feedbackStatusFilter;
    const matchesCat =
      feedbackCatFilter === 'all' || f.category === feedbackCatFilter;
    return matchesStatus && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Notice Alerts */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center overflow-x-auto scrollbar-none gap-1 sm:gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Platform Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('businesses')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'businesses'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Tenants ({stats.totalBusinesses})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users ({stats.totalUsers})</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'feedback'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageSquareHeart className="w-4 h-4" />
          <span>Feedback Inbox</span>
          {stats.newFeedbackCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {stats.newFeedbackCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Audit Stream</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. OVERVIEW TAB */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Key KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Total Tenants */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Tenants / Businesses</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {formatNumber(stats.totalBusinesses)}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                  <span className="font-semibold text-emerald-600">{stats.activeBusinesses} active</span>
                  <span>•</span>
                  <span className="text-slate-400">{stats.inactiveBusinesses} inactive</span>
                </div>
              </div>
            </div>

            {/* Platform GMV */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Platform GMV Volume</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {formatCurrency(stats.platformGmv)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Across <span className="font-semibold text-slate-800">{formatNumber(stats.totalSalesCount)}</span> completed sales
                </div>
              </div>
            </div>

            {/* Platform Users */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Platform Users</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {formatNumber(stats.totalUsers)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {formatNumber(stats.totalProductsCount)} products tracked
                </div>
              </div>
            </div>

            {/* Customer Satisfaction */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">User Satisfaction</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {stats.averageRating}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">/ 5.0</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {stats.totalFeedbackCount} responses ({stats.newFeedbackCount} new)
                </div>
              </div>
            </div>
          </div>

          {/* Platform Performance & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Businesses by Volume */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Highest Volume Workspaces</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Top businesses processing sales through TraderERP</p>
                </div>
                <button
                  onClick={() => setActiveTab('businesses')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {businesses.slice(0, 5).map((biz) => (
                  <div key={biz.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center shrink-0">
                        {biz.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">{biz.name}</p>
                          <Badge variant={biz.status === 'active' ? 'success' : 'danger'}>
                            {biz.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {biz.business_type || 'Retail'} • {biz.sales_count} sales recorded
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-xs sm:text-sm text-slate-900">
                        {formatCurrency(biz.total_revenue, biz.currency)}
                      </p>
                      <p className="text-[10px] text-slate-400">Total GMV</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Feedback Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Latest Feedback</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Voice of the customer</p>
                </div>
                <button
                  onClick={() => setActiveTab('feedback')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Inbox</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {feedback.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No feedback entries received yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {feedback.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < (item.rating || 5)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">{formatDate(item.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-700 line-clamp-2 italic">"{item.message}"</p>
                      <p className="text-[11px] font-medium text-slate-500">
                        — {item.user_name || 'Merchant'} ({item.business_name || 'Business'})
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. TENANTS (BUSINESSES) TAB */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'businesses' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4 sm:p-6 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Tenant Directory</h2>
              <p className="text-xs text-slate-500">Manage all registered businesses on TraderERP</p>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search workspace..."
                  value={bizSearch}
                  onChange={(e) => setBizSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <select
                value={bizStatusFilter}
                onChange={(e) => setBizStatusFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="py-3 px-3">Business Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Owner Contact</th>
                  <th className="py-3 px-3 text-right">Sales Count</th>
                  <th className="py-3 px-3 text-right">Volume (GMV)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredBusinesses.map((biz) => (
                  <tr key={biz.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{biz.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {biz.id.slice(0, 8)}...</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {biz.business_type || 'Standard Retail'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-800 font-medium">{biz.owner_name || '—'}</div>
                      <div className="text-[11px] text-slate-400">{biz.email || biz.owner_email || '—'}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700">
                      {biz.sales_count}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(biz.total_revenue, biz.currency)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={biz.status === 'active' ? 'success' : 'danger'}>
                        {biz.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        disabled={isPending}
                        onClick={() => handleToggleBiz(biz.id, biz.status, biz.name)}
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                          biz.status === 'active'
                            ? 'text-red-600 hover:bg-red-50 border border-red-200'
                            : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                        }`}
                      >
                        {biz.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {filteredBusinesses.map((biz) => (
              <div key={biz.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-900">{biz.name}</div>
                  <Badge variant={biz.status === 'active' ? 'success' : 'danger'}>
                    {biz.status}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500">
                  {biz.business_type || 'Retail'} • Owner: {biz.owner_name || biz.email || '—'}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="text-slate-400">GMV: </span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(biz.total_revenue, biz.currency)}
                    </span>
                    <span className="text-slate-400 text-[10px]"> ({biz.sales_count} sales)</span>
                  </div>
                  <button
                    disabled={isPending}
                    onClick={() => handleToggleBiz(biz.id, biz.status, biz.name)}
                    className={`text-xs px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      biz.status === 'active'
                        ? 'text-red-600 border border-red-200'
                        : 'text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {biz.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredBusinesses.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs">
              No matching tenant businesses found.
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. USERS DIRECTORY TAB */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4 sm:p-6 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Platform Users</h2>
              <p className="text-xs text-slate-500">All registered users and business member assignments</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="py-3 px-3">Name & Email</th>
                  <th className="py-3 px-3">Workspace Assigned</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Joined Date</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {u.business_name || <span className="text-slate-400 italic">None / Standalone</span>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize font-semibold text-slate-700">{u.role || 'User'}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {u.phone || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={u.status === 'active' ? 'success' : 'neutral'}>
                        {u.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {filteredUsers.map((u) => (
              <div key={u.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900">{u.name}</div>
                  <Badge variant={u.status === 'active' ? 'success' : 'neutral'}>
                    {u.status}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-500">{u.email}</div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-600">
                  <span>Workspace: <strong className="text-slate-800">{u.business_name || 'None'}</strong></span>
                  <span className="capitalize font-semibold text-slate-700">{u.role || 'User'}</span>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs">
              No matching platform users found.
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. CUSTOMER FEEDBACK & EXPERIENCE HUB */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4 sm:p-6 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Customer Feedback Inbox</h2>
              <p className="text-xs text-slate-500">Direct sentiment, feature requests, and bug reports submitted by merchants</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={feedbackStatusFilter}
                onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="new">New / Unread</option>
                <option value="reviewed">Reviewed</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={feedbackCatFilter}
                onChange={(e) => setFeedbackCatFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="experience">Experience</option>
                <option value="feature_request">Feature Request</option>
                <option value="bug_report">Bug Report</option>
                <option value="praise">Praise</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredFeedback.map((fb) => (
              <div
                key={fb.id}
                className={`p-4 rounded-xl border transition-all ${
                  fb.status === 'new'
                    ? 'bg-blue-50/40 border-blue-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < (fb.rating || 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <Badge
                      variant={
                        fb.category === 'bug_report'
                          ? 'danger'
                          : fb.category === 'feature_request'
                          ? 'warning'
                          : fb.category === 'praise'
                          ? 'success'
                          : 'neutral'
                      }
                    >
                      {fb.category.replace('_', ' ')}
                    </Badge>
                    <Badge variant={fb.status === 'new' ? 'info' : 'neutral'}>
                      {fb.status}
                    </Badge>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {formatDateTime(fb.created_at)}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                    {fb.message}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-slate-500">
                    From: <strong className="text-slate-800">{fb.user_name || fb.user_email || 'Merchant'}</strong>
                    {fb.business_name && (
                      <span> • Workspace: <strong className="text-slate-800">{fb.business_name}</strong></span>
                    )}
                    {fb.user_email && (
                      <span className="text-slate-400 text-[11px]"> ({fb.user_email})</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {fb.status === 'new' && (
                      <button
                        disabled={isPending}
                        onClick={() => handleUpdateFeedbackStatus(fb.id, 'reviewed')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                      >
                        Mark Reviewed
                      </button>
                    )}
                    {fb.status !== 'archived' && (
                      <button
                        disabled={isPending}
                        onClick={() => handleUpdateFeedbackStatus(fb.id, 'archived')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredFeedback.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                No customer feedback records matching criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. AUDIT STREAM TAB */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4 sm:p-6 space-y-4 animate-in fade-in duration-150">
          <div>
            <h2 className="text-base font-bold text-slate-900">Platform Security & Audit Stream</h2>
            <p className="text-xs text-slate-500">Real-time ledger of actions executed across all tenant workspaces</p>
          </div>

          <div className="divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 sm:mt-0 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900">{log.action}</span>
                      <span className="text-slate-400">on</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase">
                        {log.entity_type}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      By: {log.user?.name || log.user?.email || 'System'}
                      {log.business?.name && (
                        <span> • Workspace: <strong>{log.business.name}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 sm:text-right font-mono">
                  {formatDateTime(log.created_at)}
                </div>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs">
                No recent audit log entries.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
