-- =======================================================
-- TraderERP MVP — Fresh Database Schema
-- Clean rebuild: 14 core tables, RLS, functions, indexes
-- =======================================================

-- ==========================================
-- 0. DROP ALL LEGACY TABLES & FUNCTIONS
-- ==========================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS public.process_sale(UUID, UUID, VARCHAR, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.current_business_id() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.current_branch_id() CASCADE;
DROP FUNCTION IF EXISTS public.recompute_daily_metrics(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS public.recompute_monthly_metrics(UUID, DATE) CASCADE;

DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.repayments CASCADE;
DROP TABLE IF EXISTS public.metrics_monthly CASCADE;
DROP TABLE IF EXISTS public.metrics_daily CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.branch_product_prices CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.user_branches CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.receipts CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.expense_categories CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.business_members CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;

-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. UTILITY FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.current_business_id()
RETURNS UUID AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'business_id',
    ''
  )::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role',
    ''
  )::VARCHAR;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==========================================
-- 2. CORE TABLES
-- ==========================================

-- ──────────────── AUTH GROUP ────────────────

-- 2.1 businesses
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),
    owner_id UUID,  -- set after user creation
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    logo_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 users (profile table linked to auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 business_members (user ↔ business + role)
CREATE TABLE public.business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_per_business UNIQUE (business_id, user_id)
);

-- ──────────────── PRODUCT & INVENTORY GROUP ────────────────

-- 2.4 categories
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_category_per_business UNIQUE (business_id, name)
);

-- 2.5 products
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    description TEXT,
    unit VARCHAR(50) DEFAULT 'piece',
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    minimum_stock INTEGER NOT NULL DEFAULT 5 CHECK (minimum_stock >= 0),
    image_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_sku_per_business UNIQUE (business_id, sku)
);

-- 2.6 inventory_movements
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('opening_stock', 'stock_addition', 'sale', 'sale_reversal', 'manual_adjustment')),
    quantity INTEGER NOT NULL,  -- positive for additions, negative for deductions
    reference_type VARCHAR(30),  -- 'sale', 'adjustment', etc.
    reference_id UUID,  -- FK to sale or other entity
    reason TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────── CUSTOMERS GROUP ────────────────

-- 2.7 customers
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────── SALES GROUP ────────────────

-- 2.8 sales
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    sale_number VARCHAR(20) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance_due >= 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'credit' CHECK (payment_status IN ('paid', 'partial', 'credit')),
    payment_method VARCHAR(30) CHECK (payment_method IN ('cash', 'bank_transfer', 'pos', 'other')),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    sold_by UUID REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_sale_number_per_business UNIQUE (business_id, sale_number)
);

-- 2.9 sale_items (with product snapshots for historical accuracy)
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.10 payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'pos', 'other')),
    reference VARCHAR(255),
    recorded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.11 receipts
CREATE TABLE public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    receipt_number VARCHAR(20) NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    file_url TEXT,
    CONSTRAINT unique_receipt_per_sale UNIQUE (sale_id)
);

-- ──────────────── EXPENSES GROUP ────────────────

-- 2.12 expense_categories
CREATE TABLE public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_expense_category_per_business UNIQUE (business_id, name)
);

-- 2.13 expenses
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'pos', 'other')),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    recorded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────── AUDIT GROUP ────────────────

-- 2.14 audit_logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. INDEXES (optimized for business-scoped queries)
-- ==========================================

-- business_members
CREATE INDEX idx_business_members_business ON public.business_members(business_id);
CREATE INDEX idx_business_members_user ON public.business_members(user_id);

-- categories
CREATE INDEX idx_categories_business ON public.categories(business_id);

-- products
CREATE INDEX idx_products_business ON public.products(business_id);
CREATE INDEX idx_products_business_status ON public.products(business_id, status);
CREATE INDEX idx_products_business_sku ON public.products(business_id, sku);
CREATE INDEX idx_products_category ON public.products(category_id);

-- inventory_movements
CREATE INDEX idx_inventory_movements_business ON public.inventory_movements(business_id);
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_created ON public.inventory_movements(business_id, created_at);

-- customers
CREATE INDEX idx_customers_business ON public.customers(business_id);
CREATE INDEX idx_customers_phone ON public.customers(business_id, phone);

