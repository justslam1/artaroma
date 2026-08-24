'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Percent,
  Coins,
  Search,
  Filter,
  Check,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Product } from '@/lib/types';

interface BulkPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  applicationCategories: string[];
  usdRate: number;
  onSuccess: () => void;
}

type ScopeType = 'ALL' | 'CATEGORY' | 'SELECTED';
type DirectionType = 'INCREASE' | 'DECREASE';
type UnitType = 'PERCENT' | 'FIXED_IDR';
type RoundingType = 'NONE' | '1000' | '5000' | '10000';

interface SimulatedItem {
  productId: string;
  variantId?: string;
  variantSku: string;
  productName: string;
  application: string;
  packSizeKg: number;
  oldPriceIdr: number;
  newPriceIdr: number;
  diffIdr: number;
  diffPercent: number;
  selected: boolean;
}

export default function BulkPriceModal({
  isOpen,
  onClose,
  products,
  applicationCategories,
  usdRate,
  onSuccess,
}: BulkPriceModalProps) {
  // Config states
  const [scope, setScope] = useState<ScopeType>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    applicationCategories[0] || 'Fine Fragrance'
  );
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [targetPackSize, setTargetPackSize] = useState<string>('ALL'); // 'ALL', '25', '5', '1'
  const [direction, setDirection] = useState<DirectionType>('INCREASE');
  const [unit, setUnit] = useState<UnitType>('PERCENT');
  const [valueInput, setValueInput] = useState<number>(5);
  const [rounding, setRounding] = useState<RoundingType>('1000');
  const [reason, setReason] = useState<string>('Penyesuaian Berkala / Inflasi');

  // Interactive live table states
  const [excludedSkus, setExcludedSkus] = useState<string[]>([]);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Filtered products based on scope
  const targetProducts = useMemo(() => {
    if (scope === 'ALL') return products;
    if (scope === 'CATEGORY') {
      return products.filter((p) => {
        const app = (p.applications && p.applications.length > 0 ? p.applications[0] : p.application) || 'Fine Fragrance';
        return app.toLowerCase() === selectedCategory.toLowerCase();
      });
    }
    if (scope === 'SELECTED') {
      return products.filter((p) => selectedProductIds.includes(p.id));
    }
    return products;
  }, [products, scope, selectedCategory, selectedProductIds]);

  // Rounding helper
  const applyRounding = (price: number, roundType: RoundingType): number => {
    if (roundType === 'NONE') return Math.round(price);
    const stepVal = Number(roundType);
    return Math.round(price / stepVal) * stepVal;
  };

  // Real-time calculation of simulated items with initial & new prices
  const simulatedItems: SimulatedItem[] = useMemo(() => {
    const val = Number(valueInput) || 0;
    const items: SimulatedItem[] = [];

    targetProducts.forEach((p) => {
      const packSizes = p.pack_sizes && p.pack_sizes.length > 0 ? p.pack_sizes : [25, 5, 1];
      const app = (p.applications && p.applications.length > 0 ? p.applications[0] : p.application) || 'Fine Fragrance';

      packSizes.forEach((sz) => {
        if (targetPackSize !== 'ALL' && String(Math.round(sz)) !== targetPackSize) {
          return;
        }

        const vSku = p.variant_skus?.[sz] || `${p.sku}-${sz}K`;
        const vName = p.variant_names?.[sz] || `${p.name} ${sz}K`;
        const matchingVariant = (p.variants || []).find(
          (v) => Math.round(Number(v.pack_size_kg)) === Math.round(sz) || v.variant_sku === vSku
        );
        const oldPrice = Number(p.variant_prices?.[sz]) 
          || Number(matchingVariant?.selling_price_per_kg) 
          || Number(p.selling_price_per_kg) 
          || 0;

        let rawNewPrice = oldPrice;
        if (val > 0) {
          if (unit === 'PERCENT') {
            const diff = oldPrice * (val / 100);
            rawNewPrice = direction === 'INCREASE' ? oldPrice + diff : oldPrice - diff;
          } else {
            rawNewPrice = direction === 'INCREASE' ? oldPrice + val : oldPrice - val;
          }
        }

        const roundedNewPrice = Math.max(0, applyRounding(rawNewPrice, rounding));
        const diffIdr = roundedNewPrice - oldPrice;
        const diffPercent = oldPrice > 0 ? (diffIdr / oldPrice) * 100 : 0;

        items.push({
          productId: p.id,
          variantSku: vSku,
          productName: vName,
          application: app,
          packSizeKg: sz,
          oldPriceIdr: oldPrice,
          newPriceIdr: roundedNewPrice,
          diffIdr,
          diffPercent,
          selected: !excludedSkus.includes(vSku),
        });
      });
    });

    return items;
  }, [targetProducts, targetPackSize, valueInput, unit, direction, rounding, excludedSkus]);

  // Statistics for live summary cards
  const stats = useMemo(() => {
    if (simulatedItems.length === 0) {
      return { minOld: 0, maxOld: 0, avgOld: 0, minNew: 0, maxNew: 0, avgNew: 0, avgDiff: 0 };
    }
    const oldPrices = simulatedItems.map((i) => i.oldPriceIdr);
    const newPrices = simulatedItems.map((i) => i.newPriceIdr);
    const diffs = simulatedItems.map((i) => i.diffIdr);

    const minOld = Math.min(...oldPrices);
    const maxOld = Math.max(...oldPrices);
    const avgOld = Math.round(oldPrices.reduce((a, b) => a + b, 0) / oldPrices.length);

    const minNew = Math.min(...newPrices);
    const maxNew = Math.max(...newPrices);
    const avgNew = Math.round(newPrices.reduce((a, b) => a + b, 0) / newPrices.length);

    const avgDiff = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);

    return { minOld, maxOld, avgOld, minNew, maxNew, avgNew, avgDiff };
  }, [simulatedItems]);

  // Filtered live table items
  const filteredLiveItems = useMemo(() => {
    if (!tableSearch.trim()) return simulatedItems;
    const q = tableSearch.toLowerCase();
    return simulatedItems.filter(
      (i) =>
        i.productName.toLowerCase().includes(q) ||
        i.variantSku.toLowerCase().includes(q) ||
        i.application.toLowerCase().includes(q)
    );
  }, [simulatedItems, tableSearch]);

  const selectedCount = simulatedItems.filter((i) => i.selected).length;

  // Toggle single item
  const handleToggleSku = (sku: string) => {
    setExcludedSkus((prev) =>
      prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]
    );
  };

  // Toggle all items
  const handleToggleAll = (selectAll: boolean) => {
    if (selectAll) {
      setExcludedSkus([]);
    } else {
      setExcludedSkus(simulatedItems.map((i) => i.variantSku));
    }
  };

  // Submit bulk update to backend
  const handleConfirmSubmit = async () => {
    const selectedUpdates = simulatedItems.filter((item) => item.selected);
    if (selectedUpdates.length === 0) {
      alert('Pilih setidaknya 1 varian produk untuk diperbarui.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        reason: reason.trim() || 'Penyesuaian Harga Massal',
        changed_by: 'Super Admin',
        updates: selectedUpdates.map((item) => ({
          product_id: item.productId,
          variant_sku: item.variantSku,
          pack_size_kg: item.packSizeKg,
          new_price_idr: item.newPriceIdr,
          old_price_idr: item.oldPriceIdr,
        })),
      };

      const res = await fetch('/api/products/pricelist/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        alert('Gagal memperbarui harga: ' + json.message);
      }
    } catch (err: any) {
      console.error('Bulk update error:', err);
      alert('Terjadi kesalahan saat memproses data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Penyesuaian Harga Massal
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-normal">
                  Bulk Price Adjustment
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Atur aturan harga dan pantau perbandingan harga awal vs harga baru secara real-time.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form & Live Table Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 max-h-[calc(92vh-140px)]">
          
          {/* 1. Target Produk / Scope */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" />
              1. Pilih Cakupan Produk Target
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setScope('ALL')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === 'ALL'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-sm text-white">Semua Produk</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Seluruh katalog ({products.length} produk induk)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('CATEGORY')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === 'CATEGORY'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-sm text-white">Berdasarkan Kategori</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Filter aplikasi tertentu (Fine Fragrance, dll.)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('SELECTED')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === 'SELECTED'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-sm text-white">Pilihan Manual</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {selectedProductIds.length} produk dipilih
                </div>
              </button>
            </div>

            {/* Category selector */}
            {scope === 'CATEGORY' && (
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs text-slate-300 font-semibold">Pilih Kategori Aplikasi:</label>
                <div className="flex flex-wrap gap-2">
                  {applicationCategories.map((cat) => {
                    const count = products.filter(
                      (p) => ((p.applications && p.applications[0]) || p.application) === cat
                    ).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {cat} <span className="text-[10px] opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual product selector */}
            {scope === 'SELECTED' && (
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold">Centang Produk yang Ingin Disesuaikan:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedProductIds(
                        selectedProductIds.length === products.length ? [] : products.map((p) => p.id)
                      )
                    }
                    className="text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    {selectedProductIds.length === products.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {products.map((p) => {
                    const isChecked = selectedProductIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border ${
                          isChecked
                            ? 'bg-slate-800 border-amber-500/40 text-amber-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedProductIds((prev) =>
                              prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                            );
                          }}
                          className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="font-mono text-slate-500 font-bold">{p.sku}</span>
                        <span className="font-bold text-white flex-1">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Harga Awal: Rp {(p.selling_price_per_kg || 0).toLocaleString('id-ID')} / Kg
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. Target Kemasan & Arah Perubahan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Target Kemasan */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                2. Target Varian Kemasan
              </label>
              <select
                value={targetPackSize}
                onChange={(e) => setTargetPackSize(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-bold cursor-pointer"
              >
                <option value="ALL">Semua Varian Kemasan (25 Kg, 5 Kg, 1 Kg)</option>
                <option value="25">Hanya Kemasan 25 Kg (25K)</option>
                <option value="5">Hanya Kemasan 5 Kg (5K)</option>
                <option value="1">Hanya Kemasan 1 Kg (1K)</option>
              </select>
              <p className="text-[10px] text-slate-500">
                Pilih apakah perubahan berlaku untuk semua pack size atau kemasan tertentu saja.
              </p>
            </div>

            {/* Arah Perubahan */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                3. Arah Penyesuaian Harga
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('INCREASE')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    direction === 'INCREASE'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Kenaikan (+)
                </button>

                <button
                  type="button"
                  onClick={() => setDirection('DECREASE')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    direction === 'DECREASE'
                      ? 'bg-red-500/20 text-red-300 border-red-500 ring-1 ring-red-500'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  Penurunan (-)
                </button>
              </div>
            </div>
          </div>

          {/* 3. Nilai Penyesuaian & Pembulatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Nilai / Besaran */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 block">
                4. Nilai Penyesuaian
              </label>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUnit('PERCENT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                    unit === 'PERCENT'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  <Percent className="w-3 h-3" /> Persentase (%)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('FIXED_IDR')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                    unit === 'FIXED_IDR'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  <Coins className="w-3 h-3" /> Nominal Tetap (Rp)
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">
                  {unit === 'PERCENT' ? '%' : 'Rp'}
                </span>
                <input
                  type="number"
                  min="0"
                  step={unit === 'PERCENT' ? '0.5' : '1000'}
                  value={valueInput}
                  onChange={(e) => setValueInput(Number(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                  placeholder={unit === 'PERCENT' ? '5' : '25000'}
                />
              </div>
            </div>

            {/* Opsi Pembulatan & Catatan */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 block">
                5. Aturan Pembulatan (Rounding) & Catatan
              </label>
              
              <select
                value={rounding}
                onChange={(e) => setRounding(e.target.value as RoundingType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-bold cursor-pointer"
              >
                <option value="1000">Bulatkan ke Rp 1.000 terdekat (Direkomendasikan)</option>
                <option value="5000">Bulatkan ke Rp 5.000 terdekat</option>
                <option value="10000">Bulatkan ke Rp 10.000 terdekat</option>
                <option value="NONE">Tanpa Pembulatan (Sesuai hitungan eksak)</option>
              </select>

              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Alasan: Contoh: Kenaikan Kurs USD Q3 / Inflasi"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>
          </div>

          {/* 4. Live Comparison & Statistics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Card 1: Harga Awal (Saat Ini) */}
            <div className="bg-slate-950/70 border border-slate-700/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-400" /> Harga Awal (Saat Ini)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono font-bold">
                  {simulatedItems.length} Varian Target
                </span>
              </div>

              <div className="space-y-1 pt-1">
                <div className="text-xs text-slate-400">
                  Rentang Harga:
                </div>
                <div className="text-sm font-mono font-extrabold text-white">
                  Rp {stats.minOld.toLocaleString('id-ID')} <span className="text-slate-500 font-normal">s/d</span> Rp {stats.maxOld.toLocaleString('id-ID')} <span className="text-slate-400 text-xs font-normal">/ Kg</span>
                </div>
                <div className="text-[11px] text-slate-400 pt-0.5">
                  Rata-rata Harga Awal: <strong className="font-mono text-slate-300">Rp {stats.avgOld.toLocaleString('id-ID')} / Kg</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Estimasi Harga Baru */}
            <div className="bg-amber-950/40 border border-amber-700/60 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" /> Estimasi Harga Baru ({direction === 'INCREASE' ? '+' : '-'}{valueInput}{unit === 'PERCENT' ? '%' : ' Rp'})
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold border ${
                  direction === 'INCREASE'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                }`}>
                  {stats.avgDiff >= 0 ? '+' : ''}Rp {stats.avgDiff.toLocaleString('id-ID')} / Kg
                </span>
              </div>

              <div className="space-y-1 pt-1">
                <div className="text-xs text-amber-200/80">
                  Rentang Harga Baru:
                </div>
                <div className="text-sm font-mono font-extrabold text-amber-300">
                  Rp {stats.minNew.toLocaleString('id-ID')} <span className="text-amber-400/60 font-normal">s/d</span> Rp {stats.maxNew.toLocaleString('id-ID')} <span className="text-amber-200/70 text-xs font-normal">/ Kg</span>
                </div>
                <div className="text-[11px] text-amber-200/80 pt-0.5">
                  Rata-rata Harga Baru: <strong className="font-mono text-amber-200">Rp {stats.avgNew.toLocaleString('id-ID')} / Kg</strong>
                </div>
              </div>
            </div>

          </div>

          {/* 5. Live Interactive Table (Daftar Produk, Harga Awal & Simulasi Baru) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Daftar Produk Target & Simulasi Harga Real-Time
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Centang varian yang ingin diterapkan. Harga awal dan harga baru dihitung otomatis secara langsung.
                </p>
              </div>

              {/* Search in live table */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari produk / SKU / kemasan..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Table Container */}
            <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCount === simulatedItems.length && simulatedItems.length > 0}
                        onChange={(e) => handleToggleAll(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                        title="Pilih / Batalkan Semua"
                      />
                    </th>
                    <th className="px-4 py-2.5">Produk & SKU Varian</th>
                    <th className="px-4 py-2.5 text-center">Kemasan</th>
                    <th className="px-4 py-2.5">Kategori</th>
                    <th className="px-4 py-2.5 text-right font-bold text-slate-300">Harga Awal / Kg</th>
                    <th className="px-4 py-2.5 text-right font-bold text-amber-300">Estimasi Harga Baru / Kg</th>
                    <th className="px-4 py-2.5 text-right font-bold">Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {filteredLiveItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Tidak ada varian yang cocok dengan kriteria pencarian atau filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLiveItems.map((item) => {
                      const isUp = item.diffIdr > 0;
                      const isDown = item.diffIdr < 0;
                      return (
                        <tr
                          key={item.variantSku}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            !item.selected ? 'opacity-40 bg-slate-950/30' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleSku(item.variantSku)}
                              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-white">{item.productName}</div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {item.variantSku}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-blue-400">
                            {item.packSizeKg} Kg
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold">
                              {item.application}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-200 font-semibold bg-slate-950/30">
                            Rp {item.oldPriceIdr.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-300 bg-amber-500/10">
                            Rp {item.newPriceIdr.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold">
                            {isUp && (
                              <span className="text-emerald-400">
                                +Rp {item.diffIdr.toLocaleString('id-ID')} (+{item.diffPercent.toFixed(1)}%)
                              </span>
                            )}
                            {isDown && (
                              <span className="text-red-400">
                                -Rp {Math.abs(item.diffIdr).toLocaleString('id-ID')} ({item.diffPercent.toFixed(1)}%)
                              </span>
                            )}
                            {!isUp && !isDown && <span className="text-slate-500">Tetap (0)</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/70 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            Akan memperbarui <strong>{selectedCount}</strong> dari <strong>{simulatedItems.length}</strong> varian produk terpilih.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting || selectedCount === 0 || submitSuccess}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Menyimpan ke Database...</span>
              ) : submitSuccess ? (
                <span className="flex items-center gap-1 text-emerald-950 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-800" /> Berhasil Disimpan!
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Terapkan Perubahan Harga Sekarang
                </span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
