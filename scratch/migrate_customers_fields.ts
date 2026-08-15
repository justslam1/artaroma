import { executeQuery } from '../src/lib/db';

async function run() {
  try {
    const columns: any = await executeQuery('SHOW COLUMNS FROM customers');
    const fields = columns.map((c: any) => c.Field);

    if (!fields.includes('office_address')) {
      console.log('Adding office_address column...');
      await executeQuery('ALTER TABLE customers ADD COLUMN office_address TEXT NULL AFTER address');
    }
    if (!fields.includes('shipping_lat')) {
      console.log('Adding shipping_lat column...');
      await executeQuery('ALTER TABLE customers ADD COLUMN shipping_lat VARCHAR(50) NULL AFTER office_address');
    }
    if (!fields.includes('shipping_lng')) {
      console.log('Adding shipping_lng column...');
      await executeQuery('ALTER TABLE customers ADD COLUMN shipping_lng VARCHAR(50) NULL AFTER shipping_lat');
    }

    console.log('Migration completed successfully.');
    const updatedColumns: any = await executeQuery('SHOW COLUMNS FROM customers');
    console.log('Updated columns:', updatedColumns.map((c: any) => c.Field));
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

run();
