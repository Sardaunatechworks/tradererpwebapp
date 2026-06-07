import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { 
  ArrowRight, 
  Package, 
  ShoppingCart, 
  Users, 
  Coins, 
  BarChart3, 
  ShieldCheck, 
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const features = [
    {
      title: 'Sales POS',
      desc: 'Process sales instantly, print invoices, and record payments with ease.',
      icon: ShoppingCart,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    },
    {
      title: 'Inventory Control',
      desc: 'Track stock, set automated reorder warnings, and scope items by branch.',
      icon: Package,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
    },
    {
      title: 'Customers CRM',
      desc: 'Manage profiles, record spent metrics, and analyze buyer history.',
      icon: Users,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Debts CRM',
      desc: 'Track outstanding balances, log installments, and check aging credit.',
      icon: Coins,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    },
    {
      title: 'Advanced Reports',
      desc: 'Run detailed revenue, profit, valuation, and branch performance audits.',
      icon: BarChart3,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between overflow-x-hidden selection:bg-blue-600/30">
      
      {/* Premium Navbar */}
      <header className="border-b border-slate-900/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
              T
            </div>
            <span className="font-extrabold text-sm text-white tracking-tight uppercase">TraderERP</span>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link 
                href="/dashboard"
                className="flex items-center gap-1.5 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-900/20"
              >
                Go to Console <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-xs font-bold text-slate-400 hover:text-white px-3 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/login?tab=signup"
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="py-12 md:py-24 px-6 max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12">
          
          {/* Left Text Column */}
          <div className="space-y-6 lg:w-1/2 text-left">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Enterprise Operations Made Simple</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Manage your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-400">multi-branch</span> business in one POS
            </h1>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-xl">
              TraderERP provides a lightning-fast, secure, and beautiful interface for retail, wholesale, and branch-based businesses. Control stock, log cashflow, manage debt, and track cashier metrics.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              {isLoggedIn ? (
                <Link 
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wider py-4 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/10"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link 
                    href="/login?tab=signup"
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wider py-4 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/10"
                  >
                    Register Business <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link 
                    href="/login"
                    className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold text-sm uppercase tracking-wider py-4 px-8 rounded-xl transition-all"
                  >
                    Employee Log In <ChevronRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-6 pt-4 border-t border-slate-900/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Multi-Tenant Isolation
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Layers className="w-4 h-4 text-indigo-500" /> Offline POS Ready
              </div>
            </div>
          </div>

          {/* Right Preview Card / Graphic Column */}
          <div className="lg:w-1/2 w-full relative">
            <div className="absolute inset-0 bg-blue-500/10 blur-[80px] rounded-full -z-10" />
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/55" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/55" />
                  <span className="w-3 h-3 rounded-full bg-green-500/55" />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Live System Preview</span>
              </div>
              
              {/* Dummy Console UI elements */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/80 border border-slate-800/60 p-4 rounded-xl space-y-1">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Today&apos;s Sales</span>
                    <span className="text-lg font-black text-white block">₦142,500.00</span>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800/60 p-4 rounded-xl space-y-1">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Profit Margin</span>
                    <span className="text-lg font-black text-emerald-400 block">+24.5%</span>
                  </div>
                </div>

                {/* Simulated table/list */}
                <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 space-y-3">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Active Stock Levels</span>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Premium Cement (50kg)</span>
                      <span className="text-white font-bold">142 bags</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full w-[75%]" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Steel Rods (16mm)</span>
                      <span className="text-yellow-400 font-bold">12 items (Low Stock)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-yellow-500 h-full w-[15%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="bg-slate-950 border-t border-slate-900/60 py-16 px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Powerful tools, designed for growth</h2>
              <p className="text-xs md:text-sm text-slate-500 max-w-xl mx-auto">
                No complex training needed. Run operations immediately on any mobile, tablet, or desktop browser.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div 
                    key={feat.title}
                    className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl hover:border-slate-800 transition-all hover:bg-slate-900/35 space-y-4"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${feat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-white">{feat.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 py-8 px-6 bg-slate-950">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-semibold uppercase tracking-wider">
          <span>&copy; {new Date().getFullYear()} TraderERP Inc. All rights reserved.</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-default">Privacy</span>
            <span className="hover:text-slate-400 cursor-default">Terms</span>
            <span className="hover:text-slate-400 cursor-default">Security</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
