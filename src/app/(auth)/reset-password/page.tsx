'use client';

import React, { useState, useEffect } from 'react';
import { updatePasswordWithoutOld } from '@/app/actions/auth';
import { Loader2, Check, X, ShieldAlert } from 'lucide-react';
import PasswordInput from '@/components/ui/PasswordInput';

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
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
      setError('Please satisfy all password validation requirements.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const res = await updatePasswordWithoutOld(formData);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setSuccess('Password updated successfully.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-8 animate-in fade-in zoom-in duration-300">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 mx-auto shadow-lg">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white mt-4">Reset Your Password</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Please configure a new personal password to regain access to your workspace.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-xs text-red-400 font-medium leading-relaxed">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-4 text-xs text-emerald-400 font-medium leading-relaxed">
            {success} Redirecting to login...
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">New Password</label>
            <PasswordInput
              name="newPassword"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Confirm New Password</label>
            <PasswordInput
              name="confirmNewPassword"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* Complexity Requirement indicators */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2 text-[11px] font-semibold text-slate-400">
          <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Security Requirements</span>

          {[
            { rule: rules.length, label: 'At least 8 characters long' },
            { rule: rules.uppercase, label: 'At least one uppercase character' },
            { rule: rules.number, label: 'At least one numeric digit' },
            { rule: rules.match, label: 'Confirm Password matches New Password' },
          ].map(({ rule, label }) => (
            <div key={label} className="flex items-center gap-2">
              {rule ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
              <span className={rule ? 'text-slate-300' : ''}>{label}</span>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !isValid}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </div>
  );
}
