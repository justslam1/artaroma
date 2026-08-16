const mysql = require('mysql2/promise');
async function check() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fragrance_hub'
  });
  const [batches] = await conn.query("SELECT id, product_id, variant_sku, batch_number, current_qty_kg, initial_qty_kg, is_expired FROM stock_batches WHERE product_id = 'prod-1786028042281'");
  console.log('Batches for prod-1786028042281:', batches);

  const [products] = await conn.query("SELECT id, name, sku FROM products WHERE id = 'prod-1786028042281'");
  console.log('Product:', products);

  const [orders] = await conn.query("SELECT id, so_number, status, grand_total FROM sales_orders");
  console.log('Sales orders:', orders);

  const [items] = await conn.query("SELECT * FROM so_items");
  console.log('SO items:', items);

  await conn.end();
  process.exit(0);
}
check().catch(console.error);
