'use client';

import React from 'react';
import { X, Printer, Tag, MapPin, Package } from 'lucide-react';
import { formatKg } from '@/lib/utils';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  companyConfig?: any;
}

export function PrintLabelModal({ isOpen, onClose, order, companyConfig }: PrintLabelModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const companyName = companyConfig?.company_name || 'PT Artaroma Jayatama';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] print:shadow-none print:border-none print:max-w-none print:my-0 print:max-h-none print:rounded-none">
        {/* Header Bar - Hidden during print */}
        <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm">Cetak Label Produk (Drum & Jerigen)</h3>
              <p className="text-[11px] text-slate-400">Order: {order.so_number} &bull; {order.customer_company}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" /> Cetak Label Produk
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 print:p-0">
          <div className="print:hidden text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
            ℹ️ Setiap varian kemasan dalam pesanan ini akan dicetak sebagai label identitas produk yang ditempelkan pada Drum / Jerigen sebelum diserahkan ke kurir.
          </div>

          <div className="space-y-6">
            {order.items && order.items.map((item: any, idx: number) => {
              const assignedBatch = item.assigned_batches && item.assigned_batches[0] ? item.assigned_batches[0].batch_number : 'LOT-2026-FEFO';
              const prodName = item.product_name || 'Varian Produk Fragrance Oil';
              
              return (
                <div 
                  key={item.id || idx}
                  className="border-2 border-dashed border-slate-800 rounded-xl p-5 bg-white space-y-4 print:border-2 print:border-solid print:border-black print:break-inside-avoid print:mb-6"
                >
                  {/* Label Header */}
                  <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://artaroma.co.id/wp-content/uploads/2022/09/bibit-parfum-laundry.png"
                        alt="Artaroma Logo"
                        className="h-7 object-contain"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold tracking-widest text-slate-500 block uppercase">ORIGINAL FRAGRANCE OIL</span>
                      <span className="text-xs font-mono font-bold text-slate-900">{order.so_number}</span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Nama Varian Produk:</div>
                    <div className="text-xl font-black text-slate-900 tracking-tight">{prodName}</div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 print:bg-gray-100">
                        <div className="text-[9px] text-slate-500 uppercase font-bold">Kuantitas / Berat Netto:</div>
                        <div className="text-lg font-black font-mono text-blue-900">{formatKg(item.qty_kg)}</div>
                      </div>
                      <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 print:bg-gray-100">
                        <div className="text-[9px] text-slate-500 uppercase font-bold">Nomor Batch FEFO:</div>
                        <div className="text-lg font-black font-mono text-amber-900">{assignedBatch}</div>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Caution Footer */}
                  <div className="border-t border-slate-300 pt-3 text-[11px] flex justify-between items-end">
                    <div>
                      <div className="text-[9px] text-slate-500 font-semibold">Tujuan Pemesan (B2B):</div>
                      <div className="font-bold text-slate-800">{order.customer_company}</div>
                    </div>
                    <div className="text-right text-[9px] text-slate-500">
                      <div className="font-semibold text-slate-700 uppercase">{companyName}</div>
                      <div>Simpan di tempat sejuk &amp; terhindar matahari langsung</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
