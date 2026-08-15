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
    const [rows] = await pool.execute('SELECT * FROM users');
    console.log('users rows:');
    console.log(rows);
    
    const [settings] = await pool.execute('SELECT * FROM company_settings');
    console.log('company_settings rows:');
    console.log(settings);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
