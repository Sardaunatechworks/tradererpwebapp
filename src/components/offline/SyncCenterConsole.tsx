'use client';

import React, { useState, useEffect } from 'react';
import { db, type SyncQueueItem, type LocalSale } from '@/lib/offline/db';
import { triggerSync, getDeviceId, getDeviceInfo } from '@/lib/offline/SyncEngine';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Trash2, 
  Clock, 
  Wifi, 
  WifiOff, 
  Loader2,
  Database
} from 'lucide-react';

export default function SyncCenterConsole() {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [pendingSales, setPendingSales] = useState<LocalSale[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncTime, setSyncTime] = useState<string>('Never');

  const deviceId = getDeviceId();
  const deviceInfo = getDeviceInfo();

  const loadData = async () => {
    try {
      const q = await db.sync_queue.toArray();
      const s = await db.pending_sales.toArray();
      setQueue(q.reverse()); // Show newest first
      setPendingSales(s);
      
      const storedTime = localStorage.getItem('tradererp_last_sync_time');
      if (storedTime) {
        setSyncTime(new Date(storedTime).toLocaleString());
      }
    } catch (err: any) {
      setError(`Failed to load IndexedDB state: ${err.message}`);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    loadData();

    // Listen to sync engine completion events
    const handleSyncComplete = () => {
      loadData();
      localStorage.setItem('tradererp_last_sync_time', new Date().toISOString());
      setSyncTime(new Date().toLocaleString());
    };

    window.addEventListener('tradererp_sync_completed', handleSyncComplete);
    
    const handleOnlineStatus = () => setIsOnline(true);
    const handleOfflineStatus = () => setIsOnline(false);

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    return () => {
      window.removeEventListener('tradererp_sync_completed', handleSyncComplete);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  const handleSyncNow = async () => {
    if (!isOnline) {
      setError('Cannot sync while offline. Check internet connection.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await triggerSync();
      await loadData();
      setSuccess('Synchronization pass triggered successfully.');
    } catch (err: any) {
      setError(`Sync failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryItem = async (id: number) => {
    setError(null);
    setSuccess(null);
    try {
      // 1. Mark status back to queued
      await db.sync_queue.update(id, { status: 'queued', error_message: undefined });
      
      // If it's a sale, update corresponding pending sale status too
      const item = await db.sync_queue.get(id);
      if (item && item.type === 'SALE_CREATED') {
        const payload = item.payload as LocalSale;
        await db.pending_sales.update(payload.id, { status: 'pending', error_reason: undefined });
      }

      await loadData();
      
      // 2. Trigger sync automatically
      if (isOnline) {
        await triggerSync();
        await loadData();
      } else {
        setSuccess('Operation re-queued. Will sync once connection is restored.');
      }
    } catch (err: any) {
      setError(`Failed to retry item: ${err.message}`);
    }
  };

  const handleCancelItem = async (id: number, queueItemId: number) => {
    if (!confirm('Are you sure you want to cancel this offline operation? This will delete the transaction.')) return;
    setError(null);
    setSuccess(null);
    try {
      // 1. Remove from sync queue
      await db.sync_queue.delete(queueItemId);

      // 2. Remove from pending sales (reverts local quantity deduction)
      const sale = await db.pending_sales.get(id.toString());
      if (sale) {
        // Revert inventory deduction locally
        for (const item of sale.items) {
          await db.inventory
            .where({ product_id: item.product_id, branch_id: sale.branch_id })
            .modify(inv => {
              inv.quantity = inv.quantity + item.quantity;
            });
        }
        await db.pending_sales.delete(id.toString());
      }

      await loadData();
      setSuccess('Transaction cancelled and local stock reserves restored.');
    } catch (err: any) {
      setError(`Failed to cancel transaction: ${err.message}`);
    }
  };

  // Metrics calculations
  const pendingCount = queue.filter(q => q.status === 'queued' || q.status === 'processing').length;
  const conflictCount = queue.filter(q => q.status === 'sync_conflict').length;
  const failedCount = queue.filter(q => q.status === 'failed').length;

  return (
    <div className="space-y-6">
      
      {/* Top Notification Banner */}
      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-xs text-red-400 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-4 text-xs text-emerald-400 font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          {success}
        </div>
      )}

      {/* Connection & Device Details Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white leading-none">Offline Engine Status</h3>
          <p className="text-xs text-slate-400">
            Registered Device: <span className="text-white font-semibold">{deviceInfo.name}</span> | Type: <span className="text-slate-300 font-medium capitalize">{deviceInfo.type}</span>
          </p>
          <p className="text-[10px] text-slate-500 font-mono">Terminal UUID: #{deviceId}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold ${
            isOnline ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' : 'bg-red-950/20 border-red-900 text-red-400'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4" />
                Network Online
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                Network Offline
              </>
            )}
          </div>

          <button
            onClick={handleSyncNow}
            disabled={loading || !isOnline}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Active Queue
          </button>
        </div>
      </div>

      {/* Sync Queue Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-medium text-xs">
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Pending Sync</span>
            <span className="text-xl font-black text-blue-400 block mt-1">{pendingCount}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/10 flex items-center justify-center text-blue-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Sync Conflicts</span>
            <span className="text-xl font-black text-amber-500 block mt-1">{conflictCount}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-600/10 border border-amber-500/10 flex items-center justify-center text-amber-500">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Failed Syncs</span>
            <span className="text-xl font-black text-red-500 block mt-1">{failedCount}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-600/10 border border-red-500/10 flex items-center justify-center text-red-500">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Last Sync Operation</span>
            <span className="text-xs font-black text-slate-200 block mt-1.5">{syncTime}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <Database className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Sync Queue List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white leading-none">Active Sync Queue</h3>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1.5 block">Review offline transactions waiting to synchronize</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Queue ID</th>
                <th className="py-4 px-6">Operation Type</th>
                <th className="py-4 px-6">Local Time</th>
                <th className="py-4 px-6">Sync Status</th>
                <th className="py-4 px-6">Details / Conflict Reason</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-950 font-medium">
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No operations in sync queue. All transactions are up-to-date.
                  </td>
                </tr>
              ) : (
                queue.map((item) => {
                  const isSale = item.type === 'SALE_CREATED';
                  const label = isSale ? 'Sale Checkout' : 'New Customer CRM';
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-950/20 text-slate-350">
                      <td className="py-4 px-6 font-mono text-[10px] text-blue-500">#{item.id}</td>
                      <td className="py-4 px-6 font-bold text-white">{label}</td>
                      <td className="py-4 px-6 text-slate-500">{new Date(item.created_at).toLocaleString()}</td>
                      <td className="py-4 px-6">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                          item.status === 'queued' ? 'bg-blue-950/40 border-blue-900 text-blue-400' :
                          item.status === 'processing' ? 'bg-amber-950/40 border-amber-900 text-amber-400' :
                          item.status === 'sync_conflict' ? 'bg-orange-950/40 border-orange-900 text-orange-400' :
                          'bg-red-950/40 border-red-900 text-red-400'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6 max-w-xs truncate text-[11px] text-slate-400 font-medium">
                        {item.error_message ? (
                          <span className="text-red-400 font-bold block leading-tight">{item.error_message}</span>
                        ) : isSale ? (
                          <span>Invoice: #{item.payload.id} | Items: {item.payload.items.length}</span>
                        ) : (
                          <span>Name: {item.payload.name}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2 shrink-0">
                        {(item.status === 'failed' || item.status === 'sync_conflict') && (
                          <button
                            onClick={() => handleRetryItem(item.id!)}
                            className="px-3 py-1 rounded text-[10px] font-bold uppercase border border-blue-900 text-blue-400 hover:bg-blue-950/25 transition-all cursor-pointer"
                          >
                            Retry
                          </button>
                        )}
                        {isSale && (
                          <button
                            onClick={() => handleCancelItem(item.payload.id, item.id!)}
                            className="px-3 py-1 rounded text-[10px] font-bold uppercase border border-slate-800 text-slate-500 hover:border-red-900 hover:text-red-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Void
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
