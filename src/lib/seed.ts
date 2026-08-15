import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

import pool from './db';

export async function runSeeder() {
  console.log('🌱 Starting Artaroma Fragrance Hub Database Seeding...');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Seed Distributor
    console.log('🔹 Seeding Distributor...');
    await connection.query(`
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
      ON DUPLICATE KEY UPDATE name=VALUES(name), contact_name=VALUES(contact_name);
    `);

    // 2. Seed Courier
    console.log('🔹 Seeding Courier...');
    await connection.query(`
      INSERT INTO couriers (id, code, name, phone, vehicle_number, is_active)
      VALUES (
        'cour-001',
        'KUR-001',
        'Budi Gunawan (Kurir Cargo)',
        '0813-8899-7711',
        'B 7721 KFP (Blind Van)',
        TRUE
      )
      ON DUPLICATE KEY UPDATE name=VALUES(name), vehicle_number=VALUES(vehicle_number);
    `);

    // 3. Seed Master Products (3 Variants)
    console.log('🔹 Seeding 3 Fragrance Oil Master Products...');
    const productsData = [
      [
        'prod-001',
        'FO-VAN-001',
        'Vanilla Bourbon Super Pure',
        'Gourmand',
        'Creamy Milk, Sweet Almond',
        'Madagascar Vanilla Pod, Caramel',
        'Tonka Bean, Sandalwood, Musk',
        1.025,
        5.0,
        1850000,
        true,
      ],
      [
        'prod-002',
        'FO-LAV-002',
        'Lavender Provençal Premium',
        'Floral',
        'French Lavender, Bergamot, Clary Sage',
        'Lavandin, Rosemary, Blue Camomile',
        'White Cedar, Patchouli, Oakmoss',
        0.985,
        3.0,
        1450000,
        true,
      ],
      [
        'prod-003',
        'FO-OUD-003',
        'Oud Royale Intense (Agarwood)',
        'Woody',
        'Saffron, Cardamom, Rose',
        'Agarwood (Oud), Leather, Cypress',
        'Amber, Smoked Incense, Vetiver, Musk',
        1.05,
        2.0,
        4200000,
        true,
      ],
    ];

    for (const p of productsData) {
      await connection.query(
        `INSERT INTO products 
        (id, sku, name, fragrance_family, top_notes, middle_notes, base_notes, density, min_stock_kg, selling_price_per_kg, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name), selling_price_per_kg=VALUES(selling_price_per_kg);`,
        p
      );
    }

    // 4. Seed Customers (2 Customers)
    console.log('🔹 Seeding 2 Customers (1 Credit Limit Rp 10.000.000 & 1 Cash Customer)...');
    const customersData = [
      [
        'cust-001',
        'CUST-001',
        'PT Parfumerie Indah Nusantara',
        'Hendrik Wijaya',
        'hendrik@parfumerieindah.com',
        '0812-9988-7766',
        'Kawasan Industri Jababeka V Blok C-12, Cikarang, Bekasi',
        '01.345.678.9-012.000',
        10000000.0, // Credit Limit Rp 10.000.000
        30, // TOP 30 days
        true,
      ],
      [
        'cust-002',
        'CUST-002',
        'CV Aroma Botanica Indonesia (Customer Cash)',
        'Dewi Sastro',
        'dewi@aromabotanica.co.id',
        '0856-1122-3344',
        'Jl. Raya Bogor KM 28 No. 45, Ciracas, Jakarta Timur',
        '02.987.654.3-045.000',
        0.0, // No Credit (Cash / CBD)
        0,
        true,
      ],
    ];

    for (const c of customersData) {
      await connection.query(
        `INSERT INTO customers 
        (id, code, company_name, pic_name, email, phone, address, npwp, credit_limit, credit_terms_days, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), credit_limit=VALUES(credit_limit);`,
        c
      );
    }

    // 5. Seed 2 Initial Stock Batches for FEFO Testing
    console.log('🔹 Seeding 2 Stock Batches with different expiry dates for FEFO testing...');
    const batchesData = [
      [
        'batch-001',
        'LOT-2026-A1',
        'prod-001', // Vanilla Bourbon
        null,
        '2025-09-01',
        '2026-09-01', // Earlier expiry date -> FEFO Priority 1
        25.0,
        18.5,
        1250000.0,
        false,
      ],
      [
        'batch-002',
        'LOT-2026-B2',
        'prod-001', // Vanilla Bourbon
        null,
        '2026-03-01',
        '2027-03-01', // Later expiry date -> FEFO Priority 2
        50.0,
        50.0,
        1280000.0,
        false,
      ],
    ];

    for (const b of batchesData) {
      await connection.query(
        `INSERT INTO stock_batches 
        (id, batch_number, product_id, po_item_id, production_date, expiry_date, initial_qty_kg, current_qty_kg, unit_cost_per_kg, is_expired)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE current_qty_kg=VALUES(current_qty_kg), expiry_date=VALUES(expiry_date);`,
        b
      );
    }

    await connection.commit();
    console.log('✅ Database Seeding Successfully Completed!');
  } catch (error: any) {
    await connection.rollback();
    console.error('❌ Database Seeding Failed:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

// Run seeder if executed directly
if (require.main === module) {
  runSeeder();
}
