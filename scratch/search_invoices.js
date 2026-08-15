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
    const [rows] = await pool.query("SELECT * FROM invoices");
    console.log('invoices in DB:', rows);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
