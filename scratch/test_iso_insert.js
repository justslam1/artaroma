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
    const soId = `so-${Date.now()}`;
    const soNumber = `SO-2026-ISO-TEST`;
    const customer_id = 'cust-001';
    const courier_id = null;
    const payment_method = 'LUNAS_TRANSFER';
    const totalGoodsAmount = 1450000;
    const grandTotal = 1450000;
    
    // ISO date string
    const orderDate = new Date().toISOString(); 

    await pool.query(
      `INSERT INTO sales_orders 
      (id, so_number, customer_id, courier_id, status, payment_method, total_goods_amount, grand_total, order_date)
      VALUES (?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?, ?)`,
      [
        soId,
        soNumber,
        customer_id,
        courier_id || null,
        payment_method || 'LUNAS_TRANSFER',
        totalGoodsAmount,
        grandTotal,
        orderDate,
      ]
    );

    console.log('ISO date insert successful!');
  } catch (error) {
    console.error('ISO date insert failed:', error);
  } finally {
    await pool.end();
  }
}

run();
