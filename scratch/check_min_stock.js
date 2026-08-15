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
    const [products] = await pool.query("SELECT id, name, sku, min_stock_kg FROM products WHERE is_active = TRUE");
    console.log(products);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
