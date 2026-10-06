'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { createProduct, getCategories } from '@/app/actions/inventory';
import { Category, PRODUCT_UNITS } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then((res) => {
      if (res.data) setCategories(res.data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createProduct(formData);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.push('/inventory');
      router.refresh();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/inventory"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add New Product</h1>
          <p className="text-xs text-slate-500">Register a product into your inventory catalog</p>
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
            label="Product Name"
            name="name"
            placeholder="e.g. Dangote Sugar 50kg"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU / Item Code"
              name="sku"
              placeholder="e.g. SUG-001"
              helperText="Unique identifier"
            />
            <Select
              label="Category"
              name="categoryId"
              options={[
                { value: '', label: 'General' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Unit of Measure"
              name="unit"
              defaultValue="pcs"
              options={[...PRODUCT_UNITS]}
              required
            />
            <Input
              label="Selling Price (₦)"
              name="sellingPrice"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              required
            />
            <Input
              label="Purchase / Cost Price (₦)"
              name="purchasePrice"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Initial Opening Stock"
              name="initialStock"
              type="number"
              min="0"
              defaultValue="0"
              helperText="Available quantity in store now"
            />
            <Input
              label="Low Stock Warning Alert"
              name="minimumStock"
              type="number"
              min="0"
              defaultValue="5"
              helperText="Trigger alert when stock drops to this"
            />
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
              Save Product
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
