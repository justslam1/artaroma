'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Zap,
  ArrowRight,
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
  const [step, setStep] = useState<'CONFIG' | 'PREVIEW'>('CONFIG');

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

  // Preview states
  const [previewItems, setPreviewItems] = useState<SimulatedItem[]>([]);
  const [previewSearch, setPreviewSearch] = useState<string>('');
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

  // Generate Simulation on proceeding to Step 2
  const handleProceedToPreview = () => {
    const val = Number(valueInput) || 0;
    if (val <= 0) {
      alert('Masukkan nilai penyesuaian yang valid (lebih dari 0).');
      return;
    }

    const simulated: SimulatedItem[] = [];

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
        if (unit === 'PERCENT') {
          const diff = oldPrice * (val / 100);
          rawNewPrice = direction === 'INCREASE' ? oldPrice + diff : oldPrice - diff;
        } else {
          rawNewPrice = direction === 'INCREASE' ? oldPrice + val : oldPrice - val;
        }

        const roundedNewPrice = Math.max(0, applyRounding(rawNewPrice, rounding));
        const diffIdr = roundedNewPrice - oldPrice;
        const diffPercent = oldPrice > 0 ? (diffIdr / oldPrice) * 100 : 0;

        simulated.push({
          productId: p.id,
          variantSku: vSku,
          productName: vName,
          application: app,
          packSizeKg: sz,
          oldPriceIdr: oldPrice,
          newPriceIdr: roundedNewPrice,
          diffIdr,
          diffPercent,
          selected: true,
        });
      });
    });

    if (simulated.length === 0) {
      alert('Tidak ada varian produk yang sesuai dengan filter yang dipilih.');
      return;
    }

    setPreviewItems(simulated);
    setStep('PREVIEW');
  };

  // Toggle individual item in preview
  const handleToggleItem = (index: number) => {
    setPreviewItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  // Toggle all items in preview
  const handleToggleAll = (checked: boolean) => {
    setPreviewItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  // Submit bulk update to backend
  const handleConfirmSubmit = async () => {
    const selectedUpdates = previewItems.filter((item) => item.selected);
    if (selectedUpdates.length === 0) {
      alert('Pilih setidaknya 1 varian produk untuk diperbarui.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        reason,
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

  // Filtered preview items for table display
  const filteredPreview = previewItems.filter((i) =>
    i.productName.toLowerCase().includes(previewSearch.toLowerCase()) ||
    i.variantSku.toLowerCase().includes(previewSearch.toLowerCase()) ||
    i.application.toLowerCase().includes(previewSearch.toLowerCase())
  );

  const selectedCount = previewItems.filter((i) => i.selected).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
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
                {step === 'CONFIG'
                  ? 'Atur persentase atau nominal kenaikan/penurunan harga produk & varian kemasan.'
                  : `Simulasi & konfirmasi perubahan harga untuk ${selectedCount} varian terpilih.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Configuration Form */}
        {step === 'CONFIG' && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            
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
                  className={`p-3 rounded-xl border text-left transition-all ${
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
                  className={`p-3 rounded-xl border text-left transition-all ${
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
                  className={`p-3 rounded-xl border text-left transition-all ${
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
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
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
                      className="text-amber-400 hover:underline font-bold"
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
                          <span className="text-[10px] text-slate-500">
                            Rp {(p.selling_price_per_kg || 0).toLocaleString('id-ID')} / Kg
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
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
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
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
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
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

              {/* Opsi Pembulatan */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300 block">
                  5. Aturan Pembulatan (Rounding)
                </label>
                
                <select
                  value={rounding}
                  onChange={(e) => setRounding(e.target.value as RoundingType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="1000">Bulatkan ke Rp 1.000 terdekat (Direkomendasikan)</option>
                  <option value="5000">Bulatkan ke Rp 5.000 terdekat</option>
                  <option value="10000">Bulatkan ke Rp 10.000 terdekat</option>
                  <option value="NONE">Tanpa Pembulatan (Sesuai hitungan eksak)</option>
                </select>

                <div className="text-[11px] text-slate-400">
                  Alasan / Catatan Penyesuaian:
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Contoh: Kenaikan Kurs USD Q3 / Penyesuaian Harga Pokok"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Target Summary Banner */}
            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4 flex items-center justify-between text-xs text-amber-200">
              <div className="space-y-0.5">
                <div className="font-bold flex items-center gap-1.5">
                  <span>💡 Target Produk:</span>
                  <strong>{targetProducts.length} Produk Induk</strong>
                </div>
                <div className="text-[11px] text-amber-300/80">
                  Rumus: Harga Lama {direction === 'INCREASE' ? '+' : '-'} {valueInput} {unit === 'PERCENT' ? '%' : 'Rp/Kg'} (Pembulatan: {rounding === 'NONE' ? 'Nonaktif' : `Rp ${Number(rounding).toLocaleString('id-ID')}`})
                </div>
              </div>
              <button
                type="button"
                onClick={handleProceedToPreview}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
              >
                Lihat Simulasi Harga <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* Step 2: Simulation & Preview Table */}
        {step === 'PREVIEW' && (
          <div className="p-6 overflow-y-auto space-y-4 flex-1 flex flex-col">
            
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('CONFIG')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 border border-slate-700 font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Ubah Aturan
                </button>
                <span className="text-xs text-slate-400">
                  Menampilkan <strong>{previewItems.length}</strong> varian | <strong>{selectedCount}</strong> dipilih untuk diperbarui
                </span>
              </div>

              {/* Search in preview */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari produk / SKU..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden flex-1 max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCount === previewItems.length && previewItems.length > 0}
                        onChange={(e) => handleToggleAll(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                      />
                    </th>
                    <th className="px-4 py-3">Produk & SKU Varian</th>
                    <th className="px-4 py-3">Aplikasi</th>
                    <th className="px-4 py-3 text-right">Harga Lama / Kg</th>
                    <th className="px-4 py-3 text-right text-amber-300">Harga Baru / Kg</th>
                    <th className="px-4 py-3 text-right">Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {filteredPreview.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Tidak ada varian yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredPreview.map((item, idx) => {
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
                              onChange={() => {
                                const realIdx = previewItems.findIndex(
                                  (p) => p.variantSku === item.variantSku
                                );
                                if (realIdx !== -1) handleToggleItem(realIdx);
                              }}
                              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-white">{item.productName}</div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {item.variantSku} ({item.packSizeKg} Kg)
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold">
                              {item.application}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                            Rp {item.oldPriceIdr.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-300 bg-amber-500/5">
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

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Akan memperbarui <strong>{selectedCount}</strong> varian harga di database & katalog.
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStep('CONFIG')}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  Kembali
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting || selectedCount === 0 || submitSuccess}
                  className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
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
        )}

      </div>
    </div>
  );
}
