import React from 'react';
import type { Metadata } from 'next';
import { 
  BarChart3, 
  ShoppingCart, 
  Package, 
  Users, 
  Coins, 
  ClipboardList, 
  Building2, 
  Shield 
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'TraderERP – Enterprise Trading Management System',
  description: 'Manage sales, inventory, debts, branches, and staff from one powerful trading workspace. Sign in or create your TraderERP account.',
};

const features = [
  {
    icon: BarChart3,
    title: 'Real-Time Dashboard',
    description: 'Live KPIs, profit metrics, and revenue charts. Monitor your entire trading operation at a glance.',
  },
  {
    icon: ShoppingCart,
    title: 'Sales POS',
    description: 'Blazing-fast point-of-sale console. Process transactions, apply discounts, and print receipts instantly.',
  },
  {
    icon: Package,
    title: 'Inventory Control',
    description: 'Track stock levels, set low-stock alerts, and manage product catalogs across all branches.',
  },
  {
    icon: Users,
    title: 'Customer CRM',
    description: 'Build and manage customer profiles, track purchase history, and manage credit relationships.',
  },
  {
    icon: Coins,
    title: 'Debt Management',
    description: 'Track outstanding balances, record repayments, and monitor overdue accounts with full history.',
  },
  {
    icon: ClipboardList,
    title: 'Advanced Reports',
    description: 'Generate EOD reports, profit summaries, and staff activity logs. Export ready for auditing.',
  },
  {
    icon: Building2,
    title: 'Multi-Branch',
    description: 'Run multiple branches under one account. Assign managers, staff, and isolate branch performance.',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'Owner, Admin, Manager, Staff — granular permission layers keep your data safe and structured.',
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">

      {/* ─── Left Marketing Panel ─── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-r border-slate-800/60 relative overflow-hidden">

        {/* Decorative gradient orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full px-10 py-10">

          {/* Brand */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-600/20">
              T
            </div>
            <div>
              <span className="font-black text-white text-lg tracking-tight leading-none block">TraderERP</span>
              <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase block mt-0.5">Enterprise Platform</span>
            </div>
          </div>

          {/* Hero Text */}
          <div className="mb-10 max-w-xl">
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
              Run Your Trading{' '}
              <span className="text-blue-500">Business</span>{' '}
              Smarter
            </h1>
            <p className="mt-4 text-slate-400 text-base leading-relaxed font-medium">
              TraderERP is a complete enterprise management platform built for trading businesses — 
              from multi-branch inventory to real-time sales, debt tracking, and detailed reporting.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-3 flex-1 content-start">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 hover:border-blue-500/20 hover:bg-slate-900/80 transition-all duration-200 group"
              >
                <div className="flex items-start gap-3">
                  <f.icon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200" />
                  <div className="min-w-0">
                    <h3 className="text-[11px] font-bold text-white uppercase tracking-wide leading-none mb-1.5 group-hover:text-blue-400 transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{f.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Row */}
          <div className="mt-8 flex items-center gap-6 pt-6 border-t border-slate-800/60">
            {[
              { value: 'Multi-Branch', label: 'Support' },
              { value: 'Role-Based', label: 'Security' },
              { value: 'Real-Time', label: 'Analytics' },
              { value: 'EOD Reports', label: 'Built-in' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xs font-black text-blue-400 leading-none">{s.value}</div>
                <div className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right Auth Panel ─── */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">

        {/* Mobile brand header */}
        <div className="lg:hidden flex items-center gap-3 px-6 pt-8 pb-4">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-lg shadow-blue-600/20">
            T
          </div>
          <div>
            <span className="font-black text-white text-base tracking-tight leading-none block">TraderERP</span>
            <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase block mt-0.5">Enterprise Platform</span>
          </div>
        </div>

        {/* Auth Form Container */}
        <div className="flex-1 flex items-center justify-center p-6 py-8">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 pb-6 pt-2 text-center">
          <p className="text-[11px] text-slate-600 font-medium">
            © {new Date().getFullYear()} <span className="text-slate-500 font-bold">Sardauna Tech Lab</span>. All rights reserved.
          </p>
          <p className="text-[10px] text-slate-700 mt-1 font-medium">
            TraderERP — Built for enterprise trading operations.
          </p>
        </footer>
      </div>
    </div>
  );
}
