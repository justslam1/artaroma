'use client';

import React from 'react';
import { SalesOrder } from '@/lib/types';
import { formatKg, formatDate } from '@/lib/utils';
import { X, Printer, Download, Sparkles, Building2, Truck, Calendar, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

interface SuratJalanPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder | null;
  selectedTripNumber?: number;
  companyConfig?: any;
}

export function SuratJalanPDFModal({ isOpen, onClose, order, selectedTripNumber, companyConfig }: SuratJalanPDFModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  const companyName = companyConfig?.company_name || 'PT Artaroma Jayatama';
  const companyTagline = companyConfig?.company_tagline || 'B2B Fragrance Oil Supplier & Logistics Hub';
  const warehouseAddress = companyConfig?.warehouse_address || 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272';
  const logisticsPic = companyConfig?.logistics_pic || 'Tim Gudang FEFO Engine';

  // Identify active trip
  const activeTrip = selectedTripNumber && order.shipments
    ? order.shipments.find((s: any) => s.trip_number === selectedTripNumber)
    : (order.shipments && order.shipments.length > 0 ? order.shipments[0] : null);

  const suratJalanNum = activeTrip?.surat_jalan_number || order.surat_jalan_number || `SJ-ART-2026-${order.so_number.split('-').pop() || '001'}`;

  // If specific trip items are defined, display them; otherwise fallback to full order items
  const displayItems = activeTrip?.items && activeTrip.items.length > 0
    ? activeTrip.items.map((it: any) => ({
        id: it.so_item_id || it.product_id,
        product_id: it.product_id,
        product_name: it.product_name || 'Varian Produk',
        qty_kg: it.qty_shipped_kg,
        assigned_batches: it.assigned_batches || [{ batch_number: 'LOT-2026-FEFO', qty_taken_kg: it.qty_shipped_kg }],
      }))
    : order.items;

  const totalKg = displayItems.reduce((sum: number, it: any) => sum + (Number(it.qty_kg) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto">
      {/* Modal Box Container */}
      <div className="bg-white border border-gray-200 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:m-0 print:w-full">
        {/* Header Action Bar (Hidden on Print) */}
        <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm">Dokumen Surat Jalan (SBBK Resmi)</h3>
              <p className="text-[11px] text-slate-400">Surat Bukti Barang Keluar — {suratJalanNum}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak / Print SBBK
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
                Telp: (024) 7692-8800 | Email: logistic@artaroma.co.id | NPWP: 01.987.654.3-041.000
              </p>
            </div>

            <div className="text-right space-y-1 sm:border-l border-gray-200 sm:pl-6 w-full sm:w-auto">
              <span className="bg-blue-100 text-blue-900 font-black text-base px-3 py-1 rounded inline-block tracking-wider uppercase">
                SURAT JALAN (SBBK)
              </span>
              <div className="font-mono font-bold text-sm text-slate-900">#{suratJalanNum}</div>
              <div className="text-slate-500 text-[11px]">No. Sales Order: <strong className="text-slate-700 font-mono">{order.so_number}</strong></div>
              <div className="text-slate-500 text-[11px]">Tanggal Kirim: <strong>{formatDate(order.order_date)}</strong></div>
              {activeTrip && (
                <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                  Pengiriman Multi-Trip (Trip {activeTrip.trip_number})
                </div>
              )}
            </div>
          </div>

          {/* Customer & Shipping Details Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
            {/* Customer / Destination Info */}
            <div className="space-y-1">
              <div className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> ALAMAT PENERIMA (SHIP TO):
              </div>
              <div className="font-extrabold text-sm text-slate-900">{order.customer_company || order.customer_name}</div>
              <div className="text-slate-700 font-semibold">UP: {order.customer_name}</div>
              <div className="text-slate-600">Kawasan Industri Jababeka V Blok C-12, Cikarang, Bekasi</div>
              <div className="text-slate-500">Telp: 0812-9876-5432 / (021) 8983-1122</div>
            </div>

            {/* Courier / Expedited Transport Info */}
            <div className="space-y-1 border-l border-slate-200 pl-6">
              <div className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> INFORMASI EKSPEDISI / KURIR:
              </div>
              <div className="font-bold text-slate-900">Armada Pengiriman Internal / Ekspedisi Cargo</div>
              <div className="text-slate-700 font-semibold">
                Nama Pengemudi: {order.courier_name || 'Rian Pratama (Blind Van B 9482 SXZ)'}
              </div>
              <div className="text-slate-500">Gudang Asal: {warehouseAddress}</div>
              <div className="text-slate-500">PIC Penyiapan: {logisticsPic}</div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-2">
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Rincian Barang yang Diserah-terimakan:</span>
              <span className="text-[11px] text-slate-500 font-normal">Sistem Pengeluaran: <strong className="text-blue-700 font-mono">FEFO Batch Control</strong></span>
            </div>
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <th className="p-2.5 border border-slate-700 text-center w-10">NO</th>
                  <th className="p-2.5 border border-slate-700">KODE &amp; NAMA BIBIT PARFUM</th>
                  <th className="p-2.5 border border-slate-700 text-center">NO. BATCH / LOT (FEFO)</th>
                  <th className="p-2.5 border border-slate-700 text-right w-32">KUANTITAS (KG)</th>
                  <th className="p-2.5 border border-slate-700 text-center w-32">KONDISI KEMASAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-xs">
                {displayItems.map((item: any, idx: number) => {
                  const batchesInfo = item.assigned_batches && item.assigned_batches.length > 0
                    ? item.assigned_batches.map((b: any) => `${b.batch_number} (${b.qty_taken_kg} kg)`).join(', ')
                    : 'LOT-2026-FEFO';

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="p-2.5 border border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 border border-slate-200 font-sans font-bold text-slate-900">
                        {item.product_name}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-center font-mono text-blue-800 font-bold text-[11px]">
                        {batchesInfo}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-right font-bold text-slate-900">
                        {formatKg(item.qty_kg)}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-center font-sans font-semibold text-emerald-700 text-[11px]">
                        Baik (Segel Utuh)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td colSpan={3} className="p-2.5 border border-slate-200 text-right uppercase text-blue-900">
                    Total Berat Bersih (Net Weight):
                  </td>
                  <td className="p-2.5 border border-slate-200 text-right font-mono text-sm text-blue-900 font-black">
                    {formatKg(totalKg)}
                  </td>
                  <td className="p-2.5 border border-slate-200 text-center text-slate-500 text-[11px]">
                    Siap Berangkat
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes & Verification Clause */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block uppercase tracking-wider text-[10px]">Syarat &amp; Ketentuan Penerimaan:</span>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
              <li>Barang telah diperiksa kelengkapan segel botol/drum dan spesifikasi batch sebelum diberangkatkan dari gudang.</li>
              <li>Penerima wajib melakukan pemeriksaan fisik jumlah drum/botol dan nomor batch sebelum menandatangani bukti terima.</li>
              <li>Klaim ketidaksesuaian barang harus dilaporkan maksimal dalam waktu 1x24 jam sejak barang diterima.</li>
            </ol>
          </div>

          {/* 4-Column Signature Grid */}
          <div className="pt-4 grid grid-cols-4 gap-4 text-center text-xs">
            {/* 1. Dibuat Oleh */}
            <div className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between h-36 bg-white">
              <div className="font-bold text-slate-700 text-[10px] uppercase">Dibuat Oleh (Admin):</div>
              <div className="text-[10px] text-slate-400 italic">( Tanda Tangan &amp; Cap )</div>
              <div className="border-t border-slate-300 pt-1 font-bold text-slate-800">
                Tim Admin Sales
              </div>
            </div>

            {/* 2. Disiapkan Oleh */}
            <div className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between h-36 bg-white">
              <div className="font-bold text-slate-700 text-[10px] uppercase">Disiapkan (Gudang):</div>
              <div className="text-[10px] text-slate-400 italic">( Tanda Tangan &amp; Cap )</div>
              <div className="border-t border-slate-300 pt-1 font-bold text-slate-800">
                {logisticsPic}
              </div>
            </div>

            {/* 3. Diserahkan Oleh */}
            <div className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between h-36 bg-white">
              <div className="font-bold text-slate-700 text-[10px] uppercase">Diserahkan (Kurir):</div>
              <div className="text-[10px] text-slate-400 italic">( Tanda Tangan )</div>
              <div className="border-t border-slate-300 pt-1 font-bold text-slate-800">
                {order.courier_name || 'Rian Pratama'}
              </div>
            </div>

            {/* 4. Diterima Oleh */}
            <div className="border-2 border-dashed border-blue-300 rounded-xl p-3 flex flex-col justify-between h-36 bg-blue-50/30">
              <div className="font-bold text-blue-900 text-[10px] uppercase">Diterima Oleh (Customer):</div>
              {order.received_signature ? (
                <div className="flex justify-center items-center py-1">
                  <img src={order.received_signature} alt="TTD Customer" className="max-h-12 object-contain" />
                </div>
              ) : (
                <div className="text-[10px] text-blue-500 italic">( TTD &amp; Stempel Perusahaan )</div>
              )}
              <div className="border-t border-blue-200 pt-1 font-bold text-slate-800">
                {order.received_by || order.customer_name}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
