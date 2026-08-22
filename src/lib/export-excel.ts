import * as XLSX from 'xlsx';
import {
  AppUser,
  Product,
  Customer,
  Distributor,
  Courier,
  PurchaseOrder,
  SalesOrder,
  StockBatch,
} from './types';

export interface ExportExcelOptions {
  fileName?: string;
  sheetName?: string;
  autoWidth?: boolean;
}

/**
 * Utility umum untuk mengekspor data array JSON ke file Excel (.xlsx)
 */
export function exportToXLSX<T extends Record<string, any>>(
  data: T[],
  options: ExportExcelOptions = {}
): boolean {
  if (!data || data.length === 0) {
    if (typeof window !== 'undefined') {
      alert('Tidak ada data untuk diekspor ke Excel.');
    }
    return false;
  }

  const {
    fileName = `Export_${new Date().toISOString().split('T')[0]}.xlsx`,
    sheetName = 'Data',
    autoWidth = true,
  } = options;

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);

    if (autoWidth) {
      const keys = Object.keys(data[0] || {});
      const colWidths = keys.map((key) => {
        let maxLen = key.length;
        data.forEach((row) => {
          const val = row[key];
          if (val !== undefined && val !== null) {
            const strVal = String(val);
            if (strVal.length > maxLen) {
              maxLen = strVal.length;
            }
          }
        });
        return { wch: Math.min(Math.max(maxLen + 4, 12), 65) };
      });
      worksheet['!cols'] = colWidths;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

    const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(workbook, finalFileName);
    return true;
  } catch (error) {
    console.error('Gagal mengekspor data ke Excel:', error);
    if (typeof window !== 'undefined') {
      alert('Terjadi kesalahan saat memproses ekspor Excel.');
    }
    return false;
  }
}

/**
 * Helper khusus ekspor Master Data Pengguna
 */
export function exportUsersToXLSX(
  users: AppUser[],
  userModuleAccess: Record<string, string[]> = {},
  customFileName?: string
): boolean {
  if (!users || users.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada data pengguna yang dapat diekspor.');
    return false;
  }

  const formattedData = users.map((u, index) => {
    const modules = userModuleAccess[u.id] || u.allowed_modules || [];
    const moduleStr = Array.isArray(modules) && modules.length > 0 ? modules.join(', ') : 'Semua Modul';

    return {
      'No': index + 1,
      'Nama Pengguna': u.name || '-',
      'Email': u.email || '-',
      'Peran (Role)': u.role || 'ADMIN',
      'Entitas / Unit Terkait': u.linked_entity_name || 'Artaroma HQ',
      'Modul yang Dapat Diakses': moduleStr,
      'Status Akun': u.is_active !== false ? 'AKTIF' : 'NONAKTIF',
      'Terakhir Login': u.last_login || 'Belum Pernah Login',
      'Tanggal Dibuat': u.created_at || '-',
    };
  });

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(formattedData, {
    fileName: customFileName || `Master_Data_Pengguna_Artaroma_${timestamp}.xlsx`,
    sheetName: 'Pengguna Sistem',
  });
}

/**
 * Helper khusus ekspor Master Data Produk & Varian
 */
export function exportProductsToXLSX(products: Product[], customFileName?: string): boolean {
  if (!products || products.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada data produk yang dapat diekspor.');
    return false;
  }

  const rows: any[] = [];
  let no = 1;

  products.forEach((p) => {
    const appStr = Array.isArray(p.applications)
      ? p.applications.join(', ')
      : p.application || p.fragrance_family || '-';

    if (p.variants && p.variants.length > 0) {
      p.variants.forEach((v) => {
        rows.push({
          'No': no++,
          'SKU Produk': v.variant_sku || v.sku || p.sku,
          'Nama Produk / Varian': v.variant_name || p.name,
          'Kategori Aplikasi': appStr,
          'Ukuran Kemasan (Kg)': v.pack_size_kg ?? '-',
          'Harga Jual / Kg (IDR)': v.selling_price_per_kg || p.selling_price_per_kg || 0,
          'Harga Jual / Kg (USD)': v.selling_price_usd_per_kg ? `$${v.selling_price_usd_per_kg}` : '-',
          'Stok Aktif (Kg)': Math.round(v.total_stock_kg || 0),
          'Min. Stok Alert (Kg)': v.min_stock_kg ?? p.min_stock_kg ?? 0,
          'Top Notes': p.top_notes || '-',
          'Middle Notes': p.middle_notes || '-',
          'Base Notes': p.base_notes || '-',
        });
      });
    } else {
      rows.push({
        'No': no++,
        'SKU Produk': p.sku,
        'Nama Produk / Varian': p.name,
        'Kategori Aplikasi': appStr,
        'Ukuran Kemasan (Kg)': (p.pack_sizes || []).join(', ') || '-',
        'Harga Jual / Kg (IDR)': p.selling_price_per_kg || 0,
        'Harga Jual / Kg (USD)': '-',
        'Stok Aktif (Kg)': Math.round(p.total_stock_kg || 0),
        'Min. Stok Alert (Kg)': p.min_stock_kg || 0,
        'Top Notes': p.top_notes || '-',
        'Middle Notes': p.middle_notes || '-',
        'Base Notes': p.base_notes || '-',
      });
    }
  });

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(rows, {
    fileName: customFileName || `Master_Data_Produk_Artaroma_${timestamp}.xlsx`,
    sheetName: 'Katalog Produk',
  });
}

