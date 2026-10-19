'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime error
    console.error('App Route Error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 sm:p-12 animate-in fade-in duration-200">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-5 text-rose-600 shadow-xs">
        <AlertCircle className="w-7 h-7" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
        Something went wrong
      </h2>

      <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
        {error.message && !error.message.includes('fetch failed')
          ? error.message
          : 'An unexpected error occurred while loading this section. Your business data remains safe.'}
      </p>

      {error.digest && (
        <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded mb-6">
          Reference ID: {error.digest}
        </span>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4 text-slate-500" />
          <span>Go to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
