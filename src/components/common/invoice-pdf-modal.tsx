'use client';

import React from 'react';
import { SalesOrder, Invoice } from '@/lib/types';
import { formatIDR, formatKg, formatDate } from '@/lib/utils';
import { X, Printer, Download, Sparkles, Building2, CreditCard, Calendar, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

interface InvoicePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder | null;
  invoice?: Invoice | null;
  companyConfig?: any;
}

export function InvoicePDFModal({ isOpen, onClose, order, invoice, companyConfig }: InvoicePDFModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  const companyName = companyConfig?.company_name || 'PT Artaroma Jayatama';
  const companyTagline = companyConfig?.company_tagline || 'B2B Fragrance Oil Supplier & Management Hub';
  const warehouseAddress = companyConfig?.warehouse_address || 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272';
  const primaryBank = companyConfig?.bank_accounts?.[0] || {
    bank: 'Bank Central Asia (BCA)',
    no: '882-019-3881',
    atas_nama: companyName,
  };

  const invoiceNumber = invoice?.invoice_number || `INV-ART-2026-${order.so_number.split('-').pop() || '001'}`;
  const invoiceDate = invoice?.issue_date || order.order_date || new Date().toISOString().split('T')[0];
  const dueDate = invoice?.due_date || (order.payment_method === 'TEMPO' ? '30 Hari Setelah Penerbitan (TOP)' : 'Segera (Transfer Lunas)');

  const calculatedTotal = order.items.reduce(
    (sum, it) => sum + (it.subtotal || (it.qty_kg * (it.unit_price_per_kg || 1500000))),
    0
  );
  const ppn = Math.round(calculatedTotal * 0.11);
  const grandTotal = calculatedTotal + ppn;

  const isPaid = invoice?.status === 'PAID' || order.status === 'PROSES_GUDANG' || order.status === 'DIKIRIM' || order.status === 'DITERIMA';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto">
      {/* Modal Box Container */}
      <div className="bg-white border border-gray-200 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:m-0 print:w-full">
        {/* Header Action Bar (Hidden on Print) */}
        <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm">Dokumen Invoice / Faktur Penjualan</h3>
              <p className="text-[11px] text-slate-400">Tagihan Resmi {companyName} #{invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak / Print PDF
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

        {/* PRINTABLE PDF CONTENT AREA */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-800 bg-white font-sans text-xs flex-1 print:p-6 print:overflow-visible relative">
          {/* Status Stamp if Paid */}
          {isPaid && (
            <div className="absolute top-28 right-12 border-4 border-emerald-600 text-emerald-700 font-black text-xl px-4 py-1.5 rounded-xl uppercase tracking-widest rotate-[-12deg] opacity-80 pointer-events-none print:opacity-100">
              LUNAS / PAID
            </div>
          )}

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
                Telp: (024) 7692-8800 | Email: finance@artaroma.co.id | NPWP: 01.987.654.3-041.000
              </p>
            </div>

            <div className="text-right space-y-1 sm:border-l border-gray-200 sm:pl-6 w-full sm:w-auto">
              <span className="bg-slate-900 text-white font-black text-base px-3 py-1 rounded inline-block tracking-wider uppercase">
                FAKTUR PENJUALAN
              </span>
              <div className="font-mono font-bold text-sm text-blue-900">#{invoiceNumber}</div>
              <div className="text-slate-500 text-[11px]">Tanggal Faktur: <strong>{formatDate(invoiceDate)}</strong></div>
              <div className="text-slate-500 text-[11px]">Jatuh Tempo: <strong className="text-slate-800">{dueDate}</strong></div>
              <div className="text-slate-500 text-[11px]">Ref SO: <strong className="font-mono text-blue-800">{order.so_number}</strong></div>
            </div>
          </div>

          {/* Customer & Billing Terms Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
            {/* Bill To Customer */}
            <div className="space-y-1">
              <div className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> DITAGIHKAN KEPADA (CUSTOMER B2B):
              </div>
              <div className="font-extrabold text-sm text-slate-900">{order.customer_company || order.customer_name}</div>
              <div className="text-slate-700 font-semibold">PIC: {order.customer_name}</div>
              <div className="text-slate-500">Kawasan Industri Jababeka V Blok C-12, Cikarang, Bekasi</div>
              <div className="text-slate-500">NPWP: 02.881.921.4-412.000</div>
            </div>

            {/* Payment Bank Details */}
            <div className="space-y-1 border-l border-slate-200 pl-6">
              <div className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> INFORMASI REKENING PEMBAYARAN:
              </div>
              <div className="font-bold text-slate-900">{primaryBank.bank}</div>
              <div className="font-mono font-bold text-blue-800 text-sm">{primaryBank.no}</div>
              <div className="text-slate-600 font-medium">a.n. {primaryBank.atas_nama || companyName}</div>
              <div className="text-slate-400 text-[10px] pt-0.5">Harap cantumkan No. Invoice pada berita transfer</div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-2">
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Rincian Barang &amp; Layanan:
            </div>
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <th className="p-2.5 border border-slate-700 text-center w-12">NO</th>
                  <th className="p-2.5 border border-slate-700">KODE BARANG</th>
                  <th className="p-2.5 border border-slate-700">DESKRIPSI VARIAN BIBIT PARFUM</th>
                  <th className="p-2.5 border border-slate-700 text-right">KUANTITAS (KG)</th>
                  <th className="p-2.5 border border-slate-700 text-right">HARGA SATUAN (IDR)</th>
                  <th className="p-2.5 border border-slate-700 text-right">TOTAL (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-xs">
                {order.items.map((item, idx) => {
                  const price = item.unit_price_per_kg || 1500000;
                  const qty = item.qty_kg;
                  const subtotal = qty * price;
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
                      <td className="p-2.5 border border-slate-200 text-right text-slate-700">{formatIDR(price)}</td>
                      <td className="p-2.5 border border-slate-200 text-right font-bold text-slate-900">{formatIDR(subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={4} className="p-2.5 border border-slate-200 text-right uppercase">Subtotal:</td>
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

          {/* Payment Status Bar */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <div>
                <span className="font-bold text-slate-800">Status Pembayaran: </span>
                <span className={`font-extrabold uppercase ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isPaid ? 'LUNAS (TERVERIFIKASI)' : 'MENUNGGU PEMBAYARAN'}
                </span>
              </div>
            </div>
            <div className="text-slate-500 font-medium">Metode: <strong className="text-slate-800 uppercase">{order.payment_method}</strong></div>
          </div>

          {/* Sign-off Section */}
          <div className="pt-4 grid grid-cols-2 gap-12 text-center text-xs">
            <div className="flex flex-col justify-between h-24">
              <span className="font-bold text-slate-700 uppercase">Diterima Oleh (Customer):</span>
              <span className="font-bold text-slate-800 border-t border-slate-300 pt-1 w-48 mx-auto">
                {order.customer_name}
              </span>
            </div>
            <div className="flex flex-col justify-between h-24">
              <span className="font-bold text-slate-700 uppercase">Hormat Kami (Finance &amp; Accounting):</span>
              <span className="font-bold text-slate-800 border-t border-slate-300 pt-1 w-56 mx-auto uppercase">
                {companyName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
