-- =======================================================
-- TraderERP Functions, Triggers & RLS Policies Setup
-- (SAFE: This script does NOT drop tables or delete data)
-- =======================================================

-- 1. UTILITY FUNCTIONS & CLAIMS RESOLUTION
CREATE OR REPLACE FUNCTION public.current_business_id() 
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'business_id', '')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_role() 
RETURNS VARCHAR AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role', '')::VARCHAR;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. AUTH.USERS TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id UUID;
  v_role VARCHAR;
  v_must_change_password BOOLEAN;
  v_phone VARCHAR;
BEGIN
  v_business_id := NULLIF(NEW.raw_app_meta_data->>'business_id', '')::UUID;
  v_role := COALESCE(NULLIF(NEW.raw_app_meta_data->>'role', ''), 'STAFF')::VARCHAR;
  v_must_change_password := COALESCE((NEW.raw_app_meta_data->>'must_change_password')::BOOLEAN, TRUE);
  v_phone := NEW.raw_user_meta_data->>'phone';

  INSERT INTO public.users (id, business_id, email, name, role, status, must_change_password, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    v_business_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    v_role,
    'ACTIVE',
    v_must_change_password,
    v_phone,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      business_id = COALESCE(v_business_id, public.users.business_id),
      name = COALESCE(NEW.raw_user_meta_data->>'name', public.users.name),
      role = COALESCE(v_role, public.users.role),
      must_change_password = COALESCE(v_must_change_password, public.users.must_change_password),
      phone = COALESCE(v_phone, public.users.phone),
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 3. SALES TRANSACTION RPC
CREATE OR REPLACE FUNCTION public.process_sale(
    p_branch_id UUID,
    p_customer_id UUID,
    p_payment_method VARCHAR,
    p_items JSONB -- [{product_id: UUID, quantity: INT}]
)
RETURNS UUID AS $$
DECLARE
    v_business_id UUID;
    v_cashier_id UUID;
    v_sale_id UUID;
    v_item RECORD;
    v_total_amount NUMERIC(12,2) := 0.00;
    v_item_price NUMERIC(12,2);
    v_stock_qty INT;
    v_product_id UUID;
    v_qty INT;
BEGIN
    v_business_id := public.current_business_id();
    v_cashier_id := auth.uid();
    
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- SECURITY CHECK: Verify branch belongs to cashier's business and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.branches
        WHERE id = p_branch_id AND business_id = v_business_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Invalid branch context or branch is inactive';
    END IF;

    -- SECURITY CHECK: Verify customer belongs to cashier's business (if specified)
    IF p_customer_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.customers
        WHERE id = p_customer_id AND business_id = v_business_id
    ) THEN
        RAISE EXCEPTION 'Customer profile not found';
    END IF;

    -- Create Sale record first
    v_sale_id := gen_random_uuid();
    INSERT INTO public.sales (id, business_id, branch_id, cashier_id, customer_id, total_amount, payment_method)
    VALUES (v_sale_id, v_business_id, p_branch_id, v_cashier_id, p_customer_id, 0.00, p_payment_method);

    -- Loop through products and process stock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
    LOOP
        v_product_id := v_item.product_id;
        v_qty := v_item.quantity;

        -- SECURITY CHECK: Verify product belongs to cashier's business
        IF NOT EXISTS (
            SELECT 1 FROM public.products
            WHERE id = v_product_id AND business_id = v_business_id
        ) THEN
            RAISE EXCEPTION 'Product catalog ID % does not belong to your business', v_product_id;
        END IF;

        -- Lock inventory row and check stock
        SELECT quantity INTO v_stock_qty
        FROM public.inventory
        WHERE branch_id = p_branch_id AND product_id = v_product_id
        FOR UPDATE;

        IF v_stock_qty IS NULL OR v_stock_qty < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product ID %', v_product_id;
        END IF;

        -- Determine price (branch override fallback to default price)
        SELECT COALESCE(bpp.price, p.default_price) INTO v_item_price
        FROM public.products p
        LEFT JOIN public.branch_product_prices bpp ON bpp.product_id = p.id AND bpp.branch_id = p_branch_id
        WHERE p.id = v_product_id;

        -- Deduct stock
        UPDATE public.inventory
        SET quantity = quantity - v_qty
        WHERE branch_id = p_branch_id AND product_id = v_product_id;

        -- Create sale item record
        INSERT INTO public.sale_items (business_id, sale_id, product_id, quantity, unit_price, total_price)
        VALUES (v_business_id, v_sale_id, v_product_id, v_qty, v_item_price, v_item_price * v_qty);

        -- Log stock movement
        INSERT INTO public.stock_movements (business_id, branch_id, product_id, quantity, type, reference_id, recorded_by, notes)
        VALUES (v_business_id, p_branch_id, v_product_id, -v_qty, 'sale', v_sale_id, v_cashier_id, 'Point of sale transaction');

        v_total_amount := v_total_amount + (v_item_price * v_qty);
    END LOOP;

    -- Update total amount on sale
    UPDATE public.sales
    SET total_amount = v_total_amount
    WHERE id = v_sale_id;

    -- Update customer total spend
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET total_spend = total_spend + v_total_amount
        WHERE id = p_customer_id;
    END IF;

    -- Trigger metrics recomputation (cached analytics)
    PERFORM public.recompute_daily_metrics(v_business_id, NOW()::DATE);
    PERFORM public.recompute_monthly_metrics(v_business_id, date_trunc('month', NOW())::DATE);

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. METRICS AGGREGATION FUNCTIONS
CREATE OR REPLACE FUNCTION public.recompute_daily_metrics(p_business_id UUID, p_date DATE)
RETURNS VOID AS $$
DECLARE
    v_revenue NUMERIC(12,2) := 0.00;
    v_sales_count INT := 0;
    v_low_stock INT := 0;
    v_branch_perf JSONB := '{}'::jsonb;
    v_top_prods JSONB := '[]'::jsonb;
