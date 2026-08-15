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
    console.log('⚡ Clearing prices for newly added test products (Tenang Saja & Aman Jaya)...');

    // 1. Update products table
    await pool.query(
      `UPDATE products 
       SET variant_prices = ?, selling_price_usd_per_kg = 0 
       WHERE sku IN (?, ?)`,
      [JSON.stringify({ "25": 0, "5": 0, "1": 0 }), 'FO-NEW-005', 'FO-NEW-006']
    );
    console.log('✓ products table prices updated to 0.');

    // 2. Update product_variants table
    await pool.query(
      `UPDATE product_variants 
       SET selling_price_per_kg = 0, selling_price_usd_per_kg = 0 
       WHERE variant_sku LIKE ? OR variant_sku LIKE ?`,
      ['FO-NEW-005-%', 'FO-NEW-006-%']
    );
    console.log('✓ product_variants table prices updated to 0.');

    console.log('✨ Cleanup of new product prices completed successfully!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await pool.end();
  }
}

run();
