import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { initialBatches, initialProducts } from '@/lib/mock-data';

async function initStockBatchesSampleColumns() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS stock_batches (
        id VARCHAR(100) PRIMARY KEY,
        batch_number VARCHAR(100) NOT NULL,
        product_id VARCHAR(100) NOT NULL,
        product_name VARCHAR(255),
        variant_sku VARCHAR(100),
        pack_size_kg DECIMAL(10, 3) DEFAULT 25,
        unit_count INT DEFAULT 1,
        po_item_id VARCHAR(100),
        production_date DATE,
        expiry_date DATE,
        initial_qty_kg DECIMAL(10, 3) DEFAULT 0,
        current_qty_kg DECIMAL(10, 3) DEFAULT 0,
        unit_cost_per_kg DECIMAL(15, 2) DEFAULT 0,
        is_expired TINYINT DEFAULT 0,
        is_sample TINYINT DEFAULT 0,
        supplier_name VARCHAR(255),
        sample_target VARCHAR(255),
        sample_notes TEXT,
        sample_status VARCHAR(50) DEFAULT 'UJI_COBA',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add sample columns to existing table if not present
    const columns = await executeQuery<any[]>('SHOW COLUMNS FROM stock_batches');
    const colNames = new Set(columns.map((c: any) => c.Field.toLowerCase()));

    if (!colNames.has('product_name')) {
      await executeQuery('ALTER TABLE stock_batches ADD COLUMN product_name VARCHAR(255)');
    }
    if (!colNames.has('variant_sku')) {
      await executeQuery('ALTER TABLE stock_batches ADD COLUMN variant_sku VARCHAR(100)');
    }
    if (!colNames.has('pack_size_kg')) {
      await executeQuery('ALTER TABLE stock_batches ADD COLUMN pack_size_kg DECIMAL(10, 3) DEFAULT 25');
    }
    if (!colNames.has('unit_count')) {
      await executeQuery('ALTER TABLE stock_batches ADD COLUMN unit_count INT DEFAULT 1');
    }
    if (!colNames.has('is_sample')) {
      await executeQuery('ALTER TABLE stock_batches ADD COLUMN is_sample TINYINT DEFAULT 0');
    }
    if (!colNames.has('supplier_name')) {
      await executeQuery('ALTER TABLE stock_batches ADD COLUMN supplier_name VARCHAR(255)');
    }
    if (!colNames.has('sample_target')) {
      await executeQuery('ALTER TABLE stock_batches ADD COLUMN sample_target VARCHAR(255)');
    }
    if (!colNames.has('sample_notes')) {
      await executeQuery('ALTER TABLE stock_batches ADD COLUMN sample_notes TEXT');
    }
    if (!colNames.has('sample_status')) {
      await executeQuery('ALTER TABLE stock_batches ADD COLUMN sample_status VARCHAR(50) DEFAULT "UJI_COBA"');
    }
  } catch (err) {
    console.warn('Init stock_batches sample columns warning:', err);
  }
}

