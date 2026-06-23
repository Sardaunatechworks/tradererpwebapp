'use client';

import React, { useState, useEffect } from 'react';
import { getReportsData } from '@/app/actions/reports';
import { useUIStore } from '@/stores/uiStore';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Users, 
  ArrowDownCircle, 
  ArrowUpCircle,
  FileSpreadsheet, 
  Printer, 
  Loader2, 
  Building2,
  Calendar,
  AlertCircle,
  Coins
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend 
} from 'recharts';

interface Props {
  branches: any[];
  role: string;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsDashboard({ branches, role }: Props) {
  const { currentBranchId } = useUIStore();

  const isScoped = role === 'MANAGER' || role === 'STAFF';
  const resolvedBranchId = isScoped ? currentBranchId : currentBranchId;

  // Tabs
  const [activeTab, setActiveTab] = useState<'revenue' | 'sales' | 'inventory' | 'debt' | 'branch'>(
    isScoped ? 'revenue' : 'revenue'
  );

  // Filters
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startStr = thirtyDaysAgo.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(startStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [branchIdFilter, setBranchIdFilter] = useState(resolvedBranchId);

  // Synchronize component branch filter state with Zustand sidebar selector
  useEffect(() => {
    setBranchIdFilter(resolvedBranchId);
  }, [resolvedBranchId]);

  // Data state
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch report data function
  async function fetchReportData() {
    setLoading(true);
    setError(null);
    setReportData(null); // Clear previous reports to prevent rendering mismatched tab datasets
    try {
      const res = await getReportsData(activeTab, startDate, endDate, branchIdFilter);
      if (res?.error) {
        setError(res.error);
        setReportData(null);
      } else if (res?.success) {
        setReportData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report data.');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }

  // Refetch when filters or tab change
  useEffect(() => {
    fetchReportData();
  }, [activeTab, startDate, endDate, branchIdFilter]);

  // Export to CSV helper
  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = '';
    let filename = `Report_${activeTab}_${startDate}_to_${endDate}.csv`;

    if (activeTab === 'revenue') {
      csvContent = 'Date,Revenue (NGN),Realized Profit (NGN)\n';
      reportData.dailyTrend?.forEach((row: any) => {
        csvContent += `${row.date},${row.revenue},${row.profit}\n`;
      });
    } else if (activeTab === 'sales') {
      csvContent = 'Invoice ID,Date,Cashier/Salesperson,Customer,Payment Method,Total Amount (NGN)\n';
      reportData.invoices?.forEach((row: any) => {
        const cashierName = row.cashier?.name || 'Staff Member';
        const customerName = row.customers?.name || 'Walk-in Customer';
        csvContent += `${row.id},${new Date(row.created_at).toLocaleString()},"${cashierName}","${customerName}",${row.payment_method},${row.total_amount}\n`;
      });
    } else if (activeTab === 'inventory') {
      csvContent = 'Product Name,SKU,Available Stock,Cost Price,Selling Price,Cost Valuation,Retail Valuation\n';
      reportData.inventory?.forEach((row: any) => {
        const prod = row.products || {};
        const costVal = (row.quantity || 0) * parseFloat(prod.cost_price || '0');
        const retailVal = (row.quantity || 0) * parseFloat(prod.default_price || '0');
        csvContent += `"${prod.name || 'N/A'}",${prod.sku || 'N/A'},${row.quantity},${prod.cost_price},${prod.default_price},${costVal},${retailVal}\n`;
      });
    } else if (activeTab === 'debt') {
      csvContent = 'Customer Name,Email,Phone,Outstanding Debt (NGN),Transactions Count,Last Transaction Date\n';
      reportData.debtors?.forEach((row: any) => {
        csvContent += `"${row.name}",${row.email},${row.phone},${row.totalDebt},${row.transactionCount},${new Date(row.lastDate).toLocaleDateString()}\n`;
      });
    } else if (activeTab === 'branch') {
      csvContent = 'Branch Name,Total Revenue,Transactions Count,Average Basket (NGN)\n';
      reportData.comparison?.forEach((row: any) => {
        csvContent += `"${row.name}",${row.revenue},${row.salesCount},${row.avgBasket}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeBranchName = branchIdFilter === 'all' 
    ? 'All Outlets' 
    : (branches.find(b => b.id === branchIdFilter)?.name || 'My Branch');

  return (
    <div className="space-y-6">
      
      {/* Printable style block */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide sidebar, dashboard frame widgets */
          .w-64, .print-hide, select, input, button, nav, header {
            display: none !important;
          }
          /* Reset content container for printable layout */
          body, main, div.flex-1, div.space-y-8, div.space-y-6 {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            float: none !important;
          }
          .bg-slate-950, .bg-slate-900, .bg-slate-900/20, .bg-slate-900/40, .bg-slate-900/40 {
            background-color: #ffffff !important;
            border-color: #cbd5e1 !important;
            color: #000000 !important;
          }
          .text-white, .text-slate-300, .text-slate-400, .text-slate-500 {
            color: #000000 !important;
          }
          .border-slate-800, .border-slate-900, .border {
            border-color: #cbd5e1 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border-bottom: 1px solid #cbd5e1 !important;
            color: #000000 !important;
            padding: 8px !important;
          }
          .recharts-wrapper {
            background-color: #ffffff !important;
            filter: invert(0.9) hue-rotate(180deg) !important;
          }
        }
      `}} />

      {/* Tab Switcher & Export Controls Header */}
      <div className="print-hide flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
        <nav className="flex flex-wrap gap-2">
          {[
            { id: 'revenue', name: 'Revenue', icon: TrendingUp },
            { id: 'sales', name: 'Sales POS', icon: ShoppingCart },
            { id: 'inventory', name: 'Inventory', icon: Package },
            { id: 'debt', name: 'Debts CRM', icon: Users },
            ...(!isScoped ? [{ id: 'branch', name: 'Branches comparison', icon: Building2 }] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>

        {reportData && (
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 border border-slate-800 bg-slate-900 text-slate-300 font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-slate-850 hover:text-white transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print PDF
            </button>
          </div>
        )}
      </div>

      {/* Filters Form Row */}
      <div className="print-hide grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
        
        {/* Date Start */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" /> Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="block w-full border border-slate-800 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 transition-all font-semibold"
          />
        </div>

        {/* Date End */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" /> End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="block w-full border border-slate-800 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 transition-all font-semibold"
          />
        </div>

        {/* Branch Selector (Visible to Admin/Owners only) */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-blue-500" /> Branch Outlet
          </label>
          {isScoped ? (
            <div className="block w-full border border-slate-800 bg-slate-900/50 text-slate-400 rounded-xl px-4 py-2.5 text-xs font-semibold select-none truncate">
              {activeBranchName}
            </div>
          ) : (
            <select
              value={branchIdFilter}
              onChange={(e) => setBranchIdFilter(e.target.value)}
              className="block w-full border border-slate-800 bg-slate-900 text-white rounded-xl px-4 py-2.5 pr-8 text-xs outline-none focus:border-blue-500 transition-all font-semibold cursor-pointer appearance-none"
            >
              <option value="all">All Outlets</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

      </div>

      {/* Printable Header Info Block (Only visible during print) */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-6 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide">TraderERP Business Report</h1>
            <p className="text-xs mt-1">Scope: <strong className="uppercase">{activeTab}</strong></p>
            <p className="text-xs">Location: <strong>{activeBranchName}</strong></p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium">Reporting Range:</p>
            <p className="text-sm font-bold">{startDate} to {endDate}</p>
          </div>
        </div>
      </div>

      {/* Error & Loading Visual states */}
      {loading && (
        <div className="flex h-64 items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Compiling report data...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="flex h-64 items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center">
          <div className="space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm text-white font-bold leading-none">Failed to generate report</p>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Report Render Area */}
      {!loading && !error && reportData && (
        <div className="space-y-6">

          {/* TAB 1: REVENUE REPORT */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Total Revenue card */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Revenue</span>
                    <span className="text-2xl font-black text-white block">
                      ₦{(reportData.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                {/* Realized Profit card */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Realized Profit</span>
                    <span className={`text-2xl font-black block ${(reportData.totalProfit || 0) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      ₦{(reportData.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
                    (reportData.totalProfit || 0) < 0 
                      ? 'bg-rose-600/10 border-rose-500/20 text-rose-500' 
                      : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500'
                  }`}>
                    <Coins className="w-6 h-6" />
                  </div>
                </div>

                {/* Sales Volume card */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Transactions</span>
                    <span className="text-2xl font-black text-white block">
                      {reportData.transactionCount || 0}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                </div>

                {/* Average basket size */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Avg basket size</span>
                    <span className="text-2xl font-black text-white block">
                      ₦{(reportData.transactionCount > 0 ? (reportData.totalRevenue || 0) / reportData.transactionCount : 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                </div>

              </div>

              {/* Chart trends */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Revenue timeline */}
                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none">Financial Performance</h3>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Timeline representation (Revenue vs Profit)</span>
                  </div>
                  <div className="h-64 w-full">
                    {!reportData.dailyTrend || reportData.dailyTrend.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">No trend data.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={reportData.dailyTrend || []}>
                          <defs>
                            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                          <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#revenueFill)" name="Revenue" />
                          <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profitFill)" name="Realized Profit" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Payment method breakdown */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none">Payment Methods</h3>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Revenue shares</span>
                  </div>
                  
                  <div className="space-y-4 text-xs font-semibold">
                    {[
                      { id: 'cash', name: 'Cash', color: 'bg-blue-500', amount: reportData.paymentMethods?.cash || 0 },
                      { id: 'card', name: 'Card Payments', color: 'bg-emerald-500', amount: reportData.paymentMethods?.card || 0 },
                      { id: 'bank_transfer', name: 'Bank Transfer', color: 'bg-amber-500', amount: reportData.paymentMethods?.bank_transfer || 0 },
                      { id: 'store_credit', name: 'Store Credit (Debt)', color: 'bg-red-500', amount: reportData.paymentMethods?.store_credit || 0 },
                    ].map((pm) => {
                      const share = (reportData.totalRevenue || 0) > 0 ? (pm.amount / reportData.totalRevenue) * 100 : 0;
                      return (
                        <div key={pm.id} className="space-y-2">
                          <div className="flex justify-between text-slate-400">
                            <span className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${pm.color}`}></span>
                              {pm.name}
                            </span>
                            <span className="text-white">₦{pm.amount.toLocaleString()} ({share.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                            <div className={`h-full ${pm.color}`} style={{ width: `${share}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Table details */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Daily breakdown</h3>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Data log details</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Revenue</th>
                        <th className="py-3 px-4 text-right">Realized Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-semibold">
                      {(reportData.dailyTrend || []).map((row: any) => (
                        <tr key={row.date} className="hover:bg-slate-900/20 text-slate-300">
                          <td className="py-3 px-4">{row.date}</td>
                          <td className="py-3 px-4 text-white">₦{(row.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className={`py-3 px-4 text-right ${(row.profit || 0) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>₦{(row.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SALES REPORTS */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              
              {/* Summary Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Sales value</span>
                    <span className="text-2xl font-black text-white block">
                      ₦{(reportData.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Realized Profit</span>
                    <span className={`text-2xl font-black block ${(reportData.totalProfit || 0) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      ₦{(reportData.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
                    (reportData.totalProfit || 0) < 0 
                      ? 'bg-rose-600/10 border-rose-500/20 text-rose-500' 
                      : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500'
                  }`}>
                    <Coins className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Invoices logged</span>
                    <span className="text-2xl font-black text-white block">
                      {reportData.totalSalesCount || 0}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Distinct Top Items</span>
                    <span className="text-2xl font-black text-white block">
                      {reportData.topProducts?.length || 0}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Package className="w-6 h-6" />
                  </div>
                </div>

              </div>

              {/* Top Selling Products List */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Top Products Table */}
                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none">Top-selling products</h3>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">By quantity sold</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">Product Name</th>
                          <th className="py-3 px-4 font-mono">SKU</th>
                          <th className="py-3 px-4 text-center">Qty Sold</th>
                          <th className="py-3 px-4 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 font-semibold">
                        {!reportData.topProducts || reportData.topProducts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-500">No items sold.</td>
                          </tr>
                        ) : (
                          (reportData.topProducts || []).map((p: any) => (
                            <tr key={p.sku} className="hover:bg-slate-900/20 text-slate-300">
                              <td className="py-3 px-4 text-white font-bold">{p.name}</td>
                              <td className="py-3 px-4 font-mono text-[10px] text-blue-500">{p.sku}</td>
                              <td className="py-3 px-4 text-center font-bold text-emerald-400">{p.quantity} units</td>
                              <td className="py-3 px-4 text-right text-white">₦{(p.revenue || 0).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Items Bar Chart */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none">Quantity Share</h3>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Top 5 Products</span>
                  </div>
                  <div className="h-64 w-full">
                    {!reportData.topProducts || reportData.topProducts.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">No data.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(reportData.topProducts || []).slice(0, 5)} layout="vertical" margin={{ left: -10, right: 10 }}>
                          <XAxis type="number" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="sku" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Bar dataKey="quantity" fill="#2563eb" radius={[0, 4, 4, 0]}>
                            {(reportData.topProducts || []).slice(0, 5).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>

              {/* Recent Invoices Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Invoices List</h3>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Detailed transaction breakdown</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Invoice ID</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Cashier</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-semibold">
                      {!reportData.invoices || reportData.invoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">No invoices logged.</td>
                        </tr>
                      ) : (
                        (reportData.invoices || []).map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-slate-900/20 text-slate-300">
                            <td className="py-3 px-4 font-mono text-[10px] text-blue-500 font-bold">#{inv.id.slice(0, 8)}...</td>
                            <td className="py-3 px-4">{new Date(inv.created_at).toLocaleString()}</td>
                            <td className="py-3 px-4">{inv.cashier?.name || 'Staff Member'}</td>
                            <td className="py-3 px-4">{inv.customers?.name || 'Walk-in Customer'}</td>
                            <td className="py-3 px-4 uppercase text-[10px] text-slate-400">{inv.payment_method?.replace('_', ' ')}</td>
                            <td className="py-3 px-4 text-right text-white font-bold">₦{parseFloat(inv.total_amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: INVENTORY REPORTS */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              
              {/* Summary statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total stock level</span>
                    <span className="text-2xl font-black text-white block">
                      {reportData.totalItems || 0} units
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                    <Package className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Cost valuation</span>
                    <span className="text-2xl font-black text-white block">
                      ₦{(reportData.costValuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <ArrowDownCircle className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Retail valuation</span>
                    <span className="text-2xl font-black text-white block">
                      ₦{(reportData.retailValuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <ArrowUpCircle className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Low stock items</span>
                    <span className="text-2xl font-black text-red-500 block">
                      {reportData.lowStockCount || 0} items
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                </div>

              </div>

              {/* Catalog stock list */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Catalog valuation metrics</h3>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Real-time valuation stats</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Product Details</th>
                        <th className="py-3 px-4">Current Stock</th>
                        <th className="py-3 px-4">Cost Price</th>
                        <th className="py-3 px-4">Retail Price</th>
                        <th className="py-3 px-4">Cost Valuation</th>
                        <th className="py-3 px-4 text-right">Retail Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-semibold">
                      {!reportData.inventory || reportData.inventory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">No stock in this branch.</td>
                        </tr>
                      ) : (
                        (reportData.inventory || []).map((row: any) => {
                          const prod = row.products || {};
                          const cost = parseFloat(prod.cost_price || '0');
                          const price = parseFloat(prod.default_price || '0');
                          const qty = row.quantity || 0;
                          return (
                            <tr key={row.product_id} className="hover:bg-slate-900/20 text-slate-300">
                              <td className="py-3 px-4 space-y-1">
                                <span className="text-white font-bold block">{prod.name}</span>
                                <span className="font-mono text-[9px] text-blue-500">SKU: {prod.sku}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`font-bold ${qty === 0 ? 'text-red-500' : qty <= row.reorder_level ? 'text-amber-500' : 'text-emerald-500'}`}>
                                  {qty} units
                                </span>
                              </td>
                              <td className="py-3 px-4">₦{cost.toFixed(2)}</td>
                              <td className="py-3 px-4">₦{price.toFixed(2)}</td>
                              <td className="py-3 px-4">₦{(qty * cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 px-4 text-right text-white">₦{(qty * price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stock movement log details */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Stock movement history</h3>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Audit log records</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Date / Time</th>
                        <th className="py-3 px-4">Product Details</th>
                        <th className="py-3 px-4 text-center">Movement Qty</th>
                        <th className="py-3 px-4">Action Type</th>
                        <th className="py-3 px-4">Triggered By</th>
                        <th className="py-3 px-4 text-right">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-semibold">
                      {!reportData.movements || reportData.movements.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">No stock movements found in this period.</td>
                        </tr>
                      ) : (
                        (reportData.movements || []).map((move: any) => (
                          <tr key={move.id} className="hover:bg-slate-900/20 text-slate-300">
                            <td className="py-3 px-4">{new Date(move.created_at).toLocaleString()}</td>
                            <td className="py-3 px-4 space-y-0.5">
                              <span className="text-white font-bold block">{move.products?.name}</span>
                              <span className="font-mono text-[9px] text-slate-500">SKU: {move.products?.sku}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`font-bold ${move.quantity > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {move.quantity > 0 ? `+${move.quantity}` : move.quantity} units
                              </span>
                            </td>
                            <td className="py-3 px-4 uppercase text-[10px] text-slate-400">{move.type}</td>
                            <td className="py-3 px-4">{move.recorded_by_user?.name || 'Operator'}</td>
                            <td className="py-3 px-4 text-right text-slate-400 italic max-w-[200px] truncate">{move.notes || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: DEBT REPORTS */}
          {activeTab === 'debt' && (
            <div className="space-y-6">
              
              {/* KPI indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Outstanding credit dues</span>
                    <span className="text-2xl font-black text-red-500 block">
                      ₦{(reportData.overallDebt || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Debtors count</span>
                    <span className="text-2xl font-black text-white block">
                      {reportData.debtorsCount || 0} clients
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

              </div>

              {/* Debtors List Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Outstanding customer credits</h3>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Store Credit CRM list</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Customer Details</th>
                        <th className="py-3 px-4 font-mono">Contact Details</th>
                        <th className="py-3 px-4 text-center">Credit Purchases</th>
                        <th className="py-3 px-4">Last Credit Activity</th>
                        <th className="py-3 px-4 text-right">Total Debt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-semibold">
                      {!reportData.debtors || reportData.debtors.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">No debts recorded.</td>
                        </tr>
                      ) : (
                        (reportData.debtors || []).map((row: any) => (
                          <tr key={row.email} className="hover:bg-slate-900/20 text-slate-300">
                            <td className="py-3 px-4 text-white font-bold">{row.name}</td>
                            <td className="py-3 px-4 font-mono space-y-0.5">
                              <span className="block text-[10px] text-slate-400">{row.email}</span>
                              <span className="block text-[10px] text-blue-500">{row.phone}</span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold">{row.transactionCount} times</td>
                            <td className="py-3 px-4 text-slate-400">{new Date(row.lastDate).toLocaleString()}</td>
                            <td className="py-3 px-4 text-right text-red-500 font-bold text-sm">₦{(row.totalDebt || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: BRANCH REPORTS (OWNER/ADMIN only) */}
          {activeTab === 'branch' && !isScoped && (
            <div className="space-y-6">
              
              {/* Branch performance comparisons */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Branch comparison table */}
                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none">Branch metrics ranking</h3>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Comparing total sales / average basket size</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">Branch Location</th>
                          <th className="py-3 px-4 text-center">Transactions Count</th>
                          <th className="py-3 px-4">Average Basket Size</th>
                          <th className="py-3 px-4 text-right">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 font-semibold">
                        {!reportData.comparison || reportData.comparison.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-500">No branch comparisons.</td>
                          </tr>
                        ) : (
                          (reportData.comparison || []).map((row: any) => (
                            <tr key={row.id} className="hover:bg-slate-900/20 text-slate-300">
                              <td className="py-3 px-4 text-white font-bold">{row.name}</td>
                              <td className="py-3 px-4 text-center font-bold text-emerald-400">{row.salesCount} sales</td>
                              <td className="py-3 px-4">₦{(row.avgBasket || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 px-4 text-right text-white font-bold">₦{(row.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Branch comparison bar chart */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none">Revenue share</h3>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Branch ranking</span>
                  </div>
                  <div className="h-64 w-full text-xs font-semibold">
                    {!reportData.comparison || reportData.comparison.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">No comparative data.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.comparison || []} margin={{ left: -10, right: 10 }}>
                          <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]}>
                            {(reportData.comparison || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
