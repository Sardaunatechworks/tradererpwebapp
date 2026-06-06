'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { validateWriteAccess } from '@/lib/security';

export async function createProduct(formData: FormData) {
  const sku = formData.get('sku') as string;
  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const description = formData.get('description') as string;
  const defaultPrice = parseFloat(formData.get('defaultPrice') as string || '0');
  const costPrice = parseFloat(formData.get('costPrice') as string || '0');
  const initialStock = parseInt(formData.get('initialStock') as string || '0');
  const initialBranchId = formData.get('initialBranchId') as string;

  if (!sku || !name) {
    return { error: 'SKU and Product Name are required.' };
  }

  // Pre-validate numeric boundaries (OWASP / Input Validation)
  if (defaultPrice < 0) {
    return { error: 'Default Selling Price cannot be negative.' };
  }
  if (costPrice < 0) {
    return { error: 'Cost Price cannot be negative.' };
  }
  if (initialStock < 0) {
    return { error: 'Initial Stock cannot be negative.' };
  }

  // Length checks to prevent database field size errors or DoS
  if (sku.length > 100) {
    return { error: 'SKU cannot exceed 100 characters.' };
  }
  if (name.length > 255) {
    return { error: 'Product Name cannot exceed 255 characters.' };
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

  const role = user.app_metadata?.role;
  const businessId = user.app_metadata?.business_id;

  if (!businessId) {
    return { error: 'No business workspace found.' };
  }

  if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'MANAGER') {
    return { error: 'Not authorized to create products.' };
  }

  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // SECURITY CHECK: Verify initial branch belongs to user's business
    if (initialBranchId) {
      const { data: branchCheck } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('id', initialBranchId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (!branchCheck) {
        return { error: 'Initial branch context not found or unauthorized.' };
      }
    }

    // Create the product (using admin client to bypass RLS sync latency)
    const { data: product, error: prodErr } = await supabaseAdmin
      .from('products')
      .insert({
        business_id: businessId,
        sku,
        name,
        category: category || '',
        description: description || '',
        default_price: defaultPrice,
        cost_price: costPrice,
      })
      .select('id')
      .single();

    if (prodErr || !product) {
      return { error: prodErr?.message || 'Failed to create product.' };
    }

    // Automatically initialize inventory for all branches of this business
    const { data: branches } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('business_id', businessId);

    if (branches && branches.length > 0) {
      const targetBranchId = initialBranchId || branches[0].id;

      const inventoryInserts = branches.map((b) => ({
        business_id: businessId,
        branch_id: b.id,
        product_id: product.id,
        quantity: b.id === targetBranchId ? initialStock : 0,
        reorder_level: 10,
      }));

      const { error: invErr } = await supabaseAdmin
        .from('inventory')
        .insert(inventoryInserts);

      if (invErr) {
        console.error('Failed to initialize inventory for product:', invErr);
      }

      // Log stock movement if initial stock is positive
      if (initialStock > 0 && targetBranchId) {
        const { error: moveErr } = await supabaseAdmin
          .from('stock_movements')
          .insert({
            business_id: businessId,
            branch_id: targetBranchId,
            product_id: product.id,
            quantity: initialStock,
            type: 'restock',
            recorded_by: user.id,
            notes: 'Initial stock allocation during product creation'
          });
        
        if (moveErr) {
          console.error('Failed to log initial stock movement:', moveErr);
        }
      }
    }

    revalidatePath('/inventory');
    return { success: true };
  } catch (err: any) {
    console.error('Product Creation Error:', err);
    return { error: err.message || 'An error occurred while creating product.' };
  }
}

export async function restockInventory(
  branchId: string,
  productId: string,
  quantity: number,
  notes: string
) {
  if (quantity <= 0) {
    return { error: 'Restock quantity must be positive.' };
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

  const role = user.app_metadata?.role;
  const businessId = user.app_metadata?.business_id;

  if (!businessId) {
    return { error: 'No business workspace found.' };
  }

  if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'MANAGER') {
    return { error: 'Not authorized to manage stock.' };
  }

  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // SECURITY CHECK: Verify branch belongs to user's business
    const { data: branchCheck } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('id', branchId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!branchCheck) {
      return { error: 'Branch context not found or unauthorized.' };
    }

    // SECURITY CHECK: Verify product belongs to user's business
    const { data: productCheck } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!productCheck) {
      return { error: 'Product catalog context not found or unauthorized.' };
    }

    // Get current quantity (using admin client to bypass RLS)
    const { data: currentInv } = await supabaseAdmin
      .from('inventory')
      .select('quantity')
      .eq('branch_id', branchId)
      .eq('product_id', productId)
      .maybeSingle();

    const currentQty = currentInv ? currentInv.quantity : 0;
    const newQty = currentQty + quantity;

    // Insert or update inventory (using admin client to bypass RLS)
    const { error: invErr } = await supabaseAdmin
      .from('inventory')
      .upsert({
        business_id: businessId,
        branch_id: branchId,
        product_id: productId,
        quantity: newQty,
      });

    if (invErr) {
      return { error: invErr.message };
    }

    // Insert stock movement record
    const { error: moveErr } = await supabaseAdmin
      .from('stock_movements')
      .insert({
        business_id: businessId,
        branch_id: branchId,
        product_id: productId,
        quantity,
        type: 'restock',
        recorded_by: user.id,
        notes: notes || 'Restock action',
      });

    if (moveErr) {
      console.error('Failed to log stock movement:', moveErr);
    }

    // Trigger metrics recomputation (cached analytics)
    const { error: rpcErr } = await supabaseAdmin.rpc('recompute_daily_metrics', {
      p_business_id: businessId,
      p_date: new Date().toISOString().split('T')[0]
    });

    if (rpcErr) {
      console.error('Failed to trigger daily metrics recomputation:', rpcErr);
    }

    revalidatePath('/inventory');
    return { success: true };
  } catch (err: any) {
    console.error('Restock Inventory Error:', err);
    return { error: err.message || 'An error occurred during restocking.' };
  }
}

