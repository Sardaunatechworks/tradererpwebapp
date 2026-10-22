import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/marketing/Navbar';
import HeroSection from '@/components/marketing/HeroSection';
import ProblemsSection from '@/components/marketing/ProblemsSection';
import FeaturesSection from '@/components/marketing/FeaturesSection';
import HowItWorksSection from '@/components/marketing/HowItWorksSection';
import BenefitsSection from '@/components/marketing/BenefitsSection';
import TrustPrivacySection from '@/components/marketing/TrustPrivacySection';
import FaqSection from '@/components/marketing/FaqSection';
import Footer from '@/components/marketing/Footer';

export const metadata: Metadata = {
  title: 'TraderERP — Run Your Business With More Confidence | Retail & Wholesale Management',
  description:
    'Manage your sales, stock, expenses, and customer records in one place. TraderERP helps retailers, wholesalers, and small-business owners keep better records and understand performance.',
  keywords: [
    'TraderERP',
    'POS Nigeria',
    'retail management software',
    'inventory tracking Nigeria',
    'customer debt ledger',
    'wholesale trade software',
    'small business ERP Nigeria',
    'supermarket POS',
  ],
  authors: [{ name: 'Sardauna Tech Lab Ltd' }],
  alternates: {
    canonical: 'https://www.smarttradererp.com.ng',
  },
  openGraph: {
    title: 'TraderERP — Run Your Business With More Confidence',
    description:
      'Track sales, stock, expenses, and customer debts in one unified place. Built for retailers, wholesalers, and small business owners.',
    url: 'https://www.smarttradererp.com.ng',
    siteName: 'TraderERP',
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TraderERP — Run Your Business With More Confidence',
    description:
      'Manage your sales, stock, expenses, and customer records in one place.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function LandingPage() {
  let isLoggedIn = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // If Supabase is unreachable or unconfigured during SSR, safely default to logged out
    isLoggedIn = false;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Sticky Header */}
      <Navbar isLoggedIn={isLoggedIn} />

      {/* Main Content Modules */}
      <main className="flex-1">
        {/* A. Hero Section with Authentic Preview */}
        <HeroSection isLoggedIn={isLoggedIn} />

        {/* B. Core Business Problems Addressed */}
        <ProblemsSection />

        {/* C. Verified Feature Breakdown */}
        <FeaturesSection />

        {/* D. How It Works - 3-Step Setup */}
        <HowItWorksSection />

        {/* E. Practical Operational Benefits */}
        <BenefitsSection />

        {/* F. Data Ownership & Trust */}
        <TrustPrivacySection />

        {/* G. Detailed FAQ */}
        <FaqSection />
      </main>

      {/* Footer & Final Call to Action */}
      <Footer isLoggedIn={isLoggedIn} />
    </div>
  );
}
