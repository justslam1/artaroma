'use client';

import React from 'react';
import { PurchaseOrder } from '@/lib/types';
import { formatIDR, formatKg, formatDate } from '@/lib/utils';
import { X, Printer, Download, Sparkles, Building2, Calendar, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

interface POPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  companyConfig?: any;
}

export function POPDFModal({ isOpen, onClose, po, companyConfig }: POPDFModalProps) {
  if (!isOpen || !po) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  const companyName = companyConfig?.company_name || 'PT Artaroma Jayatama';
  const companyTagline = companyConfig?.company_tagline || 'B2B Fragrance Oil Supplier & Management Hub';
  const warehouseAddress = companyConfig?.warehouse_address || 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272';
  const logisticsPic = companyConfig?.logistics_pic || 'Tim Gudang FEFO Engine';
  const deliverySchedule = companyConfig?.delivery_schedule_rule || 'Max 7 Hari setelah PO diterbitkan';

  const calculatedTotal = po.items.reduce(
    (sum, it) => sum + (it.subtotal || (it.qty_ordered_kg * (it.cost_per_kg || 1000000))),
    0
  );
  const ppn = Math.round(calculatedTotal * 0.11);
  const grandTotal = calculatedTotal + ppn;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto">
      {/* Modal Box Container */}
      <div className="bg-white border border-gray-200 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:m-0 print:w-full">
        {/* Header Action Bar (Hidden on Print) */}
        <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm">Dokumen Purchase Order (PO)</h3>
              <p className="text-[11px] text-slate-400">Pesanan Resmi Pengadaan Bibit Parfum #{po.po_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak / Print PO
            </button>
            <button
              onClick={handleDownload}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Simpan PDF
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg ml-2 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE PDF CONTENT AREA (A4 Document Styling) */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-800 bg-white font-sans text-xs flex-1 print:p-6 print:overflow-visible">
          {/* Document Header Letterhead */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-black text-xl text-blue-900 tracking-tight block uppercase">{companyName}</span>
                  <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">{companyTagline}</span>
                </div>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed pt-1">
                {warehouseAddress}<br />
                Telp: (024) 7692-8800 | Email: procurement@artaroma.co.id | NPWP: 01.987.654.3-041.000
              </p>
            </div>

            <div className="text-right space-y-1 sm:border-l border-gray-200 sm:pl-6 w-full sm:w-auto">
              <span className="bg-blue-100 text-blue-900 font-black text-lg px-3 py-1 rounded inline-block tracking-wider uppercase">
                PURCHASE ORDER
              </span>
              <div className="font-mono font-bold text-sm text-slate-900">{po.po_number}</div>
              <div className="text-slate-500">Tanggal Order: <strong>{formatDate(po.order_date)}</strong></div>
              <div className="text-slate-500">Status PO: <strong className="text-emerald-600 font-bold uppercase">{po.status}</strong></div>
            </div>
          </div>

          {/* Vendor & Shipping Address Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
            {/* Vendor / Distributor Info */}
            <div className="space-y-1">
              <div className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> KEPADA VENDOR / SUPLIER:
              </div>
              <div className="font-extrabold text-sm text-slate-900">{po.distributor_name}</div>
              <div className="text-slate-600">Attn: Official Sales &amp; Supply Department</div>
              <div className="text-slate-500">Gedung Menara Astra Lt. 24, Jl. Jend. Sudirman, Jakarta</div>
              <div className="text-slate-500">Telp: 021-5790-1234 | Email: supply.order@distributor.com</div>
            </div>

            {/* Ship To / Delivery Info */}
            <div className="space-y-1 border-l border-slate-200 pl-6">
              <div className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> DIKIRIM KE (SHIP TO):
              </div>
              <div className="font-bold text-slate-900">{companyName} — Warehouse Utama</div>
              <div className="text-slate-600">{warehouseAddress}</div>
              <div className="text-slate-500">UP: {logisticsPic}</div>
              <div className="text-slate-500">Jadwal Pengiriman: {deliverySchedule}</div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-2">
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Rincian Item Bibit Parfum Dipesan:
            </div>
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <th className="p-2.5 border border-slate-700 text-center w-12">NO</th>
                  <th className="p-2.5 border border-slate-700">KODE SKU</th>
                  <th className="p-2.5 border border-slate-700">DESKRIPSI VARIAN BIBIT PARFUM</th>
                  <th className="p-2.5 border border-slate-700 text-right">KUANTITAS (KG)</th>
                  <th className="p-2.5 border border-slate-700 text-right">HARGA / KG (IDR)</th>
                  <th className="p-2.5 border border-slate-700 text-right">SUBTOTAL (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-xs">
                {po.items.map((item, idx) => {
                  const cost = item.cost_per_kg || 1200000;
                  const qty = item.qty_ordered_kg;
                  const subtotal = qty * cost;
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="p-2.5 border border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 border border-slate-200 font-bold text-blue-800 font-mono text-[10px]">
                        FO-{item.product_id.toUpperCase().slice(0, 8)}
                      </td>
                      <td className="p-2.5 border border-slate-200 font-sans font-bold text-slate-900">{item.product_name}</td>
                      <td className="p-2.5 border border-slate-200 text-right font-bold text-slate-800">
                        {formatKg(qty)}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-right text-slate-700">{formatIDR(cost)}</td>
                      <td className="p-2.5 border border-slate-200 text-right font-bold text-slate-900">{formatIDR(subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={4} className="p-2.5 border border-slate-200 text-right uppercase">Subtotal Barang:</td>
                  <td colSpan={2} className="p-2.5 border border-slate-200 text-right font-mono font-bold text-slate-900">{formatIDR(calculatedTotal)}</td>
                </tr>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={4} className="p-2.5 border border-slate-200 text-right uppercase">PPN (11%):</td>
                  <td colSpan={2} className="p-2.5 border border-slate-200 text-right font-mono font-bold text-slate-900">{formatIDR(ppn)}</td>
                </tr>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-350">
                  <td colSpan={4} className="p-2.5 border border-slate-200 text-right uppercase text-blue-900">Total Tagihan (Grand Total):</td>
                  <td colSpan={2} className="p-2.5 border border-slate-200 text-right font-mono text-sm text-blue-900">{formatIDR(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Terms and Sign-off */}
          <div className="space-y-4 pt-2">
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block uppercase tracking-wider text-[10px]">Ketentuan &amp; Syarat Pengadaan:</span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li>Barang harus dikirimkan sesuai dengan spesifikasi dan standar Certificate of Analysis (CoA) yang disepakati.</li>
                <li>Setiap drum / botol wajib memiliki nomor Lot / Batch dan tanggal kedaluwarsa (Expiry Date) yang jelas.</li>
                <li>Dokumen Surat Jalan dan Faktur resmi wajib disertakan saat pengiriman barang ke warehouse {warehouseAddress}.</li>
              </ul>
            </div>

            <div className="pt-4 grid grid-cols-2 gap-12 text-center text-xs">
              <div className="flex flex-col justify-between h-28">
                <span className="font-bold text-slate-700 uppercase">Dikonfirmasi Oleh Vendor:</span>
                <span className="font-bold text-slate-800 border-t border-slate-300 pt-1 w-48 mx-auto">
                  {po.distributor_name}
                </span>
              </div>
              <div className="flex flex-col justify-between h-28">
                <span className="font-bold text-slate-700 uppercase">Disetujui Oleh:</span>
                <span className="font-bold text-slate-800 border-t border-slate-300 pt-1 w-56 mx-auto uppercase">
                  {companyName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
