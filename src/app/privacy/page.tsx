import React from 'react';
import Link from 'next/link';
import Logo from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText, Database, Users, HelpCircle, Mail } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — TraderERP',
  description:
    'Learn how TraderERP collects, stores, protects, and manages your personal and business data.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'October 2026';
  const policyVersion = 'v1.0';

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
          
          {/* Header section */}
          <div className="border-b border-slate-100 pb-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
              <ShieldCheck className="w-4 h-4" />
              <span>TraderERP Privacy Notice ({policyVersion})</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Privacy Policy & Data Transparency
            </h1>
            <p className="text-sm text-slate-500">
              Last updated: <span className="font-medium text-slate-700">{lastUpdated}</span> • Applies to all registered business owners, managers, and cashiers using TraderERP in Nigeria.
            </p>
          </div>

          {/* Quick Summary Alert Box */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Summary in Plain Language</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              TraderERP is designed for Nigerian traders, shop owners, and retailers. We collect only what is necessary to run your business workspace—such as your account details, product stock, sales transactions, customer debtor ledgers, and operating expenses. We do not sell your personal or business data. You can inspect your records, download a copy of your personal data, or submit an account deletion request at any time.
            </p>
          </div>

          {/* Section 1: Information Collected */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>1. Information We Collect</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Depending on how you use TraderERP, we collect and process the following categories of information:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-600">
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1.5">
                <span className="font-bold text-slate-800">Account Credentials & Profile</span>
                <p>Full name, email address, phone number, encrypted password hash, and assigned business role (Owner, Admin, Manager, Staff).</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1.5">
                <span className="font-bold text-slate-800">Business Workspace Information</span>
                <p>Registered business name, trade category, store branch locations, official contact phone, receipt header address, and local operating currency (NGN).</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1.5">
                <span className="font-bold text-slate-800">Commercial & Trade Operations</span>
                <p>Products, stock levels, sales checkout history, printed invoice snapshots, expense records, and customer credit ledger balances.</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1.5">
                <span className="font-bold text-slate-800">Technical Logs & Consents</span>
                <p>Login timestamps, device browser user-agents, IP addresses used for authentication security, and audit logs of critical financial mutations.</p>
              </div>
            </div>
          </section>

          {/* Section 2: Why We Collect Data */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <span>2. Why We Collect and Process Your Data</span>
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
              <li>
                <strong>To provide retail & POS operations:</strong> Generating sales receipts, adjusting stock quantities upon sale, calculating customer credit balances, and reporting estimated business gross profit.
              </li>
              <li>
                <strong>To safeguard your workspace:</strong> Verifying identity via secure session cookies, preventing unauthorized access, and validating multi-tenant boundaries between separate stores.
              </li>
              <li>
                <strong>To send essential operational communications:</strong> Delivering password reset links, security alerts, and system notices.
              </li>
              <li>
                <strong>With your explicit consent:</strong> Sending optional product tips, feature guides, or trade performance suggestions (you may opt out anytime without penalty).
              </li>
            </ul>
          </section>

          {/* Section 3: Data Storage & Security */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span>3. How Your Data Is Stored and Protected</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              TraderERP is built on enterprise cloud infrastructure hosted on Supabase (PostgreSQL). We implement multi-layered defenses:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
              <li>
                <strong>Row Level Security (RLS):</strong> Every database table enforces PostgreSQL Row Level Security. Users from one business cannot view, mutate, or query records belonging to another business.
              </li>
              <li>
                <strong>Server-Side Authorization:</strong> Sensitive actions (such as product pricing adjustments, staff creation, and password updates) validate user roles on the server before mutating data.
              </li>
              <li>
                <strong>Secure Authentication:</strong> User credentials are protected using industry-standard hashing (bcrypt/Argon2) handled by Supabase Auth. Passwords are never stored in plain text.
              </li>
              <li>
                <strong>Encrypted Transmission:</strong> All browser-to-server communication is encrypted using modern TLS (HTTPS).
              </li>
            </ul>
          </section>

          {/* Section 4: Who Can Access Records */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>4. Who Can Access Your Business Records</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Access is strictly governed by role-based permissions inside your organization:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
              <li>
                <strong>Business Owners & Admins:</strong> Have full oversight over their business workspace, including sales, expenses, staff members, reports, and store settings.
              </li>
              <li>
                <strong>Store Staff & Cashiers:</strong> Are restricted to operational duties: processing sales, looking up product availability, and recording customer credit payments. They cannot alter store ownership or delete other accounts.
              </li>
              <li>
                <strong>TraderERP Platform Administrators:</strong> Platform engineers have access strictly for technical support, infrastructure maintenance, system availability, and security triage.
              </li>
            </ul>
          </section>

          {/* Section 5: Third-Party Service Providers */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>5. Third-Party Service Providers</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We rely on vetted technical infrastructure partners to deliver the platform:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
              <li>
                <strong>Supabase:</strong> For cloud database hosting, real-time replication, and authentication services.
              </li>
              <li>
                <strong>Mailhive / Transactional SMTP:</strong> For delivering system transactional emails (password reset links and security notices).
              </li>
            </ul>
            <p className="text-sm text-slate-600">
              We do <strong>not</strong> sell, rent, or monetize your customer records, transaction histories, or personal data to third-party advertising exchanges.
            </p>
          </section>

          {/* Section 6: Retention & Separation of Personal vs Business Data */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              <span>6. Data Retention & Business Records</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We retain personal account information as long as your account remains active. However, please note the distinction between personal data and shared business data:
            </p>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 space-y-2">
              <span className="font-bold">Important Notice on Shared Business Records:</span>
              <p>
                Under Nigerian commercial, tax, and accounting standards, financial transactions (such as completed sales receipts, inventory movements, customer debt repayments, and operating expenses) form the legal operating history of the business entity. If an individual cashier or manager leaves the business or requests personal account closure, the commercial transactions they recorded remain intact under the business ledger to prevent business financial disruption.
              </p>
            </div>
          </section>

          {/* Section 7: User Rights (Export & Deletion) */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span>7. Your Rights: Access, Export, and Deletion</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              As a user of TraderERP, you possess meaningful control over your personal data:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
              <li>
                <strong>Data Export:</strong> You can download a machine-readable JSON copy of your personal account profile, roles, and registered consents directly from <Link href="/settings" className="text-blue-600 underline font-medium">Settings &gt; Privacy &amp; Data</Link>.
              </li>
              <li>
                <strong>Correction:</strong> You can update your display name, contact phone number, and password at any time in Settings.
              </li>
              <li>
                <strong>Account Deletion:</strong> You can submit an auditable account deletion request from Settings. Requests require password reauthentication to prevent unauthorized deletion.
              </li>
              <li>
                <strong>Consent Management:</strong> You can withdraw consent for optional marketing communications at any time without impacting your access to the ERP platform.
              </li>
            </ul>
          </section>

          {/* Section 8: Legal Basis & Regulatory Flag */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <span>8. Legal Basis & Regulatory Note</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              TraderERP processes personal and commercial data in accordance with Nigerian data protection principles (including the Nigeria Data Protection Act - NDPA). Processing is justified based on contractual necessity to provide business software services, compliance with financial bookkeeping requirements, legitimate business security interests, and explicit consent for optional marketing.
            </p>
            <p className="text-xs text-slate-400 italic">
              Note: Specific statutory retention schedules or formal regulatory registration numbers will be updated upon final review with the product owner and legal adviser.
            </p>
          </section>

          {/* Section 9: Contact Information */}
          <section className="border-t border-slate-100 pt-8 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <span>9. Contact Us Regarding Privacy</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              If you have any questions, concerns, or requests regarding this Privacy Policy or how TraderERP handles your information, please reach out to our team:
            </p>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-700 space-y-1">
              <p><strong>Platform:</strong> TraderERP Nigeria</p>
              <p><strong>Website:</strong> <a href="https://www.smarttradererp.com.ng" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://www.smarttradererp.com.ng</a></p>
              <p><strong>Privacy Email:</strong> <a href="mailto:privacy@smarttradererp.com.ng" className="text-blue-600 underline">privacy@smarttradererp.com.ng</a></p>
              <p><strong>In-App Support:</strong> Use the &quot;Send Feedback&quot; or Support option in your navigation bar.</p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 sm:px-8 text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} TraderERP Nigeria. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-slate-600 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/privacy" className="text-slate-700 font-semibold hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
