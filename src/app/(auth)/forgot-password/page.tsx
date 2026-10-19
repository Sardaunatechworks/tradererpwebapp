'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { sendPasswordResetEmail } from '@/app/actions/auth';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, KeyRound, RefreshCw, AlertCircle } from 'lucide-react';
import Logo from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(urlError || null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // If a user visits forgot-password with a recovery hash or token, forward immediately to reset-password
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
        window.location.replace(`/reset-password${hash}`);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      const formData = new FormData();
      formData.append('email', email.trim().toLowerCase());

      const res = await sendPasswordResetEmail(formData);

      if (res?.error) {
        setError(res.error);
      } else {
        setIsSubmitted(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resending) return;

    setResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      const formData = new FormData();
      formData.append('email', email.trim().toLowerCase());

      const res = await sendPasswordResetEmail(formData);

      if (res?.error) {
        setError(res.error);
      } else {
        setResendSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend reset email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6">
      {/* Mobile Logo */}
      <div className="flex flex-col items-center text-center lg:hidden">
        <Logo iconSize="w-10 h-10" showText={true} />
      </div>

      {!isSubmitted ? (
        <>
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 mx-auto shadow-sm">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-3">
              Forgot Your Password?
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Enter the email associated with your TraderERP account and we will send you a secure link to reset your password.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="you@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="pt-2 flex flex-col gap-2.5">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send Reset Link
              </Button>

              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        </>
      ) : (
        /* Success State */
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-3">
              Check Your Email
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              We sent a password reset link to:
            </p>
            <p className="text-sm font-semibold text-slate-800 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200/60 inline-block max-w-full break-all">
              {email}
            </p>
          </div>

          {/* Helpful Tips Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-600 space-y-2 leading-relaxed">
            <div className="font-semibold text-slate-800">Next Steps:</div>
            <ul className="list-disc pl-4 space-y-1 text-slate-500">
              <li>Click the reset link in the email to configure your new password.</li>
              <li>The link is time-sensitive for your security.</li>
              <li>If you don&apos;t see the email within 2 minutes, please check your spam or junk folder.</li>
            </ul>
          </div>

          {/* Resend status */}
          {resendSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>A fresh reset link has been dispatched to your email.</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5 pt-1">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleResend}
              isLoading={resending}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Resend Reset Email
            </Button>

            <button
              type="button"
              onClick={() => {
                setIsSubmitted(false);
                setError(null);
                setResendSuccess(false);
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 py-1.5 font-medium transition-colors cursor-pointer"
            >
              Use a different email address
            </button>

            <div className="pt-2 border-t border-slate-100">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Sign In
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
