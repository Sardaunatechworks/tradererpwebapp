import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts';
import { ShoppingBag, TrendingUp, AlertCircle, Calendar, Coins } from 'lucide-react';
import { format } from 'date-fns';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const businessId = user?.app_metadata?.business_id;

  if (!businessId || !user) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <div className="space-y-2">
          <p className="text-red-400 font-bold text-sm">No business workspace found.</p>
          <p className="text-xs text-slate-500">Please complete onboarding or log in again.</p>
        </div>
      </div>
    );
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Fetch user profile to check role
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const userRole = user.app_metadata?.role || profile?.role || 'STAFF';

  // Determine if user is restricted to a branch (STAFF or MANAGER)
  let lockedBranchId: string | null = null;
  if (userRole === 'STAFF' || userRole === 'MANAGER') {
    const { data: userBranchData } = await supabaseAdmin
      .from('user_branches')
      .select('branch_id')
      .eq('user_id', user.id)
      .limit(1);

    if (userBranchData && userBranchData.length > 0) {
      lockedBranchId = userBranchData[0].branch_id;
    }
  }

  // Fetch branches mapping
  const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('id, name')
    .eq('business_id', businessId);

  const branchMap = new Map<string, string>();
  branches?.forEach((b) => branchMap.set(b.id, b.name));

  // 1. Fetch metrics & compile totals
  let todayRevenue = 0;
  let todaySalesCount = 0;
  let lowStockCount = 0;
  let todayProfit = 0;
  let sortedMetrics: any[] = [];
  const branchPerfData: any[] = [];

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  if (lockedBranchId) {
    // Branch scoped metrics:
    // A. Today's sales count and revenue for this branch
    const { data: todaySales } = await supabaseAdmin
      .from('sales')
      .select('total_amount')
      .eq('branch_id', lockedBranchId)
      .gte('created_at', `${todayStr}T00:00:00Z`);

    if (todaySales) {
      todaySalesCount = todaySales.length;
      todayRevenue = todaySales.reduce((sum, s) => sum + parseFloat(s.total_amount || '0'), 0);
    }

    // A2. Today's profit for this branch
    const { data: todayItems } = await supabaseAdmin
      .from('sale_items')
      .select('quantity, total_price, products(cost_price), sales!inner(branch_id, created_at)')
      .eq('sales.branch_id', lockedBranchId)
      .gte('sales.created_at', `${todayStr}T00:00:00Z`);

    todayItems?.forEach((item: any) => {
      const price = parseFloat(item.total_price || '0');
      const qty = item.quantity || 0;
      const cost = parseFloat(item.products?.cost_price || '0');
      todayProfit += price - (qty * cost);
    });

    // B. Low stock count for this branch
    const { data: branchInventory } = await supabaseAdmin
      .from('inventory')
      .select('quantity, reorder_level')
      .eq('branch_id', lockedBranchId);

    lowStockCount = branchInventory ? branchInventory.filter(i => i.quantity <= i.reorder_level).length : 0;

    // C. Daily analytics sales history for the past 30 days for this branch
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: salesHistory } = await supabaseAdmin
      .from('sales')
      .select('total_amount, created_at')
      .eq('branch_id', lockedBranchId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    const dailyMap = new Map<string, number>();
    salesHistory?.forEach(s => {
      const day = format(new Date(s.created_at), 'yyyy-MM-dd');
      dailyMap.set(day, (dailyMap.get(day) || 0) + parseFloat(s.total_amount || '0'));
    });

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = format(d, 'yyyy-MM-dd');
      sortedMetrics.push({
        date: dayStr,
        revenue: dailyMap.get(dayStr) || 0
      });
    }

    // D. Only show this branch's performance in the comparison chart
    branchPerfData.push({
      name: branchMap.get(lockedBranchId) || 'My Branch',
      revenue: todayRevenue
    });

  } else {
    // Business wide metrics:
    const { data: dailyMetrics } = await supabaseAdmin
      .from('metrics_daily')
      .select('*')
      .eq('business_id', businessId)
      .order('date', { ascending: false })
      .limit(30);

    const latestMetrics = dailyMetrics && dailyMetrics.length > 0 ? dailyMetrics[0] : null;

    if (latestMetrics) {
      todayRevenue = parseFloat(latestMetrics.revenue || '0');
      todaySalesCount = latestMetrics.sales_count || 0;
      lowStockCount = latestMetrics.low_stock_count || 0;

      if (latestMetrics.branch_performance) {
        Object.entries(latestMetrics.branch_performance).forEach(([bId, rev]) => {
          branchPerfData.push({
            name: branchMap.get(bId) || 'Unknown Branch',
            revenue: parseFloat(rev as string || '0'),
          });
        });
      }
    }

    // Business-wide today's profit calculation
    const { data: todayItems } = await supabaseAdmin
      .from('sale_items')
      .select('quantity, total_price, products(cost_price), sales!inner(created_at)')
      .eq('business_id', businessId)
      .gte('sales.created_at', `${todayStr}T00:00:00Z`);

    todayItems?.forEach((item: any) => {
      const price = parseFloat(item.total_price || '0');
      const qty = item.quantity || 0;
      const cost = parseFloat(item.products?.cost_price || '0');
      todayProfit += price - (qty * cost);
    });

    const reversedMetrics = dailyMetrics ? [...dailyMetrics].reverse() : [];
    sortedMetrics = reversedMetrics.map(m => ({
      date: m.date,
      revenue: parseFloat(m.revenue || '0')
    }));
  }

  // 3. Fetch recent sales list (limit 5)
  let salesQuery = supabaseAdmin
    .from('sales')
    .select('id, total_amount, payment_method, created_at, cashier_id, branches(name), customers(name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (lockedBranchId) {
    salesQuery = salesQuery.eq('branch_id', lockedBranchId);
  }

  const { data: recentSales } = await salesQuery;

  const currency = '₦';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Dashboard Title & Refresh Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight leading-none">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-2">
            Overview of your enterprise performance. (Metrics recompute automatically on sales)
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-semibold text-slate-400">
          <Calendar className="w-4 h-4 text-blue-500" />
          {format(new Date(), 'eeee, d MMMM yyyy')}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Revenue KPI */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Today&apos;s Revenue</span>
            <span className="text-2xl font-black text-white block">
              {currency}{todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Profit KPI */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Today&apos;s Profit</span>
            <span className={`text-2xl font-black block ${todayProfit < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {currency}{todayProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
            todayProfit < 0 
              ? 'bg-rose-600/10 border-rose-500/20 text-rose-500' 
              : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500'
          }`}>
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Total Sales count KPI */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Today&apos;s Sales</span>
            <span className="text-2xl font-black text-white block">
              {todaySalesCount}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock KPI */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Low Stock Alert</span>
            <span className="text-2xl font-black text-white block">
              {lowStockCount}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Analytics Charts Component */}
      <AnalyticsCharts 
        dailyMetrics={sortedMetrics.map(m => ({
          date: format(new Date(m.date), 'dd/MM'),
          revenue: parseFloat(m.revenue || '0')
        }))} 
        branchPerfData={branchPerfData} 
      />

      {/* Recent Sales Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white leading-none">Recent Transactions</h3>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Real-time sale operations feed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-medium">
              {!recentSales || recentSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No recent sales recorded.
                  </td>
                </tr>
              ) : (
                recentSales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-slate-900/40 text-slate-300">
                    <td className="py-3 px-4 font-mono text-[10px] font-bold text-blue-500 truncate max-w-[120px]">
                      #{sale.id}
                    </td>
                    <td className="py-3 px-4">
                      {sale.branches?.name || 'Main Branch'}
                    </td>
                    <td className="py-3 px-4">
                      {sale.customers?.name || 'Walk-in Customer'}
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800 inline-block mt-2.5">
                      {sale.payment_method.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-white font-bold">
                      {currency}{parseFloat(sale.total_amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {format(new Date(sale.created_at), 'HH:mm')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
