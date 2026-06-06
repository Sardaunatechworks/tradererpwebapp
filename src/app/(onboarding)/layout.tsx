import React from 'react';

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
      {children}
    </div>
  );
}
