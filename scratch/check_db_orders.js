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
    const [orders] = await pool.execute('SELECT * FROM sales_orders ORDER BY order_date DESC LIMIT 5');
    console.log('Last 5 sales orders in MySQL:');
    for (const order of orders) {
      console.log(`SO ID: ${order.id}, SO Number: ${order.so_number}, status: ${order.status}`);
      const [items] = await pool.execute('SELECT * FROM so_items WHERE so_id = ?', [order.id]);
      console.log('Items:');
      items.forEach(item => {
        console.log(`  - ID: ${item.id}, product_id: ${item.product_id}, product_name: ${item.product_name}, qty_kg: ${item.qty_kg}`);
      });
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
