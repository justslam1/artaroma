'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  MapPin,
  Building2,
  User,
  Phone,
  Truck,
  Package,
  Sparkles,
  Sliders,
  Check,
  Copy,
  Layers,
  ShieldAlert,
  Sun,
  ThermometerSnowflake,
  AlertTriangle,
  ArrowUp,
  Glasses,
  QrCode,
} from 'lucide-react';
import { formatKg, formatDate } from '@/lib/utils';

export type ShippingLabelSize = 'THERMAL_100x150' | 'SQUARE_100x100' | 'COMPACT_75x100' | 'A4_SHEET';

interface PrintShippingAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  companyConfig?: any;
}

// Generate simple deterministic barcode line patterns from a string
function generateBarcodeLines(code: string) {
  const seed = (code || 'SO-2026')
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pattern: number[] = [];
  for (let i = 0; i < 42; i++) {
    const val = ((seed * (i + 7) * 5) % 3) + 1;
    pattern.push(val);
  }
  return pattern;
}

export function PrintShippingAddressModal({
  isOpen,
  onClose,
  order,
  companyConfig,
}: PrintShippingAddressModalProps) {
  // Label Customization States
  const [selectedSize, setSelectedSize] = useState<ShippingLabelSize>('THERMAL_100x150');
  const [totalKoli, setTotalKoli] = useState<number>(1);
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [showItemsList, setShowItemsList] = useState<boolean>(true);
  const [showHandling, setShowHandling] = useState<boolean>(true);
  const [showSender, setShowSender] = useState<boolean>(true);

  // Initialize total koli from order items or packaging count if available
  React.useEffect(() => {
    if (order && Array.isArray(order.items) && order.items.length > 0) {
      const estimatedUnits = order.items.reduce((acc: number, it: any) => {
        const qty = Number(it.qty_kg || 1);
        const pSize = Number(it.pack_size_kg || (qty >= 25 ? 25 : qty >= 5 ? 5 : 1));
        return acc + Math.max(1, Math.round(qty / pSize));
      }, 0);
      setTotalKoli(Math.max(1, estimatedUnits));
    } else {
      setTotalKoli(1);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const companyName = companyConfig?.company_name || 'PT Artaroma Jayatama';
  const warehouseAddress = companyConfig?.warehouse_address || 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272';
  const warehousePhone = companyConfig?.phone || '(024) 7692-8800';
  const whatsappNumber = companyConfig?.whatsapp_number || '+62 852-2518-4422';

  const totalKg = (order.items || []).reduce((acc: number, it: any) => acc + Number(it.qty_kg || 0), 0);
  const hasCoords = order.shipping_lat && order.shipping_lng;
  const barcodeLines = generateBarcodeLines(order.so_number || 'SO-2026');

  // Dimension classes for print preview
  const getContainerDimensionClass = () => {
    switch (selectedSize) {
      case 'THERMAL_100x150':
        return 'w-[440px] min-h-[580px] p-6 text-xs'; // 100x150 mm
      case 'SQUARE_100x100':
        return 'w-[380px] min-h-[420px] p-5 text-xs'; // 100x100 mm
      case 'COMPACT_75x100':
        return 'w-[320px] min-h-[380px] p-4 text-[11px]'; // 75x100 mm
      case 'A4_SHEET':
      default:
        return 'w-[420px] min-h-[520px] p-5 text-xs';
    }
  };

  const koliList = Array.from({ length: Math.max(1, totalKoli) }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-4 flex flex-col max-h-[95vh] print:shadow-none print:border-none print:max-w-none print:my-0 print:max-h-none print:rounded-none animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar - Hidden during print */}
        <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between text-white shrink-0 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Cetak Stiker Label Alamat Pengiriman
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  B2B Cargo &amp; Dispatch
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                SO: {order.so_number} &bull; {order.customer_company || order.customer_name} &bull; Total: {formatKg(totalKg)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl inline-flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak Label Alamat
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Customization Controls - Hidden during print */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 space-y-3 shrink-0 print:hidden text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Preset Ukuran Label */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Format Stiker:
              </span>
              <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                {[
                  { id: 'THERMAL_100x150' as ShippingLabelSize, label: '📦 Thermal Cargo 100x150 mm (A6)' },
                  { id: 'SQUARE_100x100' as ShippingLabelSize, label: '🏷️ Persegi 100x100 mm' },
                  { id: 'COMPACT_75x100' as ShippingLabelSize, label: '✉️ Kompak 75x100 mm' },
                  { id: 'A4_SHEET' as ShippingLabelSize, label: '📄 Lembar A4 (Grid)' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedSize(preset.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedSize === preset.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Koli / Paket */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-slate-500" /> Jumlah Koli / Dus:
              </span>
              <select
                value={totalKoli}
                onChange={(e) => setTotalKoli(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((num) => (
                  <option key={num} value={num}>
                    {num} Koli {num > 1 ? `(Cetak ${num} Lembar)` : '(1 Dus / Drum)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-200/80 text-[11px] text-slate-600">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-slate-500" /> Elemen Stiker:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={showBarcode}
                onChange={(e) => setShowBarcode(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Barcode SO / Resi</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={showQrCode}
                onChange={(e) => setShowQrCode(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>QR Code Maps / Lacak</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={showItemsList}
                onChange={(e) => setShowItemsList(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Ringkasan Isi Varian (Packing List)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={showHandling}
                onChange={(e) => setShowHandling(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Ikon Fragile &amp; Handling</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={showSender}
                onChange={(e) => setShowSender(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Data Pengirim (Sender)</span>
            </label>
          </div>
        </div>

        {/* Printable Preview Area */}
        <div className="p-6 overflow-y-auto space-y-6 print:p-0 print:overflow-visible bg-slate-100/60">
          <div className="print:hidden text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5">
            <Truck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900">
                Pratinjau Stiker Alamat Pengiriman ({totalKoli} Lembar Koli Siap Cetak):
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Stiker ini dirancang untuk dicetak pada kertas stiker thermal (100x150mm / A6) atau printer HVS/stiker lembaran A4. Setiap lembar memiliki nomor urut koli otomatis (misal: Koli 1 dari {totalKoli}).
              </p>
            </div>
          </div>

          <div
            className={`grid gap-6 justify-center ${
              selectedSize === 'A4_SHEET'
                ? 'grid-cols-1 md:grid-cols-2 print:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 print:grid-cols-1'
            }`}
          >
            {koliList.map((koliNumber) => (
              <div
                key={`koli-${koliNumber}`}
                className={`bg-white border-2 border-slate-900 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between mx-auto print:shadow-none print:rounded-none print:border-2 print:border-black print:break-inside-avoid print:page-break-after-always print:m-0 ${getContainerDimensionClass()}`}
                style={{
                  pageBreakAfter: selectedSize === 'A4_SHEET' ? 'auto' : 'always',
                  breakAfter: selectedSize === 'A4_SHEET' ? 'auto' : 'page',
                }}
              >
                {/* 1. Header / Logo / Logistics Dispatch */}
                <div className="border-b-2 border-slate-900 pb-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://artaroma.co.id/wp-content/uploads/2022/09/bibit-parfum-laundry.png"
                        alt="Artaroma Logo"
                        className="h-7 object-contain"
                      />
                      <div className="leading-tight">
                        <span className="font-black text-slate-900 tracking-tight text-xs block uppercase">
                          {companyName}
                        </span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">
                          EXPEDITION &amp; CARGO DISPATCH
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="bg-slate-900 text-white font-mono font-black text-xs px-2.5 py-0.5 rounded">
                        {order.so_number}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-bold text-slate-700">
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 rounded font-mono">
                          KOLI: {koliNumber}/{totalKoli}
                        </span>
                        <span>Berat: <strong>{formatKg(totalKg)}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Primary Recipient Box (PENERIMA / DELIVER TO) */}
                <div className="my-2.5 bg-slate-50 border-2 border-slate-900 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                    <span className="bg-blue-700 text-white font-black text-[9px] px-2 py-0.5 rounded tracking-wider uppercase">
                      PENERIMA (DELIVER TO):
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-600">
                      ID: {order.customer_id || 'CUST-B2B'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                      {order.customer_company || order.customer_name}
                    </h2>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-800 font-bold text-xs">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-blue-700" /> UP: {order.customer_name || 'Bagian Pembelian / Gudang'}
                      </span>
                      {order.customer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-emerald-700" /> Telp/WA: {order.customer_phone}
                        </span>
                      )}
                    </div>

                    <div className="pt-1.5">
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">
                        ALAMAT PENGIRIMAN CARGO / PABRIK / GUDANG:
                      </span>
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug mt-0.5">
                        {order.shipping_address || 'Kawasan Industri Jababeka V Blok C-12, Cikarang, Bekasi'}
                      </p>
                    </div>

                    {hasCoords && (
                      <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[9px] text-slate-600 font-mono">
                        <span>📍 GPS: {order.shipping_lat}, {order.shipping_lng}</span>
                        <span className="text-blue-700 font-semibold underline">maps.google.com</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Barcode & QR Code Strip */}
                {(showBarcode || showQrCode) && (
                  <div className="mb-2 py-1.5 px-3 bg-white border border-slate-300 rounded-xl flex items-center justify-between gap-3">
                    {showBarcode && (
                      <div className="flex-1 overflow-hidden">
                        <div className="h-6 flex items-end gap-0.5 justify-start">
                          {barcodeLines.map((w, bIdx) => (
                            <div
                              key={bIdx}
                              className="bg-black h-full"
                              style={{ width: `${w}px` }}
                            />
                          ))}
                        </div>
                        <span className="font-mono text-[8px] tracking-widest text-slate-600 block mt-0.5 font-bold">
                          *{order.so_number}*
                        </span>
                      </div>
                    )}

                    {showQrCode && (
                      <div className="flex items-center gap-2 shrink-0 border-l border-slate-200 pl-3">
                        <div className="w-9 h-9 bg-white border border-slate-900 p-0.5 rounded flex flex-col justify-between">
                          <div className="flex justify-between">
                            <div className="w-2.5 h-2.5 bg-black" />
                            <div className="w-1 h-1 bg-black" />
                            <div className="w-2.5 h-2.5 bg-black" />
                          </div>
                          <div className="flex justify-center gap-0.5">
                            <div className="w-1 h-1 bg-black" />
                          </div>
                          <div className="flex justify-between items-end">
                            <div className="w-2.5 h-2.5 bg-black" />
                            <div className="w-1.5 h-1.5 bg-black" />
                          </div>
                        </div>
                        <div className="text-[7px] text-slate-500 leading-tight">
                          <span className="font-bold text-slate-800 block">QR TRACKING</span>
                          <span>Navigasi Kurir</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Packing List / Item Breakdown Summary */}
                {showItemsList && order.items && order.items.length > 0 && (
                  <div className="mb-2 bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1 text-[10px]">
                    <div className="flex justify-between items-center text-slate-600 font-bold border-b border-slate-200 pb-0.5 text-[9px]">
                      <span className="flex items-center gap-1 uppercase">
                        <Package className="w-3 h-3 text-blue-600" /> Ringkasan Isi Varian Paket:
                      </span>
                      <span>{order.items.length} Varian</span>
                    </div>
                    <div className="max-h-16 overflow-hidden space-y-0.5 text-[9px]">
                      {order.items.slice(0, 4).map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-slate-800">
                          <span className="font-bold truncate max-w-[240px]">
                            • {it.product_name || it.name}
                          </span>
                          <span className="font-mono font-extrabold text-blue-900 shrink-0">
                            {formatKg(it.qty_kg || 0)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <div className="text-slate-400 italic text-[8px]">
                          + {order.items.length - 4} varian lainnya...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Sender (PENGIRIM) & Logistics / Courier Grid */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {showSender && (
                    <div className="border border-slate-300 rounded-xl p-2 space-y-0.5 bg-white">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">
                        PENGIRIM (SENDER):
                      </span>
                      <div className="font-extrabold text-slate-900 uppercase truncate">{companyName}</div>
                      <div className="text-slate-600 text-[9px] leading-tight line-clamp-2">
                        {warehouseAddress}
                      </div>
                      <div className="text-slate-700 text-[9px] font-mono font-semibold pt-0.5">
                        Telp: {warehousePhone}
                      </div>
                    </div>
                  )}

                  <div className={`border border-slate-300 rounded-xl p-2 space-y-0.5 bg-white ${!showSender ? 'col-span-2' : ''}`}>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">
                      ARMADA LOGISTIK / KURIR:
                    </span>
                    <div className="font-extrabold text-blue-950 uppercase truncate flex items-center gap-1">
                      <Truck className="w-3 h-3 text-blue-600" />
                      {order.courier_name || 'Kurir Internal Artaroma'}
                    </div>
                    <div className="text-slate-600 text-[9px]">
                      Layanan: <strong className="text-slate-900">{order.shipping_type || 'FRANCO'}</strong>
                    </div>
                    <div className="text-slate-600 text-[9px]">
                      Metode Bayar: <strong className="text-emerald-700">{order.payment_method || 'TEMPO 30 HARI'}</strong>
                    </div>
                  </div>
                </div>

                {/* 6. Handling & Caution Instructions */}
                {showHandling && (
                  <div className="mt-2 pt-1.5 border-t border-slate-200 grid grid-cols-4 gap-1 text-[8px] text-slate-700 font-bold text-center">
                    <div className="border border-slate-300 rounded p-1 bg-slate-50 flex flex-col items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 mb-0.5" />
                      <span>FRAGILE</span>
                    </div>
                    <div className="border border-slate-300 rounded p-1 bg-slate-50 flex flex-col items-center justify-center">
                      <ArrowUp className="w-3.5 h-3.5 text-blue-600 mb-0.5" />
                      <span>JANGAN DIBALIK</span>
                    </div>
                    <div className="border border-slate-300 rounded p-1 bg-slate-50 flex flex-col items-center justify-center">
                      <Sun className="w-3.5 h-3.5 text-amber-600 mb-0.5" />
                      <span>HINDARI PANAS</span>
                    </div>
                    <div className="border border-slate-300 rounded p-1 bg-slate-50 flex flex-col items-center justify-center">
                      <ThermometerSnowflake className="w-3.5 h-3.5 text-blue-500 mb-0.5" />
                      <span>SIMPAN SEJUK</span>
                    </div>
                  </div>
                )}

                {/* 7. Bottom Legal & Dispatch Footer */}
                <div className="mt-2 border-t-2 border-slate-900 pt-1.5 text-[8px] text-slate-500 flex justify-between items-center">
                  <span className="font-bold uppercase tracking-tight">ARTAROMA CARGO DISPATCH SYSTEM</span>
                  <span className="font-mono text-slate-700 font-bold">WA CS: {whatsappNumber}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
