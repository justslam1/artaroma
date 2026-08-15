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
    const [cols] = await pool.query("DESCRIBE company_settings");
    console.log('company_settings columns:', cols);

    const [rows] = await pool.query("SELECT * FROM company_settings");
    console.log('company_settings data:', rows);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
