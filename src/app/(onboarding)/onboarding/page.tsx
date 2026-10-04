'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { onboardBusiness } from '@/app/actions/onboarding';
import { createClient } from '@/lib/supabase/client';
import { Building2, ArrowRight, Loader2, Store, Phone, MapPin } from 'lucide-react';
import Logo from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Retail Store');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('NGN');

  const businessTypes = [
    { value: 'Retail Store', label: 'Retail Store (Provisions, Boutique, Mini-mart)' },
    { value: 'Wholesale / Distribution', label: 'Wholesale / Distribution' },
    { value: 'Supermarket', label: 'Supermarket' },
    { value: 'Pharmacy / Chemist', label: 'Pharmacy / Chemist' },
    { value: 'Electronics / Phone Accessories', label: 'Electronics / Phone Accessories' },
    { value: 'Building Materials / Hardware', label: 'Building Materials / Hardware' },
    { value: 'Food / Agro Commodities', label: 'Food / Agro Commodities' },
    { value: 'General Merchant', label: 'General Merchant / Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('Please provide your business name.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('businessName', businessName.trim());
    formData.append('businessType', businessType);
    formData.append('phone', phone.trim());
    formData.append('address', address.trim());
    formData.append('currency', currency);

    const res = await onboardBusiness(formData);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      // Refresh Supabase auth session so new app_metadata is picked up
      await supabase.auth.refreshSession();
      router.refresh();
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white border border-slate-200/80 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
        
        {/* Brand & Heading */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo iconSize="w-10 h-10" showText={true} />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
            Set up your Business
          </h1>
          <p className="text-sm text-slate-500 max-w-sm">
            Enter your business details to configure your sales, stock, and expense workspace.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Business Name"
            placeholder="e.g. Al-Barakah Stores"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            leftIcon={<Store className="w-4 h-4" />}
          />

          <Select
            label="Business Category / Type"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            options={businessTypes}
          />

          <Input
            label="Business Phone Number (Optional)"
            placeholder="e.g. 08012345678"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
            helperText="Used on printed sales receipts"
          />

          <Input
            label="Shop / Office Address (Optional)"
            placeholder="e.g. Shop 14, Central Market, Kano"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            leftIcon={<MapPin className="w-4 h-4" />}
          />

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Setup & Open Workspace
            </Button>
          </div>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Default currency is set to Nigerian Naira (₦). You can adjust preferences in Settings anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