-- sales
CREATE INDEX idx_sales_business ON public.sales(business_id);
CREATE INDEX idx_sales_business_created ON public.sales(business_id, created_at);
CREATE INDEX idx_sales_business_status ON public.sales(business_id, status);
CREATE INDEX idx_sales_customer ON public.sales(customer_id);
CREATE INDEX idx_sales_business_sale_number ON public.sales(business_id, sale_number);

-- sale_items
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON public.sale_items(product_id);

-- payments
CREATE INDEX idx_payments_business ON public.payments(business_id);
CREATE INDEX idx_payments_sale ON public.payments(sale_id);
CREATE INDEX idx_payments_customer ON public.payments(customer_id);

-- expenses
CREATE INDEX idx_expenses_business ON public.expenses(business_id);
CREATE INDEX idx_expenses_business_date ON public.expenses(business_id, expense_date);
CREATE INDEX idx_expenses_category ON public.expenses(category_id);

-- receipts
CREATE INDEX idx_receipts_business ON public.receipts(business_id);
CREATE INDEX idx_receipts_sale ON public.receipts(sale_id);

-- audit_logs
CREATE INDEX idx_audit_logs_business ON public.audit_logs(business_id);
CREATE INDEX idx_audit_logs_business_created ON public.audit_logs(business_id, created_at);

-- ==========================================
-- 4. AUTH TRIGGER (create user profile on signup)
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone, status, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    'active',
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), public.users.name),
      phone = COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), public.users.phone),
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==========================================
-- 5. SALE NUMBER GENERATOR
-- ==========================================

