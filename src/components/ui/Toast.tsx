'use client';

import React, { useEffect } from 'react';
import { useToastStore, ToastItem } from '@/stores/toastStore';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

function ToastCard({ toast }: { toast: ToastItem }) {
  const removeToast = useToastStore((s) => s.removeToast);

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  const config = {
    success: {
      border: 'border-emerald-200 bg-emerald-50/95 text-emerald-950',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
      accent: 'bg-emerald-500',
    },
    error: {
      border: 'border-rose-200 bg-rose-50/95 text-rose-950',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
      accent: 'bg-rose-500',
    },
    warning: {
      border: 'border-amber-200 bg-amber-50/95 text-amber-950',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
      accent: 'bg-amber-500',
    },
    info: {
      border: 'border-blue-200 bg-blue-50/95 text-blue-950',
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
      accent: 'bg-blue-500',
    },
  }[toast.type];

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`relative flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-xs transition-all animate-in slide-in-from-top-2 sm:slide-in-from-bottom-2 duration-200 max-w-sm w-full ${config.border}`}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0 pr-2">
        {toast.title && (
          <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-90">
            {toast.title}
          </h4>
        )}
        <p className="text-xs sm:text-sm font-medium leading-snug break-words">
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-auto px-3 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
