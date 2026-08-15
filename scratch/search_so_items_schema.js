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
    const [cols] = await pool.query("DESCRIBE so_items");
    console.log('so_items columns:', cols);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
