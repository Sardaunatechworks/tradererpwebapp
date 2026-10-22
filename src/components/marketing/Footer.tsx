import React from 'react';
import Link from 'next/link';
import Logo from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Mail, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  isLoggedIn: boolean;
}

export default function Footer({ isLoggedIn }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      {/* Final Call to Action Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-semibold text-blue-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Start Organizing Today</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Ready to run your business with more confidence?
          </h2>

          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Take control of your daily sales, live stock counts, operational expenses, and customer debt balances in one unified place.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto sm:max-w-none">
            <Link
              href={isLoggedIn ? '/dashboard' : '/login?tab=signup'}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-600/30"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                {isLoggedIn ? 'Go to Your Workspace' : 'Get Started Free'}
              </Button>
            </Link>
            {!isLoggedIn && (
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto px-7 py-3.5 border-slate-700 text-slate-200 hover:text-white hover:bg-white/10 font-semibold text-base"
                >
                  Sign In to Account
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/">
              <Logo iconSize="w-9 h-9" showText={true} />
            </Link>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Simple, reliable business management software built specifically for retail and wholesale merchants.
            </p>
            <div className="pt-1 text-xs text-slate-400">
              <span>Website: </span>
              <a
                href="https://www.smarttradererp.com.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-mono"
              >
                smarttradererp.com.ng
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Product Navigation
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <a href="#features" className="hover:text-blue-600 transition-colors">
                  Features Overview
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#benefits" className="hover:text-blue-600 transition-colors">
                  Practical Benefits
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-blue-600 transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Account & Access */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Account &amp; Access
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <Link href="/login" className="hover:text-blue-600 transition-colors">
                  Sign In to Workspace
                </Link>
              </li>
              <li>
                <Link href="/login?tab=signup" className="hover:text-blue-600 transition-colors">
                  Create Business Account
                </Link>
              </li>
              <li>
                <Link href="/forgot-password" className="hover:text-blue-600 transition-colors">
                  Reset Forgotten Password
                </Link>
              </li>
              {isLoggedIn && (
                <li>
                  <Link href="/dashboard" className="text-blue-600 font-semibold hover:underline">
                    Access Dashboard →
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Legal &amp; Support Desk
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-600 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@smarttradererp.com.ng"
                  className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>hello@smarttradererp.com.ng</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} TraderERP. All rights reserved.</p>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Built with care for everyday merchants across Nigeria and Africa.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
