'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createExpense, getExpenseCategories } from '@/app/actions/expenses';
import { ExpenseCategory } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/stores/toastStore';

export default function NewExpensePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getExpenseCategories().then((res) => {
      if (res.data) setCategories(res.data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createExpense(formData);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      toast.error(res.error, 'Expense Failed');
    } else {
      toast.success('Expense recorded successfully!');
      router.push('/expenses');
      router.refresh();
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/expenses"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Record Expense</h1>
          <p className="text-xs text-slate-500">Log business overhead or vendor payment</p>
        </div>
      </div>

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <Input
            label="Expense Purpose / Description"
            name="description"
            placeholder="e.g. Electricity bill token, Packaging nylon bags"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Amount (₦)"
              name="amount"
              type="number"
              step="any"
              min="0.01"
              placeholder="0.00"
              required
            />
            <Input
              label="Expense Date"
              name="expenseDate"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                name="categoryId"
                className="w-full bg-white border border-slate-300 rounded-lg text-sm text-slate-900 px-3.5 py-2 outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">General Expense</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Payment Method
              </label>
              <select
                name="paymentMethod"
                className="w-full bg-white border border-slate-300 rounded-lg text-sm text-slate-900 px-3.5 py-2 outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="pos">POS Terminal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <Input
            label="Notes / Vendor Info (Optional)"
            name="notes"
            placeholder="e.g. Paid to NEPA official"
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={submitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Expense
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
