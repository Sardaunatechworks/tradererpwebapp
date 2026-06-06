'use client';

import React, { useState } from 'react';
import { createProduct, restockInventory, adjustInventory, updateBranchPrice } from '@/app/actions/inventory';
import { Plus, Edit3, ShieldAlert, SlidersHorizontal, Loader2, ArrowRight } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

interface Props {
  initialProducts: any[];
  branches: any[];
  inventory: any[];
  branchPrices: any[];
  role: string;
}

export default function InventoryManagement({ initialProducts, branches, inventory, branchPrices, role }: Props) {
  const { currentBranchId } = useUIStore();
  const isScoped = role === 'MANAGER' || role === 'STAFF';
  const visibleBranches = isScoped
    ? branches.filter(b => b.id === currentBranchId)
    : branches;

  const [products, setProducts] = useState(initialProducts);
  const [filterText, setFilterText] = useState('');
  
  // Modals state
  const [showAddProd, setShowAddProd] = useState(false);
  const [showAdjustStock, setShowAdjustStock] = useState(false);
  const [showOverridePrice, setShowOverridePrice] = useState(false);

  // Selected contexts for stock adjust / price override
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  
  const [adjustVal, setAdjustVal] = useState<number>(0);
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'restock' | 'adjustment'>('restock');

  const [priceVal, setPriceVal] = useState<string>('0');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProductInfo, setCreatedProductInfo] = useState<any>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(filterText.toLowerCase()) ||
    p.sku.toLowerCase().includes(filterText.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(filterText.toLowerCase()))
  );

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createProduct(formData);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      const initialBranchId = formData.get('initialBranchId') as string;
      const initialStock = parseInt(formData.get('initialStock') as string || '0');
      setCreatedProductInfo({
        name: formData.get('name') as string,
        sku: formData.get('sku') as string,
        initialStock,
        branchName: branches.find(b => b.id === initialBranchId)?.name || 'Main Branch'
      });
      setLoading(false);
    }
  };

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let res;
    if (adjustType === 'restock') {
      res = await restockInventory(selectedBranch.id, selectedProduct.id, adjustVal, adjustNotes);
    } else {
      res = await adjustInventory(selectedBranch.id, selectedProduct.id, adjustVal, adjustNotes);
    }

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setShowAdjustStock(false);
      setLoading(false);
      window.location.reload();
    }
  };

  const handleOverridePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await updateBranchPrice(selectedBranch.id, selectedProduct.id, parseFloat(priceVal || '0'));

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setShowOverridePrice(false);
      setLoading(false);
      window.location.reload();
    }
  };

  const getStock = (pId: string, bId: string) => {
    const item = inventory.find(i => i.product_id === pId && i.branch_id === bId);
    return item ? item.quantity : 0;
  };

  const getPrice = (pId: string, bId: string, defaultPrice: number) => {
    const item = branchPrices.find(bp => bp.product_id === pId && bp.branch_id === bId);
    return item ? item.price : defaultPrice;
  };

  const isPricingOverridden = (pId: string, bId: string) => {
    return branchPrices.some(bp => bp.product_id === pId && bp.branch_id === bId);
  };

  const canManage = role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER';

  return (
    <div className="space-y-6">
      
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search SKU, name, category..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-4 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-500"
          />
        </div>

        {canManage && (
          <button
            onClick={() => {
              setError(null);
              setShowAddProd(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </div>

      {/* Main Inventory Catalog */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Product Details</th>
                <th className="py-4 px-6">Catalog Prices</th>
                {visibleBranches.map(b => (
                  <th key={b.id} className="py-4 px-6 text-center border-l border-slate-800">{b.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={2 + visibleBranches.length} className="py-12 text-center text-slate-500">
                    No products found in catalog.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-900/20 text-slate-300">
                    <td className="py-4 px-6 space-y-1">
                      <span className="text-white font-bold block">{prod.name}</span>
                      <span className="font-mono text-[10px] text-blue-500 block">SKU: {prod.sku}</span>
                      {prod.category && (
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded inline-block mt-1">
                          {prod.category}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 space-y-1">
                      <div className="flex justify-between max-w-[140px]"><span className="text-slate-500">Default:</span> <span className="text-white">₦{prod.default_price.toFixed(2)}</span></div>
                      <div className="flex justify-between max-w-[140px]"><span className="text-slate-500">Cost:</span> <span className="text-slate-400">₦{prod.cost_price.toFixed(2)}</span></div>
                    </td>
                    {visibleBranches.map(b => {
                      const qty = getStock(prod.id, b.id);
                      const finalPrice = getPrice(prod.id, b.id, prod.default_price);
                      const isOverridden = isPricingOverridden(prod.id, b.id);

                      return (
                        <td key={b.id} className="py-4 px-6 border-l border-slate-800 text-center space-y-2">
                          {/* Stock Level */}
                          <div className="flex items-center justify-center gap-2">
                            <span className={`text-sm font-bold ${qty === 0 ? 'text-red-500' : qty <= 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {qty} units
                            </span>
                            {canManage && (
                              <button
                                onClick={() => {
                                  setSelectedProduct(prod);
                                  setSelectedBranch(b);
                                  setAdjustVal(qty);
                                  setAdjustNotes('');
                                  setAdjustType('restock');
                                  setError(null);
                                  setShowAdjustStock(true);
                                }}
                                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Pricing context */}
                          <div className="flex items-center justify-center gap-1.5 text-[10px]">
                            <span className={`${isOverridden ? 'text-amber-500 font-semibold' : 'text-slate-500'}`}>
                              ₦{finalPrice.toFixed(2)}
                            </span>
                            {canManage && (
                              <button
                                onClick={() => {
                                  setSelectedProduct(prod);
                                  setSelectedBranch(b);
                                  setPriceVal(finalPrice.toString());
                                  setError(null);
                                  setShowOverridePrice(true);
                                }}
                                className="text-slate-600 hover:text-amber-500 transition-colors cursor-pointer"
                              >
                                <SlidersHorizontal className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD PRODUCT */}
      {showAddProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            {createdProductInfo ? (
              <div className="text-center space-y-5 py-4 animate-in fade-in zoom-in duration-200">
                <div className="w-16 h-16 bg-emerald-600/10 border border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-lg shadow-emerald-500/10">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white leading-none">Product Added Successfully!</h3>
                  <p className="text-xs text-slate-400">
                    Product <strong className="text-white">"{createdProductInfo.name}"</strong> (SKU: {createdProductInfo.sku}) has been successfully added to your catalog.
                  </p>
                  <p className="text-xs text-slate-400 bg-slate-950/40 border border-slate-800 p-2.5 rounded-lg inline-block">
                    Allocated <strong className="text-emerald-400">{createdProductInfo.initialStock} units</strong> of stock to <strong className="text-white">{createdProductInfo.branchName}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProd(false);
                    setCreatedProductInfo(null);
                    window.location.reload();
                  }}
                  className="w-full bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg hover:bg-emerald-700 transition-all cursor-pointer shadow-md shadow-emerald-950/20"
                >
                  Great, Refresh Catalog
                </button>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-bold text-white leading-none">Create Catalog Product</h3>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Applies globally across branches</span>
                </div>
                
                <form onSubmit={handleAddProduct} className="space-y-4">
                  {error && (
                    <div className="bg-red-950/40 border border-red-800 rounded-xl p-3 text-xs text-red-400 font-medium">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Product SKU</label>
                      <input
                        name="sku"
                        type="text"
                        required
                        placeholder="e.g. SKU-PRO-01"
                        className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Category</label>
                      <input
                        name="category"
                        type="text"
                        placeholder="e.g. Beverages"
                        className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Product Name</label>
                    <input
                      name="name"
                      type="text"
                      required
                      placeholder="e.g. Coca-Cola 35cl"
                      className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Selling Price (₦)</label>
                      <input
                        name="defaultPrice"
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="0.00"
                        className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Cost Price (₦)</label>
                      <input
                        name="costPrice"
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="0.00"
                        className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Available in Stock</label>
                      <input
                        name="initialStock"
                        type="number"
                        min="0"
                        required
                        defaultValue="0"
                        className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Initial Stock Branch</label>
                      <select
                        name="initialBranchId"
                        required
                        className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium cursor-pointer appearance-none"
                      >
                        {visibleBranches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddProd(false)}
                      className="border border-slate-800 hover:bg-slate-950 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all cursor-pointer"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST STOCK */}
      {showAdjustStock && selectedProduct && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Modify Stock level</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">{selectedProduct.name} @ {selectedBranch.name}</span>
            </div>

            <form onSubmit={handleAdjustStockSubmit} className="space-y-4">
              <div className="space-y-3">
                <label className="block text-[10px] uppercase font-bold text-slate-400">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('restock')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      adjustType === 'restock' 
                        ? 'bg-blue-600/10 border-blue-500 text-blue-500' 
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    Restock (Add)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('adjustment')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      adjustType === 'adjustment' 
                        ? 'bg-blue-600/10 border-blue-500 text-blue-500' 
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    Set Quantity
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                  {adjustType === 'restock' ? 'Quantity to Add' : 'Target Quantity'}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={adjustVal}
                  onChange={(e) => setAdjustVal(parseInt(e.target.value || '0'))}
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Adjustment Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly restocking"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustStock(false)}
                  className="border border-slate-800 hover:bg-slate-950 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: OVERRIDE PRICE */}
      {showOverridePrice && selectedProduct && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 text-slate-100 shadow-2xl animate-in zoom-in duration-250">
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Branch Price Override</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">{selectedProduct.name} @ {selectedBranch.name}</span>
            </div>

            <form onSubmit={handleOverridePriceSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Branch Selling Price (₦)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={priceVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                      setPriceVal(val);
                    }
                  }}
                  className="block w-full border border-slate-800 bg-slate-950 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowOverridePrice(false)}
                  className="border border-slate-800 hover:bg-slate-950 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
