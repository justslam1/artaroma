const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'fragrance_hub',
  });

  try {
    console.log('⚡ Starting master data restoration...');
    
    // Disable Foreign Key Checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Truncate tables to make sure we don't have duplicates
    await pool.query('TRUNCATE TABLE products');
    await pool.query('TRUNCATE TABLE customers');
    await pool.query('TRUNCATE TABLE stock_batches');
    await pool.query('TRUNCATE TABLE users');
    await pool.query('TRUNCATE TABLE company_settings');

    // 2. Seed Products
    console.log('🌱 Restoring products...');
    const products = [
      {
        id: 'prod-001',
        sku: 'FO-VAN-001',
        name: 'Vanilla Bourbon Super Pure',
        applications: JSON.stringify(['Fine Fragrance', 'Industry']),
        application: 'Fine Fragrance',
        fragrance_family: 'Gourmand',
        pack_sizes: JSON.stringify([25, 5, 1]),
        top_notes: 'Creamy Milk, Sweet Almond',
        middle_notes: 'Madagascar Vanilla Pod, Caramel',
        base_notes: 'Tonka Bean, Sandalwood, Musk',
        density: 1.0250,
        is_active: 1,
        image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500&auto=format&fit=crop&q=60',
        variant_prices: JSON.stringify({ 25: 1850000, 5: 1950000, 1: 2000000 }),
        selling_price_usd_per_kg: 115.0
      },
      {
        id: 'prod-002',
        sku: 'FO-LAV-002',
        name: 'Lavender Provençal Premium',
        applications: JSON.stringify(['Fine Fragrance']),
        application: 'Fine Fragrance',
        fragrance_family: 'Floral',
        pack_sizes: JSON.stringify([25, 5, 1]),
        top_notes: 'French Lavender, Bergamot, Clary Sage',
        middle_notes: 'Lavandin, Rosemary, Blue Camomile',
        base_notes: 'White Cedar, Patchouli, Oakmoss',
        density: 0.9850,
        is_active: 1,
        image_url: 'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=500&auto=format&fit=crop&q=60',
        variant_prices: JSON.stringify({ 25: 1450000, 5: 1550000, 1: 1600000 }),
        selling_price_usd_per_kg: 90.0
      },
      {
        id: 'prod-003',
        sku: 'FO-OUD-003',
        name: 'Oud Royale Intense (Agarwood)',
        applications: JSON.stringify(['Fine Fragrance', 'Industry']),
        application: 'Fine Fragrance',
        fragrance_family: 'Woody',
        pack_sizes: JSON.stringify([25, 5, 1]),
        top_notes: 'Saffron, Cardamom, Rose',
        middle_notes: 'Agarwood (Oud), Leather, Cypress',
        base_notes: 'Amber, Smoked Incense, Vetiver, Musk',
        density: 1.0500,
        is_active: 1,
        image_url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=500&auto=format&fit=crop&q=60',
        variant_prices: JSON.stringify({ 25: 4200000, 5: 4300000, 1: 4400000 }),
        selling_price_usd_per_kg: 260.0
      }
    ];

    for (const p of products) {
      await pool.query(
        `INSERT INTO products 
         (id, sku, name, applications, application, fragrance_family, pack_sizes, top_notes, middle_notes, base_notes, density, is_active, image_url, variant_prices, selling_price_usd_per_kg)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.sku, p.name, p.applications, p.application, p.fragrance_family, p.pack_sizes, p.top_notes, p.middle_notes, p.base_notes, p.density, p.is_active, p.image_url, p.variant_prices, p.selling_price_usd_per_kg]
      );
    }

    // 3. Seed Customers
    console.log('🌱 Restoring customers...');
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

    // 4. Seed Stock Batches
    console.log('🌱 Restoring stock batches...');
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

    // 5. Seed Users
    console.log('🌱 Restoring users...');
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

    // 6. Seed Company Settings
    console.log('🌱 Restoring company settings...');
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

    // Re-enable Foreign Key Checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Foreign key checks re-enabled.');
    
    console.log('✨ All MySQL master data tables successfully restored and populated!');
  } catch (error) {
    console.error('❌ Restoration failed:', error);
  } finally {
    await pool.end();
  }
}

run();