CREATE OR REPLACE FUNCTION public.generate_sale_number(p_business_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_number VARCHAR;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.sales
  WHERE business_id = p_business_id;

  v_number := 'TR-' || LPAD(v_count::TEXT, 6, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 6. ATOMIC SALE TRANSACTION
-- ==========================================

CREATE OR REPLACE FUNCTION public.process_sale(
    p_customer_id UUID,
    p_payment_method VARCHAR,
    p_amount_paid NUMERIC,
    p_discount NUMERIC,
    p_items JSONB,  -- [{product_id, quantity, unit_price}]
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_business_id UUID;
    v_user_id UUID;
    v_sale_id UUID;
    v_sale_number VARCHAR;
    v_receipt_id UUID;
    v_item RECORD;
    v_subtotal NUMERIC(12,2) := 0.00;
    v_total NUMERIC(12,2);
    v_balance_due NUMERIC(12,2);
    v_payment_status VARCHAR;
    v_product_name VARCHAR;
    v_current_stock INTEGER;
    v_item_subtotal NUMERIC(12,2);
BEGIN
    v_business_id := public.current_business_id();
    v_user_id := auth.uid();

    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Not authorized: no business context';
    END IF;

    -- Validate customer belongs to business (if specified)
    IF p_customer_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.customers
        WHERE id = p_customer_id AND business_id = v_business_id
    ) THEN
        RAISE EXCEPTION 'Customer not found in your business';
    END IF;

    -- Generate sale number
    v_sale_number := public.generate_sale_number(v_business_id);
    v_sale_id := gen_random_uuid();

    -- Process each item: validate stock, calculate subtotals
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT, unit_price NUMERIC)
    LOOP
        -- Verify product belongs to business
        SELECT name, current_stock INTO v_product_name, v_current_stock
        FROM public.products
        WHERE id = v_item.product_id AND business_id = v_business_id
        FOR UPDATE;

        IF v_product_name IS NULL THEN
            RAISE EXCEPTION 'Product % not found in your business', v_item.product_id;
        END IF;

        -- Validate stock
        IF v_current_stock < v_item.quantity THEN
            RAISE EXCEPTION 'Not enough stock available for %. Available: %, Requested: %',
                v_product_name, v_current_stock, v_item.quantity;
        END IF;

        -- Calculate item subtotal
        v_item_subtotal := v_item.unit_price * v_item.quantity;
        v_subtotal := v_subtotal + v_item_subtotal;

        -- Create sale item with snapshot
        INSERT INTO public.sale_items (sale_id, product_id, product_name_snapshot, quantity, unit_price, discount, subtotal)
        VALUES (v_sale_id, v_item.product_id, v_product_name, v_item.quantity, v_item.unit_price, 0, v_item_subtotal);

        -- Reduce stock
        UPDATE public.products
        SET current_stock = current_stock - v_item.quantity, updated_at = NOW()
        WHERE id = v_item.product_id;

        -- Create inventory movement
        INSERT INTO public.inventory_movements (business_id, product_id, type, quantity, reference_type, reference_id, created_by)
        VALUES (v_business_id, v_item.product_id, 'sale', -v_item.quantity, 'sale', v_sale_id, v_user_id);
    END LOOP;

    -- Calculate totals
    v_total := v_subtotal - COALESCE(p_discount, 0);
    IF v_total < 0 THEN v_total := 0; END IF;

    v_balance_due := v_total - COALESCE(p_amount_paid, 0);
    IF v_balance_due < 0 THEN v_balance_due := 0; END IF;

    -- Determine payment status
    IF p_amount_paid >= v_total THEN
        v_payment_status := 'paid';
        v_balance_due := 0;
    ELSIF p_amount_paid > 0 THEN
        v_payment_status := 'partial';
    ELSE
        v_payment_status := 'credit';
    END IF;

    -- Create sale record
    INSERT INTO public.sales (id, business_id, customer_id, sale_number, subtotal, discount, total, amount_paid, balance_due, payment_status, payment_method, status, sold_by, notes)
    VALUES (v_sale_id, v_business_id, p_customer_id, v_sale_number, v_subtotal, COALESCE(p_discount, 0), v_total, COALESCE(p_amount_paid, 0), v_balance_due, v_payment_status, p_payment_method, 'completed', v_user_id, p_notes);

    -- Create initial payment record (if any payment made)
    IF p_amount_paid > 0 THEN
        INSERT INTO public.payments (business_id, sale_id, customer_id, amount, payment_method, recorded_by)
        VALUES (v_business_id, v_sale_id, p_customer_id, p_amount_paid, p_payment_method, v_user_id);
    END IF;

    -- Create receipt
    v_receipt_id := gen_random_uuid();
    INSERT INTO public.receipts (id, business_id, sale_id, receipt_number)
    VALUES (v_receipt_id, v_business_id, v_sale_id, v_sale_number);

    -- Create audit log
    INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (v_business_id, v_user_id, 'CREATE_SALE', 'sale', v_sale_id,
        jsonb_build_object('sale_number', v_sale_number, 'total', v_total, 'payment_status', v_payment_status));

    RETURN jsonb_build_object(
        'sale_id', v_sale_id,
        'sale_number', v_sale_number,
        'receipt_id', v_receipt_id,
        'total', v_total,
        'amount_paid', COALESCE(p_amount_paid, 0),
        'balance_due', v_balance_due,
        'payment_status', v_payment_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 7. ATOMIC SALE CANCELLATION
-- ==========================================

CREATE OR REPLACE FUNCTION public.cancel_sale(p_sale_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_business_id UUID;
    v_user_id UUID;
    v_sale RECORD;
    v_item RECORD;
BEGIN
    v_business_id := public.current_business_id();
    v_user_id := auth.uid();

    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Not authorized: no business context';
    END IF;

    -- Get and lock the sale
    SELECT * INTO v_sale
    FROM public.sales
    WHERE id = p_sale_id AND business_id = v_business_id
    FOR UPDATE;

    IF v_sale IS NULL THEN
        RAISE EXCEPTION 'Sale not found';
    END IF;

    IF v_sale.status = 'cancelled' THEN
        RAISE EXCEPTION 'Sale is already cancelled';
    END IF;

    -- Restore stock for each item
    FOR v_item IN
        SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
    LOOP
        -- Restore product stock
        UPDATE public.products
        SET current_stock = current_stock + v_item.quantity, updated_at = NOW()
        WHERE id = v_item.product_id;

        -- Create reversal inventory movement
        INSERT INTO public.inventory_movements (business_id, product_id, type, quantity, reference_type, reference_id, reason, created_by)
        VALUES (v_business_id, v_item.product_id, 'sale_reversal', v_item.quantity, 'sale', p_sale_id, 'Sale cancelled', v_user_id);
    END LOOP;

    -- Mark sale as cancelled
    UPDATE public.sales
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = p_sale_id;

    -- Audit log
    INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (v_business_id, v_user_id, 'CANCEL_SALE', 'sale', p_sale_id,
        jsonb_build_object('sale_number', v_sale.sale_number, 'total', v_sale.total));

    RETURN jsonb_build_object('success', true, 'sale_id', p_sale_id, 'status', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 8. CREDIT PAYMENT FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION public.record_credit_payment(
    p_sale_id UUID,
    p_amount NUMERIC,
    p_payment_method VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    v_business_id UUID;
    v_user_id UUID;
    v_sale RECORD;
    v_new_amount_paid NUMERIC(12,2);
    v_new_balance NUMERIC(12,2);
    v_new_status VARCHAR;
BEGIN
    v_business_id := public.current_business_id();
    v_user_id := auth.uid();

    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Get and lock sale
    SELECT * INTO v_sale
    FROM public.sales
    WHERE id = p_sale_id AND business_id = v_business_id
    FOR UPDATE;

    IF v_sale IS NULL THEN
        RAISE EXCEPTION 'Sale not found';
    END IF;

    IF v_sale.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot record payment on a cancelled sale';
    END IF;

    IF v_sale.balance_due <= 0 THEN
        RAISE EXCEPTION 'This sale has no outstanding balance';
    END IF;

    IF p_amount > v_sale.balance_due THEN
        RAISE EXCEPTION 'Payment amount (%) exceeds outstanding balance (%)', p_amount, v_sale.balance_due;
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    -- Calculate new values
    v_new_amount_paid := v_sale.amount_paid + p_amount;
    v_new_balance := v_sale.balance_due - p_amount;

    IF v_new_balance <= 0 THEN
        v_new_status := 'paid';
        v_new_balance := 0;
    ELSE
        v_new_status := 'partial';
    END IF;

    -- Update sale
    UPDATE public.sales
    SET amount_paid = v_new_amount_paid,
        balance_due = v_new_balance,
        payment_status = v_new_status,
        updated_at = NOW()
    WHERE id = p_sale_id;

    -- Create payment record
    INSERT INTO public.payments (business_id, sale_id, customer_id, amount, payment_method, recorded_by)
    VALUES (v_business_id, p_sale_id, v_sale.customer_id, p_amount, p_payment_method, v_user_id);

    -- Audit log
    INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (v_business_id, v_user_id, 'RECORD_PAYMENT', 'payment', p_sale_id,
        jsonb_build_object('amount', p_amount, 'new_balance', v_new_balance, 'status', v_new_status));

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', p_sale_id,
        'amount_paid', v_new_amount_paid,
        'balance_due', v_new_balance,
        'payment_status', v_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ── businesses ──
CREATE POLICY businesses_select ON public.businesses
  FOR SELECT TO authenticated
  USING (id = public.current_business_id());

CREATE POLICY businesses_insert ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);  -- anyone can create a business during onboarding

CREATE POLICY businesses_update ON public.businesses
  FOR UPDATE TO authenticated
  USING (id = public.current_business_id() AND public.current_user_role() IN ('owner', 'admin'));

-- ── users ──
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR id IN (
    SELECT user_id FROM public.business_members WHERE business_id = public.current_business_id()
  ));

CREATE POLICY users_insert ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY users_update ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ── business_members ──
CREATE POLICY business_members_select ON public.business_members
  FOR SELECT TO authenticated
  USING (business_id = public.current_business_id());

CREATE POLICY business_members_insert ON public.business_members
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.current_business_id() OR TRUE);  -- allow during onboarding

CREATE POLICY business_members_update ON public.business_members
  FOR UPDATE TO authenticated
  USING (business_id = public.current_business_id() AND public.current_user_role() IN ('owner', 'admin'));

CREATE POLICY business_members_delete ON public.business_members
  FOR DELETE TO authenticated
  USING (business_id = public.current_business_id() AND public.current_user_role() = 'owner');

-- ── categories ──
CREATE POLICY categories_select ON public.categories
  FOR SELECT TO authenticated
  USING (business_id = public.current_business_id());

CREATE POLICY categories_modify ON public.categories
  FOR ALL TO authenticated
  USING (business_id = public.current_business_id() AND public.current_user_role() IN ('owner', 'admin'));

-- ── products ──
CREATE POLICY products_select ON public.products
  FOR SELECT TO authenticated
  USING (business_id = public.current_business_id());

CREATE POLICY products_insert ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.current_business_id() AND public.current_user_role() IN ('owner', 'admin'));

CREATE POLICY products_update ON public.products
  FOR UPDATE TO authenticated
  USING (business_id = public.current_business_id() AND public.current_user_role() IN ('owner', 'admin'));

CREATE POLICY products_delete ON public.products
  FOR DELETE TO authenticated
  USING (business_id = public.current_business_id() AND public.current_user_role() IN ('owner', 'admin'));

-- ── inventory_movements ──
CREATE POLICY inventory_movements_select ON public.inventory_movements
  FOR SELECT TO authenticated
  USING (business_id = public.current_business_id());

CREATE POLICY inventory_movements_insert ON public.inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.current_business_id());

