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
    const [orders] = await pool.query("SELECT * FROM sales_orders");
    console.log('sales_orders in DB:', orders);

    const [items] = await pool.query("SELECT * FROM so_items");
    console.log('so_items in DB:', items);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
