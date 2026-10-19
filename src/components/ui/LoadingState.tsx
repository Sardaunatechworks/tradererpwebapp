import React from 'react';
import { Loader2 } from 'lucide-react';
import { LogoIcon } from '@/components/layout/Logo';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  branded?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  branded = false,
}) => {
  const sizes = {
    sm: 'p-6',
    md: 'p-12',
    lg: 'p-20',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center ${sizes[size]} text-center animate-in fade-in duration-200`}
    >
      {branded ? (
        <div className="relative mb-3 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-blue-500/15 animate-ping duration-1000" />
          <LogoIcon className="w-10 h-10 relative z-10 drop-shadow-xs" />
        </div>
      ) : (
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
      )}
      <p className="text-sm font-medium text-slate-600">{message}</p>
      <span className="sr-only">Loading content, please wait</span>
    </div>
  );
};

// ── SKELETON LOADERS ──────────────────────────────────────────────────────────

export function SkeletonBox({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`bg-slate-200/80 rounded-md animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className="h-3.5 bg-slate-200/80 rounded-sm animate-pulse"
          style={{ width: idx === lines - 1 && lines > 1 ? '65%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonMetric({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full"
      aria-label="Loading metrics"
      role="status"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-3.5 w-24" />
            <SkeletonBox className="h-8 w-8 rounded-lg" />
          </div>
          <SkeletonBox className="h-7 w-32" />
          <SkeletonBox className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 w-full" role="status" aria-label="Loading cards">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-4 w-1/3" />
            <SkeletonBox className="h-4 w-16 rounded-full" />
          </div>
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div
      className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs w-full"
      role="status"
      aria-label="Loading table"
    >
      {/* Table Header */}
      <div className="bg-slate-50/75 border-b border-slate-200 px-6 py-3.5 flex items-center gap-4">
        {Array.from({ length: columns }).map((_, idx) => (
          <SkeletonBox
            key={idx}
            className={`h-4 ${idx === 0 ? 'w-32' : 'flex-1'}`}
          />
        ))}
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="px-6 py-4 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <SkeletonBox
                key={cIdx}
                className={`h-4 ${cIdx === 0 ? 'w-36' : 'flex-1'} ${
                  cIdx % 2 === 1 ? 'opacity-80' : ''
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