-- ── customers ──
CREATE POLICY customers_select ON public.customers
  FOR SELECT TO authenticated
  USING (business_id = public.current_business_id());

CREATE POLICY customers_insert ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.current_business_id());

CREATE POLICY customers_update ON public.customers
  FOR UPDATE TO authenticated
  USING (business_id = public.current_business_id() AND public.current_user_role() IN ('owner', 'admin'));

CREATE POLICY customers_delete ON public.customers
  FOR DELETE TO authenticated
  USING (business_id = public.current_business_id() AND public.current_user_role() IN ('owner', 'admin'));

-- ── sales ──
CREATE POLICY sales_select ON public.sales
  FOR SELECT TO authenticated
  USING (business_id = public.current_business_id());

CREATE POLICY sales_insert ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.current_business_id());

-- sales update/delete blocked (managed by stored procedures)
CREATE POLICY sales_update ON public.sales
  FOR UPDATE TO authenticated
  USING (business_id = public.current_business_id());

-- ── sale_items ──
CREATE POLICY sale_items_select ON public.sale_items
  FOR SELECT TO authenticated
  USING (sale_id IN (SELECT id FROM public.sales WHERE business_id = public.current_business_id()));

CREATE POLICY sale_items_insert ON public.sale_items
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);  -- managed by process_sale function

