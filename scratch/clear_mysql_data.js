const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'fragrance_hub',
  });

  const tablesToTruncate = [
    'sales_orders',
    'so_items',
    'so_item_batches',
    'invoices',
    'payments',
    'deliveries',
    'purchase_orders',
    'po_items',
    'stock_opname_history',
    'stock_repackage_logs',
    'product_variant_price_logs',
    'product_variants',
    'products',
    'customers',
    'distributors',
    'couriers',
    'stock_batches',
    'users',
    'company_settings'
  ];

  try {
    console.log('⚡ Starting database reset...');
    
    // 1. Disable Foreign Key Checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // 2. Truncate all tables
    for (const table of tablesToTruncate) {
      await pool.query(`TRUNCATE TABLE ${table}`);
      console.log(`✓ Table ${table} truncated.`);
    }

    // 3. Re-enable Foreign Key Checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Foreign key checks re-enabled.');

    // 4. Seed Distributors
    console.log('🌱 Seeding distributors...');
    await pool.query(`
      INSERT INTO distributors (id, code, name, contact_name, email, phone, address)
      VALUES (
        'dist-001',
        'DIST-GIV-01',
        'PT Givaudan Indonesia (Vendor)',
        'Hendra Gunawan (Key Account)',
        'order.id@givaudan.com',
        '021-8971-2233',
        'Kawasan Industri MM2100 Blok B1-2, Cikarang Barat, Bekasi'
      )
    `);

    // 5. Seed Couriers
    console.log('🌱 Seeding couriers...');
    const couriers = [
      ['cour-001-default', 'KUR-01', 'Rian Pratama', '0812-7766-5544', 'B 9482 SXZ (Blind Van)', 1],
      ['cour-002-default', 'KUR-02', 'Agus Subandi', '0857-4433-2211', 'B 3821 KFP (Box Truck)', 1],
      ['cour-003-default', 'KUR-03', 'Doni Setiawan', '0877-2211-9900', 'B 1102 WA (Motor Cargo)', 1],
      ['cour-001', 'KUR-001', 'Budi Gunawan (Kurir Cargo)', '0813-8899-7711', 'B 7721 KFP (Blind Van)', 1]
    ];
    for (const c of couriers) {
      await pool.query(
        'INSERT INTO couriers (id, code, name, phone, vehicle_number, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        c
      );
    }

    // 6. Seed Products
    console.log('🌱 Seeding products...');
    const products = [
      ['prod-001', 'FO-VAN-001', 'Vanilla Bourbon Super Pure', 'Gourmand', 'Creamy Milk, Sweet Almond', 'Madagascar Vanilla Pod, Caramel', 'Tonka Bean, Sandalwood, Musk', 1.025, 5.0, 1850000, 1],
      ['prod-002', 'FO-LAV-002', 'Lavender Provençal Premium', 'Floral', 'French Lavender, Bergamot, Clary Sage', 'Lavandin, Rosemary, Blue Camomile', 'White Cedar, Patchouli, Oakmoss', 0.985, 3.0, 1450000, 1],
      ['prod-003', 'FO-OUD-003', 'Oud Royale Intense (Agarwood)', 'Woody', 'Saffron, Cardamom, Rose', 'Agarwood (Oud), Leather, Cypress', 'Amber, Smoked Incense, Vetiver, Musk', 1.05, 2.0, 4200000, 1]
    ];
    for (const p of products) {
      await pool.query(
        `INSERT INTO products 
         (id, sku, name, fragrance_family, top_notes, middle_notes, base_notes, density, min_stock_kg, selling_price_per_kg, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p
      );
    }

    // 7. Seed Customers
    console.log('🌱 Seeding customers...');
    const customers = [
      ['cust-001', 'CUST-001', 'PT Parfumerie Indah Nusantara', 'Hendrik Wijaya', 'hendrik@parfumerieindah.com', '0812-9988-7766', 'Kawasan Industri Jababeka V Blok C-12, Cikarang, Bekasi', '01.345.678.9-012.000', 10000000.0, 30, 1],
      ['cust-002', 'CUST-002', 'CV Aroma Botanica Indonesia (Customer Cash)', 'Dewi Sastro', 'dewi@aromabotanica.co.id', '0856-1122-3344', 'Jl. Raya Bogor KM 28 No. 45, Ciracas, Jakarta Timur', '02.987.654.3-045.000', 0.0, 0, 1]
    ];
    for (const c of customers) {
      await pool.query(
        `INSERT INTO customers 
         (id, code, company_name, pic_name, email, phone, address, npwp, credit_limit, credit_terms_days, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c
      );
    }

    // 8. Seed Stock Batches
    console.log('🌱 Seeding stock batches...');
    const batches = [
      ['batch-001', 'LOT-2025-VAN-5K-A1', 'prod-001', null, '2024-09-01', '2025-09-01', 25.0, 25.0, 1250000.0, 0],
      ['batch-002', 'LOT-2026-VAN-25K-B2', 'prod-001', null, '2025-03-01', '2026-03-01', 50.0, 50.0, 1280000.0, 0]
    ];
    for (const b of batches) {
      await pool.query(
        `INSERT INTO stock_batches 
         (id, batch_number, product_id, po_item_id, production_date, expiry_date, initial_qty_kg, current_qty_kg, unit_cost_per_kg, is_expired)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        b
      );
    }

    // 9. Seed Users
    console.log('🌱 Seeding users...');
    const users = [
      ['user-001', 'Super Admin HQ', 'admin@artaroma.co.id', 'SUPER_ADMIN', 'Artaroma HQ (Kantor Pusat)', 'Artaroma2026!', 1],
      ['user-002', 'Budi Santoso', 'budi@parfumerieindah.com', 'CUSTOMER', 'PT Parfumerie Indah Nusantara', 'Artaroma2026!', 1],
      ['user-003', 'Hendra Gunawan', 'hendra@givaudan.com', 'DISTRIBUTOR', 'PT Givaudan Indonesia', 'Artaroma2026!', 1],
      ['user-004', 'Agus Kurir', 'agus@artaroma.co.id', 'COURIER', 'Armada Kurir HQ', 'Artaroma2026!', 1]
    ];
    for (const u of users) {
      await pool.query(
        `INSERT INTO users (id, name, email, role, linked_entity_name, password, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        u
      );
    }

    // 10. Seed Company Settings
    console.log('🌱 Seeding company settings...');
    const settings = [
      ['bank_bca', '8830-192-888', 'Nomor Rekening BCA PT Artaroma Fragrance Indonesia'],
      ['bank_mandiri', '122-00-8899-7711', 'Nomor Rekening Mandiri PT Artaroma Fragrance Indonesia'],
      ['company_name', 'PT ARTAROMA FRAGRANCE INDONESIA', 'Nama Perusahaan Resmi'],
      ['delivery_schedule_rule', 'Max 7 Hari setelah PO diterbitkan', 'Ketentuan Jadwal Terima Barang PO'],
      ['logistics_pic', 'Tim Gudang FEFO Engine', 'UP Logistik / PIC Gudang'],
      ['warehouse_address', 'Kawasan Industri Jababeka V Blok C-12, Cikarang Barat, Bekasi', 'Alamat Warehouse Utama']
    ];
    for (const s of settings) {
      await pool.query(
        'INSERT INTO company_settings (key_name, value_text, description) VALUES (?, ?, ?)',
        s
      );
    }

    console.log('✨ MySQL database successfully cleared and reset to initial state!');
  } catch (error) {
    console.error('❌ Reset failed:', error);
  } finally {
    await pool.end();
  }
}

run();
