import React from 'react';
import {
  ShoppingCart,
  Package,
  Receipt,
  CreditCard,
  BarChart3,
  Users,
  Check,
  Printer,
  Bell,
  Coins,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';

export default function FeaturesSection() {
  const features = [
    {
      id: 'sales',
      title: 'Sales & POS Rapid Checkout',
      category: 'Sales Module',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: ShoppingCart,
      what: 'A fast, touch-friendly Point of Sale (POS) screen that lets cashiers scan barcodes or search items, choose payment methods, and record transactions in seconds.',
      why: 'Speeds up customer queues during rush hours, prevents checkout arithmetic mistakes, and produces clean receipts.',
      how: 'Your sales staff rings up items, selects Cash, Bank Transfer, or POS Terminal payment, and clicks Print Receipt to issue immediate paper confirmation to the customer.',
      highlights: ['Multiple payment channels', 'Custom printable receipts', 'Instant inventory deduction'],
    },
    {
      id: 'inventory',
      title: 'Inventory & Live Stock Control',
      category: 'Stock Module',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Package,
      what: 'A central product catalog tracking physical stock quantities, cost prices, default selling prices, and category classifications across your store.',
      why: 'Prevents losing money to unaccounted missing stock, dead inventory, or selling products that are already depleted.',
      how: 'Set a minimum reorder threshold (e.g. 10 units). TraderERP automatically highlights low-stock products on your dashboard so you can order replenishment from suppliers in time.',
      highlights: ['Automatic low-stock warnings', 'Cost vs. selling price tracking', 'Category & SKU organization'],
    },
    {
      id: 'expenses',
      title: 'Operating Expense Tracker',
      category: 'Finance Module',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Receipt,
      what: 'A dedicated log for day-to-day business operational outgoings such as generator fuel, store rent, municipal fees, transport, and casual wages.',
      why: 'Gross sales numbers can be deceiving. Without tracking everyday expenses, store owners risk depleting working capital while believing they are making profits.',
      how: 'Whenever money leaves the register to buy generator fuel or pay market levies, log the amount and category in two taps so your net earnings remain accurate.',
      highlights: ['Custom expense categories', 'Daily & monthly expense sums', 'Real-time profit impact'],
    },
    {
      id: 'customers-credit',
      title: 'Customer Directory & Credit Ledger',
      category: 'Customer CRM',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: CreditCard,
      what: 'A customer management ledger tracking regular clients, their contact information, and exact outstanding debt balances.',
      why: 'Credit sales are standard in Nigerian retail and wholesale trade, but manual debt notes frequently get misplaced, causing uncollected revenues and customer disputes.',
      how: 'Record part-payment or full credit at checkout. The customer profile automatically reflects their total outstanding debt, and logs every installment payment with date and cashier ID.',
      highlights: ['Debtor balance tracking', 'Repayment installment logs', 'Customer purchase history'],
    },
    {
      id: 'reports',
      title: 'Business Reports & Margins',
      category: 'Analytics Module',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: BarChart3,
      what: 'Clear visual summaries and downloadable data sheets showing daily sales, estimated gross margins, top products, and overall business cash flow.',
      why: 'Empowers you to identify which products actually make you money, which ones move slowly, and whether your business is growing month over month.',
      how: 'Filter reports by date range (Today, This Week, This Month), view revenue graphs, print formal statements, or export clean CSV files for your tax or accountant records.',
      highlights: ['Daily & periodic revenue charts', 'Estimated gross profit metrics', 'One-click CSV exports'],
    },
    {
      id: 'staff-access',
      title: 'Staff Roles & Multi-User Access',
      category: 'Team & Security',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Users,
      what: 'Team permissions separating Owner, Admin, and Staff logins, with audit trails recording who performed each sale, stock adjustment, or customer update.',
      why: 'Allows shop assistants and cashiers to process daily sales without giving them access to sensitive cost prices, profit margins, or administrative settings.',
      how: 'Create accounts for your shop attendants with "Staff" privileges. They can ring up customer sales, but cannot alter historical records or see your overall business net worth.',
      highlights: ['Role-based permission gating', 'Immutable audit log stream', 'Safe delegation of register work'],
    },
  ];

  return (
    <section id="features" className="py-16 sm:py-24 bg-slate-50 border-t border-slate-200/80 scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14 sm:mb-20">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600">
            Verified Product Capabilities
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Purpose-built tools for everyday shop operations
          </p>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Every feature in TraderERP is designed around the actual daily workflow of African retail and wholesale stores, eliminating complex technical jargon in favor of immediate usability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-slate-300 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-slate-900 text-white group-hover:bg-blue-600 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${f.badgeColor}`}>
                      {f.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>

                  <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    <div>
                      <span className="font-semibold text-slate-900">What it does: </span>
                      {f.what}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Why it matters: </span>
                      {f.why}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">How you use it: </span>
                      {f.how}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Key Highlights
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {f.highlights.map((h, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