BEGIN
    -- 1. Calculate revenue and sales count
    SELECT COALESCE(SUM(total_amount), 0.00), COUNT(*) INTO v_revenue, v_sales_count
    FROM public.sales
    WHERE business_id = p_business_id AND created_at::DATE = p_date;

    -- 2. Count low stock items
    SELECT COUNT(*) INTO v_low_stock
    FROM public.inventory
    WHERE business_id = p_business_id AND quantity <= reorder_level;

    -- 3. Calculate branch performance
    SELECT jsonb_object_agg(branch_id::text, COALESCE(sum_amount, 0.00)) INTO v_branch_perf
    FROM (
        SELECT branch_id, SUM(total_amount) as sum_amount
        FROM public.sales
        WHERE business_id = p_business_id AND created_at::DATE = p_date
        GROUP BY branch_id
    ) b;

    IF v_branch_perf IS NULL THEN
        v_branch_perf := '{}'::jsonb;
    END IF;

    -- 4. Calculate top products (limit 5)
    SELECT jsonb_agg(jsonb_build_object('product_id', product_id, 'name', product_name, 'quantity', sum_qty, 'revenue', sum_amount)) INTO v_top_prods
    FROM (
        SELECT si.product_id, p.name as product_name, SUM(si.quantity) as sum_qty, SUM(si.total_price) as sum_amount
        FROM public.sale_items si
        JOIN public.products p ON p.id = si.product_id
        JOIN public.sales s ON s.id = si.sale_id
        WHERE si.business_id = p_business_id AND s.created_at::DATE = p_date
        GROUP BY si.product_id, p.name
        ORDER BY sum_qty DESC
        LIMIT 5
    ) tp;

    IF v_top_prods IS NULL THEN
        v_top_prods := '[]'::jsonb;
    END IF;

    -- 5. Upsert daily metrics
    INSERT INTO public.metrics_daily (business_id, date, revenue, sales_count, low_stock_count, branch_performance, top_products)
    VALUES (p_business_id, p_date, v_revenue, v_sales_count, v_low_stock, v_branch_perf, v_top_prods)
    ON CONFLICT (business_id, date) DO UPDATE
    SET revenue = EXCLUDED.revenue,
        sales_count = EXCLUDED.sales_count,
        low_stock_count = EXCLUDED.low_stock_count,
        branch_performance = EXCLUDED.branch_performance,
        top_products = EXCLUDED.top_products,
        created_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.recompute_monthly_metrics(p_business_id UUID, p_month DATE)
