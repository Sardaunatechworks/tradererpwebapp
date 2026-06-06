import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import InventoryManagement from '@/components/inventory/InventoryManagement';

export default async function InventoryPage() {
  const supabase = await createClient();

  // 1. Get current authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = user?.app_metadata?.business_id;
  const role = user?.app_metadata?.role || 'STAFF';

  if (!businessId) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <div className="space-y-2">
          <p className="text-red-400 font-bold text-sm">No business workspace found.</p>
          <p className="text-xs text-slate-500">Please complete onboarding or log in again.</p>
        </div>
      </div>
    );
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 2. Fetch products (using admin client to bypass stale JWT RLS issues)
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });

  // 3. Fetch active branches
  const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  // 4. Fetch inventory levels
  const { data: inventory } = await supabaseAdmin
    .from('inventory')
    .select('*')
    .eq('business_id', businessId);

  // 5. Fetch branch pricing overrides
  const { data: branchPrices } = await supabaseAdmin
    .from('branch_product_prices')
    .select('*')
    .eq('business_id', businessId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight leading-none">Inventory Catalog</h1>
        <p className="text-xs text-slate-500 mt-2">
          Manage product catalog, branch quantities, and branch pricing overrides.
        </p>
      </div>

      <InventoryManagement 
        initialProducts={products || []} 
        branches={branches || []} 
        inventory={inventory || []} 
        branchPrices={branchPrices || []}
        role={role}
      />

    </div>
  );
}
