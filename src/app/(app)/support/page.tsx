import React from 'react';
import { getTenantTickets } from '@/app/actions/support';
import SupportCenter from '@/components/support/SupportCenter';

export const metadata = {
  title: 'Support Center – TraderERP',
  description: 'Submit and track system tickets with help desk support.',
};

export default async function SupportPage() {
  const tickets = await getTenantTickets();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white tracking-tight leading-none">Support Center</h2>
        <p className="text-xs text-slate-500 mt-2">
          Create, track, and manage support cases for your business outlet workspace.
        </p>
      </div>

      <SupportCenter initialTickets={tickets} />
    </div>
  );
}
