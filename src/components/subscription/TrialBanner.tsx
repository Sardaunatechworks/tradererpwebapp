'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { getTrialBannerState } from '@/app/actions/subscription';

export default function TrialBanner() {
  const [banner, setBanner] = useState<{
    status: string;
    planSlug: string;
    daysRemaining: number | null;
    endsAt: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    getTrialBannerState().then((res) => {
      if (active && res) setBanner(res);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!banner) return null;

  if (banner.status === 'past_due') {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Renewal payment failed.</strong> You have{' '}
            {banner.daysRemaining ?? 0} day(s) remaining in your grace period before returning to the Free plan.
          </span>
        </div>
        <Link
          href="/settings/subscription"
          className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:underline shrink-0"
        >
          Resolve Billing <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  if (banner.status === 'trialing') {
    return (
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Pro Trial Active:</strong> {banner.daysRemaining ?? 0} day(s) remaining. No card required and no automatic charge when it ends.
          </span>
        </div>
        <Link
          href="/settings/subscription"
          className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline shrink-0"
        >
          Manage Plan <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return null;
}

