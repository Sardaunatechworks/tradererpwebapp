'use client';

import React, { useState, useEffect } from 'react';
import { getTransactionHistory } from '@/app/actions/history';
import { useUIStore } from '@/stores/uiStore';
import { 
  History,
  Search,
  Building2,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  ShoppingBag,
  Coins,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface Props {
  branches: any[];
  role: string;
}

export default function TransactionHistory({ branches, role }: Props) {
  const { currentBranchId } = useUIStore();

  const isScoped = role === 'MANAGER' || role === 'STAFF';
  const resolvedBranchId = isScoped ? currentBranchId : currentBranchId;

  // Sync component state branch filter with Zustand sidebar
  const [branchFilter, setBranchFilter] = useState(resolvedBranchId);

  useEffect(() => {
    setBranchFilter(resolvedBranchId);
  }, [resolvedBranchId]);

  // Data state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch transactions function
  async function loadTransactions() {
    setLoading(true);
    setError(null);
    try {
      const res = await getTransactionHistory(branchFilter);
      if (res?.error) {
        setError(res.error);
        setTransactions([]);
      } else if (res?.success) {
        setTransactions(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load transaction history.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  // Reload when branch filter changes
  useEffect(() => {
    loadTransactions();
  }, [branchFilter]);

  // In-memory filtering for search text & date range
  const filteredTransactions = transactions.filter((t) => {
    // 1. Search Query Match
    const query = searchText.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      t.productName.toLowerCase().includes(query) ||
      t.sku.toLowerCase().includes(query) ||
      t.cashierName.toLowerCase().includes(query) ||
      t.customerName.toLowerCase().includes(query);

    // 2. Date Filter Match
    if (!matchesSearch) return false;

    if (startDate || endDate) {
      const transDate = new Date(t.date);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (transDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (transDate > end) return false;
      }
    }

    return true;
  });

  // Calculate KPIs on the filtered transactions
  const totalTransactionsCount = filteredTransactions.length;
  const totalQuantitySold = filteredTransactions.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalRevenueValue = filteredTransactions.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  const totalProfitValue = filteredTransactions.reduce((acc, curr) => acc + (curr.profit || 0), 0);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    let csvContent = 'Date & Time,Product Name,SKU,Quantity,Total Price (NGN),Profit (NGN),Customer Name,Branch Name,Salesperson (Cashier),Payment Method\n';
    filteredTransactions.forEach((row) => {
      const formattedDate = new Date(row.date).toLocaleString();
      const prodName = row.productName.replace(/"/g, '""');
      const custName = row.customerName.replace(/"/g, '""');
      const cashier = row.cashierName.replace(/"/g, '""');
      const branch = row.branchName.replace(/"/g, '""');
      
      csvContent += `"${formattedDate}","${prodName}","${row.sku}",${row.quantity},${row.totalPrice},${row.profit},"${custName}","${branch}","${cashier}",${row.paymentMethod}\n`;
    });

    const filename = `Transactions_History_${branchFilter === 'all' ? 'All_Outlets' : 'Branch'}_${new Date().toISOString().split('T')[0]}.csv`;
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

  const activeBranchName = branchFilter === 'all' 
    ? 'All Outlets' 
    : (branches.find(b => b.id === branchFilter)?.name || 'My Branch');

  return (
    <div className="space-y-6">
      
      {/* Branch selector info header (Owner/Admin) */}
      {!isScoped && (
        <div className="flex justify-between items-center bg-slate-950 border border-slate-800 px-6 py-3 rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Building2 className="w-4 h-4 text-blue-500" />
            <span>Active context: <strong>{activeBranchName}</strong></span>
          </div>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Outlets</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex h-64 items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Loading transaction logs...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex h-64 items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center">
          <div className="space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm text-white font-bold leading-none">Load failure</p>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content display */}
      {!loading && !error && (
        <div className="space-y-6">

          {/* KPIs Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* KPI 1: Total Transactions */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Transactions</span>
                <span className="text-2xl font-black text-white block">
                  {totalTransactionsCount.toLocaleString()}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <History className="w-6 h-6" />
              </div>
            </div>

            {/* KPI 2: Quantity Sold */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Items Sold</span>
                <span className="text-2xl font-black text-white block">
                  {totalQuantitySold.toLocaleString()}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <ShoppingBag className="w-6 h-6" />
              </div>
            </div>

            {/* KPI 3: Total Revenue/Value */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Sales Value</span>
                <span className="text-2xl font-black text-white block">
                  ₦{totalRevenueValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <Coins className="w-6 h-6" />
              </div>
            </div>

            {/* KPI 4: Total Realized Profit */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Profit</span>
                <span className={`text-2xl font-black block ${totalProfitValue < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ₦{totalProfitValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                totalProfitValue < 0 
                  ? 'bg-rose-600/10 border-rose-500/20 text-rose-500' 
                  : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500'
              }`}>
                {totalProfitValue < 0 ? (
                  <ArrowDownRight className="w-6 h-6" />
                ) : (
                  <ArrowUpRight className="w-6 h-6" />
                )}
              </div>
            </div>

          </div>

          {/* Filtering controls bar */}
          <div className="flex flex-col lg:flex-row justify-between gap-4 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-3xl">
              
              {/* Text search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search product, SKU, cashier, customer..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="block w-full border border-slate-800 bg-slate-900 text-white rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:border-blue-500 transition-all font-semibold placeholder-slate-500"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* Start Date filter */}
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full border border-slate-800 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 transition-all font-semibold"
                />
              </div>

              {/* End Date filter */}
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full border border-slate-800 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 transition-all font-semibold"
                />
              </div>

            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                disabled={filteredTransactions.length === 0}
                className="w-full lg:w-auto flex items-center justify-center gap-2 border border-slate-800 bg-slate-900 text-slate-300 font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-slate-850 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export CSV
              </button>
            </div>
          </div>

          {/* Table Logs Display */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Date & Time</th>
                    <th className="py-4 px-6">Product Details</th>
                    <th className="py-4 px-6">Branch Outlet</th>
                    <th className="py-4 px-6">Salesperson / Cashier</th>
                    <th className="py-4 px-6">Customer Name</th>
                    <th className="py-4 px-6">Qty</th>
                    <th className="py-4 px-6 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-semibold text-slate-300">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No transactions found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-900/20 transition-all">
                        <td className="py-4 px-6 text-slate-400 whitespace-nowrap">
                          {new Date(tx.date).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 space-y-1">
                          <span className="text-white font-bold block">{tx.productName}</span>
                          <span className="text-slate-500 text-[10px] block font-mono">SKU: {tx.sku}</span>
                        </td>
                        <td className="py-4 px-6">
                          {tx.branchName}
                        </td>
                        <td className="py-4 px-6">
                          {tx.cashierName}
                        </td>
                        <td className="py-4 px-6 text-slate-400">
                          {tx.customerName}
                        </td>
                        <td className="py-4 px-6 text-slate-400">
                          {tx.quantity}
                        </td>
                        <td className="py-4 px-6 text-right text-white font-black text-sm">
                          ₦{tx.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
