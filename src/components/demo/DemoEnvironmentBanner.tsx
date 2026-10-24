'use client';

import React, { useState } from 'react';
import { ShieldCheck, RotateCcw, Sparkles, ChevronDown, ChevronUp, ShoppingBag, Package, Users, BarChart3, Loader2 } from 'lucide-react';
import { resetDemoData } from '@/app/actions/demo';
import { toast } from '@/stores/toastStore';

export default function DemoEnvironmentBanner() {
  const [isResetting, setIsResetting] = useState(false);
  const [showWorkflows, setShowWorkflows] = useState(false);

  // Only render if NEXT_PUBLIC_DEMO_MODE is active
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return null;
  }

  const handleReset = async () => {
    if (isResetting) return;
    const confirm = window.confirm(
      'Reset all demo data back to default?\n\nThis will re-seed the sample FMCG catalog (26 items), 18 historical transactions, 6 customer debt profiles, and operational expenses.'
    );
    if (!confirm) return;

    setIsResetting(true);
    try {
      const res = await resetDemoData();
      if (res.success) {
        toast.success('Demo environment successfully reset to pristine state.');
        window.location.reload();
      } else {
        toast.error(res.error || 'Failed to reset demo data.');
      }
    } catch {
      toast.error('An unexpected error occurred while resetting demo data.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl shadow-blue-950/20 border border-blue-700/40 overflow-hidden">
      {/* Top Banner Row */}
      <div className="px-4 py-3 sm:px-6 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 shrink-0 mt-0.5 sm:mt-0">
            <ShieldCheck className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                GRANT APPLICATION DEMO
              </span>
              <span className="text-xs font-medium text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                Isolated Sandbox
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
              Welcome, Grant Evaluators! You are exploring TraderERP as the <strong>Business Owner</strong> of <em>Apex Merchants Ltd</em>. All sales, stock updates, and expenses are isolated and do not affect live customer data.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={() => setShowWorkflows(!showWorkflows)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Judge Guide</span>
            {showWorkflows ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleReset}
            disabled={isResetting}
            title="Wipe and restore the demo catalog and transactions to original sample state"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-200 hover:text-amber-100 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition-colors disabled:opacity-50"
          >
            {isResetting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>{isResetting ? 'Resetting...' : 'Reset Demo Data'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Judge Evaluation Guide */}
      {showWorkflows && (
        <div className="border-t border-blue-700/30 bg-blue-950/50 px-4 py-4 sm:px-6 sm:py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-3">
            Recommended Evaluation Workflows to Test:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-white">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>1. Record a Live Sale</span>
              </div>
              <p className="text-slate-300">
                Go to <strong>Sales</strong> &rarr; Click <em>New Sale</em>. Select products (e.g. Mama Gold Rice) and checkout via Cash, Bank Transfer, or Credit.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Package className="w-4 h-4 text-blue-400" />
                <span>2. Inventory & Stock Alerts</span>
              </div>
              <p className="text-slate-300">
                Go to <strong>Inventory</strong> to explore 26 fast-moving Nigerian FMCG products. Notice automatic red low-stock badges. Test adding new stock.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Users className="w-4 h-4 text-amber-400" />
                <span>3. Debtors & Credit CRM</span>
              </div>
              <p className="text-slate-300">
                Go to <strong>Credit</strong> to view ₦323k in active merchant debt across clients like <em>Alhaji Bello Stores</em>. Test recording a debt repayment.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-white">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span>4. Profit & Loss Analytics</span>
              </div>
              <p className="text-slate-300">
                Go to <strong>Reports</strong> to view estimated gross profits, COGS breakdown, daily sales trends, and operational expense logs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