/**
 * Helper khusus ekspor Pricelist
 */
export function exportPricelistToXLSX(products: Product[], usdRate: number, customFileName?: string): boolean {
  if (!products || products.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada data pricelist untuk diekspor.');
    return false;
  }

  const rows: any[] = [];
  let no = 1;

  products.forEach((p) => {
    if (p.variants && p.variants.length > 0) {
      p.variants.forEach((v) => {
        const hasUsd = Number(v.selling_price_usd_per_kg || 0) > 0;
        const idrPrice = v.selling_price_per_kg || (hasUsd ? Math.round(Number(v.selling_price_usd_per_kg) * usdRate) : 0);
        rows.push({
          'No': no++,
          'SKU': v.variant_sku || v.sku || p.sku,
          'Nama Produk': v.variant_name || p.name,
          'Kemasan (Kg)': v.pack_size_kg ?? '-',
          'Mata Uang Acuan': hasUsd ? 'USD' : 'IDR',
          'Harga USD / Kg': hasUsd ? Number(v.selling_price_usd_per_kg) : '-',
          'Harga IDR / Kg': idrPrice,
          'Kurs Acuan USD': hasUsd ? `Rp ${usdRate.toLocaleString('id-ID')}` : '-',
        });
      });
    } else {
      rows.push({
        'No': no++,
        'SKU': p.sku,
        'Nama Produk': p.name,
        'Kemasan (Kg)': (p.pack_sizes || []).join(', ') || '-',
        'Mata Uang Acuan': 'IDR',
        'Harga USD / Kg': '-',
        'Harga IDR / Kg': p.selling_price_per_kg || 0,
        'Kurs Acuan USD': '-',
      });
    }
  });

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(rows, {
    fileName: customFileName || `Pricelist_Produk_Artaroma_${timestamp}.xlsx`,
    sheetName: 'Pricelist Umum',
  });
}

/**
 * Helper khusus ekspor Template Pricelist untuk Impor / Update Massal
 */
export function exportPricelistTemplateXLSX(products: Product[], customFileName?: string): boolean {
  if (!products || products.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada data produk untuk diekspor ke template.');
    return false;
  }

  const rows: any[] = [];
  let no = 1;

  products.forEach((p) => {
    const packSizes = p.pack_sizes && p.pack_sizes.length > 0 ? p.pack_sizes : [25, 5, 1];
    packSizes.forEach((sz) => {
      const vSku = p.variant_skus?.[sz] || `${p.sku}-${sz}K`;
      const vName = p.variant_names?.[sz] || `${p.name} ${sz}K`;
      const vPriceIdr = p.variant_prices?.[sz] ?? (p.selling_price_per_kg || 0);
      const app = (p.applications && p.applications.length > 0 ? p.applications[0] : p.application) || 'Fine Fragrance';

      rows.push({
        'No': no++,
        'ID Produk': p.id,
        'SKU Varian': vSku,
        'SKU Induk': p.sku,
        'Nama Produk': vName,
        'Kategori Aplikasi': app,
        'Kemasan (Kg)': sz,
        'Harga IDR / Kg': vPriceIdr,
        'Harga USD / Kg': 0,
      });
    });
  });

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(rows, {
    fileName: customFileName || `Template_Update_Harga_Artaroma_${timestamp}.xlsx`,
    sheetName: 'Pricelist',
  });
}

