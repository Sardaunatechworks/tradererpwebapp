import React from 'react';
import AppLayoutWrapper from '@/components/layout/AppLayoutWrapper';
import BranchGuard from '@/components/auth/BranchGuard';
import SessionActivityGuard from '@/components/auth/SessionActivityGuard';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const metadata = {
  title: 'TraderERP Workspace',
  description: 'Manage branches, inventory, and sales transactions.',
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
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .maybeSingle();
    businessName = biz?.name || '';
  }

  return (
    <AppLayoutWrapper businessName={businessName}>
      <SessionActivityGuard />
      <BranchGuard>
        {children}
      </BranchGuard>
    </AppLayoutWrapper>
  );
}
