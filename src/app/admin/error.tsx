'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, RefreshCw, LayoutDashboard } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin Console Error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-center p-6 text-slate-100">
      <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center mb-5 text-rose-400">
        <ShieldAlert className="w-7 h-7" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 text-white">
        Platform Console Error
      </h2>

      <p className="text-sm text-slate-400 max-w-md mb-6">
        {error.message || 'An error occurred while loading platform administration data.'}
      </p>

      {error.digest && (
        <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded mb-6">
          Digest: {error.digest}
        </span>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Platform Load</span>
        </button>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Exit to App</span>
        </Link>
      </div>
    </div>
  );
}