export interface ParsedPricelistRow {
  rowNumber: number;
  productId: string;
  skuVarian: string;
  skuInduk: string;
  productName: string;
  packSizeKg: number;
  newPriceIdr: number;
  newPriceUsd: number;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Parser file Excel Pricelist untuk fitur Impor Harga Massal
 */
export async function parsePricelistExcel(file: File): Promise<ParsedPricelistRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File Excel tidak memiliki sheet yang valid.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!jsonData || jsonData.length === 0) {
    throw new Error('File Excel kosong atau format tabel tidak terbaca.');
  }

  const results: ParsedPricelistRow[] = [];

  jsonData.forEach((row, idx) => {
    // Cari field berdasarkan kemungkinan nama kolom
    const productId = String(row['ID Produk'] || row['id_produk'] || row['Product ID'] || row['ID'] || '').trim();
    const skuVarian = String(row['SKU Varian'] || row['sku_varian'] || row['SKU'] || row['Variant SKU'] || '').trim();
    const skuInduk = String(row['SKU Induk'] || row['sku_induk'] || row['Parent SKU'] || '').trim();
    const productName = String(row['Nama Produk'] || row['nama_produk'] || row['Product Name'] || '').trim();
    
    const packSizeRaw = row['Kemasan (Kg)'] || row['kemasan_kg'] || row['Kemasan'] || row['Pack Size'] || 25;
    const packSizeKg = Number(String(packSizeRaw).replace(/[^0-9.]/g, '')) || 25;

    const priceIdrRaw = row['Harga IDR / Kg'] || row['harga_idr'] || row['Harga IDR'] || row['Harga (IDR)'] || row['Price IDR'] || 0;
    const newPriceIdr = Number(String(priceIdrRaw).replace(/[^0-9.]/g, '')) || 0;

    const priceUsdRaw = row['Harga USD / Kg'] || row['harga_usd'] || row['Harga USD'] || row['Price USD'] || 0;
    const newPriceUsd = Number(String(priceUsdRaw).replace(/[^0-9.]/g, '')) || 0;

    let isValid = true;
    let errorMessage = '';

    if (!productId && !skuVarian && !skuInduk) {
      isValid = false;
      errorMessage = 'ID Produk atau SKU tidak ditemukan';
    } else if (newPriceIdr < 0) {
      isValid = false;
      errorMessage = 'Harga tidak boleh minus';
    }

    results.push({
      rowNumber: idx + 2, // Header is row 1
      productId,
      skuVarian,
      skuInduk,
      productName,
      packSizeKg,
      newPriceIdr,
      newPriceUsd,
      isValid,
      errorMessage,
    });
  });

  return results;
}

/**
 * Helper khusus ekspor Master Data Customer
 */
export function exportCustomersToXLSX(customers: Customer[], customFileName?: string): boolean {
  if (!customers || customers.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada data customer untuk diekspor.');
    return false;
  }

  const rows = customers.map((c, index) => ({
    'No': index + 1,
    'Kode Customer': c.code || '-',
    'Nama Perusahaan': c.company_name || '-',
    'Nama PIC': c.pic_name || '-',
    'Email': c.email || '-',
    'Nomor Telepon': c.phone || '-',
    'Alamat Pengiriman': c.address || '-',
    'Alamat Kantor': (c as any).office_address || '-',
    'NPWP': c.npwp || '-',
    'Bank': c.bank_name || '-',
    'No Rekening': c.bank_account_number || '-',
    'Atas Nama Rekening': c.bank_account_name || '-',
    'Kelayakan Kredit': c.is_credit_eligible ? 'LAYAK' : 'CASH ONLY',
    'Limit Kredit (IDR)': c.credit_limit || 0,
    'TOP Kredit (Hari)': c.credit_terms_days || 0,
  }));

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(rows, {
    fileName: customFileName || `Master_Data_Customer_${timestamp}.xlsx`,
    sheetName: 'Customer B2B',
  });
}

/**
 * Helper khusus ekspor Master Data Suplier / Distributor
 */
