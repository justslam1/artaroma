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
    console.log('Connecting to database to create stock_opname_history table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS stock_opname_history (
        id VARCHAR(50) PRIMARY KEY,
        batch_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        variant_sku VARCHAR(50) NOT NULL,
        batch_number VARCHAR(50) NOT NULL,
        system_qty_kg DECIMAL(12,4) NOT NULL,
        physical_qty_kg DECIMAL(12,4) NOT NULL,
        difference_qty_kg DECIMAL(12,4) NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100) DEFAULT 'ADMIN GUDANG'
      )
    `);
    console.log('Table stock_opname_history created successfully!');
  } catch (error) {
    console.error('Failed to create table:', error);
  } finally {
    await pool.end();
  }
}

main();
