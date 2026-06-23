const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Dynamically load environment variables from .env.local
let supabaseUrl = '';
let serviceRoleKey = '';

const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = value;
    }
  });
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Failed to read Supabase credentials from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    console.log('1. Fetching products with cost_price > default_price...');
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('*')
      .gt('cost_price', 0); // Get all products to inspect in JS (to avoid potential floating point issues in SQL operators or just select directly)
    
    if (pErr) throw pErr;

    const swappedProducts = products.filter(p => parseFloat(p.cost_price) > parseFloat(p.default_price));
    console.log(`Found ${swappedProducts.length} products with swapped prices.`);
    
    const affectedSaleIds = new Set();
    const affectedDates = new Set();
    const affectedBusinesses = new Set();

    for (const prod of swappedProducts) {
      const oldCost = parseFloat(prod.cost_price);
      const oldDefault = parseFloat(prod.default_price);
      
      console.log(`\nSwapping prices for Product: ${prod.name} (${prod.sku})`);
      console.log(`- Old default (selling): ${oldDefault}, Old cost: ${oldCost}`);
      console.log(`- New default (selling): ${oldCost}, New cost: ${oldDefault}`);

      // Update product in DB
      const { error: updErr } = await supabase
        .from('products')
        .update({
          default_price: oldCost,
          cost_price: oldDefault,
          updated_at: new Date().toISOString()
        })
        .eq('id', prod.id);

      if (updErr) {
        console.error(`Failed to update product ${prod.id}:`, updErr.message);
        continue;
      }

      // Find matching sale items to correct them
      const { data: saleItems, error: siErr } = await supabase
        .from('sale_items')
        .select('*, sales(*)')
        .eq('product_id', prod.id);

      if (siErr) {
        console.error(`Failed to fetch sale items for ${prod.id}:`, siErr.message);
        continue;
      }

      console.log(`Found ${saleItems.length} transactions associated with product ${prod.name}`);

      for (const item of saleItems) {
        const qty = item.quantity;
        const newUnitPrice = oldCost; // The new selling price (which was the old cost_price)
        const newTotalPrice = newUnitPrice * qty;

        console.log(`- Updating Sale Item ${item.id}: Unit Price: ${item.unit_price} -> ${newUnitPrice}, Total Price: ${item.total_price} -> ${newTotalPrice}`);
        
        const { error: updSiErr } = await supabase
          .from('sale_items')
          .update({
            unit_price: newUnitPrice,
            total_price: newTotalPrice
          })
          .eq('id', item.id);

        if (updSiErr) {
          console.error(`  Failed to update sale item ${item.id}:`, updSiErr.message);
        } else {
          affectedSaleIds.add(item.sale_id);
          affectedBusinesses.add(prod.business_id);
          if (item.sales && item.sales.created_at) {
            affectedDates.add(item.sales.created_at.split('T')[0]);
          }
        }
      }
    }

    // 2. Update Sales total_amount for all affected sale IDs
    if (affectedSaleIds.size > 0) {
      console.log(`\n2. Updating total amounts for ${affectedSaleIds.size} affected sales...`);
      for (const saleId of affectedSaleIds) {
        // Fetch all items for this sale to get the true sum
        const { data: items, error: itemsErr } = await supabase
          .from('sale_items')
          .select('total_price')
          .eq('sale_id', saleId);

        if (itemsErr) {
          console.error(`Failed to fetch sale items for sale ${saleId}:`, itemsErr.message);
          continue;
        }

        const newTotalAmount = items.reduce((sum, item) => sum + parseFloat(item.total_price || '0'), 0);

        const { error: updSaleErr } = await supabase
          .from('sales')
          .update({
            total_amount: newTotalAmount
          })
          .eq('id', saleId);

        if (updSaleErr) {
          console.error(`Failed to update total amount for sale ${saleId}:`, updSaleErr.message);
        } else {
          console.log(`- Updated Sale ${saleId} total amount to ${newTotalAmount}`);
        }
      }
    }

    // 3. Recompute daily and monthly metrics
    console.log('\n3. Recomputing metrics for affected businesses and dates...');
    for (const businessId of affectedBusinesses) {
      for (const dateStr of affectedDates) {
        console.log(`- Recomputing daily metrics for business ${businessId} on date ${dateStr}...`);
        const { error: rpcErr } = await supabase.rpc('recompute_daily_metrics', {
          p_business_id: businessId,
          p_date: dateStr
        });
        if (rpcErr) console.error(`  Failed to recompute daily metrics:`, rpcErr.message);

        const monthStart = dateStr.slice(0, 7) + '-01';
        console.log(`- Recomputing monthly metrics for business ${businessId} on month starting ${monthStart}...`);
        const { error: rpcMonErr } = await supabase.rpc('recompute_monthly_metrics', {
          p_business_id: businessId,
          p_month: monthStart
        });
        if (rpcMonErr) console.error(`  Failed to recompute monthly metrics:`, rpcMonErr.message);
      }
    }

    console.log('\nPricing and transaction corrections finished successfully.');
  } catch (err) {
    console.error('Fatal execution error:', err);
  }
}

run();
