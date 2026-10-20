'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  ShoppingCart,
  Receipt,
  Package,
  TrendingUp,
  CreditCard,
  Calendar,
  ArrowUpRight,
  PieChart,
} from 'lucide-react';
import {
  getSalesReport,
  getExpensesReport,
  getInventoryReport,
  getPerformanceReport,
} from '@/app/actions/reports';
import { formatCurrency, formatNumber, formatDate } from '@/utils/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';

export default function ReportsView() {
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses' | 'inventory' | 'performance'>('sales');
  const [range, setRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('month');

  // Report Data
  const [salesData, setSalesData] = useState<any>(null);
  const [expenseData, setExpenseData] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    if (activeTab === 'sales') {
      const res = await getSalesReport(range);
      if (res.data) setSalesData(res.data);
    } else if (activeTab === 'expenses') {
      const res = await getExpensesReport(range);
      if (res.data) setExpenseData(res.data);
    } else if (activeTab === 'inventory') {
      const res = await getInventoryReport();
      if (res.data) setInventoryData(res.data);
    } else if (activeTab === 'performance') {
      const res = await getPerformanceReport(range);
      if (res.data) setPerformanceData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, range]);

  const ranges = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Reports & Analysis"
        description="Review sales revenue, operating expenses, warehouse valuation, and overall business profit."
      />

      {/* Tabs and Date Range Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        {/* Module Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar touch-pan-x">
          {[
            { id: 'sales', label: 'Sales Report', icon: ShoppingCart },
            { id: 'expenses', label: 'Expense Report', icon: Receipt },
            { id: 'inventory', label: 'Inventory Valuation', icon: Package },
            { id: 'performance', label: 'Estimated Profit', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Filter (hidden for inventory valuation which is current state) */}
        {activeTab !== 'inventory' && (
          <div className="flex w-full sm:w-auto border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs overflow-x-auto no-scrollbar shrink-0 touch-pan-x">
            {ranges.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id as any)}
                className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md font-medium whitespace-nowrap text-center transition-colors cursor-pointer shrink-0 ${
                  range === r.id
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState message="Generating business intelligence report..." />
      ) : (
        <>
          {/* ──────────────────────────────────────────────────────────────────────────
             TAB 1: SALES REPORT
          ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'sales' && salesData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <Card padding="md" className="border-l-4 border-l-blue-600">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Gross Sales</p>
                  <p className="text-base sm:text-2xl font-bold text-slate-900 mt-1 truncate" title={formatCurrency(salesData.totalSales)}>
                    {formatCurrency(salesData.totalSales)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">{salesData.count} transactions</p>
                </Card>

                <Card padding="md" className="border-l-4 border-l-emerald-600">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Cash Collected</p>
                  <p className="text-base sm:text-2xl font-bold text-emerald-600 mt-1 truncate" title={formatCurrency(salesData.totalPaid)}>
                    {formatCurrency(salesData.totalPaid)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">Direct cash & transfers</p>
                </Card>

                <Card padding="md" className="border-l-4 border-l-red-500">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Unpaid Credit</p>
                  <p className="text-base sm:text-2xl font-bold text-red-600 mt-1 truncate" title={formatCurrency(salesData.totalCredit)}>
                    {formatCurrency(salesData.totalCredit)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">Owed by customers</p>
                </Card>

                <Card padding="md" className="border-l-4 border-l-purple-600">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Avg Order Value</p>
                  <p className="text-base sm:text-2xl font-bold text-slate-900 mt-1 truncate" title={formatCurrency(salesData.averageOrderValue)}>
                    {formatCurrency(salesData.averageOrderValue)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">Per sales ticket</p>
                </Card>
              </div>

              {/* Transactions in Period */}
              <Card padding="none" className="overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 font-semibold text-xs text-slate-700 uppercase">
                  Sales Transactions Log
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700 min-w-[520px]">
                    <thead className="text-xs uppercase text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-4">Receipt</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Customer</th>
                        <th className="py-2.5 px-4 text-right">Total</th>
                        <th className="py-2.5 px-4 text-right">Balance</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesData.sales?.map((s: any) => (
                        <tr key={s.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            #{s.sale_number}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-slate-500">
                            {formatDate(s.created_at)}
                          </td>
                          <td className="py-2.5 px-4 text-xs font-medium text-slate-700">
                            {s.customer?.name || 'Walk-in Customer'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                            {formatCurrency(s.total_amount)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-xs">
                            {s.balance_due > 0 ? (
                              <span className="font-bold text-red-600">
                                {formatCurrency(s.balance_due)}
                              </span>
                            ) : (
                              '₦0'
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <Badge
                              variant={
                                s.payment_status === 'paid'
                                  ? 'success'
                                  : s.payment_status === 'partial'
                                  ? 'warning'
                                  : 'danger'
                              }
                              size="sm"
                            >
                              {s.payment_status.toUpperCase()}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
             TAB 2: EXPENSES REPORT
          ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'expenses' && expenseData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card padding="md" className="border-l-4 border-l-amber-500">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Total Expenses</p>
                  <p className="text-base sm:text-2xl font-bold text-slate-900 mt-1 truncate" title={formatCurrency(expenseData.totalExpenses)}>
                    {formatCurrency(expenseData.totalExpenses)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">{expenseData.count} payments logged</p>
                </Card>

                <Card padding="md" className="sm:col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
                    Spending by Category
                  </p>
                  <div className="space-y-2">
                    {expenseData.byCategory?.map((cat: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-slate-700">
                          <span className="truncate">{cat.name}</span>
                          <span className="shrink-0 ml-2">
                            {formatCurrency(cat.total)} ({cat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
             TAB 3: INVENTORY VALUATION
          ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'inventory' && inventoryData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <Card padding="md" className="border-l-4 border-l-blue-600">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Cost Valuation</p>
                  <p className="text-base sm:text-2xl font-bold text-slate-900 mt-1 truncate" title={formatCurrency(inventoryData.totalCostValuation)}>
                    {formatCurrency(inventoryData.totalCostValuation)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">Total invested</p>
                </Card>

                <Card padding="md" className="border-l-4 border-l-emerald-600">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Retail Valuation</p>
                  <p className="text-base sm:text-2xl font-bold text-emerald-600 mt-1 truncate" title={formatCurrency(inventoryData.totalRetailValuation)}>
                    {formatCurrency(inventoryData.totalRetailValuation)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">Expected revenue</p>
                </Card>

                <Card padding="md" className="border-l-4 border-l-purple-600">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Potential Margin</p>
                  <p className="text-base sm:text-2xl font-bold text-purple-600 mt-1 truncate" title={formatCurrency(inventoryData.potentialMargin)}>
                    {formatCurrency(inventoryData.potentialMargin)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">Markup potential</p>
                </Card>

                <Card padding="md" className="border-l-4 border-l-amber-500">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Stock Items</p>
                  <p className="text-base sm:text-2xl font-bold text-slate-900 mt-1 truncate">
                    {formatNumber(inventoryData.totalStockQty)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">
                    Across {inventoryData.totalItems} products
                  </p>
                </Card>
              </div>

              {/* Low stock alerts */}
              {inventoryData.lowStockCount > 0 && (
                <div className="p-3 sm:p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>
                    Warning: You have {inventoryData.lowStockCount} products at or below their minimum
                    stock threshold.
                  </span>
                  <a href="/inventory" className="underline font-bold shrink-0">
                    View Inventory
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
             TAB 4: PERFORMANCE REPORT (ESTIMATED PROFIT)
          ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'performance' && performanceData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card padding="md" className="border-l-4 border-l-blue-600">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Gross Sales</p>
                  <p className="text-base sm:text-2xl font-bold text-slate-900 mt-1 truncate" title={formatCurrency(performanceData.totalRevenue)}>
                    {formatCurrency(performanceData.totalRevenue)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">Total revenue</p>
                </Card>

                <Card padding="md" className="border-l-4 border-l-slate-600">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase truncate">Cost of Goods (COGS)</p>
                  <p className="text-base sm:text-2xl font-bold text-slate-700 mt-1 truncate" title={formatCurrency(performanceData.totalCogs)}>
                    {formatCurrency(performanceData.totalCogs)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">Items cost</p>
                </Card>

                <Card padding="md" className="border-l-4 border-l-amber-600">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Operating Expenses</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">
                    {formatCurrency(performanceData.totalExpenses)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Overhead costs paid</p>
                </Card>
              </div>

              {/* Profit summary card */}
              <Card padding="lg" className="border-2 border-emerald-500/40 bg-emerald-50/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-1">
                      Estimated Profit
                    </span>
                    <h2 className="text-3xl font-black text-slate-900">
                      {formatCurrency(performanceData.netEstimatedProfit)}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Formula: Sales ({formatCurrency(performanceData.totalRevenue)}) - COGS (
                      {formatCurrency(performanceData.totalCogs)}) - Expenses (
                      {formatCurrency(performanceData.totalExpenses)})
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                    <p className="text-slate-500">Uncollected Customer Credit:</p>
                    <p className="text-base font-bold text-red-600">
                      {formatCurrency(performanceData.totalCreditDue)}
                    </p>
                    <p className="text-[10px] text-slate-400">Not counted as cash until collected</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
