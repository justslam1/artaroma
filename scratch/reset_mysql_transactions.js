const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'fragrance_hub',
  });

  const tablesToClear = [
    'sales_orders',
    'so_items',
    'so_item_batches',
    'invoices',
    'payments',
    'deliveries',
    'purchase_orders',
    'po_items',
    'stock_opname_history',
    'stock_repackage_logs',
    'product_variant_price_logs'
  ];

  try {
    console.log('⚡ Starting transactional data reset...');
    
    // 1. Disable Foreign Key Checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // 2. Truncate transactional tables
    for (const table of tablesToClear) {
      await pool.query(`TRUNCATE TABLE ${table}`);
      console.log(`✓ Table ${table} truncated.`);
    }

    // 3. Reset Stock Batches quantities to their initial values
    console.log('🌱 Restoring stock batches current quantities to initial levels...');
    await pool.query('UPDATE stock_batches SET current_qty_kg = initial_qty_kg');
    console.log('✓ Stock batches current quantities successfully restored.');

    // 4. Re-enable Foreign Key Checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Foreign key checks re-enabled.');
    
    console.log('✨ MySQL database transactions cleared and stock levels reset successfully!');
  } catch (error) {
    console.error('❌ Reset failed:', error);
  } finally {
    await pool.end();
  }
}

run();
