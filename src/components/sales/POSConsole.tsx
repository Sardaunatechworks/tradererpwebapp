'use client';

import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { createSale } from '@/app/actions/sales';
import { ShoppingCart, Search, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { db, type LocalSale } from '@/lib/offline/db';

interface Props {
  products: any[];
  branches: any[];
  inventory: any[];
  branchPrices: any[];
  customers: any[];
}

export default function POSConsole({ products, branches, inventory, branchPrices, customers }: Props) {
  const { currentBranchId } = useUIStore();

  // Active branch context for the transaction
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Search and Cart
  const [searchText, setSearchText] = useState('');
  const [cart, setCart] = useState<{ product: any; quantity: number; price: number; stock: number }[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Local state fallbacks for offline support
  const [localProducts, setLocalProducts] = useState<any[]>(products);
  const [localInventory, setLocalInventory] = useState<any[]>(inventory);
  const [localCustomers, setLocalCustomers] = useState<any[]>(customers);

  // Sync cache on load
  useEffect(() => {
    const cacheData = async () => {
      try {
        if (products.length > 0) {
          await db.products.clear();
          await db.products.bulkPut(products.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            default_price: parseFloat(p.default_price || '0'),
            business_id: p.business_id
          })));
          setLocalProducts(products);
        } else {
          const cached = await db.products.toArray();
          setLocalProducts(cached);
        }

        if (inventory.length > 0) {
          await db.inventory.clear();
          await db.inventory.bulkPut(inventory.map(i => ({
            product_id: i.product_id,
            branch_id: i.branch_id,
            quantity: parseInt(i.quantity || '0'),
            business_id: i.business_id
          })));
          setLocalInventory(inventory);
        } else {
          const cached = await db.inventory.toArray();
          setLocalInventory(cached);
        }

        if (customers.length > 0) {
          await db.customers.clear();
          await db.customers.bulkPut(customers.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email || undefined,
            phone: c.phone || undefined,
            branch_id: c.branch_id || 'all',
            business_id: c.business_id,
            total_spend: parseFloat(c.total_spend || '0')
          })));
          setLocalCustomers(customers);
        } else {
          const cached = await db.customers.toArray();
          setLocalCustomers(cached);
        }
      } catch (err) {
        console.error('POSConsole local cache error:', err);
      }
    };
    cacheData();
  }, [products, inventory, customers]);

  // Sync branch selection from global UI context if specific
  useEffect(() => {
    if (currentBranchId && currentBranchId !== 'all') {
      setSelectedBranchId(currentBranchId);
    } else if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [currentBranchId, branches, selectedBranchId]);

  const activeBranch = branches.find(b => b.id === selectedBranchId);

  // Get stock for product at active branch
  const getProductStock = (pId: string) => {
    const item = localInventory.find(i => i.product_id === pId && i.branch_id === selectedBranchId);
    return item ? item.quantity : 0;
  };

  // Get price for product at active branch
  const getProductPrice = (p: any) => {
    const override = branchPrices.find(bp => bp.product_id === p.id && bp.branch_id === selectedBranchId);
    return override ? override.price : p.default_price;
  };

  // Filter products by search text and verify they are stocked (quantity > 0)
  const searchResults = searchText.trim() === '' ? [] : localProducts.filter(p => {
    const stock = getProductStock(p.id);
    const matchesSearch = p.name.toLowerCase().includes(searchText.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch && stock > 0;
  });

  const addToCart = (product: any) => {
    setError(null);
    setSuccess(null);

    const stock = getProductStock(product.id);
    const price = getProductPrice(product);

    if (stock <= 0) {
      setError('Product is out of stock.');
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.id === product.id);

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > stock) {
        setError(`Cannot add more. Insufficient stock (Only ${stock} available).`);
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { product, quantity: 1, price, stock }]);
    }
    setSearchText(''); // Reset search input
  };

  const updateCartQuantity = (index: number, val: number) => {
    setError(null);
    if (val <= 0) {
      removeFromCart(index);
      return;
    }
    const item = cart[index];
    if (val > item.stock) {
      setError(`Only ${item.stock} units of ${item.product.name} are available in stock.`);
      return;
    }
    const newCart = [...cart];
    newCart[index].quantity = val;
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError('Shopping cart is empty.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const itemsParam = cart.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity
    }));

    // Intercept Offline Mode
    if (typeof window !== 'undefined' && !navigator.onLine) {
      try {
        const offlineSaleId = `OFFLINE-${crypto.randomUUID().slice(0, 8)}`;
        
        // 1. Deduct local cached inventory quantities
        for (const item of cart) {
          await db.inventory
            .where({ product_id: item.product.id, branch_id: selectedBranchId })
            .modify(i => {
              i.quantity = Math.max(0, i.quantity - item.quantity);
            });
        }

        // 2. Load the updated cached inventory snapshot
        const updatedInventory = await db.inventory.toArray();
        setLocalInventory(updatedInventory);

        // 3. Save sale record locally in Dexie
        const localSale: LocalSale = {
          id: offlineSaleId,
          branch_id: selectedBranchId,
          customer_id: selectedCustomerId || null,
          payment_method: paymentMethod,
          items: itemsParam,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        await db.pending_sales.add(localSale);

        // 4. Register creation event in sync queue
        await db.sync_queue.add({
          type: 'SALE_CREATED',
          payload: localSale,
          status: 'queued',
          created_at: new Date().toISOString()
        });

        setSuccess(`Offline sale captured! Transaction queued. Invoice ID: #${offlineSaleId}`);
        setCart([]);
        setSelectedCustomerId('');
        setPaymentMethod('cash');
        setLoading(false);
      } catch (err: any) {
        setError(`Failed to save offline sale: ${err.message}`);
        setLoading(false);
      }
      return;
    }

    const res = await createSale(
      selectedBranchId,
      selectedCustomerId || null,
      paymentMethod,
      itemsParam
    );

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setSuccess(`Sale successfully completed! Invoice ID: #${res.saleId}`);
      setCart([]);
      setSelectedCustomerId('');
      setPaymentMethod('cash');
      setLoading(false);
      // Wait, let's refresh page state in background to update local counts
      routerRefreshDelayed();
    }
  };

  const routerRefreshDelayed = () => {
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const subtotal = calculateSubtotal();
  const total = subtotal;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* LEFT COLUMN: PRODUCT SEARCH & CART CONFIGURATION (ColSpan 2) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Branch Context Info Alert */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Billing Outlet</span>
            <span className="text-white text-sm font-semibold block mt-1">
              {activeBranch ? activeBranch.name : 'No branch selected'}
            </span>
          </div>

          {currentBranchId === 'all' && (
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setCart([]); // Clear cart when switching branch contexts
              }}
              className="bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Product Search Console */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 relative">
          <div>
            <h3 className="text-sm font-bold text-white leading-none">Search Products</h3>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Add items to billing cart</span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Type product SKU or name..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg pl-10 pr-4 py-2.5 text-xs outline-none focus:border-blue-500 transition-all font-medium placeholder-slate-600"
            />
            <Search className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Search Dropdown Results */}
          {searchText.trim() !== '' && (
            <div className="absolute left-6 right-6 bg-slate-900 border border-slate-800 rounded-xl mt-1 shadow-2xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-800 animate-in slide-in-from-top-1 duration-200">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No stocked items match query.
                </div>
              ) : (
                searchResults.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => addToCart(prod)}
                    className="w-full text-left p-3 hover:bg-slate-800 flex justify-between items-center transition-colors cursor-pointer text-xs font-semibold"
                  >
                    <div>
                      <span className="text-white block">{prod.name}</span>
                      <span className="font-mono text-[9px] text-slate-500">SKU: {prod.sku}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white block">₦{getProductPrice(prod).toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-500">{getProductStock(prod.id)} in stock</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Shopping Cart List */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white leading-none">Billing Cart</h3>
            <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-bold">
              {cart.reduce((acc, item) => acc + item.quantity, 0)} items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-medium">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      Cart is empty. Use product search above.
                    </td>
                  </tr>
                ) : (
                  cart.map((item, index) => (
                    <tr key={item.product.id} className="hover:bg-slate-900/10 text-slate-300">
                      <td className="py-3 px-4">
                        <span className="text-white font-bold block">{item.product.name}</span>
                        <span className="font-mono text-[9px] text-slate-500">SKU: {item.product.sku}</span>
                      </td>
                      <td className="py-3 px-4 text-white">
                        ₦{item.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(index, item.quantity - 1)}
                            className="w-5 h-5 bg-slate-900 border border-slate-800 text-slate-400 rounded hover:bg-slate-800 transition-colors flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-white text-xs font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(index, item.quantity + 1)}
                            className="w-5 h-5 bg-slate-900 border border-slate-800 text-slate-400 rounded hover:bg-slate-800 transition-colors flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white font-bold">
                        ₦{(item.price * item.quantity).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeFromCart(index)}
                          className="text-slate-600 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: CUSTOMER CONTEXT & SALE CHECKOUT (ColSpan 1) */}
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white leading-none">Checkout Summary</h3>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Finalize payment parameters</span>
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-4 text-xs text-emerald-400 font-medium flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Customer Selector */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Customer CRM profile</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="block w-full border border-slate-800 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Walk-in Customer (Guest)</option>
              {localCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || 'No phone'})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              {[
                { id: 'cash', label: 'Cash' },
                { id: 'card', label: 'Card' },
                { id: 'bank_transfer', label: 'Bank Transfer' },
                { id: 'store_credit', label: 'Store Credit' }
              ].map(method => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`py-2 px-3 rounded-lg border transition-all text-center cursor-pointer truncate ${
                    paymentMethod === method.id 
                      ? 'bg-blue-600/10 border-blue-500 text-blue-500' 
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Calculations */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs font-medium">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>₦{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Taxes & Fees (VAT):</span>
              <span>₦0.00</span>
            </div>
            <div className="border-t border-slate-800 pt-2.5 flex justify-between text-white font-bold text-sm">
              <span>Total Price:</span>
              <span>₦{total.toFixed(2)}</span>
            </div>
          </div>

          {/* checkout submit */}
          <button
            type="submit"
            disabled={loading || cart.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/10 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" /> Confirm Sale
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  );
}
