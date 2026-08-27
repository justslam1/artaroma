'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Tag,
  Package,
  QrCode,
  ShieldAlert,
  Sparkles,
  Sliders,
  Check,
  CheckSquare,
  Square,
  Flame,
  Sun,
  ThermometerSnowflake,
  Droplets,
  Layers,
  Copy,
  FileSpreadsheet,
} from 'lucide-react';
import { formatKg, formatDate } from '@/lib/utils';

export type LabelSizePreset = 'DRUM_25KG' | 'JERRYCAN_5KG' | 'BOTTLE_1KG' | 'SAMPLE_100G' | 'A4_SHEET';

export interface PrintableLabelItem {
  id: string;
  product_name: string;
  product_code?: string;
  pack_size_kg: number;
  quantity_units: number;
  total_kg: number;
  batch_number: string;
  mfg_date: string;
  exp_date: string;
  application?: string;
  top_note?: string;
  middle_note?: string;
  base_note?: string;
  customer_name?: string;
  so_number?: string;
}

export interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: any;
  batchItem?: any;
  customItems?: PrintableLabelItem[];
  companyConfig?: any;
}

// Generate simple deterministic barcode line patterns from a string
function generateBarcodeLines(code: string) {
  const seed = (code || 'ARTAROMA-2026')
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pattern: number[] = [];
  for (let i = 0; i < 38; i++) {
    const val = ((seed * (i + 13) * 7) % 3) + 1; // 1, 2, or 3 px wide
    pattern.push(val);
  }
  return pattern;
}

