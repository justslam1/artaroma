import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { initialProducts, initialBatches } from '@/lib/mock-data';
import { verifyApiAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await verifyApiAuth(req, ['Dashboard', 'Lihat Stok (Gudang)']);
  if (auth.error) return auth.error;

  try {
    let stockData: any = null;

    try {
      const products: any[] = await executeQuery('SELECT * FROM products WHERE is_active = TRUE');
      const batches: any[] = await executeQuery('SELECT * FROM stock_batches WHERE is_expired = FALSE');

      const now = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(now.getMonth() + 3);

      let totalStockKg = 0;
      let lowStockAlertsCount = 0;
      const expiringBatches: any[] = [];
      const lowStockProducts: any[] = [];

      for (const prod of products) {
        const prodBatches = batches.filter((b) => b.product_id === prod.id);
        const prodTotalKg = prodBatches.reduce((s, b) => s + parseFloat(b.current_qty_kg || 0), 0);
        totalStockKg += prodTotalKg;

        if (prodTotalKg <= parseFloat(prod.min_stock_kg || 1.0)) {
          lowStockAlertsCount++;
          lowStockProducts.push({
            product_id: prod.id,
            sku: prod.sku,
            name: prod.name,
            current_stock_kg: prodTotalKg,
            min_stock_kg: parseFloat(prod.min_stock_kg),
          });
        }
      }

      for (const batch of batches) {
        const expDate = new Date(batch.expiry_date);
        if (expDate <= threeMonthsFromNow) {
          expiringBatches.push({
            batch_id: batch.id,
            batch_number: batch.batch_number,
            product_id: batch.product_id,
            current_qty_kg: parseFloat(batch.current_qty_kg),
            expiry_date: batch.expiry_date,
          });
        }
      }

      stockData = {
        total_stock_kg: Number(totalStockKg.toFixed(4)),
        total_active_variants: products.length,
        low_stock_alerts_count: lowStockAlertsCount,
        expiring_batches_count: expiringBatches.length,
        low_stock_products: lowStockProducts,
        expiring_batches: expiringBatches,
      };
    } catch {
      // Fallback mock calculations
      const totalKg = initialBatches.reduce((sum, b) => sum + b.current_qty_kg, 0);
      stockData = {
        total_stock_kg: totalKg,
        total_active_variants: initialProducts.length,
        low_stock_alerts_count: 2,
        expiring_batches_count: 1,
        low_stock_products: [
          { sku: 'FO-BER-004', name: 'Bergamot Calabria Zesty', current_stock_kg: 2.2, min_stock_kg: 4.0 },
        ],
        expiring_batches: [
          { batch_number: 'LOT-2025-099', expiry_date: '2026-08-30', current_qty_kg: 8.75 },
        ],
      };
    }

    return NextResponse.json({
      success: true,
      data: stockData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