export function exportDistributorsToXLSX(distributors: Distributor[], customFileName?: string): boolean {
  if (!distributors || distributors.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada data suplier untuk diekspor.');
    return false;
  }

  const rows = distributors.map((d, index) => ({
    'No': index + 1,
    'Kode Suplier': d.code || '-',
    'Nama Suplier': d.name || '-',
    'Kontak PIC': d.contact_name || '-',
    'Email': d.email || '-',
    'Nomor Telepon': d.phone || '-',
    'Alamat': d.address || '-',
    'TOP Pembayaran (Hari)': d.top_payable_days || 30,
    'Rekening Bank': d.bank_account || '-',
    'NPWP': d.npwp || '-',
    'Catatan': d.notes || '-',
  }));

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(rows, {
    fileName: customFileName || `Master_Data_Suplier_${timestamp}.xlsx`,
    sheetName: 'Suplier & Distributor',
  });
}

/**
 * Helper khusus ekspor Master Data Kurir
 */
export function exportCouriersToXLSX(couriers: Courier[], customFileName?: string): boolean {
  if (!couriers || couriers.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada data kurir untuk diekspor.');
    return false;
  }

  const rows = couriers.map((k, index) => ({
    'No': index + 1,
    'Kode Kurir / Ekspedisi': k.code || '-',
    'Nama Kurir / Vendor': k.name || '-',
    'Tipe Kurir': k.courier_type === 'EKSTERNAL' ? 'EKSTERNAL' : 'INTERNAL',
    'Nomor Telepon / Kontak': k.phone || '-',
    'Plat Nomor / Layanan': k.vehicle_number || k.service_type || '-',
    'Catatan': k.notes || '-',
    'Status': k.is_active !== false ? 'AKTIF / SIAP TUGAS' : 'NONAKTIF',
  }));

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(rows, {
    fileName: customFileName || `Master_Data_Kurir_${timestamp}.xlsx`,
    sheetName: 'Armada Kurir',
  });
}

/**
 * Helper khusus ekspor Purchase Orders
 */
export function exportPurchaseOrdersToXLSX(pos: PurchaseOrder[], customFileName?: string): boolean {
  if (!pos || pos.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada data PO untuk diekspor.');
    return false;
  }

  const rows = pos.map((po, index) => {
    const totalQty = po.items.reduce((s, i) => s + (i.qty_ordered_kg || 0), 0);
    const itemNames = po.items.map((i) => `${i.product_name} (${i.qty_ordered_kg} kg)`).join('; ');

    return {
      'No': index + 1,
      'No PO': po.po_number || '-',
      'Tanggal Order': po.order_date || '-',
      'Nama Suplier': po.distributor_name || '-',
      'Status PO': po.status || '-',
      'Metode Bayar': po.payment_method || 'KREDIT',
      'TOP (Hari)': po.payment_terms_days || 30,
      'Mata Uang': po.currency || 'IDR',
      'Kurs Khusus (IDR)': po.exchange_rate || 1,
      'Total Nilai (Valas)': po.foreign_total_amount || (po.currency && po.currency !== 'IDR' ? (po.total_amount / (po.exchange_rate || 1)) : '-'),
      'Total Item (Kg)': totalQty,
      'Total Nilai PO (IDR)': po.total_amount || 0,
      'Rincian Produk': itemNames,
    };
  });

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(rows, {
    fileName: customFileName || `Daftar_Purchase_Orders_${timestamp}.xlsx`,
    sheetName: 'Purchase Orders',
  });
}

/**
 * Helper khusus ekspor Sales Orders
 */
export function exportSalesOrdersToXLSX(sos: SalesOrder[], customFileName?: string): boolean {
  if (!sos || sos.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada data Sales Order untuk diekspor.');
    return false;
  }

  const rows = sos.map((so, index) => {
    const totalQty = (so.items || []).reduce((s, i) => s + (i.qty_kg || 0), 0);
    const itemNames = (so.items || []).map((i) => `${i.product_name} (${i.qty_kg} kg)`).join('; ');

    return {
      'No': index + 1,
      'No SO': so.so_number || '-',
      'Tanggal Order': so.order_date || '-',
      'Nama Customer': so.customer_name || '-',
      'Perusahaan': so.customer_company || '-',
      'Status SO': so.status || '-',
      'Metode Bayar': so.payment_method || '-',
      'Tipe Kirim': so.shipping_type || 'FRANCO',
      'Kurir Pengantar': so.courier_name || '-',
      'Total Berat (Kg)': totalQty,
      'Subtotal Barang (IDR)': so.total_goods_amount || 0,
      'Biaya Ongkir (IDR)': so.shipping_cost || 0,
      'Grand Total (IDR)': so.grand_total || 0,
      'Rincian Produk': itemNames,
    };
  });

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(rows, {
    fileName: customFileName || `Daftar_Sales_Orders_${timestamp}.xlsx`,
    sheetName: 'Sales Orders',
  });
}

