import React from 'react';
import { UserCheck, Store, BarChart2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Create an account & set up your store',
      description:
        'Sign up in less than a minute. Enter your business name, select your trade type (Retail, Wholesale, Supermarket, Pharmacy, or General Merchant), and set your local currency (₦ NGN).',
      icon: Store,
      badge: 'Step 1: 60 Seconds',
    },
    {
      step: '02',
      title: 'Add products & record daily transactions',
      description:
        'Add items into your stock catalog with their cost and selling prices. Start ringing up sales on the quick POS checkout, issue printed receipts, and log daily operating expenses.',
      icon: UserCheck,
      badge: 'Step 2: Start Selling',
    },
    {
      step: '03',
      title: 'Review records & make informed decisions',
      description:
        'Watch your daily sales and margins update live. Review outstanding customer debts, act on low-stock alerts before shelves run dry, and download CSV reports whenever needed.',
      icon: BarChart2,
      badge: 'Step 3: Real Visibility',
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-white border-t border-slate-200/80 scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14 sm:mb-20">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600">
            Simple 3-Step Setup
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How TraderERP works in your everyday business
          </p>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            No complex installations, heavy software manuals, or technical consultants required. You can have your store workspace active and recording in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((s, index) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 flex flex-col justify-between hover:bg-white hover:border-slate-300 hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-black font-mono text-slate-300 group-hover:text-blue-600 transition-colors">
                      {s.step}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                      {s.badge}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 text-white w-fit mb-5 group-hover:bg-blue-600 transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-3">{s.title}</h3>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {s.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-200/60 text-xs font-semibold text-blue-600 flex items-center gap-1.5">
                  <span>Standard workflow</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Guided Tour Callout */}
        <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-blue-50/70 border border-blue-200/80 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-left space-y-1.5">
            <h4 className="text-base font-bold text-slate-900">
              Interactive Guided Tour for New Users
            </h4>
            <p className="text-xs sm:text-sm text-slate-600">
              When you first log in, TraderERP provides an optional guided tour highlighting key buttons and screens so you never feel lost.
            </p>
          </div>
          <Link href="/login?tab=signup" className="shrink-0">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs">
              Create Your Free Account
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
