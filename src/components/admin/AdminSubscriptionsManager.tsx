'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Sliders,
  History,
  Webhook,
} from 'lucide-react';
import {
  adminOverrideBusinessSubscription,
  adminUpdatePlanConfig,
  getAdminSubscriptionDashboard,
  type AdminBusinessSubscriptionRow,
  type AdminSubscriptionDashboardPayload,
} from '@/app/actions/admin-subscriptions';
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/subscription/types';
import { formatCurrency, formatDateTime } from '@/utils/formatters';

export default function AdminSubscriptionsManager() {
  const [data, setData] = useState<AdminSubscriptionDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Manual override modal state
  const [selectedSub, setSelectedSub] = useState<AdminBusinessSubscriptionRow | null>(null);
  const [overridePlan, setOverridePlan] = useState<'free' | 'pro'>('free');
  const [overrideStatus, setOverrideStatus] = useState<SubscriptionStatus>('free');
  const [overrideReason, setOverrideReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Plan config editor state
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [productsLimit, setProductsLimit] = useState<string>('');
  const [salesLimit, setSalesLimit] = useState<string>('');
  const [customersLimit, setCustomersLimit] = useState<string>('');
  const [advReports, setAdvReports] = useState(false);
  const [dataExport, setDataExport] = useState(false);
  const [paystackCode, setPaystackCode] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getAdminSubscriptionDashboard();
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setData(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    getAdminSubscriptionDashboard().then((res) => {
      if (!active) return;
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setData(res.data);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredSubs = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.subscriptions.filter((s) => {
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchesSearch =
        !q ||
        s.business_name.toLowerCase().includes(q) ||
        s.business_id.toLowerCase().includes(q) ||
        (s.business_email || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [data, search, statusFilter]);

  const openOverride = (row: AdminBusinessSubscriptionRow) => {
    setSelectedSub(row);
    setOverridePlan(row.plan_slug === 'pro' ? 'pro' : 'free');
    setOverrideStatus(row.status);
    setOverrideReason('');
  };

  const handleSaveOverride = async () => {
    if (!selectedSub) return;
    setSaving(true);
    const res = await adminOverrideBusinessSubscription({
      businessId: selectedSub.business_id,
      targetPlanSlug: overridePlan,
      targetStatus: overrideStatus,
      reason: overrideReason,
    });
    setSaving(false);
    if (res.error) {
      setFeedback(res.error);
    } else {
      setFeedback(`Updated subscription for ${selectedSub.business_name}.`);
      setSelectedSub(null);
      await load();
    }
  };

  const openPlanEditor = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setProductsLimit(
      plan.feature_limits?.products === null || plan.feature_limits?.products === undefined
        ? ''
        : String(plan.feature_limits.products)
    );
    setSalesLimit(
      plan.feature_limits?.monthly_sales === null || plan.feature_limits?.monthly_sales === undefined
        ? ''
        : String(plan.feature_limits.monthly_sales)
    );
    setCustomersLimit(
      plan.feature_limits?.customers === null || plan.feature_limits?.customers === undefined
        ? ''
        : String(plan.feature_limits.customers)
    );
    setAdvReports(Boolean(plan.feature_entitlements?.advanced_reports));
    setDataExport(Boolean(plan.feature_entitlements?.data_export));
    setPaystackCode(plan.paystack_plan_code || '');
  };

  const handleSavePlanConfig = async () => {
    if (!editingPlan) return;
    setSaving(true);
    const toNullableNum = (v: string) => (v.trim() === '' ? null : Math.max(0, Number(v)));
    const res = await adminUpdatePlanConfig({
      planId: editingPlan.id,
      productsLimit: toNullableNum(productsLimit),
      monthlySalesLimit: toNullableNum(salesLimit),
      customersLimit: toNullableNum(customersLimit),
      advancedReports: advReports,
      dataExport: dataExport,
      paystackPlanCode: paystackCode || null,
    });
    setSaving(false);
    if (res.error) {
      setFeedback(res.error);
    } else {
      setFeedback(`Saved configuration for ${editingPlan.name} plan.`);
      setEditingPlan(null);
      await load();
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Loading subscription analytics...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800">
        {error || 'Failed to load subscription management data.'}
      </div>
    );
  }

  const { stats, plans, webhookFailures, recentAuditLogs } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Subscription & Billing Governance
          </h2>
          <p className="text-xs text-slate-500">
            Monitor MRR, trial conversions, plan limits, webhook health, and manual overrides.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="font-bold cursor-pointer">
            ×
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Verified MRR</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(stats.verifiedMrr)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Gross Collections</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(stats.grossCollections)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Active Pro</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{stats.activePro}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Trialing</p>
          <p className="text-xl font-bold text-sky-700 mt-1">{stats.trialing}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Free / Past Due</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {stats.totalFree} <span className="text-xs font-normal text-rose-600">({stats.pastDue} past due)</span>
          </p>
        </div>
      </div>

      {/* Plan Configuration */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Plan Limits & Entitlement Configuration</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-lg border border-slate-200 p-4 flex items-start justify-between gap-4">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-slate-900 text-sm">
                  {plan.name} ({formatCurrency(plan.price)})
                </p>
                <p className="text-slate-500">
                  Products: {plan.feature_limits?.products ?? 'Unlimited'} · Monthly Sales:{' '}
                  {plan.feature_limits?.monthly_sales ?? 'Unlimited'} · Customers:{' '}
                  {plan.feature_limits?.customers ?? 'Unlimited'}
                </p>
                <p className="text-slate-500">
                  Advanced Reports: {plan.feature_entitlements?.advanced_reports ? 'Enabled' : 'Restricted'} ·
                  Data Export: {plan.feature_entitlements?.data_export ? 'Enabled' : 'Restricted'}
                </p>
              </div>
              <button
                onClick={() => openPlanEditor(plan)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0 cursor-pointer"
              >
                Configure
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Business Subscriptions Directory */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">Business Subscriptions ({filteredSubs.length})</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search business name or ID..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs w-56"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="free">Free</option>
              <option value="trialing">Trialing</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-semibold">Business</th>
                <th className="py-2 pr-4 font-semibold">Plan</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 pr-4 font-semibold">Period / Trial End</th>
                <th className="py-2 pr-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubs.map((row) => (
                <tr key={row.id}>
                  <td className="py-2.5 pr-4">
                    <p className="font-semibold text-slate-900">{row.business_name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{row.business_id}</p>
                  </td>
                  <td className="py-2.5 pr-4 font-medium">{row.plan_name}</td>
                  <td className="py-2.5 pr-4 uppercase font-semibold">{row.status}</td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {row.trial_ends_at && row.status === 'trialing'
                      ? formatDateTime(row.trial_ends_at)
                      : row.current_period_end
                      ? formatDateTime(row.current_period_end)
                      : '—'}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <button
                      onClick={() => openOverride(row)}
                      className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Manual Override
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook Failures & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-900">Webhook Processing Failures</h3>
          </div>
          {webhookFailures.length === 0 ? (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No failed webhook events recorded.
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {webhookFailures.map((w) => (
                <li key={w.id} className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                  <p className="font-semibold text-rose-900">
                    {w.event_type} ({w.payment_reference || 'no ref'})
                  </p>
                  <p className="text-rose-700">{w.error_message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Recent Subscription Audit Logs</h3>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
            {recentAuditLogs.map((log: { id: string; action: string; created_at: string; actor_type: string; business_id: string; business?: { name?: string } | null }) => (
              <div key={log.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900">{log.action}</span>
                  <span className="text-slate-400">{formatDateTime(log.created_at)}</span>
                </div>
                <p className="text-slate-600">
                  {log.business?.name || log.business_id} · Actor: {log.actor_type}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Manual Override: {selectedSub.business_name}
            </h3>
            <p className="text-xs text-slate-500">
              Manual overrides are written to the audit log and do not create Paystack payment records.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Target Plan</label>
                <select
                  value={overridePlan}
                  onChange={(e) => setOverridePlan(e.target.value as 'free' | 'pro')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Target Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as SubscriptionStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                >
                  <option value="free">free</option>
                  <option value="active">active</option>
                  <option value="past_due">past_due</option>
                  <option value="cancelled">cancelled</option>
                  <option value="expired">expired</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Reason (Required)</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                  placeholder="Document why this override is being applied..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOverride}
                disabled={saving || !overrideReason.trim()}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : 'Apply Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Config Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Configure {editingPlan.name} Plan Limits
            </h3>
            <p className="text-xs text-slate-500">Leave numeric limits blank for Unlimited.</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Active Products Limit</label>
                <input
                  type="number"
                  min={0}
                  value={productsLimit}
                  onChange={(e) => setProductsLimit(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Monthly Sales Limit</label>
                <input
                  type="number"
                  min={0}
                  value={salesLimit}
                  onChange={(e) => setSalesLimit(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Active Customers Limit</label>
                <input
                  type="number"
                  min={0}
                  value={customersLimit}
                  onChange={(e) => setCustomersLimit(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Paystack Plan Code</label>
                <input
                  type="text"
                  value={paystackCode}
                  onChange={(e) => setPaystackCode(e.target.value)}
                  placeholder="PLN_..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={advReports}
                  onChange={(e) => setAdvReports(e.target.checked)}
                />
                <span>Enable Advanced Reports</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={dataExport}
                  onChange={(e) => setDataExport(e.target.checked)}
                />
                <span>Enable Data Export</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingPlan(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlanConfig}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
