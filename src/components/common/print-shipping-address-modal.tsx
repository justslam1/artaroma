'use client';

import React from 'react';
import { SalesOrder } from '@/lib/types';
import { X, Printer, MapPin, Building2, User, Phone, Truck, Package, Sparkles } from 'lucide-react';

interface PrintShippingAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  companyConfig?: any;
}

export function PrintShippingAddressModal({ isOpen, onClose, order, companyConfig }: PrintShippingAddressModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const companyName = companyConfig?.company_name || 'PT Artaroma Jayatama';
  const warehouseAddress = companyConfig?.warehouse_address || 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272';

  const totalKg = (order.items || []).reduce((acc: number, it: any) => acc + (it.qty_kg || 0), 0);
  const hasCoords = order.shipping_lat && order.shipping_lng;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto">
      {/* Modal Box Container */}
      <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 flex flex-col print:shadow-none print:border-none print:rounded-none print:m-0 print:w-full">
        {/* Action Bar (Hidden on Print) */}
        <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm">Cetak Alamat Pengiriman (Shipping Label)</h3>
              <p className="text-[11px] text-slate-400">Label Tempel Box / Drum Pengiriman Ekspedisi B2B</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Label Alamat
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg ml-2 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CONTENT AREA (Designed for Standard Shipping Label Size) */}
        <div className="p-8 space-y-6 text-slate-800 bg-white font-sans text-xs flex-1 print:p-4 print:overflow-visible">
          {/* Outer Border for Shipping Label */}
          <div className="border-2 border-slate-900 rounded-xl p-5 space-y-4">
            {/* Header / Logo */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-base text-slate-900 tracking-tight block uppercase">{companyName}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">EXPEDITION &amp; LOGISTICS DISPATCH</span>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
                  {order.so_number}
                </span>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Berat Total: <strong>{totalKg} Kg</strong></div>
              </div>
            </div>

            {/* Recipient Details (Penerima) */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded tracking-wider uppercase">
                  PENERIMA (DELIVER TO):
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">KODE: {order.customer_id}</span>
              </div>

              <div className="space-y-1 pt-1">
                <div className="text-lg font-black text-slate-900 uppercase">
                  {order.customer_company || order.customer_name}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700 font-semibold">
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-500" /> UP: {order.customer_name}</span>
                  {order.customer_phone && (
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-500" /> Telp: {order.customer_phone}</span>
                  )}
                </div>

                <div className="pt-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Alamat Pengiriman Cargo / Pabrik / Gudang:</span>
                  <p className="text-sm font-bold text-slate-800 leading-relaxed mt-0.5">
                    {order.shipping_address || 'Kawasan Industri Jababeka V Blok C-12, Cikarang, Bekasi'}
                  </p>
                </div>

                {hasCoords && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-700">📍 Koordinat GPS: {order.shipping_lat}, {order.shipping_lng}</span>
                    <span className="text-[10px] text-blue-700 font-semibold underline">maps.google.com/?q={order.shipping_lat},{order.shipping_lng}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sender & Delivery Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-300 rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">PENGIRIM (SENDER):</span>
                <div className="font-bold text-slate-900 uppercase">{companyName}</div>
                <div className="text-slate-600 text-[11px]">{warehouseAddress}</div>
                <div className="text-slate-600 text-[11px]">Telp: (024) 7692-8800</div>
              </div>

              <div className="border border-slate-300 rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">ARMADA LOGISTIK / KURIR:</span>
                <div className="font-bold text-amber-900">{order.courier_name || 'Budi Gunawan (Kurir Cargo) (B 7721 KFP)'}</div>
                <div className="text-slate-600 text-[11px]">Metode Bayar: <strong className="text-blue-800">{order.payment_method || 'TEMPO'}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
