-- =======================================================
-- TraderERP Pre-Launch Security Audit Fixes Migration
-- =======================================================

-- 1. Re-declare process_sale function with strict input parameter validation
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

    -- SECURITY CHECK: Verify branch belongs to the cashier's business and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.branches 
        WHERE id = p_branch_id AND business_id = v_business_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Invalid branch context or branch is inactive';
    END IF;

    -- SECURITY CHECK: Verify customer belongs to the cashier's business (if specified)
    IF p_customer_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.customers 
        WHERE id = p_customer_id AND business_id = v_business_id
    ) THEN
        RAISE EXCEPTION 'Customer profile not found';
    END IF;

    -- Create Sale record
    v_sale_id := gen_random_uuid();
    INSERT INTO public.sales (id, business_id, branch_id, cashier_id, customer_id, total_amount, payment_method)
    VALUES (v_sale_id, v_business_id, p_branch_id, v_cashier_id, p_customer_id, 0.00, p_payment_method);

    -- Loop through products and process stock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
    LOOP
        v_product_id := v_item.product_id;
        v_qty := v_item.quantity;

        -- SECURITY CHECK: Verify product belongs to the cashier's business
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

    -- Trigger metrics recomputation
    PERFORM public.recompute_daily_metrics(v_business_id, NOW()::DATE);
    PERFORM public.recompute_monthly_metrics(v_business_id, date_trunc('month', NOW())::DATE);

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Define support_tickets Update RLS Policy
DROP POLICY IF EXISTS update_own_support_tickets ON public.support_tickets;
CREATE POLICY update_own_support_tickets ON public.support_tickets
    FOR UPDATE TO authenticated
    USING (current_business_id() = business_id AND auth.uid() = user_id)
    WITH CHECK (current_business_id() = business_id AND auth.uid() = user_id);
