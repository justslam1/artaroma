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
    console.log('⚡ Reactivating Aman Jaya 1K (var-fonew005-1) in MySQL database...');

    // Reactivate variant
    const [result] = await pool.query(
      "UPDATE product_variants SET is_active = TRUE WHERE id = 'var-fonew005-1'"
    );
    console.log('✓ Update result:', result);

    console.log('✨ Reactivation completed successfully!');
  } catch (error) {
    console.error('❌ Reactivation failed:', error);
  } finally {
    await pool.end();
  }
}

run();
