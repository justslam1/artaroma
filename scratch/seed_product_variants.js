const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'fragrance_hub',
  });

  const variants = [
    // 1. ACASIA (prod-001)
    ['var-aca-25', 'prod-001', 'FO-ACA-001-25K', 'ACASIA 25K', 25.0, 1450000.0, 90.0, 5.0, 1],
    ['var-aca-5', 'prod-001', 'FO-ACA-001-5K', 'ACASIA 5K', 5.0, 1550000.0, 95.0, 1.0, 1],
    ['var-aca-1', 'prod-001', 'FO-ACA-001-1K', 'ACASIA 1K', 1.0, 1600000.0, 100.0, 1.0, 1],

    // 2. BOUGENVILLE (prod-002)
    ['var-bou-25', 'prod-002', 'FO-BOU-002-25K', 'BOUGENVILLE 25K', 25.0, 1350000.0, 84.0, 5.0, 1],
    ['var-bou-5', 'prod-002', 'FO-BOU-002-5K', 'BOUGENVILLE 5K', 5.0, 1450000.0, 90.0, 1.0, 1],
    ['var-bou-1', 'prod-002', 'FO-BOU-002-1K', 'BOUGENVILLE 1K', 1.0, 1500000.0, 93.0, 1.0, 1],

    // 3. AQUA FRESH (prod-003)
    ['var-aqu-25', 'prod-003', 'FO-AQU-003-25K', 'AQUA FRESH 25K', 25.0, 1650000.0, 102.5, 5.0, 1],
    ['var-aqu-5', 'prod-003', 'FO-AQU-003-5K', 'AQUA FRESH 5K', 5.0, 1750000.0, 108.0, 1.0, 1],
    ['var-aqu-1', 'prod-003', 'FO-AQU-003-1K', 'AQUA FRESH 1K', 1.0, 1800000.0, 112.0, 1.0, 1],

    // 4. CITRONELLA OIL (prod-004)
    ['var-cit-25', 'prod-004', 'FO-CIT-004-25K', 'CITRONELLA OIL 25K', 25.0, 950000.0, 59.0, 5.0, 1],
    ['var-cit-5', 'prod-004', 'FO-CIT-004-5K', 'CITRONELLA OIL 5K', 5.0, 1050000.0, 65.0, 1.0, 1],
    ['var-cit-1', 'prod-004', 'FO-CIT-004-1K', 'CITRONELLA OIL 1K', 1.0, 1100000.0, 68.0, 1.0, 1]
  ];

  try {
    console.log('⚡ Populating product_variants table in MySQL...');
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE product_variants');
    console.log('✓ product_variants table truncated.');

    for (const v of variants) {
      await pool.query(
        `INSERT INTO product_variants 
         (id, product_id, variant_sku, variant_name, pack_size_kg, selling_price_per_kg, selling_price_usd_per_kg, min_stock_kg, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        v
      );
      console.log(`Inserted variant: ${v[3]} (${v[2]})`);
    }

    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✨ MySQL database variants populated successfully!');
  } catch (error) {
    console.error('❌ Seeding variants failed:', error);
  } finally {
    await pool.end();
  }
}

run();
