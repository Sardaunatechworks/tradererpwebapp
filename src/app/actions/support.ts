'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { validateWriteAccess, validateReadAccess } from '@/lib/security';

export async function getTenantTickets() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Live security check for read access
  try {
    await validateReadAccess(supabase, user.id);
  } catch (err) {
    console.error('getTenantTickets access denied:', err);
    return [];
  }

  const businessId = user.app_metadata?.business_id;
  if (!businessId) return [];

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tenant tickets:', error);
    return [];
  }
  return data || [];
}

export async function createTenantTicket(
  title: string,
  description: string,
  category: 'support' | 'complaint' | 'feedback' | 'contact_request'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Live security check to bypass JWT status caching latency
  try {
    await validateWriteAccess(supabase, user.id);
  } catch (accessErr: any) {
    return { error: accessErr.message };
  }

  const businessId = user.app_metadata?.business_id;
  if (!businessId) return { error: 'Business account required' };

  const { error } = await supabase
    .from('support_tickets')
    .insert({
      business_id: businessId,
      user_id: user.id,
      title,
      description,
      category,
      contact_email: user.email!
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/support');
  return { success: true };
}

export async function closeTenantTicket(ticketId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Live security check to bypass JWT status caching latency
  try {
    await validateWriteAccess(supabase, user.id);
  } catch (accessErr: any) {
    return { error: accessErr.message };
  }

  const { error } = await supabase
    .from('support_tickets')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/support');
  return { success: true };
}
