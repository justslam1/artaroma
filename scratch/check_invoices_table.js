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
    const [tables] = await pool.query("SHOW TABLES LIKE 'invoices'");
    if (tables.length > 0) {
      console.log('invoices table exists!');
      const [desc] = await pool.query("DESCRIBE invoices");
      console.log(desc);
    } else {
      console.log('invoices table DOES NOT EXIST!');
    }
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
