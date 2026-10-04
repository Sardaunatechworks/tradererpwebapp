'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Product, Category, InventoryMovement } from '@/types';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Authentication required.');
  }

  const businessId = user.app_metadata?.business_id;
  if (!businessId) {
    throw new Error('No business workspace context found.');
  }

  const role = user.app_metadata?.role || 'staff';
  return { user, businessId, role, supabase };
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<{ data?: Category[]; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: (data as Category[]) || [] };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch categories.' };
  }
}

export async function createCategory(formData: FormData): Promise<{ data?: Category; error?: string }> {
  try {
    const { businessId, user, role } = await getAuthContext();
    if (role === 'staff') {
      return { error: 'Only owners and admins can create product categories.' };
    }

    const name = (formData.get('name') as string)?.trim();
    const description = (formData.get('description') as string)?.trim() || null;

    if (!name) return { error: 'Category name is required.' };

    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({
        business_id: businessId,
        name,
        description,
      })
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/inventory');
    return { data: data as Category };
  } catch (err: any) {
    return { error: err.message || 'Failed to create category.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getProducts(options?: {
  search?: string;
  categoryId?: string;
  status?: 'active' | 'archived' | 'all';
}): Promise<{ data?: Product[]; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();

    let query = supabase
      .from('products')
      .select('*, category:categories(id, name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    const statusFilter = options?.status || 'active';
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (options?.categoryId && options.categoryId !== 'all') {
      query = query.eq('category_id', options.categoryId);
    }

    if (options?.search?.trim()) {
      const s = options.search.trim();
      query = query.or(`name.ilike.%${s}%,sku.ilike.%${s}%,barcode.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: (data as Product[]) || [] };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch products.' };
  }
}

export async function getProductById(id: string): Promise<{ data?: Product; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(id, name)')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error) throw error;
    return { data: data as Product };
  } catch (err: any) {
    return { error: err.message || 'Product not found.' };
  }
}

export async function createProduct(formData: FormData): Promise<{ data?: Product; error?: string }> {
  try {
    const { businessId, user, role } = await getAuthContext();
    if (role === 'staff') {
      return { error: 'Staff members are not authorized to create products.' };
    }

    const name = (formData.get('name') as string)?.trim();
    const sku = (formData.get('sku') as string)?.trim() || null;
    const barcode = (formData.get('barcode') as string)?.trim() || null;
    const categoryId = (formData.get('categoryId') as string)?.trim() || null;
    const description = (formData.get('description') as string)?.trim() || null;
    const unit = (formData.get('unit') as string)?.trim() || 'pcs';

    const purchasePrice = parseFloat((formData.get('purchasePrice') as string) || '0');
    const sellingPrice = parseFloat((formData.get('sellingPrice') as string) || '0');
    const initialStock = parseInt((formData.get('initialStock') as string) || '0', 10);
    const minimumStock = parseInt((formData.get('minimumStock') as string) || '0', 10);

    if (!name) {
      return { error: 'Product name is required.' };
    }
    if (purchasePrice < 0 || sellingPrice < 0) {
      return { error: 'Prices cannot be negative.' };
    }
    if (initialStock < 0 || minimumStock < 0) {
      return { error: 'Stock quantities cannot be negative.' };
    }

    const supabaseAdmin = getAdminClient();

    // Check SKU uniqueness within this business if provided
    if (sku) {
      const { data: existingSku } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('business_id', businessId)
        .eq('sku', sku)
        .maybeSingle();

      if (existingSku) {
        return { error: `A product with SKU "${sku}" already exists in your catalog.` };
      }
    }

    // Insert Product
    const { data: product, error: prodErr } = await supabaseAdmin
      .from('products')
      .insert({
        business_id: businessId,
        category_id: categoryId,
        name,
        sku,
        barcode,
        description,
        unit,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        current_stock: initialStock,
        minimum_stock: minimumStock,
        status: 'active',
      })
      .select('*')
      .single();

    if (prodErr || !product) {
      throw new Error(prodErr?.message || 'Failed to save product.');
    }

    // If initial stock > 0, record opening stock movement
    if (initialStock > 0) {
      await supabaseAdmin.from('inventory_movements').insert({
        business_id: businessId,
        product_id: product.id,
        movement_type: 'opening_stock',
        quantity: initialStock,
        notes: 'Initial opening stock',
        created_by: user.id,
      });
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'create_product',
      entity_type: 'product',
      entity_id: product.id,
      details: { name, sku, initialStock, sellingPrice },
    });

    revalidatePath('/inventory');
    revalidatePath('/dashboard');
    return { data: product as Product };
  } catch (err: any) {
    return { error: err.message || 'Failed to create product.' };
  }
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<{ data?: Product; error?: string }> {
  try {
    const { businessId, user, role } = await getAuthContext();
    if (role === 'staff') {
      return { error: 'Staff members are not authorized to update products.' };
    }

    const name = (formData.get('name') as string)?.trim();
    const sku = (formData.get('sku') as string)?.trim() || null;
    const barcode = (formData.get('barcode') as string)?.trim() || null;
    const categoryId = (formData.get('categoryId') as string)?.trim() || null;
    const description = (formData.get('description') as string)?.trim() || null;
    const unit = (formData.get('unit') as string)?.trim() || 'pcs';

    const purchasePrice = parseFloat((formData.get('purchasePrice') as string) || '0');
    const sellingPrice = parseFloat((formData.get('sellingPrice') as string) || '0');
    const minimumStock = parseInt((formData.get('minimumStock') as string) || '0', 10);

    if (!name) return { error: 'Product name is required.' };
    if (purchasePrice < 0 || sellingPrice < 0) return { error: 'Prices cannot be negative.' };
    if (minimumStock < 0) return { error: 'Minimum stock cannot be negative.' };

    const supabaseAdmin = getAdminClient();

    // Verify SKU collision
    if (sku) {
      const { data: existingSku } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('business_id', businessId)
        .eq('sku', sku)
        .neq('id', id)
        .maybeSingle();

      if (existingSku) {
        return { error: `Another product already uses the SKU "${sku}".` };
      }
    }

    const { data: product, error: updateErr } = await supabaseAdmin
      .from('products')
      .update({
        name,
        sku,
        barcode,
        category_id: categoryId,
        description,
        unit,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        minimum_stock: minimumStock,
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'update_product',
      entity_type: 'product',
      entity_id: id,
      details: { name, sku, purchasePrice, sellingPrice },
    });

    revalidatePath('/inventory');
    revalidatePath(`/inventory/${id}`);
    return { data: product as Product };
  } catch (err: any) {
    return { error: err.message || 'Failed to update product.' };
  }
}

export async function toggleArchiveProduct(id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const { businessId, user, role } = await getAuthContext();
    if (role === 'staff') {
      return { error: 'Staff members cannot archive products.' };
    }

    const supabaseAdmin = getAdminClient();
    const { data: current } = await supabaseAdmin
      .from('products')
      .select('status, name')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (!current) return { error: 'Product not found.' };

    const nextStatus = current.status === 'active' ? 'archived' : 'active';

    const { error } = await supabaseAdmin
      .from('products')
      .update({ status: nextStatus })
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: nextStatus === 'archived' ? 'archive_product' : 'restore_product',
      entity_type: 'product',
      entity_id: id,
      details: { name: current.name, status: nextStatus },
    });

    revalidatePath('/inventory');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update product status.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function addStock(
  productId: string,
  quantity: number,
  costPrice?: number,
  notes?: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const { businessId, user } = await getAuthContext();
    if (quantity <= 0) {
      return { error: 'Stock addition quantity must be greater than zero.' };
    }

    const supabaseAdmin = getAdminClient();

    // Fetch existing product
    const { data: product, error: fetchErr } = await supabaseAdmin
      .from('products')
      .select('current_stock, purchase_price, name')
      .eq('id', productId)
      .eq('business_id', businessId)
      .single();

    if (fetchErr || !product) {
      return { error: 'Product not found.' };
    }

    const newStock = product.current_stock + quantity;
    const updates: Record<string, any> = { current_stock: newStock };
    if (costPrice !== undefined && costPrice >= 0) {
      updates.purchase_price = costPrice;
    }

    // Update product stock
    const { error: updateErr } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', productId)
      .eq('business_id', businessId);

    if (updateErr) throw updateErr;

    // Record movement
    await supabaseAdmin.from('inventory_movements').insert({
      business_id: businessId,
      product_id: productId,
      movement_type: 'stock_addition',
      quantity: quantity,
      notes: notes || 'Stock-in addition',
      created_by: user.id,
    });

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'add_stock',
      entity_type: 'product',
      entity_id: productId,
      details: { added: quantity, previousStock: product.current_stock, newStock },
    });

    revalidatePath('/inventory');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to add stock.' };
  }
}

export async function adjustStock(
  productId: string,
  newStock: number,
  reason: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const { businessId, user, role } = await getAuthContext();
    if (role === 'staff') {
      return { error: 'Only owners and admins can perform manual stock adjustments.' };
    }

    if (newStock < 0) {
      return { error: 'Adjusted stock cannot be negative.' };
    }
    if (!reason?.trim()) {
      return { error: 'A reason for manual adjustment is required.' };
    }

    const supabaseAdmin = getAdminClient();

    const { data: product, error: fetchErr } = await supabaseAdmin
      .from('products')
      .select('current_stock, name')
      .eq('id', productId)
      .eq('business_id', businessId)
      .single();

    if (fetchErr || !product) {
      return { error: 'Product not found.' };
    }

    const difference = newStock - product.current_stock;
    if (difference === 0) {
      return { error: 'The new stock quantity is the same as current stock.' };
    }

    // Update stock
    const { error: updateErr } = await supabaseAdmin
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', productId)
      .eq('business_id', businessId);

    if (updateErr) throw updateErr;

    // Movement record
    await supabaseAdmin.from('inventory_movements').insert({
      business_id: businessId,
      product_id: productId,
      movement_type: 'manual_adjustment',
      quantity: difference,
      notes: `Adjustment: ${reason.trim()} (from ${product.current_stock} to ${newStock})`,
      created_by: user.id,
    });

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'adjust_stock',
      entity_type: 'product',
      entity_id: productId,
      details: { before: product.current_stock, after: newStock, difference, reason },
    });

    revalidatePath('/inventory');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to adjust stock.' };
  }
}

export async function getProductMovements(
  productId: string
): Promise<{ data?: InventoryMovement[]; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();

    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', productId)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data as InventoryMovement[]) || [] };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch inventory movements.' };
  }
}
