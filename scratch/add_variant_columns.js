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
    console.log('⚡ Adding variant_names and variant_skus columns to products table...');
    
    // 1. Add variant_names column
    try {
      await pool.query('ALTER TABLE products ADD COLUMN variant_names TEXT NULL AFTER variant_prices');
      console.log('✓ Column variant_names added.');
    } catch (e) {
      console.log('• Column variant_names might already exist:', e.message);
    }

    // 2. Add variant_skus column
    try {
      await pool.query('ALTER TABLE products ADD COLUMN variant_skus TEXT NULL AFTER variant_names');
      console.log('✓ Column variant_skus added.');
    } catch (e) {
      console.log('• Column variant_skus might already exist:', e.message);
    }

    console.log('✨ MySQL database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

run();
