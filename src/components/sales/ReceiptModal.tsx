'use client';

import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';

export interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  sale: {
    id: string;
    sale_number: string;
    created_at: string;
    subtotal: number;
    discount?: number;
    total_amount: number;
    amount_paid: number;
    balance_due: number;
    payment_status: string;
    payment_method?: string;
    customer_name?: string;
    items?: Array<{
      product_name_snapshot: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
  };
}

export default function ReceiptModal({
  isOpen,
  onClose,
  businessName = 'TraderERP Merchant',
  businessPhone,
  businessAddress,
  sale,
}: ReceiptModalProps) {
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity print:hidden"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Controls (hidden on print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Sale Successful</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div id="printable-receipt" className="p-4 bg-white overflow-y-auto font-mono text-xs text-slate-800 space-y-3">
          {/* Header */}
          <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 font-sans">
              {businessName}
            </h2>
            {businessAddress && <p className="text-[11px] text-slate-500">{businessAddress}</p>}
            {businessPhone && <p className="text-[11px] text-slate-500">Tel: {businessPhone}</p>}
            <p className="text-[10px] text-slate-400 pt-1">
              Receipt #{sale.sale_number}
            </p>
            <p className="text-[10px] text-slate-400">
              {formatDateTime(sale.created_at)}
            </p>
          </div>

          {/* Customer info */}
          {sale.customer_name && (
            <div className="text-[11px] flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold">{sale.customer_name}</span>
            </div>
          )}

          {/* Items Table */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between font-bold text-[10px] text-slate-400 uppercase">
              <span>Item & Qty</span>
              <span>Amount</span>
            </div>
            {sale.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs py-0.5">
                <div>
                  <p className="font-medium text-slate-900">{item.product_name_snapshot}</p>
                  <p className="text-[10px] text-slate-400">
                    {item.quantity} x {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount && sale.discount > 0 ? (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
              <span>Total:</span>
              <span>{formatCurrency(sale.total_amount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Paid ({sale.payment_method || 'Cash'}):</span>
              <span>{formatCurrency(sale.amount_paid)}</span>
            </div>
            {sale.balance_due > 0 ? (
              <div className="flex justify-between font-bold text-red-600 pt-0.5">
                <span>Balance Due:</span>
                <span>{formatCurrency(sale.balance_due)}</span>
              </div>
            ) : null}
          </div>

          {/* Footer Note */}
          <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
            <p>Thank you for your patronage!</p>
            <p>Goods sold in good condition are non-refundable.</p>
          </div>
        </div>

        {/* Action Buttons (hidden on print) */}
        <div className="pt-3 border-t border-slate-100 flex gap-2 print:hidden">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            className="flex-1"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}
