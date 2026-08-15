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
    const [rows] = await pool.execute('SHOW TABLES');
    console.log('Tables in MySQL:');
    console.log(rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
