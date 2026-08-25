export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { initialBatches } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  try {
    let batches: any[] = [];
    try {
      batches = await executeQuery(
        'SELECT * FROM stock_batches ORDER BY expiry_date ASC'
      );
      if (!batches) {
        batches = [];
      }
    } catch {
      batches = [];
    }

    const normalizedBatches = batches.map((b: any) => {
      const isSample = Boolean(b.is_sample || b.variant_sku?.includes('-SMP') || b.batch_number?.startsWith('SMP-'));
      let packSize = b.pack_size_kg ? parseFloat(b.pack_size_kg) : 0;
      if (!isSample && ![25, 5, 1].includes(packSize)) {
        const sku = (b.variant_sku || '').toUpperCase();
        const num = (b.batch_number || '').toUpperCase();
        if (sku.includes('-25K') || num.includes('25K') || num.includes('-25-')) packSize = 25;
        else if (sku.includes('-5K') || num.includes('5K') || num.includes('-5-')) packSize = 5;
        else if (sku.includes('-1K') || num.includes('1K') || num.includes('-1-')) packSize = 1;
        else {
          const qty = parseFloat(b.current_qty_kg || b.initial_qty_kg || 25);
          if (qty >= 25 && qty % 25 === 0) packSize = 25;
          else if (qty >= 5 && qty % 5 === 0) packSize = 5;
          else if (qty >= 1 && qty % 1 === 0) packSize = 1;
          else packSize = 25;
        }
      } else if (isSample && packSize <= 0) {
        packSize = parseFloat(b.current_qty_kg || b.initial_qty_kg || 0.1);
      }

      let unitCount = (b.unit_count !== undefined && b.unit_count !== null) ? parseInt(b.unit_count) : 0;
      const dbCurrentQty = b.current_qty_kg !== undefined && b.current_qty_kg !== null ? parseFloat(b.current_qty_kg) : null;
      const dbInitialQty = b.initial_qty_kg !== undefined && b.initial_qty_kg !== null ? parseFloat(b.initial_qty_kg) : 0;

      if (unitCount <= 0 && dbCurrentQty !== 0) {
        const rawQty = dbCurrentQty !== null ? dbCurrentQty : (dbInitialQty || packSize);
        unitCount = Math.max(1, Math.round(rawQty / (packSize || 1)));
      }

      const exactQtyKg = dbCurrentQty !== null ? dbCurrentQty : (unitCount * (packSize || 1));
      const exactInitialQtyKg = dbInitialQty || (unitCount * (packSize || 1));

      return {
        ...b,
        pack_size_kg: packSize,
        unit_count: unitCount,
        initial_qty_kg: exactInitialQtyKg,
        current_qty_kg: exactQtyKg,
        is_sample: isSample,
      };
    });

    return NextResponse.json({
      success: true,
      count: normalizedBatches.length,
      data: normalizedBatches,
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
      batch_number,
      product_id,
      variant_sku,
      pack_size_kg,
      unit_count,
      po_item_id,
      production_date,
      expiry_date,
      initial_qty_kg,
      unit_cost_per_kg,
      is_opname,
    } = body;

    if (!batch_number || !product_id || !expiry_date || !initial_qty_kg) {
      return NextResponse.json(
        {
          success: false,
          message: 'batch_number, product_id, expiry_date, and initial_qty_kg are required',
        },
        { status: 400 }
      );
    }

    const id = `batch-${Date.now()}`;
    const qty = parseFloat(initial_qty_kg);
    const unitCost = parseFloat(unit_cost_per_kg || 0);

    try {
      await executeQuery(
        `INSERT INTO stock_batches 
        (id, batch_number, product_id, variant_sku, pack_size_kg, unit_count, po_item_id, production_date, expiry_date, initial_qty_kg, current_qty_kg, unit_cost_per_kg, is_expired)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
        [
          id,
          batch_number,
          product_id,
          variant_sku || null,
          pack_size_kg ? parseInt(pack_size_kg) : 25,
          unit_count ? parseInt(unit_count) : 1,
          po_item_id || null,
          production_date || null,
          expiry_date,
          qty,
          qty,
          unitCost,
        ]
      );

      if (is_opname) {
        const historyId = `opname-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await executeQuery(
          `INSERT INTO stock_opname_history 
          (id, batch_id, product_id, variant_sku, batch_number, system_qty_kg, physical_qty_kg, difference_qty_kg, notes, created_at, created_by)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, NOW(), 'ADMIN GUDANG')`,
          [
            historyId,
            id,
            product_id,
            variant_sku || '',
            batch_number,
            qty,
            qty,
            'Pendaftaran batch baru via Stok Opname'
          ]
        );
      }
    } catch (e: any) {
      console.warn('Database stock batch insert warning:', e.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Stock batch ${batch_number} received successfully into FEFO warehouse inventory`,
        data: {
          id,
          batch_number,
          product_id,
          variant_sku,
          pack_size_kg: pack_size_kg ? parseInt(pack_size_kg) : 25,
          unit_count: unit_count ? parseInt(unit_count) : 1,
          po_item_id,
          production_date,
          expiry_date,
          initial_qty_kg: qty,
          current_qty_kg: qty,
          unit_cost_per_kg: unitCost,
          is_expired: false,
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
    const { batch_updates, adjusted_by, approved_by } = body; // Array of { id, current_qty_kg, notes }

    if (!batch_updates || !Array.isArray(batch_updates) || batch_updates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'batch_updates array is required' },
        { status: 400 }
      );
    }

    const auditorName = approved_by
      ? `${adjusted_by || 'Staff Gudang'} (Disetujui: ${approved_by})`
      : (adjusted_by || 'SUPER ADMIN HQ');

    try {
      for (const update of batch_updates) {
        const { id, current_qty_kg, notes } = update;
        if (id && current_qty_kg !== undefined) {
          const qty = parseFloat(current_qty_kg);
          
          // Query the batch details to compute unit_count and log history
          const rows: any[] = await executeQuery(
            `SELECT product_id, variant_sku, batch_number, pack_size_kg, current_qty_kg FROM stock_batches WHERE id = ?`,
            [id]
          );
          
          if (rows && rows.length > 0) {
            const batch = rows[0];
            let packSize = 1;
            if (batch.pack_size_kg) {
              packSize = Math.max(1, parseInt(batch.pack_size_kg));
            }
            
            const newUnitCount = qty > 0 ? Math.max(1, Math.ceil(qty / packSize)) : 0;
            const oldQty = parseFloat(batch.current_qty_kg || 0);
            const diff = qty - oldQty;

            // 1. Insert history record
            const historyId = `opname-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            await executeQuery(
              `INSERT INTO stock_opname_history 
              (id, batch_id, product_id, variant_sku, batch_number, system_qty_kg, physical_qty_kg, difference_qty_kg, notes, created_at, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
              [
                historyId,
                id,
                batch.product_id,
                batch.variant_sku || '',
                batch.batch_number || '',
                oldQty,
                qty,
                diff,
                notes || 'Penyelarasan stok opname',
                auditorName,
              ]
            );

            // 2. Update stock batch
            await executeQuery(
              `UPDATE stock_batches SET current_qty_kg = ?, unit_count = ? WHERE id = ?`,
              [qty, newUnitCount, id]
            );
          }
        }
      }
    } catch (e: any) {
      console.warn('Database stock batches opname update warning:', e.message);
      return NextResponse.json(
        { success: false, message: e.message || 'Database update failed' },
        { status: 550 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Stock quantities updated successfully and logged to audit history',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, batch_number, expiry_date, production_date, notes } = body;

    if (!id || !batch_number || !expiry_date) {
      return NextResponse.json(
        { success: false, message: 'id, batch_number, and expiry_date are required' },
        { status: 400 }
      );
    }

    try {
      const isExpired = new Date(expiry_date) < new Date();
      await executeQuery(
        `UPDATE stock_batches 
         SET batch_number = ?, expiry_date = ?, production_date = ?, is_expired = ?
         WHERE id = ?`,
        [
          batch_number.trim(),
          expiry_date,
          production_date || null,
          isExpired,
          id,
        ]
      );
    } catch (dbErr: any) {
      console.warn('Database stock batch update error:', dbErr.message);
      return NextResponse.json(
        { success: false, message: dbErr.message || 'Failed to update batch in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Batch ${batch_number} berhasil diperbarui`,
      data: {
        id,
        batch_number: batch_number.trim(),
        expiry_date,
        production_date,
        notes,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const poItemId = searchParams.get('po_item_id');

    if (!id && !poItemId) {
      return NextResponse.json(
        { success: false, message: 'id or po_item_id is required' },
        { status: 400 }
      );
    }

    try {
      if (id) {
        await executeQuery('DELETE FROM stock_batches WHERE id = ?', [id]);
      } else if (poItemId) {
        await executeQuery('DELETE FROM stock_batches WHERE po_item_id = ?', [poItemId]);
      }
    } catch (dbErr: any) {
      console.warn('Database stock batch delete error:', dbErr.message);
      return NextResponse.json(
        { success: false, message: dbErr.message || 'Failed to delete batch from database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Batch deleted successfully from database',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
