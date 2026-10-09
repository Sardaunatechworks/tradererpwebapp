'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Ensures caller is logged in and possesses 'super_admin' role in app_metadata
 */
export async function getSuperAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required.');
  }

  const role = user.app_metadata?.role;
  if (role !== 'super_admin') {
    throw new Error('Unauthorized: Super administrator privilege required.');
  }

  const supabaseAdmin = getAdminClient();
  return { user, supabaseAdmin };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PLATFORM SUMMARY METRICS
// ─────────────────────────────────────────────────────────────────────────────

export interface SuperAdminStats {
  totalBusinesses: number;
  activeBusinesses: number;
  inactiveBusinesses: number;
  totalUsers: number;
  totalSalesCount: number;
  platformGmv: number;
  totalProductsCount: number;
  totalFeedbackCount: number;
  averageRating: number;
  newFeedbackCount: number;
}

export async function getSuperAdminStats(): Promise<{
  data?: SuperAdminStats;
  error?: string;
}> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    // 1. Businesses counts
    const { data: businesses, error: bizErr } = await supabaseAdmin
      .from('businesses')
      .select('id, status');

    if (bizErr) throw bizErr;

    const totalBusinesses = businesses?.length || 0;
    const activeBusinesses = businesses?.filter((b) => b.status === 'active').length || 0;
    const inactiveBusinesses = totalBusinesses - activeBusinesses;

    // 2. Platform Users count
    const { count: usersCount, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (userErr) throw userErr;

    // 3. Sales & Platform GMV (completed sales)
    const { data: sales, error: salesErr } = await supabaseAdmin
      .from('sales')
      .select('total, status')
      .eq('status', 'completed');

    if (salesErr) throw salesErr;

    const totalSalesCount = sales?.length || 0;
    const platformGmv = (sales || []).reduce(
      (sum, s) => sum + (Number(s.total) || 0),
      0
    );

    // 4. Products count
    const { count: productsCount } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true });

    // 5. Feedback stats
    const { data: feedbackList } = await supabaseAdmin
      .from('app_feedback')
      .select('rating, status');

    const feedback = feedbackList || [];
    const totalFeedbackCount = feedback.length;
    const ratedFeedback = feedback.filter((f) => f.rating !== null && f.rating !== undefined);
    const avgRating =
      ratedFeedback.length > 0
        ? ratedFeedback.reduce((sum, f) => sum + Number(f.rating), 0) / ratedFeedback.length
        : 5;
    const newFeedbackCount = feedback.filter((f) => f.status === 'new').length;

    return {
      data: {
        totalBusinesses,
        activeBusinesses,
        inactiveBusinesses,
        totalUsers: usersCount || 0,
        totalSalesCount,
        platformGmv,
        totalProductsCount: productsCount || 0,
        totalFeedbackCount,
        averageRating: Math.round(avgRating * 10) / 10,
        newFeedbackCount,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to retrieve super admin statistics.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BUSINESSES (TENANTS) DIRECTORY & ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminBusinessRecord {
  id: string;
  name: string;
  business_type?: string | null;
  currency: string;
  phone?: string | null;
  email?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  owner_name?: string | null;
  owner_email?: string | null;
  sales_count: number;
  total_revenue: number;
}

export async function getAdminBusinesses(options?: {
  search?: string;
  status?: string;
}): Promise<{ data?: AdminBusinessRecord[]; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    let query = supabaseAdmin
      .from('businesses')
      .select('*, owner:users!businesses_owner_id_fkey(name, email)')
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.search?.trim()) {
      const s = options.search.trim();
      query = query.or(`name.ilike.%${s}%,business_type.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const { data: bizList, error } = await query;
    if (error) {
      // Fallback without join in case foreign key reference alias differs
      const { data: fallbackBiz, error: fbErr } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (fbErr) throw fbErr;

      // Fetch sales grouped by business
      const { data: allSales } = await supabaseAdmin
        .from('sales')
        .select('business_id, total, status')
        .eq('status', 'completed');

      const salesMap = new Map<string, { count: number; gmv: number }>();
      (allSales || []).forEach((sale) => {
        const cur = salesMap.get(sale.business_id) || { count: 0, gmv: 0 };
        cur.count += 1;
        cur.gmv += Number(sale.total) || 0;
        salesMap.set(sale.business_id, cur);
      });

      const records: AdminBusinessRecord[] = (fallbackBiz || []).map((b) => {
        const sInfo = salesMap.get(b.id) || { count: 0, gmv: 0 };
        return {
          id: b.id,
          name: b.name,
          business_type: b.business_type,
          currency: b.currency,
          phone: b.phone,
          email: b.email,
          status: b.status,
          created_at: b.created_at,
          sales_count: sInfo.count,
          total_revenue: sInfo.gmv,
        };
      });

      return { data: records };
    }

    // Fetch sales metrics to enrich records
    const { data: allSales } = await supabaseAdmin
      .from('sales')
      .select('business_id, total, status')
      .eq('status', 'completed');

    const salesMap = new Map<string, { count: number; gmv: number }>();
    (allSales || []).forEach((sale) => {
      const cur = salesMap.get(sale.business_id) || { count: 0, gmv: 0 };
      cur.count += 1;
      cur.gmv += Number(sale.total) || 0;
      salesMap.set(sale.business_id, cur);
    });

    const records: AdminBusinessRecord[] = (bizList || []).map((b: any) => {
      const sInfo = salesMap.get(b.id) || { count: 0, gmv: 0 };
      return {
        id: b.id,
        name: b.name,
        business_type: b.business_type,
        currency: b.currency,
        phone: b.phone,
        email: b.email,
        status: b.status,
        created_at: b.created_at,
        owner_name: b.owner?.name || null,
        owner_email: b.owner?.email || null,
        sales_count: sInfo.count,
        total_revenue: sInfo.gmv,
      };
    });

    return { data: records };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch business directory.' };
  }
}

export async function toggleBusinessStatus(
  businessId: string,
  newStatus: 'active' | 'inactive'
): Promise<{ success?: boolean; error?: string }> {
  try {
    const { user, supabaseAdmin } = await getSuperAdminContext();

    const { error } = await supabaseAdmin
      .from('businesses')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', businessId);

    if (error) throw error;

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: newStatus === 'active' ? 'platform_activate_business' : 'platform_suspend_business',
      entity_type: 'business',
      entity_id: businessId,
      metadata: { changedBy: user.email, status: newStatus },
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update business status.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PLATFORM USERS DIRECTORY
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  business_name?: string | null;
  role?: string | null;
}

export async function getAdminUsers(options?: {
  search?: string;
  status?: string;
}): Promise<{ data?: AdminUserRecord[]; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    let query = supabaseAdmin
      .from('users')
      .select('*, memberships:business_members(role, status, business:businesses(name))')
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.search?.trim()) {
      const s = options.search.trim();
      query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    const records: AdminUserRecord[] = (users || []).map((u: any) => {
      const activeMembership = u.memberships?.[0];
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        created_at: u.created_at,
        business_name: activeMembership?.business?.name || null,
        role: activeMembership?.role || 'User',
      };
    });

    return { data: records };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch platform users.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CUSTOMER FEEDBACK & EXPERIENCE HUB
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminFeedbackRecord {
  id: string;
  business_id?: string | null;
  business_name?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  rating?: number | null;
  category: string;
  message: string;
  status: 'new' | 'reviewed' | 'archived';
  admin_notes?: string | null;
  created_at: string;
}

export async function getAdminFeedback(options?: {
  status?: string;
  category?: string;
}): Promise<{ data?: AdminFeedbackRecord[]; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    let query = supabaseAdmin
      .from('app_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.category && options.category !== 'all') {
      query = query.eq('category', options.category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: (data as AdminFeedbackRecord[]) || [] };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch app feedback.' };
  }
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: 'new' | 'reviewed' | 'archived',
  adminNotes?: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    const updatePayload: Record<string, any> = { status };
    if (adminNotes !== undefined) {
      updatePayload.admin_notes = adminNotes;
    }

    const { error } = await supabaseAdmin
      .from('app_feedback')
      .update(updatePayload)
      .eq('id', feedbackId);

    if (error) throw error;

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update feedback record.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PLATFORM AUDIT TRAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminAuditRecord {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: any;
  created_at: string;
  business?: { name: string } | null;
  user?: { name: string; email: string } | null;
}

export async function getAdminAuditLogs(limit: number = 25): Promise<{
  data?: AdminAuditRecord[];
  error?: string;
}> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, metadata, created_at, business:businesses(name), user:users(name, email)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { data: (data as any[]) || [] };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch audit log stream.' };
  }
}
