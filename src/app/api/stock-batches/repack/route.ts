import { NextRequest, NextResponse } from 'next/server';
import { executeTransaction, executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode, // 'SINGLE' | 'MULTI'
      source_batch_id,
      sources, // Array<{ batch_id: string, qty_kg: number }> for MULTI mode
      product_id,
      new_batch_number,
      target_pack_size, // 1, 5, 25
      repack_qty_kg,     // for SINGLE mode
      loss_kg = 0
    } = body;

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

    const isMulti = mode === 'MULTI' || (Array.isArray(sources) && sources.length > 0);
    let targetSize = Number.isNaN(parseInt(target_pack_size)) ? 1 : parseInt(target_pack_size);
    if (targetSize <= 0) targetSize = 1;
    const loss = Number.isNaN(parseFloat(loss_kg)) ? 0 : parseFloat(loss_kg);

    if (isMulti) {
      // ──────────────────────────────────────────────────────────────────────────
      // MULTI-BATCH REPACK (BLENDING / GABUNG BATCH)
      // ──────────────────────────────────────────────────────────────────────────
      if (!product_id || !Array.isArray(sources) || sources.length === 0) {
        return NextResponse.json(
          { success: false, message: 'product_id dan daftar sources batch wajib diisi untuk multi-batch repack' },
          { status: 400 }
        );
      }

      const validSources = sources
        .map((s: any) => ({
          batch_id: String(s.batch_id || s.id),
          qty_kg: parseFloat(s.qty_kg || s.qty || 0)
        }))
        .filter((s: any) => s.batch_id && s.qty_kg > 0);

      if (validSources.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Harap tentukan jumlah Kg yang diambil (lebih dari 0) dari minimal satu batch sumber' },
          { status: 400 }
        );
      }

      const totalInputKg = validSources.reduce((acc: number, s: any) => acc + s.qty_kg, 0);
      if (totalInputKg <= loss) {
        return NextResponse.json(
          { success: false, message: 'Total jumlah bahan yang diambil harus lebih besar dari loss' },
          { status: 400 }
        );
      }

      const result = await executeTransaction(async (conn) => {
        // 1. Fetch Product info
        const [productRows] = await conn.query(
          'SELECT * FROM products WHERE id = ?',
          [product_id]
        ) as any[];
        const product = productRows && productRows.length > 0 ? productRows[0] : null;
        if (!product) {
          throw new Error('Produk induk tidak ditemukan');
        }

        // 2. Fetch and Validate all source batches
        const sourceBatchIds = validSources.map((s: any) => s.batch_id);
        const [batchRows] = await conn.query(
          `SELECT * FROM stock_batches WHERE id IN (${sourceBatchIds.map(() => '?').join(',')})`,
          sourceBatchIds
        ) as any[];

        const batchMap = new Map<string, any>();
        (batchRows || []).forEach((b: any) => batchMap.set(b.id, b));

        let totalCost = 0;
        let earliestExpiry: string | null = null;
        let latestProduction: string | null = null;

        for (const src of validSources) {
          const b = batchMap.get(src.batch_id);
          if (!b) {
            throw new Error(`Batch sumber dengan ID ${src.batch_id} tidak ditemukan`);
          }
          const availableQty = parseFloat(b.current_qty_kg || 0);
          if (availableQty < src.qty_kg) {
            throw new Error(`Stok batch ${b.batch_number} tidak mencukupi. Tersedia: ${availableQty} Kg, Diminta: ${src.qty_kg} Kg`);
          }

          // Accumulate cost
          const unitCost = parseFloat(b.unit_cost_per_kg || 0);
          totalCost += (src.qty_kg * unitCost);

          // Earliest Expiry (FEFO Rule)
          if (b.expiry_date) {
            const expStr = String(b.expiry_date).split('T')[0];
            if (!earliestExpiry || expStr < earliestExpiry) {
              earliestExpiry = expStr;
            }
          }

          // Production Date
          if (b.production_date) {
            const prodStr = String(b.production_date).split('T')[0];
            if (!latestProduction || prodStr > latestProduction) {
              latestProduction = prodStr;
            }
          }
        }

        const weightedAvgCost = totalInputKg > 0 ? Math.round(totalCost / totalInputKg) : 0;
        const targetOutputKg = Math.max(0, totalInputKg - loss);
        const targetUnitCount = Math.max(1, Math.ceil(targetOutputKg / targetSize));
        const finalExpiryDate = earliestExpiry || new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const finalProductionDate = latestProduction || new Date().toISOString().split('T')[0];

        // 3. Deduct from each source batch
        for (const src of validSources) {
          const b = batchMap.get(src.batch_id);
          const currentQty = parseFloat(b.current_qty_kg || 0);
          const packSize = parseFloat(b.pack_size_kg || 25);
          const newQty = Math.max(0, currentQty - src.qty_kg);
          const newUnitCount = newQty <= 0 ? 0 : Math.max(1, Math.ceil(newQty / packSize));

          await conn.query(
            'UPDATE stock_batches SET current_qty_kg = ?, unit_count = ? WHERE id = ?',
            [newQty, newUnitCount, src.batch_id]
          );

          // Log per source batch
          const logId = `repack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          await conn.query(
            `INSERT INTO stock_repackage_logs 
            (id, product_id, source_batch_id, source_pack_size, target_pack_size, qty_processed_kg, units_created, loss_kg, processed_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              logId,
              product_id,
              src.batch_id,
              packSize,
              targetSize,
              src.qty_kg,
              0, // fractional units recorded
              0,
              'Warehouse Manager (Multi-Batch Repack)'
            ]
          );
        }

        // 4. Create or update target batch
        const targetVariantSku = `${product.sku}-${targetSize}K`;
        const autoBatchNum = `RPK-${product.sku || 'MIX'}-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
        const finalBatchNumber = (new_batch_number && new_batch_number.trim()) ? new_batch_number.trim() : autoBatchNum;

        const targetBatchId = `batch-${Date.now()}`;
        await conn.query(
          `INSERT INTO stock_batches 
          (id, batch_number, product_id, variant_sku, pack_size_kg, unit_count, production_date, expiry_date, initial_qty_kg, current_qty_kg, unit_cost_per_kg, is_expired)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
          [
            targetBatchId,
            finalBatchNumber,
            product_id,
            targetVariantSku,
            targetSize,
            targetUnitCount,
            finalProductionDate,
            finalExpiryDate,
            targetOutputKg,
            targetOutputKg,
            weightedAvgCost
          ]
        );

        return {
          targetBatchId,
          targetBatchNumber: finalBatchNumber,
          totalInputKg,
          targetOutputKg,
          targetUnitCount,
          weightedAvgCost,
          expiryDate: finalExpiryDate,
          sourceBatchesCount: validSources.length
        };
      });

      return NextResponse.json({
        success: true,
        message: `Repack gabungan ${result.sourceBatchesCount} batch berhasil! Menghasilkan ${result.targetOutputKg} Kg (${result.targetUnitCount} Unit) batch ${result.targetBatchNumber}.`,
        data: result
      });

    } else {
      // ──────────────────────────────────────────────────────────────────────────
      // SINGLE-BATCH REPACK (ORIGINAL FLOW)
      // ──────────────────────────────────────────────────────────────────────────
      if (!source_batch_id || !target_pack_size || !repack_qty_kg) {
        return NextResponse.json(
          { success: false, message: 'source_batch_id, target_pack_size, and repack_qty_kg are required' },
          { status: 400 }
        );
      }

      const qtyProcessed = Number.isNaN(parseFloat(repack_qty_kg)) ? 0 : parseFloat(repack_qty_kg);
      if (qtyProcessed <= 0) {
        return NextResponse.json(
          { success: false, message: 'Repack quantity must be greater than 0' },
          { status: 400 }
        );
      }

      if (qtyProcessed <= loss) {
        return NextResponse.json(
          { success: false, message: 'Repack quantity must be greater than loss' },
          { status: 400 }
        );
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
        const autoBatchNumber = `${sourceBatch.batch_number}-R${targetSize}K`;
        const finalBatchNumber = (new_batch_number && new_batch_number.trim()) ? new_batch_number.trim() : autoBatchNumber;
        const targetQty = Math.max(0, qtyProcessed - loss);
        const targetUnitCount = Math.max(1, Math.ceil(targetQty / targetSize));

        // 3. Check if target batch already exists
        const [targetRows] = await conn.query(
          'SELECT * FROM stock_batches WHERE batch_number = ? AND product_id = ? AND variant_sku = ?',
          [finalBatchNumber, sourceBatch.product_id, targetVariantSku]
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
              finalBatchNumber,
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
          targetBatchNumber: finalBatchNumber,
          targetQtyCreated: targetQty,
          targetUnitCountCreated: targetUnitCount
        };
      });

      return NextResponse.json({
        success: true,
        message: 'Repack berhasil dijalankan!',
        data: result
      });
    }

  } catch (error: any) {
    console.error('Error in POST /api/stock-batches/repack:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memproses repack.' },
      { status: 500 }
    );
  }
}
