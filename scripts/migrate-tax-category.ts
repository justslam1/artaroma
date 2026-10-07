import { executeQuery } from '../src/lib/db';

async function migrate() {
  console.log('Migrating database for PKP / Non-PKP support...');

  // 1. Add tax_category & nppkp to customers
  try {
    const custCols: any = await executeQuery("SHOW COLUMNS FROM customers LIKE 'tax_category'");
    if (!custCols || custCols.length === 0) {
      await executeQuery("ALTER TABLE customers ADD COLUMN tax_category ENUM('PKP', 'NON_PKP') NOT NULL DEFAULT 'PKP'");
      console.log('✅ Added tax_category to customers');
    } else {
      console.log('ℹ️ tax_category already exists in customers');
    }
  } catch (err: any) {
    console.warn('Error checking/adding tax_category in customers:', err.message);
  }

  try {
    const nppkpCols: any = await executeQuery("SHOW COLUMNS FROM customers LIKE 'nppkp'");
    if (!nppkpCols || nppkpCols.length === 0) {
      await executeQuery("ALTER TABLE customers ADD COLUMN nppkp VARCHAR(50) NULL");
      console.log('✅ Added nppkp to customers');
    } else {
      console.log('ℹ️ nppkp already exists in customers');
    }
  } catch (err: any) {
    console.warn('Error checking/adding nppkp in customers:', err.message);
  }

  // Set existing customers without tax_category to 'PKP'
  try {
    await executeQuery("UPDATE customers SET tax_category = 'PKP' WHERE tax_category IS NULL");
    console.log('✅ Set existing customers to default PKP');
  } catch (err: any) {
    console.warn('Error updating existing customers:', err.message);
  }

  // 2. Add customer_tax_category, is_tax_inclusive, dpp_amount, ppn_amount to invoices
  const invoiceColumns = [
    { name: 'customer_tax_category', sql: "ALTER TABLE invoices ADD COLUMN customer_tax_category ENUM('PKP', 'NON_PKP') NOT NULL DEFAULT 'PKP'" },
    { name: 'is_tax_inclusive', sql: "ALTER TABLE invoices ADD COLUMN is_tax_inclusive TINYINT(1) NOT NULL DEFAULT 0" },
    { name: 'dpp_amount', sql: "ALTER TABLE invoices ADD COLUMN dpp_amount DECIMAL(15,2) NULL" },
    { name: 'ppn_amount', sql: "ALTER TABLE invoices ADD COLUMN ppn_amount DECIMAL(15,2) NULL" },
  ];

  for (const col of invoiceColumns) {
    try {
      const exists: any = await executeQuery(`SHOW COLUMNS FROM invoices LIKE '${col.name}'`);
      if (!exists || exists.length === 0) {
        await executeQuery(col.sql);
        console.log(`✅ Added ${col.name} to invoices`);
      } else {
        console.log(`ℹ️ ${col.name} already exists in invoices`);
      }
    } catch (err: any) {
      console.warn(`Error checking/adding ${col.name} in invoices:`, err.message);
    }
  }

  // 3. Add customer_tax_category to sales_orders
  try {
    const soCols: any = await executeQuery("SHOW COLUMNS FROM sales_orders LIKE 'customer_tax_category'");
    if (!soCols || soCols.length === 0) {
      await executeQuery("ALTER TABLE sales_orders ADD COLUMN customer_tax_category ENUM('PKP', 'NON_PKP') NOT NULL DEFAULT 'PKP'");
      console.log('✅ Added customer_tax_category to sales_orders');
    } else {
      console.log('ℹ️ customer_tax_category already exists in sales_orders');
    }
  } catch (err: any) {
    console.warn('Error checking/adding customer_tax_category in sales_orders:', err.message);
  }

  console.log('🎉 Migration completed successfully!');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
