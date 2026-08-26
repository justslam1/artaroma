import { NextRequest, NextResponse } from 'next/server';
import { executeTransaction, executeQuery, ensureSchemaMigrations } from '@/lib/db';
import { verifyApiAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensurePricelistTablesAndColumns(conn: any) {
  // 1. Ensure product_variants table exists
  await conn.query(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id VARCHAR(64) PRIMARY KEY,
      product_id VARCHAR(64) NOT NULL,
      variant_sku VARCHAR(64) NOT NULL,
      variant_name VARCHAR(255) NOT NULL,
      pack_size_kg DECIMAL(10,2) NOT NULL,
      selling_price_per_kg DECIMAL(15,2) DEFAULT 0.00,
      selling_price_usd_per_kg DECIMAL(10,2) DEFAULT 0.00,
      min_stock_kg DECIMAL(10,2) DEFAULT 5.00,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Ensure product_variant_price_logs table exists
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

  // 3. Ensure products table columns exist
  try {
    const [prodCols]: any = await conn.query('SHOW COLUMNS FROM products');
    const prodColNames = new Set(prodCols.map((c: any) => c.Field.toLowerCase()));

    if (!prodColNames.has('selling_price_per_kg')) {
      await conn.query('ALTER TABLE products ADD COLUMN selling_price_per_kg DECIMAL(15,2) DEFAULT 0.00');
    }
    if (!prodColNames.has('selling_price_usd_per_kg')) {
      await conn.query('ALTER TABLE products ADD COLUMN selling_price_usd_per_kg DECIMAL(15,2) DEFAULT 0.00');
    }
    if (!prodColNames.has('variant_prices')) {
      await conn.query('ALTER TABLE products ADD COLUMN variant_prices LONGTEXT DEFAULT NULL');
    }
    if (!prodColNames.has('variant_names')) {
      await conn.query('ALTER TABLE products ADD COLUMN variant_names LONGTEXT DEFAULT NULL');
    }
    if (!prodColNames.has('variant_skus')) {
      await conn.query('ALTER TABLE products ADD COLUMN variant_skus LONGTEXT DEFAULT NULL');
    }
    if (!prodColNames.has('pack_sizes')) {
      await conn.query('ALTER TABLE products ADD COLUMN pack_sizes LONGTEXT DEFAULT NULL');
    }
  } catch (e: any) {
    console.warn('[Pricelist Route] products column check:', e.message);
  }

  // 4. Ensure product_variants table columns exist
  try {
    const [pvCols]: any = await conn.query('SHOW COLUMNS FROM product_variants');
    const pvColNames = new Set(pvCols.map((c: any) => c.Field.toLowerCase()));

    if (!pvColNames.has('selling_price_per_kg')) {
      await conn.query('ALTER TABLE product_variants ADD COLUMN selling_price_per_kg DECIMAL(15,2) DEFAULT 0.00');
    }
    if (!pvColNames.has('selling_price_usd_per_kg')) {
      await conn.query('ALTER TABLE product_variants ADD COLUMN selling_price_usd_per_kg DECIMAL(10,2) DEFAULT 0.00');
    }
  } catch (e: any) {
    console.warn('[Pricelist Route] product_variants column check:', e.message);
  }
}

export async function GET(req: NextRequest) {
  try {
    let logs: any[] = [];
    try {
      logs = await executeQuery(`
        SELECT * FROM product_variant_price_logs 
        ORDER BY created_at DESC 
        LIMIT 150
      `);
    } catch (e: any) {
      // Table might not exist yet, create it
      await executeTransaction(async (conn) => {
        await ensurePricelistTablesAndColumns(conn);
      });
      logs = [];
    }

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memuat riwayat harga.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Master Data']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { product_id, prices } = body;

    if (!product_id || !Array.isArray(prices)) {
      return NextResponse.json(
        { success: false, message: 'product_id and prices array are required' },
        { status: 400 }
      );
    }

    await ensureSchemaMigrations(true);

    await executeTransaction(async (conn) => {
      // 1. Ensure tables & columns exist
      await ensurePricelistTablesAndColumns(conn);

      // 2. Loop and update each variant
      for (const priceItem of prices) {
        const { variant_id, selling_price_per_kg, selling_price_usd_per_kg, currency } = priceItem;
        
        if (!variant_id) {
          throw new Error('variant_id is required for each price item');
        }

        const idrPrice = parseFloat(selling_price_per_kg || 0);
        const usdPrice = parseFloat(selling_price_usd_per_kg || 0);

        // Fetch current variant and product details
        const [rows]: any = await conn.query(
          `SELECT pv.*, p.name AS product_name 
           FROM product_variants pv 
           JOIN products p ON pv.product_id = p.id 
           WHERE pv.id = ? AND pv.product_id = ?`,
          [variant_id, product_id]
        );

        if (rows && rows.length > 0) {
          const currentVar = rows[0];
          const oldPriceIdr = parseFloat(currentVar.selling_price_per_kg || 0);
          const oldPriceUsd = parseFloat(currentVar.selling_price_usd_per_kg || 0);

          // Only log if the base price in the user-selected currency has changed
          const isBasePriceChanged = currency === 'USD'
            ? oldPriceUsd !== usdPrice
            : oldPriceIdr !== idrPrice;

          if (isBasePriceChanged) {
            // Write to log table
            await conn.query(
              `INSERT INTO product_variant_price_logs 
               (product_id, product_name, variant_id, variant_sku, pack_size_kg, old_price_idr, new_price_idr, old_price_usd, new_price_usd, changed_by) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                product_id,
                currentVar.product_name,
                variant_id,
                currentVar.variant_sku,
                currentVar.pack_size_kg,
                oldPriceIdr,
                idrPrice,
                oldPriceUsd,
                usdPrice,
                'Super Admin'
              ]
            );
          }

          // In both cases, update the database to match the new values
          await conn.query(
            `UPDATE product_variants 
             SET selling_price_per_kg = ?, selling_price_usd_per_kg = ?, is_active = TRUE 
             WHERE id = ? AND product_id = ?`,
            [idrPrice, usdPrice, variant_id, product_id]
          );
        } else {
          // If variant wasn't found (fallback case), insert it!
          const [pRows]: any = await conn.query('SELECT name, sku FROM products WHERE id = ?', [product_id]);
          const pName = pRows && pRows[0] ? pRows[0].name : 'Bibit Parfum';
          const pSku = pRows && pRows[0] ? pRows[0].sku : 'FO-000';
          
          // extract pack size from variant_id or use default
          const packSizeMatch = variant_id.match(/-(\d+)$/);
          const packSize = packSizeMatch ? parseFloat(packSizeMatch[1]) : 1.0;

          await conn.query(
            `INSERT INTO product_variants 
             (id, product_id, variant_sku, variant_name, pack_size_kg, selling_price_per_kg, selling_price_usd_per_kg, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [
              variant_id,
              product_id,
              `${pSku}-${packSize}K`,
              `${pName} ${packSize}K`,
              packSize,
              idrPrice,
              usdPrice
            ]
          );
        }
      }

      // Sync products table (variant_prices JSON & base selling_price_per_kg)
      const [allVRows]: any = await conn.query(
        `SELECT pack_size_kg, selling_price_per_kg FROM product_variants WHERE product_id = ? AND is_active = TRUE`,
        [product_id]
      );
      const vPricesMap: Record<string, number> = {};
      if (allVRows && Array.isArray(allVRows)) {
        allVRows.forEach((vr: any) => {
          vPricesMap[String(Math.round(Number(vr.pack_size_kg)))] = Number(vr.selling_price_per_kg || 0);
        });
      }
      const basePrice = vPricesMap['25'] || vPricesMap['5'] || vPricesMap['1'] || 0;
      await conn.query(
        `UPDATE products SET variant_prices = ?, selling_price_per_kg = ? WHERE id = ?`,
        [JSON.stringify(vPricesMap), basePrice, product_id]
      );
    });

    return NextResponse.json({
      success: true,
      message: 'Pricelist varian produk berhasil diperbarui!',
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memperbarui pricelist.' },
      { status: 500 }
    );
  }
}
