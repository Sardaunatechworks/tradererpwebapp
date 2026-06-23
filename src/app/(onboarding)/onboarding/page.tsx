'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { onboardBusiness } from '@/app/actions/onboarding';
import { createClient } from '@/lib/supabase/client';
import { Building2, MapPin, Play, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import Logo from '@/components/layout/Logo';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [branchName, setBranchName] = useState('Main Branch');
  const [branchAddress, setBranchAddress] = useState('');

  const handleNext = () => {
    if (step === 1 && !businessName.trim()) {
      setError('Business name is required.');
      return;
    }
    if (step === 2 && !branchName.trim()) {
      setError('Branch name is required.');
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('businessName', businessName);
    formData.append('currency', currency);
    formData.append('branchName', branchName);
    formData.append('branchAddress', branchAddress);

    const res = await onboardBusiness(formData);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      // Force session refresh on client side
      const { data } = await supabase.auth.refreshSession();
      if (data?.session) {
        router.refresh();
        router.push('/dashboard');
      } else {
        // Fallback redirect
        window.location.href = '/dashboard';
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900 font-sans text-slate-100 items-center justify-center p-6">
      <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-8 animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <Logo iconSize="w-12 h-12" textColorMode="dark" subtitle="Workspace Setup" gap="gap-4" />

        {/* Step Progress Bar */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((num) => (
            <div 
              key={num} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-350 ${
                step >= num ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Company Details</h2>
                <p className="text-xs text-slate-400">Configure your business name and reporting currency.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Business Name</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Trading Ltd"
                    className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-medium cursor-pointer"
                  >
                    <option value="NGN">Nigerian Naira (₦)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="GHS">Ghanaian Cedi (GH₵)</option>
                    <option value="ZAR">South African Rand (R)</option>
                    <option value="KES">Kenyan Shilling (KSh)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Default Branch</h2>
                <p className="text-xs text-slate-400">Every TraderERP account begins with an active branch to host inventory.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Branch Name</label>
                  <input
                    type="text"
                    required
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Lagos Warehouse"
                    className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Branch Address</label>
                  <input
                    type="text"
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    placeholder="e.g. 10 Marina Street, Lagos"
                    className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Confirm Configuration</h2>
                <p className="text-xs text-slate-400">Review your settings before initializing the workspace.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs font-medium">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block leading-none">Business Profile</span>
                    <span className="text-white text-sm font-semibold block mt-1">{businessName} ({currency})</span>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block leading-none">Primary Outlet</span>
                    <span className="text-white text-sm font-semibold block mt-1">{branchName}</span>
                    {branchAddress && <span className="text-slate-400 block mt-0.5">{branchAddress}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex justify-between gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex items-center gap-2 border border-slate-800 bg-slate-950 text-slate-300 font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-lg hover:bg-slate-900 transition-all disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-900/10 cursor-pointer"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-900/10 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Provisioning...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" /> Launch Workspace
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
