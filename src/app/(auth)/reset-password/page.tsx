'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { updatePasswordWithoutOld } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/client';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import Logo from '@/components/layout/Logo';
import PasswordInput from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Complexity rules validation state
  const [rules, setRules] = useState({
    length: false,
    uppercase: false,
    number: false,
    match: false,
  });

  // Verify that an active session exists (from verifyOtp callback or client hash)
  useEffect(() => {
    async function verifyRecoverySession() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        // Also check if there's a recovery hash fragment in URL
        const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');

        if (session || hasHash) {
          setHasValidSession(true);
        } else {
          // Double check with getUser
          const { data: { user } } = await supabase.auth.getUser();
          setHasValidSession(!!user);
        }
      } catch (err) {
        console.warn('Session verification notice:', err);
      } finally {
        setCheckingSession(false);
      }
    }

    verifyRecoverySession();
  }, []);

  useEffect(() => {
    setRules({
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      match: newPassword === confirmPassword && newPassword.length > 0,
    });
  }, [newPassword, confirmPassword]);

  const isValid = rules.length && rules.uppercase && rules.number && rules.match;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid) {
      setError('Please satisfy all password security requirements.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData(e.currentTarget);
      const res = await updatePasswordWithoutOld(formData);

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        setSuccess('Your password has been reset successfully! Redirecting to sign in...');
        
        // Clear any client-side session state to ensure fresh login
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
        } catch {
          // ignore signout errors
        }

        setTimeout(() => {
          window.location.href = '/login?message=' + encodeURIComponent('Password reset successful. Please sign in with your new password.');
        }, 1200);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6">
      {/* Mobile Logo */}
      <div className="flex flex-col items-center text-center lg:hidden">
        <Logo iconSize="w-10 h-10" showText={true} />
      </div>

      {checkingSession ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs text-slate-500 font-medium">Verifying reset authorization...</p>
        </div>
      ) : !hasValidSession ? (
        /* Expired or Missing Session State */
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 mx-auto shadow-sm">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-3">
              Reset Link Expired or Invalid
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              This password recovery link has either expired or has already been used. Please request a fresh reset link.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <Link href="/forgot-password" className="w-full block">
              <Button size="lg" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Request New Reset Link
              </Button>
            </Link>

            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Sign In
            </Link>
          </div>
        </div>
      ) : (
        /* Active Reset Password Form */
        <>
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 mx-auto shadow-sm">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-3">
              Set New Password
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Please enter your new password below to regain access to your TraderERP workspace.
            </p>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 font-medium flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="leading-relaxed">{success}</div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <PasswordInput
                name="newPassword"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <PasswordInput
                name="confirmNewPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter new password"
              />
            </div>

            {/* Live Security Requirements Checklist */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-[11px] font-medium text-slate-500">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Password Requirements
              </span>

              {[
                { rule: rules.length, label: 'At least 8 characters long' },
                { rule: rules.uppercase, label: 'At least one uppercase letter (A-Z)' },
                { rule: rules.number, label: 'At least one numeric digit (0-9)' },
                { rule: rules.match, label: 'Passwords match' },
              ].map(({ rule, label }) => (
                <div key={label} className="flex items-center gap-2">
                  {rule ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className={rule ? 'text-slate-800 font-semibold' : 'text-slate-500'}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading || !isValid}
                isLoading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Reset Password
              </Button>

              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Sign In
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
