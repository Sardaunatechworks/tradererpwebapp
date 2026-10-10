'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { checkIsSuperAdmin, assertPlatformOwner, PLATFORM_OWNER_EMAILS } from '@/lib/auth/superAdmin';

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
 * Ensures caller is logged in and possesses 'super_admin' privileges
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

  assertPlatformOwner(user);

  const supabaseAdmin = getAdminClient();
  return { user, supabaseAdmin };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PLATFORM SUMMARY METRICS & REAL TRENDS
// ─────────────────────────────────────────────────────────────────────────────

export interface RegistrationTrendItem {
  period: string;
  count: number;
}

export interface RoleDistribution {
  owner: number;
  admin: number;
  staff: number;
  superAdmin: number;
}

export interface SuperAdminStats {
  totalBusinesses: number;
  activeBusinesses: number;
  inactiveBusinesses: number;
  totalUsers: number;
  roleDistribution: RoleDistribution;
  registrationTrends: RegistrationTrendItem[];
  totalFeedbackCount: number;
  averageRating: number;
  recentActivityCount: number;
}

export async function getSuperAdminStats(): Promise<{
  data?: SuperAdminStats;
  error?: string;
}> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    // 1. Businesses counts and registration dates
    const { data: businesses, error: bizErr } = await supabaseAdmin
      .from('businesses')
      .select('id, status, created_at')
      .order('created_at', { ascending: true });

    if (bizErr) throw bizErr;

    const totalBusinesses = businesses?.length || 0;
    const activeBusinesses = businesses?.filter((b) => b.status === 'active').length || 0;
    const inactiveBusinesses = totalBusinesses - activeBusinesses;

    // Build real registration trend by month
    const trendMap = new Map<string, number>();
    (businesses || []).forEach((b) => {
      const d = new Date(b.created_at);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      trendMap.set(key, (trendMap.get(key) || 0) + 1);
    });
    const registrationTrends: RegistrationTrendItem[] = Array.from(trendMap.entries()).map(
      ([period, count]) => ({ period, count })
    );

    // 2. Platform Users count
    const { count: usersCount, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (userErr) throw userErr;

    // 3. User distribution by role
    const { data: members } = await supabaseAdmin
      .from('business_members')
      .select('role');

    const roleDistribution: RoleDistribution = {
      owner: 0,
      admin: 0,
      staff: 0,
      superAdmin: PLATFORM_OWNER_EMAILS.length,
    };

    (members || []).forEach((m) => {
      const r = (m.role || '').toLowerCase();
      if (r === 'owner') roleDistribution.owner += 1;
      else if (r === 'admin') roleDistribution.admin += 1;
      else if (r === 'staff') roleDistribution.staff += 1;
    });

    // 4. Feedback metrics
    const { data: feedbackList } = await supabaseAdmin
      .from('app_feedback')
      .select('rating');

    const feedback = feedbackList || [];
    const totalFeedbackCount = feedback.length;
    const ratedFeedback = feedback.filter((f) => f.rating !== null && f.rating !== undefined);
    const avgRating =
      ratedFeedback.length > 0
        ? ratedFeedback.reduce((sum, f) => sum + Number(f.rating), 0) / ratedFeedback.length
        : 5;

    // 5. Recent audit logs count
    const { count: recentAuditCount } = await supabaseAdmin
      .from('audit_logs')
      .select('id', { count: 'exact', head: true });

    return {
      data: {
        totalBusinesses,
        activeBusinesses,
        inactiveBusinesses,
        totalUsers: usersCount || 0,
        roleDistribution,
        registrationTrends,
        totalFeedbackCount,
        averageRating: Math.round(avgRating * 10) / 10,
        recentActivityCount: recentAuditCount || 0,
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
  address?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  owner_name?: string | null;
  owner_email?: string | null;
  member_count: number;
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
    
    // Fetch member counts per business (preserving tenant data privacy by not querying sales/inventory)
    const { data: allMembers } = await supabaseAdmin
      .from('business_members')
      .select('business_id');

    const memberCountMap = new Map<string, number>();
    (allMembers || []).forEach((m) => {
      memberCountMap.set(m.business_id, (memberCountMap.get(m.business_id) || 0) + 1);
    });

    if (error) {
      // Fallback query without foreign key alias
      const { data: fallbackBiz, error: fbErr } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (fbErr) throw fbErr;

      const records: AdminBusinessRecord[] = (fallbackBiz || []).map((b) => ({
        id: b.id,
        name: b.name,
        business_type: b.business_type,
        currency: b.currency,
        phone: b.phone,
        email: b.email,
        address: b.address,
        status: b.status,
        created_at: b.created_at,
        member_count: memberCountMap.get(b.id) || 1,
      }));

      return { data: records };
    }

    const records: AdminBusinessRecord[] = (bizList || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      business_type: b.business_type,
      currency: b.currency,
      phone: b.phone,
      email: b.email,
      address: b.address,
      status: b.status,
      created_at: b.created_at,
      owner_name: b.owner?.name || null,
      owner_email: b.owner?.email || null,
      member_count: memberCountMap.get(b.id) || 1,
    }));

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

    // Audit log (gracefully fallback if constraint allows)
    try {
      await supabaseAdmin.from('audit_logs').insert({
        business_id: businessId,
        user_id: user.id,
        action: newStatus === 'active' ? 'platform_activate_business' : 'platform_suspend_business',
        entity_type: 'business',
        entity_id: businessId,
        metadata: { changedBy: user.email, status: newStatus },
      });
    } catch (logErr) {
      console.warn('Audit log write warning:', logErr);
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update business status.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PLATFORM USERS DIRECTORY & ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  businesses: { id: string; name: string; role: string }[];
  isPlatformOwner: boolean;
}

export async function getAdminUsers(options?: {
  search?: string;
  status?: string;
}): Promise<{ data?: AdminUserRecord[]; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    let query = supabaseAdmin
      .from('users')
      .select('*, memberships:business_members(business_id, role, status, business:businesses(id, name))')
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
      const businessesList = (u.memberships || [])
        .filter((m: any) => m.business)
        .map((m: any) => ({
          id: m.business.id,
          name: m.business.name,
          role: m.role,
        }));

      const isOwner = PLATFORM_OWNER_EMAILS.includes(u.email?.toLowerCase().trim());

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status || 'active',
        created_at: u.created_at,
        businesses: businessesList,
        isPlatformOwner: isOwner,
      };
    });

    return { data: records };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch platform users.' };
  }
}

