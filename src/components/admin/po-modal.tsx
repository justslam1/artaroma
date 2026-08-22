'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Product, Distributor, PurchaseOrder, StockBatch } from '@/lib/types';
import { formatIDR, formatKg } from '@/lib/utils';
import { X, Plus, Trash2, PackagePlus, Calendar, Layers, CheckCircle, FileText, AlertTriangle, ArrowRight, ArrowLeft, ShieldCheck, Building2 } from 'lucide-react';

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  distributors: Distributor[];
  products: Product[];
  onCreatePO: (po: Omit<PurchaseOrder, 'id'>, autoOpenPDF?: boolean) => void;
}

// Currency options with default benchmark rates
export const CURRENCY_OPTIONS = [
  { code: 'IDR', label: 'IDR (Rupiah)', symbol: 'Rp', defaultRate: 1, flag: '🇮🇩' },
  { code: 'USD', label: 'USD (US Dollar)', symbol: '$', defaultRate: 16250, flag: '🇺🇸' },
  { code: 'EUR', label: 'EUR (Euro)', symbol: '€', defaultRate: 17500, flag: '🇪🇺' },
  { code: 'SGD', label: 'SGD (Singapore Dollar)', symbol: 'S$', defaultRate: 12200, flag: '🇸🇬' },
  { code: 'CNY', label: 'CNY (Chinese Yuan)', symbol: '¥', defaultRate: 2250, flag: '🇨🇳' },
  { code: 'GBP', label: 'GBP (British Pound)', symbol: '£', defaultRate: 21000, flag: '🇬🇧' },
];

