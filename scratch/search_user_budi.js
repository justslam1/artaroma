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
    console.log('--- USERS ---');
    const [u] = await pool.query("SELECT * FROM users WHERE email LIKE '%budi%' OR name LIKE '%budi%'");
    console.log(u);

    console.log('--- CUSTOMERS ---');
    const [c] = await pool.query("SELECT * FROM customers WHERE email LIKE '%budi%' OR pic_name LIKE '%budi%'");
    console.log(c);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
