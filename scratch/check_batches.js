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
    const [rows] = await pool.execute('SELECT id, product_id, batch_number, pack_size_kg, current_qty_kg FROM stock_batches');
    console.log('Stock batches in MySQL:');
    console.log(rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
