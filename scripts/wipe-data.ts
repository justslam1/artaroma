import dotenv from 'dotenv';
dotenv.config();

import { executeTransaction } from '../src/lib/db';

async function wipeDatabaseForRestoreTest() {
  console.log('🧹 [WIPE] Starting database cleanup for restore testing...');

  const tablesToClear = [
    'so_items',
    'po_items',
    'sales_orders',
    'purchase_orders',
    'invoices',
    'stock_disposals',
    'stock_opname_history',
    'transactions_history',
    'product_variant_price_logs',
    'product_variants',
    'products',
    'customers',
    'distributors',
    'couriers',
  ];

  await executeTransaction(async (conn) => {
    const [existingTables]: any = await conn.query('SHOW TABLES');
    const tableSet = new Set(existingTables.map((t: any) => Object.values(t)[0]));

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tablesToClear) {
      if (tableSet.has(table)) {
        try {
          await conn.query(`TRUNCATE TABLE \`${table}\``);
          console.log(`✓ Tabel '${table}' dikosongkan`);
        } catch {
          await conn.query(`DELETE FROM \`${table}\``);
          console.log(`✓ Tabel '${table}' dibersihkan via DELETE`);
        }
      }
    }

    if (tableSet.has('stock_batches')) {
      try {
        await conn.query(`TRUNCATE TABLE \`stock_batches\``);
        console.log(`✓ Tabel 'stock_batches' dikosongkan`);
      } catch {
        await conn.query(`DELETE FROM \`stock_batches\``);
      }
    }

    // Keep only super admin user so login session remains intact
    if (tableSet.has('users')) {
      try {
        await conn.query(`DELETE FROM users WHERE email != 'admin@artaroma.co.id'`);
        console.log(`✓ Tabel 'users' dibersihkan (Akun Super Admin admin@artaroma.co.id tetap dipertahankan)`);
      } catch (err: any) {
        console.warn('Users delete warning:', err.message);
      }
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  console.log('\n🎉 [SUCCESS] Database localhost berhasil dikosongkan!');
  console.log('Sekarang Anda dapat membuka menu Master Data -> Backup & Restore -> Tab 2 untuk menguji coba Restore File Backup .JSON.');
}

wipeDatabaseForRestoreTest().catch((e) => {
  console.error('Fatal error during wipe:', e);
  process.exit(1);
});
