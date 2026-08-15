const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fragrance_hub',
});

async function main() {
  try {
    const [rows] = await pool.execute("SELECT * FROM products LIMIT 5");
    console.log('Sample products:');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await pool.end();
  }
}

main();
