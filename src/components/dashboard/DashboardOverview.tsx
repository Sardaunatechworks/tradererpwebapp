'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Receipt,
  CreditCard,
  Package,
  AlertTriangle,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { getDashboardData, DashboardData } from '@/app/actions/dashboard';
import { formatCurrency, formatNumber, formatDateTime } from '@/utils/formatters';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';

export default function DashboardOverview() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async (p: 'today' | 'week' | 'month') => {
    setLoading(true);
    const res = await getDashboardData(p);
    if (res.data) setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSummary(period);
  }, [period]);

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

  return (
    <div className="space-y-6">
      {/* Top Greeting & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {getTimeGreeting()}, {data?.userName || 'Partner'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Here is what is happening with <span className="font-semibold text-slate-800">{data?.businessName || 'your business'}</span> {periodLabels[period].toLowerCase()}.
          </p>
        </div>

        {/* Period Pills */}
        <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs shrink-0 self-start sm:self-auto">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
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

      {/* Quick Action Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Link href="/sales/new">
          <Button size="sm" leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}>
            New Sale
          </Button>
        </Link>
        <Link href="/inventory/new">
          <Button variant="secondary" size="sm" leftIcon={<Package className="w-3.5 h-3.5" />}>
            Add Product
          </Button>
        </Link>
        <Link href="/expenses/new">
          <Button variant="secondary" size="sm" leftIcon={<Receipt className="w-3.5 h-3.5" />}>
            Add Expense
          </Button>
        </Link>
        <Link href="/credit">
          <Button variant="outline" size="sm" leftIcon={<CreditCard className="w-3.5 h-3.5" />}>
            Credit Ledger
          </Button>
        </Link>
      </div>

      {/* 4 Primary Metric Cards */}
      {loading && !data ? (
        <LoadingState message="Calculating business KPIs..." />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
            subtitle="Operating overhead & payouts"
            icon={<Receipt className="w-5 h-5 text-amber-600" />}
            iconBg="bg-amber-50"
          />

          {/* Card 3: Estimated Profit */}
          <StatCard
            title="Estimated Profit"
            value={formatCurrency(data?.estimatedProfit || 0)}
            subtitle="Sales minus COGS and expenses"
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            iconBg="bg-emerald-50"
          />

          {/* Card 4: Outstanding Credit */}
          <StatCard
            title="Outstanding Credit"
            value={formatCurrency(data?.outstandingCredit || 0)}
            subtitle="Uncollected debtor balances"
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
              <CardTitle className="text-sm">Recent Transactions</CardTitle>
              <Link
                href="/sales"
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>View All Sales</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data?.recentSales?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No recent transactions recorded.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data?.recentSales?.map((sale) => (
                  <div
                    key={sale.id}
                    className="py-3 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          #{sale.sale_number}
                        </span>
                        <span className="text-xs text-slate-500">
                          {sale.customer?.name || 'Walk-in Customer'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
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
                <CardTitle className="text-sm">Low Stock Alerts</CardTitle>
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
              <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
                <span>All products are adequately stocked.</span>
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
    </div>
  );
}
