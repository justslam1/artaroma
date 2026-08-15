const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'fragrance_hub',
  });

  const executeQuery = async (query, params) => {
    const [results] = await pool.query(query, params);
    return results;
  };

  try {
    console.log('⚡ Running simulated GET /api/sales-orders query...');

    const orders = await executeQuery(
      `SELECT so.*, c.company_name as customer_company, c.pic_name as customer_name 
       FROM sales_orders so 
       LEFT JOIN customers c ON so.customer_id = c.id 
       ORDER BY so.order_date DESC`
    );

    console.log('Orders found:', orders.length);
    console.log('Orders data:', orders);

    for (let i = 0; i < orders.length; i++) {
      const items = await executeQuery(
        'SELECT * FROM so_items WHERE so_id = ?',
        [orders[i].id]
      );
      console.log(`Order ${orders[i].so_number} items:`, items.length);
    }
  } catch (error) {
    console.error('Simulated GET failed:', error);
  } finally {
    await pool.end();
  }
}

run();
