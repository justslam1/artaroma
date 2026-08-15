import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { initialPurchaseOrders } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  try {
    let pos: any[] = [];
    try {
      const dbPOs = await executeQuery('SELECT * FROM purchase_orders ORDER BY created_at DESC');
      if (dbPOs && dbPOs.length > 0) {
        for (const po of dbPOs) {
          const items = await executeQuery(
            `SELECT pi.* FROM po_items pi WHERE pi.po_id = ?`,
            [po.id]
          );

          const dist = await executeQuery('SELECT name FROM distributors WHERE id = ?', [po.distributor_id]);
          const distributor_name = dist && dist[0] ? dist[0].name : (po.distributor_name || 'Distributor Vendor');

          pos.push({
            id: po.id,
            po_number: po.po_number,
            distributor_id: po.distributor_id,
            distributor_name: distributor_name,
            status: po.status,
            payment_method: po.payment_method || 'TUNAI',
            payment_terms_days: po.payment_terms_days || 0,
            order_date: po.order_date,
            total_amount: parseFloat(po.total_amount) || 0,
            items: items.map((item: any) => ({
              id: item.id,
              po_id: item.po_id,
              product_id: item.product_id,
              variant_sku: item.variant_sku || '',
              product_name: item.product_name || 'Bibit Parfum',
              qty_ordered_kg: parseFloat(item.qty_ordered_kg) || 0,
              qty_shipped_kg: item.qty_shipped_kg !== null ? parseFloat(item.qty_shipped_kg) : undefined,
              cost_per_kg: parseFloat(item.cost_per_kg) || 0,
              subtotal: parseFloat(item.subtotal) || 0,
            })),
            shipments: (() => {
              if (!po.shipments) return undefined;
              try {
                return typeof po.shipments === 'string' ? JSON.parse(po.shipments) : po.shipments;
              } catch {
                return undefined;
              }
            })(),
            cancellation_note: po.cancellation_note || undefined,
            cancelled_at: po.cancelled_at || undefined,
            cancelled_by: po.cancelled_by || undefined,
          });
        }
      } else {
        pos = initialPurchaseOrders;
      }
    } catch (e: any) {
      console.warn('DB GET PO warning:', e.message);
      pos = initialPurchaseOrders;
    }

    return NextResponse.json({
      success: true,
      count: pos.length,
      data: pos,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { distributor_id, distributor_name, payment_method, payment_terms_days, items } = body;

    if (!distributor_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'distributor_id and non-empty items array are required' },
        { status: 400 }
      );
    }

    const poId = `po-${Date.now()}`;
    const poNumber = `PO-2026-${String(Math.floor(100 + Math.random() * 900))}`;
    const orderDate = new Date().toISOString().split('T')[0];

    let totalAmount = 0;
    const processedItems = items.map((item: any, index: number) => {
      const qty = parseFloat(item.qty_ordered_kg) || 0;
      const cost = parseFloat(item.cost_per_kg) || 0;
      const subtotal = qty * cost;
      totalAmount += subtotal;

      return {
        id: `po-item-${Date.now()}-${index}`,
        po_id: poId,
        product_id: item.product_id,
        variant_sku: item.variant_sku || '',
        product_name: item.product_name || '',
        qty_ordered_kg: qty,
        cost_per_kg: cost,
        subtotal,
      };
    });

    try {
      await executeQuery(
        `INSERT INTO purchase_orders (id, po_number, distributor_id, status, payment_method, payment_terms_days, order_date, total_amount)
        VALUES (?, ?, ?, 'BUAT_EMAIL', ?, ?, ?, ?)`,
        [poId, poNumber, distributor_id, payment_method || 'TUNAI', payment_terms_days || 0, orderDate, totalAmount]
      );

      for (const item of processedItems) {
        await executeQuery(
          `INSERT INTO po_items (id, po_id, product_id, product_name, variant_sku, qty_ordered_kg, cost_per_kg, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, poId, item.product_id, item.product_name || '', item.variant_sku || '', item.qty_ordered_kg, item.cost_per_kg, item.subtotal]
        );
      }
    } catch (e: any) {
      console.warn('DB insert PO warning:', e.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Purchase Order created successfully and PDF rendered',
        data: {
          id: poId,
          po_number: poNumber,
          distributor_id,
          distributor_name: distributor_name || 'Distributor Vendor',
          status: 'BUAT_EMAIL',
          payment_method: payment_method || 'TUNAI',
          payment_terms_days: payment_terms_days || 0,
          order_date: orderDate,
          total_amount: totalAmount,
          items: processedItems,
          pdf_url: `/dummy-po-${poNumber}.pdf`,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      id, 
      status, 
      payment_method, 
      payment_terms_days, 
      items, 
      shipments,
      cancellation_note,
      cancelled_at,
      cancelled_by
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'id is required' },
        { status: 400 }
      );
    }

    try {
      const shipmentsJson = shipments ? JSON.stringify(shipments) : null;
      await executeQuery(
        `UPDATE purchase_orders 
         SET status = ?, payment_method = ?, payment_terms_days = ?, shipments = ?, 
             cancellation_note = ?, cancelled_at = ?, cancelled_by = ?
         WHERE id = ?`,
        [
          status || 'BUAT_EMAIL',
          payment_method || 'TUNAI',
          payment_terms_days || 0,
          shipmentsJson,
          cancellation_note || null,
          cancelled_at || null,
          cancelled_by || null,
          id,
        ]
      );

      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.qty_shipped_kg !== undefined) {
            await executeQuery(
              `UPDATE po_items 
               SET qty_shipped_kg = ? 
               WHERE po_id = ? AND product_id = ?`,
              [item.qty_shipped_kg, id, item.product_id]
            );
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Purchase Order updated successfully',
      });
    } catch (e: any) {
      console.warn('DB update PO warning:', e.message);
      return NextResponse.json(
        { success: false, message: e.message || 'Database update failed' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
