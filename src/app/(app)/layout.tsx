import React from 'react';
import AppLayoutWrapper from '@/components/layout/AppLayoutWrapper';
import BusinessGuard from '@/components/auth/BusinessGuard';
import SessionActivityGuard from '@/components/auth/SessionActivityGuard';
import { createClient } from '@/lib/supabase/server';
import { DEMO_BUSINESS_ID } from '@/lib/auth/context';

export const metadata = {
  title: 'TraderERP — Business Management',
  description: 'Simple, professional inventory, sales, expenses, and credit tracking for traders.',
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let businessId = user?.app_metadata?.business_id;

  if (!businessId && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    businessId = DEMO_BUSINESS_ID;
  }

  let businessName = '';
  if (businessId) {
    if (businessId === DEMO_BUSINESS_ID) {
      businessName = 'Apex Merchants Ltd';
    } else {
      const { data: biz } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .maybeSingle();
      businessName = biz?.name || '';
    }
  }

  return (
    <BusinessGuard>
      <SessionActivityGuard />
      <AppLayoutWrapper businessName={businessName}>
        {children}
      </AppLayoutWrapper>
    </BusinessGuard>
  );
}
