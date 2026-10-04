'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  ShoppingCart,
  Printer,
  Ban,
  Eye,
  Calendar,
} from 'lucide-react';
import { Sale } from '@/types';
import { getSales, cancelSale } from '@/app/actions/sales';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import ReceiptModal from '@/components/sales/ReceiptModal';

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Receipt Modal
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    const res = await getSales({
      search,
      paymentStatus: statusFilter,
    });
    if (res.data) setSales(res.data);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleCancelSale = async (sale: Sale) => {
    if (sale.status === 'cancelled') return;
    const confirmCancel = confirm(
      `Are you sure you want to cancel sale #${sale.sale_number}? Stock will be restored automatically.`
    );
    if (confirmCancel) {
      const reason = prompt('Please enter a cancellation reason:') || 'Customer cancellation';
      const res = await cancelSale(sale.id, reason);
      if (res.error) {
        alert(res.error);
      } else {
        fetchSales();
      }
    }
  };

  const handleOpenReceipt = (sale: Sale) => {
    setSelectedSaleForReceipt({
      ...sale,
      customer_name: sale.customer?.name,
      items: sale.items?.map((i) => ({
        product_name_snapshot: i.product_name_snapshot,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
      })),
    });
    setIsReceiptOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Transactions"
        description="View past receipts, filter credit sales, or record new customer orders."
        action={
          <Link href="/sales/new">
            <Button leftIcon={<Plus className="w-4 h-4" />}>New Sale</Button>
          </Link>
        }
      />

      {/* Search and Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search by sale number (e.g. TR-000001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs">
            {['all', 'paid', 'partial', 'credit'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Sales List Table */}
      {loading ? (
        <LoadingState message="Loading sales records..." />
      ) : sales.length === 0 ? (
        <EmptyState
          title={search ? 'No matching sales found' : 'No sales recorded yet'}
          description={
            search
              ? 'Try searching with another keyword.'
              : 'Record your first sale transaction to generate invoices, update stock, and track revenue.'
          }
          actionLabel={search ? undefined : 'Record First Sale'}
          actionIcon={<Plus className="w-4 h-4" />}
          onAction={() => (window.location.href = '/sales/new')}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Sale Reference</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-right">Balance Due</th>
                  <th className="py-3.5 px-4 text-center">Payment Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale) => {
                  const isCancelled = sale.status === 'cancelled';

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCancelled ? 'opacity-50 line-through bg-slate-50/30' : ''
                      }`}
                    >
                      {/* Reference & Date */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-bold text-slate-900">{sale.sale_number}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {formatDateTime(sale.created_at)}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                        {sale.customer ? (
                          <div>
                            <p className="font-semibold text-slate-900">{sale.customer.name}</p>
                            {sale.customer.phone && (
                              <p className="text-slate-400">{sale.customer.phone}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Walk-in Customer</span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 text-center text-xs font-semibold text-slate-700">
                        {sale.items?.length || 0}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(sale.total_amount)}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 px-4 text-right text-xs">
                        {sale.balance_due > 0 ? (
                          <span className="font-bold text-red-600">
                            {formatCurrency(sale.balance_due)}
                          </span>
                        ) : (
                          <span className="text-slate-400">₦0</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isCancelled ? (
                          <Badge variant="neutral" size="sm">
                            CANCELLED
                          </Badge>
                        ) : (
                          <Badge
                            variant={
                              sale.payment_status === 'paid'
                                ? 'success'
                                : sale.payment_status === 'partial'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                            dot
                          >
                            {sale.payment_status.toUpperCase()}
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenReceipt(sale)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Print / View Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {!isCancelled && (
                            <button
                              onClick={() => handleCancelSale(sale)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Cancel & Reverse Sale"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Printable Receipt Modal */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          sale={selectedSaleForReceipt}
        />
      )}
    </div>
  );
}
