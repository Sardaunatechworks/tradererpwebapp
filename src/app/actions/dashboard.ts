'use server';

import { createClient } from '@/lib/supabase/server';
import { Sale, Product } from '@/types';

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Authentication required.');

  const businessId = user.app_metadata?.business_id;
  if (!businessId) throw new Error('No business workspace found.');

  return { user, businessId, supabase };
}

export interface DashboardData {
  period: 'today' | 'week' | 'month';
  salesTotal: number;
  salesCount: number;
  expensesTotal: number;
  estimatedProfit: number;
  outstandingCredit: number;
  lowStockProducts: Product[];
  recentSales: Sale[];
  userName: string;
  businessName: string;
}

export async function getDashboardData(
  period: 'today' | 'week' | 'month' = 'today'
): Promise<{ data?: DashboardData; error?: string }> {
  try {
    const { user, businessId, supabase } = await getAuthContext();

    // 1. Determine Start Date based on period
    const now = new Date();
    let startDate: string;

    if (period === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = today.toISOString();
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = weekAgo.toISOString();
    } else {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = monthAgo.toISOString();
    }

    const startDateStr = startDate.split('T')[0];

    // 2. Fetch Sales within period with sale_items for COGS calculation
    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select('*, customer:customers(id, name), items:sale_items(cost_price, quantity, subtotal)')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gte('created_at', startDate);

    if (salesErr) throw salesErr;

    const salesList = (sales as any[]) || [];
    const salesTotal = salesList.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
    const salesCount = salesList.length;

    // Calculate COGS (Cost of Goods Sold)
    let totalCogs = 0;
    for (const s of salesList) {
      if (s.items && Array.isArray(s.items)) {
        for (const item of s.items) {
          totalCogs += (Number(item.cost_price) || 0) * (Number(item.quantity) || 1);
        }
      }
    }

    // 3. Fetch Expenses within period
    const { data: expenses, error: expErr } = await supabase
      .from('expenses')
      .select('amount')
      .eq('business_id', businessId)
      .gte('expense_date', startDateStr);

    if (expErr) throw expErr;

    const expensesTotal = (expenses || []).reduce(
      (acc, e) => acc + (Number(e.amount) || 0),
      0
    );

    // 4. Estimated Profit = Sales - COGS - Expenses
    const estimatedProfit = salesTotal - totalCogs - expensesTotal;

    // 5. Total Outstanding Credit across all active sales
    const { data: creditSales, error: creditErr } = await supabase
      .from('sales')
      .select('balance_due')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gt('balance_due', 0);

    if (creditErr) throw creditErr;

    const outstandingCredit = (creditSales || []).reduce(
      (acc, s) => acc + (Number(s.balance_due) || 0),
      0
    );

    // 6. Low stock products (current_stock <= minimum_stock)
    const { data: allActiveProducts } = await supabase
      .from('products')
      .select('*, category:categories(id, name)')
      .eq('business_id', businessId)
      .eq('status', 'active');

    const lowStockProducts = (allActiveProducts || [])
      .filter((p: any) => p.current_stock <= p.minimum_stock)
      .slice(0, 6);

    // 7. Recent 6 sales
    const { data: recentSales } = await supabase
      .from('sales')
      .select('*, customer:customers(id, name), items:sale_items(id)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(6);

    // 8. Business Name & User Name
    const { data: biz } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .maybeSingle();

    const userName =
      user.user_metadata?.name || user.email?.split('@')[0] || 'Business Owner';
    const businessName = biz?.name || 'My Business';

    return {
      data: {
        period,
        salesTotal,
        salesCount,
        expensesTotal,
        estimatedProfit,
        outstandingCredit,
        lowStockProducts: lowStockProducts as Product[],
        recentSales: (recentSales as Sale[]) || [],
        userName,
        businessName,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to aggregate dashboard data.' };
  }
}