export function PrintLabelModal({
  isOpen,
  onClose,
  order,
  batchItem,
  customItems,
  companyConfig,
}: PrintLabelModalProps) {
  // Label Customization States
  const [selectedSize, setSelectedSize] = useState<LabelSizePreset>('DRUM_25KG');
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showNotes, setShowNotes] = useState<boolean>(true);
  const [showCustomer, setShowCustomer] = useState<boolean>(true);
  const [showSafety, setShowSafety] = useState<boolean>(true);
  const [customCopies, setCustomCopies] = useState<number>(1);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Company Profile Fallbacks
  const companyName = companyConfig?.company_name || 'PT Artaroma Jayatama';
  const companyTagline = companyConfig?.company_tagline || 'B2B Fragrance Oil Supplier & Management Hub';
  const companyAddress = companyConfig?.warehouse_address || 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272';
  const whatsappNumber = companyConfig?.whatsapp_number || '+62 852-2518-4422';

  // Normalize order/batch/custom items into a unified list of printable items
  const labelItems: PrintableLabelItem[] = useMemo(() => {
    if (customItems && customItems.length > 0) {
      return customItems;
    }

    if (batchItem) {
      const todayStr = new Date().toISOString().split('T')[0];
      const twoYearsLater = new Date();
      twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
      const expStr = twoYearsLater.toISOString().split('T')[0];

      return [
        {
          id: batchItem.id || 'batch-single',
          product_name: batchItem.product_name || 'Fragrance Oil Concentrate',
          product_code: batchItem.product_code || batchItem.sku || 'FO-GEN-001',
          pack_size_kg: Number(batchItem.package_size || batchItem.pack_size_kg || 25),
          quantity_units: 1,
          total_kg: Number(batchItem.stock_kg || batchItem.current_stock || 25),
          batch_number: batchItem.batch_number || 'LOT-2026-FEFO',
          mfg_date: batchItem.mfg_date || batchItem.received_date || todayStr,
          exp_date: batchItem.expiry_date || batchItem.exp_date || expStr,
          application: batchItem.application || 'Fine Fragrance & Industrial Formulation',
          top_note: batchItem.top_note || 'Citrus, Fresh Ozone',
          middle_note: batchItem.middle_note || 'Floral, Jasmine, Lily',
          base_note: batchItem.base_note || 'Amber, White Musk, Cedarwood',
          customer_name: 'Stok Gudang / Internal FEFO',
          so_number: 'BATCH-STOCK',
        },
      ];
    }

    if (order && Array.isArray(order.items) && order.items.length > 0) {
      const todayStr = order.order_date ? order.order_date.split('T')[0] : new Date().toISOString().split('T')[0];
      const twoYearsLater = new Date();
      twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
      const expStr = twoYearsLater.toISOString().split('T')[0];

      return order.items.map((item: any, idx: number) => {
        const assignedBatch =
          item.assigned_batches && item.assigned_batches[0]
            ? item.assigned_batches[0].batch_number
            : `BATCH-${order.so_number || 'SO'}-${idx + 1}`;
        const qtyKg = Number(item.qty_kg || item.quantity || 1);
        const packSize = Number(item.pack_size_kg || (qtyKg >= 25 ? 25 : qtyKg >= 5 ? 5 : qtyKg >= 1 ? 1 : 0.1));
        const units = Math.max(1, Math.round(qtyKg / packSize));

        return {
          id: item.id || `so-item-${idx}`,
          product_name: item.product_name || item.name || 'Original Fragrance Oil',
          product_code: item.product_code || item.sku || `FO-VAR-${idx + 1}`,
          pack_size_kg: packSize,
          quantity_units: units,
          total_kg: qtyKg,
          batch_number: assignedBatch,
          mfg_date: todayStr,
          exp_date: item.exp_date || expStr,
          application: item.application || (packSize >= 25 ? 'Industrial Grade' : 'Fine Fragrance & Homecare'),
          top_note: item.top_note || 'Top Accord, Citrus Fresh',
          middle_note: item.middle_note || 'Heart Note, Balanced Floral',
          base_note: item.base_note || 'Base Woods, White Musk',
          customer_name: order.customer_company || order.customer_name || 'Customer B2B',
          so_number: order.so_number || 'SO-2026',
        };
      });
    }

    return [];
  }, [order, batchItem, customItems]);

  // Initial selection of all items when modal opens
  React.useEffect(() => {
    if (labelItems.length > 0) {
      setSelectedItemIds(labelItems.map((i) => i.id));
    }
  }, [labelItems]);

  if (!isOpen) return null;

  const toggleSelectItem = (id: string) => {
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter((item) => item !== id));
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.length === labelItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(labelItems.map((i) => i.id));
    }
  };

  const filteredItems = labelItems.filter((i) => selectedItemIds.includes(i.id));

  // Handle direct print
  const handlePrint = () => {
    window.print();
  };

  // Get container class depending on label preset
  const getLabelDimensionClass = () => {
    switch (selectedSize) {
      case 'DRUM_25KG':
        return 'w-[420px] min-h-[580px] p-6 text-sm'; // 100x150 mm
      case 'JERRYCAN_5KG':
        return 'w-[380px] min-h-[440px] p-5 text-xs'; // 100x100 mm
      case 'BOTTLE_1KG':
        return 'w-[320px] min-h-[380px] p-4 text-[11px]'; // 75x100 mm
      case 'SAMPLE_100G':
        return 'w-[260px] min-h-[220px] p-3 text-[10px]'; // 50x35 mm
      case 'A4_SHEET':
      default:
        return 'w-[360px] min-h-[460px] p-4 text-xs';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-4 flex flex-col max-h-[95vh] print:shadow-none print:border-none print:max-w-none print:my-0 print:max-h-none print:rounded-none animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar - Hidden during print */}
        <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between text-white shrink-0 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Cetak Stiker Label Kemasan Siap Tempel
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  Standar Industri FEFO
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {order ? `Pesanan: ${order.so_number} • ${order.customer_company || order.customer_name}` : 'Label Identitas Kemasan & Batch'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              disabled={filteredItems.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl inline-flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" /> Cetak Label Sekarang
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
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Ukuran Stiker:
              </span>
              <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                {[
                  { id: 'DRUM_25KG' as LabelSizePreset, label: '🛢️ Drum 25 Kg (10x15cm)' },
                  { id: 'JERRYCAN_5KG' as LabelSizePreset, label: '🧴 Jerigen 5 Kg (10x10cm)' },
                  { id: 'BOTTLE_1KG' as LabelSizePreset, label: '🧪 Botol 1 Kg (7.5x10cm)' },
                  { id: 'SAMPLE_100G' as LabelSizePreset, label: '🏷️ Tester 100g (5x3.5cm)' },
                  { id: 'A4_SHEET' as LabelSizePreset, label: '📄 Lembar A4 (Multi-Grid)' },
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

            {/* Copies per item */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Copy className="w-3.5 h-3.5 text-slate-500" /> Lembar / Unit:
              </span>
              <select
                value={customCopies}
                onChange={(e) => setCustomCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value={1}>1 Label per Unit</option>
                <option value={2}>2 Label (Depan &amp; Belakang)</option>
                <option value={3}>3 Label</option>
                <option value={4}>4 Label</option>
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
                checked={showQrCode}
                onChange={(e) => setShowQrCode(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>QR Code Verifikasi</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={showBarcode}
                onChange={(e) => setShowBarcode(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Barcode Batch</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={showNotes}
                onChange={(e) => setShowNotes(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Profil Aroma (Notes)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={showCustomer}
                onChange={(e) => setShowCustomer(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Tujuan Pemesan (B2B)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={showSafety}
                onChange={(e) => setShowSafety(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Petunjuk Safety &amp; Penyimpanan</span>
            </label>
          </div>

          {/* Item Selector Chips */}
          {labelItems.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/80">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="font-bold text-blue-700 hover:text-blue-900 cursor-pointer text-[11px] underline mr-1"
              >
                {selectedItemIds.length === labelItems.length ? 'Batal Pilih Semua' : 'Pilih Semua Item'}
              </button>
              {labelItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSelectItem(item.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-slate-100 text-slate-500 border-slate-200 line-through opacity-60'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3 text-blue-600" /> : <X className="w-3 h-3 text-slate-400" />}
                    <span>{item.product_name} ({formatKg(item.pack_size_kg)})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Printable Preview Area */}
        <div className="p-6 overflow-y-auto space-y-6 print:p-0 print:overflow-visible bg-slate-100/60">
          <div className="print:hidden text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5">
            <Package className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900">
                Pratinjau Stiker Label ({filteredItems.reduce((acc, curr) => acc + (curr.quantity_units || 1) * customCopies, 0)} Total Lembar Siap Cetak):
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Stiker ini dirancang untuk dicetak pada kertas stiker thermal (100x150mm, 100x100mm, 75x100mm) atau kertas HVS/stiker lembaran A4. Gunakan opsi &quot;Cetak Label Sekarang&quot; untuk langsung mengirim ke printer.
              </p>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-bold text-sm">Tidak ada varian item yang dipilih untuk dicetak.</p>
            </div>
          ) : (
            <div className={`grid gap-6 justify-center ${selectedSize === 'A4_SHEET' ? 'grid-cols-1 md:grid-cols-2 print:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 print:grid-cols-1'}`}>
              {filteredItems.map((item, itemIdx) => {
                // Generate multiple copies if requested
                const totalUnits = Math.max(1, item.quantity_units || 1);
                const copiesToRender = Array.from({ length: totalUnits * customCopies });
                const barcodeLines = generateBarcodeLines(`${item.batch_number}-${item.product_code}`);

                return copiesToRender.map((_, copyIdx) => {
                  const unitNum = Math.floor(copyIdx / customCopies) + 1;

                  return (
                    <div
                      key={`${item.id}-unit-${copyIdx}`}
                      className={`bg-white border-2 border-slate-900 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between mx-auto print:shadow-none print:rounded-none print:border-2 print:border-black print:break-inside-avoid print:page-break-after-always print:m-0 ${getLabelDimensionClass()}`}
                      style={{
                        pageBreakAfter: selectedSize === 'A4_SHEET' ? 'auto' : 'always',
                        breakAfter: selectedSize === 'A4_SHEET' ? 'auto' : 'page',
                      }}
                    >
                      {/* Top Header Branding */}
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
                              <span className="font-black text-slate-900 tracking-tight text-xs block">ARTAROMA</span>
                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">FRAGRANCE HUB</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] font-extrabold tracking-widest text-slate-600 block uppercase">
                              ORIGINAL CONCENTRATE
                            </span>
                            <span className="text-[10px] font-mono font-bold text-blue-800 block">
                              {item.so_number} {totalUnits > 1 ? `(${unitNum}/${totalUnits})` : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Main Product Name & Code */}
                      <div className="py-3 space-y-2 border-b border-slate-200">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                              Varian Bibit Parfum:
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight uppercase">
                              {item.product_name}
                            </h2>
                          </div>
                          {item.product_code && (
                            <span className="bg-slate-900 text-white font-mono font-extrabold text-[10px] px-2 py-0.5 rounded shrink-0">
                              {item.product_code}
                            </span>
                          )}
                        </div>

                        {/* Olfactory Pyramid Notes */}
                        {showNotes && (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1 text-[10px]">
                            <div className="flex items-center justify-between text-slate-500 font-bold border-b border-slate-200/60 pb-0.5">
                              <span className="flex items-center gap-1 text-slate-700">
                                <Sparkles className="w-3 h-3 text-amber-500" /> Profil Karakter Aroma:
                              </span>
                              <span className="text-blue-700 uppercase font-mono text-[9px]">{item.application || 'Fine Fragrance'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-[9px] pt-0.5">
                              <div>
                                <span className="font-bold text-slate-400 block">TOP:</span>
                                <span className="text-slate-800 font-medium truncate block">{item.top_note || '-'}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-400 block">MID:</span>
                                <span className="text-slate-800 font-medium truncate block">{item.middle_note || '-'}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-400 block">BASE:</span>
                                <span className="text-slate-800 font-medium truncate block">{item.base_note || '-'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Weight, Batch & Expiry Matrix */}
                      <div className="py-2.5 grid grid-cols-2 gap-2">
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl flex flex-col justify-between">
                          <span className="text-[9px] uppercase font-bold text-slate-300">BERAT NETTO (NET WEIGHT):</span>
                          <span className="text-xl font-black font-mono tracking-tight text-amber-400 mt-1">
                            {formatKg(item.pack_size_kg)}
                          </span>
                          <span className="text-[8px] text-slate-400">Pure Grade Concentrated Oil</span>
                        </div>

                        <div className="bg-slate-100 border border-slate-300 p-2.5 rounded-xl flex flex-col justify-between text-slate-800">
                          <div>
                            <span className="text-[8px] uppercase font-bold text-slate-500 block">NO. BATCH FEFO:</span>
                            <span className="text-sm font-black font-mono text-slate-900 block truncate">
                              {item.batch_number}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] pt-1 border-t border-slate-200 mt-1 font-mono">
                            <div>
                              <span className="text-slate-400 block text-[7px]">MFG DATE:</span>
                              <span className="font-bold">{item.mfg_date}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 block text-[7px]">EXP DATE:</span>
                              <span className="font-extrabold text-red-600">{item.exp_date}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Barcode & QR Code Section */}
                      {(showBarcode || showQrCode) && (
                        <div className="py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                          {showBarcode && (
                            <div className="flex-1 overflow-hidden">
                              <div className="h-7 flex items-end gap-0.5 justify-start">
                                {barcodeLines.map((w, bIdx) => (
                                  <div
                                    key={bIdx}
                                    className="bg-black h-full"
                                    style={{ width: `${w}px` }}
                                  />
                                ))}
                              </div>
                              <span className="font-mono text-[8px] tracking-widest text-slate-500 block mt-0.5">
                                *{item.batch_number}*
                              </span>
                            </div>
                          )}

                          {showQrCode && (
                            <div className="flex items-center gap-2 shrink-0 border-l border-slate-200 pl-3">
                              {/* Vector QR Representation */}
                              <div className="w-11 h-11 bg-white border border-slate-900 p-1 rounded flex flex-col justify-between">
                                <div className="flex justify-between">
                                  <div className="w-3 h-3 bg-black border border-white" />
                                  <div className="w-1.5 h-1.5 bg-black" />
                                  <div className="w-3 h-3 bg-black border border-white" />
                                </div>
                                <div className="flex justify-center gap-0.5">
                                  <div className="w-1.5 h-1.5 bg-black" />
                                  <div className="w-1.5 h-1.5 bg-black" />
                                </div>
                                <div className="flex justify-between items-end">
                                  <div className="w-3 h-3 bg-black border border-white" />
                                  <div className="w-2 h-2 bg-black" />
                                </div>
                              </div>
                              <div className="text-[8px] text-slate-500 leading-tight">
                                <span className="font-bold text-slate-700 block">SCAN QR</span>
                                <span>Verifikasi Keaslian</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Customer B2B Destination */}
                      {showCustomer && item.customer_name && (
                        <div className="pt-2 text-[10px] text-slate-700 border-t border-slate-200 flex justify-between items-center">
                          <span className="font-semibold text-slate-500 text-[9px]">Tujuan Pemesan (Customer B2B):</span>
                          <span className="font-bold text-slate-900 truncate max-w-[200px]">
                            {item.customer_name}
                          </span>
                        </div>
                      )}

                      {/* Safety & Storage Caution Icons */}
                      {showSafety && (
                        <div className="pt-2 text-[8px] text-slate-600 border-t border-slate-200 grid grid-cols-3 gap-1">
                          <div className="flex items-center gap-1">
                            <ThermometerSnowflake className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>Simpan di bawah 25°C</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Sun className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Hindari sinar matahari</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Droplets className="w-3 h-3 text-slate-700 shrink-0" />
                            <span>Industrial Use Only</span>
                          </div>
                        </div>
                      )}

                      {/* Bottom Footer Distributor Info */}
                      <div className="border-t-2 border-slate-900 pt-2 text-[8px] text-slate-500 flex justify-between items-end">
                        <div>
                          <span className="font-black text-slate-800 uppercase block">{companyName}</span>
                          <span className="block truncate max-w-[220px]">{companyAddress}</span>
                        </div>
                        <div className="text-right font-mono text-slate-700 font-bold">
                          <span>WA CS: {whatsappNumber}</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