RETURNS VOID AS $$
DECLARE
    v_revenue NUMERIC(12,2) := 0.00;
    v_sales_count INT := 0;
    v_branch_perf JSONB := '{}'::jsonb;
    v_top_prods JSONB := '[]'::jsonb;
BEGIN
    -- 1. Calculate revenue and sales count
    SELECT COALESCE(SUM(total_amount), 0.00), COUNT(*) INTO v_revenue, v_sales_count
    FROM public.sales
    WHERE business_id = p_business_id AND date_trunc('month', created_at)::DATE = p_month;

    -- 2. Calculate branch performance
    SELECT jsonb_object_agg(branch_id::text, COALESCE(sum_amount, 0.00)) INTO v_branch_perf
    FROM (
        SELECT branch_id, SUM(total_amount) as sum_amount
        FROM public.sales
        WHERE business_id = p_business_id AND date_trunc('month', created_at)::DATE = p_month
        GROUP BY branch_id
    ) b;

    IF v_branch_perf IS NULL THEN
        v_branch_perf := '{}'::jsonb;
    END IF;

    -- 3. Calculate top products (limit 5)
    SELECT jsonb_agg(jsonb_build_object('product_id', product_id, 'name', product_name, 'quantity', sum_qty, 'revenue', sum_amount)) INTO v_top_prods
    FROM (
        SELECT si.product_id, p.name as product_name, SUM(si.quantity) as sum_qty, SUM(si.total_price) as sum_amount
        FROM public.sale_items si
        JOIN public.products p ON p.id = si.product_id
        JOIN public.sales s ON s.id = si.sale_id
        WHERE si.business_id = p_business_id AND date_trunc('month', s.created_at)::DATE = p_month
        GROUP BY si.product_id, p.name
        ORDER BY sum_qty DESC
        LIMIT 5
    ) tp;

    IF v_top_prods IS NULL THEN
        v_top_prods := '[]'::jsonb;
    END IF;

    -- 4. Upsert monthly metrics
    INSERT INTO public.metrics_monthly (business_id, month, revenue, sales_count, branch_performance, top_products)
    VALUES (p_business_id, p_month, v_revenue, v_sales_count, v_branch_perf, v_top_prods)
    ON CONFLICT (business_id, month) DO UPDATE
    SET revenue = EXCLUDED.revenue,
        sales_count = EXCLUDED.sales_count,
        branch_performance = EXCLUDED.branch_performance,
        top_products = EXCLUDED.top_products,
        created_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Ensure RLS is enabled on all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_monthly ENABLE ROW LEVEL SECURITY;