/**
 * Helper khusus ekspor Stok Gudang & Batches FEFO
 */
export function exportStockInventoryToXLSX(batches: StockBatch[], customFileName?: string): boolean {
  if (!batches || batches.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada data stok gudang untuk diekspor.');
    return false;
  }

  const rows = batches.map((b, index) => ({
    'No': index + 1,
    'Nomor Batch': b.batch_number || '-',
    'SKU Varian': b.variant_sku || '-',
    'Nama Produk': b.product_name || '-',
    'Ukuran Kemasan': b.pack_size_kg ? `${b.pack_size_kg} Kg` : '-',
    'Sisa Stok (Kg)': Math.round(b.current_qty_kg || 0),
    'Unit / Jerigen': b.unit_count || 1,
    'Tgl Produksi': b.production_date || '-',
    'Expired Date': b.expiry_date || '-',
    'Status Expired': b.is_expired ? 'EXPIRED' : 'AKTIF',
    'Biaya Pokok (HPP) / Kg': b.unit_cost_per_kg || 0,
  }));

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(rows, {
    fileName: customFileName || `Laporan_Stok_Gudang_FEFO_${timestamp}.xlsx`,
    sheetName: 'Stok Gudang FEFO',
  });
}

/**
 * Helper khusus ekspor Invoices Piutang
 */
export function exportInvoicesToXLSX(invoices: any[], customFileName?: string): boolean {
  if (!invoices || invoices.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada data tagihan/invoice untuk diekspor.');
    return false;
  }

  const rows = invoices.map((inv, index) => ({
    'No': index + 1,
    'No Invoice': inv.invoice_number || inv.id || '-',
    'No SO Terkait': inv.so_number || '-',
    'Nama Customer': inv.customer_name || '-',
    'Perusahaan': inv.customer_company || '-',
    'Tanggal Invoice': inv.invoice_date || inv.order_date || '-',
    'Jatuh Tempo': inv.due_date || '-',
    'Total Tagihan (IDR)': inv.total_amount || inv.grand_total || 0,
    'Status Pembayaran': inv.payment_status || inv.status || 'BELUM LUNAS',
  }));

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(rows, {
    fileName: customFileName || `Laporan_Piutang_Invoices_${timestamp}.xlsx`,
    sheetName: 'Piutang Customer',
  });
}

/**
 * Helper khusus ekspor Hutang Suplier / Payables
 */
export function exportPayablesToXLSX(payables: any[], customFileName?: string): boolean {
  if (!payables || payables.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada data hutang suplier untuk diekspor.');
    return false;
  }

  const rows = payables.map((p, index) => ({
    'No': index + 1,
    'No PO': p.po_number || '-',
    'Nama Suplier': p.distributor_name || '-',
    'Tanggal Order': p.order_date || '-',
    'Jatuh Tempo': p.due_date || '-',
    'Total Hutang (IDR)': p.total_amount || 0,
    'Status Hutang': p.payment_status || p.status || 'BELUM LUNAS',
  }));

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(rows, {
    fileName: customFileName || `Laporan_Hutang_Suplier_${timestamp}.xlsx`,
    sheetName: 'Hutang Suplier',
  });
}

/**
 * Helper khusus ekspor Log Book / Audit Trail Transaksi
 */
export function exportTransactionsToXLSX(transactions: any[], customFileName?: string): boolean {
  if (!transactions || transactions.length === 0) {
    if (typeof window !== 'undefined') alert('Tidak ada log transaksi untuk diekspor.');
    return false;
  }

  const rows = transactions.map((t, index) => ({
    'No': index + 1,
    'Waktu': t.created_at || t.timestamp || '-',
    'Tipe Transaksi': t.type || t.action || '-',
    'No Dokumen / Referensi': t.reference_number || t.doc_no || '-',
    'Keterangan': t.description || t.notes || '-',
    'User Pelaksana': t.user_name || t.actor || '-',
    'Perubahan Stok (Kg)': t.qty_change ?? '-',
  }));

  const timestamp = new Date().toISOString().split('T')[0];
  return exportToXLSX(rows, {
    fileName: customFileName || `Log_Book_Audit_Transaksi_${timestamp}.xlsx`,
    sheetName: 'Log Transaksi',
  });
}
