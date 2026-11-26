import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface LandingPlanInfo {
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  trial_days: number;
  branch_limit: number | null;
  feature_limits: Record<string, number | null>;
  feature_entitlements: Record<string, boolean>;
}

interface PricingSectionProps {
  isLoggedIn: boolean;
  plans?: LandingPlanInfo[];
}

export default function PricingSection({ isLoggedIn, plans }: PricingSectionProps) {
  const freePlan = plans?.find((p) => p.slug === 'free');
  const proPlan = plans?.find((p) => p.slug === 'pro');

  const proPrice = proPlan?.price ?? 1000;
  const trialDays = proPlan?.trial_days ?? 7;

  const formatLimit = (val: number | null | undefined, noun: string) => {
    if (val === null || val === undefined) return `Configured ${noun} allowance`;
    return `Up to ${val.toLocaleString()} ${noun}`;
  };

  return (
    <section
      id="pricing"
      className="py-16 sm:py-24 bg-white border-t border-slate-200/80 scroll-mt-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Simple, Transparent Pricing</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Start Free. Upgrade when your business grows.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Every new workspace begins on our permanent Free plan. Activate a{' '}
            <strong className="text-slate-900">{trialDays}-day Pro trial</strong> anytime with no
            card required and zero automatic charges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-slate-900">{freePlan?.name || 'Free'}</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700">
                  Permanent Free
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl font-extrabold text-slate-900">₦0</span>
                <span className="text-sm text-slate-500">/ forever</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mb-6">
                {freePlan?.description ||
                  'Essential business management tools for single-workspace merchants.'}
              </p>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>1 business branch workspace</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Sales POS, Inventory Control, Customer CRM &amp; Debt Ledger (
                    {formatLimit(freePlan?.feature_limits?.products, 'products')})
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Basic sales, inventory &amp; expense reports</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>No payment information required · No auto-charges</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <Link href={isLoggedIn ? '/settings/subscription' : '/login?tab=signup'}>
                <Button
                  variant="outline"
                  className="w-full py-3 font-semibold border-slate-300 text-slate-800 hover:bg-white"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {isLoggedIn ? 'View Current Plan' : 'Get Started Free'}
                </Button>
              </Link>
            </div>
          </div>

          {/* Pro Plan Card */}
          <div className="rounded-2xl border-2 border-blue-600 bg-white p-6 sm:p-8 shadow-xl shadow-blue-900/5 flex flex-col justify-between relative">
            <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-xs">
              {trialDays}-Day Free Trial Available
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-slate-900">{proPlan?.name || 'Pro'}</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Monthly Billing
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl font-extrabold text-slate-900">
                  ₦{proPrice.toLocaleString()}
                </span>
                <span className="text-sm text-slate-500">/ month</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mb-6">
                {proPlan?.description ||
                  'Full TraderERP power with unlimited capacity, advanced reporting, and data exports.'}
              </p>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Unlimited branches &amp; full workspace capacity</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Unlimited products, monthly sales &amp; customer records</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Advanced profit, COGS &amp; credit performance reports</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Full data export &amp; automated Paystack monthly billing</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
              <Link href={isLoggedIn ? '/settings/subscription' : '/login?tab=signup'}>
                <Button
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {isLoggedIn ? 'Manage or Upgrade Plan' : `Start Free & Try Pro (${trialDays} Days)`}
                </Button>
              </Link>
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Cancel anytime. Paystack recurring billing only after authorisation.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

