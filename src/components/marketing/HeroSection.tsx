'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  ShoppingCart,
  Package,
  Receipt,
  CreditCard,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface HeroSectionProps {
  isLoggedIn: boolean;
}

export default function HeroSection({ isLoggedIn }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 bg-gradient-to-b from-blue-50/60 via-white to-slate-50">
      {/* Background Accent Gradients */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-br from-blue-400/10 via-royal-blue/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-xs font-semibold text-blue-800 mb-6 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Built for Retailers, Wholesalers &amp; Growing Businesses</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.15] sm:leading-[1.12]">
          Run Your Business With{' '}
          <span className="text-blue-600 underline decoration-blue-300 decoration-wavy decoration-2 underline-offset-8">
            More Confidence.
          </span>
        </h1>

        {/* Supporting Description */}
        <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Manage your sales, stock, expenses, and customer records in one place. TraderERP helps you keep better records and understand how your business is performing.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto sm:max-w-none">
          <Link
            href={isLoggedIn ? '/dashboard' : '/login?tab=signup'}
            className="w-full sm:w-auto"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-md shadow-blue-500/20"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              {isLoggedIn ? 'Go to Your Dashboard' : 'Get Started Free'}
            </Button>
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto"
          >
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-7 py-3.5 border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 font-semibold text-base"
            >
              Explore Features
            </Button>
          </a>
        </div>

        {/* Key Operational Highlights */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs sm:text-sm font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Fast POS checkout &amp; receipts</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Live inventory &amp; reorder alerts</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Customer debt tracking</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>No confusing accounting jargon</span>
          </div>
        </div>

        {/* Authentic Product Interface Preview */}
        <div className="mt-14 sm:mt-18 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-2xl shadow-slate-900/10">
            {/* Mock Window Top Bar */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-left">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
                </div>
                <span className="hidden sm:inline-block text-xs font-medium text-slate-400 pl-3">
                  TraderERP Workspace • Sardauna General Enterprises
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Store Open • Main Branch
                </span>
              </div>
            </div>

            {/* Dashboard Content Mockup */}
            <div className="bg-slate-50/70 rounded-xl p-4 sm:p-6 text-left border border-slate-100 space-y-6">
              {/* Stat Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-medium">Today&apos;s Sales</span>
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono">
                    ₦184,500
                  </div>
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" /> 14 completed sales
                  </span>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-medium">Gross Margin</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono">
                    ₦42,800
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Before daily expenses
                  </span>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-medium">Inventory Catalog</span>
                    <Package className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono">
                    348 Items
                  </div>
                  <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" /> 2 low-stock alerts
                  </span>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-medium">Customer Debts</span>
                    <CreditCard className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono">
                    ₦65,000
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    3 customers with balance
                  </span>
                </div>
              </div>

              {/* Sub-Panel: Live Sales and Low Stock Alert */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent Sales Column */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Recent Store Transactions
                    </span>
                    <span className="text-[11px] text-blue-600 font-medium">Live POS Feed</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <div className="font-semibold text-slate-900">
                          Peak Evaporated Milk 160g <span className="text-slate-500 font-normal">× 12 tins</span>
                        </div>
                        <span className="text-[11px] text-slate-400">Cash sale • Receipt #TR-1049</span>
                      </div>
                      <span className="font-bold font-mono text-slate-900 text-sm">₦7,800</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <div className="font-semibold text-slate-900">
                          Golden Penny Semovita 2kg <span className="text-slate-500 font-normal">× 2 bags</span>
                        </div>
                        <span className="text-[11px] text-slate-400">Bank Transfer • Receipt #TR-1048</span>
                      </div>
                      <span className="font-bold font-mono text-slate-900 text-sm">₦6,400</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <div className="font-semibold text-slate-900">
                          Mama Gold Rice 50kg <span className="text-slate-500 font-normal">× 1 bag</span>
                        </div>
                        <span className="text-[11px] text-purple-600 font-medium">Part Payment (Alhaji Muhammadu)</span>
                      </div>
                      <span className="font-bold font-mono text-slate-900 text-sm">₦45,000</span>
                    </div>
                  </div>
                </div>

                {/* Operations Checklist Column */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block mb-3 pb-3 border-b border-slate-100">
                      Stock &amp; Operational Status
                    </span>
                    <div className="space-y-3">
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-800 text-xs">
                        <div className="font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reorder Alert</span>
                        </div>
                        <p className="text-[11px] text-amber-700 mt-1">
                          Gino Tomato Paste 70g has <strong>4 units remaining</strong>. Reorder point is 10.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-800 text-xs">
                        <div className="font-semibold flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-blue-600" />
                          <span>Daily Expenses</span>
                        </div>
                        <p className="text-[11px] text-blue-700 mt-1">
                          Generator Fuel (₦4,500) logged at 11:30 AM.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Verified Multi-Tenant Workspace</span>
                    <span className="text-emerald-600 font-semibold">Protected by RLS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
