import React from 'react';
import { SkeletonMetric, SkeletonTable, SkeletonBox } from '@/components/ui/LoadingState';

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="space-y-2">
          <SkeletonBox className="h-6 w-56 bg-slate-800" />
          <SkeletonBox className="h-4 w-72 bg-slate-800/60" />
        </div>
        <SkeletonBox className="h-9 w-32 bg-slate-800 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl space-y-3">
            <SkeletonBox className="h-3.5 w-24 bg-slate-700" />
            <SkeletonBox className="h-7 w-32 bg-slate-700" />
          </div>
        ))}
      </div>

      <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-6 space-y-4">
        <SkeletonBox className="h-5 w-44 bg-slate-700" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <SkeletonBox key={idx} className="h-10 w-full bg-slate-800/80 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
