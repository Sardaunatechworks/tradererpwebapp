import React from 'react';
import AppLayoutWrapper from '@/components/layout/AppLayoutWrapper';
import BusinessGuard from '@/components/auth/BusinessGuard';
import SessionActivityGuard from '@/components/auth/SessionActivityGuard';
import { createClient } from '@/lib/supabase/server';

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
  const businessId = user?.app_metadata?.business_id;

  let businessName = '';
  if (businessId) {
    const { data: biz } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .maybeSingle();
    businessName = biz?.name || '';
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
