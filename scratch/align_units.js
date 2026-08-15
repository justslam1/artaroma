const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fragrance_hub',
});

async function main() {
  try {
    console.log('Connecting to database to align units...');
    const [batches] = await pool.execute('SELECT id, pack_size_kg, current_qty_kg, unit_count FROM stock_batches');
    
    console.log(`Found ${batches.length} batches. Checking alignment...`);
    let count = 0;
    for (const b of batches) {
      const qty = parseFloat(b.current_qty_kg || 0);
      const packSize = parseInt(b.pack_size_kg || 1) || 1;
      const expectedUnit = qty > 0 ? Math.max(1, Math.ceil(qty / packSize)) : 0;
      
      if (parseInt(b.unit_count) !== expectedUnit) {
        console.log(`Batch ${b.id}: Qty ${qty}kg / Pack ${packSize}kg -> Unit Count is ${b.unit_count}, updating to expected ${expectedUnit}`);
        await pool.execute('UPDATE stock_batches SET unit_count = ? WHERE id = ?', [expectedUnit, b.id]);
        count++;
      }
    }
    console.log(`Completed alignment: ${count} batches updated.`);
  } catch (error) {
    console.error('Alignment failed:', error);
  } finally {
    await pool.end();
  }
}

main();
