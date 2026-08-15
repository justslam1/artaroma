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
    const [columns] = await pool.execute("DESCRIBE sales_orders");
    console.log('sales_orders columns:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });
  } catch (error) {
    console.error('Describe failed:', error);
  } finally {
    await pool.end();
  }
}

main();
