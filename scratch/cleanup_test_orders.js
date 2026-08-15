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
    // Delete test orders inserted by scratch scripts
    const testSoNumbers = ['SO-2026-TEST', 'SO-2026-ISO-TEST', 'SO-2026-883'];
    for (const soNum of testSoNumbers) {
      const [rows] = await pool.query("SELECT id FROM sales_orders WHERE so_number = ?", [soNum]);
      for (const row of rows) {
        await pool.query("DELETE FROM so_item_batches WHERE so_item_id IN (SELECT id FROM so_items WHERE so_id = ?)", [row.id]);
        await pool.query("DELETE FROM so_items WHERE so_id = ?", [row.id]);
        await pool.query("DELETE FROM sales_orders WHERE id = ?", [row.id]);
        console.log(`Deleted test SO: ${soNum}`);
      }
    }
    console.log('Done. Database is clean.');
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
