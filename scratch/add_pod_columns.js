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
    console.log('Altering sales_orders table to add POD columns...');
    
    const [cols] = await pool.execute('DESCRIBE sales_orders');
    const hasBy = cols.some(c => c.Field === 'received_by');
    const hasPhoto = cols.some(c => c.Field === 'received_photo');
    const hasSig = cols.some(c => c.Field === 'received_signature');
    
    if (!hasBy) {
      await pool.execute('ALTER TABLE sales_orders ADD COLUMN received_by VARCHAR(100) NULL');
      console.log('Column received_by added.');
    }
    if (!hasPhoto) {
      await pool.execute('ALTER TABLE sales_orders ADD COLUMN received_photo LONGTEXT NULL');
      console.log('Column received_photo added.');
    }
    if (!hasSig) {
      await pool.execute('ALTER TABLE sales_orders ADD COLUMN received_signature LONGTEXT NULL');
      console.log('Column received_signature added.');
    }
    
    console.log('POD columns migration finished successfully!');
  } catch (e) {
    console.error('Error during migration:', e);
  } finally {
    await pool.end();
  }
}

run();
