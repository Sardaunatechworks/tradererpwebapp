'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Product, Customer, PaymentMethod } from '@/types';
import { getProducts } from '@/app/actions/inventory';
import { getCustomers, createCustomer } from '@/app/actions/customers';
import { createSale } from '@/app/actions/sales';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import ReceiptModal from '@/components/sales/ReceiptModal';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export default function NewSalePage() {
  const router = useRouter();

  // Catalog & Customer data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Cart & Transaction State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Submission & Receipt
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Quick Customer Creation Modal
  const [isNewCustomerModal, setIsNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Initial Load
  useEffect(() => {
    async function loadInitial() {
      setLoadingCatalog(true);
      const [prodRes, custRes] = await Promise.all([
        getProducts({ status: 'active' }),
        getCustomers(),
      ]);
      if (prodRes.data) setProducts(prodRes.data);
      if (custRes.data) setCustomers(custRes.data);
      setLoadingCatalog(false);
    }
    loadInitial();
  }, []);

  // Filter products by search
  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      (p.sku && p.sku.toLowerCase().includes(s))
    );
  });

  // Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const numDiscount = Math.max(0, parseFloat(discount) || 0);
  const total = Math.max(0, subtotal - numDiscount);

  // Default amountPaid to total whenever cart total changes, unless user edited it
  const numAmountPaid = amountPaid === '' ? total : Math.max(0, parseFloat(amountPaid) || 0);
  const balanceDue = Math.max(0, total - numAmountPaid);

  let paymentStatus: 'paid' | 'partial' | 'credit' = 'paid';
  if (balanceDue > 0 && numAmountPaid > 0) paymentStatus = 'partial';
  else if (balanceDue > 0 && numAmountPaid === 0) paymentStatus = 'credit';

  // Add Product to Cart
  const addToCart = (product: Product) => {
    if (product.current_stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.selling_price,
        },
      ];
    });
  };

  // Adjust Quantity in Cart
  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const max = item.product.current_stock;
          return { ...item, quantity: Math.min(qty, max) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Quick Customer Save
  const handleQuickSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const formData = new FormData();
    formData.append('name', newCustName.trim());
    formData.append('phone', newCustPhone.trim());

    const res = await createCustomer(formData);
    if (res.data) {
      setCustomers((prev) => [...prev, res.data!]);
      setSelectedCustomerId(res.data.id);
      setIsNewCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
    }
  };

  // Complete Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setError('Please add at least one product to the sale.');
      return;
    }

    if (balanceDue > 0 && !selectedCustomerId) {
      setError('Please select a customer for credit / partial payment sales.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const items = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    const res = await createSale({
      customerId: selectedCustomerId || null,
      items,
      paymentMethod,
      amountPaid: numAmountPaid,
      discount: numDiscount,
      notes,
    });

    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      const custObj = customers.find((c) => c.id === selectedCustomerId);
      setCompletedSale({
        ...res.data,
        subtotal,
        discount: numDiscount,
        total_amount: total,
        amount_paid: numAmountPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
        payment_method: paymentMethod.toUpperCase(),
        customer_name: custObj?.name,
        items: cart.map((i) => ({
          product_name_snapshot: i.product.name,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          subtotal: i.quantity * i.unitPrice,
        })),
      });
      setIsReceiptOpen(true);
      setCart([]);
      setAmountPaid('');
      setDiscount('0');
      setNotes('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/sales"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Record New Sale</h1>
            <p className="text-xs text-slate-500">Fast checkout and point-of-sale invoicing</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left Catalog / Right Checkout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card padding="sm">
            <Input
              placeholder="Search products by name or SKU to add to cart..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </Card>

          {/* Product grid / list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const inCart = cart.find((i) => i.product.id === p.id);
              const isOut = p.current_stock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => !isOut && addToCart(p)}
                  className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                    isOut
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : inCart
                      ? 'bg-blue-50/40 border-slate-900 shadow-2xs cursor-pointer'
                      : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-2xs cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-slate-900 line-clamp-1">{p.name}</p>
                      {inCart && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                          {inCart.quantity} in cart
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{p.sku || 'No SKU'}</p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="font-bold text-sm text-slate-900">
                      {formatCurrency(p.selling_price)}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        isOut ? 'text-red-500 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {isOut ? 'Out of Stock' : `${p.current_stock} left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Cart & Payment (5 cols) */}
        <div id="checkout-cart-panel" className="lg:col-span-5 space-y-4">
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  Sale Items ({cart.length})
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Click on products on the left to add items to this sale.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50"
                  >
                    <div className="overflow-hidden max-w-[160px]">
                      <p className="font-semibold text-xs text-slate-900 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatCurrency(item.unitPrice)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.current_stock}
                        className="p-1 rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-xs text-slate-900">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-[10px] text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Customer Selection */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Customer</label>
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModal(true)}
                  className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  + Add New
                </button>
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Walk-in Customer (Instant Cash)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">Discount (₦):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-24 text-right px-2 py-1 border border-slate-300 rounded-md text-xs font-semibold"
                />
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount:</span>
                <span className="text-base text-slate-900">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Payment Channel</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['cash', 'bank_transfer', 'pos', 'other'] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 px-1 text-center rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer border ${
                      paymentMethod === m
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Paid & Balance Due */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">Amount Paid (₦)</label>
                <div className="flex gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setAmountPaid(total.toString())}
                    className="text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    Full (₦{total})
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setAmountPaid('0')}
                    className="text-red-600 hover:underline font-bold cursor-pointer"
                  >
                    Credit (₦0)
                  </button>
                </div>
              </div>
              <input
                type="number"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={total.toString()}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
              />

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Balance Due:</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                    {formatCurrency(balanceDue)}
                  </span>
                  <Badge
                    variant={
                      paymentStatus === 'paid'
                        ? 'success'
                        : paymentStatus === 'partial'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {paymentStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0 || submitting}
              isLoading={submitting}
              onClick={handleCompleteSale}
            >
              Complete Sale & Print Receipt
            </Button>
          </Card>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isNewCustomerModal}
        onClose={() => setIsNewCustomerModal(false)}
        title="Add Customer"
        description="Quickly save customer contact details for this transaction"
        maxWidth="sm"
      >
        <form onSubmit={handleQuickSaveCustomer} className="space-y-4">
          <Input
            label="Customer Name"
            placeholder="e.g. Alhaji Sani"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            required
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="e.g. 08031234567"
            value={newCustPhone}
            onChange={(e) => setNewCustPhone(e.target.value)}
          />
          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewCustomerModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Customer</Button>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            router.push('/sales');
          }}
          sale={completedSale}
        />
      )}

      {/* Floating Mobile Cart Bar when items are selected */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 inset-x-3 z-30 animate-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('checkout-cart-panel');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full bg-slate-900 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between border border-slate-700/80 active:scale-98 transition-all cursor-pointer ring-2 ring-white/20"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
              <div className="text-left">
                <p className="text-[10px] uppercase font-semibold text-slate-300 leading-none">Cart Total</p>
                <p className="text-sm font-black text-white mt-0.5">{formatCurrency(total)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span>View Cart & Pay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
