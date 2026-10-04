import React from 'react';
import StaffList from '@/components/staff/StaffList';

export const metadata = {
  title: 'Staff Management — TraderERP',
  description: 'Manage employee accounts, permission levels, and staff access.',
};

export default function StaffPage() {
  return <StaffList />;
}
