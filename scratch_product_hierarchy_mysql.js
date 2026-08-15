const mysql = require('mysql2/promise');

async function syncProductHierarchyToMySQL() {
  console.log('🔄 Connecting to MySQL fragrance_hub...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fragrance_hub',
  });

  console.log('✅ Connected! Creating product_variants table in MySQL...');

  // 1. Create product_variants table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id VARCHAR(36) PRIMARY KEY,
      product_id VARCHAR(36) NOT NULL,
      variant_sku VARCHAR(50) NOT NULL UNIQUE,
      variant_name VARCHAR(150) NOT NULL,
      pack_size_kg DECIMAL(12,4) NOT NULL,
      selling_price_per_kg DECIMAL(15,2) NOT NULL,
      min_stock_kg DECIMAL(12,4) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✓ Table product_variants created/verified.');

  // 2. Define Product Variants matching exact hierarchy
  const variantsData = [
    // Vanilla Bourbon Super Pure (prod-001)
    {
      id: 'var-van-25k',
      product_id: 'prod-001',
      variant_sku: 'FO-VAN-001-25K',
      variant_name: 'Vanilla Bourbon Super Pure 25K',
      pack_size_kg: 25.0,
      selling_price_per_kg: 3850000.0,
      min_stock_kg: 25.0,
    },
    {
      id: 'var-van-5k',
      product_id: 'prod-001',
      variant_sku: 'FO-VAN-001-5K',
      variant_name: 'Vanilla Bourbon Super Pure 5K',
      pack_size_kg: 5.0,
      selling_price_per_kg: 1850000.0,
      min_stock_kg: 5.0,
    },
    {
      id: 'var-van-1k',
      product_id: 'prod-001',
      variant_sku: 'FO-VAN-001-1K',
      variant_name: 'Vanilla Bourbon Super Pure 1K',
      pack_size_kg: 1.0,
      selling_price_per_kg: 1850000.0,
      min_stock_kg: 1.0,
    },

    // Lavender Provençal Premium (prod-002)
    {
      id: 'var-lav-25k',
      product_id: 'prod-002',
      variant_sku: 'FO-LAV-002-25K',
      variant_name: 'Lavender Provençal Premium 25K',
      pack_size_kg: 25.0,
      selling_price_per_kg: 1450000.0,
      min_stock_kg: 25.0,
    },
    {
      id: 'var-lav-5k',
      product_id: 'prod-002',
      variant_sku: 'FO-LAV-002-5K',
      variant_name: 'Lavender Provençal Premium 5K',
      pack_size_kg: 5.0,
      selling_price_per_kg: 1450000.0,
      min_stock_kg: 5.0,
    },
    {
      id: 'var-lav-1k',
      product_id: 'prod-002',
      variant_sku: 'FO-LAV-002-1K',
      variant_name: 'Lavender Provençal Premium 1K',
      pack_size_kg: 1.0,
      selling_price_per_kg: 1450000.0,
      min_stock_kg: 1.0,
    },

    // Oud Royale Intense (prod-003)
    {
      id: 'var-oud-25k',
      product_id: 'prod-003',
      variant_sku: 'FO-OUD-003-25K',
      variant_name: 'Oud Royale Intense (Agarwood) 25K',
      pack_size_kg: 25.0,
      selling_price_per_kg: 4200000.0,
      min_stock_kg: 25.0,
    },
    {
      id: 'var-oud-5k',
      product_id: 'prod-003',
      variant_sku: 'FO-OUD-003-5K',
      variant_name: 'Oud Royale Intense (Agarwood) 5K',
      pack_size_kg: 5.0,
      selling_price_per_kg: 4200000.0,
      min_stock_kg: 5.0,
    },
    {
      id: 'var-oud-1k',
      product_id: 'prod-003',
      variant_sku: 'FO-OUD-003-1K',
      variant_name: 'Oud Royale Intense (Agarwood) 1K',
      pack_size_kg: 1.0,
      selling_price_per_kg: 4200000.0,
      min_stock_kg: 1.0,
    },

    // aman jiwa (prod-009)
    {
      id: 'var-new-5k',
      product_id: 'prod-009',
      variant_sku: 'FO-NEW-009-5K',
      variant_name: 'aman jiwa 5K',
      pack_size_kg: 5.0,
      selling_price_per_kg: 3000000.0,
      min_stock_kg: 5.0,
    },
    {
      id: 'var-new-1k',
      product_id: 'prod-009',
      variant_sku: 'FO-NEW-009-1K',
      variant_name: 'aman jiwa 1K',
      pack_size_kg: 1.0,
      selling_price_per_kg: 1150000.0,
      min_stock_kg: 1.0,
    },
  ];

  console.log('\n📦 Seeding Product Variants in MySQL...');

  for (const v of variantsData) {
    await conn.query(
      `INSERT INTO product_variants
      (id, product_id, variant_sku, variant_name, pack_size_kg, selling_price_per_kg, min_stock_kg, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        variant_name=VALUES(variant_name),
        pack_size_kg=VALUES(pack_size_kg),
        selling_price_per_kg=VALUES(selling_price_per_kg),
        min_stock_kg=VALUES(min_stock_kg)`,
      [
        v.id,
        v.product_id,
        v.variant_sku,
        v.variant_name,
        v.pack_size_kg,
        v.selling_price_per_kg,
        v.min_stock_kg,
      ]
    );
    console.log(`  ✓ Variant persisted: ${v.variant_name} (${v.variant_sku}) -> Rp ${v.selling_price_per_kg.toLocaleString()}`);
  }

  // Also update variant_prices JSON column on products table for full sync
  await conn.query(`UPDATE products SET variant_prices = '{"25":3850000,"5":1850000,"1":1850000}' WHERE id = 'prod-001'`);
  await conn.query(`UPDATE products SET variant_prices = '{"25":1450000,"5":1450000,"1":1450000}' WHERE id = 'prod-002'`);
  await conn.query(`UPDATE products SET variant_prices = '{"25":4200000,"5":4200000,"1":4200000}' WHERE id = 'prod-003'`);
  await conn.query(`UPDATE products SET variant_prices = '{"5":3000000,"1":1150000}' WHERE id = 'prod-009'`);
  console.log('  ✓ Synchronized variant_prices JSON in products table.');

  await conn.end();
  console.log('\n🎉 PRODUCT HIERARCHY (PRODUK INDUK & PRODUK VARIAN) IS FULLY PERSISTED TO MYSQL DATABASE "fragrance_hub"!');
}

syncProductHierarchyToMySQL().catch(console.error);
