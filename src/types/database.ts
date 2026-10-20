// Tenant-scoped business workspace roles (stored in business_members)
export type TenantRole = 'owner' | 'admin' | 'staff';

// Platform-level governance role (reserved strictly for Platform Owner)
export type PlatformRole = 'super_admin';

// Unified user role type
export type UserRole = TenantRole | PlatformRole;
export type EntityStatus = 'active' | 'inactive' | 'archived';
export type PaymentStatus = 'paid' | 'partial' | 'credit';
export type SaleStatus = 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'pos' | 'other';
export type MovementType = 
  | 'opening_stock'
  | 'sale'
  | 'stock_addition'
  | 'manual_adjustment'
  | 'sale_reversal'
  | 'return';

export const PRODUCT_UNITS = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'bags', label: 'Bags (bag)' },
  { value: 'cartons', label: 'Cartons (ctn)' },
  { value: 'packs', label: 'Packs (pk)' },
  { value: 'boxes', label: 'Boxes (box)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'litres', label: 'Litres (L)' },
  { value: 'rolls', label: 'Rolls (roll)' },
  { value: 'bundles', label: 'Bundles (bdl)' },
  { value: 'pairs', label: 'Pairs (pr)' },
  { value: 'sets', label: 'Sets (set)' },
  { value: 'dozens', label: 'Dozens (doz)' },
  { value: 'tins', label: 'Tins / Cans (tin)' },
  { value: 'bottles', label: 'Bottles (btl)' },
  { value: 'crates', label: 'Crates (crt)' },
  { value: 'yards', label: 'Yards (yd)' },
  { value: 'meters', label: 'Meters (m)' },
] as const;

export interface Business {
  id: string;
  name: string;
  business_type?: string | null;
  owner_id?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  currency: string;
  logo_url?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: UserRole;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  business?: Business;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id?: string | null;
  name: string;
  sku?: string | null;
  description?: string | null;
  unit: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  minimum_stock: number;
  image_url?: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  category?: Category | null;
}

export interface InventoryMovement {
  id: string;
  business_id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  reference_id?: string | null;
  reference_type?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  product?: Product;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  outstanding_balance?: number;
}

export interface Sale {
  id: string;
  business_id: string;
  sale_number: string;
  customer_id?: string | null;
  subtotal: number;
  discount: number;
  total?: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: PaymentStatus;
  notes?: string | null;
  status: SaleStatus;
  sold_by?: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer | null;
  items?: SaleItem[];
  payments?: Payment[];
  receipts?: Receipt[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name_snapshot: string;
  unit_price: number;
  cost_price?: number;
  quantity: number;
  subtotal: number;
  created_at: string;
}

export interface Payment {
  id: string;
  business_id: string;
  sale_id?: string | null;
  customer_id?: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  created_at: string;
  sale?: Sale | null;
  customer?: Customer | null;
}

export interface Receipt {
  id: string;
  business_id: string;
  sale_id: string;
  receipt_number: string;
  receipt_data: Record<string, any>;
  issued_at: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  business_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  business_id: string;
  category_id?: string | null;
  amount: number;
  description: string;
  payment_method: PaymentMethod;
  expense_date: string;
  receipt_url?: string | null;
  note?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory | null;
}

export interface AuditLog {
  id: string;
  business_id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  created_at: string;
}

export interface DashboardSummary {
  today_sales: number;
  today_expenses: number;
  estimated_profit: number;
  outstanding_credit: number;
  today_sales_count: number;
  low_stock_count: number;
}

export type FeedbackCategory = 'experience' | 'feature_request' | 'bug_report' | 'praise' | 'general';

export interface AppFeedback {
  id: string;
  business_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  business_name?: string | null;
  rating?: number | null;
  category: FeedbackCategory;
  message: string;
  created_at: string;
}

export type ConsentType = 'terms_and_privacy' | 'marketing_emails' | 'analytics_cookies';

export interface UserConsent {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  policy_version: string;
  granted: boolean;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
}

export type DeletionRequestStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'rejected';

export interface AccountDeletionRequest {
  id: string;
  user_id: string;
  business_id?: string | null;
  user_email: string;
  user_role: string;
  reason?: string | null;
  status: DeletionRequestStatus;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  tour_completed: boolean;
  tour_dismissed_at?: string | null;
  tour_completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

