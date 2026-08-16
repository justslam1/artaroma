import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeTransaction } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: soId } = await params;
  try {
    const orders: any[] = await executeQuery(
      `SELECT so.*, c.company_name as customer_company, c.pic_name as customer_name 
       FROM sales_orders so 
       LEFT JOIN customers c ON so.customer_id = c.id 
       WHERE so.id = ? OR so.so_number = ? LIMIT 1`,
      [soId, soId]
    );

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: false, message: 'Sales Order not found' }, { status: 404 });
    }

    const order = orders[0];
    const items = await executeQuery(
      'SELECT * FROM so_items WHERE so_id = ?',
      [order.id]
    );

    // Fetch assigned batches from MySQL if any exist (populated by server-side FEFO)
    if (items && items.length > 0) {
      for (const item of items) {
        const assigned = await executeQuery(
          `SELECT sib.qty_taken_kg, sb.batch_number, sb.id as batch_id
           FROM so_item_batches sib
           JOIN stock_batches sb ON sib.stock_batch_id = sb.id
           WHERE sib.so_item_id = ?`,
          [item.id]
        );
        if (assigned && assigned.length > 0) {
          item.assigned_batches = assigned.map((a: any) => ({
            batch_id: a.batch_id,
            batch_number: a.batch_number,
            qty_taken_kg: parseFloat(a.qty_taken_kg) || 0,
          }));
        } else {
          item.assigned_batches = [];
        }
      }
    }
    order.items = items || [];

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: soId } = await params;

  if (!soId) {
    return NextResponse.json(
      { success: false, message: 'Sales Order ID is required' },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const {
      status,
      total_goods_amount,
      grand_total,
      shipping_type,
      shipping_cost,
      courier_name,
      surat_jalan_number,
      received_by,
      received_photo,
      received_signature,
      cancellation_reason,
      cancelled_at,
      cancelled_by,
      items
    } = body;

    // First, resolve the actual ID from DB using soId (which may be id or so_number)
    const existingOrders: any[] = await executeQuery(
      'SELECT id, so_number FROM sales_orders WHERE id = ? OR so_number = ? LIMIT 1',
      [soId, soId]
    );

    if (!existingOrders || existingOrders.length === 0) {
      return NextResponse.json(
        { success: false, message: `Sales Order '${soId}' not found in database.` },
        { status: 404 }
      );
    }

    const realId = existingOrders[0].id;

    // Run in database transaction to ensure atomicity
    await executeTransaction(async (connection) => {
      // Check current status before update
      const [currentOrderRows]: any = await connection.query(
        'SELECT status FROM sales_orders WHERE id = ? FOR UPDATE',
        [realId]
      );
      const previousStatus = currentOrderRows?.[0]?.status;

      // 1. If transitioning to 'DIKIRIM', perform physical FEFO deduction from stock_batches
      if (status === 'DIKIRIM' && previousStatus !== 'DIKIRIM') {
        const [allocations]: any = await connection.query(
          `SELECT sib.id, sib.stock_batch_id, sib.qty_taken_kg
           FROM so_item_batches sib
           JOIN so_items si ON sib.so_item_id = si.id
           WHERE si.so_id = ?`,
          [realId]
        );

        if (allocations && allocations.length > 0) {
          for (const alloc of allocations) {
            const qty = parseFloat(alloc.qty_taken_kg) || 0;
            if (qty > 0) {
              await connection.query(
                `UPDATE stock_batches 
                 SET current_qty_kg = GREATEST(0, current_qty_kg - ?) 
                 WHERE id = ?`,
                [qty, alloc.stock_batch_id]
              );
            }
          }
        }
      }

      // 2. If transitioning to 'CANCELLED', restore/refund all deducted batches back to stock_batches
      if (status === 'CANCELLED') {
        const [allocations]: any = await connection.query(
          `SELECT sib.id, sib.stock_batch_id, sib.qty_taken_kg
           FROM so_item_batches sib
           JOIN so_items si ON sib.so_item_id = si.id
           WHERE si.so_id = ?`,
          [realId]
        );

        if (allocations && allocations.length > 0) {
          for (const alloc of allocations) {
            const qty = parseFloat(alloc.qty_taken_kg) || 0;
            if (qty > 0) {
              await connection.query(
                `UPDATE stock_batches 
                 SET current_qty_kg = current_qty_kg + ? 
                 WHERE id = ?`,
                [qty, alloc.stock_batch_id]
              );
            }
          }
          // Remove allocations since order is cancelled
          await connection.query(
            `DELETE sib FROM so_item_batches sib
             JOIN so_items si ON sib.so_item_id = si.id
             WHERE si.so_id = ?`,
            [realId]
          );
        }
      }

      // 3. Update the sales order parent row
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      if (shipping_type !== undefined) {
        updateFields.push('shipping_type = ?');
        updateValues.push(shipping_type);
      }
      if (shipping_cost !== undefined) {
        updateFields.push('shipping_cost = ?');
        updateValues.push(shipping_cost);
      }
      if (total_goods_amount !== undefined) {
        updateFields.push('total_goods_amount = ?');
        updateValues.push(total_goods_amount);
      }
      if (grand_total !== undefined) {
        updateFields.push('grand_total = ?');
        updateValues.push(grand_total);
      }
      if (courier_name !== undefined) {
        updateFields.push('courier_name = ?');
        updateValues.push(courier_name);
      }
      if (surat_jalan_number !== undefined) {
        updateFields.push('surat_jalan_number = ?');
        updateValues.push(surat_jalan_number);
      }
      if (received_by !== undefined) {
        updateFields.push('received_by = ?');
        updateValues.push(received_by);
      }
      if (received_photo !== undefined) {
        updateFields.push('received_photo = ?');
        updateValues.push(received_photo);
      }
      if (received_signature !== undefined) {
        updateFields.push('received_signature = ?');
        updateValues.push(received_signature);
      }
      if (cancellation_reason !== undefined) {
        updateFields.push('cancellation_reason = ?');
        updateValues.push(cancellation_reason);
      }
      if (cancelled_at !== undefined) {
        updateFields.push('cancelled_at = ?');
        updateValues.push(cancelled_at);
      }
      if (cancelled_by !== undefined) {
        updateFields.push('cancelled_by = ?');
        updateValues.push(cancelled_by);
      }

      if (updateFields.length > 0) {
        updateValues.push(realId);
        await connection.query(
          `UPDATE sales_orders SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // 2. Update so_items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items first
        await connection.query('DELETE FROM so_items WHERE so_id = ?', [realId]);

        // Insert new items
        for (const item of items) {
          const itemId = item.id || `so-item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const unitPrice = parseFloat(item.unit_price_per_kg) || 0;
          const qty = parseFloat(item.qty_kg) || 0;
          const subtotal = qty * unitPrice;

          await connection.query(
            `INSERT INTO so_items (id, so_id, product_id, product_name, qty_kg, unit_price_per_kg, subtotal)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              itemId,
              realId,
              item.product_id,
              item.product_name || 'Varian Produk',
              qty,
              unitPrice,
              subtotal,
            ]
          );
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Sales Order '${soId}' updated successfully in database.`,
    });
  } catch (error: any) {
    console.error('Failed to update sales order in MySQL:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
