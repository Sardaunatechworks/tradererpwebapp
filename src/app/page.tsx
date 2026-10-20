import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Logo from '@/components/layout/Logo';
import {
  ArrowRight,
  Package,
  ShoppingCart,
  Receipt,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'TraderERP — Run Your Business With More Confidence',
  description:
    'Track your sales, stock, expenses, and customer debts in one place. Built specifically for Nigerian retailers and small business owners.',
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const features = [
    {
      title: 'Fast Checkout & Receipts',
      desc: 'Record customer sales in seconds, handle cash, bank transfers, or credit, and issue clean printed receipts immediately.',
      icon: ShoppingCart,
      badge: 'Sales POS',
    },
    {
      title: 'Live Stock Tracking',
      desc: 'Always know the exact quantity of products in your shop. Receive low-stock warnings before popular items run out.',
      icon: Package,
      badge: 'Inventory',
    },
    {
      title: 'Operating Expenses',
      desc: 'Track shop rent, generator fuel, transport, and staff wages so you always know your true estimated profit at the end of the day.',
      icon: Receipt,
      badge: 'Expenses',
    },
    {
      title: 'Customer Debts & Credit',
      desc: 'Never forget who owes you money. View exact debtor balances, record installment payments, and keep customer accounts straight.',
      icon: CreditCard,
      badge: 'Credit Ledger',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between selection:bg-slate-900 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <Link href="/">
            <Logo iconSize="w-9 h-9" showText={true} />
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/login?tab=signup">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-16 sm:py-24 px-4 sm:px-8 max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Built for Nigerian retailers &amp; small business owners</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight sm:leading-none">
            Run Your Business With{' '}
            <span className="text-slate-900 underline decoration-blue-500 decoration-4 underline-offset-4">
              More Confidence.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Track your sales, stock, expenses, and customer debts in one place. TraderERP helps you keep better records, understand your business performance, and make more informed decisions.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={isLoggedIn ? '/dashboard' : '/login?tab=signup'}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="w-full sm:w-auto px-8"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {isLoggedIn ? 'Open Your Workspace' : 'Start Free Business Account'}
              </Button>
            </Link>
            <Link
              href={isLoggedIn ? '/sales/new' : '/login'}
              className="w-full sm:w-auto"
            >
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8">
                {isLoggedIn ? 'Record New Sale' : 'Sign In to Account'}
              </Button>
            </Link>
          </div>

          {/* Social Proof Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Quick checkout &amp; receipts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Easy debtor debt tracking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Daily estimated profit calculation</span>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="py-12 px-4 sm:px-8 max-w-6xl mx-auto">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Everything your store operations require
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Straightforward, practical tools designed for everyday trade without confusing accounting terms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-xl bg-slate-900 text-white w-fit">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        {f.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Transparency & Privacy Banner */}
        <section className="py-12 px-4 sm:px-8 max-w-5xl mx-auto">
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-4 h-4" />
                <span>Your Data, Your Ownership</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Transparent privacy and full record control
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                We never sell your customer records or trade details. You can download an archive of your personal data or close your account at any time directly from Settings.
              </p>
            </div>
            <Link href="/privacy" className="shrink-0">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Read Privacy Policy
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} TraderERP. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <a
              href="https://www.smarttradererp.com.ng"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              smarttradererp.com.ng
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
