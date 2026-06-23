import React from 'react';
import SessionActivityGuard from '@/components/auth/SessionActivityGuard';

export const metadata = {
  title: 'TraderERP Onboarding',
  description: 'Onboard and initialize your business workspace.',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900">
      <SessionActivityGuard />
      {children}
    </div>
  );
}
