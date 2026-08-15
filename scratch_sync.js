const mysql = require('mysql2/promise');

async function syncAllDummyDataToMySQL() {
  console.log('🔄 Connecting to MySQL fragrance_hub...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fragrance_hub',
  });

  console.log('✅ Connected! Updating table schema...');

  const addColumn = async (table, colName, colDef) => {
    try {
      await conn.query(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`);
      console.log(`  ✓ Added column ${colName} to ${table}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(`  ℹ Column ${colName} already exists in ${table}`);
      } else {
        console.warn(`  ⚠️ Error adding ${colName} to ${table}:`, e.message);
      }
    }
  };

  // 1. Add missing columns to products table
  await addColumn('products', 'applications', 'TEXT');
  await addColumn('products', 'pack_sizes', 'TEXT');
  await addColumn('products', 'variant_prices', 'TEXT');
  await addColumn('products', 'selling_price_usd_per_kg', 'DECIMAL(15,2)');
  await addColumn('products', 'image_url', 'TEXT');

  // 2. Add missing columns to stock_batches table
  await addColumn('stock_batches', 'variant_sku', 'VARCHAR(50)');
  await addColumn('stock_batches', 'pack_size_kg', 'DECIMAL(12,4)');
  await addColumn('stock_batches', 'unit_count', 'INT DEFAULT 1');

  // 3. Add missing columns to customers table
  await addColumn('customers', 'username', 'VARCHAR(100)');
  await addColumn('customers', 'password', 'VARCHAR(100)');
  await addColumn('customers', 'allowed_product_ids', 'TEXT');

  // 4. Add missing columns to purchase_orders table
  await addColumn('purchase_orders', 'payment_method', "VARCHAR(50) DEFAULT 'TUNAI'");
  await addColumn('purchase_orders', 'payment_terms_days', "INT DEFAULT 0");
  await addColumn('purchase_orders', 'shipments', "TEXT");

  // 5. Add missing columns to po_items table
  await addColumn('po_items', 'qty_shipped_kg', "DECIMAL(12,4)");

  // 6. Add missing columns to distributors table
  await addColumn('distributors', 'supplied_product_ids', "TEXT");

  // 4. Create users table if not exists
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      role VARCHAR(50) NOT NULL,
      linked_entity_name VARCHAR(150),
      password VARCHAR(255) NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('  ✓ Table users created/verified.');

  console.log('\n📦 Seeding/Updating Products in MySQL...');

  const productsData = [
    {
      id: 'prod-001',
      sku: 'FO-VAN-001',
      name: 'Vanilla Bourbon Super Pure',
      applications: JSON.stringify(['Fine Fragrance', 'Industry']),
      fragrance_family: 'Gourmand',
      pack_sizes: JSON.stringify([25, 5, 1]),
      variant_prices: JSON.stringify({ 25: 1850000, 5: 1850000, 1: 1850000 }),
      top_notes: 'Creamy Milk, Sweet Almond',
      middle_notes: 'Madagascar Vanilla Pod, Caramel',
      base_notes: 'Tonka Bean, Sandalwood, Musk',
      density: 1.025,
      min_stock_kg: 5.0,
      selling_price_per_kg: 1850000,
      selling_price_usd_per_kg: 115.0,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500&auto=format&fit=crop&q=60',
    },
    {
      id: 'prod-002',
      sku: 'FO-LAV-002',
      name: 'Lavender Provençal Premium',
      applications: JSON.stringify(['Fine Fragrance']),
      fragrance_family: 'Floral',
      pack_sizes: JSON.stringify([25, 5, 1]),
      variant_prices: JSON.stringify({ 25: 1450000, 5: 1450000, 1: 1450000 }),
      top_notes: 'French Lavender, Bergamot, Clary Sage',
      middle_notes: 'Lavandin, Rosemary, Blue Camomile',
      base_notes: 'White Cedar, Patchouli, Oakmoss',
      density: 0.985,
      min_stock_kg: 3.0,
      selling_price_per_kg: 1450000,
      selling_price_usd_per_kg: 90.0,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=500&auto=format&fit=crop&q=60',
    },
    {
      id: 'prod-003',
      sku: 'FO-OUD-003',
      name: 'Oud Royale Intense (Agarwood)',
      applications: JSON.stringify(['Fine Fragrance', 'Industry']),
      fragrance_family: 'Woody',
      pack_sizes: JSON.stringify([25, 5, 1]),
      variant_prices: JSON.stringify({ 25: 4200000, 5: 4200000, 1: 4200000 }),
      top_notes: 'Saffron, Cardamom, Rose',
      middle_notes: 'Agarwood (Oud), Leather, Cypress',
      base_notes: 'Amber, Smoked Incense, Vetiver, Musk',
      density: 1.05,
      min_stock_kg: 2.0,
      selling_price_per_kg: 4200000,
      selling_price_usd_per_kg: 260.0,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=500&auto=format&fit=crop&q=60',
    },
    {
      id: 'prod-009',
      sku: 'FO-NEW-009',
      name: 'aman jiwa',
      applications: JSON.stringify(['Industry', 'Fine Fragrance']),
      fragrance_family: 'Fine Fragrance',
      pack_sizes: JSON.stringify([5, 1]),
      variant_prices: JSON.stringify({ 5: 3000000, 1: 1150000 }),
      top_notes: 'Bergamot, Pink Pepper',
      middle_notes: 'Rose, Jasmine Sambac',
      base_notes: 'Amber, Cedarwood, Musk',
      density: 1.0,
      min_stock_kg: 3.0,
      selling_price_per_kg: 3000000,
      selling_price_usd_per_kg: 184.62,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500&auto=format&fit=crop&q=60',
    },
  ];

  for (const p of productsData) {
    await conn.query(
      `INSERT INTO products 
      (id, sku, name, applications, fragrance_family, pack_sizes, variant_prices, top_notes, middle_notes, base_notes, density, min_stock_kg, selling_price_per_kg, selling_price_usd_per_kg, is_active, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        sku=VALUES(sku),
        name=VALUES(name),
        applications=VALUES(applications),
        pack_sizes=VALUES(pack_sizes),
        variant_prices=VALUES(variant_prices),
        top_notes=VALUES(top_notes),
        middle_notes=VALUES(middle_notes),
        base_notes=VALUES(base_notes),
        min_stock_kg=VALUES(min_stock_kg),
        selling_price_per_kg=VALUES(selling_price_per_kg),
        selling_price_usd_per_kg=VALUES(selling_price_usd_per_kg)`,
      [
        p.id,
        p.sku,
        p.name,
        p.applications,
        p.fragrance_family,
        p.pack_sizes,
        p.variant_prices,
        p.top_notes,
        p.middle_notes,
        p.base_notes,
        p.density,
        p.min_stock_kg,
        p.selling_price_per_kg,
        p.selling_price_usd_per_kg,
        p.is_active,
        p.image_url,
      ]
    );
    console.log(`  ✓ Product persisted: ${p.name} (SKU: ${p.sku})`);
  }

  console.log('\n📦 Seeding Stock Batches in MySQL...');
  const stockBatchesData = [
    {
      id: 'batch-001',
      batch_number: 'LOT-2026-VAN-25K-A1',
      product_id: 'prod-001',
      variant_sku: 'FO-VAN-001-25K',
      pack_size_kg: 25,
      unit_count: 3,
      production_date: '2026-01-10',
      expiry_date: '2026-06-30',
      initial_qty_kg: 75.0,
      current_qty_kg: 75.0,
      unit_cost_per_kg: 1250000,
      is_expired: 0,
    },
    {
      id: 'batch-002',
      batch_number: 'LOT-2026-VAN-5K-B2',
      product_id: 'prod-001',
      variant_sku: 'FO-VAN-001-5K',
      pack_size_kg: 5,
      unit_count: 4,
      production_date: '2026-02-01',
      expiry_date: '2026-08-15',
      initial_qty_kg: 20.0,
      current_qty_kg: 20.0,
      unit_cost_per_kg: 1300000,
      is_expired: 0,
    },
    {
      id: 'batch-003',
      batch_number: 'LOT-2026-VAN-1K-C3',
      product_id: 'prod-001',
      variant_sku: 'FO-VAN-001-1K',
      pack_size_kg: 1,
      unit_count: 3,
      production_date: '2026-02-15',
      expiry_date: '2026-11-20',
      initial_qty_kg: 3.0,
      current_qty_kg: 3.0,
      unit_cost_per_kg: 1350000,
      is_expired: 0,
    },
    {
      id: 'batch-004',
      batch_number: 'LOT-2026-LAV-25K-A1',
      product_id: 'prod-002',
      variant_sku: 'FO-LAV-002-25K',
      pack_size_kg: 25,
      unit_count: 3,
      production_date: '2026-01-15',
      expiry_date: '2026-07-20',
      initial_qty_kg: 75.0,
      current_qty_kg: 75.0,
      unit_cost_per_kg: 950000,
      is_expired: 0,
    },
    {
      id: 'batch-005',
      batch_number: 'LOT-2026-LAV-5K-B1',
      product_id: 'prod-002',
      variant_sku: 'FO-LAV-002-5K',
      pack_size_kg: 5,
      unit_count: 1,
      production_date: '2026-02-10',
      expiry_date: '2026-09-10',
      initial_qty_kg: 5.0,
      current_qty_kg: 5.0,
      unit_cost_per_kg: 980000,
      is_expired: 0,
    },
    {
      id: 'batch-006',
      batch_number: 'LOT-2026-LAV-1K-C1',
      product_id: 'prod-002',
      variant_sku: 'FO-LAV-002-1K',
      pack_size_kg: 1,
      unit_count: 2,
      production_date: '2026-02-20',
      expiry_date: '2026-12-05',
      initial_qty_kg: 2.0,
      current_qty_kg: 2.0,
      unit_cost_per_kg: 1000000,
      is_expired: 0,
    },
    {
      id: 'batch-007',
      batch_number: 'LOT-2026-OUD-25K-A1',
      product_id: 'prod-003',
      variant_sku: 'FO-OUD-003-25K',
      pack_size_kg: 25,
      unit_count: 1,
      production_date: '2026-01-20',
      expiry_date: '2026-05-15',
      initial_qty_kg: 25.0,
      current_qty_kg: 25.0,
      unit_cost_per_kg: 2800000,
      is_expired: 0,
    },
    {
      id: 'batch-008',
      batch_number: 'LOT-2026-OUD-5K-B1',
      product_id: 'prod-003',
      variant_sku: 'FO-OUD-003-5K',
      pack_size_kg: 5,
      unit_count: 3,
      production_date: '2026-02-05',
      expiry_date: '2026-10-10',
      initial_qty_kg: 15.0,
      current_qty_kg: 15.0,
      unit_cost_per_kg: 2900000,
      is_expired: 0,
    },
    {
      id: 'batch-009',
      batch_number: 'LOT-2026-NEW009-5K-A1',
      product_id: 'prod-009',
      variant_sku: 'FO-NEW-009-5K',
      pack_size_kg: 5,
      unit_count: 1,
      production_date: '2026-02-25',
      expiry_date: '2027-02-25',
      initial_qty_kg: 5.0,
      current_qty_kg: 5.0,
      unit_cost_per_kg: 2100000,
      is_expired: 0,
    },
    {
      id: 'batch-010',
      batch_number: 'LOT-2026-NEW009-1K-A1',
      product_id: 'prod-009',
      variant_sku: 'FO-NEW-009-1K',
      pack_size_kg: 1,
      unit_count: 1,
      production_date: '2026-02-25',
      expiry_date: '2027-02-25',
      initial_qty_kg: 1.0,
      current_qty_kg: 1.0,
      unit_cost_per_kg: 805000,
      is_expired: 0,
    },
  ];

  for (const b of stockBatchesData) {
    await conn.query(
      `INSERT INTO stock_batches
      (id, batch_number, product_id, variant_sku, pack_size_kg, unit_count, production_date, expiry_date, initial_qty_kg, current_qty_kg, unit_cost_per_kg, is_expired)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        batch_number=VALUES(batch_number),
        variant_sku=VALUES(variant_sku),
        pack_size_kg=VALUES(pack_size_kg),
        unit_count=VALUES(unit_count),
        current_qty_kg=VALUES(current_qty_kg),
        unit_cost_per_kg=VALUES(unit_cost_per_kg)`,
      [
        b.id,
        b.batch_number,
        b.product_id,
        b.variant_sku,
        b.pack_size_kg,
        b.unit_count,
        b.production_date,
        b.expiry_date,
        b.initial_qty_kg,
        b.current_qty_kg,
        b.unit_cost_per_kg,
        b.is_expired,
      ]
    );
    console.log(`  ✓ Batch persisted: ${b.batch_number} (${b.variant_sku})`);
  }

  console.log('\n👥 Seeding Customers in MySQL...');
  const customersData = [
    {
      id: 'cust-001',
      code: 'CUST-001',
      company_name: 'PT Parfumerie Indah Nusantara',
      pic_name: 'Hendrik Wijaya',
      email: 'hendrik@parfumerieindah.com',
      username: 'hendrik@parfumerieindah.com',
      password: 'Artaroma2026!',
      phone: '0812-9988-7766',
      address: 'Kawasan Industri Jababeka V Blok C-12, Cikarang, Bekasi',
      npwp: '01.345.678.9-012.000',
      credit_limit: 40000000.0,
      credit_terms_days: 30,
      is_active: 1,
      allowed_product_ids: JSON.stringify(['prod-001', 'prod-002', 'prod-003', 'prod-009']),
    },
    {
      id: 'cust-002',
      code: 'CUST-002',
      company_name: 'CV Aroma Botanica Indonesia',
      pic_name: 'Dewi Sastro',
      email: 'dewi@aromabotanica.co.id',
      username: 'dewi@aromabotanica.co.id',
      password: 'Artaroma2026!',
      phone: '0856-1122-3344',
      address: 'Jl. Raya Bogor KM 28 No. 45, Ciracas, Jakarta Timur',
      npwp: '02.987.654.3-045.000',
      credit_limit: 0.0,
      credit_terms_days: 0,
      is_active: 1,
      allowed_product_ids: JSON.stringify(['prod-001', 'prod-002', 'prod-003', 'prod-009']),
    },
  ];

  for (const c of customersData) {
    await conn.query(
      `INSERT INTO customers
      (id, code, company_name, pic_name, email, username, password, phone, address, npwp, credit_limit, credit_terms_days, is_active, allowed_product_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        code=VALUES(code),
        company_name=VALUES(company_name),
        pic_name=VALUES(pic_name),
        email=VALUES(email),
        username=VALUES(username),
        password=VALUES(password),
        credit_limit=VALUES(credit_limit),
        credit_terms_days=VALUES(credit_terms_days),
        allowed_product_ids=VALUES(allowed_product_ids)`,
      [
        c.id,
        c.code,
        c.company_name,
        c.pic_name,
        c.email,
        c.username,
        c.password,
        c.phone,
        c.address,
        c.npwp,
        c.credit_limit,
        c.credit_terms_days,
        c.is_active,
        c.allowed_product_ids,
      ]
    );
    console.log(`  ✓ Customer persisted: ${c.company_name} (${c.code})`);
  }

  console.log('\n🚛 Seeding Distributors, Couriers, and Users in MySQL...');

  const distributorsData = [
    {
      id: 'dist-001',
      code: 'DIST-GIV-01',
      name: 'PT Givaudan Fragrances Indonesia',
      contact_name: 'Marcus Vance',
      email: 'order.id@givaudan.com',
      phone: '021-5790-1234',
      address: 'Gedung Menara Astra Lt. 24, Jl. Jend. Sudirman, Jakarta',
      top_payable_days: 30,
      bank_account: 'BCA 0883-992-111 a.n PT Givaudan Fragrances Indonesia',
      npwp: '01.234.567.8-012.000',
      notes: 'Suplier utama untuk bibit parfum kategori Gourmand (Vanilla) & Fine Fragrance.',
      supplied_product_ids: JSON.stringify(['prod-001', 'prod-009']),
    },
    {
      id: 'dist-002',
      code: 'DIST-FIR-02',
      name: 'PT Firmenich Aromatics Indonesia',
      contact_name: 'Anita Kusuma',
      email: 'supply.indonesia@firmenich.com',
      phone: '021-2995-5678',
      address: 'Soho Capital Lt. 32, Jl. S. Parman, Jakarta Barat',
      top_payable_days: 45,
      bank_account: 'Mandiri 122-00-998877-6 a.n PT Firmenich Aromatics',
      npwp: '02.345.678.9-023.000',
      notes: 'Spesialis bibit parfum Floral (Lavender Provençal). Syarat pengiriman minimal 1 Drum 25 Kg.',
      supplied_product_ids: JSON.stringify(['prod-002']),
    },
    {
      id: 'dist-003',
      code: 'DIST-IFF-03',
      name: 'PT International Flavors & Fragrances (IFF)',
      contact_name: 'Rian Hidayat',
      email: 'b2b.orders@iff.com',
      phone: '021-8983-4321',
      address: 'Kawasan Industri MM2100, Cikarang Barat, Bekasi',
      top_payable_days: 60,
      bank_account: 'BNI 009-887-6655 a.n PT IFF Indonesia',
      npwp: '03.456.789.0-034.000',
      notes: 'Suplier bibit parfum Woody (Oud Royale Intense) & Oriental.',
      supplied_product_ids: JSON.stringify(['prod-003']),
    },
  ];

  for (const d of distributorsData) {
    await conn.query(
      `INSERT INTO distributors
      (id, code, name, contact_name, email, phone, address, top_payable_days, bank_account, npwp, notes, supplied_product_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        code=VALUES(code),
        name=VALUES(name),
        contact_name=VALUES(contact_name),
        email=VALUES(email),
        phone=VALUES(phone),
        address=VALUES(address),
        top_payable_days=VALUES(top_payable_days),
        bank_account=VALUES(bank_account),
        npwp=VALUES(npwp),
        notes=VALUES(notes),
        supplied_product_ids=VALUES(supplied_product_ids)`,
      [
        d.id,
        d.code,
        d.name,
        d.contact_name,
        d.email,
        d.phone,
        d.address,
        d.top_payable_days,
        d.bank_account,
        d.npwp,
        d.notes,
        d.supplied_product_ids,
      ]
    );
    console.log(`  ✓ Distributor persisted: ${d.name} (${d.code})`);
  }

  await conn.query(`
    INSERT INTO couriers (id, code, name, phone, vehicle_number, is_active)
    VALUES ('cour-001', 'KUR-001', 'Budi Gunawan (Kurir Cargo)', '0813-8899-7711', 'B 7721 KFP (Blind Van)', 1)
    ON DUPLICATE KEY UPDATE name=VALUES(name)
  `);
  console.log('  ✓ Courier persisted: Budi Gunawan');

  await conn.query(`
    INSERT INTO users (id, name, email, role, linked_entity_name, password, is_active)
    VALUES 
      ('user-001', 'Super Admin HQ', 'admin@artaroma.co.id', 'SUPER_ADMIN', 'Artaroma HQ (Kantor Pusat)', 'Artaroma2026!', 1),
      ('user-002', 'Budi Santoso', 'budi@parfumerieindah.com', 'CUSTOMER', 'PT Parfumerie Indah Nusantara', 'Artaroma2026!', 1),
      ('user-003', 'Hendra Gunawan', 'hendra@givaudan.com', 'DISTRIBUTOR', 'PT Givaudan Indonesia', 'Artaroma2026!', 1),
      ('user-004', 'Agus Kurir', 'agus@artaroma.co.id', 'COURIER', 'Armada Kurir HQ', 'Artaroma2026!', 1)
    ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role)
  `);
  console.log('  ✓ Users persisted: 4 App Users');

  await conn.end();
  console.log('\n🎉 ALL DUMMY DATA HAS BEEN PERSISTED SUCCESSFULLY TO MYSQL DATABASE "fragrance_hub"!');
  process.exit(0);
}

syncAllDummyDataToMySQL().catch((err) => {
  console.error(err);
  process.exit(1);
});
