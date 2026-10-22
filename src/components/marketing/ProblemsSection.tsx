import React from 'react';
import {
  FileQuestion,
  PackageX,
  CreditCard,
  TrendingDown,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

export default function ProblemsSection() {
  const problems = [
    {
      icon: FileQuestion,
      color: 'bg-red-50 text-red-600 border-red-200',
      title: 'Scattered sales and missing records',
      description:
        'Paper notebooks get lost, stained, or misplaced. Trying to reconcile cash, bank transfers, and receipts at the end of a busy day often results in unaccounted differences.',
      solution:
        'Fast POS records sales in seconds, tracks payment channels, and keeps an immutable register of transactions.',
    },
    {
      icon: PackageX,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      title: 'Unexpected stockouts & blind spots',
      description:
        'Discovering an essential product is completely out of stock only when a customer asks for it loses you immediate trade and damages customer loyalty.',
      solution:
        'Real-time inventory levels with automated low-stock warnings so you can restock before shelves empty.',
    },
    {
      icon: CreditCard,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
      title: 'Untracked customer debts & disputes',
      description:
        'Allowing credit without structured ledgers causes forgotten balances, missed repayment deadlines, and awkward disagreements with regular customers.',
      solution:
        'Structured customer credit balances, payment history tracking, and clear installment logging.',
    },
    {
      icon: TrendingDown,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
      title: 'Limited visibility into true profit',
      description:
        'A full cash drawer at sundown can be misleading if unrecorded operating costs like generator fuel, rent, transport, and staff stipends go unmeasured.',
      solution:
        'Log everyday expenses alongside sales to understand your true estimated margins and business health.',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600">
            Real Trade Challenges
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            The everyday record problems holding back your business
          </p>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Running a busy retail or wholesale store is demanding. TraderERP was built to replace disorganized paper notebooks and memory with straightforward, reliable records.
          </p>
        </div>

        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {problems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 flex flex-col justify-between hover:border-slate-300 transition-all shadow-2xs hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className={`p-3 rounded-xl border ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200/70 bg-white -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-6 sm:p-8 rounded-b-2xl">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm text-slate-700 font-medium">
                      <strong className="text-slate-900 font-semibold">How TraderERP helps: </strong>
                      {item.solution}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Responsible Notice */}
        <div className="mt-10 p-4 rounded-xl bg-slate-100 border border-slate-200 text-center text-xs text-slate-500 max-w-2xl mx-auto">
          TraderERP provides tools to help organize trade data and support informed management decisions. Actual results depend on consistent record-keeping and business practices.
        </div>
      </div>
    </section>
  );
}
