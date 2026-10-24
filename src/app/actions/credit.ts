'use server';

import { revalidatePath } from 'next/cache';
import { Customer, Sale, PaymentMethod } from '@/types';
import { getAuthContext, getAdminClient } from '@/lib/auth/context';

export async function getOutstandingCreditSummary(): Promise<{
  data?: {
    totalOutstanding: number;
    debtorsCount: number;
    customers: Array<Customer & { total_credit: number; sales_count: number }>;
  };
  error?: string;
}> {
  try {
    const { businessId, supabase } = await getAuthContext();

    // Fetch all sales with balance_due > 0
    const { data: unpaidSales, error } = await supabase
      .from('sales')
      .select('*, customer:customers(*)')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gt('balance_due', 0);

    if (error) throw error;

    let totalOutstanding = 0;
    const debtorMap = new Map<string, { customer: Customer; total: number; salesCount: number }>();

    for (const sale of unpaidSales || []) {
      const balance = Number(sale.balance_due) || 0;
      totalOutstanding += balance;

      if (sale.customer) {
        const cId = sale.customer.id;
        const current = debtorMap.get(cId) || {
          customer: sale.customer,
          total: 0,
          salesCount: 0,
        };
        current.total += balance;
        current.salesCount += 1;
        debtorMap.set(cId, current);
      }
    }

    const customers = Array.from(debtorMap.values()).map((d) => ({
      ...d.customer,
      total_credit: d.total,
      sales_count: d.salesCount,
      outstanding_balance: d.total,
    }));

    return {
      data: {
        totalOutstanding,
        debtorsCount: customers.length,
        customers,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch credit records.' };
  }
}

export async function getCustomerOutstandingSales(
  customerId: string
): Promise<{ data?: Sale[]; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();

    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .gt('balance_due', 0)
      .order('created_at', { ascending: true }); // oldest first (FIFO)

    if (error) throw error;
    const mapped = (data || []).map((s: any) => ({
      ...s,
      total_amount: Number(s.total ?? s.total_amount ?? 0),
    }));
    return { data: mapped as Sale[] };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch customer outstanding sales.' };
  }
}

export async function recordCreditPayment(params: {
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}): Promise<{ success?: boolean; error?: string }> {
  try {
    const { businessId, user } = await getAuthContext();

    if (isNaN(params.amount) || params.amount <= 0) {
      return { error: 'Payment amount must be greater than zero.' };
    }

    const supabaseAdmin = getAdminClient();

    // 1. Fetch outstanding sales for this customer (FIFO order)
    const { data: sales, error: salesErr } = await supabaseAdmin
      .from('sales')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', params.customerId)
      .eq('status', 'completed')
      .gt('balance_due', 0)
      .order('created_at', { ascending: true });

    if (salesErr || !sales || sales.length === 0) {
      return { error: 'No outstanding debt found for this customer.' };
    }

    const totalDue = sales.reduce((acc, s) => acc + (Number(s.balance_due) || 0), 0);
    if (params.amount > totalDue) {
      return {
        error: `Payment amount (${params.amount}) exceeds total outstanding debt (${totalDue}).`,
      };
    }

    let remainingToApply = params.amount;

    // Apply repayment across sales FIFO
    for (const sale of sales) {
      if (remainingToApply <= 0) break;

      const saleBalance = Number(sale.balance_due);
      const applyAmount = Math.min(saleBalance, remainingToApply);
      const newBalanceDue = saleBalance - applyAmount;
      const newAmountPaid = (Number(sale.amount_paid) || 0) + applyAmount;
      const newStatus = newBalanceDue === 0 ? 'paid' : 'partial';

      // Update sale
      await supabaseAdmin
        .from('sales')
        .update({
          balance_due: newBalanceDue,
          amount_paid: newAmountPaid,
          payment_status: newStatus,
        })
        .eq('id', sale.id);

      // Insert payment record
      await supabaseAdmin.from('payments').insert({
        business_id: businessId,
        sale_id: sale.id,
        customer_id: params.customerId,
        amount: applyAmount,
        payment_method: params.paymentMethod,
        reference: params.notes || `Credit repayment on #${sale.sale_number}`,
        recorded_by: user.id,
      });

      remainingToApply -= applyAmount;
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'record_credit_payment',
      entity_type: 'customer',
      entity_id: params.customerId,
      metadata: { amount: params.amount, paymentMethod: params.paymentMethod },
    });

    revalidatePath('/credit');
    revalidatePath('/customers');
    revalidatePath('/sales');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to record credit payment.' };
  }
}
