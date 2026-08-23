import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { generateNextPONumber } from '@/lib/sequences';
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
            due_date: po.due_date || undefined,
            currency: po.currency || 'IDR',
            exchange_rate: parseFloat(po.exchange_rate) || 1.0,
            foreign_total_amount: po.foreign_total_amount !== null ? parseFloat(po.foreign_total_amount) : undefined,
            order_date: po.order_date,
            total_amount: parseFloat(po.total_amount) || 0,
            paid_amount: po.paid_amount !== null && po.paid_amount !== undefined ? parseFloat(po.paid_amount) : (po.status === 'DIKIRIM' || po.status === 'DITERIMA' ? parseFloat(po.total_amount) : 0),
            payment_status: po.payment_status || (
              parseFloat(po.paid_amount) >= parseFloat(po.total_amount) && parseFloat(po.total_amount) > 0
                ? 'PAID'
                : parseFloat(po.paid_amount) > 0
                ? 'PARTIALLY_PAID'
                : (po.status === 'DIKIRIM' || po.status === 'DITERIMA' ? 'PAID' : 'UNPAID')
            ),
            payment_proof_url: po.payment_proof_url || undefined,
            payment_reference_no: po.payment_reference_no || undefined,
            payment_bank_id: po.payment_bank_id || undefined,
            payment_bank_name: po.payment_bank_name || undefined,
            last_payment_date: po.last_payment_date || undefined,
            payment_history: (() => {
              if (!po.payment_history) return undefined;
              try {
                return typeof po.payment_history === 'string' ? JSON.parse(po.payment_history) : po.payment_history;
              } catch {
                return undefined;
              }
            })(),
            items: items.map((item: any) => ({
              id: item.id,
              po_id: item.po_id,
              product_id: item.product_id,
              variant_sku: item.variant_sku || '',
              product_name: item.product_name || 'Bibit Parfum',
              qty_ordered_kg: parseFloat(item.qty_ordered_kg) || 0,
              qty_shipped_kg: item.qty_shipped_kg !== null ? parseFloat(item.qty_shipped_kg) : undefined,
              foreign_cost_per_kg: item.foreign_cost_per_kg !== null ? parseFloat(item.foreign_cost_per_kg) : undefined,
              foreign_subtotal: item.foreign_subtotal !== null ? parseFloat(item.foreign_subtotal) : undefined,
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
            created_by: po.created_by || undefined,
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
    const {
      distributor_id,
      distributor_name,
      payment_method,
      payment_terms_days,
      currency,
      exchange_rate,
      foreign_total_amount,
      items,
      created_by,
    } = body;

    if (!distributor_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'distributor_id and non-empty items array are required' },
        { status: 400 }
      );
    }

    const poId = `po-${Date.now()}`;
    const poNumber = await generateNextPONumber();
    const orderDate = new Date().toISOString().split('T')[0];
    const poCurrency = currency || 'IDR';
    const poRate = parseFloat(exchange_rate) || 1.0;

    let totalAmount = 0;
    let foreignTotal = 0;
    const processedItems = items.map((item: any, index: number) => {
      const qty = parseFloat(item.qty_ordered_kg) || 0;
      const foreignCost = item.foreign_cost_per_kg !== undefined ? parseFloat(item.foreign_cost_per_kg) : undefined;
      const cost = parseFloat(item.cost_per_kg) || 0;
      const subtotal = parseFloat(item.subtotal) || (qty * cost);
      const foreignSub = foreignCost !== undefined ? (qty * foreignCost) : undefined;
      
      totalAmount += subtotal;
      if (foreignSub !== undefined) foreignTotal += foreignSub;

      return {
        id: `po-item-${Date.now()}-${index}`,
        po_id: poId,
        product_id: item.product_id,
        variant_sku: item.variant_sku || '',
        product_name: item.product_name || '',
        qty_ordered_kg: qty,
        foreign_cost_per_kg: foreignCost,
        foreign_subtotal: foreignSub,
        cost_per_kg: cost,
        subtotal,
      };
    });

    try {
      await executeQuery(
        `INSERT INTO purchase_orders (id, po_number, distributor_id, status, payment_method, payment_terms_days, currency, exchange_rate, foreign_total_amount, order_date, total_amount)
        VALUES (?, ?, ?, 'BUAT_EMAIL', ?, ?, ?, ?, ?, ?, ?)`,
        [
          poId,
          poNumber,
          distributor_id,
          payment_method || 'TUNAI',
          payment_terms_days || 0,
          poCurrency,
          poRate,
          poCurrency !== 'IDR' ? (foreign_total_amount || foreignTotal) : 0,
          orderDate,
          totalAmount
        ]
      );

      for (const item of processedItems) {
        await executeQuery(
          `INSERT INTO po_items (id, po_id, product_id, product_name, variant_sku, qty_ordered_kg, foreign_cost_per_kg, foreign_subtotal, cost_per_kg, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            poId,
            item.product_id,
            item.product_name || '',
            item.variant_sku || '',
            item.qty_ordered_kg,
            item.foreign_cost_per_kg || null,
            item.foreign_subtotal || null,
            item.cost_per_kg,
            item.subtotal
          ]
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
          currency: poCurrency,
          exchange_rate: poRate,
          foreign_total_amount: poCurrency !== 'IDR' ? foreignTotal : undefined,
          order_date: orderDate,
          total_amount: totalAmount,
          items: processedItems,
          created_by: created_by || undefined,
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
      shipments,
      items,
      total_amount,
      paid_amount,
      payment_status,
      payment_proof_url,
      payment_reference_no,
      payment_bank_id,
      payment_bank_name,
      payment_history,
      last_payment_date,
      cancellation_note,
      cancelled_at,
      cancelled_by,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      );
    }

      // Ensure columns exist safely in MySQL
      try {
        await executeQuery(`ALTER TABLE purchase_orders ADD COLUMN paid_amount DECIMAL(15,2) DEFAULT 0`);
      } catch {}
      try {
        await executeQuery(`ALTER TABLE purchase_orders ADD COLUMN payment_status VARCHAR(50) DEFAULT 'UNPAID'`);
      } catch {}
      try {
        await executeQuery(`ALTER TABLE purchase_orders ADD COLUMN payment_proof_url LONGTEXT`);
      } catch {}
      try {
        await executeQuery(`ALTER TABLE purchase_orders ADD COLUMN payment_reference_no VARCHAR(255)`);
      } catch {}
      try {
        await executeQuery(`ALTER TABLE purchase_orders ADD COLUMN payment_bank_id VARCHAR(100)`);
      } catch {}
      try {
        await executeQuery(`ALTER TABLE purchase_orders ADD COLUMN payment_bank_name VARCHAR(255)`);
      } catch {}
      try {
        await executeQuery(`ALTER TABLE purchase_orders ADD COLUMN payment_history JSON`);
      } catch {}
      try {
        await executeQuery(`ALTER TABLE purchase_orders ADD COLUMN last_payment_date VARCHAR(50)`);
      } catch {}

      const shipmentsJson = shipments ? JSON.stringify(shipments) : null;
      const historyJson = payment_history ? JSON.stringify(payment_history) : null;

      // Update with payment fields and total_amount if provided
      if (paid_amount !== undefined || payment_status !== undefined || payment_history !== undefined) {
        await executeQuery(
          `UPDATE purchase_orders 
           SET status = COALESCE(?, status), 
               total_amount = COALESCE(?, total_amount),
               payment_method = COALESCE(?, payment_method), 
               payment_terms_days = COALESCE(?, payment_terms_days), 
               shipments = COALESCE(?, shipments), 
               paid_amount = ?, 
               payment_status = ?, 
               payment_proof_url = COALESCE(?, payment_proof_url), 
               payment_reference_no = COALESCE(?, payment_reference_no), 
               payment_bank_id = COALESCE(?, payment_bank_id), 
               payment_bank_name = COALESCE(?, payment_bank_name), 
               payment_history = ?, 
               last_payment_date = COALESCE(?, last_payment_date),
               cancellation_note = COALESCE(?, cancellation_note), 
               cancelled_at = COALESCE(?, cancelled_at), 
               cancelled_by = COALESCE(?, cancelled_by)
           WHERE id = ?`,
          [
            status || null,
            total_amount !== undefined ? total_amount : null,
            payment_method || null,
            payment_terms_days !== undefined ? payment_terms_days : null,
            shipmentsJson,
            paid_amount !== undefined ? paid_amount : 0,
            payment_status || 'UNPAID',
            payment_proof_url || null,
            payment_reference_no || null,
            payment_bank_id || null,
            payment_bank_name || null,
            historyJson,
            last_payment_date || null,
            cancellation_note || null,
            cancelled_at || null,
            cancelled_by || null,
            id,
          ]
        );
      } else {
        await executeQuery(
          `UPDATE purchase_orders 
           SET status = ?, total_amount = COALESCE(?, total_amount), payment_method = ?, payment_terms_days = ?, shipments = ?, 
               cancellation_note = ?, cancelled_at = ?, cancelled_by = ?
           WHERE id = ?`,
          [
            status || 'BUAT_EMAIL',
            total_amount !== undefined ? total_amount : null,
            payment_method || 'TUNAI',
            payment_terms_days || 0,
            shipmentsJson,
            cancellation_note || null,
            cancelled_at || null,
            cancelled_by || null,
            id,
          ]
        );
      }

      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.qty_shipped_kg !== undefined || item.qty_ordered_kg !== undefined) {
            await executeQuery(
              `UPDATE po_items 
               SET qty_shipped_kg = COALESCE(?, qty_shipped_kg),
                   qty_ordered_kg = COALESCE(?, qty_ordered_kg),
                   subtotal = COALESCE(?, subtotal)
               WHERE po_id = ? AND product_id = ?`,
              [
                item.qty_shipped_kg !== undefined ? item.qty_shipped_kg : null,
                item.qty_ordered_kg !== undefined ? item.qty_ordered_kg : null,
                item.subtotal !== undefined ? item.subtotal : null,
                id,
                item.product_id,
              ]
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
}
