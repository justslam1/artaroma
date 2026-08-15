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
    const [variants] = await pool.query(`
      SELECT pv.variant_sku, pv.variant_name, pv.pack_size_kg, pv.min_stock_kg 
      FROM product_variants pv 
      WHERE pv.is_active = TRUE
    `);
    console.log(variants);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
