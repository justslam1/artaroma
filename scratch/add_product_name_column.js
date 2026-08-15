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
    console.log('Altering so_items table to add product_name column if missing...');
    
    // Check if column exists
    const [cols] = await pool.execute('DESCRIBE so_items');
    const hasCol = cols.some(c => c.Field === 'product_name');
    
    if (!hasCol) {
      await pool.execute('ALTER TABLE so_items ADD COLUMN product_name VARCHAR(255) NULL');
      console.log('Column product_name added successfully.');
    } else {
      console.log('Column product_name already exists.');
    }

    // Populate product_name for existing items
    console.log('Populating product_name from products table...');
    const [items] = await pool.execute('SELECT * FROM so_items');
    const [products] = await pool.execute('SELECT id, name, sku FROM products');
    
    for (const item of items) {
      const prod = products.find(p => p.id === item.product_id);
      if (prod) {
        // Guess pack size: if qty is 25, 5, or 1, or default to 25
        let packSize = 25;
        const qty = parseFloat(item.qty_kg);
        if (qty === 25 || qty === 50 || qty === 75) packSize = 25;
        else if (qty === 5 || qty === 10 || qty === 15) packSize = 5;
        else if (qty === 1 || qty === 2 || qty === 3) packSize = 1;
        
        const finalName = `${prod.name} ${packSize}K`;
        await pool.execute('UPDATE so_items SET product_name = ? WHERE id = ?', [finalName, item.id]);
        console.log(`Updated item ${item.id} -> ${finalName}`);
      }
    }
    
    console.log('Migration finished successfully!');
  } catch (e) {
    console.error('Error during migration:', e);
  } finally {
    await pool.end();
  }
}

run();
