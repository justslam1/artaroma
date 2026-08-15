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
    const [cols] = await pool.execute('DESCRIBE products');
    console.log('products schema:');
    console.log(cols);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
