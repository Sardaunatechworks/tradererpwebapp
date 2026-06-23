'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { triggerSync } from '@/lib/offline/SyncEngine';

export default function ConnectionIndicator() {
  const [status, setStatus] = useState<'online' | 'offline' | 'syncing'>('online');

  useEffect(() => {
    // 1. Service Worker Registration
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));
    }

    // 2. Suppress Next.js hot-reload development overlays when network goes offline
    const handleGlobalError = (event: ErrorEvent) => {
      if (
        event.message?.includes('Connection closed') || 
        event.message?.includes('Failed to fetch') || 
        event.message?.includes('network connection')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || event.reason;
      if (
        typeof reason === 'string' && 
        (reason.includes('Connection closed') || 
         reason.includes('Failed to fetch') || 
         reason.includes('network connection'))
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    if (process.env.NODE_ENV === 'development') {
      window.addEventListener('error', handleGlobalError, true);
      window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    }

    // 3. Initial state set
    if (typeof window !== 'undefined') {
      setStatus(navigator.onLine ? 'online' : 'offline');
    }

    // 4. Status Listeners
    const handleOnline = async () => {
      setStatus('syncing');
      try {
        // Trigger auto-sync engine
        await triggerSync();
      } catch (err) {
        console.error('Sync failed:', err);
      } finally {
        setStatus('online');
      }
    };

    const handleOffline = () => {
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Run a quick sync check on load if online
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (process.env.NODE_ENV === 'development') {
        window.removeEventListener('error', handleGlobalError, true);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2 select-none text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
      {status === 'online' && (
        <span className="flex items-center gap-1.5 text-emerald-400">
          <Wifi className="w-3.5 h-3.5" />
          Online
        </span>
      )}
      {status === 'syncing' && (
        <span className="flex items-center gap-1.5 text-amber-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Syncing...
        </span>
      )}
      {status === 'offline' && (
        <span className="flex items-center gap-1.5 text-red-400">
          <WifiOff className="w-3.5 h-3.5" />
          Offline
        </span>
      )}
    </div>
  );
}
export { triggerSync };