-- ── payments ──
CREATE POLICY payments_select ON public.payments
  FOR SELECT TO authenticated
  USING (business_id = public.current_business_id());

CREATE POLICY payments_insert ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.current_business_id());

-- ── receipts ──
CREATE POLICY receipts_select ON public.receipts
  FOR SELECT TO authenticated
  USING (business_id = public.current_business_id());

CREATE POLICY receipts_insert ON public.receipts
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.current_business_id());

-- ── expense_categories ──
CREATE POLICY expense_categories_select ON public.expense_categories
  FOR SELECT TO authenticated
  USING (business_id = public.current_business_id());

CREATE POLICY expense_categories_modify ON public.expense_categories
  FOR ALL TO authenticated
  USING (business_id = public.current_business_id() AND public.current_user_role() IN ('owner', 'admin'));

-- ── expenses ──
CREATE POLICY expenses_select ON public.expenses
  FOR SELECT TO authenticated
  USING (business_id = public.current_business_id());

CREATE POLICY expenses_insert ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.current_business_id());

CREATE POLICY expenses_update ON public.expenses
  FOR UPDATE TO authenticated
  USING (business_id = public.current_business_id() AND public.current_user_role() IN ('owner', 'admin'));

CREATE POLICY expenses_delete ON public.expenses
  FOR DELETE TO authenticated
  USING (business_id = public.current_business_id() AND public.current_user_role() IN ('owner', 'admin'));

-- ── audit_logs ──
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (business_id = public.current_business_id() AND public.current_user_role() IN ('owner', 'admin'));

CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.current_business_id());

-- ==========================================
-- 10. UPDATED_AT TRIGGER
-- ==========================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.business_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ==========================================
-- 11. APP FEEDBACK
-- ==========================================

CREATE TABLE IF NOT EXISTS public.app_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    business_name VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    category VARCHAR(50) NOT NULL DEFAULT 'experience',
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.app_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_business_id ON public.app_feedback(business_id);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_authenticated_feedback_insert"
ON public.app_feedback
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "allow_users_view_own_feedback"
ON public.app_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

