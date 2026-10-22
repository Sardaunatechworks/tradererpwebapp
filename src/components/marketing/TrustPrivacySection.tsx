import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Download, Trash2, ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function TrustPrivacySection() {
  const trustPoints = [
    {
      icon: Lock,
      title: 'Tenant Boundary Isolation',
      desc: 'Every business is isolated using database Row-Level Security (RLS) policies. Other businesses cannot query or modify your records.',
    },
    {
      icon: ShieldCheck,
      title: 'No Data Monetization',
      desc: 'We never sell, trade, or monetize your store catalog, customer contacts, or financial figures with advertisers or third parties.',
    },
    {
      icon: Download,
      title: 'Self-Service Data Export',
      desc: 'Your trade history belongs to you. Export your sales and customer lists to CSV or download personal account data from Settings anytime.',
    },
    {
      icon: Trash2,
      title: 'Account & Deletion Controls',
      desc: 'Submit an account deletion or data removal request directly within your Settings dashboard in accordance with our transparent privacy policies.',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto rounded-3xl border border-slate-200 bg-slate-900 text-white p-8 sm:p-12 shadow-xl relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-700/80 text-xs font-semibold text-blue-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Security &amp; Data Governance</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Honest privacy and verifiable record security
            </h2>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              We know your business transactions, product costs, and customer debts are private. TraderERP is engineered with strict multi-tenant database protection and transparent policy rules.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
              {trustPoints.map((tp, idx) => {
                const Icon = tp.icon;
                return (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2.5 text-blue-400">
                      <Icon className="w-4 h-4 shrink-0" />
                      <h3 className="text-sm font-bold text-white">{tp.title}</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {tp.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
              <span>Read our formal legal terms and consumer privacy commitments:</span>
              <div className="flex items-center gap-3">
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Privacy Policy</span>
                </Link>
                <span>•</span>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Terms of Service</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
