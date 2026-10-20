import React from 'react';
import type { Metadata } from 'next';
import {
  Package,
  ShoppingCart,
  Receipt,
  CreditCard,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import Logo from '@/components/layout/Logo';

export const metadata: Metadata = {
  title: 'TraderERP — Simple Business Management for Traders',
  description: 'Manage sales, stock, expenses, and credit customers from one clean workspace.',
};

const highlights = [
  {
    icon: ShoppingCart,
    title: 'Fast Sales Recording',
    desc: 'Record in-store cash, transfer, and credit sales with instant receipts.',
  },
  {
    icon: Package,
    title: 'Real-Time Inventory',
    desc: 'Track live stock quantities, low-stock alerts, and movements without hassle.',
  },
  {
    icon: Receipt,
    title: 'Operating Expenses',
    desc: 'Categorize business spending so you know your true estimated profit.',
  },
  {
    icon: CreditCard,
    title: 'Customer Credit Tracking',
    desc: 'Know exactly who owes you, record partial payments, and view debts.',
  },
  {
    icon: BarChart3,
    title: 'Business Performance',
    desc: 'Understand daily sales, expenses, and performance at a single glance.',
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Column: Value propositions (Visible on lg+ screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Logo iconSize="w-10 h-10" textColorMode="dark" />
          <div className="mt-12 max-w-md">
            <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              Run your trading business with total clarity.
            </h2>
            <p className="mt-3 text-slate-400 text-sm leading-relaxed">
              Designed specifically for merchants, retail shops, and distributors. No bloated complexity. Just the tools you need every day.
            </p>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-5 my-8 relative z-10 max-w-md">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-blue-400 shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-normal">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust badge */}
        <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 relative z-10 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Multi-tenant isolation & atomic transaction security</span>
        </div>
      </div>

      {/* Right Column: Auth Form Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:p-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
