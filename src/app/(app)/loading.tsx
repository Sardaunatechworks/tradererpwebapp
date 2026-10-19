import React from 'react';
import { SkeletonMetric, SkeletonTable } from '@/components/ui/LoadingState';

export default function AppLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Placeholder */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200/80 rounded-md animate-pulse" />
          <div className="h-4 w-72 bg-slate-200/60 rounded-md animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-slate-200/80 rounded-lg animate-pulse" />
      </div>

      {/* Metrics Row */}
      <SkeletonMetric count={4} />

      {/* Main Table / Content Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-200/80 rounded-md animate-pulse" />
          <div className="h-8 w-44 bg-slate-200/60 rounded-lg animate-pulse" />
        </div>
        <SkeletonTable rows={6} columns={5} />
      </div>
    </div>
  );
}
