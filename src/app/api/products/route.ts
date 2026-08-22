export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { initialProducts } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  try {
    let products: any[] = [];
    try {
      // Query products and calculate total_stock_kg from non-expired stock_batches
      products = await executeQuery(`
        SELECT 
          p.*,
          COALESCE(SUM(CASE WHEN sb.is_expired = FALSE THEN sb.current_qty_kg ELSE 0 END), 0) AS total_stock_kg
        FROM products p
        LEFT JOIN stock_batches sb ON p.id = sb.product_id
        WHERE p.is_active = TRUE
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `);

      if (!products || products.length === 0) {
        products = initialProducts;
      } else {
        // Fetch all product_variants from MySQL
        let allVariants: any[] = [];
        try {
          allVariants = await executeQuery(`SELECT * FROM product_variants WHERE is_active = TRUE ORDER BY pack_size_kg DESC`);
        } catch (err: any) {
          console.warn('Could not fetch product_variants table:', err.message);
        }

        // Fetch all non-expired active stock batches from MySQL
        let allBatches: any[] = [];
        try {
          allBatches = await executeQuery(`SELECT * FROM stock_batches WHERE is_expired = FALSE AND current_qty_kg > 0`);
        } catch (err: any) {
          console.warn('Could not fetch stock_batches:', err.message);
        }

        products = products.map((p) => {
          let apps = p.applications;
          let sizes = p.pack_sizes;
          let prices = p.variant_prices;
          let names = p.variant_names;
          let skus = p.variant_skus;

          if (typeof apps === 'string') {
            try { apps = JSON.parse(apps); } catch (e) { apps = [p.application || 'Fine Fragrance']; }
          }
          if (typeof sizes === 'string') {
            try { sizes = JSON.parse(sizes); } catch (e) { sizes = [25, 5, 1]; }
          }
          if (typeof prices === 'string') {
            try { prices = JSON.parse(prices); } catch (e) { prices = {}; }
          }
          if (typeof names === 'string') {
            try { names = JSON.parse(names); } catch (e) { names = {}; }
          }
          if (typeof skus === 'string') {
            try { skus = JSON.parse(skus); } catch (e) { skus = {}; }
          }

          const productVariants = allVariants.filter((v) => v.product_id === p.id);

          // Sync variant_prices from product_variants
          const vPricesMap: Record<string, number> = { ...(prices && typeof prices === 'object' ? prices : {}) };
          productVariants.forEach((v) => {
            const szKey = String(Number(v.pack_size_kg));
            if (v.selling_price_per_kg && (!vPricesMap[szKey] || vPricesMap[szKey] === 0)) {
              vPricesMap[szKey] = Number(v.selling_price_per_kg);
            }
          });

          const getBatchPackSize = (b: any): number => {
            if (b.pack_size_kg && [25, 5, 1, 0.1].includes(Number(b.pack_size_kg))) return Number(b.pack_size_kg);
            const skuVal = (b.variant_sku || '').toUpperCase();
            const num = (b.batch_number || '').toUpperCase();
            if (skuVal.includes('-25K') || num.includes('25K') || num.includes('-25-')) return 25;
            if (skuVal.includes('-5K') || num.includes('5K') || num.includes('-5-')) return 5;
            if (skuVal.includes('-1K') || num.includes('1K') || num.includes('-1-')) return 1;
            if (skuVal.includes('-0.1K') || skuVal.includes('-100G') || num.includes('0.1K') || num.includes('100G')) return 0.1;
            const qty = Number(b.current_qty_kg || 0);
            if (qty >= 25 && qty % 25 === 0) return 25;
            if (qty >= 5 && qty % 5 === 0) return 5;
            if (qty >= 1 && qty % 1 === 0) return 1;
            if (qty >= 0.1 && (qty * 10) % 1 === 0) return 0.1;
            return 25;
          };

          const pBatches = allBatches.filter((b) => b.product_id === p.id);
          const variantStocks: { [key: string]: number } = {};
          (Array.isArray(sizes) ? sizes : [25, 5, 1]).forEach((sizeKg) => {
            const vBatches = pBatches.filter((b) => getBatchPackSize(b) === sizeKg);
            const totalKg = vBatches.reduce((sum, b) => sum + Number(b.current_qty_kg || 0), 0);
            variantStocks[String(sizeKg)] = totalKg;
          });

          return {
            ...p,
            applications: Array.isArray(apps) && apps.length > 0 ? apps : [p.application || 'Fine Fragrance'],
            pack_sizes: Array.isArray(sizes) ? sizes : [25, 5, 1],
            variant_prices: vPricesMap,
            variant_names: (names && typeof names === 'object') ? names : {},
            variant_skus: (skus && typeof skus === 'object') ? skus : {},
            variants: productVariants,
            variant_stocks: variantStocks,
          };
        });
      }
    } catch (e: any) {
      console.warn('Database query products fallback:', e.message);
      products = initialProducts;
    }

    return NextResponse.json({
      success: true,
      count: products.length,
      data: products,
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
      sku,
      name,
      fragrance_family,
      top_notes,
      middle_notes,
      base_notes,
      density,
      selling_price_per_kg,
    } = body;

    if (!sku || !name || selling_price_per_kg === undefined) {
      return NextResponse.json(
        { success: false, message: 'SKU, name, and selling_price_per_kg are required' },
        { status: 400 }
      );
    }

    const id = `prod-${Date.now()}`;
    const parsedDensity = parseFloat(density) || 1.0;
    const parsedPrice = parseFloat(selling_price_per_kg) || 0;

    const defaultPackSizes = JSON.stringify([25, 5, 1]);
    const defaultVariantPrices = JSON.stringify({
      "25": parsedPrice,
      "5": parsedPrice === 0 ? 0 : parsedPrice + 100000,
      "1": parsedPrice === 0 ? 0 : parsedPrice + 150000
    });
    const defaultVariantNames = JSON.stringify({});
    const defaultVariantSkus = JSON.stringify({});
    const defaultApplications = JSON.stringify([fragrance_family || 'Fine Fragrance']);

    await executeQuery(
      `INSERT INTO products 
      (id, sku, name, fragrance_family, top_notes, middle_notes, base_notes, density, applications, pack_sizes, variant_prices, variant_names, variant_skus, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        id,
        sku,
        name,
        fragrance_family || 'Floral',
        top_notes || '',
        middle_notes || '',
        base_notes || '',
        parsedDensity,
        defaultApplications,
        defaultPackSizes,
        defaultVariantPrices,
        defaultVariantNames,
        defaultVariantSkus,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Product created successfully',
        data: {
          id,
          sku,
          name,
          fragrance_family,
          top_notes,
          middle_notes,
          base_notes,
          density: parsedDensity,
          pack_sizes: [25, 5, 1],
          variant_prices: {
            "25": parsedPrice,
            "5": parsedPrice === 0 ? 0 : parsedPrice + 100000,
            "1": parsedPrice === 0 ? 0 : parsedPrice + 150000
          },
          variant_names: {},
          variant_skus: {},
          total_stock_kg: 0,
          is_active: true,
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
      sku,
      name,
      fragrance_family,
      top_notes,
      middle_notes,
      base_notes,
      density,
      variant_names,
      variant_skus,
      pack_sizes,
      variant_prices,
      applications,
      application
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required for update' },
        { status: 400 }
      );
    }

    const skuVal = sku !== undefined ? sku : null;
    const nameVal = name !== undefined ? name : null;
    const familyVal = fragrance_family !== undefined ? fragrance_family : null;
    const topVal = top_notes !== undefined ? top_notes : null;
    const middleVal = middle_notes !== undefined ? middle_notes : null;
    const baseVal = base_notes !== undefined ? base_notes : null;
    const densityVal = (density !== undefined && density !== null) ? parseFloat(density) : null;
    const namesVal = variant_names !== undefined ? variant_names : null;
    const skusVal = variant_skus !== undefined ? variant_skus : null;
    const sizesVal = pack_sizes !== undefined ? pack_sizes : null;
    const pricesVal = variant_prices !== undefined ? variant_prices : null;
    const appsVal = applications !== undefined ? applications : null;
    const appVal = application !== undefined ? application : null;

    await executeQuery(
      `UPDATE products SET 
        sku = COALESCE(?, sku),
        name = COALESCE(?, name),
        fragrance_family = COALESCE(?, fragrance_family),
        top_notes = COALESCE(?, top_notes),
        middle_notes = COALESCE(?, middle_notes),
        base_notes = COALESCE(?, base_notes),
        density = COALESCE(?, density),
        variant_names = COALESCE(?, variant_names),
        variant_skus = COALESCE(?, variant_skus),
        pack_sizes = COALESCE(?, pack_sizes),
        variant_prices = COALESCE(?, variant_prices),
        applications = COALESCE(?, applications),
        application = COALESCE(?, application)
      WHERE id = ?`,
      [
        skuVal,
        nameVal,
        familyVal,
        topVal,
        middleVal,
        baseVal,
        densityVal,
        namesVal,
        skusVal,
        sizesVal,
        pricesVal,
        appsVal,
        appVal,
        id,
      ]
    );

    // Automatically deactivate product variants not in the updated pack sizes array
    if (pack_sizes) {
      try {
        const sizesArray = JSON.parse(pack_sizes);
        if (Array.isArray(sizesArray)) {
          // 1. Fetch current active database variants to compare
          const currentVariants: any = await executeQuery(
            `SELECT id, variant_sku, pack_size_kg FROM product_variants WHERE product_id = ? AND is_active = TRUE`,
            [id]
          );
          
          // 2. Identify variants that are being removed from pack_sizes
          const deactivatedVariants = currentVariants.filter(
            (cv: any) => !sizesArray.includes(Number(cv.pack_size_kg))
          );
          
          if (deactivatedVariants.length > 0) {
            // 3. Fetch all active stock batches for this product
            const allBatches: any[] = await executeQuery(
              `SELECT id, batch_number, variant_sku, current_qty_kg, pack_size_kg FROM stock_batches WHERE product_id = ? AND current_qty_kg > 0`,
              [id]
            );
            
            // Helper function to match batches to sizes
            const getBatchPackSize = (b: any): number => {
              if (b.pack_size_kg && [25, 5, 1].includes(Number(b.pack_size_kg))) return Number(b.pack_size_kg);
              const skuVal = (b.variant_sku || '').toUpperCase();
              const num = (b.batch_number || '').toUpperCase();
              if (skuVal.includes('-25K') || num.includes('25K') || num.includes('-25-')) return 25;
              if (skuVal.includes('-5K') || num.includes('5K') || num.includes('-5-')) return 5;
              if (skuVal.includes('-1K') || num.includes('1K') || num.includes('-1-')) return 1;
              const qty = Number(b.current_qty_kg || 0);
              if (qty >= 25 && qty % 25 === 0) return 25;
              if (qty >= 5 && qty % 5 === 0) return 5;
              if (qty >= 1 && qty % 1 === 0) return 1;
              return 25;
            };
            
            // Check if any removed variant size has stock > 0
            for (const dv of deactivatedVariants) {
              const dvSize = Number(dv.pack_size_kg);
              const sizeBatches = allBatches.filter((b) => getBatchPackSize(b) === dvSize);
              const totalStockKg = sizeBatches.reduce((sum, b) => sum + Number(b.current_qty_kg || 0), 0);
              if (totalStockKg > 0) {
                return NextResponse.json(
                  {
                    success: false,
                    message: `Tidak dapat menghapus varian ${dv.variant_sku || (dvSize + ' Kg')} karena masih terdapat stok aktif sebesar ${Math.round(totalStockKg)} Kg di gudang.`,
                  },
                  { status: 400 }
                );
              }
            }
          }
          if (sizesArray.length > 0) {
            await executeQuery(
              `UPDATE product_variants 
               SET is_active = FALSE 
               WHERE product_id = ? AND pack_size_kg NOT IN (${sizesArray.map(() => '?').join(', ')})`,
              [id, ...sizesArray]
            );
          } else {
            await executeQuery(
              `UPDATE product_variants 
               SET is_active = FALSE 
               WHERE product_id = ?`,
              [id]
            );
          }
        }
      } catch (e: any) {
        console.warn('Deactivating product variants warning:', e.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: body,
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

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check if there is any active stock in stock_batches for this product
    const activeStocks: any = await executeQuery(
      `SELECT SUM(current_qty_kg) as total_stock FROM stock_batches WHERE product_id = ? AND current_qty_kg > 0`,
      [id]
    );
    const totalStock = activeStocks?.[0]?.total_stock ?? 0;
    if (totalStock > 0) {
      return NextResponse.json(
        { success: false, message: `Tidak dapat menghapus produk induk karena masih terdapat stok aktif sebesar ${Math.round(totalStock)} Kg di gudang.` },
        { status: 400 }
      );
    }

    // 1. Deactivate product in products table
    await executeQuery(`UPDATE products SET is_active = FALSE WHERE id = ?`, [id]);

    // 2. Deactivate all variants of this product in product_variants table
    await executeQuery(`UPDATE product_variants SET is_active = FALSE WHERE product_id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Product and variants deactivated successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
