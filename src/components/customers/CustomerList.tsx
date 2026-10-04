'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  UserPlus,
} from 'lucide-react';
import { Customer } from '@/types';
import { getCustomers, createCustomer } from '@/app/actions/customers';
import { formatCurrency } from '@/utils/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    const res = await getCustomers(search);
    if (res.data) setCustomers(res.data);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createCustomer(formData);
    setSubmitting(false);

    if (res.error) {
      setFormError(res.error);
    } else {
      setIsAddModalOpen(false);
      fetchCustomers();
    }
  };

  const totalOutstanding = customers.reduce(
    (acc, c) => acc + (Number(c.outstanding_balance) || 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Directory"
        description="Manage customer profiles, contact numbers, and monitor individual credit balances."
        action={
          <Button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Customer
          </Button>
        }
      />

      {/* Overview Cards & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md" className="border-l-4 border-l-blue-600">
          <p className="text-xs font-semibold uppercase text-slate-500">Registered Customers</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{customers.length}</p>
          <p className="text-xs text-slate-400 mt-1">Total customer profiles</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-red-500">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Outstanding Credit</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Unpaid debt across all customers</p>
        </Card>

        <Card padding="sm" className="flex items-center">
          <div className="w-full">
            <Input
              placeholder="Search by customer name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
        </Card>
      </div>

      {/* Customer Table */}
      {loading ? (
        <LoadingState message="Loading customers..." />
      ) : customers.length === 0 ? (
        <EmptyState
          title={search ? 'No matching customers' : 'No customers saved yet'}
          description={
            search
              ? 'Try searching with another keyword.'
              : 'Add customer profiles to record credit sales, track debt repayments, and view purchase histories.'
          }
          actionLabel={search ? undefined : 'Add First Customer'}
          actionIcon={<Plus className="w-4 h-4" />}
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Customer Name</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4">Address / Location</th>
                  <th className="py-3.5 px-4 text-right">Outstanding Credit</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const hasDebt = (c.outstanding_balance || 0) > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                        {c.name}
                        {c.notes && (
                          <p className="text-xs text-slate-400 font-normal mt-0.5">{c.notes}</p>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {c.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {c.address ? (
                          <div className="flex items-center gap-1.5 max-w-xs truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{c.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Outstanding Debt */}
                      <td className="py-3.5 px-4 text-right">
                        {hasDebt ? (
                          <span className="font-bold text-red-600">
                            {formatCurrency(c.outstanding_balance)}
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">Clear (₦0)</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {hasDebt ? (
                          <Badge variant="danger" size="sm" dot>
                            OWES MONEY
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            GOOD
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Customer Profile"
        description="Register a regular customer or credit buyer"
        maxWidth="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Customer Full Name"
            name="name"
            placeholder="e.g. Alhaji Mustapha"
            required
          />

          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="e.g. 08031234567"
          />

          <Input
            label="Address / Shop Location (Optional)"
            name="address"
            placeholder="e.g. Block C4, Wuse Market, Abuja"
          />

          <Input
            label="Notes / Description (Optional)"
            name="notes"
            placeholder="e.g. Wholesale grain buyer, trusted customer"
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
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
