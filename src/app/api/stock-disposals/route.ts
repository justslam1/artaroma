import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyApiAuth } from '@/lib/auth';

async function initStockDisposalsTable() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS stock_disposals (
        id VARCHAR(100) PRIMARY KEY,
        batch_id VARCHAR(100) NOT NULL,
        batch_number VARCHAR(100),
        product_id VARCHAR(100),
        product_name VARCHAR(255),
        qty_kg DECIMAL(10, 2) NOT NULL,
        reason_id VARCHAR(100),
        reason_name VARCHAR(255) NOT NULL,
        notes TEXT,
        disposed_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.warn('Init stock_disposals table warning:', err);
  }
}

export async function GET() {
  try {
    await initStockDisposalsTable();
    const rows = await executeQuery<any[]>(
      'SELECT * FROM stock_disposals ORDER BY created_at DESC'
    );
    return NextResponse.json({ success: true, data: rows || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Lihat Stok (Gudang)']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const {
      batch_id,
      batch_number,
      product_id,
      product_name,
      qty_kg,
      reason_id,
      reason_name,
      notes,
      disposed_by,
      disposed_at,
    } = body;

    const qty = Number(qty_kg);
    if (!batch_id || isNaN(qty) || qty <= 0 || !reason_name) {
      return NextResponse.json(
        { success: false, message: 'Batch ID, jumlah pembuangan (kg) valid, dan alasan pembuangan wajib diisi.' },
        { status: 400 }
      );
    }

    await initStockDisposalsTable();

    // 1. Check and deduct from stock_batches in DB if available
    let updatedCurrentQty = 0;
    try {
      const batchRows = await executeQuery<any[]>(
        'SELECT * FROM stock_batches WHERE id = ? LIMIT 1',
        [batch_id]
      );

      if (batchRows && batchRows.length > 0) {
        const batch = batchRows[0];
        const currentQty = Number(batch.current_qty_kg || 0);
        if (qty > currentQty) {
          return NextResponse.json(
            {
              success: false,
              message: `Jumlah pembuangan (${qty} kg) melebihi stok yang tersedia (${currentQty} kg) pada batch ini.`,
            },
            { status: 400 }
          );
        }

        updatedCurrentQty = Math.max(0, currentQty - qty);
        await executeQuery(
          'UPDATE stock_batches SET current_qty_kg = ? WHERE id = ?',
          [updatedCurrentQty, batch_id]
        );
      }
    } catch (batchErr) {
      console.warn('DB deduct stock_batch warning:', batchErr);
    }

    const disposalId = `disp-${Date.now()}`;
    const newDisposal = {
      id: disposalId,
      batch_id,
      batch_number: batch_number || '—',
      product_id: product_id || '—',
      product_name: product_name || 'Bibit Parfum',
      qty_kg: qty,
      reason_id: reason_id || null,
      reason_name: reason_name.trim(),
      notes: notes?.trim() || '',
      disposed_by: disposed_by || 'Staf Gudang FEFO',
      created_at: disposed_at || new Date().toISOString(),
    };

    try {
      await executeQuery(
        `INSERT INTO stock_disposals 
         (id, batch_id, batch_number, product_id, product_name, qty_kg, reason_id, reason_name, notes, disposed_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newDisposal.id,
          newDisposal.batch_id,
          newDisposal.batch_number,
          newDisposal.product_id,
          newDisposal.product_name,
          newDisposal.qty_kg,
          newDisposal.reason_id,
          newDisposal.reason_name,
          newDisposal.notes,
          newDisposal.disposed_by,
          newDisposal.created_at,
        ]
      );
    } catch (insertErr) {
      console.warn('DB insert stock_disposals warning:', insertErr);
    }

    return NextResponse.json({
      success: true,
      message: `Pembuangan ${qty} kg untuk batch ${newDisposal.batch_number} berhasil dicatat.`,
      data: newDisposal,
      updated_current_qty: updatedCurrentQty,
    });
  } catch (err: any) {
    console.error('Stock disposal API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
