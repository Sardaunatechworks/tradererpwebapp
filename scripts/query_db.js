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
  console.log('Querying products...');
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('*')
    .ilike('name', '%tesyy%');
  if (pErr) console.error(pErr);
  else console.log('Products matching tesyy:', products);

  console.log('Querying recent sale items...');
  const { data: items, error: iErr } = await supabase
    .from('sale_items')
    .select('*, products(name, cost_price, default_price)')
    .limit(10);
  if (iErr) console.error(iErr);
  else console.log('Recent sale items:', JSON.stringify(items, null, 2));
}

run();
