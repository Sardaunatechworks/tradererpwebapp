import React from 'react';
import Link from 'next/link';
import Logo from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — TraderERP',
  description: 'Terms of Service and conditions for using TraderERP business management software.',
};

export default function TermsOfServicePage() {
  const lastUpdated = 'October 2026';
  const termsVersion = 'v1.0';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <Link href="/">
            <Logo iconSize="w-9 h-9" showText={true} />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Sign In
              </Button>
            </Link>
            <Link href="/login?tab=signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 px-4 sm:px-8 max-w-4xl mx-auto w-full">
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 sm:p-12 space-y-10">
          
          <div className="border-b border-slate-100 pb-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
              <FileText className="w-4 h-4" />
              <span>Terms of Service ({termsVersion})</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              TraderERP Terms of Service
            </h1>
            <p className="text-sm text-slate-500">
              Effective date: <span className="font-medium text-slate-700">{lastUpdated}</span> • Applicable to business owners, staff cashiers, and enterprise operators.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              By registering an account, creating a business workspace, or logging into TraderERP, you agree to these Terms of Service and our Privacy Policy. If you are registering on behalf of a business, enterprise, or retail merchant, you represent that you possess the authority to bind that business entity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Service Description</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              TraderERP provides cloud-based software tools for Point of Sale (POS) receipts, inventory management, customer credit ledgers, operating expense tracking, and sales reporting for Nigerian small-and-medium enterprises (SMEs).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Account Security and Responsibilities</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. Business owners are responsible for assigning appropriate roles (Owner, Admin, Staff) to employees and promptly deactivating accounts of departed staff.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Business Records and Multi-Tenant Isolation</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Each business workspace operates inside a dedicated multi-tenant boundary protected by database Row Level Security. Commercial records created by cashiers and managers (such as completed sales, inventory adjustments, and receipts) belong to the business workspace. Individual user deletion does not alter historical financial records of the business.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Acceptable Use Policy</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              You agree not to use TraderERP for fraudulent financial bookkeeping, deceptive customer credit claims, distribution of malicious payloads, or attempted breach of platform boundaries. Violations may result in suspension or termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">6. Termination and Account Deletion</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Users may request account deletion at any time through the Privacy &amp; Data section under Settings. Deletion requests are processed through an auditable workflow that respects statutory commercial record retention laws in Nigeria.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">7. Contact Information</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Questions regarding these Terms should be directed to <a href="mailto:contact@smarttradererp.com.ng" className="text-blue-600 underline">contact@smarttradererp.com.ng</a>.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 sm:px-8 text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} TraderERP Nigeria. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-slate-700 font-semibold hover:underline">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