export async function GET() {
  try {
    await initStockBatchesSampleColumns();
    let rows: any[] = [];
    try {
      rows = await executeQuery<any[]>(
        'SELECT * FROM stock_batches WHERE is_sample = 1 ORDER BY created_at DESC'
      );
    } catch {
      rows = [];
    }

    return NextResponse.json({ success: true, data: rows || [] });
  } catch (err: any) {
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      batch_number,
      product_id,
      product_name,
      variant_sku,
      pack_size_kg,
      unit_count,
      production_date,
      expiry_date,
      initial_qty_kg,
      supplier_name,
      sample_target,
      sample_notes,
      sample_status,
    } = body;

    const qty = parseFloat(initial_qty_kg);
    if (!batch_number || !product_id || isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { success: false, message: 'Nomor batch, produk, dan kuantitas sampel wajib diisi.' },
        { status: 400 }
      );
    }

    await initStockBatchesSampleColumns();

    const id = `sample-batch-${Date.now()}`;
    const pDate = production_date || new Date().toISOString().split('T')[0];
    const defaultExp = new Date();
    defaultExp.setFullYear(defaultExp.getFullYear() + 2);
    const expDate = expiry_date || defaultExp.toISOString().split('T')[0];
    const packSize = pack_size_kg ? parseFloat(pack_size_kg) : qty;
    const uCount = unit_count ? parseInt(unit_count) : 1;
    const status = sample_status || 'UJI_COBA';

    const newSampleBatch = {
      id,
      batch_number,
      product_id,
      product_name: product_name || 'Bibit Parfum Sampel',
      variant_sku: variant_sku || `${product_id}-SMP`,
      pack_size_kg: packSize,
      unit_count: uCount,
      production_date: pDate,
      expiry_date: expDate,
      initial_qty_kg: qty,
      current_qty_kg: qty,
      unit_cost_per_kg: 0,
      is_expired: false,
      is_sample: true,
      supplier_name: supplier_name || 'Vendor Suplier Luar',
      sample_target: sample_target || 'Evaluasi Aroma Suplier Baru',
      sample_notes: sample_notes || '',
      sample_status: status,
      created_at: new Date().toISOString(),
    };

    // Ensure product exists in products table if FK is checked
    try {
      const existingProd = await executeQuery<any[]>('SELECT id FROM products WHERE id = ?', [newSampleBatch.product_id]);
      if (!existingProd || existingProd.length === 0) {
        await executeQuery(
          `INSERT INTO products (id, sku, name, application, applications, fragrance_family, density, min_stock_kg, selling_price_per_kg, is_active)
           VALUES (?, ?, ?, 'Fine Fragrance', '["Fine Fragrance"]', 'Floral', 1.0, 1.0, 0, 1)`,
          [newSampleBatch.product_id, newSampleBatch.variant_sku || 'FO-SMP', newSampleBatch.product_name || 'Sampel Baru']
        );
      }
    } catch (prodErr: any) {
      console.warn('Auto insert product for sample warning:', prodErr.message);
    }

    try {
      await executeQuery(
        `INSERT INTO stock_batches 
        (id, batch_number, product_id, product_name, variant_sku, pack_size_kg, unit_count, production_date, expiry_date, initial_qty_kg, current_qty_kg, unit_cost_per_kg, is_expired, is_sample, supplier_name, sample_target, sample_notes, sample_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?, ?, ?)`,
        [
          newSampleBatch.id,
          newSampleBatch.batch_number,
          newSampleBatch.product_id,
          newSampleBatch.product_name,
          newSampleBatch.variant_sku,
          newSampleBatch.pack_size_kg,
          newSampleBatch.unit_count,
          newSampleBatch.production_date,
          newSampleBatch.expiry_date,
          newSampleBatch.initial_qty_kg,
          newSampleBatch.current_qty_kg,
          newSampleBatch.supplier_name,
          newSampleBatch.sample_target,
          newSampleBatch.sample_notes,
          newSampleBatch.sample_status,
        ]
      );
    } catch (err: any) {
      console.warn('DB insert sample batch warning:', err.message);
    }

    // Always push to in-memory initialBatches
    initialBatches.unshift(newSampleBatch as any);

    return NextResponse.json({
      success: true,
      message: `Sampel ${batch_number} (${newSampleBatch.product_name}) sebanyak ${qty} Kg berhasil dicatat ke stok gudang!`,
      data: newSampleBatch,
    });
  } catch (err: any) {
    console.error('Stock sample API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, sample_status, sample_notes, current_qty_kg } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID batch sampel wajib disertakan' }, { status: 400 });
    }

    await initStockBatchesSampleColumns();

    try {
      await executeQuery(
        `UPDATE stock_batches 
         SET sample_status = COALESCE(?, sample_status),
             sample_notes = COALESCE(?, sample_notes),
             current_qty_kg = COALESCE(?, current_qty_kg)
         WHERE id = ?`,
        [sample_status || null, sample_notes !== undefined ? sample_notes : null, current_qty_kg !== undefined ? parseFloat(current_qty_kg) : null, id]
      );
    } catch (err: any) {
      console.warn('DB update sample batch warning:', err.message);
    }

    // Update in memory if present
    const memoryIdx = initialBatches.findIndex((b) => b.id === id);
    if (memoryIdx !== -1) {
      if (sample_status) initialBatches[memoryIdx].sample_status = sample_status;
      if (sample_notes !== undefined) initialBatches[memoryIdx].sample_notes = sample_notes;
      if (current_qty_kg !== undefined) initialBatches[memoryIdx].current_qty_kg = parseFloat(current_qty_kg);
    }

    return NextResponse.json({
      success: true,
      message: 'Status sampel berhasil diperbarui',
      data: { id, sample_status, sample_notes, current_qty_kg },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
