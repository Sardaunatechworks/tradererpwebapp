'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart, PackagePlus, Receipt, UserPlus, X } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export default function QuickActionModal() {
  const { quickActionOpen, setQuickActionOpen } = useUIStore();

  if (!quickActionOpen) return null;

  const actions = [
    {
      title: 'New Sale',
      description: 'Record an in-store transaction or customer invoice',
      href: '/sales/new',
      icon: ShoppingCart,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    },
    {
      title: 'Add Product',
      description: 'Add a new product with stock and pricing',
      href: '/inventory/new',
      icon: PackagePlus,
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    },
    {
      title: 'Add Expense',
      description: 'Record operating expenses or vendor payouts',
      href: '/expenses/new',
      icon: Receipt,
      color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    },
    {
      title: 'Add Customer',
      description: 'Register a regular or credit customer profile',
      href: '/customers/new',
      icon: UserPlus,
      color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setQuickActionOpen(false)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-10 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
            <p className="text-xs text-slate-500">Choose what you want to record</p>
          </div>
          <button
            onClick={() => setQuickActionOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setQuickActionOpen(false)}
                className={`flex flex-col p-4 rounded-xl border transition-all text-left ${item.color}`}
              >
                <div className="p-2.5 rounded-lg bg-white/80 w-fit mb-3 shadow-2xs">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm text-slate-900">{item.title}</span>
                <span className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {item.description}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
