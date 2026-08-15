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
    const [tables] = await pool.query("SHOW TABLES");
    console.log('Tables in fragrance_hub:', tables);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