-- Re-create Policies (using drop-before-create strategy to avoid conflicts)
DROP POLICY IF EXISTS businesses_select ON public.businesses;
CREATE POLICY businesses_select ON public.businesses FOR SELECT TO authenticated USING (id = public.current_business_id() OR public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS businesses_insert ON public.businesses;
CREATE POLICY businesses_insert ON public.businesses FOR INSERT TO authenticated WITH CHECK (TRUE);

DROP POLICY IF EXISTS businesses_update ON public.businesses;
CREATE POLICY businesses_update ON public.businesses FOR UPDATE TO authenticated USING (id = public.current_business_id() AND public.current_user_role() IN ('OWNER', 'super_admin'));

DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS users_insert ON public.users;
CREATE POLICY users_insert ON public.users FOR INSERT TO authenticated WITH CHECK (TRUE);

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users FOR UPDATE TO authenticated USING (business_id = public.current_business_id() AND (public.current_user_role() IN ('OWNER', 'ADMIN') OR id = auth.uid()));

DROP POLICY IF EXISTS branches_select ON public.branches;
CREATE POLICY branches_select ON public.branches FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS branches_all ON public.branches;
CREATE POLICY branches_all ON public.branches FOR ALL TO authenticated USING (business_id = public.current_business_id() AND public.current_user_role() IN ('OWNER', 'ADMIN'));

DROP POLICY IF EXISTS user_branches_select ON public.user_branches;
CREATE POLICY user_branches_select ON public.user_branches FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS user_branches_all ON public.user_branches;
CREATE POLICY user_branches_all ON public.user_branches FOR ALL TO authenticated USING (business_id = public.current_business_id() AND public.current_user_role() IN ('OWNER', 'ADMIN'));

DROP POLICY IF EXISTS products_select ON public.products;
CREATE POLICY products_select ON public.products FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS products_all ON public.products;
CREATE POLICY products_all ON public.products FOR ALL TO authenticated USING (business_id = public.current_business_id() AND public.current_user_role() IN ('OWNER', 'ADMIN', 'MANAGER'));

DROP POLICY IF EXISTS inventory_select ON public.inventory;
CREATE POLICY inventory_select ON public.inventory FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS inventory_all ON public.inventory;
CREATE POLICY inventory_all ON public.inventory FOR ALL TO authenticated USING (business_id = public.current_business_id() AND public.current_user_role() IN ('OWNER', 'ADMIN', 'MANAGER'));

DROP POLICY IF EXISTS branch_product_prices_select ON public.branch_product_prices;
CREATE POLICY branch_product_prices_select ON public.branch_product_prices FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS branch_product_prices_all ON public.branch_product_prices;
CREATE POLICY branch_product_prices_all ON public.branch_product_prices FOR ALL TO authenticated USING (business_id = public.current_business_id() AND public.current_user_role() IN ('OWNER', 'ADMIN', 'MANAGER'));

DROP POLICY IF EXISTS customers_select ON public.customers;
CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS customers_all ON public.customers;
CREATE POLICY customers_all ON public.customers FOR ALL TO authenticated USING (business_id = public.current_business_id() AND public.current_user_role() IN ('OWNER', 'ADMIN', 'MANAGER'));

DROP POLICY IF EXISTS sales_select ON public.sales;
CREATE POLICY sales_select ON public.sales FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS sales_insert ON public.sales;
CREATE POLICY sales_insert ON public.sales FOR INSERT TO authenticated WITH CHECK (business_id = public.current_business_id());

DROP POLICY IF EXISTS sales_block_update ON public.sales;
CREATE POLICY sales_block_update ON public.sales FOR UPDATE TO authenticated USING (FALSE);

DROP POLICY IF EXISTS sales_block_delete ON public.sales;
CREATE POLICY sales_block_delete ON public.sales FOR DELETE TO authenticated USING (FALSE);

DROP POLICY IF EXISTS sale_items_select ON public.sale_items;
CREATE POLICY sale_items_select ON public.sale_items FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS sale_items_insert ON public.sale_items;
CREATE POLICY sale_items_insert ON public.sale_items FOR INSERT TO authenticated WITH CHECK (business_id = public.current_business_id());

DROP POLICY IF EXISTS stock_movements_select ON public.stock_movements;
CREATE POLICY stock_movements_select ON public.stock_movements FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS stock_movements_insert ON public.stock_movements;
CREATE POLICY stock_movements_insert ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (business_id = public.current_business_id());

DROP POLICY IF EXISTS stock_movements_block_update ON public.stock_movements;
CREATE POLICY stock_movements_block_update ON public.stock_movements FOR UPDATE TO authenticated USING (FALSE);

DROP POLICY IF EXISTS stock_movements_block_delete ON public.stock_movements;
CREATE POLICY stock_movements_block_delete ON public.stock_movements FOR DELETE TO authenticated USING (FALSE);

DROP POLICY IF EXISTS metrics_daily_select ON public.metrics_daily;
CREATE POLICY metrics_daily_select ON public.metrics_daily FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS metrics_daily_all ON public.metrics_daily;
CREATE POLICY metrics_daily_all ON public.metrics_daily FOR ALL TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS metrics_monthly_select ON public.metrics_monthly;
CREATE POLICY metrics_monthly_select ON public.metrics_monthly FOR SELECT TO authenticated USING (business_id = public.current_business_id());

DROP POLICY IF EXISTS metrics_monthly_all ON public.metrics_monthly;
CREATE POLICY metrics_monthly_all ON public.metrics_monthly FOR ALL TO authenticated USING (business_id = public.current_business_id());
