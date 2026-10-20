'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { createCustomer } from '@/app/actions/customers';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/stores/toastStore';

export default function NewCustomerPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createCustomer(formData);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      toast.error(res.error, 'Customer Registration Failed');
    } else {
      toast.success('Customer registered successfully!');
      router.push('/customers');
      router.refresh();
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/customers"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Customer</h1>
          <p className="text-xs text-slate-500">Register a new client or debtor profile</p>
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
            label="Customer Full Name"
            name="name"
            placeholder="e.g. Alhaji Aminu Dantata, Mama Chinedu Stores"
            required
            leftIcon={<User className="w-4 h-4" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="e.g. 08012345678"
              leftIcon={<Phone className="w-4 h-4" />}
            />
            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="e.g. customer@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
            />
          </div>

          <Input
            label="Delivery / Business Address"
            name="address"
            placeholder="e.g. Shop 14, Main Market, Kano"
            leftIcon={<MapPin className="w-4 h-4" />}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Customer Notes / Credit Policy (Optional)
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <textarea
                name="notes"
                rows={3}
                placeholder="e.g. Allowed 14 days credit up to ₦100,000; preferred payment method: transfer"
                className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
              />
            </div>
          </div>

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
              Save Customer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
