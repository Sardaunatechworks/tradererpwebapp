'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  DollarSign,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Customer, PaymentMethod } from '@/types';
import {
  getOutstandingCreditSummary,
  recordCreditPayment,
} from '@/app/actions/credit';
import { formatCurrency } from '@/utils/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';

export default function CreditOverviewPage() {
  const [data, setData] = useState<{
    totalOutstanding: number;
    debtorsCount: number;
    customers: Array<Customer & { total_credit: number; sales_count: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Repayment Modal
  const [selectedDebtor, setSelectedDebtor] = useState<
    (Customer & { total_credit: number; sales_count: number }) | null
  >(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCreditData = async () => {
    setLoading(true);
    const res = await getOutstandingCreditSummary();
    if (res.data) setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCreditData();
  }, []);

  const filteredDebtors = (data?.customers || []).filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      (c.phone && c.phone.toLowerCase().includes(s))
    );
  });

  const handleOpenRepayModal = (debtor: any) => {
    setSelectedDebtor(debtor);
    setPaymentAmount(debtor.total_credit.toString());
    setPaymentNotes('');
    setFormError(null);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtor) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Please enter a valid repayment amount.');
      return;
    }
    if (amount > selectedDebtor.total_credit) {
      setFormError(
        `Payment cannot exceed total outstanding debt (${formatCurrency(
          selectedDebtor.total_credit
        )}).`
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const res = await recordCreditPayment({
      customerId: selectedDebtor.id,
      amount,
      paymentMethod,
      notes: paymentNotes,
    });

    setSubmitting(false);

    if (res.error) {
      setFormError(res.error);
    } else {
      setSelectedDebtor(null);
      fetchCreditData();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outstanding Credit & Debts"
        description="Monitor unpaid customer balances, track debtor accounts, and record partial or full debt repayments."
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card padding="md" className="border-l-4 border-l-red-600">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Total Outstanding Credit
          </p>
          <p className="text-3xl font-extrabold text-red-600 mt-1">
            {formatCurrency(data?.totalOutstanding || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Accumulated unpaid balances across all sales
          </p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Active Debtors
          </p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">
            {data?.debtorsCount || 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">Customers with pending credit balances</p>
        </Card>
      </div>

      {/* Search Input */}
      <Card padding="sm">
        <div className="max-w-md">
          <Input
            placeholder="Search debtor by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      {/* Debtors List */}
      {loading ? (
        <LoadingState message="Loading outstanding credit ledger..." />
      ) : filteredDebtors.length === 0 ? (
        <EmptyState
          title={search ? 'No debtors matching search' : 'No outstanding credit'}
          description={
            search
              ? 'Try refining your search keyword.'
              : 'All sales are fully paid. There are currently no pending debts or credit balances in your business.'
          }
          icon={<CheckCircle2 className="w-8 h-8 text-emerald-500" />}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Customer</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4 text-center">Unpaid Sales</th>
                  <th className="py-3.5 px-4 text-right">Total Debt</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Repayment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebtors.map((debtor) => (
                  <tr key={debtor.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                      <div>{debtor.name}</div>
                      {debtor.address && (
                        <p className="text-xs text-slate-400 font-normal mt-0.5">
                          {debtor.address}
                        </p>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {debtor.phone || '—'}
                    </td>

                    {/* Unpaid sales count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
                        {debtor.sales_count} {debtor.sales_count === 1 ? 'sale' : 'sales'}
                      </span>
                    </td>

                    {/* Total Debt */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-red-600 text-sm">
                      {formatCurrency(debtor.total_credit)}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleOpenRepayModal(debtor)}
                        leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                      >
                        Record Payment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Record Repayment Modal */}
      <Modal
        isOpen={!!selectedDebtor}
        onClose={() => setSelectedDebtor(null)}
        title={selectedDebtor ? `Record Debt Payment: ${selectedDebtor.name}` : 'Record Payment'}
        description={`Current Outstanding Debt: ${formatCurrency(
          selectedDebtor?.total_credit || 0
        )}`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-slate-700">Payment Amount (₦)</label>
              <button
                type="button"
                onClick={() => setPaymentAmount(selectedDebtor?.total_credit.toString() || '0')}
                className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Pay Full Debt
              </button>
            </div>
            <Input
              type="number"
              min="0.01"
              step="any"
              max={selectedDebtor?.total_credit}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full bg-white border border-slate-300 rounded-lg text-sm text-slate-900 px-3.5 py-2 outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="pos">POS Terminal</option>
              <option value="other">Other</option>
            </select>
          </div>

          <Input
            label="Payment Notes (Optional)"
            placeholder="e.g. Part payment deposited via OPay"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedDebtor(null)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Confirm Repayment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
