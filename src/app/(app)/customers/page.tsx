import React from 'react';
import CustomerList from '@/components/customers/CustomerList';

export const metadata = {
  title: 'Customers — TraderERP',
  description: 'Manage customers and track credit balances.',
};

export default function CustomersPage() {
  return <CustomerList />;
}
