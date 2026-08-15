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
    console.log('⚡ Deactivating Tenang Saja (FO-NEW-006) and its variants in MySQL database...');

    // 1. Deactivate product FO-NEW-006
    await pool.query("UPDATE products SET is_active = FALSE WHERE sku = 'FO-NEW-006'");
    console.log('✓ Product FO-NEW-006 set to is_active = FALSE.');

    // 2. Deactivate variants starting with FO-NEW-006
    await pool.query("UPDATE product_variants SET is_active = FALSE WHERE variant_sku LIKE 'FO-NEW-006-%'");
    console.log('✓ Variants of FO-NEW-006 set to is_active = FALSE.');

    console.log('✨ Database cleanup of deleted products/variants completed successfully!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await pool.end();
  }
}

run();
