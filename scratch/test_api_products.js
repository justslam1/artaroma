const mysql = require('mysql2/promise');

const getBatchPackSize = (b) => {
  if (b.pack_size_kg && [25, 5, 1].includes(Number(b.pack_size_kg))) return Number(b.pack_size_kg);
  const sku = (b.variant_sku || '').toUpperCase();
  const num = (b.batch_number || '').toUpperCase();
  if (sku.includes('-25K') || num.includes('25K') || num.includes('-25-')) return 25;
  if (sku.includes('-5K') || num.includes('5K') || num.includes('-5-')) return 5;
  if (sku.includes('-1K') || num.includes('1K') || num.includes('-1-')) return 1;
  const qty = Number(b.current_qty_kg || 0);
  if (qty >= 25 && qty % 25 === 0) return 25;
  if (qty >= 5 && qty % 5 === 0) return 5;
  if (qty >= 1 && qty % 1 === 0) return 1;
  return 25;
};

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'fragrance_hub',
  });

  try {
    const [products] = await pool.query("SELECT * FROM products WHERE is_active = TRUE");
    const [batches] = await pool.query("SELECT * FROM stock_batches WHERE is_expired = FALSE AND current_qty_kg > 0");

    products.forEach((p) => {
      let sizes = [25, 5, 1];
      if (p.pack_sizes) {
        try { sizes = JSON.parse(p.pack_sizes); } catch (e) {}
      }

      const pBatches = batches.filter((b) => b.product_id === p.id);
      const variantStocks = {};

      sizes.forEach((sizeKg) => {
        const vBatches = pBatches.filter((b) => getBatchPackSize(b) === sizeKg);
        const totalKg = vBatches.reduce((sum, b) => sum + Number(b.current_qty_kg || 0), 0);
        variantStocks[String(sizeKg)] = totalKg;
      });

      console.log(`Product: ${p.name}`);
      console.log('Variant Stocks (Kg):', variantStocks);
    });
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
