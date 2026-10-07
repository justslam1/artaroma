import { executeQuery } from '../src/lib/db';

async function migrate() {
  console.log('Migrating database for Quantity Discount support...');

  const columns = [
    { table: 'sales_orders', name: 'discount_percent', sql: "ALTER TABLE sales_orders ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00" },
    { table: 'sales_orders', name: 'discount_amount', sql: "ALTER TABLE sales_orders ADD COLUMN discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00" },
    { table: 'invoices', name: 'discount_percent', sql: "ALTER TABLE invoices ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00" },
    { table: 'invoices', name: 'discount_amount', sql: "ALTER TABLE invoices ADD COLUMN discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00" },
  ];

  for (const col of columns) {
    try {
      const exists: any = await executeQuery(`SHOW COLUMNS FROM ${col.table} LIKE '${col.name}'`);
      if (!exists || exists.length === 0) {
        await executeQuery(col.sql);
        console.log(`✅ Added ${col.name} to ${col.table}`);
      } else {
        console.log(`ℹ️ ${col.name} already exists in ${col.table}`);
      }
    } catch (err: any) {
      console.warn(`Error checking/adding ${col.name} in ${col.table}:`, err.message);
    }
  }

  console.log('🎉 Quantity discount migration completed successfully!');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
