import React from 'react';
import DashboardOverview from '@/components/dashboard/DashboardOverview';

export const metadata = {
  title: 'Dashboard — TraderERP',
  description: 'Real-time overview of sales, operating expenses, estimated profit, and stock alerts.',
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
