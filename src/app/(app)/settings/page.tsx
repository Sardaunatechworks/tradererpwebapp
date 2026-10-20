'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Lock,
  Save,
  CheckCircle2,
  Store,
  Phone,
  Mail,
  MapPin,
  Shield,
  MessageSquareHeart,
} from 'lucide-react';
import { getBusinessSettings, updateBusinessProfile } from '@/app/actions/settings';
import { changeUserPassword } from '@/app/actions/staff';
import { Business } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { useUIStore } from '@/stores/uiStore';

export default function SettingsPage() {
  const { setFeedbackModalOpen } = useUIStore();
  const [activeTab, setActiveTab] = useState<'business' | 'security'>('business');
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  // Business profile form
  const [submittingBiz, setSubmittingBiz] = useState(false);
  const [bizSuccess, setBizSuccess] = useState<string | null>(null);
  const [bizError, setBizError] = useState<string | null>(null);

  // Password form
  const [submittingPass, setSubmittingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  useEffect(() => {
    getBusinessSettings().then((res) => {
      if (res.data) setBusiness(res.data);
      setLoading(false);
    });
  }, []);

  const handleUpdateBusiness = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingBiz(true);
    setBizSuccess(null);
    setBizError(null);

    const formData = new FormData(e.currentTarget);
    const res = await updateBusinessProfile(formData);
    setSubmittingBiz(false);

    if (res.error) {
      setBizError(res.error);
    } else {
      setBizSuccess('Business profile settings saved successfully.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingPass(true);
    setPassSuccess(null);
    setPassError(null);

    const formData = new FormData(e.currentTarget);
    const res = await changeUserPassword(formData);
    setSubmittingPass(false);

    if (res.error) {
      setPassError(res.error);
    } else {
      setPassSuccess('Password updated successfully.');
      e.currentTarget.reset();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Settings & Workspace"
        description="Configure your business profile information, contact channels, and account security."
      />

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'business'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Business Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Lock className="w-4 h-4 shrink-0" />
          <span>Security & Password</span>
        </button>
      </div>

      {loading ? (
        <LoadingState message="Loading preferences..." />
      ) : (
        <>
          {/* ──────────────────────────────────────────────────────────────────────────
             BUSINESS PROFILE SETTINGS
          ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'business' && (
            <Card padding="lg">
              <form onSubmit={handleUpdateBusiness} className="space-y-4">
                {bizError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
                    {bizError}
                  </div>
                )}
                {bizSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{bizSuccess}</span>
                  </div>
                )}

                <Input
                  label="Registered Business Name"
                  name="name"
                  defaultValue={business?.name || ''}
                  required
                  leftIcon={<Store className="w-4 h-4" />}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Business Type / Industry"
                    name="businessType"
                    defaultValue={business?.business_type || 'General Merchant'}
                    placeholder="e.g. Retail Store"
                  />
                  <Input
                    label="Default Currency Code"
                    name="currency"
                    defaultValue={business?.currency || 'NGN'}
                    required
                    helperText="Default transaction currency (₦)"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    defaultValue={business?.phone || ''}
                    placeholder="08012345678"
                    leftIcon={<Phone className="w-4 h-4" />}
                    helperText="Printed on sales receipts"
                  />
                  <Input
                    label="Official Email"
                    name="email"
                    type="email"
                    defaultValue={business?.email || ''}
                    placeholder="contact@business.com"
                    leftIcon={<Mail className="w-4 h-4" />}
                  />
                </div>

                <Input
                  label="Shop / Office Physical Address"
                  name="address"
                  defaultValue={business?.address || ''}
                  placeholder="e.g. Shop 42, Central Market, Kano"
                  leftIcon={<MapPin className="w-4 h-4" />}
                  helperText="Printed at the top of customer sales receipts"
                />

                <div className="pt-4 flex justify-end border-t border-slate-100">
                  <Button
                    type="submit"
                    isLoading={submittingBiz}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save Business Profile
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
             SECURITY & PASSWORD SETTINGS
          ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <Card padding="lg">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {passError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
                    {passError}
                  </div>
                )}
                {passSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{passSuccess}</span>
                  </div>
                )}

                <Input
                  label="New Password"
                  name="newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                />

                <Input
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                />

                <div className="pt-4 flex justify-end border-t border-slate-100">
                  <Button
                    type="submit"
                    isLoading={submittingPass}
                    leftIcon={<Shield className="w-4 h-4" />}
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Customer Centered Feedback Card */}
          <Card className="p-6 bg-gradient-to-r from-blue-50/60 to-slate-50 border-blue-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageSquareHeart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">How is TraderERP working for you?</h3>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-md leading-relaxed">
                    We build TraderERP around your everyday trading needs. Share your ratings, suggestions, or ideas directly with our product team.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFeedbackModalOpen(true)}
                className="bg-white hover:bg-slate-50 text-blue-700 border-blue-200 shrink-0"
                leftIcon={<MessageSquareHeart className="w-4 h-4 text-blue-600" />}
              >
                Give Feedback
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
