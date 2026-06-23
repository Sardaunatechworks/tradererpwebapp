import React from 'react';
import SyncCenterConsole from '@/components/offline/SyncCenterConsole';

export const metadata = {
  title: 'TraderERP Sync Center',
  description: 'Manage offline operations, monitor queue status, and resolve transaction conflicts.',
};

export default function SyncCenterPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight leading-none">Sync Center</h1>
        <p className="text-xs text-slate-500 mt-2">
          Monitor offline browser synchronization queues, track registered device status, and resolve checkout conflicts.
        </p>
      </div>

      <SyncCenterConsole />

    </div>
  );
}
