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
    console.log('⚡ Simulating POST /api/sales-orders handler...');

    const body = {
      customer_id: 'cust-001',
      payment_method: 'LUNAS_TRANSFER',
      items: [
        {
          product_id: 'prod-001',
          product_name: 'Vanilla Bourbon Super Pure 25K',
          qty_kg: 25,
          unit_price_per_kg: 1450000
        }
      ]
    };

    const { customer_id, items, payment_method, courier_id } = body;

    // 1. Fetch Customer
    let customer = null;
    let currentPiutang = 0;
    let hasOverdue = false;

    const custRows = await executeQuery(
      'SELECT * FROM customers WHERE id = ? LIMIT 1',
      [customer_id]
    );
    if (custRows && custRows.length > 0) {
      customer = custRows[0];
      const invRows = await executeQuery(
        "SELECT * FROM invoices WHERE customer_id = ? AND status IN ('UNPAID', 'OVERDUE')",
        [customer_id]
      );
      for (const inv of invRows) {
        currentPiutang += parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0);
        if (inv.status === 'OVERDUE') {
          hasOverdue = true;
        }
      }
    }

    if (!customer) {
      customer = {
        id: customer_id,
        company_name: 'Customer B2B',
        credit_limit: 50000000,
        credit_terms_days: 30,
      };
    }

    let totalGoodsAmount = 0;
    const processedItems = items.map((item, idx) => {
      const qty = parseFloat(item.qty_kg) || 0;
      const unitPrice = parseFloat(item.unit_price_per_kg) || 0;
      const subtotal = qty * unitPrice;
      totalGoodsAmount += subtotal;

      return {
        id: `so-item-${Date.now()}-${idx}`,
        product_id: item.product_id,
        product_name: item.product_name,
        qty_kg: qty,
        unit_price_per_kg: unitPrice,
        subtotal,
      };
    });

    const grandTotal = totalGoodsAmount;

    const soId = `so-${Date.now()}`;
    const soNumber = `SO-2026-${String(Math.floor(100 + Math.random() * 900))}`;
    const orderDate = new Date().toISOString();

    console.log('Inserting sales order...');
    await executeQuery(
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

    for (const item of processedItems) {
      console.log('Inserting so_item:', item.product_name);
      await executeQuery(
        `INSERT INTO so_items (id, so_id, product_id, product_name, qty_kg, unit_price_per_kg, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          soId,
          item.product_id,
          item.product_name || 'Varian Produk',
          item.qty_kg,
          item.unit_price_per_kg,
          item.subtotal,
        ]
      );
    }

    console.log('✓ API simulation completed successfully!');
  } catch (error) {
    console.error('❌ API simulation failed with error:', error);
  } finally {
    await pool.end();
  }
}

run();
