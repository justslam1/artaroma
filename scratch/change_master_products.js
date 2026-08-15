const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'fragrance_hub',
  });

  const products = [
    {
      id: 'prod-001',
      sku: 'FO-ACA-001',
      name: 'ACASIA',
      applications: JSON.stringify(['Fine Fragrance', 'Industry']),
      application: 'Fine Fragrance',
      fragrance_family: 'Floral',
      pack_sizes: JSON.stringify([25, 5, 1]),
      top_notes: 'Acasia Petals, Sweet Jasmine',
      middle_notes: 'White Honey, Heliotrope',
      base_notes: 'Powdery Accord, White Musk',
      density: 1.010,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500&auto=format&fit=crop&q=60',
      variant_prices: JSON.stringify({ 25: 1450000, 5: 1550000, 1: 1600000 }),
      selling_price_usd_per_kg: 90.0
    },
    {
      id: 'prod-002',
      sku: 'FO-BOU-002',
      name: 'BOUGENVILLE',
      applications: JSON.stringify(['Fine Fragrance']),
      application: 'Fine Fragrance',
      fragrance_family: 'Floral',
      pack_sizes: JSON.stringify([25, 5, 1]),
      top_notes: 'Green Leaf, Pink Blossom',
      middle_notes: 'Bougenville Petals, Soft Rose',
      base_notes: 'White Cedar, Patchouli',
      density: 0.990,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=500&auto=format&fit=crop&q=60',
      variant_prices: JSON.stringify({ 25: 1350000, 5: 1450000, 1: 1500000 }),
      selling_price_usd_per_kg: 84.0
    },
    {
      id: 'prod-003',
      sku: 'FO-AQU-003',
      name: 'AQUA FRESH',
      applications: JSON.stringify(['Fine Fragrance', 'Industry']),
      application: 'Fine Fragrance',
      fragrance_family: 'Fresh',
      pack_sizes: JSON.stringify([25, 5, 1]),
      top_notes: 'Sea Salt, Bergamot, Lemon Zest',
      middle_notes: 'Marine Accord, Neroli, Rosemary',
      base_notes: 'Ambergris, Musk, Driftwood',
      density: 0.980,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=500&auto=format&fit=crop&q=60',
      variant_prices: JSON.stringify({ 25: 1650000, 5: 1750000, 1: 1800000 }),
      selling_price_usd_per_kg: 102.5
    },
    {
      id: 'prod-004',
      sku: 'FO-CIT-004',
      name: 'CITRONELLA OIL',
      applications: JSON.stringify(['Industry']),
      application: 'Industry',
      fragrance_family: 'Citrus',
      pack_sizes: JSON.stringify([25, 5, 1]),
      top_notes: 'Pure Citronella, Lime Zest',
      middle_notes: 'Lemongrass, Eucalyptus',
      base_notes: 'Herbal Thyme, White Musk',
      density: 0.890,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=500&auto=format&fit=crop&q=60',
      variant_prices: JSON.stringify({ 25: 950000, 5: 1050000, 1: 1100000 }),
      selling_price_usd_per_kg: 59.0
    }
  ];

  const batches = [
    ['batch-001a', 'LOT-2025-ACA-5K-A1', 'prod-001', null, '2024-09-01', '2025-09-01', 25.0, 25.0, 1000000.0, 0],
    ['batch-001b', 'LOT-2026-ACA-25K-B2', 'prod-001', null, '2025-03-01', '2026-03-01', 50.0, 50.0, 980000.0, 0],
    ['batch-002a', 'LOT-2025-BOU-25K-A1', 'prod-002', null, '2024-10-01', '2025-10-01', 100.0, 100.0, 900000.0, 0],
    ['batch-003a', 'LOT-2025-AQU-5K-A1', 'prod-003', null, '2024-11-01', '2025-11-01', 50.0, 50.0, 1150000.0, 0],
    ['batch-003b', 'LOT-2026-AQU-25K-B2', 'prod-003', null, '2025-02-01', '2026-02-01', 100.0, 100.0, 1100000.0, 0],
    ['batch-004a', 'LOT-2025-CIT-25K-A1', 'prod-004', null, '2024-08-01', '2025-08-01', 100.0, 100.0, 650000.0, 0]
  ];

  try {
    console.log('⚡ Updating master products & stock batches in MySQL...');
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    
    await pool.query('TRUNCATE TABLE products');
    await pool.query('TRUNCATE TABLE stock_batches');
    console.log('✓ Tables truncated.');

    for (const p of products) {
      await pool.query(
        `INSERT INTO products 
         (id, sku, name, applications, application, fragrance_family, pack_sizes, top_notes, middle_notes, base_notes, density, is_active, image_url, variant_prices, selling_price_usd_per_kg)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.sku, p.name, p.applications, p.application, p.fragrance_family, p.pack_sizes, p.top_notes, p.middle_notes, p.base_notes, p.density, p.is_active, p.image_url, p.variant_prices, p.selling_price_usd_per_kg]
      );
      console.log(`Inserted product: ${p.name}`);
    }

    for (const b of batches) {
      await pool.query(
        `INSERT INTO stock_batches 
         (id, batch_number, product_id, po_item_id, production_date, expiry_date, initial_qty_kg, current_qty_kg, unit_cost_per_kg, is_expired)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        b
      );
    }
    console.log('✓ Stock batches inserted.');

    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✨ MySQL database successfully updated with new master products!');
  } catch (e) {
    console.error('❌ Update failed:', e);
  } finally {
    await pool.end();
  }
}

run();
