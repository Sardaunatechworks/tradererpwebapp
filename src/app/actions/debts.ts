'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { validateWriteAccess, validateReadAccess } from '@/lib/security';

export async function recordRepayment(
  customerId: string,
  amount: number,
  paymentMethod: 'cash' | 'card' | 'bank_transfer',
  notes: string,
  branchId: string
) {
  if (amount <= 0) {
    return { error: 'Repayment amount must be greater than zero.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Authentication required.' };
  }

  // Live security check to bypass JWT status caching latency
  try {
    await validateWriteAccess(supabase, user.id);
  } catch (accessErr: any) {
    return { error: accessErr.message };
  }

  const role = user.app_metadata?.role || 'STAFF';
  const businessId = user.app_metadata?.business_id;
  if (!businessId) {
    return { error: 'No business workspace found.' };
  }

  // Scoping branch validation on server side
  let targetBranchId = branchId;
  if (role === 'MANAGER' || role === 'STAFF') {
    const { data: userBranchData } = await supabase
      .from('user_branches')
      .select('branch_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!userBranchData || userBranchData.length === 0) {
      return { error: 'You are not assigned to any branch.' };
    }
    targetBranchId = userBranchData[0].branch_id;
  }

  if (targetBranchId === 'all') {
    return { error: 'A specific branch location must be selected to record repayments.' };
  }

  // SECURITY CHECK: Verify customer belongs to the cashier's business
  const { data: customerCheck } = await supabase
    .from('customers')
    .select('id')
    .eq('id', customerId)
    .eq('business_id', businessId)
    .maybeSingle();

  if (!customerCheck) {
    return { error: 'Customer profile not found.' };
  }

  // SECURITY CHECK: Verify branch belongs to the cashier's business
  const { data: branchCheck } = await supabase
    .from('branches')
    .select('id')
    .eq('id', targetBranchId)
    .eq('business_id', businessId)
    .maybeSingle();

  if (!branchCheck) {
    return { error: 'Branch context not found or unauthorized.' };
  }

  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin.from('repayments').insert({
      business_id: businessId,
      branch_id: targetBranchId,
      customer_id: customerId,
      amount,
      payment_method: paymentMethod,
      recorded_by: user.id,
      notes: notes || 'Manual repayment logged',
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/debts');
    revalidatePath('/reports');
    return { success: true };
  } catch (err: any) {
    console.error('Record repayment error:', err);
    return { error: err.message || 'An error occurred while logging repayment.' };
  }
}

export async function getDebtOverviewData(branchId: string) {
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

  // Scoping branch validation on server side
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
    // 1. Query all credit sales for this business
    let creditSalesQuery = supabaseAdmin
      .from('sales')
      .select('id, total_amount, customer_id, created_at, branch_id, branches(name)')
      .eq('business_id', businessId)
      .eq('payment_method', 'store_credit')
      .order('created_at', { ascending: true }); // Ascending for FIFO aging

    if (activeBranchId !== 'all') {
      creditSalesQuery = creditSalesQuery.eq('branch_id', activeBranchId);
    }

    const { data: creditSales, error: sErr } = await creditSalesQuery;
    if (sErr) throw new Error(sErr.message);

    // 2. Query all repayments for this business
    let repaymentsQuery = supabaseAdmin
      .from('repayments')
      .select('id, amount, payment_method, notes, created_at, customer_id, branch_id, branches(name), customers(name, email, phone), recorded_by_user:users!repayments_recorded_by_fkey(name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (activeBranchId !== 'all') {
      repaymentsQuery = repaymentsQuery.eq('branch_id', activeBranchId);
    }

    const { data: repayments, error: rErr } = await repaymentsQuery;
    if (rErr) throw new Error(rErr.message);

    // 3. Query all customers
    const { data: customers, error: cErr } = await supabaseAdmin
      .from('customers')
      .select('id, name, email, phone')
      .eq('business_id', businessId);
    
    if (cErr) throw new Error(cErr.message);

    // Dynamic metrics compilation
    let totalDebt = 0;
    let totalCollected = 0;
    let overdueDebt = 0;

    // Build map of repayments per customer
    const repaymentMap = new Map<string, number>();
    repayments?.forEach((r) => {
      const amt = parseFloat(r.amount || '0');
      totalCollected += amt;

      const cId = r.customer_id;
      repaymentMap.set(cId, (repaymentMap.get(cId) || 0) + amt);
    });

    // Accumulate total debt sold
    creditSales?.forEach((s) => {
      totalDebt += parseFloat(s.total_amount || '0');
    });

    // Group credit sales by customer
    const customerCreditSales = new Map<string, typeof creditSales>();
    creditSales?.forEach((s) => {
      const cId = s.customer_id || 'anonymous';
      const list = customerCreditSales.get(cId) || [];
      list.push(s);
      customerCreditSales.set(cId, list);
    });

    // Outstanding Debtors List compilation
    const debtorCustomersList: any[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    customers?.forEach((cust) => {
      const cId = cust.id;
      const salesList = customerCreditSales.get(cId) || [];
      const totalRepaid = repaymentMap.get(cId) || 0;

      let totalCredit = 0;
      let remainingRepaidCredit = totalRepaid;
      let customerOverdue = 0;

      salesList.forEach((sale) => {
        const saleAmt = parseFloat(sale.total_amount || '0');
        totalCredit += saleAmt;

        // Apply repayment offset using FIFO
        let unpaidAmount = saleAmt;
        if (remainingRepaidCredit >= unpaidAmount) {
          remainingRepaidCredit -= unpaidAmount;
          unpaidAmount = 0;
        } else {
          unpaidAmount -= remainingRepaidCredit;
          remainingRepaidCredit = 0;
        }

        // If outstanding remains and is older than 30 days, mark as overdue
        if (unpaidAmount > 0) {
          const saleDate = new Date(sale.created_at);
          if (saleDate < thirtyDaysAgo) {
            customerOverdue += unpaidAmount;
          }
        }
      });

      const outstandingBalance = totalCredit - totalRepaid;

      if (outstandingBalance > 0.01) {
        overdueDebt += customerOverdue;

        debtorCustomersList.push({
          id: cId,
          name: cust.name,
          email: cust.email || 'N/A',
          phone: cust.phone || 'N/A',
          totalCredit,
          totalRepaid,
          outstandingBalance,
          overdueDebt: customerOverdue,
          status: customerOverdue > 0 ? 'OVERDUE' : 'GOOD',
        });
      }
    });

    return {
      success: true,
      data: {
        totalDebt,
        totalCollected,
        outstandingBalance: totalDebt - totalCollected,
        overdueDebt,
        debtors: debtorCustomersList.sort((a, b) => b.outstandingBalance - a.outstandingBalance),
        repaymentHistory: repayments || [],
      },
    };
  } catch (err: any) {
    console.error('getDebtOverviewData error:', err);
    return { error: err.message || 'An error occurred fetching debt records.' };
  }
}
