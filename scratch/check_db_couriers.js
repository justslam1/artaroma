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
    const [cols] = await pool.execute('DESCRIBE couriers');
    console.log('couriers schema:');
    console.log(cols);
    
    const [rows] = await pool.execute('SELECT * FROM couriers');
    console.log('couriers rows:');
    console.log(rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
