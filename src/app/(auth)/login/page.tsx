'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn, signUp } from '@/app/actions/auth';
import { Loader2, ArrowRight, ShieldAlert, Check } from 'lucide-react';
import PasswordInput from '@/components/ui/PasswordInput';

/* ──────────────────────────────────────────────────────────────────────────
   TAB: SIGN IN
────────────────────────────────────────────────────────────────────────── */
function SignInTab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await signIn(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-xs text-red-400 font-medium">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
            Email Address
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@company.com"
            className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
            Password
          </label>
          <PasswordInput name="password" required autoComplete="current-password" />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-900/10 disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Sign In <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB: SIGN UP
────────────────────────────────────────────────────────────────────────── */
function SignUpTab() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    const res = await signUp(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-6 text-center space-y-4 animate-in fade-in">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <Check className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-300">Account Created!</p>
          <p className="text-xs text-emerald-500 mt-1 leading-relaxed">
            Check your email inbox to verify your address, then sign in to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-xs text-red-400 font-medium">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
            Full Name
          </label>
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="John Doe"
            className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
            Email Address
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@company.com"
            className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
            Password
          </label>
          <PasswordInput name="password" required autoComplete="new-password" />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-900/10 disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Create Account <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MAIN AUTH PAGE (with tab toggle + blocked account modal)
────────────────────────────────────────────────────────────────────────── */
type Tab = 'signin' | 'signup';

function AuthContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('signin');
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (
      errorParam &&
      (errorParam.toLowerCase().includes('suspended') ||
        errorParam.toLowerCase().includes('restricted') ||
        errorParam.toLowerCase().includes('deleted'))
    ) {
      setModalMessage(errorParam);
    }
    // If coming from /signup link
    const tabParam = searchParams.get('tab');
    if (tabParam === 'signup') setTab('signup');
  }, [searchParams]);

  const closeModal = () => {
    setModalMessage(null);
    window.history.replaceState(null, '', '/login');
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-600/20 shrink-0">
              T
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight leading-none">TraderERP</h1>
              <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">Workspace Access</span>
            </div>
          </div>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            {tab === 'signin'
              ? 'Welcome back. Sign in to your trading workspace.'
              : 'Create a new account to launch your trading workspace.'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('signin')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              tab === 'signin'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              tab === 'signup'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Panel */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {tab === 'signin' ? <SignInTab /> : <SignUpTab />}
        </div>

        {/* Help text */}
        <p className="text-center text-[11px] text-slate-600 font-medium">
          {tab === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => setTab('signup')}
                className="text-blue-500 hover:text-blue-400 font-bold transition-colors cursor-pointer"
              >
                Create one free
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setTab('signin')}
                className="text-blue-500 hover:text-blue-400 font-bold transition-colors cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>

      {/* Blocked Account Modal */}
      {modalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div className="text-center space-y-2">
              <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-white leading-none">Access Denied</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Account Restriction Alert
              </p>
            </div>
            <div className="space-y-4 text-center">
              <p className="text-slate-300 text-xs font-semibold leading-relaxed">{modalMessage}</p>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] text-slate-400 font-medium">
                Please contact your systems administrator or help desk to resolve this hold.
              </div>
            </div>
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={closeModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-6 py-2.5 rounded-lg transition-all cursor-pointer"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
