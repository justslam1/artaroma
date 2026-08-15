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
    const [columns] = await pool.query("DESCRIBE product_variants");
    console.log(columns);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
