import { executeQuery } from '../src/lib/db';

async function run() {
  try {
    const columns: any = await executeQuery('SHOW COLUMNS FROM customers');
    console.log('Customers Table Columns:', columns.map((c: any) => c.Field));
  } catch (err) {
    console.error('Error listing columns:', err);
  }
}

run();
