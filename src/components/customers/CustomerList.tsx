'use client';

import React, { useState, useEffect } from 'react';
import { createCustomer } from '@/app/actions/customers';
import { Plus, Search, Loader2, Users, TrendingUp } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { db } from '@/lib/offline/db';

interface Props {
  initialCustomers: any[];
  branches: any[];
  role: string;
}

export default function CustomerList({ initialCustomers, branches, role }: Props) {
  const { currentBranchId } = useUIStore();
  const [filterText, setFilterText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [localCustomers, setLocalCustomers] = useState<any[]>(initialCustomers);

  // Sync cache on load
  useEffect(() => {
    const syncLocal = async () => {
      try {
        if (initialCustomers.length > 0) {
          await db.customers.clear();
          await db.customers.bulkPut(initialCustomers.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email || undefined,
            phone: c.phone || undefined,
            branch_id: c.branch_id || 'all',
            business_id: c.business_id,
            total_spend: parseFloat(c.total_spend || '0')
          })));
          setLocalCustomers(initialCustomers);
        } else {
          const cached = await db.customers.toArray();
          setLocalCustomers(cached);
        }
      } catch (err) {
        console.error('CustomerList offline cache sync error:', err);
      }
    };
    syncLocal();
  }, [initialCustomers]);

  const activeBranchId = (role === 'MANAGER' || role === 'STAFF') ? currentBranchId : currentBranchId;

  // Filter customers based on registered branch
  const branchCustomers = activeBranchId === 'all'
    ? localCustomers
    : localCustomers.filter(c => c.branch_id === activeBranchId);

  const filtered = branchCustomers.filter(c => 
    c.name.toLowerCase().includes(filterText.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(filterText.toLowerCase())) ||
    (c.phone && c.phone.includes(filterText))
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const branchId = formData.get('branchId') as string;

    // Intercept Offline Mode
    if (typeof window !== 'undefined' && !navigator.onLine) {
      try {
        const offlineCustomerId = `OFFLINE-C-${crypto.randomUUID().slice(0, 8)}`;
        const newCust = {
          id: offlineCustomerId,
          name,
          email: email || undefined,
          phone: phone || undefined,
          branch_id: branchId || 'all',
          business_id: 'offline',
          total_spend: 0
        };
        
        await db.customers.add(newCust);
        
        await db.sync_queue.add({
          type: 'CUSTOMER_CREATED',
          payload: newCust,
          status: 'queued',
          created_at: new Date().toISOString()
        });

        const updatedList = await db.customers.toArray();
        setLocalCustomers(updatedList);
        setShowAddModal(false);
        setLoading(false);
      } catch (err: any) {
        setError(`Failed to save customer offline: ${err.message}`);
        setLoading(false);
      }
      return;
    }

    const res = await createCustomer(formData);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setShowAddModal(false);
      setLoading(false);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-medium text-xs">
        
        {/* Scoped Customers Count */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              {activeBranchId === 'all' ? 'Total Registered Customers' : 'Registered Customers (This Branch)'}
            </span>
            <span className="text-2xl font-black text-white block">
              {branchCustomers.length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Scoped CRM Value */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              {activeBranchId === 'all' ? 'Total CRM Spend Value' : 'Branch CRM Spend Value'}
            </span>
            <span className="text-2xl font-black text-white block">
              ₦{branchCustomers.reduce((sum, c) => sum + parseFloat(c.total_spend || '0'), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Search and Action */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-4 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-500"
          />
        </div>

        <button
          onClick={() => {
            setError(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Customer CRM Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Customer Details</th>
                <th className="py-4 px-6">Phone Number</th>
                <th className="py-4 px-6">Registered Branch</th>
                <th className="py-4 px-6">Total Spend (₦)</th>
                <th className="py-4 px-6 text-right">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No customers found in CRM database.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const registeredBranchName = branches.find(b => b.id === c.branch_id)?.name || 'Central / All Outlets';
                  return (
                    <tr key={c.id} className="hover:bg-slate-900/20 text-slate-300">
                      <td className="py-4 px-6 space-y-1">
                        <span className="text-white font-bold block">{c.name}</span>
                        {c.email && <span className="text-slate-500 text-[10px] block">{c.email}</span>}
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-mono">
                        {c.phone || 'N/A'}
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-medium">
                        {registeredBranchName}
                      </td>
                      <td className="py-4 px-6 text-white font-bold text-sm">
                        ₦{parseFloat(c.total_spend || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right text-slate-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Register Customer</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">
                {activeBranchId === 'all' ? 'Applies to the business CRM' : `Registers under branch: ${branches.find(b => b.id === activeBranchId)?.name || 'This Branch'}`}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-950/40 border border-red-800 rounded-xl p-3.5 text-xs text-red-400 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Customer Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Email Address</label>
                <input
                  name="email"
                  type="email"
                  placeholder="e.g. john@example.com"
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Phone Number</label>
                <input
                  name="phone"
                  type="text"
                  placeholder="e.g. +23480..."
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                />
              </div>

              {activeBranchId === 'all' ? (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Register Branch Location</label>
                  <select
                    name="branchId"
                    required
                    className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium cursor-pointer appearance-none"
                  >
                    <option value="all">Central / All Outlets</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input type="hidden" name="branchId" value={activeBranchId} />
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="border border-slate-800 hover:bg-slate-950 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
