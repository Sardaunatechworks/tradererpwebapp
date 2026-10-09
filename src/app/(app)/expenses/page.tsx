'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Receipt,
  Trash2,
  Calendar,
  Tag,
  CreditCard,
  PlusCircle,
} from 'lucide-react';
import { Expense, ExpenseCategory, PaymentMethod } from '@/types';
import {
  getExpenses,
  getExpenseCategories,
  createExpense,
  createExpenseCategory,
  deleteExpense,
} from '@/app/actions/expenses';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Add Expense Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Category quick toggle
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const fetchExpensesData = async () => {
    setLoading(true);
    const [expRes, catRes] = await Promise.all([
      getExpenses({
        search,
        categoryId: selectedCategory,
      }),
      getExpenseCategories(),
    ]);

    if (expRes.data) setExpenses(expRes.data);
    if (catRes.data) setCategories(catRes.data);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExpensesData();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  const handleCreateExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createExpense(formData);
    setSubmitting(false);

    if (res.error) {
      setFormError(res.error);
    } else {
      setIsAddModalOpen(false);
      fetchExpensesData();
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    const formData = new FormData();
    formData.append('name', newCatName.trim());
    const res = await createExpenseCategory(formData);
    if (res.data) {
      setCategories((prev) => [...prev, res.data!]);
      setNewCatName('');
      setShowNewCatInput(false);
    }
  };

  const handleDeleteExpense = async (id: string, desc: string) => {
    if (confirm(`Are you sure you want to delete expense "${desc}"?`)) {
      const res = await deleteExpense(id);
      if (res.error) alert(res.error);
      else fetchExpensesData();
    }
  };

  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operating Expenses"
        description="Track store rent, fuel, logistics, staff wages, and daily operational overhead."
        action={
          <Button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Record Expense
          </Button>
        }
      />

      {/* Filter and Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md" className="sm:col-span-1 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Filtered Expenses</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-slate-400 mt-1">{expenses.length} recorded entries</p>
        </Card>

        <Card padding="sm" className="sm:col-span-2 flex flex-col justify-center">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1">
              <Input
                placeholder="Search expense description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </Card>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <LoadingState message="Loading expense records..." />
      ) : expenses.length === 0 ? (
        <EmptyState
          title={search ? 'No matching expenses' : 'No expenses recorded'}
          description={
            search
              ? 'Try clearing the search query or category filter.'
              : 'Record business overheads like transportation, electricity, or supplies to track true business profit.'
          }
          actionLabel={search ? undefined : 'Record First Expense'}
          actionIcon={<Plus className="w-4 h-4" />}
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Date</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Payment Method</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Date */}
                    <td className="py-3.5 px-4 sm:px-6 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(exp.expense_date)}
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{exp.description}</div>
                      {exp.notes && (
                        <p className="text-xs text-slate-400 font-normal mt-0.5">{exp.notes}</p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {exp.category?.name || 'General Expense'}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="neutral" size="sm">
                        {exp.payment_method.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(exp.amount)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp.id, exp.description)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-100">
            {expenses.map((exp) => (
              <div key={exp.id} className="p-4 space-y-2.5 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">
                      {exp.description}
                    </h4>
                    {exp.notes && (
                      <p className="text-xs text-slate-400 font-normal mt-0.5">{exp.notes}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700">
                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                        {exp.category?.name || 'General'}
                      </span>
                      <span>•</span>
                      <span>{formatDate(exp.expense_date)}</span>
                    </div>
                  </div>

                  <Badge variant="neutral" size="sm">
                    {exp.payment_method.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-base font-extrabold text-slate-900">
                    {formatCurrency(exp.amount)}
                  </span>

                  <button
                    onClick={() => handleDeleteExpense(exp.id, exp.description)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
                    title="Delete Expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Record Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Business Expense"
        description="Log an operational expenditure or vendor payment"
        maxWidth="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Description / Purpose"
            name="description"
            placeholder="e.g. Fuel for generator, Market security levy"
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <button
                type="button"
                onClick={() => setShowNewCatInput(!showNewCatInput)}
                className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
              >
                {showNewCatInput ? 'Cancel' : '+ New Category'}
              </button>
            </div>

            {showNewCatInput ? (
              <div className="flex gap-2">
                <Input
                  placeholder="New category name"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <Button type="button" onClick={handleCreateCategory}>
                  Add
                </Button>
              </div>
            ) : (
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
            )}
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

          <Input
            label="Additional Notes (Optional)"
            name="notes"
            placeholder="e.g. Paid to Mallam Danladi"
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
