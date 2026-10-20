'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingCart,
  Receipt,
  CreditCard,
  Package,
  AlertTriangle,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Store,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { getDashboardData, DashboardData } from '@/app/actions/dashboard';
import { getUserTourPreferences } from '@/app/actions/privacy';
import { formatCurrency, formatNumber, formatDateTime } from '@/utils/formatters';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import GuidedTourModal from '@/components/onboarding/GuidedTourModal';

export default function DashboardOverview() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);

  const fetchSummary = async (p: 'today' | 'week' | 'month') => {
    setLoading(true);
    const res = await getDashboardData(p);
    if (res.data) setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSummary(period);
  }, [period]);

  // Check tour completion on first mount
  useEffect(() => {
    async function checkTour() {
      const localCompleted = localStorage.getItem('tradererp_tour_completed');
      if (localCompleted === 'true') return;

      const pref = await getUserTourPreferences();
      if (!pref.tourCompleted) {
        // Small delay to let the page settle before displaying the tour
        const timer = setTimeout(() => {
          setTourOpen(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
    checkTour();
  }, []);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const periodLabels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
  };

  const isBrandNewStore =
    data &&
    data.salesCount === 0 &&
    (!data.recentSales || data.recentSales.length === 0);

  return (
    <div className="space-y-6">
      {/* Top Greeting & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {getTimeGreeting()}, {data?.userName || 'Partner'}
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Here is your live trade overview for{' '}
            <span className="font-semibold text-slate-800">
              {data?.businessName || 'your business'}
            </span>{' '}
            ({periodLabels[period].toLowerCase()}).
          </p>
        </div>

        {/* Period Pills & Guided Tour Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTourOpen(true)}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-blue-600" />}
            className="text-xs bg-white text-slate-700"
          >
            Quick Tour
          </Button>

          <div className="flex w-full sm:w-auto border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs shrink-0">
            {(['today', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-semibold text-center transition-colors cursor-pointer ${
                  period === p
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* First-Minute Discoverability: New User Quick-Start Guide */}
      {isBrandNewStore && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 text-white shadow-md space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>First-Time Setup Guide</span>
              </span>
              <h2 className="text-lg sm:text-xl font-bold">
                Welcome to your new business workspace!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Start managing your operations in 3 simple steps. Everything you record here stays secure and private to your business.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTourOpen(true)}
              className="hidden sm:inline-flex bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Start Walkthrough
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <Link
              href="/inventory/new"
              className="p-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500 text-white shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">1. Add Your Stock</p>
                  <p className="text-[11px] text-slate-300">Enter your store products</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </Link>

            <Link
              href="/sales/new"
              className="p-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500 text-white shrink-0">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">2. Record First Sale</p>
                  <p className="text-[11px] text-slate-300">Issue an instant receipt</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </Link>

            <Link
              href="/expenses/new"
              className="p-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">3. Log Shop Expenses</p>
                  <p className="text-[11px] text-slate-300">Track rent, fuel &amp; wages</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </Link>
          </div>
        </div>
      )}

      {/* Quick Action Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar touch-pan-x">
        <Link href="/sales/new" className="shrink-0">
          <Button size="sm" leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}>
            New Sale
          </Button>
        </Link>
        <Link href="/inventory/new" className="shrink-0">
          <Button variant="secondary" size="sm" leftIcon={<Package className="w-3.5 h-3.5" />}>
            Add Product
          </Button>
        </Link>
        <Link href="/expenses/new" className="shrink-0">
          <Button variant="secondary" size="sm" leftIcon={<Receipt className="w-3.5 h-3.5" />}>
            Add Expense
          </Button>
        </Link>
        <Link href="/credit" className="shrink-0">
          <Button variant="outline" size="sm" leftIcon={<CreditCard className="w-3.5 h-3.5" />}>
            Credit Ledger
          </Button>
        </Link>
      </div>

      {/* 4 Primary Metric Cards with Plain-Language Explanations */}
      {loading && !data ? (
        <LoadingState message="Calculating business KPIs..." />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Sales */}
          <StatCard
            title={`${periodLabels[period]}'s Sales`}
            value={formatCurrency(data?.salesTotal || 0)}
            subtitle={`${data?.salesCount || 0} transactions completed`}
            icon={<ShoppingCart className="w-5 h-5 text-blue-600" />}
            iconBg="bg-blue-50"
          />

          {/* Card 2: Expenses */}
          <StatCard
            title={`${periodLabels[period]}'s Expenses`}
            value={formatCurrency(data?.expensesTotal || 0)}
            subtitle="Shop overheads (rent, fuel, wages)"
            icon={<Receipt className="w-5 h-5 text-amber-600" />}
            iconBg="bg-amber-50"
          />

          {/* Card 3: Estimated Profit */}
          <StatCard
            title="Estimated Profit"
            value={formatCurrency(data?.estimatedProfit || 0)}
            subtitle="Sales minus product cost & expenses"
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            iconBg="bg-emerald-50"
          />

          {/* Card 4: Outstanding Credit */}
          <StatCard
            title="Customer Debts"
            value={formatCurrency(data?.outstandingCredit || 0)}
            subtitle="Uncollected debtor credit balances"
            icon={<CreditCard className="w-5 h-5 text-red-600" />}
            iconBg="bg-red-50"
          />
        </div>
      )}

      {/* Secondary Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recent Sales (7 cols) */}
        <div className="lg:col-span-7">
          <Card padding="md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <CardTitle className="text-sm">Recent Transactions</CardTitle>
                <p className="text-[11px] text-slate-400">Latest customer checkouts and receipts</p>
              </div>
              <Link
                href="/sales"
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>View All Sales</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data?.recentSales?.length === 0 ? (
              <div className="py-6 text-center">
                <EmptyState
                  icon={<ShoppingCart className="w-7 h-7 text-slate-400" />}
                  title="No sales recorded yet"
                  description="When you complete sales at your store checkout, they will appear here with customer receipts."
                  actionLabel="Make First Sale"
                  onAction={() => {
                    window.location.href = '/sales/new';
                  }}
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data?.recentSales?.map((sale) => (
                  <div
                    key={sale.id}
                    className="py-3 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded-lg transition-colors gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="font-bold text-xs text-slate-900 shrink-0">
                          #{sale.sale_number}
                        </span>
                        <span className="text-xs text-slate-500 truncate">
                          {sale.customer?.name || 'Walk-in Customer'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {formatDateTime(sale.created_at)}
                      </p>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="font-bold text-xs text-slate-900">
                          {formatCurrency(sale.total_amount)}
                        </p>
                        {sale.balance_due > 0 && (
                          <p className="text-[10px] text-red-500 font-semibold">
                            Due: {formatCurrency(sale.balance_due)}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          sale.status === 'cancelled'
                            ? 'neutral'
                            : sale.payment_status === 'paid'
                            ? 'success'
                            : sale.payment_status === 'partial'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {sale.status === 'cancelled'
                          ? 'CANCELLED'
                          : sale.payment_status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Low Stock Warnings (5 cols) */}
        <div className="lg:col-span-5">
          <Card padding="md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-sm">Stock Alerts</CardTitle>
              </div>
              <Link
                href="/inventory"
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>Stock Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data?.lowStockProducts?.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span className="font-medium text-slate-700">All products are adequately stocked.</span>
                <span className="text-[11px] text-slate-400">Low stock alerts will appear here when inventory drops.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data?.lowStockProducts?.map((prod) => (
                  <div
                    key={prod.id}
                    className="py-2.5 flex items-center justify-between px-2 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-xs text-slate-900 truncate max-w-[170px]">
                        {prod.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Min threshold: {prod.minimum_stock} {prod.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-extrabold ${
                          prod.current_stock === 0 ? 'text-red-600' : 'text-amber-600'
                        }`}
                      >
                        {prod.current_stock} {prod.unit}
                      </span>
                      <Link href="/inventory">
                        <span className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 cursor-pointer">
                          + Stock
                        </span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Guided Tour Modal */}
      <GuidedTourModal
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        userName={data?.userName}
      />
    </div>
  );
}
