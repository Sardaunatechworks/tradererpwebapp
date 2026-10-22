import React from 'react';
import {
  FolderCheck,
  PackageCheck,
  Wallet,
  Receipt,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

export default function BenefitsSection() {
  const benefits = [
    {
      icon: FolderCheck,
      title: 'Organized trade records in one place',
      description:
        'Eliminates lost sales slips and confusing ledger books. Search past customer purchases, receipts, and date records instantly whenever a question arises.',
    },
    {
      icon: PackageCheck,
      title: 'Reliable stock clarity without manual counting',
      description:
        'Know what is on your shelves at any moment. Receive timely low-stock notices so you can replenish popular goods before running completely empty.',
    },
    {
      icon: Wallet,
      title: 'Better control of customer debts',
      description:
        'Keep customer credit balances clearly documented. Log partial installment payments systematically, reducing uncollected balances and awkward billing disagreements.',
    },
    {
      icon: Receipt,
      title: 'Real awareness of daily running expenses',
      description:
        'Track daily generator fuel, market levies, and transport costs alongside your sales to see what is truly left as gross earnings.',
    },
    {
      icon: ShieldCheck,
      title: 'Safe delegation to shop staff',
      description:
        'Cashiers and attendants can record sales and issue receipts without being able to view your supplier cost prices or total store profit margins.',
    },
    {
      icon: Smartphone,
      title: 'Accessible across phones, tablets & laptops',
      description:
        'Use TraderERP from your smartphone, tablet, or desktop computer using any standard web browser without special hardware requirements.',
    },
  ];

  return (
    <section id="benefits" className="py-16 sm:py-24 bg-slate-50 border-t border-slate-200/80 scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14 sm:mb-20">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600">
            Everyday Practical Benefits
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How organized record-keeping helps your business
          </p>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            TraderERP does not make wild promises of automatic riches. It provides practical, dependable operational clarity so you can manage your shop with structure and discipline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 w-fit mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{b.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {b.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
