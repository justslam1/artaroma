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
    const id = `prod-test-${Date.now()}`;
    const sku = 'FO-TEST-999';
    const name = 'Test Fragrance';
    const fragrance_family = 'Floral';
    const top_notes = 'Lemon';
    const middle_notes = 'Rose';
    const base_notes = 'Musk';
    const parsedDensity = 1.0;
    const parsedMinStock = 5.0;
    const parsedPrice = 1500000;

    await pool.query(
      `INSERT INTO products 
      (id, sku, name, fragrance_family, top_notes, middle_notes, base_notes, density, min_stock_kg, selling_price_per_kg, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        id,
        sku,
        name,
        fragrance_family,
        top_notes,
        middle_notes,
        base_notes,
        parsedDensity,
        parsedMinStock,
        parsedPrice,
      ]
    );
    console.log('✓ Insert successful!');
  } catch (e) {
    console.error('❌ Insert failed:', e);
  } finally {
    await pool.end();
  }
}

run();
