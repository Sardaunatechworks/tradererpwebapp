'use server';

import { createClient } from '@/lib/supabase/server';

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Authentication required.');

  const businessId = user.app_metadata?.business_id;
  if (!businessId) throw new Error('No business workspace context found.');

  return { user, businessId, supabase };
}

function getRangeDates(range: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();

  let start: Date;
  if (range === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === 'yesterday') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  } else if (range === 'week') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === 'month') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    // all time
    start = new Date(2020, 0, 1);
  }

  return { start: start.toISOString(), end };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SALES REPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function getSalesReport(range: string = 'month') {
  try {
    const { businessId, supabase } = await getAuthContext();
    const { start, end } = getRangeDates(range);

    const { data: sales, error } = await supabase
      .from('sales')
      .select('*, customer:customers(name)')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const list = (sales || []).map((s: any) => ({
      ...s,
      total_amount: Number(s.total ?? s.total_amount ?? 0),
    }));
    const totalSales = list.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
    const totalPaid = list.reduce((acc, s) => acc + (Number(s.amount_paid) || 0), 0);
    const totalCredit = list.reduce((acc, s) => acc + (Number(s.balance_due) || 0), 0);
    const count = list.length;
    const averageOrderValue = count > 0 ? totalSales / count : 0;

    const paidCount = list.filter((s) => s.payment_status === 'paid').length;
    const partialCount = list.filter((s) => s.payment_status === 'partial').length;
    const creditCount = list.filter((s) => s.payment_status === 'credit').length;

    return {
      data: {
        totalSales,
        totalPaid,
        totalCredit,
        count,
        averageOrderValue,
        breakdown: { paidCount, partialCount, creditCount },
        sales: list,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to generate sales report.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXPENSES REPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function getExpensesReport(range: string = 'month') {
  try {
    const { businessId, supabase } = await getAuthContext();
    const { start } = getRangeDates(range);
    const startDateStr = start.split('T')[0];

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*, category:expense_categories(id, name)')
      .eq('business_id', businessId)
      .gte('expense_date', startDateStr)
      .order('expense_date', { ascending: false });

    if (error) throw error;

    const list = expenses || [];
    const totalExpenses = list.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    // Group by category
    const categoryMap = new Map<string, { name: string; total: number; count: number }>();
    for (const exp of list) {
      const catName = exp.category?.name || 'General Expense';
      const current = categoryMap.get(catName) || { name: catName, total: 0, count: 0 };
      current.total += Number(exp.amount) || 0;
      current.count += 1;
      categoryMap.set(catName, current);
    }

    const byCategory = Array.from(categoryMap.values()).map((c) => ({
      ...c,
      percentage: totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 100) : 0,
    }));

    return {
      data: {
        totalExpenses,
        count: list.length,
        byCategory,
        expenses: list,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to generate expense report.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. INVENTORY REPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function getInventoryReport() {
  try {
    const { businessId, supabase } = await getAuthContext();

    const { data: products, error } = await supabase
      .from('products')
      .select('*, category:categories(id, name)')
      .eq('business_id', businessId)
      .eq('status', 'active');

    if (error) throw error;

    const list = products || [];
    const totalItems = list.length;
    let totalStockQty = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of list) {
      const stock = Number(p.current_stock) || 0;
      const minStock = Number(p.minimum_stock) || 0;
      const cost = Number(p.purchase_price) || 0;
      const sell = Number(p.selling_price) || 0;

      totalStockQty += stock;
      totalCostValuation += stock * cost;
      totalRetailValuation += stock * sell;

      if (stock === 0) outOfStockCount += 1;
      else if (stock <= minStock) lowStockCount += 1;
    }

    return {
      data: {
        totalItems,
        totalStockQty,
        totalCostValuation,
        totalRetailValuation,
        potentialMargin: totalRetailValuation - totalCostValuation,
        lowStockCount,
        outOfStockCount,
        products: list,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to generate inventory report.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PERFORMANCE REPORT (PROFIT & CREDIT)
// ─────────────────────────────────────────────────────────────────────────────

export async function getPerformanceReport(range: string = 'month') {
  try {
    const { businessId, supabase } = await getAuthContext();
    const { start, end } = getRangeDates(range);
    const startDateStr = start.split('T')[0];

    // Sales + COGS
    const { data: sales } = await supabase
      .from('sales')
      .select('*, items:sale_items(quantity, product:products(purchase_price))')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gte('created_at', start)
      .lte('created_at', end);

    const salesList = (sales as any[]) || [];
    const totalRevenue = salesList.reduce((acc, s) => acc + (Number(s.total ?? s.total_amount ?? 0)), 0);

    let totalCogs = 0;
    for (const s of salesList) {
      if (s.items) {
        for (const item of s.items) {
          const cost = Number(item.product?.purchase_price) || 0;
          totalCogs += cost * (Number(item.quantity) || 1);
        }
      }
    }

    // Expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('business_id', businessId)
      .gte('expense_date', startDateStr);

    const totalExpenses = (expenses || []).reduce(
      (acc, e) => acc + (Number(e.amount) || 0),
      0
    );

    // Outstanding Credit
    const { data: creditSales } = await supabase
      .from('sales')
      .select('balance_due')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gt('balance_due', 0);

    const totalCreditDue = (creditSales || []).reduce(
      (acc, s) => acc + (Number(s.balance_due) || 0),
      0
    );

    const grossEstimatedProfit = totalRevenue - totalCogs;
    const netEstimatedProfit = grossEstimatedProfit - totalExpenses;

    return {
      data: {
        totalRevenue,
        totalCogs,
        grossEstimatedProfit,
        totalExpenses,
        netEstimatedProfit,
        totalCreditDue,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to generate performance report.' };
  }
}
