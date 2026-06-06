'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { validateReadAccess } from '@/lib/security';

export async function getReportsData(
  type: 'revenue' | 'sales' | 'inventory' | 'debt' | 'branch',
  startDate: string,
  endDate: string,
  branchId: string
) {
  // 1. Get authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Authentication required.' };
  }

  // Live security check for read access
  try {
    await validateReadAccess(supabase, user.id);
  } catch (accessErr: any) {
    return { error: accessErr.message };
  }

  const role = user.app_metadata?.role || 'STAFF';
  const businessId = user.app_metadata?.business_id;
  if (!businessId) {
    return { error: 'No business workspace found.' };
  }

  // Server-side enforcement of branch scoping for MANAGER and STAFF roles
  let activeBranchId = branchId;
  if (role === 'MANAGER' || role === 'STAFF') {
    const { data: userBranchData } = await supabase
      .from('user_branches')
      .select('branch_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!userBranchData || userBranchData.length === 0) {
      return { error: 'You are not assigned to any branch.' };
    }
    activeBranchId = userBranchData[0].branch_id;
  }

  // SECURITY CHECK: Verify target branch belongs to user's business
  if (activeBranchId !== 'all') {
    const { data: branchCheck } = await supabase
      .from('branches')
      .select('id')
      .eq('id', activeBranchId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!branchCheck) {
      return { error: 'Branch context not found or unauthorized.' };
    }
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    if (type === 'revenue') {
      let salesQuery = supabaseAdmin
        .from('sales')
        .select('total_amount, payment_method, created_at')
        .eq('business_id', businessId)
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`);

      if (activeBranchId !== 'all') {
        salesQuery = salesQuery.eq('branch_id', activeBranchId);
      }

      const { data: sales, error } = await salesQuery;
      if (error) throw new Error(error.message);

      let totalRevenue = 0;
      const paymentMethods = { cash: 0, card: 0, bank_transfer: 0, store_credit: 0 };
      const dailyMap = new Map<string, number>();

      sales?.forEach((s) => {
        const amt = parseFloat(s.total_amount || '0');
        totalRevenue += amt;

        // Payment method breakdown
        const pm = s.payment_method as keyof typeof paymentMethods;
        if (pm in paymentMethods) {
          paymentMethods[pm] += amt;
        }

        // Daily trend
        const dayStr = s.created_at.split('T')[0];
        dailyMap.set(dayStr, (dailyMap.get(dayStr) || 0) + amt);
      });

      // Calculate realized profit inside date range
      let profitQuery = supabaseAdmin
        .from('sale_items')
        .select('quantity, total_price, products(cost_price), sales!inner(created_at, branch_id)')
        .eq('business_id', businessId)
        .gte('sales.created_at', `${startDate}T00:00:00Z`)
        .lte('sales.created_at', `${endDate}T23:59:59Z`);

      if (activeBranchId !== 'all') {
        profitQuery = profitQuery.eq('sales.branch_id', activeBranchId);
      }

      const { data: profitItems } = await profitQuery;

      let totalProfit = 0;
      const dailyProfitMap = new Map<string, number>();

      profitItems?.forEach((item: any) => {
        const price = parseFloat(item.total_price || '0');
        const qty = item.quantity || 0;
        const cost = parseFloat(item.products?.cost_price || '0');
        const itemProfit = price - (qty * cost);
        totalProfit += itemProfit;

        const dayStr = item.sales?.created_at.split('T')[0];
        dailyProfitMap.set(dayStr, (dailyProfitMap.get(dayStr) || 0) + itemProfit);
      });

      // Construct ordered daily trend list
      const dailyTrend: { date: string; revenue: number; profit: number }[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayStr = d.toISOString().split('T')[0];
        dailyTrend.push({
          date: dayStr.slice(5), // e.g. "06-05"
          revenue: dailyMap.get(dayStr) || 0,
          profit: dailyProfitMap.get(dayStr) || 0,
        });
      }

      return {
        success: true,
        data: {
          totalRevenue,
          totalProfit,
          paymentMethods,
          dailyTrend,
          transactionCount: sales?.length || 0,
        },
      };
    }

    if (type === 'sales') {
      // Fetch invoices
      let invoicesQuery = supabaseAdmin
        .from('sales')
        .select('id, total_amount, payment_method, created_at, cashier_id, customer_id, customers(name), branches(name), cashier:users!sales_cashier_id_fkey(name)')
        .eq('business_id', businessId)
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`)
        .order('created_at', { ascending: false });

      if (activeBranchId !== 'all') {
        invoicesQuery = invoicesQuery.eq('branch_id', activeBranchId);
      }

      const { data: invoices, error: invErr } = await invoicesQuery;
      if (invErr) throw new Error(invErr.message);

      // Fetch top selling items
      let itemsQuery = supabaseAdmin
        .from('sale_items')
        .select('quantity, total_price, product_id, products(name, sku, cost_price), sales!inner(branch_id, created_at)')
        .eq('business_id', businessId)
        .gte('sales.created_at', `${startDate}T00:00:00Z`)
        .lte('sales.created_at', `${endDate}T23:59:59Z`);

      if (activeBranchId !== 'all') {
        itemsQuery = itemsQuery.eq('sales.branch_id', activeBranchId);
      }

      const { data: items, error: itemsErr } = await itemsQuery;
      if (itemsErr) throw new Error(itemsErr.message);

      // Compile top items and total profit
      let totalProfit = 0;
      const productMap = new Map<string, { name: string; sku: string; quantity: number; revenue: number }>();
      items?.forEach((item) => {
        const pId = item.product_id;
        const qty = item.quantity || 0;
        const rev = parseFloat(item.total_price || '0');
        const pInfo = item.products as any;
        const name = pInfo?.name || 'Unknown Product';
        const sku = pInfo?.sku || 'N/A';
        const cost = parseFloat(pInfo?.cost_price || '0');
        
        totalProfit += rev - (qty * cost);

        const existing = productMap.get(pId) || { name, sku, quantity: 0, revenue: 0 };
        existing.quantity += qty;
        existing.revenue += rev;
        productMap.set(pId, existing);
      });

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      const totalRevenue = invoices?.reduce((sum, i) => sum + parseFloat(i.total_amount || '0'), 0) || 0;

      return {
        success: true,
        data: {
          invoices: invoices || [],
          topProducts,
          totalSalesCount: invoices?.length || 0,
          totalRevenue,
          totalProfit,
        },
      };
    }

    if (type === 'inventory') {
      // Fetch branch overrides for calculation
      const { data: overrides } = await supabaseAdmin
        .from('branch_product_prices')
        .select('price, product_id, branch_id')
        .eq('business_id', businessId);

      const overrideMap = new Map<string, number>();
      overrides?.forEach((o) => {
        overrideMap.set(`${o.branch_id}_${o.product_id}`, parseFloat(o.price || '0'));
      });

      let invQuery = supabaseAdmin
        .from('inventory')
        .select('quantity, reorder_level, product_id, branch_id, branches(name), products(name, sku, cost_price, default_price)')
        .eq('business_id', businessId);

      if (activeBranchId !== 'all') {
        invQuery = invQuery.eq('branch_id', activeBranchId);
      }

      const { data: inventory, error: invErr } = await invQuery;
      if (invErr) throw new Error(invErr.message);

      let totalItems = 0;
      let lowStockCount = 0;
      let costValuation = 0;
      let retailValuation = 0;

      inventory?.forEach((item) => {
        const qty = item.quantity || 0;
        const reorder = item.reorder_level || 0;
        const prod = item.products as any;
        const cost = parseFloat(prod?.cost_price || '0');
        const defaultPrice = parseFloat(prod?.default_price || '0');

        const finalPrice = overrideMap.get(`${item.branch_id}_${item.product_id}`) ?? defaultPrice;

        totalItems += qty;
        if (qty <= reorder) {
          lowStockCount++;
        }
        costValuation += qty * cost;
        retailValuation += qty * finalPrice;
      });

      // Fetch stock movements log inside dates
      let movementQuery = supabaseAdmin
        .from('stock_movements')
        .select('id, quantity, type, notes, created_at, products(name, sku), branches(name), recorded_by_user:users!stock_movements_recorded_by_fkey(name)')
        .eq('business_id', businessId)
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`)
        .order('created_at', { ascending: false });

      if (activeBranchId !== 'all') {
        movementQuery = movementQuery.eq('branch_id', activeBranchId);
      }

      const { data: movements, error: moveErr } = await movementQuery;
      if (moveErr) throw new Error(moveErr.message);

      return {
        success: true,
        data: {
          totalItems,
          lowStockCount,
          costValuation,
          retailValuation,
          potentialProfit: retailValuation - costValuation,
          movements: movements || [],
          inventory: inventory || [],
        },
      };
    }

    if (type === 'debt') {
      let creditQuery = supabaseAdmin
        .from('sales')
        .select('total_amount, created_at, customer_id, customers(name, email, phone), branches(name)')
        .eq('business_id', businessId)
        .eq('payment_method', 'store_credit')
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`);

      if (activeBranchId !== 'all') {
        creditQuery = creditQuery.eq('branch_id', activeBranchId);
      }

      const { data: creditSales, error: dbErr } = await creditQuery;
      if (dbErr) throw new Error(dbErr.message);

      const customerDebts = new Map<string, { name: string; email: string; phone: string; totalDebt: number; transactionCount: number; lastDate: string }>();

      let overallDebt = 0;

      creditSales?.forEach((s) => {
        const amt = parseFloat(s.total_amount || '0');
        overallDebt += amt;

        const cust = s.customers as any;
        const cId = s.customer_id || 'anonymous';
        const name = cust?.name || 'Walk-in (Store Credit)';
        const email = cust?.email || 'N/A';
        const phone = cust?.phone || 'N/A';
        const dateStr = s.created_at;

        const existing = customerDebts.get(cId) || { name, email, phone, totalDebt: 0, transactionCount: 0, lastDate: dateStr };
        existing.totalDebt += amt;
        existing.transactionCount += 1;
        if (new Date(dateStr) > new Date(existing.lastDate)) {
          existing.lastDate = dateStr;
        }
        customerDebts.set(cId, existing);
      });

      const debtorsList = Array.from(customerDebts.values()).sort((a, b) => b.totalDebt - a.totalDebt);

      return {
        success: true,
        data: {
          overallDebt,
          debtorsCount: customerDebts.size,
          debtors: debtorsList,
          creditSales: creditSales || [],
        },
      };
    }

    if (type === 'branch') {
      // Branch-wide comparisons (only relevant across branches)
      const { data: branches, error: branchErr } = await supabaseAdmin
        .from('branches')
        .select('id, name')
        .eq('business_id', businessId);
      
      if (branchErr) throw new Error(branchErr.message);

      let salesQuery = supabaseAdmin
        .from('sales')
        .select('total_amount, branch_id')
        .eq('business_id', businessId)
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`);

      const { data: sales, error: salesErr } = await salesQuery;
      if (salesErr) throw new Error(salesErr.message);

      const branchMap = new Map<string, { name: string; revenue: number; salesCount: number }>();
      branches?.forEach((b) => {
        branchMap.set(b.id, { name: b.name, revenue: 0, salesCount: 0 });
      });

      sales?.forEach((s) => {
        const amt = parseFloat(s.total_amount || '0');
        const bId = s.branch_id;
        const bData = branchMap.get(bId) || { name: 'Unknown Branch', revenue: 0, salesCount: 0 };
        bData.revenue += amt;
        bData.salesCount += 1;
        branchMap.set(bId, bData);
      });

      const comparison = Array.from(branchMap.entries()).map(([id, info]) => ({
        id,
        name: info.name,
        revenue: info.revenue,
        salesCount: info.salesCount,
        avgBasket: info.salesCount > 0 ? info.revenue / info.salesCount : 0,
      })).sort((a, b) => b.revenue - a.revenue);

      return {
        success: true,
        data: {
          comparison,
        },
      };
    }

    return { error: 'Invalid report type.' };
  } catch (err: any) {
    console.error('Reports calculation error:', err);
    return { error: err.message || 'An error occurred during calculation.' };
  }
}
