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
    console.log('⚡ Resetting Aman Jaya 1K (var-fonew005-1) price to 0...');

    // 1. Update product_variants
    await pool.query(
      `UPDATE product_variants 
       SET selling_price_per_kg = 0, selling_price_usd_per_kg = 0 
       WHERE id = 'var-fonew005-1'`
    );

    // 2. Get current variant_prices JSON of Aman Jaya (prod-1786028042281)
    const [rows] = await pool.query(
      "SELECT variant_prices FROM products WHERE id = 'prod-1786028042281'"
    );
    if (rows.length > 0) {
      let prices = {};
      try {
        prices = typeof rows[0].variant_prices === 'string' ? JSON.parse(rows[0].variant_prices) : rows[0].variant_prices;
      } catch (e) {}

      // Set "1" key price to 0
      prices["1"] = 0;

      await pool.query(
        "UPDATE products SET variant_prices = ? WHERE id = 'prod-1786028042281'",
        [JSON.stringify(prices)]
      );
    }

    console.log('✨ Price reset completed successfully!');
  } catch (error) {
    console.error('❌ Reset failed:', error);
  } finally {
    await pool.end();
  }
}

run();
