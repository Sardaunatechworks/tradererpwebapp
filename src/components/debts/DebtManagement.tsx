'use client';

import React, { useState, useEffect } from 'react';
import { recordRepayment, getDebtOverviewData } from '@/app/actions/debts';
import { useUIStore } from '@/stores/uiStore';
import { 
  Users, 
  Coins, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpCircle,
  Plus, 
  Loader2, 
  Search, 
  CheckCircle,
  History,
  Building2
} from 'lucide-react';

interface Props {
  branches: any[];
  customers: any[];
  role: string;
}

export default function DebtManagement({ branches, customers, role }: Props) {
  const { currentBranchId } = useUIStore();

  const isScoped = role === 'MANAGER' || role === 'STAFF';
  const resolvedBranchId = isScoped ? currentBranchId : currentBranchId;

  // Sync component state branch filter with Zustand sidebar
  const [branchFilter, setBranchFilter] = useState(resolvedBranchId);

  useEffect(() => {
    setBranchFilter(resolvedBranchId);
  }, [resolvedBranchId]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'debtors' | 'repayments'>('debtors');

  // Modal State
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [repayMethod, setRepayMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [repayNotes, setRepayNotes] = useState<string>('');
  const [repayBranchId, setRepayBranchId] = useState<string>('');

  // Page data state
  const [debtData, setDebtData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterText, setFilterText] = useState('');

  // Form submitting state
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await getDebtOverviewData(branchFilter);
      if (res?.error) {
        setError(res.error);
        setDebtData(null);
      } else if (res?.success) {
        setDebtData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load debt metrics.');
      setDebtData(null);
    } finally {
      setLoading(false);
    }
  }

  // Reload when branch filter changes
  useEffect(() => {
    loadData();
  }, [branchFilter]);

  // Set default repayment branch when modal opens
  useEffect(() => {
    if (showRepayModal) {
      // Default to first branch if owner/admin and filter is 'all', otherwise current filter
      if (branchFilter === 'all') {
        setRepayBranchId(branches[0]?.id || '');
      } else {
        setRepayBranchId(branchFilter);
      }
    }
  }, [showRepayModal, branchFilter, branches]);

  const handleSubmitRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setSubmitErr('Please select a customer.');
      return;
    }

    const amt = parseFloat(repayAmount || '0');
    if (isNaN(amt) || amt <= 0) {
      setSubmitErr('Please enter a valid positive amount.');
      return;
    }

    setSubmitting(true);
    setSubmitErr(null);

    const res = await recordRepayment(
      selectedCustomer.id,
      amt,
      repayMethod,
      repayNotes,
      repayBranchId
    );

    if (res?.error) {
      setSubmitErr(res.error);
      setSubmitting(false);
    } else {
      setSubmitting(false);
      setShowRepayModal(false);
      setRepayAmount('');
      setRepayNotes('');
      loadData();
    }
  };

  const filteredDebtors = debtData?.debtors?.filter((d: any) => 
    d.name.toLowerCase().includes(filterText.toLowerCase()) ||
    d.email.toLowerCase().includes(filterText.toLowerCase()) ||
    d.phone.includes(filterText)
  ) || [];

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

      {/* Loading indicator */}
      {loading && (
        <div className="flex h-64 items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Syncing debt books...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex h-64 items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center">
          <div className="space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm text-white font-bold leading-none">Access denied / Load failure</p>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Dashboard */}
      {!loading && !error && debtData && (
        <div className="space-y-6">
          
          {/* KPIs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Total Credit KPI */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Credit sold</span>
                <span className="text-2xl font-black text-white block">
                  ₦{debtData.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <Coins className="w-6 h-6" />
              </div>
            </div>

            {/* Total Repayments / Collected KPI */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Collected</span>
                <span className="text-2xl font-black text-emerald-500 block">
                  ₦{debtData.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <ArrowUpCircle className="w-6 h-6" />
              </div>
            </div>

            {/* Outstanding Balance KPI */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Outstanding Balance</span>
                <span className="text-2xl font-black text-amber-500 block">
                  ₦{debtData.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* Overdue Debt Aging KPI */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Overdue Debt (&gt;30d)</span>
                <span className="text-2xl font-black text-red-500 block">
                  ₦{debtData.overdueDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* Sub Navigation Bar & Search Control */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('debtors')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'debtors'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Users className="w-4 h-4" /> Debtors list
              </button>
              <button
                onClick={() => setActiveTab('repayments')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'repayments'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <History className="w-4 h-4" /> Repayment History
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {activeTab === 'debtors' && (
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Search debtor name, contact..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-4 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-500"
                  />
                </div>
              )}
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setRepayAmount('');
                  setRepayNotes('');
                  setSubmitErr(null);
                  setShowRepayModal(true);
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Record Repayment
              </button>
            </div>
          </div>

          {/* TAB 1: DEBTORS LIST */}
          {activeTab === 'debtors' && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Debtor Client Details</th>
                      <th className="py-4 px-6">Phone Number</th>
                      <th className="py-4 px-6">Credit Purchases</th>
                      <th className="py-4 px-6">Collected / Repaid</th>
                      <th className="py-4 px-6">Credit Balance Dues</th>
                      <th className="py-4 px-6">Aging Status</th>
                      <th className="py-4 px-6 text-right">Repayment Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 font-semibold text-slate-300">
                    {filteredDebtors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          No debtors found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredDebtors.map((deb: any) => (
                        <tr key={deb.id} className="hover:bg-slate-900/20">
                          <td className="py-4 px-6 space-y-1">
                            <span className="text-white font-bold block">{deb.name}</span>
                            <span className="text-slate-500 text-[10px] block">{deb.email}</span>
                          </td>
                          <td className="py-4 px-6 font-mono text-[10px] text-slate-400">
                            {deb.phone}
                          </td>
                          <td className="py-4 px-6 text-slate-400">
                            ₦{deb.totalCredit.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-emerald-500">
                            ₦{deb.totalRepaid.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-white font-bold text-sm">
                            ₦{deb.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6">
                            {deb.status === 'OVERDUE' ? (
                              <span className="inline-flex items-center gap-1 bg-red-950/40 border border-red-800 text-red-500 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-lg">
                                <AlertCircle className="w-3 h-3" /> Overdue: ₦{deb.overdueDebt.toLocaleString()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-950/40 border border-emerald-800 text-emerald-500 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-lg">
                                <CheckCircle className="w-3 h-3" /> Good Dues
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => {
                                setSelectedCustomer(customers.find(c => c.id === deb.id));
                                setRepayAmount(deb.outstandingBalance.toFixed(2));
                                setRepayNotes('');
                                setSubmitErr(null);
                                setShowRepayModal(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-md"
                            >
                              Repay
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: REPAYMENTS AUDIT HISTORY */}
          {activeTab === 'repayments' && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Collection Date</th>
                      <th className="py-4 px-6">Customer Details</th>
                      <th className="py-4 px-6">Branch Location</th>
                      <th className="py-4 px-6">Payment Method</th>
                      <th className="py-4 px-6">Cashier / Collector</th>
                      <th className="py-4 px-6">Dues Repaid</th>
                      <th className="py-4 px-6 text-right">Repayment Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 font-semibold text-slate-300">
                    {debtData.repaymentHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          No repayment collections recorded.
                        </td>
                      </tr>
                    ) : (
                      debtData.repaymentHistory.map((rep: any) => (
                        <tr key={rep.id} className="hover:bg-slate-900/20">
                          <td className="py-4 px-6 text-slate-400">
                            {new Date(rep.created_at).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 space-y-1">
                            <span className="text-white font-bold block">{rep.customers?.name || 'Walk-in CRM'}</span>
                            <span className="text-slate-500 text-[10px] block">{rep.customers?.email}</span>
                          </td>
                          <td className="py-4 px-6">
                            {rep.branches?.name || 'Main Branch'}
                          </td>
                          <td className="py-4 px-6">
                            <span className="uppercase text-[10px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                              {rep.payment_method.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-300">
                            {rep.recorded_by_user?.name || 'Staff Member'}
                          </td>
                          <td className="py-4 px-6 text-emerald-500 font-bold text-sm">
                            ₦{parseFloat(rep.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right text-slate-500 italic truncate max-w-[200px]">
                            {rep.notes || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* RECORD REPAYMENT MODAL */}
      {showRepayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Record Repayment</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Collect debtor credit outstanding</span>
            </div>

            <form onSubmit={handleSubmitRepayment} className="space-y-4">
              {submitErr && (
                <div className="bg-red-950/40 border border-red-800 rounded-xl p-3.5 text-xs text-red-400 font-medium">
                  {submitErr}
                </div>
              )}

              {/* Customer Selector */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Select Debtor Customer</label>
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const cObj = customers.find(c => c.id === cId);
                    setSelectedCustomer(cObj || null);
                    // Autofill remaining balance if debtor has one
                    const existingDebtor = debtData?.debtors?.find((d: any) => d.id === cId);
                    if (existingDebtor) {
                      setRepayAmount(existingDebtor.outstandingBalance.toFixed(2));
                    }
                  }}
                  required
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 cursor-pointer font-semibold appearance-none"
                >
                  <option value="">-- Choose Debtor Customer --</option>
                  {customers.map((c) => {
                    // Visual check if customer is debtor
                    const dBal = debtData?.debtors?.find((d: any) => d.id === c.id)?.outstandingBalance || 0;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} {dBal > 0 ? `(Dues: ₦${dBal.toLocaleString()})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Amount field */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Repayment Collection Amount (₦)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={repayAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                      setRepayAmount(val);
                    }
                  }}
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              {/* Repayment collection method */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', name: 'Cash' },
                  { id: 'card', name: 'Card' },
                  { id: 'bank_transfer', name: 'Transfer' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setRepayMethod(m.id as any)}
                    className={`py-2 text-[10px] uppercase tracking-wider font-bold rounded-lg border transition-all cursor-pointer ${
                      repayMethod === m.id
                        ? 'bg-blue-600/10 border-blue-500 text-blue-500'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>

              {/* Branch collection location (Owner/Admins when filter context is 'all') */}
              {branchFilter === 'all' && !isScoped ? (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Collection Branch Outlet</label>
                  <select
                    value={repayBranchId}
                    onChange={(e) => setRepayBranchId(e.target.value)}
                    required
                    className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 cursor-pointer font-semibold appearance-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <input type="hidden" name="repayBranchId" value={repayBranchId} />
              )}

              {/* Repayment Notes */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Collection Notes / Comments</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in full via transfer"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 font-semibold placeholder-slate-600"
                />
              </div>

              {/* Actions bar */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRepayModal(false)}
                  className="border border-slate-800 hover:bg-slate-950 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-all cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Log Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