export async function toggleUserStatus(
  userId: string,
  newStatus: 'active' | 'inactive'
): Promise<{ success?: boolean; error?: string }> {
  try {
    const { user, supabaseAdmin } = await getSuperAdminContext();

    // Guard: Prevent suspending or demoting the Platform Owner
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('email, id')
      .eq('id', userId)
      .single();

    if (targetUser?.email && PLATFORM_OWNER_EMAILS.includes(targetUser.email.toLowerCase().trim())) {
      return { error: 'Protected Account: The TraderERP Platform Owner account cannot be suspended.' };
    }

    // Update status in public.users
    const { error } = await supabaseAdmin
      .from('users')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    // Also update memberships if any
    await supabaseAdmin
      .from('business_members')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    // Record in audit log
    try {
      const { data: userMembership } = await supabaseAdmin
        .from('business_members')
        .select('business_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (userMembership?.business_id) {
        await supabaseAdmin.from('audit_logs').insert({
          business_id: userMembership.business_id,
          user_id: user.id,
          action: newStatus === 'active' ? 'platform_activate_user' : 'platform_suspend_user',
          entity_type: 'user',
          entity_id: userId,
          metadata: { targetEmail: targetUser?.email, changedBy: user.email, status: newStatus },
        });
      }
    } catch (logErr) {
      console.warn('Audit log write warning:', logErr);
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update user status.' };
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
  created_at: string;
}

export async function getAdminFeedback(options?: {
  category?: string;
}): Promise<{ data?: AdminFeedbackRecord[]; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    let query = supabaseAdmin
      .from('app_feedback')
      .select('id, business_id, user_name, user_email, business_name, rating, category, message, created_at')
      .order('created_at', { ascending: false });

    if (options?.category && options.category !== 'all') {
      query = query.eq('category', options.category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: (data as AdminFeedbackRecord[]) || [] };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch customer feedback.' };
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

export async function getAdminAuditLogs(limit: number = 50): Promise<{
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

// ─────────────────────────────────────────────────────────────────────────────
// 6. SYSTEM HEALTH & INTEGRATION MONITORING
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemHealthData {
  databaseStatus: 'healthy' | 'degraded' | 'down';
  databaseLatencyMs: number;
  authStatus: 'healthy' | 'down';
  environment: string;
  platformVersion: string;
  platformOwner: string;
  lastChecked: string;
}

export async function getSystemHealth(): Promise<{
  data?: SystemHealthData;
  error?: string;
}> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    const startTime = Date.now();
    const { error: dbErr } = await supabaseAdmin
      .from('businesses')
      .select('id', { count: 'exact', head: true });

    const latency = Date.now() - startTime;

    return {
      data: {
        databaseStatus: dbErr ? 'degraded' : 'healthy',
        databaseLatencyMs: latency,
        authStatus: 'healthy',
        environment: process.env.NODE_ENV || 'production',
        platformVersion: '1.2.0-mvp',
        platformOwner: 'Sardauna Tech Lab Ltd',
        lastChecked: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return {
      error: err.message || 'Health check failed.',
    };
  }
}
