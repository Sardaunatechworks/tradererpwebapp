import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Logo from '@/components/layout/Logo';
import {
  ArrowRight,
  Package,
  ShoppingCart,
  Users,
  Receipt,
  BarChart3,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const features = [
    {
      title: 'Fast Sales & Receipts',
      desc: 'Process sales in seconds, handle cash, bank transfers, or credit, and print itemized customer receipts immediately.',
      icon: ShoppingCart,
      badge: 'Point of Sale',
    },
    {
      title: 'Real-Time Inventory',
      desc: 'Keep accurate counts of every product in your store, receive low-stock alerts, and track every stock-in and adjustment.',
      icon: Package,
      badge: 'Stock Control',
    },
    {
      title: 'Operating Expenses',
      desc: 'Categorize rent, fuel, transport, and staff wages so you always know your true estimated profit at the end of the day.',
      icon: Receipt,
      badge: 'Expense Tracking',
    },
    {
      title: 'Customer Credit Ledger',
      desc: 'Never lose track of debtors again. See exact balances, record partial payments, and reconcile accounts in one click.',
      icon: CreditCard,
      badge: 'Debt Reconciliation',
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
            <span>Built specifically for Nigerian traders & retail merchants</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight sm:leading-none">
            Run your store with <br className="hidden sm:inline" />
            <span className="text-slate-900 underline decoration-blue-500 decoration-4 underline-offset-4">
              complete financial clarity.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Stop losing money to forgotten customer credit, untracked inventory shortages, and uncalculated store expenses. TraderERP gives you an all-in-one workspace designed for real trade.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={isLoggedIn ? '/dashboard' : '/login?tab=signup'} className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto px-8" rightIcon={<ArrowRight className="w-4 h-4" />}>
                {isLoggedIn ? 'Open Your Workspace' : 'Start Free Business Account'}
              </Button>
            </Link>
            <Link href={isLoggedIn ? '/sales/new' : '/login'} className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8">
                {isLoggedIn ? 'Record New Sale' : 'Sign In to Account'}
              </Button>
            </Link>
          </div>

          {/* Social Proof Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Multi-item quick checkout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>FIFO credit debt tracking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Real-time estimated profit</span>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="py-12 px-4 sm:px-8 max-w-6xl mx-auto">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Everything your trade operations require
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              No complicated accounting jargon. Just fast, dependable everyday tools.
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
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-8 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} TraderERP. All rights reserved.</p>
          <p>Simple, professional business ERP for modern traders.</p>
        </div>
      </footer>
    </div>
  );
}
