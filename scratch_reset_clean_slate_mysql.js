const mysql = require('mysql2/promise');

async function resetCleanSlateMySQL() {
  console.log('🔄 Connecting to MySQL fragrance_hub for Clean Slate Reset (Option B)...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fragrance_hub',
  });

  console.log('⚡ Disabling FOREIGN_KEY_CHECKS...');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

  console.log('🗑️ Dropping existing product_variants and products tables...');
  await conn.query('DROP TABLE IF EXISTS product_variants;');
  await conn.query('DROP TABLE IF EXISTS products;');

  console.log('✨ Creating clean "products" (Produk Induk) table...');
  await conn.query(`
    CREATE TABLE products (
      id VARCHAR(36) PRIMARY KEY,
      sku VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      applications TEXT,
      application VARCHAR(50) DEFAULT 'Fine Fragrance',
      fragrance_family VARCHAR(50) DEFAULT 'Fine Fragrance',
      top_notes TEXT,
      middle_notes TEXT,
      base_notes TEXT,
      density DECIMAL(6,4) DEFAULT 1.0000,
      is_active TINYINT(1) DEFAULT 1,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('✨ Creating clean "product_variants" (Produk Varian) table...');
  await conn.query(`
    CREATE TABLE product_variants (
      id VARCHAR(36) PRIMARY KEY,
      product_id VARCHAR(36) NOT NULL,
      variant_sku VARCHAR(50) NOT NULL UNIQUE,
      variant_name VARCHAR(150) NOT NULL,
      pack_size_kg DECIMAL(12,4) NOT NULL,
      selling_price_per_kg DECIMAL(15,2) NOT NULL,
      selling_price_usd_per_kg DECIMAL(15,2) NULL,
      selling_price_per_unit DECIMAL(15,2) GENERATED ALWAYS AS (selling_price_per_kg * pack_size_kg) STORED,
      min_stock_kg DECIMAL(12,4) DEFAULT 0.0000,
      min_stock_units INT GENERATED ALWAYS AS (ROUND(min_stock_kg / pack_size_kg)) STORED,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      INDEX idx_variants_product_id (product_id, is_active),
      INDEX idx_variants_sku (variant_sku)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Ensure stock_batches has variant_id column
  try {
    await conn.query('ALTER TABLE stock_batches ADD COLUMN variant_id VARCHAR(36) NULL AFTER product_id;');
  } catch (e) {
    // Column may already exist
  }

  console.log('⚡ Re-enabling FOREIGN_KEY_CHECKS...');
  await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

  console.log('\n📦 Seeding Clean Produk Induk Data...');
  const produkIndukData = [
    {
      id: 'prod-001',
      sku: 'FO-VAN-001',
      name: 'Vanilla Bourbon Super Pure',
      applications: JSON.stringify(['Fine Fragrance', 'Industry']),
      fragrance_family: 'Gourmand',
      top_notes: 'Creamy Milk, Sweet Almond',
      middle_notes: 'Madagascar Vanilla Pod, Caramel',
      base_notes: 'Tonka Bean, Sandalwood, Musk',
      density: 1.025,
      image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500&auto=format&fit=crop&q=60',
    },
    {
      id: 'prod-002',
      sku: 'FO-LAV-002',
      name: 'Lavender Provençal Premium',
      applications: JSON.stringify(['Fine Fragrance']),
      fragrance_family: 'Floral',
      top_notes: 'French Lavender, Bergamot, Clary Sage',
      middle_notes: 'Lavandin, Rosemary, Blue Camomile',
      base_notes: 'White Cedar, Patchouli, Oakmoss',
      density: 0.985,
      image_url: 'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=500&auto=format&fit=crop&q=60',
    },
    {
      id: 'prod-003',
      sku: 'FO-OUD-003',
      name: 'Oud Royale Intense (Agarwood)',
      applications: JSON.stringify(['Fine Fragrance', 'Industry']),
      fragrance_family: 'Woody',
      top_notes: 'Saffron, Cardamom, Rose',
      middle_notes: 'Agarwood (Oud), Leather, Cypress',
      base_notes: 'Amber, Smoked Incense, Vetiver, Musk',
      density: 1.05,
      image_url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=500&auto=format&fit=crop&q=60',
    },
    {
      id: 'prod-009',
      sku: 'FO-NEW-009',
      name: 'aman jiwa',
      applications: JSON.stringify(['Industry', 'Fine Fragrance']),
      fragrance_family: 'Fine Fragrance',
      top_notes: 'Bergamot, Pink Pepper',
      middle_notes: 'Rose, Jasmine Sambac',
      base_notes: 'Amber, Cedarwood, Musk',
      density: 1.0,
      image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500&auto=format&fit=crop&q=60',
    },
  ];

  for (const p of produkIndukData) {
    await conn.query(
      `INSERT INTO products 
      (id, sku, name, applications, fragrance_family, top_notes, middle_notes, base_notes, density, is_active, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [p.id, p.sku, p.name, p.applications, p.fragrance_family, p.top_notes, p.middle_notes, p.base_notes, p.density, p.image_url]
    );
    console.log(`  ✓ Produk Induk created: ${p.name} (SKU: ${p.sku})`);
  }

  console.log('\n📦 Seeding Clean Produk Varian Data...');
  const produkVarianData = [
    // Vanilla Bourbon Super Pure
    {
      id: 'var-van-25k',
      product_id: 'prod-001',
      variant_sku: 'FO-VAN-001-25K',
      variant_name: 'Vanilla Bourbon Super Pure 25K',
      pack_size_kg: 25.0,
      selling_price_per_kg: 3850000.0,
      selling_price_usd_per_kg: 236.92,
      min_stock_kg: 25.0,
    },
    {
      id: 'var-van-5k',
      product_id: 'prod-001',
      variant_sku: 'FO-VAN-001-5K',
      variant_name: 'Vanilla Bourbon Super Pure 5K',
      pack_size_kg: 5.0,
      selling_price_per_kg: 1850000.0,
      selling_price_usd_per_kg: 113.85,
      min_stock_kg: 5.0,
    },
    {
      id: 'var-van-1k',
      product_id: 'prod-001',
      variant_sku: 'FO-VAN-001-1K',
      variant_name: 'Vanilla Bourbon Super Pure 1K',
      pack_size_kg: 1.0,
      selling_price_per_kg: 1850000.0,
      selling_price_usd_per_kg: 113.85,
      min_stock_kg: 1.0,
    },

    // Lavender Provençal Premium
    {
      id: 'var-lav-25k',
      product_id: 'prod-002',
      variant_sku: 'FO-LAV-002-25K',
      variant_name: 'Lavender Provençal Premium 25K',
      pack_size_kg: 25.0,
      selling_price_per_kg: 1450000.0,
      selling_price_usd_per_kg: 89.23,
      min_stock_kg: 25.0,
    },
    {
      id: 'var-lav-5k',
      product_id: 'prod-002',
      variant_sku: 'FO-LAV-002-5K',
      variant_name: 'Lavender Provençal Premium 5K',
      pack_size_kg: 5.0,
      selling_price_per_kg: 1450000.0,
      selling_price_usd_per_kg: 89.23,
      min_stock_kg: 5.0,
    },
    {
      id: 'var-lav-1k',
      product_id: 'prod-002',
      variant_sku: 'FO-LAV-002-1K',
      variant_name: 'Lavender Provençal Premium 1K',
      pack_size_kg: 1.0,
      selling_price_per_kg: 1450000.0,
      selling_price_usd_per_kg: 89.23,
      min_stock_kg: 1.0,
    },

    // Oud Royale Intense
    {
      id: 'var-oud-25k',
      product_id: 'prod-003',
      variant_sku: 'FO-OUD-003-25K',
      variant_name: 'Oud Royale Intense (Agarwood) 25K',
      pack_size_kg: 25.0,
      selling_price_per_kg: 4200000.0,
      selling_price_usd_per_kg: 258.46,
      min_stock_kg: 25.0,
    },
    {
      id: 'var-oud-5k',
      product_id: 'prod-003',
      variant_sku: 'FO-OUD-003-5K',
      variant_name: 'Oud Royale Intense (Agarwood) 5K',
      pack_size_kg: 5.0,
      selling_price_per_kg: 4200000.0,
      selling_price_usd_per_kg: 258.46,
      min_stock_kg: 5.0,
    },
    {
      id: 'var-oud-1k',
      product_id: 'prod-003',
      variant_sku: 'FO-OUD-003-1K',
      variant_name: 'Oud Royale Intense (Agarwood) 1K',
      pack_size_kg: 1.0,
      selling_price_per_kg: 4200000.0,
      selling_price_usd_per_kg: 258.46,
      min_stock_kg: 1.0,
    },

    // aman jiwa
    {
      id: 'var-new-5k',
      product_id: 'prod-009',
      variant_sku: 'FO-NEW-009-5K',
      variant_name: 'aman jiwa 5K',
      pack_size_kg: 5.0,
      selling_price_per_kg: 3000000.0,
      selling_price_usd_per_kg: 184.62,
      min_stock_kg: 5.0,
    },
    {
      id: 'var-new-1k',
      product_id: 'prod-009',
      variant_sku: 'FO-NEW-009-1K',
      variant_name: 'aman jiwa 1K',
      pack_size_kg: 1.0,
      selling_price_per_kg: 1150000.0,
      selling_price_usd_per_kg: 70.77,
      min_stock_kg: 1.0,
    },
  ];

  for (const v of produkVarianData) {
    await conn.query(
      `INSERT INTO product_variants
      (id, product_id, variant_sku, variant_name, pack_size_kg, selling_price_per_kg, selling_price_usd_per_kg, min_stock_kg, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        v.id,
        v.product_id,
        v.variant_sku,
        v.variant_name,
        v.pack_size_kg,
        v.selling_price_per_kg,
        v.selling_price_usd_per_kg,
        v.min_stock_kg,
      ]
    );
    console.log(`  ✓ Produk Varian created: ${v.variant_name} -> Rp ${v.selling_price_per_kg.toLocaleString()} / Kg`);
  }

  // Update stock_batches variant_id FK mapping
  for (const v of produkVarianData) {
    await conn.query(`UPDATE stock_batches SET variant_id = ? WHERE variant_sku = ?`, [v.id, v.variant_sku]);
  }
  console.log('  ✓ Updated stock_batches.variant_id FK mappings.');

  await conn.end();
  console.log('\n🎉 CLEAN SLATE RESET COMPLETE! Database "fragrance_hub" is now 100% normalized with clean Produk Induk and Produk Varian hierarchy!');
}

resetCleanSlateMySQL().catch(console.error);