export async function adjustInventory(
  branchId: string,
  productId: string,
  targetQuantity: number,
  notes: string
) {
  if (targetQuantity < 0) {
    return { error: 'Inventory quantity cannot be negative.' };
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

  const role = user.app_metadata?.role;
  const businessId = user.app_metadata?.business_id;

  if (!businessId) {
    return { error: 'No business workspace found.' };
  }

  if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'MANAGER') {
    return { error: 'Not authorized to manage stock.' };
  }

  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // SECURITY CHECK: Verify branch belongs to user's business
    const { data: branchCheck } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('id', branchId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!branchCheck) {
      return { error: 'Branch context not found or unauthorized.' };
    }

    // SECURITY CHECK: Verify product belongs to user's business
    const { data: productCheck } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!productCheck) {
      return { error: 'Product catalog context not found or unauthorized.' };
    }

    // Get current quantity (using admin client to bypass RLS)
    const { data: currentInv } = await supabaseAdmin
      .from('inventory')
      .select('quantity')
      .eq('branch_id', branchId)
      .eq('product_id', productId)
      .maybeSingle();

    const currentQty = currentInv ? currentInv.quantity : 0;
    const diff = targetQuantity - currentQty;

    if (diff === 0) {
      return { success: true }; // No changes needed
    }

    // Update inventory quantity
    const { error: invErr } = await supabaseAdmin
      .from('inventory')
      .upsert({
        business_id: businessId,
        branch_id: branchId,
        product_id: productId,
        quantity: targetQuantity,
      });

    if (invErr) {
      return { error: invErr.message };
    }

    // Insert stock movement record
    const { error: moveErr } = await supabaseAdmin
      .from('stock_movements')
      .insert({
        business_id: businessId,
        branch_id: branchId,
        product_id: productId,
        quantity: diff,
        type: 'adjustment',
        recorded_by: user.id,
        notes: notes || 'Stock adjustment',
      });

    if (moveErr) {
      console.error('Failed to log adjustment movement:', moveErr);
    }

    // Trigger metrics recomputation (cached analytics)
    const { error: rpcErr } = await supabaseAdmin.rpc('recompute_daily_metrics', {
      p_business_id: businessId,
      p_date: new Date().toISOString().split('T')[0]
    });

    if (rpcErr) {
      console.error('Failed to trigger daily metrics recomputation:', rpcErr);
    }

    revalidatePath('/inventory');
    return { success: true };
  } catch (err: any) {
    console.error('Adjust Inventory Error:', err);
    return { error: err.message || 'An error occurred during adjustment.' };
  }
}

export async function updateBranchPrice(
  branchId: string,
  productId: string,
  price: number
) {
  if (price < 0) {
    return { error: 'Price cannot be negative.' };
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

  const role = user.app_metadata?.role;
  const businessId = user.app_metadata?.business_id;

  if (!businessId) {
    return { error: 'No business workspace found.' };
  }

  if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'MANAGER') {
    return { error: 'Not authorized to override pricing.' };
  }

  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // SECURITY CHECK: Verify branch belongs to user's business
    const { data: branchCheck } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('id', branchId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!branchCheck) {
      return { error: 'Branch context not found or unauthorized.' };
    }

    // SECURITY CHECK: Verify product belongs to user's business
    const { data: productCheck } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!productCheck) {
      return { error: 'Product catalog context not found or unauthorized.' };
    }

    const { error } = await supabaseAdmin
      .from('branch_product_prices')
      .upsert({
        business_id: businessId,
        branch_id: branchId,
        product_id: productId,
        price,
      });

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/inventory');
    return { success: true };
  } catch (err: any) {
    console.error('Override Price Error:', err);
    return { error: err.message || 'An error occurred while overriding price.' };
  }
}
