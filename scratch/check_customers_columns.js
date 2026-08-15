const { executeQuery } = require('./src/lib/db');

async function run() {
  try {
    const columns = await executeQuery('SHOW COLUMNS FROM customers');
    console.log('Customers Table Columns:', columns);
  } catch (err) {
    console.error('Error listing columns:', err);
  }
}

run();
