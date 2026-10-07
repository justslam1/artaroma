import { NextRequest, NextResponse } from 'next/server';
import { executeTransaction, executeQuery, ensureSchemaMigrations } from '@/lib/db';
import { verifyApiAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Master Data', 'Lihat Nilai Finansial (PO/SO)']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const rate = parseFloat(body.usd_exchange_rate);

    if (isNaN(rate) || rate <= 0) {
      return NextResponse.json(
        { success: false, message: 'Nilai kurs USD tidak valid.' },
        { status: 400 }
      );
    }

    await ensureSchemaMigrations(true);

    await executeTransaction(async (conn) => {
      // 1. Simpan kurs ke company_settings
      await conn.query(
        `INSERT INTO company_settings (key_name, value_text)
         VALUES ('usd_exchange_rate', ?)
         ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
        [String(rate)]
      );

      // 2. Pastikan kolom selling_price_usd_per_kg ada
      try {
        const [pvCols]: any = await conn.query('SHOW COLUMNS FROM product_variants');
        const pvColNames = new Set(pvCols.map((c: any) => c.Field.toLowerCase()));
        if (!pvColNames.has('selling_price_usd_per_kg')) {
          await conn.query('ALTER TABLE product_variants ADD COLUMN selling_price_usd_per_kg DECIMAL(10,2) DEFAULT 0.00');
        }
      } catch (e: any) {
        console.warn('Column check product_variants:', e.message);
      }

      try {
        const [pCols]: any = await conn.query('SHOW COLUMNS FROM products');
        const pColNames = new Set(pCols.map((c: any) => c.Field.toLowerCase()));
        if (!pColNames.has('selling_price_usd_per_kg')) {
          await conn.query('ALTER TABLE products ADD COLUMN selling_price_usd_per_kg DECIMAL(15,2) DEFAULT 0.00');
        }
      } catch (e: any) {
        console.warn('Column check products:', e.message);
      }

      // 3. Update selling_price_per_kg di product_variants untuk semua varian yang memiliki harga USD > 0
      await conn.query(
        `UPDATE product_variants 
         SET selling_price_per_kg = ROUND(selling_price_usd_per_kg * ?)
         WHERE selling_price_usd_per_kg > 0 AND is_active = TRUE`,
        [rate]
      );

      // 4. Update selling_price_per_kg di products untuk semua produk yang memiliki harga USD > 0
      await conn.query(
        `UPDATE products 
         SET selling_price_per_kg = ROUND(selling_price_usd_per_kg * ?)
         WHERE selling_price_usd_per_kg > 0 AND is_active = TRUE`,
        [rate]
      );

      // 5. Sinkronkan variant_prices JSON di tabel products
      const [allVariants]: any = await conn.query(
        `SELECT product_id, pack_size_kg, selling_price_per_kg 
         FROM product_variants 
         WHERE is_active = TRUE`
      );

      if (Array.isArray(allVariants)) {
        const productVariantMap = new Map<string, Record<string, number>>();
        for (const v of allVariants) {
          const pid = v.product_id;
          const map = productVariantMap.get(pid) || {};
          map[String(Math.round(Number(v.pack_size_kg)))] = Number(v.selling_price_per_kg || 0);
          productVariantMap.set(pid, map);
        }

        for (const [pid, vmap] of productVariantMap.entries()) {
          const basePrice = vmap['25'] || vmap['5'] || vmap['1'] || 0;
          await conn.query(
            `UPDATE products 
             SET variant_prices = ?, selling_price_per_kg = ? 
             WHERE id = ? AND selling_price_usd_per_kg > 0`,
            [JSON.stringify(vmap), basePrice, pid]
          );
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Kurs USD Rp ${new Intl.NumberFormat('id-ID').format(rate)} berhasil diterapkan. Seluruh harga varian berbasis USD telah dikonversi.`,
      rate,
    });
  } catch (error: any) {
    console.error('Error applying USD exchange rate:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menerapkan kurs USD.' },
      { status: 500 }
    );
  }
}
