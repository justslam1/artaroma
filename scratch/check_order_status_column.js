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
    const [desc] = await pool.query("DESCRIBE sales_orders");
    const statusCol = desc.find((col) => col.Field === 'status');
    console.log(statusCol);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
