'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { validateWriteAccess } from '@/lib/security';

export async function createSale(
  branchId: string,
  customerId: string | null,
  paymentMethod: string,
  items: { product_id: string; quantity: number }[]
) {
  if (!branchId || items.length === 0) {
    return { error: 'Branch and items are required.' };
  }

  // Pre-validate quantities to prevent negative-quantity stock exploits (OWASP A04:2021)
  if (items.some(item => item.quantity <= 0)) {
    return { error: 'All item quantities must be greater than zero.' };
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

  const { data: saleId, error } = await supabase.rpc('process_sale', {
    p_branch_id: branchId,
    p_customer_id: customerId || null,
    p_payment_method: paymentMethod,
    p_items: items,
  });

  if (error) {
    console.error('RPC process_sale error:', error);
    return { error: error.message };
  }

  revalidatePath('/sales');
  revalidatePath('/');
  return { success: true, saleId };
}
