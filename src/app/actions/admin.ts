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
// DATE RANGE FILTERING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

import { getDateRangeLabel, type AdminDateRange } from '@/utils/formatters';

function getDateFilterTimestamp(range: AdminDateRange = 'all'): string | null {
  const now = new Date();
  if (range === 'today') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return today.toISOString();
  }
  if (range === '7d') {
    const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return past7.toISOString();
  }
  if (range === '30d') {
    const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return past30.toISOString();
  }
  if (range === 'year') {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return yearStart.toISOString();
  }
  return null;
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
  totalCustomers: number;
  activeCustomers: number;
  totalCustomerDebt: number;
  roleDistribution: RoleDistribution;
  registrationTrends: RegistrationTrendItem[];
  totalFeedbackCount: number;
  averageRating: number;
  recentActivityCount: number;
  // Cumulative Transaction & Product Telemetry
  totalSalesCount: number;
  grossSalesValue: number;
  totalCollected: number;
  totalProductsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  periodLabel: string;
}

export async function getSuperAdminStats(range: AdminDateRange = 'all'): Promise<{
  data?: SuperAdminStats;
  error?: string;
}> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();
    const minTimestamp = getDateFilterTimestamp(range);

    // 1. Businesses counts and registration dates
    let bizQuery = supabaseAdmin
      .from('businesses')
      .select('id, status, created_at')
      .order('created_at', { ascending: true });

    if (minTimestamp) {
      bizQuery = bizQuery.gte('created_at', minTimestamp);
    }

    const { data: businesses, error: bizErr } = await bizQuery;
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

    // 4. Platform Customers metrics
    let totalCustomers = 0;
    let activeCustomers = 0;
    try {
      const { data: customersData } = await supabaseAdmin
        .from('customers')
        .select('id, status');
      totalCustomers = customersData?.length || 0;
      activeCustomers = customersData?.filter((c) => c.status === 'active').length || 0;
    } catch {
      // Fallback
    }

    // 5. Total Customer Debt / Outstanding Receivables
    let totalCustomerDebt = 0;
    try {
      const { data: openSales } = await supabaseAdmin
        .from('sales')
        .select('balance_due')
        .gt('balance_due', 0);
      totalCustomerDebt = (openSales || []).reduce((sum, s) => sum + (Number(s.balance_due) || 0), 0);
    } catch {
      // Fallback
    }

    // 6. Cumulative Sales & Transaction figures
    let totalSalesCount = 0;
    let grossSalesValue = 0;
    let totalCollected = 0;
    try {
      let salesQuery = supabaseAdmin
        .from('sales')
        .select('total, amount_paid, status, created_at');

      if (minTimestamp) {
        salesQuery = salesQuery.gte('created_at', minTimestamp);
      }

      const { data: salesData } = await salesQuery;
      const completedSales = (salesData || []).filter((s) => s.status === 'completed');
      totalSalesCount = completedSales.length;
      grossSalesValue = completedSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
      totalCollected = completedSales.reduce((acc, s) => acc + (Number(s.amount_paid) || 0), 0);
    } catch {
      // Fallback
    }

    // 7. Products and Stock Alerts
    let totalProductsCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    try {
      const { data: productsData } = await supabaseAdmin
        .from('products')
        .select('current_stock, minimum_stock');

      totalProductsCount = productsData?.length || 0;
      (productsData || []).forEach((p) => {
        const current = Number(p.current_stock || 0);
        const min = Number(p.minimum_stock || 5);
        if (current <= 0) {
          outOfStockCount += 1;
        } else if (current <= min) {
          lowStockCount += 1;
        }
      });
    } catch {
      // Fallback
    }

    // 8. Feedback metrics
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

    // 9. Recent audit logs count
    const { count: recentAuditCount } = await supabaseAdmin
      .from('audit_logs')
      .select('id', { count: 'exact', head: true });

    return {
      data: {
        totalBusinesses,
        activeBusinesses,
        inactiveBusinesses,
        totalUsers: usersCount || 0,
        totalCustomers,
        activeCustomers,
        totalCustomerDebt: Math.round(totalCustomerDebt * 100) / 100,
        roleDistribution,
        registrationTrends,
        totalFeedbackCount,
        averageRating: Math.round(avgRating * 10) / 10,
        recentActivityCount: recentAuditCount || 0,
        totalSalesCount,
        grossSalesValue: Math.round(grossSalesValue * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalProductsCount,
        lowStockCount,
        outOfStockCount,
        periodLabel: getDateRangeLabel(range),
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to retrieve super admin statistics.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TRANSACTION ANALYTICS & SALES BUSINESS INTELLIGENCE
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminTransactionRecord {
  id: string;
  sale_number: string;
  business_id: string;
  business_name: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  payment_method: string;
  payment_status: string;
  status: string;
  customer_name?: string | null;
  items_count?: number;
  created_at: string;
}

export interface BusinessTransactionVolume {
  business_id: string;
  business_name: string;
  transaction_count: number;
  total_sales: number;
}

export interface AdminTransactionAnalytics {
  totalTransactions: number;
  completedTransactions: number;
  cancelledTransactions: number;
  grossSalesValue: number;
  totalCollected: number;
  totalOutstandingCredit: number;
  paymentMethods: {
    cash: { count: number; value: number };
    bank_transfer: { count: number; value: number };
    pos: { count: number; value: number };
    credit: { count: number; value: number };
    other: { count: number; value: number };
  };
  topBusinesses: BusinessTransactionVolume[];
  recentTransactions: AdminTransactionRecord[];
}

export async function getAdminTransactionAnalytics(
  range: AdminDateRange = 'all',
  businessId?: string
): Promise<{ data?: AdminTransactionAnalytics; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();
    const minTimestamp = getDateFilterTimestamp(range);

    // Pre-fetch businesses lookup map
    const { data: bizList } = await supabaseAdmin.from('businesses').select('id, name');
    const bizMap = new Map<string, string>();
    (bizList || []).forEach((b) => bizMap.set(b.id, b.name));

    // Pre-fetch customers lookup map
    const { data: custList } = await supabaseAdmin.from('customers').select('id, name');
    const custMap = new Map<string, string>();
    (custList || []).forEach((c) => custMap.set(c.id, c.name));

    // Query sales
    let query = supabaseAdmin
      .from('sales')
      .select('id, sale_number, business_id, customer_id, total, amount_paid, balance_due, payment_method, payment_status, status, created_at')
      .order('created_at', { ascending: false });

    if (minTimestamp) {
      query = query.gte('created_at', minTimestamp);
    }

    if (businessId && businessId !== 'all') {
      query = query.eq('business_id', businessId);
    }

    const { data: sales, error } = await query;
    if (error) throw error;

    const allSales = sales || [];
    const totalTransactions = allSales.length;
    const completedList = allSales.filter((s) => s.status === 'completed');
    const cancelledList = allSales.filter((s) => s.status === 'cancelled');

    const completedTransactions = completedList.length;
    const cancelledTransactions = cancelledList.length;

    const grossSalesValue = completedList.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const totalCollected = completedList.reduce((sum, s) => sum + Number(s.amount_paid || 0), 0);
    const totalOutstandingCredit = completedList.reduce((sum, s) => sum + Number(s.balance_due || 0), 0);

    // Payment method distribution
    const paymentMethods = {
      cash: { count: 0, value: 0 },
      bank_transfer: { count: 0, value: 0 },
      pos: { count: 0, value: 0 },
      credit: { count: 0, value: 0 },
      other: { count: 0, value: 0 },
    };

    completedList.forEach((s) => {
      const method = (s.payment_method || '').toLowerCase();
      const val = Number(s.total || 0);
      if (method === 'cash') {
        paymentMethods.cash.count += 1;
        paymentMethods.cash.value += val;
      } else if (method === 'bank_transfer' || method === 'transfer') {
        paymentMethods.bank_transfer.count += 1;
        paymentMethods.bank_transfer.value += val;
      } else if (method === 'pos' || method === 'card') {
        paymentMethods.pos.count += 1;
        paymentMethods.pos.value += val;
      } else if (method === 'credit') {
        paymentMethods.credit.count += 1;
        paymentMethods.credit.value += val;
      } else {
        paymentMethods.other.count += 1;
        paymentMethods.other.value += val;
      }
    });

    // Top businesses by transaction volume
    const bizVolumeMap = new Map<string, { count: number; total: number }>();
    completedList.forEach((s) => {
      const bId = s.business_id;
      const current = bizVolumeMap.get(bId) || { count: 0, total: 0 };
      current.count += 1;
      current.total += Number(s.total || 0);
      bizVolumeMap.set(bId, current);
    });

    const topBusinesses: BusinessTransactionVolume[] = Array.from(bizVolumeMap.entries())
      .map(([bId, stat]) => ({
        business_id: bId,
        business_name: bizMap.get(bId) || 'Unknown Store',
        transaction_count: stat.count,
        total_sales: Math.round(stat.total * 100) / 100,
      }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, 10);

    // Recent transactions feed
    const recentTransactions: AdminTransactionRecord[] = allSales.slice(0, 50).map((s) => ({
      id: s.id,
      sale_number: s.sale_number,
      business_id: s.business_id,
      business_name: bizMap.get(s.business_id) || 'Unknown Store',
      total: Number(s.total || 0),
      amount_paid: Number(s.amount_paid || 0),
      balance_due: Number(s.balance_due || 0),
      payment_method: s.payment_method || 'cash',
      payment_status: s.payment_status || 'paid',
      status: s.status || 'completed',
      customer_name: s.customer_id ? custMap.get(s.customer_id) || 'Customer' : null,
      created_at: s.created_at,
    }));

    return {
      data: {
        totalTransactions,
        completedTransactions,
        cancelledTransactions,
        grossSalesValue: Math.round(grossSalesValue * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalOutstandingCredit: Math.round(totalOutstandingCredit * 100) / 100,
        paymentMethods,
        topBusinesses,
        recentTransactions,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch transaction analytics.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. INVENTORY & PRODUCT MONITORING
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminInventoryAlertRecord {
  id: string;
  business_id: string;
  business_name: string;
  name: string;
  sku: string | null;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  purchase_price: number;
  selling_price: number;
  status: 'out_of_stock' | 'critical_low' | 'reorder_soon';
  updated_at: string;
}

export interface BusinessCatalogSize {
  business_id: string;
  business_name: string;
  product_count: number;
  low_stock_count: number;
  estimated_valuation: number;
}

export interface AdminInventoryAnalytics {
  totalProducts: number;
  businessesWithProducts: number;
  outOfStockCount: number;
  lowStockCount: number;
  estimatedTotalValuation: number;
  alerts: AdminInventoryAlertRecord[];
  topCatalogs: BusinessCatalogSize[];
}

export async function getAdminInventoryAnalytics(
  businessId?: string
): Promise<{ data?: AdminInventoryAnalytics; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    // Pre-fetch businesses lookup map
    const { data: bizList } = await supabaseAdmin.from('businesses').select('id, name');
    const bizMap = new Map<string, string>();
    (bizList || []).forEach((b) => bizMap.set(b.id, b.name));

    let query = supabaseAdmin
      .from('products')
      .select('id, business_id, name, sku, unit, purchase_price, selling_price, current_stock, minimum_stock, status, updated_at');

    if (businessId && businessId !== 'all') {
      query = query.eq('business_id', businessId);
    }

    const { data: products, error } = await query;
    if (error) throw error;

    const allProducts = products || [];
    const totalProducts = allProducts.length;

    const distinctBiz = new Set<string>();
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let estimatedTotalValuation = 0;

    const alerts: AdminInventoryAlertRecord[] = [];
    const bizCatalogMap = new Map<string, { count: number; lowStock: number; valuation: number }>();

    allProducts.forEach((p) => {
      distinctBiz.add(p.business_id);
      const current = Number(p.current_stock || 0);
      const min = Number(p.minimum_stock || 5);
      const cost = Number(p.purchase_price || 0);

      if (current > 0 && cost > 0) {
        estimatedTotalValuation += current * cost;
      }

      // Catalog size aggregation
      const stat = bizCatalogMap.get(p.business_id) || { count: 0, lowStock: 0, valuation: 0 };
      stat.count += 1;
      if (current > 0 && cost > 0) stat.valuation += current * cost;

      if (current <= 0) {
        outOfStockCount += 1;
        stat.lowStock += 1;
        alerts.push({
          id: p.id,
          business_id: p.business_id,
          business_name: bizMap.get(p.business_id) || 'Unknown Store',
          name: p.name,
          sku: p.sku || null,
          unit: p.unit || 'pcs',
          current_stock: current,
          minimum_stock: min,
          purchase_price: cost,
          selling_price: Number(p.selling_price || 0),
          status: 'out_of_stock',
          updated_at: p.updated_at,
        });
      } else if (current <= min) {
        lowStockCount += 1;
        stat.lowStock += 1;
        alerts.push({
          id: p.id,
          business_id: p.business_id,
          business_name: bizMap.get(p.business_id) || 'Unknown Store',
          name: p.name,
          sku: p.sku || null,
          unit: p.unit || 'pcs',
          current_stock: current,
          minimum_stock: min,
          purchase_price: cost,
          selling_price: Number(p.selling_price || 0),
          status: current <= Math.max(1, Math.floor(min / 2)) ? 'critical_low' : 'reorder_soon',
          updated_at: p.updated_at,
        });
      }

      bizCatalogMap.set(p.business_id, stat);
    });

    const topCatalogs: BusinessCatalogSize[] = Array.from(bizCatalogMap.entries())
      .map(([bId, stat]) => ({
        business_id: bId,
        business_name: bizMap.get(bId) || 'Unknown Store',
        product_count: stat.count,
        low_stock_count: stat.lowStock,
        estimated_valuation: Math.round(stat.valuation * 100) / 100,
      }))
      .sort((a, b) => b.product_count - a.product_count)
      .slice(0, 10);

    // Sort alerts: Out of stock first, then lowest stock
    alerts.sort((a, b) => {
      if (a.status === 'out_of_stock' && b.status !== 'out_of_stock') return -1;
      if (b.status === 'out_of_stock' && a.status !== 'out_of_stock') return 1;
      return a.current_stock - b.current_stock;
    });

    return {
      data: {
        totalProducts,
        businessesWithProducts: distinctBiz.size,
        outOfStockCount,
        lowStockCount,
        estimatedTotalValuation: Math.round(estimatedTotalValuation * 100) / 100,
        alerts,
        topCatalogs,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch inventory monitoring analytics.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BUSINESSES (TENANTS) DIRECTORY & ACTIVITY EXPLORER
// ─────────────────────────────────────────────────────────────────────────────

export type InactivityStatus =
  | 'active_today'
  | 'active_recently'
  | 'dormant_14d'
  | 'dormant_30d'
  | 'no_activity';

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
  // Enhanced telemetry
  total_sales_count: number;
  total_sales_value: number;
  total_products_count: number;
  last_activity_at?: string | null;
  inactivity_status: InactivityStatus;
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
    if (error) throw error;

    // Fetch team members counts
    const { data: allMembers } = await supabaseAdmin
      .from('business_members')
      .select('business_id');

    const memberCountMap = new Map<string, number>();
    (allMembers || []).forEach((m) => {
      memberCountMap.set(m.business_id, (memberCountMap.get(m.business_id) || 0) + 1);
    });

    // Fetch sales aggregates per business
    const { data: allSales } = await supabaseAdmin
      .from('sales')
      .select('business_id, total, status, created_at');

    const salesCountMap = new Map<string, number>();
    const salesSumMap = new Map<string, number>();
    const lastActivityMap = new Map<string, string>();

    (allSales || []).forEach((s) => {
      const bId = s.business_id;
      if (s.status === 'completed') {
        salesCountMap.set(bId, (salesCountMap.get(bId) || 0) + 1);
        salesSumMap.set(bId, (salesSumMap.get(bId) || 0) + Number(s.total || 0));
      }
      const existing = lastActivityMap.get(bId);
      if (!existing || new Date(s.created_at) > new Date(existing)) {
        lastActivityMap.set(bId, s.created_at);
      }
    });

    // Fetch products count per business
    const { data: allProducts } = await supabaseAdmin
      .from('products')
      .select('business_id');

    const productCountMap = new Map<string, number>();
    (allProducts || []).forEach((p) => {
      productCountMap.set(p.business_id, (productCountMap.get(p.business_id) || 0) + 1);
    });

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const records: AdminBusinessRecord[] = (bizList || []).map((b: any) => {
      const lastAct = lastActivityMap.get(b.id) || b.created_at || null;
      let inactStatus: InactivityStatus = 'no_activity';

      if (lastAct) {
        const diffMs = now - new Date(lastAct).getTime();
        if (diffMs <= oneDayMs) {
          inactStatus = 'active_today';
        } else if (diffMs <= 7 * oneDayMs) {
          inactStatus = 'active_recently';
        } else if (diffMs <= 30 * oneDayMs) {
          inactStatus = 'dormant_14d';
        } else {
          inactStatus = 'dormant_30d';
        }
      }

      return {
        id: b.id,
        name: b.name,
        business_type: b.business_type,
        currency: b.currency || 'NGN',
        phone: b.phone,
        email: b.email,
        address: b.address,
        status: b.status,
        created_at: b.created_at,
        owner_name: b.owner?.name || null,
        owner_email: b.owner?.email || null,
        member_count: memberCountMap.get(b.id) || 1,
        total_sales_count: salesCountMap.get(b.id) || 0,
        total_sales_value: Math.round((salesSumMap.get(b.id) || 0) * 100) / 100,
        total_products_count: productCountMap.get(b.id) || 0,
        last_activity_at: lastAct,
        inactivity_status: inactStatus,
      };
    });

    return { data: records };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch business directory.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BUSINESS DRILL-DOWN DEEP-DIVE PAYLOAD
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminBusinessDetailPayload {
  business: AdminBusinessRecord;
  members: {
    id: string;
    user_id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
  }[];
  recentSales: AdminTransactionRecord[];
  lowStockProducts: AdminInventoryAlertRecord[];
  recentAuditLogs: AdminAuditRecord[];
  customerCount: number;
  totalCustomerDebt: number;
}

export async function getAdminBusinessDetails(
  businessId: string
): Promise<{ data?: AdminBusinessDetailPayload; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    // 1. Fetch business profile
    const { data: b, error: bErr } = await supabaseAdmin
      .from('businesses')
      .select('*, owner:users!businesses_owner_id_fkey(name, email)')
      .eq('id', businessId)
      .single();

    if (bErr || !b) throw new Error('Business not found.');

    // 2. Fetch members
    const { data: membersRaw } = await supabaseAdmin
      .from('business_members')
      .select('id, user_id, role, created_at, user:users(name, email)')
      .eq('business_id', businessId);

    const members = (membersRaw || []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      name: m.user?.name || 'User',
      email: m.user?.email || '',
      role: m.role,
      created_at: m.created_at,
    }));

    // 3. Fetch sales summary & recent sales
    const { data: salesRaw } = await supabaseAdmin
      .from('sales')
      .select('id, sale_number, business_id, customer_id, total, amount_paid, balance_due, payment_method, payment_status, status, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentSales: AdminTransactionRecord[] = (salesRaw || []).map((s) => ({
      id: s.id,
      sale_number: s.sale_number,
      business_id: s.business_id,
      business_name: b.name,
      total: Number(s.total || 0),
      amount_paid: Number(s.amount_paid || 0),
      balance_due: Number(s.balance_due || 0),
      payment_method: s.payment_method || 'cash',
      payment_status: s.payment_status || 'paid',
      status: s.status || 'completed',
      created_at: s.created_at,
    }));

    // 4. Fetch low stock items
    const { data: prodsRaw } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('business_id', businessId);

    const lowStockProducts: AdminInventoryAlertRecord[] = [];
    (prodsRaw || []).forEach((p) => {
      const cur = Number(p.current_stock || 0);
      const min = Number(p.minimum_stock || 5);
      if (cur <= min) {
        lowStockProducts.push({
          id: p.id,
          business_id: businessId,
          business_name: b.name,
          name: p.name,
          sku: p.sku || null,
          unit: p.unit || 'pcs',
          current_stock: cur,
          minimum_stock: min,
          purchase_price: Number(p.purchase_price || 0),
          selling_price: Number(p.selling_price || 0),
          status: cur <= 0 ? 'out_of_stock' : 'reorder_soon',
          updated_at: p.updated_at,
        });
      }
    });

    // 5. Fetch recent audit logs
    const { data: auditRaw } = await supabaseAdmin
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, metadata, created_at, user:users(name, email)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentAuditLogs: AdminAuditRecord[] = (auditRaw || []).map((log: any) => ({
      id: log.id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      metadata: log.metadata,
      created_at: log.created_at,
      business: { name: b.name },
      user: log.user ? { name: log.user.name, email: log.user.email } : null,
    }));

    // 6. Customers count & debt
    const { data: custRaw } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('business_id', businessId);

    const customerCount = custRaw?.length || 0;

    const { data: debtSales } = await supabaseAdmin
      .from('sales')
      .select('balance_due')
      .eq('business_id', businessId)
      .gt('balance_due', 0);

    const totalCustomerDebt = (debtSales || []).reduce((sum, s) => sum + (Number(s.balance_due) || 0), 0);

    // Business record mapping
    const businessRecord: AdminBusinessRecord = {
      id: b.id,
      name: b.name,
      business_type: b.business_type,
      currency: b.currency || 'NGN',
      phone: b.phone,
      email: b.email,
      address: b.address,
      status: b.status,
      created_at: b.created_at,
      owner_name: b.owner?.name || null,
      owner_email: b.owner?.email || null,
      member_count: members.length,
      total_sales_count: (salesRaw || []).length,
      total_sales_value: (salesRaw || []).reduce((sum, s) => sum + Number(s.total || 0), 0),
      total_products_count: (prodsRaw || []).length,
      last_activity_at: recentSales[0]?.created_at || b.created_at,
      inactivity_status: 'active_recently',
    };

    return {
      data: {
        business: businessRecord,
        members,
        recentSales,
        lowStockProducts,
        recentAuditLogs,
        customerCount,
        totalCustomerDebt: Math.round(totalCustomerDebt * 100) / 100,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch business details.' };
  }
}

export async function toggleBusinessStatus(
  businessId: string,
  newStatus: 'active' | 'inactive'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, supabaseAdmin } = await getSuperAdminContext();

    const { error } = await supabaseAdmin
      .from('businesses')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', businessId);

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'toggle_business_status',
      entity_type: 'business',
      entity_id: businessId,
      metadata: { new_status: newStatus, toggled_by: user.email },
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update business status.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PLATFORM USERS DIRECTORY & ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminUserBusinessMembership {
  id: string;
  name: string;
  role: string;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: 'active' | 'inactive';
  business_name?: string | null;
  business_id?: string | null;
  created_at: string;
  isPlatformOwner?: boolean;
  businesses?: AdminUserBusinessMembership[];
}

export async function getAdminUsers(options?: {
  search?: string;
  role?: string;
}): Promise<{ data?: AdminUserRecord[]; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    const { data: users, error: uErr } = await supabaseAdmin
      .from('users')
      .select('id, name, email, phone, status, created_at')
      .order('created_at', { ascending: false });

    if (uErr) throw uErr;

    const { data: members } = await supabaseAdmin
      .from('business_members')
      .select('user_id, business_id, role, business:businesses(name)');

    const memberMap = new Map<string, { role: string; bName: string; bId: string }>();
    const userBizMap = new Map<string, AdminUserBusinessMembership[]>();

    (members || []).forEach((m: any) => {
      if (!memberMap.has(m.user_id)) {
        memberMap.set(m.user_id, {
          role: m.role,
          bName: m.business?.name || 'Unnamed Business',
          bId: m.business_id,
        });
      }
      const current = userBizMap.get(m.user_id) || [];
      current.push({
        id: m.business_id,
        name: m.business?.name || 'Unnamed Business',
        role: m.role || 'member',
      });
      userBizMap.set(m.user_id, current);
    });

    let records: AdminUserRecord[] = (users || []).map((u) => {
      const mem = memberMap.get(u.id);
      const isOwner = PLATFORM_OWNER_EMAILS.includes(u.email?.toLowerCase().trim() || '');
      const bizList = userBizMap.get(u.id) || [];

      return {
        id: u.id,
        name: u.name || 'Unnamed User',
        email: u.email,
        phone: u.phone,
        role: isOwner ? 'super_admin' : mem?.role || 'user',
        status: (u.status as 'active' | 'inactive') || 'active',
        business_name: isOwner ? 'TraderERP Platform' : mem?.bName || 'No Business',
        business_id: mem?.bId || null,
        created_at: u.created_at,
        isPlatformOwner: isOwner,
        businesses: bizList,
      };
    });

    if (options?.role && options.role !== 'all') {
      records = records.filter((r) => r.role === options.role);
    }

    if (options?.search?.trim()) {
      const q = options.search.toLowerCase().trim();
      records = records.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.business_name && r.business_name.toLowerCase().includes(q))
      );
    }

    return { data: records };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch platform users directory.' };
  }
}

export async function toggleUserStatus(
  userId: string,
  newStatus: 'active' | 'inactive'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, supabaseAdmin } = await getSuperAdminContext();

    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (targetUser && PLATFORM_OWNER_EMAILS.includes(targetUser.email?.toLowerCase().trim() || '')) {
      throw new Error('Platform owner accounts cannot be deactivated.');
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'toggle_user_status',
      entity_type: 'user',
      entity_id: userId,
      metadata: { new_status: newStatus, toggled_by: user.email },
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update user status.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CUSTOMER FEEDBACK & EXPERIENCE HUB
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
// 8. PLATFORM AUDIT TRAIL
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

export async function getAdminAuditLogs(options?: number | {
  limit?: number;
  eventType?: string;
  businessId?: string;
  search?: string;
}): Promise<{
  data?: AdminAuditRecord[];
  error?: string;
}> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();
    const limit = typeof options === 'number' ? options : options?.limit || 60;
    const eventType = typeof options === 'object' ? options?.eventType : undefined;
    const businessId = typeof options === 'object' ? options?.businessId : undefined;
    const search = typeof options === 'object' ? options?.search : undefined;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, metadata, created_at, business:businesses(name), user:users(name, email)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventType && eventType !== 'all') {
      query = query.eq('entity_type', eventType);
    }

    if (businessId && businessId !== 'all') {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query;
    if (error) throw error;

    let records: AdminAuditRecord[] = (data as any[]) || [];

    if (search?.trim()) {
      const q = search.toLowerCase().trim();
      records = records.filter(
        (r) =>
          r.action.toLowerCase().includes(q) ||
          r.entity_type.toLowerCase().includes(q) ||
          r.business?.name?.toLowerCase().includes(q) ||
          r.user?.name?.toLowerCase().includes(q) ||
          r.user?.email?.toLowerCase().includes(q)
      );
    }

    return { data: records };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch audit log stream.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. SYSTEM HEALTH & INTEGRATION MONITORING
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

// ─────────────────────────────────────────────────────────────────────────────
// 10. PLATFORM-WIDE CUSTOMER DIRECTORY & TELEMETRY
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminCustomerRecord {
  id: string;
  business_id: string;
  business_name?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  outstanding_balance?: number;
}

export async function getAdminCustomers(options?: {
  search?: string;
  businessId?: string;
  status?: string;
}): Promise<{ data?: AdminCustomerRecord[]; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('id, name');

    const bizMap = new Map<string, string>();
    (businesses || []).forEach((b) => bizMap.set(b.id, b.name));

    const { data: openSales } = await supabaseAdmin
      .from('sales')
      .select('customer_id, balance_due')
      .gt('balance_due', 0);

    const balanceMap = new Map<string, number>();
    (openSales || []).forEach((s) => {
      if (s.customer_id) {
        balanceMap.set(
          s.customer_id,
          (balanceMap.get(s.customer_id) || 0) + Number(s.balance_due || 0)
        );
      }
    });

    let query = supabaseAdmin
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.businessId && options.businessId !== 'all') {
      query = query.eq('business_id', options.businessId);
    }

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.search?.trim()) {
      const s = options.search.trim();
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,address.ilike.%${s}%`);
    }

    const { data: customers, error } = await query;
    if (error) throw error;

    const records: AdminCustomerRecord[] = (customers || []).map((c: any) => ({
      id: c.id,
      business_id: c.business_id,
      business_name: bizMap.get(c.business_id) || 'Unknown Store',
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      notes: c.notes,
      status: c.status || 'active',
      created_at: c.created_at,
      updated_at: c.updated_at,
      outstanding_balance: balanceMap.get(c.id) || 0,
    }));

    return { data: records };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch platform customer directory.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. UNIFIED REAL-TIME DATA REFRESH (ALL DATASETS IN PARALLEL)
// ─────────────────────────────────────────────────────────────────────────────

export interface AllAdminDataPayload {
  stats: SuperAdminStats;
  transactions: AdminTransactionAnalytics;
  inventory: AdminInventoryAnalytics;
  businesses: AdminBusinessRecord[];
  users: AdminUserRecord[];
  customers: AdminCustomerRecord[];
  feedback: AdminFeedbackRecord[];
  auditLogs: AdminAuditRecord[];
  health: SystemHealthData;
  timestamp: string;
  dateRange: AdminDateRange;
}

export async function getAllAdminData(
  range: AdminDateRange = 'all'
): Promise<{
  data?: AllAdminDataPayload;
  error?: string;
}> {
  try {
    const [statsRes, transRes, invRes, bizRes, usersRes, customersRes, feedbackRes, auditRes, healthRes] =
      await Promise.all([
        getSuperAdminStats(range),
        getAdminTransactionAnalytics(range),
        getAdminInventoryAnalytics(),
        getAdminBusinesses(),
        getAdminUsers(),
        getAdminCustomers(),
        getAdminFeedback(),
        getAdminAuditLogs({ limit: 60 }),
        getSystemHealth(),
      ]);

    const defaultStats: SuperAdminStats = {
      totalBusinesses: 0,
      activeBusinesses: 0,
      inactiveBusinesses: 0,
      totalUsers: 0,
      totalCustomers: 0,
      activeCustomers: 0,
      totalCustomerDebt: 0,
      roleDistribution: { owner: 0, admin: 0, staff: 0, superAdmin: 1 },
      registrationTrends: [],
      totalFeedbackCount: 0,
      averageRating: 5,
      recentActivityCount: 0,
      totalSalesCount: 0,
      grossSalesValue: 0,
      totalCollected: 0,
      totalProductsCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      periodLabel: getDateRangeLabel(range),
    };

    const defaultTransactions: AdminTransactionAnalytics = {
      totalTransactions: 0,
      completedTransactions: 0,
      cancelledTransactions: 0,
      grossSalesValue: 0,
      totalCollected: 0,
      totalOutstandingCredit: 0,
      paymentMethods: {
        cash: { count: 0, value: 0 },
        bank_transfer: { count: 0, value: 0 },
        pos: { count: 0, value: 0 },
        credit: { count: 0, value: 0 },
        other: { count: 0, value: 0 },
      },
      topBusinesses: [],
      recentTransactions: [],
    };

    const defaultInventory: AdminInventoryAnalytics = {
      totalProducts: 0,
      businessesWithProducts: 0,
      outOfStockCount: 0,
      lowStockCount: 0,
      estimatedTotalValuation: 0,
      alerts: [],
      topCatalogs: [],
    };

    const defaultHealth: SystemHealthData = {
      databaseStatus: 'healthy',
      databaseLatencyMs: 35,
      authStatus: 'healthy',
      environment: process.env.NODE_ENV || 'production',
      platformVersion: '1.2.0-mvp',
      platformOwner: 'Sardauna Tech Lab Ltd',
      lastChecked: new Date().toISOString(),
    };

    return {
      data: {
        stats: statsRes.data || defaultStats,
        transactions: transRes.data || defaultTransactions,
        inventory: invRes.data || defaultInventory,
        businesses: bizRes.data || [],
        users: usersRes.data || [],
        customers: customersRes.data || [],
        feedback: feedbackRes.data || [],
        auditLogs: auditRes.data || [],
        health: healthRes.data || defaultHealth,
        timestamp: new Date().toISOString(),
        dateRange: range,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to refresh platform telemetry.' };
  }
}
