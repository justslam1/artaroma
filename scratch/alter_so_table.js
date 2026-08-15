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
    // Check if columns already exist
    const [columns] = await pool.execute("DESCRIBE sales_orders");
    const fieldNames = columns.map(c => c.Field);

    if (!fieldNames.includes('surat_jalan_number')) {
      await pool.execute("ALTER TABLE sales_orders ADD COLUMN surat_jalan_number VARCHAR(100) NULL");
      console.log('Added column surat_jalan_number to sales_orders table');
    }

    if (!fieldNames.includes('courier_name')) {
      await pool.execute("ALTER TABLE sales_orders ADD COLUMN courier_name VARCHAR(100) NULL");
      console.log('Added column courier_name to sales_orders table');
    }

    console.log('Schema update complete!');
  } catch (error) {
    console.error('Failed to alter sales_orders table:', error);
  } finally {
    await pool.end();
  }
}

main();
