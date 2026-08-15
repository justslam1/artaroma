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
    const [pRows] = await pool.query("SELECT * FROM products WHERE sku = 'FO-NEW-005'");
    console.log('Product details:', pRows);

    if (pRows.length > 0) {
      const [vRows] = await pool.query(
        "SELECT * FROM product_variants WHERE product_id = ?",
        [pRows[0].id]
      );
      console.log('Variants details:', vRows);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
