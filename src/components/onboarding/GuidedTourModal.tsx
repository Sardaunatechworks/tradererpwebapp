'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Sparkles,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { saveTourCompletion } from '@/app/actions/privacy';

export interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  userName?: string;
}

interface TourStep {
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  actionHint?: string;
  quickLink?: { href: string; label: string };
}

export default function GuidedTourModal({
  isOpen,
  onClose,
  userRole = 'owner',
  userName = 'Partner',
}: GuidedTourModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TourStep[] = [
    {
      title: 'Welcome to TraderERP',
      badge: 'Welcome',
      description:
        'Manage your sales, stock, expenses, and customer debt records all in one place. TraderERP is built specifically for Nigerian traders and retailers.',
      icon: Sparkles,
      accentColor: 'bg-blue-600 text-white',
      actionHint: 'Take a quick 1-minute walkthrough to discover how the platform works.',
    },
    {
      title: 'Dashboard: Business Activity at a Glance',
      badge: 'Step 1 of 7',
      description:
        'Monitor your daily, weekly, or monthly performance in real-time. See sales totals, operating expenses, estimated gross profit, and uncollected debtor credit without complicated accounting.',
      icon: LayoutDashboard,
      accentColor: 'bg-slate-900 text-white',
      actionHint: 'Your command center for everyday trade metrics.',
    },
    {
      title: 'Sales POS: Fast Checkout & Printed Invoices',
      badge: 'Step 2 of 7',
      description:
        'Ring up walk-in or credit sales in seconds. Support cash, bank transfers, POS cards, or credit. Automatically deducts sold stock and generates itemized sales receipts.',
      icon: ShoppingCart,
      accentColor: 'bg-emerald-600 text-white',
      quickLink: { href: '/sales/new', label: 'Open POS Checkout' },
    },
    {
      title: 'Inventory: Track Products & Low Stock Alerts',
      badge: 'Step 3 of 7',
      description:
        'Keep accurate stock counts for all items in your store. Set minimum stock alert thresholds so you get warned before popular goods run out.',
      icon: Package,
      accentColor: 'bg-indigo-600 text-white',
      quickLink: { href: '/inventory/new', label: 'Add a Product' },
    },
    {
      title: 'Expenses: Keep Track of Store Overheads',
      badge: 'Step 4 of 7',
      description:
        'Record everyday shop running costs such as shop rent, electricity, generator fuel, transport, and staff wages. This ensures your estimated profit reflects actual money made.',
      icon: Receipt,
      accentColor: 'bg-amber-600 text-white',
      quickLink: { href: '/expenses/new', label: 'Record an Expense' },
    },
    {
      title: 'Customer Credit Ledger: Never Lose Debt Track',
      badge: 'Step 5 of 7',
      description:
        'Track regular customer balances and know exactly who owes your store money. Log partial payments and credit collections with one click.',
      icon: CreditCard,
      accentColor: 'bg-rose-600 text-white',
      quickLink: { href: '/credit', label: 'View Debt Ledger' },
    },
    {
      title: 'Reports: Clear Financial Summaries',
      badge: 'Step 6 of 7',
      description:
        'Review business trends over time. Filter sales and expenses by date range, export CSV spreadsheets, or print formatted financial reports for your records.',
      icon: BarChart3,
      accentColor: 'bg-purple-600 text-white',
      quickLink: { href: '/reports', label: 'Explore Reports' },
    },
    {
      title: 'Profile & Settings: Total Data Control',
      badge: 'Step 7 of 7',
      description:
        'Update your personal profile, customize your receipt headers, or visit Privacy & Data to download your data archive or manage consent preferences.',
      icon: Settings,
      accentColor: 'bg-blue-600 text-white',
      quickLink: { href: '/settings?tab=profile', label: 'Open Settings' },
    },
  ];

  // Filter out settings step for staff if not applicable
  const availableSteps = userRole === 'staff' ? steps.slice(0, 7) : steps;
  const isLastStep = currentStep === availableSteps.length - 1;

  const handleFinish = useCallback(async () => {
    localStorage.setItem('tradererp_tour_completed', 'true');
    try {
      await saveTourCompletion(true);
    } catch (e) {
      console.error('Could not save tour completion to DB:', e);
    }
    onClose();
  }, [onClose]);

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, isLastStep, handleFinish]);

  if (!isOpen) return null;

  const step = availableSteps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={handleFinish}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-lg w-full p-6 sm:p-8 z-10 animate-in zoom-in-95 duration-200 flex flex-col justify-between space-y-6"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {step.badge}
          </span>
          <button
            onClick={handleFinish}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Skip tour"
            aria-label="Skip tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl shadow-xs shrink-0 ${step.accentColor}`}>
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <h2 id="tour-modal-title" className="text-xl font-extrabold text-slate-900 tracking-tight">
                {step.title}
              </h2>
              {currentStep === 0 && (
                <p className="text-xs text-slate-500 mt-0.5">Hello, {userName}!</p>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>

          {step.actionHint && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
              {step.actionHint}
            </div>
          )}

          {step.quickLink && (
            <div className="pt-1">
              <Link
                href={step.quickLink.href}
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <span>Jump straight to {step.quickLink.label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Progress Bar & Indicators */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Step {currentStep + 1} of {availableSteps.length}
            </span>
            <div className="flex items-center gap-1.5">
              {availableSteps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStep
                      ? 'w-6 bg-slate-900'
                      : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleFinish}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Skip for now
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                >
                  Back
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                rightIcon={
                  isLastStep ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )
                }
              >
                {currentStep === 0 ? 'Start Tour' : isLastStep ? 'Get Started' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
