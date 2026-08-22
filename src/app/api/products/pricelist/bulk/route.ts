import { NextRequest, NextResponse } from 'next/server';
import { executeTransaction } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensureLogsTableExists(conn: any) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS product_variant_price_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      variant_id VARCHAR(50) NOT NULL,
      variant_sku VARCHAR(100) NOT NULL,
      pack_size_kg DECIMAL(10,2) NOT NULL,
      old_price_idr DECIMAL(15,2) NOT NULL,
      new_price_idr DECIMAL(15,2) NOT NULL,
      old_price_usd DECIMAL(15,2) NOT NULL,
      new_price_usd DECIMAL(15,2) NOT NULL,
      changed_by VARCHAR(100) NOT NULL DEFAULT 'Super Admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export interface BulkPriceItem {
  product_id: string;
  variant_id?: string;
  variant_sku?: string;
  pack_size_kg: number;
  new_price_idr: number;
  new_price_usd?: number;
  old_price_idr?: number;
  old_price_usd?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { updates, reason = 'Penyesuaian Harga Massal', changed_by = 'Super Admin' } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Array data updates dibutuhkan.' },
        { status: 400 }
      );
    }

    let updatedCount = 0;

    await executeTransaction(async (conn) => {
      // 1. Pastikan tabel logs tersedia
      await ensureLogsTableExists(conn);

      // Kelompokkan update berdasarkan product_id agar variant_prices JSON di tabel products juga ter-update
      const productMap = new Map<string, BulkPriceItem[]>();
      for (const item of updates) {
        if (!item.product_id) continue;
        const list = productMap.get(item.product_id) || [];
        list.push(item);
        productMap.set(item.product_id, list);
      }

      for (const [productId, items] of productMap.entries()) {
        // Ambil data produk saat ini
        const [prodRows]: any = await conn.query(
          `SELECT id, name, sku, variant_prices, selling_price_per_kg FROM products WHERE id = ?`,
          [productId]
        );

        if (!prodRows || prodRows.length === 0) continue;
        const product = prodRows[0];
        let currentVariantPrices: Record<string, number> = {};
        try {
          if (product.variant_prices) {
            currentVariantPrices = typeof product.variant_prices === 'string'
              ? JSON.parse(product.variant_prices)
              : product.variant_prices;
          }
        } catch {
          currentVariantPrices = {};
        }

        for (const item of items) {
          const packSize = Number(item.pack_size_kg) || 25;
          const sizeKey = String(Math.round(packSize));
          const newIdr = Math.max(0, Number(item.new_price_idr) || 0);
          const newUsd = Math.max(0, Number(item.new_price_usd) || 0);

          // Update variant_prices map
          currentVariantPrices[sizeKey] = newIdr;

          // Cek apakah ada record di product_variants
          let varSku = item.variant_sku || `${product.sku}-${sizeKey}K`;
          let varName = `${product.name} ${sizeKey}K`;

          const [varRows]: any = await conn.query(
            `SELECT * FROM product_variants WHERE product_id = ? AND (pack_size_kg = ? OR variant_sku = ? OR id = ?) LIMIT 1`,
            [productId, packSize, varSku, item.variant_id || '']
          );

          let oldPriceIdr = 0;
          let oldPriceUsd = 0;
          let variantId = item.variant_id || `var-${product.sku.toLowerCase().replace(/[^a-z0-9]/gi, '')}-${sizeKey}`;

          if (varRows && varRows.length > 0) {
            const currentVar = varRows[0];
            variantId = currentVar.id;
            varSku = currentVar.variant_sku || varSku;
            varName = currentVar.variant_name || varName;
            oldPriceIdr = parseFloat(currentVar.selling_price_per_kg || 0);
            oldPriceUsd = parseFloat(currentVar.selling_price_usd_per_kg || 0);

            // Update record varian yang ada
            await conn.query(
              `UPDATE product_variants 
               SET selling_price_per_kg = ?, selling_price_usd_per_kg = ?, is_active = TRUE 
               WHERE id = ?`,
              [newIdr, newUsd, variantId]
            );
          } else {
            // Insert record varian baru jika belum ada
            await conn.query(
              `INSERT INTO product_variants 
               (id, product_id, variant_sku, variant_name, pack_size_kg, selling_price_per_kg, selling_price_usd_per_kg, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
              [variantId, productId, varSku, varName, packSize, newIdr, newUsd]
            );
          }

          // Catat ke log riwayat harga jika ada perubahan
          if (oldPriceIdr !== newIdr || (newUsd > 0 && oldPriceUsd !== newUsd)) {
            await conn.query(
              `INSERT INTO product_variant_price_logs 
               (product_id, product_name, variant_id, variant_sku, pack_size_kg, old_price_idr, new_price_idr, old_price_usd, new_price_usd, changed_by) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                productId,
                product.name,
                variantId,
                varSku,
                packSize,
                oldPriceIdr,
                newIdr,
                oldPriceUsd,
                newUsd,
                `${changed_by} (${reason})`
              ]
            );
          }

          updatedCount++;
        }

        // Update JSON variant_prices dan selling_price_per_kg pada tabel products
        const basePrice = currentVariantPrices['25'] || currentVariantPrices['5'] || currentVariantPrices['1'] || 0;
        await conn.query(
          `UPDATE products 
           SET variant_prices = ?, selling_price_per_kg = ? 
           WHERE id = ?`,
          [JSON.stringify(currentVariantPrices), basePrice, productId]
        );
      }
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil memperbarui harga untuk ${updatedCount} item/varian produk!`,
      updatedCount,
    });
  } catch (error: any) {
    console.error('Bulk update price error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memperbarui harga massal.' },
      { status: 500 }
    );
  }
}
