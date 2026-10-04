import React from 'react';
import SessionActivityGuard from '@/components/auth/SessionActivityGuard';

export const metadata = {
  title: 'TraderERP — Business Setup',
  description: 'Initialize your business workspace.',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <SessionActivityGuard />
      {children}
    </div>
  );
}
