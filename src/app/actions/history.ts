'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { validateReadAccess } from '@/lib/security';

export async function getTransactionHistory(branchId: string) {
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

  // Branch scoping validation on server side
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
    let query = supabaseAdmin
      .from('sale_items')
      .select(`
        id,
        quantity,
        total_price,
        products(name, sku, cost_price),
        sales!inner(
          created_at,
          branch_id,
          payment_method,
          customer_id,
          cashier_id,
          branches(name),
          customers(name),
          cashier:users!sales_cashier_id_fkey(name)
        )
      `)
      .eq('business_id', businessId);

    if (activeBranchId !== 'all') {
      query = query.eq('sales.branch_id', activeBranchId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    // Map to a clean flat structure for the visual table
    const transactions = data?.map((item: any) => {
      const sale = item.sales || {};
      const prod = item.products || {};
      const totalP = parseFloat(item.total_price || '0');
      const qty = item.quantity || 0;
      const cost = parseFloat(prod.cost_price || '0');
      const profit = totalP - (qty * cost);

      return {
        id: item.id,
        date: sale.created_at,
        productName: prod.name || 'Unknown Product',
        sku: prod.sku || 'N/A',
        quantity: qty,
        totalPrice: totalP,
        profit: profit,
        cashierName: sale.cashier?.name || 'Staff Member',
        customerName: sale.customers?.name || 'Walk-in Customer',
        branchName: sale.branches?.name || 'Main Branch',
        paymentMethod: sale.payment_method || 'cash',
      };
    }) || [];

    // Sort in-memory chronologically descending by sale date
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { success: true, data: transactions };
  } catch (err: any) {
    console.error('Error fetching transaction history:', err);
    return { error: err.message || 'An error occurred fetching transactions.' };
  }
}
