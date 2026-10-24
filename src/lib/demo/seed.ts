import { getAdminClient, DEMO_BUSINESS_ID, DEMO_USER_ID } from '@/lib/auth/context';

export async function resetDemoStoreData(): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = getAdminClient();

    // 1. Clean existing demo data
    await supabase.from('audit_logs').delete().eq('business_id', DEMO_BUSINESS_ID);
    await supabase.from('receipts').delete().eq('business_id', DEMO_BUSINESS_ID);
    await supabase.from('payments').delete().eq('business_id', DEMO_BUSINESS_ID);
    await supabase.from('inventory_movements').delete().eq('business_id', DEMO_BUSINESS_ID);

    const { data: existingSales } = await supabase
      .from('sales')
      .select('id')
      .eq('business_id', DEMO_BUSINESS_ID);

    if (existingSales && existingSales.length > 0) {
      const saleIds = existingSales.map((s) => s.id);
      await supabase.from('sale_items').delete().in('sale_id', saleIds);
    }

    await supabase.from('sales').delete().eq('business_id', DEMO_BUSINESS_ID);
    await supabase.from('expenses').delete().eq('business_id', DEMO_BUSINESS_ID);
    await supabase.from('expense_categories').delete().eq('business_id', DEMO_BUSINESS_ID);
    await supabase.from('products').delete().eq('business_id', DEMO_BUSINESS_ID);
    await supabase.from('categories').delete().eq('business_id', DEMO_BUSINESS_ID);
    await supabase.from('customers').delete().eq('business_id', DEMO_BUSINESS_ID);
    await supabase.from('business_members').delete().eq('business_id', DEMO_BUSINESS_ID);
    await supabase.from('businesses').delete().eq('id', DEMO_BUSINESS_ID);

    // 2. Insert Business
    await supabase.from('businesses').upsert({
      id: DEMO_BUSINESS_ID,
      name: 'Apex Merchants Ltd',
      business_type: 'Wholesale & Retail FMCG',
      owner_id: DEMO_USER_ID,
      phone: '+234 803 123 4567',
      email: 'demo-store@smarttradererp.com.ng',
      address: 'Plot 14, Commercial District, Wuse 2, Abuja, Nigeria',
      currency: 'NGN',
      status: 'active',
    });

    // 3. Link Owner
    await supabase.from('business_members').upsert({
      business_id: DEMO_BUSINESS_ID,
      user_id: DEMO_USER_ID,
      role: 'owner',
      status: 'active',
    });

    // 4. Categories
    const categoryDefs = [
      { id: 'ca000000-0000-0000-0000-000000000001', name: 'Groceries & Foodstuffs', description: 'Grains, edible oils, flours, sugars and seasonings' },
      { id: 'ca000000-0000-0000-0000-000000000002', name: 'Beverages & Drinks', description: 'Powdered milk, chocolate drinks, bottled water, soft drinks' },
      { id: 'ca000000-0000-0000-0000-000000000003', name: 'Toiletries & Personal Care', description: 'Detergents, soaps, antiseptics, toothpaste and oral hygiene' },
      { id: 'ca000000-0000-0000-0000-000000000004', name: 'Household & Packaging', description: 'Serviettes, trash bags, disposable take-away containers' },
    ];

    for (const cat of categoryDefs) {
      await supabase.from('categories').upsert({
        id: cat.id,
        business_id: DEMO_BUSINESS_ID,
        name: cat.name,
        description: cat.description,
      });
    }

    // 5. Customers
    const customerDefs = [
      { id: 'cb000000-0000-0000-0000-000000000001', name: 'Mama Ngozi Provisions', phone: '08034567891', email: 'ngozi.provisions@gmail.com', address: 'Shop 12, Corner Market, Abuja' },
      { id: 'cb000000-0000-0000-0000-000000000002', name: 'Alhaji Bello General Stores', phone: '08023456789', email: 'bello.stores@gmail.com', address: 'Suite 4, Modern Plaza, Wuse, Abuja' },
      { id: 'cb000000-0000-0000-0000-000000000003', name: 'Grace Okafor Supermarket', phone: '08091234567', email: 'grace.okafor@gmail.com', address: 'Plot 88, Ahmadu Bello Way, Abuja' },
      { id: 'cb000000-0000-0000-0000-000000000004', name: 'Ibrahim & Sons Wholesalers', phone: '08123456780', email: 'ibrahim.sons@gmail.com', address: 'Block C, Utako Ultra Modern Market' },
      { id: 'cb000000-0000-0000-0000-000000000005', name: 'Mrs. Funke Adeyemi', phone: '08187654321', email: 'funke.adeyemi@yahoo.com', address: '15 Aminu Kano Crescent, Wuse 2' },
      { id: 'cb000000-0000-0000-0000-000000000006', name: 'Chidi Continental Bar & Lounge', phone: '08076543210', email: 'chidi.continental@gmail.com', address: 'No 7 Adetokunbo Ademola, Wuse 2' },
    ];

    for (const c of customerDefs) {
      await supabase.from('customers').upsert({
        id: c.id,
        business_id: DEMO_BUSINESS_ID,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        status: 'active',
      });
    }

    // 6. Products
    const catGroceries = categoryDefs[0].id;
    const catBeverages = categoryDefs[1].id;
    const catToiletries = categoryDefs[2].id;
    const catHousehold = categoryDefs[3].id;

    const productDefs = [
      { id: 'cc000000-0000-0000-0000-000000000001', category_id: catGroceries, name: 'Mama Gold Rice (50kg)', sku: 'RICE-MG-50', unit: 'bags', purchase_price: 62000, selling_price: 68500, current_stock: 4, minimum_stock: 10, description: 'Premium Nigerian parboiled rice 50kg bag' },
      { id: 'cc000000-0000-0000-0000-000000000002', category_id: catGroceries, name: 'Golden Terra Pure Soya Oil (5L)', sku: 'OIL-GT-5L', unit: 'pcs', purchase_price: 13500, selling_price: 15800, current_stock: 24, minimum_stock: 6, description: 'Cholesterol free pure soya cooking oil 5 liters' },
      { id: 'cc000000-0000-0000-0000-000000000003', category_id: catGroceries, name: 'Dangote Refined Sugar (50kg)', sku: 'SUG-DAN-50', unit: 'bags', purchase_price: 71000, selling_price: 78000, current_stock: 5, minimum_stock: 8, description: 'Fortified white refined granulated sugar 50kg' },
      { id: 'cc000000-0000-0000-0000-000000000004', category_id: catGroceries, name: 'Indomie Super Pack Carton (40pcs)', sku: 'NDL-IND-SP', unit: 'cartons', purchase_price: 11200, selling_price: 12800, current_stock: 35, minimum_stock: 10, description: 'Indomie instant noodles chicken flavour 120g x 40' },
      { id: 'cc000000-0000-0000-0000-000000000005', category_id: catGroceries, name: 'Golden Penny Spaghetti 500g (Carton)', sku: 'PST-GP-500', unit: 'cartons', purchase_price: 14800, selling_price: 16500, current_stock: 18, minimum_stock: 6, description: 'Pure semolina durum wheat pasta 500g x 20 packs' },
      { id: 'cc000000-0000-0000-0000-000000000006', category_id: catGroceries, name: 'Gino Tomato Paste 70g (Carton/50)', sku: 'TOM-GIN-70', unit: 'cartons', purchase_price: 9800, selling_price: 11500, current_stock: 15, minimum_stock: 5, description: 'Triple concentrated tomato paste sachets 50pcs' },
      { id: 'cc000000-0000-0000-0000-000000000007', category_id: catGroceries, name: 'Honeywell Wheat Flour (50kg)', sku: 'FLR-HW-50', unit: 'bags', purchase_price: 54000, selling_price: 60000, current_stock: 12, minimum_stock: 5, description: 'Whole wheat flour rich in fiber 50kg' },
      { id: 'cc000000-0000-0000-0000-000000000008', category_id: catGroceries, name: 'Knorr Chicken Seasoning Cubes (Carton)', sku: 'SEAS-KNR-CH', unit: 'cartons', purchase_price: 22000, selling_price: 25500, current_stock: 9, minimum_stock: 4, description: 'Knorr chicken bullion cubes 50 rolls carton' },

      { id: 'cc000000-0000-0000-0000-000000000009', category_id: catBeverages, name: 'Peak Milk Powder 400g (Roll/10)', sku: 'MLK-PK-400', unit: 'cartons', purchase_price: 29000, selling_price: 33500, current_stock: 14, minimum_stock: 5, description: 'Peak instant whole milk powder 400g tin' },
      { id: 'cc000000-0000-0000-0000-000000000010', category_id: catBeverages, name: 'Milo Malt Refill 1kg (Carton/12)', sku: 'CHOC-ML-1KG', unit: 'cartons', purchase_price: 42000, selling_price: 48000, current_stock: 11, minimum_stock: 4, description: 'Nestle Milo energy food drink 1kg economy refill' },
      { id: 'cc000000-0000-0000-0000-000000000011', category_id: catBeverages, name: 'Eva Table Water 75cl (Pack of 12)', sku: 'WTR-EVA-75', unit: 'packs', purchase_price: 1700, selling_price: 2200, current_stock: 55, minimum_stock: 15, description: 'Purified natural spring water 75cl x 12 bottles' },
      { id: 'cc000000-0000-0000-0000-000000000012', category_id: catBeverages, name: 'Coca-Cola 50cl Pet (Pack of 12)', sku: 'SFT-COKE-50', unit: 'packs', purchase_price: 3400, selling_price: 4200, current_stock: 40, minimum_stock: 12, description: 'Original taste Coca-Cola 50cl plastic bottles' },
      { id: 'cc000000-0000-0000-0000-000000000013', category_id: catBeverages, name: 'Chivita 100% Real Apple 1L (Pack/10)', sku: 'JCE-CHI-1L', unit: 'packs', purchase_price: 13800, selling_price: 16000, current_stock: 3, minimum_stock: 8, description: 'No added sugar pure fruit juice 1L x 10' },
      { id: 'cc000000-0000-0000-0000-000000000014', category_id: catBeverages, name: 'Lipton Yellow Label Tea (Pack 100)', sku: 'TEA-LIP-100', unit: 'packs', purchase_price: 3200, selling_price: 3900, current_stock: 28, minimum_stock: 6, description: 'Finest black tea leaves 100 enveloped teabags' },
      { id: 'cc000000-0000-0000-0000-000000000015', category_id: catBeverages, name: 'Nescafe Classic Coffee 50g (Carton/24)', sku: 'COF-NES-50', unit: 'cartons', purchase_price: 26500, selling_price: 31000, current_stock: 8, minimum_stock: 5, description: 'Pure instant granulated coffee glass jars' },
      { id: 'cc000000-0000-0000-0000-000000000016', category_id: catBeverages, name: 'Maltina Classic Can 33cl (Pack/24)', sku: 'MLT-MLT-33', unit: 'packs', purchase_price: 9600, selling_price: 11500, current_stock: 22, minimum_stock: 6, description: 'Non-alcoholic enriched malt beverage cans' },

      { id: 'cc000000-0000-0000-0000-000000000017', category_id: catToiletries, name: 'Ariel Hand Wash Detergent 1kg (Ctn/10)', sku: 'DET-AR-1KG', unit: 'cartons', purchase_price: 16000, selling_price: 18500, current_stock: 16, minimum_stock: 5, description: 'Tough stain removal washing powder 1kg packs' },
      { id: 'cc000000-0000-0000-0000-000000000018', category_id: catToiletries, name: 'Dettol Antiseptic 500ml (Carton/12)', sku: 'ANT-DET-500', unit: 'cartons', purchase_price: 28000, selling_price: 32500, current_stock: 4, minimum_stock: 6, description: 'Germ protection medical and home antiseptic liquid' },
      { id: 'cc000000-0000-0000-0000-000000000019', category_id: catToiletries, name: 'Morning Fresh Liquid 1L (Carton/12)', sku: 'DSH-MF-1L', unit: 'cartons', purchase_price: 18500, selling_price: 22000, current_stock: 12, minimum_stock: 4, description: 'Super grease cutting antibacterial dishwashing liquid' },
      { id: 'cc000000-0000-0000-0000-000000000020', category_id: catToiletries, name: 'Premier Cool Menthol Soap (Pack/12)', sku: 'SOP-PRM-12', unit: 'packs', purchase_price: 5200, selling_price: 6400, current_stock: 30, minimum_stock: 8, description: 'Long-lasting freshness menthol bath soap' },
      { id: 'cc000000-0000-0000-0000-000000000021', category_id: catToiletries, name: 'Oral-B Toothpaste 140g (Pack/12)', sku: 'TP-OB-140', unit: 'packs', purchase_price: 9500, selling_price: 11800, current_stock: 19, minimum_stock: 5, description: 'All-round cavity protection fluoride toothpaste' },
      { id: 'cc000000-0000-0000-0000-000000000022', category_id: catToiletries, name: 'Hypo Bleach Super 1L (Carton/12)', sku: 'BLC-HYP-1L', unit: 'cartons', purchase_price: 10800, selling_price: 13000, current_stock: 20, minimum_stock: 5, description: 'Maximum whitening disinfectant bleach' },

      { id: 'cc000000-0000-0000-0000-000000000023', category_id: catHousehold, name: 'Bigi Serviettes / Table Napkins (Pack/20)', sku: 'NAP-BIG-20', unit: 'packs', purchase_price: 7500, selling_price: 9200, current_stock: 25, minimum_stock: 6, description: 'Soft virgin pulp absorbent table paper napkins' },
      { id: 'cc000000-0000-0000-0000-000000000024', category_id: catHousehold, name: 'Heavy Duty Trash Bags (Bundle/100)', sku: 'BAG-TR-100', unit: 'bundles', purchase_price: 4500, selling_price: 6000, current_stock: 40, minimum_stock: 10, description: 'Tear-resistant black industrial garbage nylon bags' },
      { id: 'cc000000-0000-0000-0000-000000000025', category_id: catHousehold, name: 'Takeaway Food Packs 3-Part (Pack/50)', sku: 'PAK-TK-50', unit: 'packs', purchase_price: 6800, selling_price: 8500, current_stock: 35, minimum_stock: 8, description: 'Microwavable 3-compartment takeaway plastic packs' },
      { id: 'cc000000-0000-0000-0000-000000000026', category_id: catHousehold, name: 'Disposable Paper Cups 8oz (Pack/100)', sku: 'CUP-PPR-8', unit: 'packs', purchase_price: 3900, selling_price: 5200, current_stock: 18, minimum_stock: 5, description: 'Single wall hot and cold beverage paper cups' },
    ];

    for (const prod of productDefs) {
      await supabase.from('products').upsert({
        id: prod.id,
        business_id: DEMO_BUSINESS_ID,
        category_id: prod.category_id,
        name: prod.name,
        sku: prod.sku,
        unit: prod.unit,
        purchase_price: prod.purchase_price,
        selling_price: prod.selling_price,
        current_stock: prod.current_stock,
        minimum_stock: prod.minimum_stock,
        description: prod.description,
        status: 'active',
      });

      await supabase.from('inventory_movements').insert({
        business_id: DEMO_BUSINESS_ID,
        product_id: prod.id,
        type: 'opening_stock',
        quantity: prod.current_stock + 10,
        reason: 'Initial opening stock',
        created_by: DEMO_USER_ID,
      });
    }

    // 7. Expenses
    const expCategories = [
      { id: 'ea000000-0000-0000-0000-000000000001', name: 'Rent & Facilities' },
      { id: 'ea000000-0000-0000-0000-000000000002', name: 'Generator Fuel & Energy' },
      { id: 'ea000000-0000-0000-0000-000000000003', name: 'Utilities & PHCN' },
      { id: 'ea000000-0000-0000-0000-000000000004', name: 'Staff Wages & Stipends' },
      { id: 'ea000000-0000-0000-0000-000000000005', name: 'Transport & Logistics' },
      { id: 'ea000000-0000-0000-0000-000000000006', name: 'Repairs & Maintenance' },
    ];

    for (const ec of expCategories) {
      await supabase.from('expense_categories').upsert({
        id: ec.id,
        business_id: DEMO_BUSINESS_ID,
        name: ec.name,
      });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const expensesData = [
      { category_id: expCategories[1].id, description: '150 Liters Diesel for 30kVA Standby Generator', amount: 185000, payment_method: 'bank_transfer', expense_date: todayStr, note: 'Direct delivery from Conoil filling station' },
      { category_id: expCategories[4].id, description: 'Haulage & delivery offloading from Iddo railway terminal', amount: 35000, payment_method: 'cash', expense_date: todayStr, note: 'Paid to truck driver' },
      { category_id: expCategories[2].id, description: 'AEDC Pre-paid commercial electricity meter token recharge', amount: 45000, payment_method: 'bank_transfer', expense_date: yesterday, note: 'Account ref: AEDC-048291' },
      { category_id: expCategories[1].id, description: 'Petrol for dispatch and store errand motorbike', amount: 18500, payment_method: 'cash', expense_date: fourDaysAgo, note: 'Receipt filed with cashier' },
      { category_id: expCategories[5].id, description: 'Servicing store generator - engine oil, fuel & oil filters replacement', amount: 28000, payment_method: 'pos', expense_date: tenDaysAgo, note: 'Engineer Sadiq' },
      { category_id: expCategories[3].id, description: 'Shop assistants bi-weekly wage stipend (2 store attendants)', amount: 120000, payment_method: 'bank_transfer', expense_date: tenDaysAgo, note: 'Bank transfer batch' },
      { category_id: expCategories[0].id, description: 'Warehouse quarterly lease contribution', amount: 350000, payment_method: 'bank_transfer', expense_date: twentyDaysAgo, note: 'Paid to estate agent' },
      { category_id: expCategories[5].id, description: 'Borehole water pump replacement capacitor & plumbing parts', amount: 15000, payment_method: 'cash', expense_date: twentyDaysAgo, note: 'Hardware store purchase' },
    ];

    for (const exp of expensesData) {
      await supabase.from('expenses').insert({
        business_id: DEMO_BUSINESS_ID,
        category_id: exp.category_id,
        description: exp.description,
        amount: exp.amount,
        payment_method: exp.payment_method,
        expense_date: exp.expense_date,
        note: exp.note,
        recorded_by: DEMO_USER_ID,
      });
    }

    // 8. Sales
    const cNgozi = customerDefs[0].id;
    const cBello = customerDefs[1].id;
    const cGrace = customerDefs[2].id;
    const cIbrahim = customerDefs[3].id;
    const cFunke = customerDefs[4].id;
    const cChidi = customerDefs[5].id;

    const salesBlueprints = [
      { seq: 1, customer_id: cNgozi, hoursAgo: 1, items: [{ prodIdx: 3, qty: 3 }, { prodIdx: 4, qty: 2 }], paymentMethod: 'bank_transfer', partialPaid: null },
      { seq: 2, customer_id: cChidi, hoursAgo: 2, items: [{ prodIdx: 10, qty: 10 }, { prodIdx: 11, qty: 5 }], paymentMethod: 'pos', partialPaid: null },
      { seq: 3, customer_id: cFunke, hoursAgo: 3, items: [{ prodIdx: 1, qty: 1 }, { prodIdx: 8, qty: 1 }], paymentMethod: 'cash', partialPaid: null },
      { seq: 4, customer_id: cBello, hoursAgo: 4, items: [{ prodIdx: 0, qty: 2 }, { prodIdx: 2, qty: 1 }], paymentMethod: 'bank_transfer', partialPaid: 140000 },
      { seq: 5, customer_id: null, hoursAgo: 5, items: [{ prodIdx: 19, qty: 2 }, { prodIdx: 20, qty: 1 }], paymentMethod: 'cash', partialPaid: null },
      { seq: 6, customer_id: cIbrahim, hoursAgo: 26, items: [{ prodIdx: 0, qty: 3 }, { prodIdx: 6, qty: 2 }], paymentMethod: 'bank_transfer', partialPaid: 230500 },
      { seq: 7, customer_id: cNgozi, hoursAgo: 28, items: [{ prodIdx: 5, qty: 2 }, { prodIdx: 7, qty: 1 }], paymentMethod: 'bank_transfer', partialPaid: 10500 },
      { seq: 8, customer_id: cChidi, hoursAgo: 30, items: [{ prodIdx: 15, qty: 4 }, { prodIdx: 10, qty: 8 }], paymentMethod: 'pos', partialPaid: null },
      { seq: 9, customer_id: null, hoursAgo: 32, items: [{ prodIdx: 16, qty: 1 }, { prodIdx: 17, qty: 1 }], paymentMethod: 'cash', partialPaid: null },
      { seq: 10, customer_id: cGrace, hoursAgo: 72, items: [{ prodIdx: 8, qty: 2 }, { prodIdx: 9, qty: 1 }], paymentMethod: 'other', partialPaid: 0 },
      { seq: 11, customer_id: cFunke, hoursAgo: 96, items: [{ prodIdx: 1, qty: 2 }, { prodIdx: 3, qty: 1 }], paymentMethod: 'pos', partialPaid: null },
      { seq: 12, customer_id: cBello, hoursAgo: 120, items: [{ prodIdx: 2, qty: 2 }, { prodIdx: 6, qty: 1 }], paymentMethod: 'bank_transfer', partialPaid: null },
      { seq: 13, customer_id: cChidi, hoursAgo: 260, items: [{ prodIdx: 24, qty: 4 }, { prodIdx: 22, qty: 3 }], paymentMethod: 'pos', partialPaid: null },
      { seq: 14, customer_id: cIbrahim, hoursAgo: 310, items: [{ prodIdx: 0, qty: 4 }, { prodIdx: 1, qty: 5 }], paymentMethod: 'bank_transfer', partialPaid: null },
      { seq: 15, customer_id: cNgozi, hoursAgo: 400, items: [{ prodIdx: 4, qty: 4 }, { prodIdx: 5, qty: 3 }], paymentMethod: 'cash', partialPaid: null },
      { seq: 16, customer_id: cGrace, hoursAgo: 480, items: [{ prodIdx: 17, qty: 2 }, { prodIdx: 18, qty: 2 }], paymentMethod: 'bank_transfer', partialPaid: null },
      { seq: 17, customer_id: null, hoursAgo: 550, items: [{ prodIdx: 13, qty: 2 }, { prodIdx: 14, qty: 1 }], paymentMethod: 'cash', partialPaid: null },
      { seq: 18, customer_id: cFunke, hoursAgo: 600, items: [{ prodIdx: 21, qty: 2 }, { prodIdx: 16, qty: 1 }], paymentMethod: 'pos', partialPaid: null },
    ];

    for (const bp of salesBlueprints) {
      const saleTime = new Date(now.getTime() - bp.hoursAgo * 60 * 60 * 1000).toISOString();
      const saleNum = `TR-${String(bp.seq).padStart(6, '0')}`;
      const rcpNum = `RCP-${String(bp.seq).padStart(6, '0')}`;

      let subtotal = 0;
      const saleItemsToInsert = [];

      for (const item of bp.items) {
        const prod = productDefs[item.prodIdx];
        const itemSubtotal = prod.selling_price * item.qty;
        subtotal += itemSubtotal;

        saleItemsToInsert.push({
          product_id: prod.id,
          product_name_snapshot: prod.name,
          unit_price: prod.selling_price,
          quantity: item.qty,
          discount: 0,
          subtotal: itemSubtotal,
        });
      }

      const total = subtotal;
      let amountPaid = total;
      let balanceDue = 0;
      let paymentStatus = 'paid';

      if (bp.partialPaid !== null) {
        amountPaid = bp.partialPaid;
        balanceDue = total - amountPaid;
        paymentStatus = amountPaid > 0 ? 'partial' : 'credit';
      }

      const { data: saleRecord, error: sErr } = await supabase
        .from('sales')
        .insert({
          business_id: DEMO_BUSINESS_ID,
          customer_id: bp.customer_id,
          sale_number: saleNum,
          subtotal,
          discount: 0,
          total,
          amount_paid: amountPaid,
          balance_due: balanceDue,
          payment_status: paymentStatus,
          payment_method: bp.paymentMethod,
          status: 'completed',
          sold_by: DEMO_USER_ID,
          created_at: saleTime,
          updated_at: saleTime,
        })
        .select('id')
        .single();

      if (sErr || !saleRecord) continue;

      for (const si of saleItemsToInsert) {
        await supabase.from('sale_items').insert({
          sale_id: saleRecord.id,
          product_id: si.product_id,
          product_name_snapshot: si.product_name_snapshot,
          quantity: si.quantity,
          unit_price: si.unit_price,
          discount: si.discount,
          subtotal: si.subtotal,
          created_at: saleTime,
        });

        await supabase.from('inventory_movements').insert({
          business_id: DEMO_BUSINESS_ID,
          product_id: si.product_id,
          type: 'sale',
          quantity: -si.quantity,
          reference_id: saleRecord.id,
          reference_type: 'sale',
          reason: `Sale #${saleNum}`,
          created_by: DEMO_USER_ID,
          created_at: saleTime,
        });
      }

      if (amountPaid > 0) {
        await supabase.from('payments').insert({
          business_id: DEMO_BUSINESS_ID,
          sale_id: saleRecord.id,
          customer_id: bp.customer_id,
          amount: amountPaid,
          payment_method: bp.paymentMethod,
          reference: `Sale #${saleNum}`,
          recorded_by: DEMO_USER_ID,
          created_at: saleTime,
        });
      }

      await supabase.from('receipts').insert({
        business_id: DEMO_BUSINESS_ID,
        sale_id: saleRecord.id,
        receipt_number: rcpNum,
        created_at: saleTime,
      });

      await supabase.from('audit_logs').insert({
        business_id: DEMO_BUSINESS_ID,
        user_id: DEMO_USER_ID,
        action: 'create_sale',
        entity_type: 'sale',
        entity_id: saleRecord.id,
        metadata: { saleNumber: saleNum, total, paymentStatus },
        created_at: saleTime,
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error resetting demo store data:', err);
    return { success: false, message: err.message };
  }
}
