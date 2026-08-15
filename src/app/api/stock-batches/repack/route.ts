import { NextRequest, NextResponse } from 'next/server';
import { executeTransaction, executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      source_batch_id,
      target_pack_size, // 1 or 5
      repack_qty_kg,     // amount in kg to take (e.g. 1, 2, 5, etc.)
      loss_kg = 0
    } = body;

    if (!source_batch_id || !target_pack_size || !repack_qty_kg) {
      return NextResponse.json(
        { success: false, message: 'source_batch_id, target_pack_size, and repack_qty_kg are required' },
        { status: 400 }
      );
    }

    const qtyProcessed = Number.isNaN(parseFloat(repack_qty_kg)) ? 0 : parseFloat(repack_qty_kg);
    const loss = Number.isNaN(parseFloat(loss_kg)) ? 0 : parseFloat(loss_kg);
    let targetSize = Number.isNaN(parseInt(target_pack_size)) ? 1 : parseInt(target_pack_size);
    if (targetSize <= 0) targetSize = 1;

    if (qtyProcessed <= 0) {
      return NextResponse.json(
        { success: false, message: 'Repack quantity must be greater than 0' },
        { status: 400 }
      );
    }

    if (loss < 0) {
      return NextResponse.json(
        { success: false, message: 'Loss quantity cannot be negative' },
        { status: 400 }
      );
    }

    if (qtyProcessed <= loss) {
      return NextResponse.json(
        { success: false, message: 'Repack quantity must be greater than loss' },
        { status: 400 }
      );
    }

    // Auto-create log table if it doesn't exist
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS stock_repackage_logs (
          id VARCHAR(50) PRIMARY KEY,
          product_id VARCHAR(50) NOT NULL,
          source_batch_id VARCHAR(50) NOT NULL,
          source_pack_size DECIMAL(10,2) NOT NULL,
          target_pack_size DECIMAL(10,2) NOT NULL,
          qty_processed_kg DECIMAL(10,2) NOT NULL,
          units_created INT NOT NULL,
          loss_kg DECIMAL(10,2) DEFAULT 0.00,
          processed_by VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e: any) {
      console.warn('Could not ensure stock_repackage_logs table exists:', e.message);
    }

    const result = await executeTransaction(async (conn) => {
      // 1. Fetch source batch
      const [sourceRows] = await conn.query(
        'SELECT * FROM stock_batches WHERE id = ?',
        [source_batch_id]
      ) as any[];

      const sourceBatch = sourceRows && sourceRows.length > 0 ? sourceRows[0] : null;

      if (!sourceBatch) {
        throw new Error('Batch sumber tidak ditemukan');
      }

      const sourceQty = Number.isNaN(parseFloat(sourceBatch.current_qty_kg)) ? 0 : parseFloat(sourceBatch.current_qty_kg);
      let sourcePackSize = Number.isNaN(parseFloat(sourceBatch.pack_size_kg)) ? 25 : parseFloat(sourceBatch.pack_size_kg);
      if (sourcePackSize <= 0) sourcePackSize = 25;

      if (sourceQty < qtyProcessed) {
        throw new Error(`Stok batch sumber tidak mencukupi. Tersedia: ${sourceQty} Kg, Diminta: ${qtyProcessed} Kg`);
      }

      // Calculate new source qty
      const newSourceQty = Math.max(0, sourceQty - qtyProcessed);
      // Calculate unit_count: if sisa berat > 0, we still have at least 1 container, but it's partially filled
      const newSourceUnitCount = newSourceQty <= 0 ? 0 : Math.max(1, Math.ceil(newSourceQty / sourcePackSize));

      // Update source batch
      await conn.query(
        'UPDATE stock_batches SET current_qty_kg = ?, unit_count = ? WHERE id = ?',
        [newSourceQty, newSourceUnitCount, source_batch_id]
      );

      // 2. Fetch product info
      const [productRows] = await conn.query(
        'SELECT * FROM products WHERE id = ?',
        [sourceBatch.product_id]
      ) as any[];

      const product = productRows && productRows.length > 0 ? productRows[0] : null;

      if (!product) {
        throw new Error('Produk tidak ditemukan');
      }

      // Construct target variant SKU & target batch number
      const targetVariantSku = `${product.sku}-${targetSize}K`;
      const targetBatchNumber = `${sourceBatch.batch_number}-R${targetSize}K`;
      const targetQty = Math.max(0, qtyProcessed - loss);
      const targetUnitCount = Math.max(1, Math.ceil(targetQty / targetSize));

      // 3. Check if target batch already exists
      const [targetRows] = await conn.query(
        'SELECT * FROM stock_batches WHERE batch_number = ? AND product_id = ? AND variant_sku = ?',
        [targetBatchNumber, sourceBatch.product_id, targetVariantSku]
      ) as any[];

      const existingTarget = targetRows && targetRows.length > 0 ? targetRows[0] : null;

      let targetBatchId = '';

      if (existingTarget) {
        targetBatchId = existingTarget.id;
        const currentTargetQty = Number.isNaN(parseFloat(existingTarget.current_qty_kg)) ? 0 : parseFloat(existingTarget.current_qty_kg);
        const currentTargetUnitCount = Number.isNaN(parseInt(existingTarget.unit_count)) ? 0 : parseInt(existingTarget.unit_count);
        
        const newTargetQty = currentTargetQty + targetQty;
        const newTargetUnitCount = currentTargetUnitCount + targetUnitCount;

        await conn.query(
          'UPDATE stock_batches SET current_qty_kg = ?, unit_count = ? WHERE id = ?',
          [newTargetQty, newTargetUnitCount, targetBatchId]
        );
      } else {
        targetBatchId = `batch-${Date.now()}`;
        await conn.query(
          `INSERT INTO stock_batches 
          (id, batch_number, product_id, variant_sku, pack_size_kg, unit_count, production_date, expiry_date, initial_qty_kg, current_qty_kg, unit_cost_per_kg, is_expired)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
          [
            targetBatchId,
            targetBatchNumber,
            sourceBatch.product_id,
            targetVariantSku,
            targetSize,
            targetUnitCount,
            sourceBatch.production_date,
            sourceBatch.expiry_date,
            targetQty,
            targetQty,
            sourceBatch.unit_cost_per_kg
          ]
        );
      }

      // 4. Log the repack action
      const logId = `repack-${Date.now()}`;
      await conn.query(
        `INSERT INTO stock_repackage_logs 
        (id, product_id, source_batch_id, source_pack_size, target_pack_size, qty_processed_kg, units_created, loss_kg, processed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logId,
          sourceBatch.product_id,
          source_batch_id,
          sourcePackSize,
          targetSize,
          qtyProcessed,
          targetUnitCount,
          loss,
          'Warehouse Manager'
        ]
      );

      return {
        logId,
        sourceBatchId: source_batch_id,
        sourceQtyRemaining: newSourceQty,
        targetBatchId,
        targetQtyCreated: targetQty,
        targetUnitCountCreated: targetUnitCount
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Repack berhasil dijalankan!',
      data: result
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memproses repack.' },
      { status: 500 }
    );
  }
}
