import React from 'react';
import ProductList from '@/components/inventory/ProductList';

export const metadata = {
  title: 'Inventory & Stock — TraderERP',
  description: 'Manage products, selling prices, minimum stock alerts, and track physical inventory counts.',
};

export default function InventoryPage() {
  return <ProductList />;
}
