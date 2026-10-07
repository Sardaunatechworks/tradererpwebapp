'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Sale, PaymentMethod, PaymentStatus } from '@/types';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Authentication required.');
  }

  const businessId = user.app_metadata?.business_id;
  if (!businessId) {
    throw new Error('No business workspace found.');
  }

  const role = user.app_metadata?.role || 'staff';
  return { user, businessId, role, supabase };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE SALE
// ─────────────────────────────────────────────────────────────────────────────

export interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export async function createSale(params: {
  customerId?: string | null;
  items: SaleItemInput[];
  paymentMethod: PaymentMethod;
  amountPaid: number;
  discount?: number;
  notes?: string;
}): Promise<{ data?: any; error?: string }> {
  try {
    const { businessId, user, supabase } = await getAuthContext();

    if (!params.items || params.items.length === 0) {
      return { error: 'At least one product item is required.' };
    }

    if (params.items.some((i) => i.quantity <= 0)) {
      return { error: 'Item quantities must be greater than zero.' };
    }

    if (params.amountPaid < 0) {
      return { error: 'Amount paid cannot be negative.' };
    }

    const discount = params.discount && params.discount > 0 ? params.discount : 0;
    const supabaseAdmin = getAdminClient();

    // Verify all products belong to this business and have sufficient stock
    const productIds = params.items.map((i) => i.productId);
    const { data: products, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, name, current_stock, selling_price, purchase_price')
      .eq('business_id', businessId)
      .in('id', productIds);

    if (prodErr || !products || products.length !== productIds.length) {
      return { error: 'One or more selected products are invalid or do not exist in your catalog.' };
    }

    // Build verified items list with price snapshot
    const verifiedItems = params.items.map((inputItem) => {
      const prod = products.find((p) => p.id === inputItem.productId)!;
      if (prod.current_stock < inputItem.quantity) {
        throw new Error(
          `Insufficient stock for "${prod.name}". Available: ${prod.current_stock}, Requested: ${inputItem.quantity}`
        );
      }
      const unitPrice = inputItem.unitPrice !== undefined && inputItem.unitPrice >= 0
        ? inputItem.unitPrice
        : prod.selling_price;
      const subtotal = unitPrice * inputItem.quantity;
      return {
        product: prod,
        quantity: inputItem.quantity,
        unitPrice,
        subtotal,
      };
    });

    const subtotal = verifiedItems.reduce((acc, item) => acc + item.subtotal, 0);
    const totalAmount = Math.max(0, subtotal - discount);
    const amountPaid = Math.min(params.amountPaid, totalAmount);
    const balanceDue = Math.max(0, totalAmount - amountPaid);

    let paymentStatus: PaymentStatus = 'paid';
    if (balanceDue > 0 && amountPaid > 0) {
      paymentStatus = 'partial';
    } else if (balanceDue > 0 && amountPaid === 0) {
      paymentStatus = 'credit';
    }

    // If customer is not provided and there is a balance due, require a customer
    if (balanceDue > 0 && !params.customerId) {
      return { error: 'A customer must be selected for credit or partial payment sales.' };
    }

    // Generate unique sale number: TR-000001
    const { count } = await supabaseAdmin
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    const nextSeq = (count || 0) + 1;
    const saleNumber = `TR-${String(nextSeq).padStart(6, '0')}`;

    // 1. Insert into sales
    const { data: sale, error: saleErr } = await supabaseAdmin
      .from('sales')
      .insert({
        business_id: businessId,
        sale_number: saleNumber,
        customer_id: params.customerId || null,
        subtotal: subtotal,
        discount: discount,
        total: totalAmount,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
        payment_method: params.paymentMethod,
        notes: params.notes || null,
        status: 'completed',
        sold_by: user.id,
      })
      .select('id, sale_number, subtotal, discount, total, amount_paid, balance_due, payment_status, payment_method, status, created_at')
      .single();

    if (saleErr || !sale) {
      throw new Error(`Failed to create sale: ${saleErr?.message}`);
    }

    // 2. Insert sale_items and decrement product stock & record inventory movements
    for (const item of verifiedItems) {
      // Create sale item
      await supabaseAdmin.from('sale_items').insert({
        sale_id: sale.id,
        product_id: item.product.id,
        product_name_snapshot: item.product.name,
        unit_price: item.unitPrice,
        discount: 0,
        quantity: item.quantity,
        subtotal: item.subtotal,
      });

      // Reduce current stock
      await supabaseAdmin
        .from('products')
        .update({
          current_stock: item.product.current_stock - item.quantity,
        })
        .eq('id', item.product.id);

      // Record inventory movement
      await supabaseAdmin.from('inventory_movements').insert({
        business_id: businessId,
        product_id: item.product.id,
        type: 'sale',
        quantity: -item.quantity,
        reference_id: sale.id,
        reference_type: 'sale',
        reason: `Sale #${saleNumber}`,
        created_by: user.id,
      });
    }

    // 3. Insert payment record if amount paid > 0
    if (amountPaid > 0) {
      await supabaseAdmin.from('payments').insert({
        business_id: businessId,
        sale_id: sale.id,
        customer_id: params.customerId || null,
        amount: amountPaid,
        payment_method: params.paymentMethod,
        reference: `Sale #${saleNumber}`,
        recorded_by: user.id,
      });
    }

    // 4. Create Receipt reference
    const receiptNumber = `RCP-${String(nextSeq).padStart(6, '0')}`;
    await supabaseAdmin.from('receipts').insert({
      business_id: businessId,
      sale_id: sale.id,
      receipt_number: receiptNumber,
    });

    // 5. Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'create_sale',
      entity_type: 'sale',
      entity_id: sale.id,
      metadata: { saleNumber, totalAmount, paymentStatus },
    });

    const createdSale = {
      ...sale,
      total_amount: sale.total,
    };

    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/dashboard');
    return { data: createdSale };
  } catch (err: any) {
    console.error('createSale error:', err);
    return { error: err.message || 'Failed to process sale transaction.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET SALES HISTORY
// ─────────────────────────────────────────────────────────────────────────────

export async function getSales(options?: {
  search?: string;
  paymentStatus?: string;
  limit?: number;
}): Promise<{ data?: Sale[]; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();

    let query = supabase
      .from('sales')
      .select('*, customer:customers(id, name, phone), items:sale_items(*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (options?.paymentStatus && options.paymentStatus !== 'all') {
      query = query.eq('payment_status', options.paymentStatus);
    }

    if (options?.search?.trim()) {
      const s = options.search.trim();
      query = query.or(`sale_number.ilike.%${s}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    const mapped = ((data as any[]) || []).map((s) => ({
      ...s,
      total_amount: s.total ?? s.total_amount ?? 0,
    }));

    return { data: mapped as Sale[] };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch sales.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET SALE BY ID
// ─────────────────────────────────────────────────────────────────────────────

export async function getSaleById(id: string): Promise<{ data?: Sale; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();

    const { data, error } = await supabase
      .from('sales')
      .select('*, customer:customers(*), items:sale_items(*), payments:payments(*), receipts:receipts(*)')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error) throw error;
    const s = data as any;
    return {
      data: {
        ...s,
        total_amount: s.total ?? s.total_amount ?? 0,
      } as Sale,
    };
  } catch (err: any) {
    return { error: err.message || 'Sale transaction not found.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL SALE (SOFT REVERSAL)
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelSale(id: string, reason?: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const { businessId, user, role } = await getAuthContext();
    if (role === 'staff') {
      return { error: 'Only owners and admins can cancel sales.' };
    }

    const supabaseAdmin = getAdminClient();

    // 1. Fetch sale with its items
    const { data: sale, error: fetchErr } = await supabaseAdmin
      .from('sales')
      .select('*, items:sale_items(*)')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (fetchErr || !sale) {
      return { error: 'Sale not found.' };
    }

    if (sale.status === 'cancelled') {
      return { error: 'This sale has already been cancelled.' };
    }

    // 2. Restore stock for each item & create sale_reversal movements
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        // Fetch current stock
        const { data: prod } = await supabaseAdmin
          .from('products')
          .select('current_stock')
          .eq('id', item.product_id)
          .single();

        if (prod) {
          await supabaseAdmin
            .from('products')
            .update({ current_stock: prod.current_stock + item.quantity })
            .eq('id', item.product_id);
        }

        // Reversal movement
        await supabaseAdmin.from('inventory_movements').insert({
          business_id: businessId,
          product_id: item.product_id,
          type: 'sale_reversal',
          quantity: item.quantity,
          reference_id: sale.id,
          reference_type: 'sale',
          reason: `Reversal: Sale #${sale.sale_number} cancelled`,
          created_by: user.id,
        });
      }
    }

    // 3. Mark sale as cancelled
    await supabaseAdmin
      .from('sales')
      .update({
        status: 'cancelled',
        notes: reason ? `${sale.notes || ''} [Cancelled: ${reason}]` : sale.notes,
      })
      .eq('id', id)
      .eq('business_id', businessId);

    // 4. Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'cancel_sale',
      entity_type: 'sale',
      entity_id: id,
      metadata: { saleNumber: sale.sale_number, reason },
    });

    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to cancel sale.' };
  }
}
