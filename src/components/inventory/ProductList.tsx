'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Package,
  ArrowUpDown,
  Filter,
  AlertTriangle,
  History,
  Archive,
  RefreshCw,
  PlusCircle,
  Edit2,
} from 'lucide-react';
import { Product, Category, PRODUCT_UNITS } from '@/types';
import {
  getProducts,
  getCategories,
  createProduct,
  addStock,
  adjustStock,
  toggleArchiveProduct,
  getProductMovements,
} from '@/app/actions/inventory';
import { formatCurrency, formatNumber, formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Stock addition / adjustment modal fields
  const [stockOpType, setStockOpType] = useState<'add' | 'adjust'>('add');
  const [stockQty, setStockQty] = useState('');
  const [stockNotes, setStockNotes] = useState('');

  // Movements state
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Load products
  const fetchProductData = async () => {
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      getProducts({
        search,
        categoryId: selectedCategory,
        status: statusFilter,
      }),
      getCategories(),
    ]);

    if (prodRes.data) setProducts(prodRes.data);
    if (catRes.data) setCategories(catRes.data);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductData();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, statusFilter]);

  // Handle Add Product Submit
  const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createProduct(formData);
    setSubmitting(false);

    if (res.error) {
      setFormError(res.error);
    } else {
      setIsAddModalOpen(false);
      fetchProductData();
    }
  };

  // Handle Stock Operation Submit
  const handleStockOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setSubmitting(true);
    setFormError(null);

    const qty = parseInt(stockQty, 10);
    if (isNaN(qty) || qty < 0) {
      setFormError('Please enter a valid quantity.');
      setSubmitting(false);
      return;
    }

    let res;
    if (stockOpType === 'add') {
      res = await addStock(selectedProduct.id, qty, undefined, stockNotes);
    } else {
      res = await adjustStock(selectedProduct.id, qty, stockNotes || 'Inventory count reconciliation');
    }

    setSubmitting(false);
    if (res.error) {
      setFormError(res.error);
    } else {
      setIsStockModalOpen(false);
      setStockQty('');
      setStockNotes('');
      fetchProductData();
    }
  };

  // Handle View Movements
  const handleOpenMovements = async (product: Product) => {
    setSelectedProduct(product);
    setIsMovementsModalOpen(true);
    setLoadingMovements(true);
    const res = await getProductMovements(product.id);
    if (res.data) setMovements(res.data);
    setLoadingMovements(false);
  };

  // Handle Archive / Restore
  const handleToggleArchive = async (productId: string) => {
    if (confirm('Are you sure you want to update this product’s active status?')) {
      await toggleArchiveProduct(productId);
      fetchProductData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Products & Inventory"
        description="Monitor stock quantities, track unit pricing, and record stock-ins."
        action={
          <Button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Product
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <Card padding="sm" className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status toggle */}
            <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('archived')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === 'archived'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Archived
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Product Table / List */}
      {loading ? (
        <LoadingState message="Loading inventory catalog..." />
      ) : products.length === 0 ? (
        <EmptyState
          title={search ? 'No matching products' : 'No products in inventory'}
          description={
            search
              ? 'Try refining your search keyword or clearing filters.'
              : 'Add your first product to start tracking stock, recording sales, and generating invoices.'
          }
          actionLabel={search ? undefined : 'Add First Product'}
          actionIcon={<Plus className="w-4 h-4" />}
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Product Details</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-right">Purchase Price</th>
                  <th className="py-3.5 px-4 text-center">Stock Level</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isOutOfStock = p.current_stock === 0;
                  const isLowStock = p.current_stock > 0 && p.current_stock <= p.minimum_stock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product Name & SKU */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          {p.sku && <span>SKU: {p.sku}</span>}
                          {p.unit && <span>• {p.unit}</span>}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                        {p.category?.name || 'General'}
                      </td>

                      {/* Prices */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(p.selling_price)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-slate-500">
                        {formatCurrency(p.purchase_price)}
                      </td>

                      {/* Stock Level Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-slate-900 text-sm">
                            {formatNumber(p.current_stock)}
                          </span>
                          {isOutOfStock ? (
                            <Badge variant="danger" size="sm" dot>
                              Out of Stock
                            </Badge>
                          ) : isLowStock ? (
                            <Badge variant="warning" size="sm" dot>
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm" dot>
                              In Stock
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setStockOpType('add');
                              setStockQty('');
                              setStockNotes('');
                              setIsStockModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                            title="Add or Adjust Stock"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Stock</span>
                          </button>

                          <button
                            onClick={() => handleOpenMovements(p)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Movement History"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleArchive(p.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title={p.status === 'active' ? 'Archive Product' : 'Restore Product'}
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-100">
            {products.map((p) => {
              const isOutOfStock = p.current_stock === 0;
              const isLowStock = p.current_stock > 0 && p.current_stock <= p.minimum_stock;

              return (
                <div key={p.id} className="p-4 space-y-3 bg-white">
                  {/* Top: Name, SKU, Category, and Stock Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 tracking-tight leading-snug">
                        {p.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-700">
                          {p.category?.name || 'General'}
                        </span>
                        {p.sku && <span>SKU: {p.sku}</span>}
                        {p.unit && <span>• {p.unit}</span>}
                      </div>
                    </div>

                    <div>
                      {isOutOfStock ? (
                        <Badge variant="danger" size="sm" dot>
                          0 in stock
                        </Badge>
                      ) : isLowStock ? (
                        <Badge variant="warning" size="sm" dot>
                          {p.current_stock} left
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm" dot>
                          {p.current_stock} in stock
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Middle: Price & Margin Details */}
                  <div className="flex items-baseline justify-between pt-1 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400">Selling: </span>
                      <span className="font-extrabold text-base text-slate-900">
                        {formatCurrency(p.selling_price)}
                      </span>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      Cost: <strong>{formatCurrency(p.purchase_price)}</strong>
                    </div>
                  </div>

                  {/* Bottom: Fast Touch Action Buttons */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedProduct(p);
                        setStockOpType('add');
                        setStockQty('');
                        setStockNotes('');
                        setIsStockModalOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Adjust Stock</span>
                    </button>

                    <button
                      onClick={() => handleOpenMovements(p)}
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                      title="Stock Movements"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleArchive(p.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
                      title={p.status === 'active' ? 'Archive Product' : 'Restore'}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
         ADD PRODUCT MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Product"
        description="Enter product details, unit pricing, and initial stock."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Product Name"
            name="name"
            placeholder="e.g. Dangote Sugar 50kg"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU / Item Code"
              name="sku"
              placeholder="e.g. SUG-001"
              helperText="Unique product identifier"
            />
            <Select
              label="Category"
              name="categoryId"
              options={[
                { value: '', label: 'General' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Unit of Measure"
              name="unit"
              defaultValue="pcs"
              options={[...PRODUCT_UNITS]}
              required
            />
            <Input
              label="Selling Price (₦)"
              name="sellingPrice"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              required
            />
            <Input
              label="Cost / Purchase Price (₦)"
              name="purchasePrice"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Initial / Opening Stock"
              name="initialStock"
              type="number"
              min="0"
              defaultValue="0"
              helperText="Creates an opening stock movement"
            />
            <Input
              label="Low Stock Warning Level"
              name="minimumStock"
              type="number"
              min="0"
              defaultValue="5"
              helperText="Alerts when current stock drops to this"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* ──────────────────────────────────────────────────────────────────────────
         STOCK IN / ADJUSTMENT MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={selectedProduct ? `Stock Operations: ${selectedProduct.name}` : 'Stock Operation'}
        description={`Current in stock: ${selectedProduct?.current_stock ?? 0} ${selectedProduct?.unit || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleStockOperation} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          {/* Operation type tab */}
          <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setStockOpType('add')}
              className={`flex-1 py-2 rounded-md font-semibold transition-colors cursor-pointer ${
                stockOpType === 'add'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Add Stock (+ In)
            </button>
            <button
              type="button"
              onClick={() => setStockOpType('adjust')}
              className={`flex-1 py-2 rounded-md font-semibold transition-colors cursor-pointer ${
                stockOpType === 'adjust'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Manual Count / Adjustment
            </button>
          </div>

          {stockOpType === 'add' ? (
            <Input
              label="Quantity to Add"
              type="number"
              min="1"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
              placeholder="e.g. 20"
              required
              helperText={`Will increase total stock to ${(selectedProduct?.current_stock || 0) + (parseInt(stockQty, 10) || 0)}`}
            />
          ) : (
            <Input
              label="New Reconciled Stock Total"
              type="number"
              min="0"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
              placeholder="e.g. 15"
              required
              helperText="Set exact physical count verified in store"
            />
          )}

          <Input
            label="Reason / Notes"
            placeholder={
              stockOpType === 'add'
                ? 'e.g. Received new shipment from Kano depot'
                : 'e.g. Damaged inventory during handling'
            }
            value={stockNotes}
            onChange={(e) => setStockNotes(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStockModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {stockOpType === 'add' ? 'Confirm Stock Addition' : 'Apply Adjustment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ──────────────────────────────────────────────────────────────────────────
         MOVEMENTS HISTORY MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isMovementsModalOpen}
        onClose={() => setIsMovementsModalOpen(false)}
        title={selectedProduct ? `Stock Audit: ${selectedProduct.name}` : 'Movement History'}
        description="Chronological log of all additions, sales, and adjustments"
        maxWidth="lg"
      >
        {loadingMovements ? (
          <LoadingState message="Fetching movement history..." />
        ) : movements.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No logged stock movements found for this product.
          </p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {movements.map((m) => {
              const isPositive = m.quantity > 0;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {m.movement_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(m.created_at)}
                      </span>
                    </div>
                    {m.notes && <p className="text-xs text-slate-500 mt-0.5">{m.notes}</p>}
                  </div>
                  <div
                    className={`text-sm font-extrabold ${
                      isPositive ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {isPositive ? `+${m.quantity}` : m.quantity}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
