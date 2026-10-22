'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Mail } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default

  const faqs: FaqItem[] = [
    {
      question: 'What is TraderERP and what does it do?',
      answer:
        'TraderERP is an everyday web-based enterprise management tool built specifically for retail and wholesale business owners. It lets you ring up customer sales on a quick POS screen, issue printed receipts, track physical stock quantities with low-stock warnings, log operating expenses (like fuel and rent), and maintain a structured ledger of customer credit and repayments.',
    },
    {
      question: 'Who is TraderERP designed for?',
      answer:
        'TraderERP is tailored for supermarket operators, provision merchants, boutique owners, pharmacy and chemist attendants, electronics dealers, building material suppliers, food commodity distributors, and small-to-medium retail outlets. It is designed for merchants who want clean, dependable records without navigating complex corporate accounting jargon.',
    },
    {
      question: 'How do I create an account and get started?',
      answer:
        'Click "Get Started" on the homepage. Enter your name, phone number, email address, and a secure password. Once registered, a quick setup wizard prompts you for your business name, trade category, and store location. You can then immediately start adding inventory and recording sales.',
    },
    {
      question: 'Which features are currently available in TraderERP?',
      answer:
        'Current verified features include: Point of Sale (POS) checkout with cash/bank transfer tracking and printable receipts, real-time inventory management with low-stock reorder alerts, operating expense recording, customer directory with debt and repayment logging, financial performance reports with gross margin calculations, staff role access control (Owner, Admin, Staff), and account privacy settings.',
    },
    {
      question: 'Can I use TraderERP on my mobile phone as well as on a computer?',
      answer:
        'Yes. TraderERP is fully responsive and operates on smartphones, tablets, laptops, and desktop computers. It runs inside standard modern web browsers (such as Chrome, Safari, and Edge) with an optimized mobile interface including a touch-friendly drawer and quick action buttons.',
    },
    {
      question: 'How does account privacy, data ownership, and account deletion work?',
      answer:
        'Your trade data belongs strictly to you. Each business workspace is isolated in the database using Row-Level Security (RLS) policies. We do not sell your customer contacts or transaction data. You can download an export of your personal data or submit an account deletion request directly through the Settings page at any time.',
    },
    {
      question: 'How do I obtain customer support if I need assistance?',
      answer:
        'You can reach our dedicated support desk directly via email at hello@smarttradererp.com.ng or through the in-app support channels. Our team is available to assist with onboarding, inventory setup, or account inquiries.',
    },
  ];

  const toggleFaq = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 bg-slate-50 border-t border-slate-200/80 scroll-mt-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-xs font-semibold text-blue-700">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Straightforward answers to the most common questions about TraderERP, its capabilities, and account policies.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white transition-all overflow-hidden shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-blue-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg">{faq.question}</span>
                  <div
                    className={`p-1.5 rounded-full bg-slate-100 text-slate-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 bg-blue-50 text-blue-600' : ''
                      }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-in fade-in-50 duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Help Box */}
        <div className="mt-12 p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900">Have a question not listed here?</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Our team is glad to answer questions about system features, receipt printing, or multi-branch requirements.
          </p>
          <div className="pt-1">
            <a
              href="mailto:hello@smarttradererp.com.ng"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              <Mail className="w-4 h-4" />
              <span>Contact hello@smarttradererp.com.ng</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
