import { executeQuery } from '../src/lib/db';

async function run() {
  console.log('\n=== DIAGNOSIS KARTU KPI DASHBOARD ===\n');

  // 1. Total Omset - dari sales_orders
  try {
    const soRows: any[] = await executeQuery("SELECT COUNT(*) as cnt, SUM(grand_total) as total FROM sales_orders WHERE status != 'CANCELLED'");
    console.log('✅ [TOTAL OMSET] Tabel sales_orders:');
    console.log(`   → ${soRows[0].cnt} SO aktif, Total = Rp ${Number(soRows[0].total || 0).toLocaleString('id-ID')}`);
  } catch (e: any) {
    console.error('❌ [TOTAL OMSET] Gagal query sales_orders:', e.message);
  }

  // 2. Gross Profit Margin - dari so_item_batches
  try {
    const cogsRows: any[] = await executeQuery('SELECT SUM(qty_taken_kg * cogs_per_kg) as total_cogs FROM so_item_batches');
    console.log('\n✅ [GROSS PROFIT MARGIN] Tabel so_item_batches:');
    console.log(`   → Total COGS = Rp ${Number(cogsRows[0].total_cogs || 0).toLocaleString('id-ID')}`);
  } catch (e: any) {
    console.error('❌ [GROSS PROFIT MARGIN] Gagal query so_item_batches:', e.message);
    console.error('   → Kemungkinan tabel tidak ada atau kolom berbeda');
  }

  // 3. Total Piutang AR - dari invoices
  try {
    const invRows: any[] = await executeQuery("SELECT COUNT(*) as cnt, SUM(total_amount - IFNULL(paid_amount,0)) as piutang FROM invoices WHERE status IN ('UNPAID','PARTIALLY_PAID','OVERDUE')");
    console.log('\n✅ [TOTAL PIUTANG AR] Tabel invoices:');
    console.log(`   → ${invRows[0].cnt} invoice belum lunas, Total Piutang = Rp ${Number(invRows[0].piutang || 0).toLocaleString('id-ID')}`);
  } catch (e: any) {
    console.error('❌ [TOTAL PIUTANG AR] Gagal query invoices:', e.message);
  }

  // 4. Alert FEFO & Stok - dari stock_batches + products
  try {
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const expiryRows: any[] = await executeQuery(
      `SELECT COUNT(*) as cnt FROM stock_batches WHERE current_qty_kg > 0 AND expiry_date <= ? AND expiry_date >= CURDATE()`,
      [in90Days]
    );
    const lowStockRows: any[] = await executeQuery(
      `SELECT COUNT(*) as cnt FROM products p WHERE p.is_active = TRUE AND (SELECT IFNULL(SUM(sb.current_qty_kg),0) FROM stock_batches sb WHERE sb.product_id = p.id) <= p.min_stock_kg`
    );
    console.log('\n✅ [ALERT FEFO & STOK] Tabel stock_batches + products:');
    console.log(`   → Near Expiry batches (≤90 hari): ${expiryRows[0].cnt}`);
    console.log(`   → Produk stok kritis (≤ min_stock_kg): ${lowStockRows[0].cnt}`);
  } catch (e: any) {
    console.error('❌ [ALERT FEFO & STOK] Gagal query:', e.message);
  }

  // 5. Aging AR Breakdown
  try {
    const invAll: any[] = await executeQuery("SELECT status, issue_date, total_amount, paid_amount FROM invoices WHERE status IN ('UNPAID','PARTIALLY_PAID','OVERDUE')");
    const now = new Date();
    let ar0 = 0, ar16 = 0, ar30 = 0;
    for (const inv of invAll) {
      const sisa = parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0);
      const age = Math.floor((now.getTime() - new Date(inv.issue_date).getTime()) / (1000*3600*24));
      if (age <= 15) ar0 += sisa;
      else if (age <= 30) ar16 += sisa;
      else ar30 += sisa;
    }
    console.log('\n✅ [LAPORAN UMUR PIUTANG] Breakdown Aging AR:');
    console.log(`   → Lancar  (0-15 hari): Rp ${ar0.toLocaleString('id-ID')}`);
    console.log(`   → Mendekati (16-30 hari): Rp ${ar16.toLocaleString('id-ID')}`);
    console.log(`   → Overdue  (>30 hari): Rp ${ar30.toLocaleString('id-ID')}`);
  } catch (e: any) {
    console.error('❌ [LAPORAN UMUR PIUTANG] Gagal query invoices:', e.message);
  }

  // 6. Cek tabel invoices ada atau tidak + kolom
  try {
    const cols: any[] = await executeQuery('SHOW COLUMNS FROM invoices');
    console.log('\n📋 Kolom tabel invoices:', cols.map((c: any) => c.Field).join(', '));
  } catch (e: any) {
    console.error('❌ Tabel invoices tidak ada:', e.message);
  }

  // 7. Cek tabel so_item_batches
  try {
    const cols: any[] = await executeQuery('SHOW COLUMNS FROM so_item_batches');
    console.log('📋 Kolom tabel so_item_batches:', cols.map((c: any) => c.Field).join(', '));
  } catch (e: any) {
    console.error('❌ Tabel so_item_batches tidak ada:', e.message);
  }

  console.log('\n=== SELESAI ===\n');
}

run();