export function CreatePOModal({
  isOpen,
  onClose,
  distributors: distributorsProp,
  products,
  onCreatePO,
}: CreatePOModalProps) {
  // Always fetch fresh distributor data from API when modal opens
  const [freshDistributors, setFreshDistributors] = useState<Distributor[]>(distributorsProp);
  const [isFetchingDist, setIsFetchingDist] = useState(false);

  const distributors = freshDistributors.length > 0 ? freshDistributors : distributorsProp;

  const [selectedDistributorId, setSelectedDistributorId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'KREDIT'>('TUNAI');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [currency, setCurrency] = useState<string>('IDR');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [step, setStep] = useState<'INPUT' | 'CONFIRM'>('INPUT');

  // Item row type: uses variant-level selection
  type ItemRow = {
    productId: string;
    variantId: string;    // ProductVariant.id
    variantSku: string;   // e.g. 'FO-VAN-001-25K'
    productName: string;
    variantName: string;  // e.g. 'Vanilla Bourbon 25K'
    packSizeKg: number;   // auto-filled from variant (25, 5, 1)
    jumlah: number;       // how many units to order (user input)
    foreignCostPerKg?: number; // Price in foreign currency (e.g. 30.00 USD)
    costPerKg: number;    // HPP per Kg in IDR
  };

  const [items, setItems] = useState<ItemRow[]>([]);
  const [newlyAddedIndex, setNewlyAddedIndex] = useState<number | null>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch fresh distributor data from API every time modal opens
  useEffect(() => {
    if (!isOpen) return;
    setIsFetchingDist(true);
    fetch('/api/distributors', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setFreshDistributors(json.data);
          setSelectedDistributorId((prev) => prev || json.data[0]?.id || '');
        } else {
          setFreshDistributors(distributorsProp);
          setSelectedDistributorId((prev) => prev || distributorsProp[0]?.id || '');
        }
      })
      .catch(() => {
        setFreshDistributors(distributorsProp);
        setSelectedDistributorId((prev) => prev || distributorsProp[0]?.id || '');
      })
      .finally(() => setIsFetchingDist(false));
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setSelectedDistributorId('');
      setPaymentMethod('TUNAI');
      setPaymentTermsDays(30);
      setCurrency('IDR');
      setExchangeRate(1);
      setStep('INPUT');
    }
  }, [isOpen]);

  // Helper: get all variants for products filtered by active distributor
  const getFilteredVariants = (distId: string) => {
    const dist = distributors.find(d => d.id === distId);
    const allowedProductIds = dist?.supplied_product_ids;
    const allowedProducts = products.filter(p =>
      !allowedProductIds || allowedProductIds.length === 0
        ? true
        : allowedProductIds.includes(p.id)
    );
    // Flatten all variants from allowed products, carrying stock info
    const variants: Array<{ productId: string; productName: string; stockKg: number } & import('@/lib/types').ProductVariant> = [];
    for (const prod of allowedProducts) {
      const productStockKg = prod.total_stock_kg ?? 0;
      if (prod.variants && prod.variants.length > 0) {
        for (const v of prod.variants) {
          // Use variant-level stock if available, fallback to product stock
          const sizeKey = String(Math.round(Number(v.pack_size_kg)));
          const variantStockKg = (prod.variant_stocks && prod.variant_stocks[sizeKey] !== undefined)
            ? prod.variant_stocks[sizeKey]
            : (v.total_stock_kg ?? productStockKg);
          variants.push({ ...v, productId: prod.id, productName: prod.name, stockKg: variantStockKg });
        }
      } else if (prod.pack_sizes && prod.pack_sizes.length > 0) {
        // Fallback: synthesize from pack_sizes; share product stock across pack sizes
        for (const size of prod.pack_sizes) {
          const sizeKey = String(Math.round(Number(size)));
          const variantStockKg = (prod.variant_stocks && prod.variant_stocks[sizeKey] !== undefined)
            ? prod.variant_stocks[sizeKey]
            : productStockKg;
          variants.push({
            id: `${prod.id}-${size}k`,
            product_id: prod.id,
            variant_sku: `${prod.sku || prod.id}-${size}K`,
            variant_name: `${prod.name} ${size}K`,
            pack_size_kg: size,
            selling_price_per_kg: prod.selling_price_per_kg || 0,
            productId: prod.id,
            productName: prod.name,
            stockKg: variantStockKg,
          });
        }
      }
    }
    return variants;
  };

  // Build a default item row from the first available (unselected) variant
  const buildDefaultItem = (distId: string, alreadySelectedIds: string[] = []): ItemRow => {
    const variants = getFilteredVariants(distId);
    const firstV = variants.find(v => !alreadySelectedIds.includes(v.id)) || variants[0];
    if (firstV) {
      const baseIdrCost = firstV.selling_price_per_kg || 0;
      const fCost = currency !== 'IDR' && exchangeRate > 0 
        ? Number((baseIdrCost / exchangeRate).toFixed(2)) 
        : undefined;

      return {
        productId: firstV.productId,
        variantId: firstV.id,
        variantSku: firstV.variant_sku,
        productName: firstV.productName,
        variantName: firstV.variant_name,
        packSizeKg: firstV.pack_size_kg,
        jumlah: 1,
        foreignCostPerKg: fCost,
        costPerKg: baseIdrCost,
      };
    }
    return { productId: '', variantId: '', variantSku: '', productName: '', variantName: '', packSizeKg: 25, jumlah: 1, costPerKg: 0 };
  };

  // Currency change handler
  const handleCurrencyChange = (newCurr: string) => {
    setCurrency(newCurr);
    const currConfig = CURRENCY_OPTIONS.find(c => c.code === newCurr);
    const newRate = currConfig ? currConfig.defaultRate : 1;
    setExchangeRate(newRate);

    setItems(prevItems => prevItems.map(item => {
      if (newCurr === 'IDR') {
        return {
          ...item,
          foreignCostPerKg: undefined,
          costPerKg: item.foreignCostPerKg ? Math.round(item.foreignCostPerKg * (exchangeRate || 1)) : item.costPerKg,
        };
      } else {
        const fCost = item.foreignCostPerKg || (newRate > 0 ? Number((item.costPerKg / newRate).toFixed(2)) : 0);
        return {
          ...item,
          foreignCostPerKg: fCost,
          costPerKg: Math.round(fCost * newRate),
        };
      }
    }));
  };

  // Exchange rate change handler
  const handleExchangeRateChange = (newRate: number) => {
    const rateVal = Math.max(1, newRate);
    setExchangeRate(rateVal);
    if (currency !== 'IDR') {
      setItems(prevItems => prevItems.map(item => ({
        ...item,
        costPerKg: Math.round((item.foreignCostPerKg || 0) * rateVal),
      })));
    }
  };

  // Initialize items when modal opens and distributor + products are ready
  useEffect(() => {
    if (isOpen && items.length === 0 && products.length > 0 && selectedDistributorId) {
      setItems([buildDefaultItem(selectedDistributorId, [])]);
    }
  }, [isOpen, products, distributors, selectedDistributorId]);

  // Reset items when distributor changes
  useEffect(() => {
    if (!selectedDistributorId || !isOpen) return;
    setItems([buildDefaultItem(selectedDistributorId, [])]);
  }, [selectedDistributorId]);

  if (!isOpen) return null;

  const activeVariants = getFilteredVariants(selectedDistributorId);

  // IDs of variants already selected across all rows
  const selectedVariantIds = items.map(i => i.variantId).filter(Boolean);
  // Remaining selectable variants (not yet selected)
  const unselectedVariants = activeVariants.filter(v => !selectedVariantIds.includes(v.id));

  const addItemRow = () => {
    // Pick first variant not already chosen
    const nextItem = buildDefaultItem(selectedDistributorId, selectedVariantIds);
    setItems([...items, nextItem]);
    setNewlyAddedIndex(items.length);
    setTimeout(() => {
      setNewlyAddedIndex(null);
    }, 1000);

    // Scroll to the bottom of the items list container
    setTimeout(() => {
      if (itemsContainerRef.current) {
        itemsContainerRef.current.scrollTo({
          top: itemsContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 50);
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, variantId: string) => {
    const variant = activeVariants.find(v => v.id === variantId);
    if (!variant) return;
    const baseIdr = variant.selling_price_per_kg || updatedCostPerKg(index);
    const fCost = currency !== 'IDR' && exchangeRate > 0 ? Number((baseIdr / exchangeRate).toFixed(2)) : undefined;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      variantId: variant.id,
      variantSku: variant.variant_sku,
      productId: variant.productId,
      productName: variant.productName,
      variantName: variant.variant_name,
      packSizeKg: variant.pack_size_kg,
      foreignCostPerKg: fCost,
      costPerKg: baseIdr,
    };
    setItems(updated);
  };

  const updatedCostPerKg = (idx: number) => {
    return items[idx] ? items[idx].costPerKg : 0;
  };

  const handleJumlahChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index].jumlah = Math.max(1, Number(val) || 1);
    setItems(updated);
  };

  const handleForeignCostChange = (index: number, val: string) => {
    const fVal = Number(val) || 0;
    const updated = [...items];
    updated[index].foreignCostPerKg = fVal;
    updated[index].costPerKg = Math.round(fVal * exchangeRate);
    setItems(updated);
  };

  const handleCostChange = (index: number, val: string) => {
    const idrVal = Number(val) || 0;
    const updated = [...items];
    updated[index].costPerKg = idrVal;
    if (currency !== 'IDR' && exchangeRate > 0) {
      updated[index].foreignCostPerKg = Number((idrVal / exchangeRate).toFixed(2));
    }
    setItems(updated);
  };

  // Total foreign and IDR amounts
  const totalForeignAmount = items.reduce(
    (sum, item) => sum + item.jumlah * item.packSizeKg * (item.foreignCostPerKg || 0),
    0
  );

  const totalAmount = items.reduce(
    (sum, item) => sum + item.jumlah * item.packSizeKg * item.costPerKg,
    0
  );

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistributorId) {
      alert('Pilih distributor terlebih dahulu.');
      return;
    }
    if (items.length === 0) {
      alert('Tambahkan minimal 1 item produk.');
      return;
    }
    for (const item of items) {
      if (!item.variantId) {
        alert('Pastikan semua baris varian produk telah dipilih.');
        return;
      }
      if (item.jumlah <= 0) {
        alert('Jumlah unit harus lebih dari 0.');
        return;
      }
    }
    setStep('CONFIRM');
  };

  const handleFinalSubmit = () => {
    const distributor = distributors.find((d) => d.id === selectedDistributorId);

    const poItems = items.map((item, idx) => ({
      id: `poi-${Date.now()}-${idx}`,
      po_id: '',
      product_id: item.productId,
      variant_sku: item.variantSku || '',
      product_name: item.variantName || item.productName || 'Bibit Parfum',
      qty_ordered_kg: item.jumlah * item.packSizeKg,
      foreign_cost_per_kg: currency !== 'IDR' ? item.foreignCostPerKg : undefined,
      foreign_subtotal: currency !== 'IDR' ? (item.jumlah * item.packSizeKg * (item.foreignCostPerKg || 0)) : undefined,
      cost_per_kg: item.costPerKg,
      subtotal: item.jumlah * item.packSizeKg * item.costPerKg,
    }));

    onCreatePO({
      po_number: `PO-ART-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      distributor_id: selectedDistributorId,
      distributor_name: distributor?.name || 'Distributor',
      status: 'BUAT_EMAIL',
      payment_method: paymentMethod,
      payment_terms_days: paymentMethod === 'KREDIT' ? paymentTermsDays : undefined,
      currency: currency,
      exchange_rate: exchangeRate,
      foreign_total_amount: currency !== 'IDR' ? totalForeignAmount : undefined,
      order_date: new Date().toISOString().split('T')[0],
      total_amount: totalAmount,
      items: poItems,
    }, true);

    setStep('INPUT');
    onClose();
  };

  const selectedDistributor = distributors.find((d) => d.id === selectedDistributorId);
  const totalKgOrdered = items.reduce((s, i) => s + i.jumlah * i.packSizeKg, 0);
  const activeCurrencyConfig = CURRENCY_OPTIONS.find(c => c.code === currency) || CURRENCY_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl ${step === 'CONFIRM' ? 'max-w-3xl' : 'max-w-2xl'} w-full text-slate-100 shadow-2xl overflow-hidden my-8 animate-in fade-in transition-all`}>
        {/* Header */}
        <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 'INPUT' ? (
              <PackagePlus className="w-6 h-6 text-emerald-400" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            )}
            <div>
              <h3 className="font-bold text-white text-base">
                {step === 'INPUT' ? 'Buat Purchase Order Baru (Procurement)' : 'Konfirmasi Purchase Order (Review Item)'}
              </h3>
              <p className="text-xs text-slate-400">
                {step === 'INPUT' ? 'Langkah 1 dari 2: Pilih Distributor & Daftar Item Pesanan' : 'Langkah 2 dari 2: Periksa kembali rincian item sebelum dikirim'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Indicator */}
        <div className="bg-slate-950/50 px-6 py-2.5 border-b border-slate-800 flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setStep('INPUT')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors ${
              step === 'INPUT'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center">1</span>
            <span>1. Isi Detail Item</span>
          </button>
          <span className="text-slate-600">→</span>
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold ${
              step === 'CONFIRM'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-500'
            }`}
          >
            <span className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
              step === 'CONFIRM' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>2</span>
            <span>2. Periksa & Konfirmasi Pesanan</span>
          </div>
        </div>

        {step === 'INPUT' ? (
          /* STEP 1: FORM INPUT */
          <form onSubmit={handleProceedToConfirm} className="p-6 space-y-5">
            {/* Distributor Selection, Payment Method & Currency / Kurs Khusus */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`${paymentMethod === 'KREDIT' ? 'sm:col-span-2 md:col-span-1' : 'sm:col-span-2 md:col-span-2'}`}>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Pilih Distributor
                  </label>
                  <select
                    value={selectedDistributorId}
                    onChange={(e) => setSelectedDistributorId(e.target.value)}
                    disabled={isFetchingDist}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold disabled:opacity-60"
                  >
                    {isFetchingDist ? (
                      <option value="">Memuat data suplier...</option>
                    ) : distributors.length === 0 ? (
                      <option value="">— Belum ada suplier —</option>
                    ) : (
                      distributors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.contact_name})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'TUNAI' | 'KREDIT')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    <option value="TUNAI">TUNAI (Cash)</option>
                    <option value="KREDIT">KREDIT (Tempo)</option>
                  </select>
                </div>

                {paymentMethod === 'KREDIT' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      TOP (Hari)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={paymentTermsDays}
                      onChange={(e) => setPaymentTermsDays(Number(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold font-mono"
                      placeholder="30"
                    />
                  </div>
                )}
              </div>

              {/* Currency & Exchange Rate Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-700/60">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 flex items-center justify-between">
                    <span>Mata Uang PO</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">{currency}</span>
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 flex items-center justify-between">
                    <span>Kurs Khusus (Konversi IDR)</span>
                    {currency !== 'IDR' && (
                      <span className="text-[10px] text-amber-400 font-mono font-bold">1 {currency} = {formatIDR(exchangeRate)}</span>
                    )}
                  </label>
                  {currency === 'IDR' ? (
                    <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-500 font-mono">
                      1.00 (Mata Uang Rupiah Standar)
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs pointer-events-none">Rp</span>
                      <input
                        type="number"
                        min="1"
                        step="10"
                        value={exchangeRate}
                        onChange={(e) => handleExchangeRateChange(Number(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-amber-500/70 rounded-xl pl-9 pr-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500"
                        placeholder="16250"
                      />
                    </div>
                  )}
                </div>
              </div>

              {currency !== 'IDR' && (
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-2.5 text-[11px] text-amber-300 flex items-center justify-between">
                  <span>💡 Harga beli per Kg diinput dalam <strong>{currency}</strong> dan otomatis dikonversi ke HPP IDR (Kurs: 1 {currency} = {formatIDR(exchangeRate)}).</span>
                </div>
              )}
            </div>

            {/* Item Lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Daftar Item Bibit Parfum (Per Kg)
                </label>
                <div className="flex items-center gap-2">
                  {unselectedVariants.length === 0 && activeVariants.length > 0 && (
                    <span className="text-[10px] text-slate-500 italic">Semua varian sudah dipilih</span>
                  )}
                  {unselectedVariants.length > 0 && (
                    <span className="text-[10px] text-slate-500">{unselectedVariants.length} varian tersisa</span>
                  )}
                  <button
                    type="button"
                    onClick={addItemRow}
                    disabled={unselectedVariants.length === 0}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Baris
                  </button>
                </div>
              </div>

              <div 
                ref={itemsContainerRef}
                className="space-y-2 max-h-64 overflow-y-auto pr-1 scroll-smooth"
              >
                {items.map((item, idx) => {
                  const isNew = idx === newlyAddedIndex;
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl p-3 space-y-2 transition-all duration-500 origin-center ${
                        isNew
                          ? 'bg-slate-700 border-2 border-emerald-400 ring-4 ring-emerald-500/20 scale-[1.02] shadow-lg shadow-emerald-500/5'
                          : 'bg-slate-800/60 border border-slate-700/60 scale-100'
                      }`}
                    >
                    {/* Row 1: Variant dropdown */}
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Varian Produk</label>
                      <select
                        value={item.variantId}
                        onChange={(e) => handleVariantChange(idx, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-medium"
                      >
                        {activeVariants.length === 0 ? (
                          <option value="">— Belum ada varian —</option>
                        ) : (
                          activeVariants.map((v) => {
                            const isCurrentlySelected = v.id === item.variantId;
                            const isSelectedElsewhere = selectedVariantIds.includes(v.id) && !isCurrentlySelected;
                            if (isSelectedElsewhere) return null;
                            const stockLabel = v.stockKg != null
                              ? ` | Stok: ${v.stockKg.toLocaleString('id-ID')} Kg`
                              : '';
                            return (
                              <option key={v.id} value={v.id}>
                                {v.variant_name} ({v.pack_size_kg} Kg/unit){stockLabel}
                              </option>
                            );
                          })
                        )}
                      </select>
                      {/* Stock badge below dropdown for selected variant */}
                      {(() => {
                        const selV = activeVariants.find(v => v.id === item.variantId);
                        if (!selV || selV.stockKg == null) return null;
                        const stockKg = selV.stockKg;
                        const stockUnits = selV.pack_size_kg > 0 ? Math.floor(stockKg / selV.pack_size_kg) : 0;
                        const isLow = stockKg < selV.pack_size_kg * 2;
                        return (
                          <div className={`mt-1 flex items-center gap-1.5 text-[10px] font-semibold ${
                            isLow ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              isLow ? 'bg-red-400' : 'bg-emerald-400'
                            }`} />
                            Sisa stok: {stockKg.toLocaleString('id-ID')} Kg
                            {stockUnits > 0 && (
                              <span className="text-slate-500">
                                ({stockUnits} unit @{selV.pack_size_kg}Kg)
                              </span>
                            )}
                            {isLow && <span className="text-red-400 font-bold">⚠ Stok rendah</span>}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Row 2: Jumlah, Qty auto, HPP, Hapus */}
                    <div className="flex items-end gap-2">
                      {/* Jumlah (Unit) - user input */}
                      <div className="w-24">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Jumlah (Unit)</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.jumlah}
                          onChange={(e) => handleJumlahChange(idx, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                        />
                      </div>

                      {/* × sign */}
                      <div className="pb-1.5 text-slate-500 text-sm font-bold select-none">×</div>

                      {/* Pack Size (auto-filled, read-only) */}
                      <div className="w-20">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Kemasan</label>
                        <div className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-emerald-400 font-mono font-bold text-center">
                          {item.packSizeKg} Kg
                        </div>
                      </div>

                      {/* = sign */}
                      <div className="pb-1.5 text-slate-500 text-sm font-bold select-none">=</div>

                      {/* Total Kg (calculated) */}
                      <div className="w-20">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Total (Kg)</label>
                        <div className="w-full bg-slate-950/60 border border-emerald-800/40 rounded-lg px-2 py-1.5 text-xs text-emerald-300 font-mono font-bold text-center">
                          {(item.jumlah * item.packSizeKg).toLocaleString('id-ID')} Kg
                        </div>
                      </div>

                      {/* Foreign Cost / Kg (If non-IDR) */}
                      {currency !== 'IDR' ? (
                        <div className="flex-1">
                          <label className="text-[10px] text-amber-300 font-bold block mb-0.5">
                            Harga / Kg ({activeCurrencyConfig.symbol} {currency})
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.foreignCostPerKg || 0}
                              onChange={(e) => handleForeignCostChange(idx, e.target.value)}
                              className="w-full bg-slate-900 border border-amber-500/60 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold"
                            />
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5 font-mono">
                            ≈ {formatIDR(item.costPerKg)} / Kg
                          </div>
                        </div>
                      ) : (
                        /* HPP / Kg (IDR) */
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400 block mb-0.5">HPP / Kg (IDR)</label>
                          <input
                            type="number"
                            step="10000"
                            value={item.costPerKg}
                            onChange={(e) => handleCostChange(idx, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                      )}

                      {/* Delete row */}
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-slate-500 hover:text-red-400 p-1.5 mb-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Subtotal per row */}
                    <div className="text-right text-[10px] text-slate-400 flex items-center justify-end gap-2">
                      {currency !== 'IDR' && (
                        <span className="text-amber-300 font-bold font-mono">
                          {activeCurrencyConfig.symbol} {(item.jumlah * item.packSizeKg * (item.foreignCostPerKg || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                      <span>Subtotal IDR:</span>
                      <span className="text-white font-bold font-mono">
                        {formatIDR(item.jumlah * item.packSizeKg * item.costPerKg)}
                      </span>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>

            {/* Grand Total Footer */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold">Total Nilai Purchase Order:</span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Total Kg: {totalKgOrdered.toLocaleString('id-ID')} Kg
                </div>
              </div>
              <div className="text-right">
                {currency !== 'IDR' ? (
                  <>
                    <div className="text-lg font-extrabold font-mono text-amber-300">
                      {activeCurrencyConfig.symbol} {totalForeignAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                    </div>
                    <div className="text-xs font-bold font-mono text-emerald-400">
                      ≈ {formatIDR(totalAmount)} <span className="text-[10px] text-slate-400 font-normal">(@ Kurs {formatIDR(exchangeRate)})</span>
                    </div>
                  </>
                ) : (
                  <span className="text-lg font-extrabold font-mono text-emerald-400">
                    {formatIDR(totalAmount)}
                  </span>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <span>Lanjut: Periksa Ringkasan PO</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: CONFIRMATION REVIEW */
          <div className="p-6 space-y-5 animate-in fade-in duration-200">
            {/* Distributor & PO Meta Info Card */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Distributor Tujuan</span>
                <div className="font-bold text-white text-sm">{selectedDistributor?.name || 'Distributor'}</div>
                <div className="text-slate-400 text-[11px]">{selectedDistributor?.contact_name || '-'}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Metode Pembayaran</span>
                <div className="font-bold text-emerald-400 font-mono">
                  {paymentMethod === 'KREDIT' ? `KREDIT (TOP ${paymentTermsDays} Hari)` : 'TUNAI (Cash)'}
                </div>
                <div className="text-slate-400 text-[11px]">Syarat Pelunasan PO</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mata Uang & Kurs</span>
                <div className="font-bold text-amber-300 font-mono">
                  {currency !== 'IDR' ? `${currency} (@ ${formatIDR(exchangeRate)})` : 'IDR (Rupiah)'}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {currency !== 'IDR' ? 'Kurs Khusus PO' : 'Mata Uang Lokal'}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Diterbitkan</span>
                <div className="font-bold text-slate-200 font-mono">{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div className="text-slate-400 text-[11px]">Status Awal: BUAT EMAIL / PO</div>
              </div>
            </div>

            {/* Detailed Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Rincian Item yang Dipesan ({items.length} varian)</span>
                <span className="text-emerald-400 font-mono">{totalKgOrdered.toLocaleString('id-ID')} Kg Total</span>
              </div>
              <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-700">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Varian Produk (SKU)</th>
                      <th className="py-2.5 px-3 text-center">Kemasan</th>
                      <th className="py-2.5 px-3 text-center">Jumlah</th>
                      <th className="py-2.5 px-3 text-right">Total Berat</th>
                      {currency !== 'IDR' && (
                        <th className="py-2.5 px-3 text-right">Harga ({currency})</th>
                      )}
                      <th className="py-2.5 px-3 text-right">HPP / Kg (IDR)</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 text-slate-200">
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-center">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{item.variantName || item.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.variantSku}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          {item.packSizeKg} Kg/unit
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                          {item.jumlah} unit
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                          {(item.jumlah * item.packSizeKg).toLocaleString('id-ID')} Kg
                        </td>
                        {currency !== 'IDR' && (
                          <td className="py-2.5 px-3 text-right font-mono text-amber-300 font-bold">
                            {activeCurrencyConfig.symbol} {(item.foreignCostPerKg || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {formatIDR(item.costPerKg)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          {currency !== 'IDR' ? (
                            <div>
                              <div>{activeCurrencyConfig.symbol} {(item.jumlah * item.packSizeKg * (item.foreignCostPerKg || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                              <div className="text-[10px] text-slate-400 font-normal">≈ {formatIDR(item.jumlah * item.packSizeKg * item.costPerKg)}</div>
                            </div>
                          ) : (
                            formatIDR(item.jumlah * item.packSizeKg * item.costPerKg)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grand Total Summary Box */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold">Total Nilai Purchase Order:</span>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  <strong className="text-white">{items.length} Varian</strong> | Total Berat: <strong className="text-white">{totalKgOrdered.toLocaleString('id-ID')} Kg</strong>
                </div>
              </div>
              <div className="text-right">
                {currency !== 'IDR' ? (
                  <>
                    <div className="text-xl font-extrabold font-mono text-amber-300">
                      {activeCurrencyConfig.symbol} {totalForeignAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                    </div>
                    <div className="text-xs font-bold font-mono text-emerald-400">
                      ≈ {formatIDR(totalAmount)} <span className="text-[10px] text-slate-400 font-normal">(@ Kurs {formatIDR(exchangeRate)})</span>
                    </div>
                  </>
                ) : (
                  <span className="text-xl font-extrabold font-mono text-emerald-400">
                    {formatIDR(totalAmount)}
                  </span>
                )}
              </div>
            </div>

            {/* Notice Alert Banner */}
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-200">Konfirmasi Pemesanan</div>
                <div className="text-[11px] text-emerald-300/80 mt-0.5">
                  Pastikan seluruh daftar item dan nominal di atas sudah sesuai. Setelah menekan tombol konfirmasi, Purchase Order resmi akan langsung diterbitkan dan dokumen PDF akan terbuka otomatis.
                </div>
              </div>
            </div>

            {/* Actions: Back to Edit or Final Confirm */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep('INPUT')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali / Edit Item
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" /> Konfirmasi & Kirim PO (Auto PDF)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface GoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  shipment?: any | null;
  onReceiveBatch: (batch: StockBatch, shipmentId?: string) => void;
}

export function GoodsReceiptModal({
  isOpen,
  onClose,
  po,
  shipment,
  onReceiveBatch,
}: GoodsReceiptModalProps) {

  // Each item in the shipment gets its own batch entry
  type BatchEntry = {
    poItemId: string;
    productId: string;
    productName: string;
    orderedKg: number;
    batchNumber: string;
    receivedQtyKg: number;
    expiryDate: string;
    costPerKg: number;
  };

  const buildInitialEntries = (): BatchEntry[] => {
    if (!po) return [];
    // Use shipment items if available, else all PO items
    const sourceItems = shipment?.items?.length > 0
      ? shipment.items.map((si: any) => {
          const poItem = po.items.find(i => si.po_item_id ? i.id === si.po_item_id : i.product_id === si.product_id) || po.items[0];
          return {
            ...poItem,
            id: si.po_item_id || poItem.id,
            product_name: si.product_name || poItem.product_name,
            qty_shipped_kg: si.qty_shipped_kg
          };
        })
      : po.items;

    return sourceItems.map((item: any, idx: number) => ({
      poItemId: item.id || `entry-${idx}-${item.product_id || idx}`,
      productId: item.product_id,
      productName: item.product_name || 'Bibit Parfum',
      orderedKg: item.qty_shipped_kg ?? item.qty_ordered_kg ?? 0,
      batchNumber: `BTC-${new Date().getFullYear()}-${String(Math.floor(10 + Math.random() * 89) + idx).padStart(2, '0')}`,
      receivedQtyKg: item.qty_shipped_kg ?? item.qty_ordered_kg ?? 0,
      expiryDate: '2027-06-30',
      costPerKg: item.cost_per_kg || 0,
    }));
  };

  const [entries, setEntries] = useState<BatchEntry[]>([]);

  useEffect(() => {
    if (isOpen && po) {
      setEntries(buildInitialEntries());
    }
  }, [isOpen, po, shipment]);

  if (!isOpen || !po) return null;

  const updateEntry = (idx: number, field: keyof BatchEntry, value: string | number) => {
    const updated = [...entries];
    (updated[idx] as any)[field] = value;
    setEntries(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi: Qty Diterima harus sama dengan Qty Dikirim/Dipesan
    const mismatched = entries.find((entry) => Number(entry.receivedQtyKg) !== Number(entry.orderedKg));
    if (mismatched) {
      alert('Jumlah diterima harus sama');
      return;
    }

    // Create a stock batch for each entry
    for (const entry of entries) {
      if (entry.receivedQtyKg <= 0) continue;
      const newBatch: StockBatch = {
        id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        batch_number: entry.batchNumber,
        product_id: entry.productId,
        product_name: entry.productName,
        po_item_id: entry.poItemId,
        production_date: new Date().toISOString().split('T')[0],
        expiry_date: entry.expiryDate,
        initial_qty_kg: entry.receivedQtyKg,
        current_qty_kg: entry.receivedQtyKg,
        unit_cost_per_kg: entry.costPerKg,
        is_expired: false,
        created_at: new Date().toISOString().split('T')[0],
      };
      onReceiveBatch(newBatch, shipment?.id);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-base">Input Penerimaan Barang (Goods Receipt)</h3>
              <p className="text-xs text-slate-400">Pencatatan Batch FEFO & Expiry Date Gudang</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* PO Info */}
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-slate-400">Ref PO: <strong className="text-emerald-400 font-mono">{po.po_number}</strong></div>
              <div className="text-slate-300 font-semibold">Distributor: {po.distributor_name}</div>
            </div>
            <div className="text-right text-[10px] text-slate-500">
              <div>{entries.length} item diterima</div>
              <div className="font-mono text-slate-400">
                Total: {entries.reduce((s, e) => s + e.receivedQtyKg, 0).toLocaleString('id-ID')} Kg
              </div>
            </div>
          </div>

          {/* Per-Item Batch Entries */}
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {entries.map((entry, idx) => (
              <div key={`entry-${idx}-${entry.poItemId}`} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                {/* Item Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{entry.productName}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Dipesan: <span className="font-mono text-slate-300">{formatKg(entry.orderedKg)}</span>
                    </div>
                  </div>
                  <span className="bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Item #{idx + 1}
                  </span>
                </div>

                {/* Batch Number */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Nomor Lot / Batch Fisik Kemasan</label>
                  <input
                    type="text"
                    required
                    value={entry.batchNumber}
                    onChange={(e) => updateEntry(idx, 'batchNumber', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>

                {/* Qty + Expiry */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-300 block">Qty Diterima (Kg)</label>
                      {Number(entry.receivedQtyKg) !== Number(entry.orderedKg) && (
                        <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Harus {formatKg(entry.orderedKg)}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={Math.round(entry.receivedQtyKg)}
                      onChange={(e) => updateEntry(idx, 'receivedQtyKg', Math.round(Number(e.target.value)))}
                      className={`w-full bg-slate-900 border rounded-xl px-3 py-2 font-mono font-bold text-sm transition-colors ${
                        Number(entry.receivedQtyKg) !== Number(entry.orderedKg)
                          ? 'border-rose-500 text-rose-400 focus:border-rose-400 focus:ring-1 focus:ring-rose-500'
                          : 'border-slate-700 text-emerald-400 focus:border-emerald-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Tanggal Expiry Date (FEFO)</label>
                    <input
                      type="date"
                      required
                      value={entry.expiryDate}
                      onChange={(e) => updateEntry(idx, 'expiryDate', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quantity Mismatch Notification Banner */}
          {entries.some((entry) => Number(entry.receivedQtyKg) !== Number(entry.orderedKg)) && (
            <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Jumlah diterima harus sama dengan yang {shipment ? 'dikirim' : 'dipesan'}.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              Simpan {entries.length} Batch Masuk Gudang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


