'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signUp, sendPasswordResetEmail } from '@/app/actions/auth';
import { ArrowRight, CheckCircle2, Mail, Lock, User, Phone } from 'lucide-react';
import Logo from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'forgot' ? 'forgot' : tabParam === 'signup' ? 'signup' : 'signin';
  const urlMessage = searchParams.get('message');
  const urlError = searchParams.get('error');

  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(urlMessage || null);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await signIn(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirm = formData.get('confirmPassword') as string;

    if (password !== confirm) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const termsConsent = formData.get('termsConsent');
    if (!termsConsent) {
      setError('Please review and accept the Terms of Service and Privacy Policy.');
      setLoading(false);
      return;
    }

    try {
      const res = await signUp(formData);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push('/onboarding');
        router.refresh();
      }
    } catch (err: any) {
      if (err?.message?.includes('NEXT_REDIRECT')) {
        return;
      }
      setError(err?.message || 'Failed to sign up.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await sendPasswordResetEmail(formData);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setSuccessMessage('Password reset link sent to your email.');
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xl p-4 sm:p-8 space-y-6">
      {/* Mobile Logo */}
      <div className="flex flex-col items-center text-center lg:hidden">
        <Logo iconSize="w-10 h-10" showText={true} />
      </div>

      {/* Tabs */}
      {tab !== 'forgot' && (
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              tab === 'signin'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              tab === 'signup'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Sign In Form */}
      {tab === 'signin' && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Welcome Back</h1>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access your business workspace.
            </p>
          </div>

          <Input
            label="Email Address"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@business.com"
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">
                Password <span className="text-red-500">*</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <Input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to TraderERP
            </Button>
          </div>
        </form>
      )}

      {/* Create Account Form */}
      {tab === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create an Account</h1>
            <p className="text-xs text-slate-500 mt-1">
              Start managing your stock, sales, and credit in minutes.
            </p>
          </div>

          <Input
            label="Full Name"
            name="name"
            type="text"
            required
            placeholder="Muhammad Bello"
            leftIcon={<User className="w-4 h-4" />}
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@business.com"
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            required
            placeholder="e.g. 08012345678"
            leftIcon={<Phone className="w-4 h-4" />}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters, 1 capital & 1 number"
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Re-enter password"
            leftIcon={<Lock className="w-4 h-4" />}
          />

          {/* Privacy Notice & Consent Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Privacy Notice: </span>
              We collect your name, contact, and business details solely to set up your workspace and secure your operations. We do not sell your personal or business data. Read our{' '}
              <Link href="/privacy" target="_blank" className="text-blue-600 underline font-medium">
                Privacy Policy
              </Link>.
            </div>

            {/* Mandatory Terms & Privacy Checkbox (Unselected by default) */}
            <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                name="termsConsent"
                required
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
              />
              <span>
                I have read and agree to the{' '}
                <Link href="/terms" target="_blank" className="font-semibold text-slate-900 underline hover:text-blue-600">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="font-semibold text-slate-900 underline hover:text-blue-600">
                  Privacy Policy
                </Link>
                . <span className="text-red-500">*</span>
              </span>
            </label>

            {/* Separate Optional Marketing Consent (Unselected by default, not required) */}
            <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                name="marketingConsent"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
              />
              <span>
                Send me practical retail trade tips, inventory guides, and product updates via email (optional).
              </span>
            </label>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Account & Continue
            </Button>
          </div>
        </form>
      )}

      {/* Forgot Password View */}
      {tab === 'forgot' && (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Reset Password</h1>
            <p className="text-xs text-slate-500 mt-1">
              Enter the email associated with your account and we will send you a reset link.
            </p>
          </div>

          <Input
            label="Email Address"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@business.com"
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={loading}
            >
              Send Reset Link
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => {
                setTab('signin');
                setError(null);
                setSuccessMessage(null);
              }}
            >
              Back to Sign In
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
