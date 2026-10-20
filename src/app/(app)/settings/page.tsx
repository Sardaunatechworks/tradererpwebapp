'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Building2,
  Lock,
  ShieldCheck,
  Save,
  CheckCircle2,
  Store,
  Phone,
  Mail,
  MapPin,
  Shield,
  Download,
  Trash2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  MessageSquareHeart,
  FileText,
  BadgeCheck,
  Clock,
  XCircle,
} from 'lucide-react';
import { getBusinessSettings, updateBusinessProfile } from '@/app/actions/settings';
import { changeUserPassword } from '@/app/actions/staff';
import { getUserProfile, updateUserProfile, UserFullProfile } from '@/app/actions/profile';
import {
  getUserConsents,
  updateConsentPreference,
  exportPersonalUserData,
  getAccountDeletionRequest,
  submitAccountDeletionRequest,
  cancelAccountDeletionRequest,
  saveTourCompletion,
} from '@/app/actions/privacy';
import { Business, UserConsent, AccountDeletionRequest } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { useUIStore } from '@/stores/uiStore';

type SettingsTab = 'profile' | 'business' | 'security' | 'privacy';

function SettingsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as SettingsTab | null;
  const initialTab: SettingsTab =
    tabParam && ['profile', 'business', 'security', 'privacy'].includes(tabParam)
      ? tabParam
      : 'profile';

  const { setFeedbackModalOpen } = useUIStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [loading, setLoading] = useState(true);

  // Profile State
  const [fullProfile, setFullProfile] = useState<UserFullProfile | null>(null);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Business State
  const [business, setBusiness] = useState<Business | null>(null);
  const [submittingBiz, setSubmittingBiz] = useState(false);
  const [bizSuccess, setBizSuccess] = useState<string | null>(null);
  const [bizError, setBizError] = useState<string | null>(null);

  // Password State
  const [submittingPass, setSubmittingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  // Privacy & Consent State
  const [consents, setConsents] = useState<UserConsent[]>([]);
  const [exportingData, setExportingData] = useState(false);
  const [updatingConsent, setUpdatingConsent] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);
  const [tourResetMessage, setTourResetMessage] = useState<string | null>(null);

  // Deletion Request State
  const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequest | null>(null);
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [profRes, bizRes, consRes, delRes] = await Promise.all([
          getUserProfile(),
          getBusinessSettings(),
          getUserConsents(),
          getAccountDeletionRequest(),
        ]);

        if (profRes.data) setFullProfile(profRes.data);
        if (bizRes.data) setBusiness(bizRes.data);
        if (consRes.data) setConsents(consRes.data);
        if (delRes.data) setDeletionRequest(delRes.data);
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update Personal Profile
  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    const formData = new FormData(e.currentTarget);
    const res = await updateUserProfile(formData);
    setSubmittingProfile(false);

    if (res.error) {
      setProfileError(res.error);
    } else {
      setProfileSuccess('Personal profile details saved successfully.');
      const profRes = await getUserProfile();
      if (profRes.data) setFullProfile(profRes.data);
    }
  };

  // Update Business Settings
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

  // Update Password
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

  // Export Personal Data
  const handleExportData = async () => {
    setExportingData(true);
    setPrivacyMessage(null);
    try {
      const res = await exportPersonalUserData();
      if (res.error || !res.data) {
        setPrivacyMessage(res.error || 'Failed to export data.');
      } else {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tradererp_account_export_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setPrivacyMessage('Personal data archive downloaded successfully.');
      }
    } catch {
      setPrivacyMessage('An unexpected error occurred during data export.');
    } finally {
      setExportingData(false);
    }
  };

  // Toggle Marketing Consent
  const handleToggleMarketing = async (currentlyGranted: boolean) => {
    setUpdatingConsent(true);
    setPrivacyMessage(null);
    const res = await updateConsentPreference('marketing_emails', !currentlyGranted);
    setUpdatingConsent(false);
    if (res.error) {
      setPrivacyMessage(res.error);
    } else {
      const consRes = await getUserConsents();
      if (consRes.data) setConsents(consRes.data);
      setPrivacyMessage(
        !currentlyGranted
          ? 'Marketing preferences updated: Subscribed to email guides.'
          : 'Marketing preferences updated: Unsubscribed from email guides.'
      );
    }
  };

  // Restart Guided Tour
  const handleRestartTour = async () => {
    await saveTourCompletion(false);
    localStorage.removeItem('tradererp_tour_completed');
    setTourResetMessage('Onboarding tour has been reset. It will appear next time you visit the Dashboard.');
  };

  // Submit Deletion Request
  const handleSubmitDeletion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingDeletion(true);
    setDeletionError(null);

    const formData = new FormData(e.currentTarget);
    const res = await submitAccountDeletionRequest(formData);
    setSubmittingDeletion(false);

    if (res.error) {
      setDeletionError(res.error);
    } else {
      setDeletionModalOpen(false);
      const delRes = await getAccountDeletionRequest();
      if (delRes.data) setDeletionRequest(delRes.data);
      setPrivacyMessage('Account deletion request submitted. Our security team will review it.');
    }
  };

  // Cancel Deletion Request
  const handleCancelDeletion = async () => {
    if (!deletionRequest) return;
    const res = await cancelAccountDeletionRequest(deletionRequest.id);
    if (res.success) {
      setDeletionRequest(null);
      setPrivacyMessage('Your pending deletion request has been cancelled.');
    }
  };

  const marketingConsent = consents.find((c) => c.consent_type === 'marketing_emails');
  const isMarketingOptedIn = !!marketingConsent?.granted;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Settings & Account"
        description="Manage your personal profile, business workspace details, account security, and privacy data controls."
      />

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>Personal Profile</span>
        </button>

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
          <span>Business Workspace</span>
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

        <button
          type="button"
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'privacy'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Privacy & Data</span>
        </button>
      </div>

      {loading ? (
        <LoadingState message="Loading preferences..." />
      ) : (
        <>
          {/* ──────────────────────────────────────────────────────────────────────────
             TAB 1: PERSONAL PROFILE
          ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <Card padding="lg" className="space-y-6">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {profileError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                    <p className="text-xs text-slate-500">
                      Your identity and contact details inside TraderERP.
                    </p>
                  </div>
                  <Badge variant="neutral" size="sm">
                    Role: {fullProfile?.role ? fullProfile.role.toUpperCase() : 'STAFF'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    name="name"
                    defaultValue={fullProfile?.profile?.name || ''}
                    required
                    placeholder="Muhammad Bello"
                    leftIcon={<User className="w-4 h-4" />}
                  />

                  <Input
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    defaultValue={fullProfile?.profile?.phone || ''}
                    placeholder="08012345678"
                    leftIcon={<Phone className="w-4 h-4" />}
                    helperText="For workspace notifications"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address (Sign-In)
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 select-all">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{fullProfile?.profile?.email || 'N/A'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Email changes require security verification.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assigned Business Workspace
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                      <Store className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold truncate">
                        {fullProfile?.business?.name || 'Primary Store'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end border-t border-slate-100">
                  <Button
                    type="submit"
                    isLoading={submittingProfile}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save Profile Changes
                  </Button>
                </div>
              </form>

              {/* Onboarding Tour Restart Section */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">First-Time Guided Tour</h3>
                  <p className="text-xs text-slate-500">
                    Want to see the product tour again? Reset your tour preference here.
                  </p>
                  {tourResetMessage && (
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      {tourResetMessage}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRestartTour}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="shrink-0"
                >
                  Restart Tour
                </Button>
              </div>
            </Card>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
             TAB 2: BUSINESS WORKSPACE
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
             TAB 3: SECURITY & PASSWORD
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

          {/* ──────────────────────────────────────────────────────────────────────────
             TAB 4: PRIVACY & DATA MANAGEMENT
          ────────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              {privacyMessage && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-800 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{privacyMessage}</span>
                </div>
              )}

              {/* Active Deletion Request Banner */}
              {deletionRequest && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs sm:text-sm">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Account Deletion Request in Progress</span>
                    </div>
                    <Badge variant="warning" size="sm">
                      Status: {deletionRequest.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    You submitted a request to delete your personal account on{' '}
                    {new Date(deletionRequest.created_at).toLocaleDateString()}. While this is under review, your business data remains preserved.
                  </p>
                  {deletionRequest.status === 'pending' && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelDeletion}
                        className="bg-white text-slate-700 border-amber-300 hover:bg-amber-100/50"
                        leftIcon={<XCircle className="w-3.5 h-3.5 text-amber-600" />}
                      >
                        Cancel Deletion Request
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Data Portability / Export Card */}
              <Card padding="lg" className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Download className="w-4 h-4 text-blue-600" />
                      <span>Request a Copy of Personal Data</span>
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                      Download a structured JSON archive containing your registered personal profile, account roles, and recorded consent timestamps.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportData}
                    isLoading={exportingData}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    className="shrink-0"
                  >
                    Export My Data
                  </Button>
                </div>
              </Card>

              {/* Consent Preferences Card */}
              <Card padding="lg" className="space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-blue-600" />
                    <span>Consent Preferences &amp; Communications</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage how TraderERP communicates with you and what processing you have authorized.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {/* Terms & Privacy Notice Consent (Core) */}
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-800">Terms of Service &amp; Privacy Policy</p>
                      <p className="text-slate-500 mt-0.5">
                        Required for operating your account and business workspace.
                      </p>
                    </div>
                    <Badge variant="success" size="sm">
                      ACTIVE (v1.0)
                    </Badge>
                  </div>

                  {/* Optional Marketing Toggle */}
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-800">Product Updates &amp; Trade Guides</p>
                      <p className="text-slate-500 mt-0.5">
                        Optional email tips on retail operations and stock management.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isMarketingOptedIn ? 'secondary' : 'outline'}
                      onClick={() => handleToggleMarketing(isMarketingOptedIn)}
                      isLoading={updatingConsent}
                    >
                      {isMarketingOptedIn ? 'Opted In (Click to Opt Out)' : 'Opted Out (Click to Opt In)'}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Privacy Transparency Notices */}
              <Card padding="lg" className="space-y-3 bg-slate-50 border-slate-200/80">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Transparency &amp; Legal Policies
                </h2>
                <div className="flex flex-wrap gap-4 text-xs font-medium">
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="flex items-center gap-1.5 text-blue-600 hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Read Privacy Policy</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link
                    href="/terms"
                    target="_blank"
                    className="flex items-center gap-1.5 text-blue-600 hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Read Terms of Service</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </Card>

              {/* Account Deletion Request Card */}
              <Card padding="lg" className="space-y-4 border-red-200 bg-red-50/20">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-red-900 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Request Account Closure or Data Deletion</span>
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Submit an auditable request to close your account and remove your personal information. In accordance with commercial bookkeeping and tax standards in Nigeria, sales, receipts, and financial ledgers recorded for your business remain preserved within the business entity.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setDeletionError(null);
                      setDeletionModalOpen(true);
                    }}
                    disabled={!!deletionRequest && deletionRequest.status === 'pending'}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    {deletionRequest ? 'Deletion Request Pending' : 'Request Account Deletion'}
                  </Button>
                </div>
              </Card>
            </div>
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

      {/* Account Deletion Confirmation Modal */}
      <Modal
        isOpen={deletionModalOpen}
        onClose={() => setDeletionModalOpen(false)}
        title="Confirm Account Deletion Request"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitDeletion} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Please review the consequences carefully:</span>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-amber-800">
              <li>You will lose sign-in access to this account once processed.</li>
              <li>Your personal profile data will be permanently anonymized or removed.</li>
              <li>
                <strong>Shared Business Records:</strong> Sales, receipts, and expense histories recorded for your business remain intact in the business workspace to comply with accounting standards.
              </li>
            </ul>
          </div>

          {deletionError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
              {deletionError}
            </div>
          )}

          <Input
            label="Current Account Password (Re-authentication)"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            helperText="Confirm your password to authorize this sensitive request."
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Input
            label="Reason for deletion (optional)"
            name="reason"
            placeholder="e.g. Closing store, switching to another system..."
          />

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletionModalOpen(false)}
              disabled={submittingDeletion}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={submittingDeletion}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Confirm Deletion Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading settings..." />}>
      <SettingsContent />
    </Suspense>
  );
}
