'use client';

import React, { useState, useEffect } from 'react';
import { Product, Customer, PaymentMethod } from '@/lib/types';
import { formatKg, formatIDR } from '@/lib/utils';
import { X, Building2, Package, CheckCircle2, Send, CreditCard, Plus, Minus, Trash2, Upload } from 'lucide-react';

interface CartItem {
  product: Product;
  packSizeKg: number;
  quantity: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  customer: Customer;
  usdRate: number;
  onUpdateCart?: (updatedCart: CartItem[]) => void;
  onSuccess: (order: {
    customer_id: string;
    payment_method: PaymentMethod;
    items: CartItem[];
    payment_proof_url?: string;
  }) => void | Promise<void>;
}

export function CheckoutModal({
  isOpen,
  onClose,
  cart,
  customer,
  usdRate,
  onUpdateCart,
  onSuccess,
}: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('LUNAS_TRANSFER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bank Account Master Data state
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Fetch bank accounts from MySQL master settings
  useEffect(() => {
    fetch('/api/company-settings', { cache: 'no-store' })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.bank_accounts) {
          setBankAccounts(json.data.bank_accounts);
        }
      })
      .catch(err => console.warn('Failed to load bank settings in checkout modal:', err));
  }, []);

  // Payment proof upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedFileName(file.name);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdjustQty = (productId: string, packSizeKg: number, delta: number) => {
    if (!onUpdateCart) return;
    const updated = cart
      .map((item) => {
        if (item.product.id === productId && item.packSizeKg === packSizeKg) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];
    onUpdateCart(updated);
  };

  const handleRemove = (productId: string, packSizeKg: number) => {
    if (!onUpdateCart) return;
    onUpdateCart(cart.filter((item) => !(item.product.id === productId && item.packSizeKg === packSizeKg)));
  };

  // Helper to get variant price
  const getVariantPriceInfo = (item: CartItem) => {
    const variant = item.product.variants?.find(
      (v) => Math.abs(Number(v.pack_size_kg) - Number(item.packSizeKg)) < 0.01
    );

    const priceIdr = variant?.selling_price_per_kg 
      ? Number(variant.selling_price_per_kg) 
      : (item.product.selling_price_per_kg || (item.packSizeKg === 25 ? 1353000 : item.packSizeKg === 5 ? 1090000 : item.packSizeKg === 1 ? 1100000 : 1200000));

    const priceUsd = variant?.selling_price_usd_per_kg 
      ? Number(variant.selling_price_usd_per_kg) 
      : (item.product.selling_price_usd_per_kg || (priceIdr / usdRate));

    return {
      variantName: variant?.variant_name || (item.packSizeKg < 1 ? `${item.product.name} 0.1K (100g)` : `${item.product.name} ${item.packSizeKg}K`),
      priceIdr,
      priceUsd,
      subtotal: priceIdr * (item.packSizeKg * item.quantity),
    };
  };

  // Calculate estimated total price
  const estimatedTotal = cart.reduce((sum, item) => {
    const info = getVariantPriceInfo(item);
    return sum + info.subtotal;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSuccess({
        customer_id: customer.id,
        payment_method: paymentMethod,
        items: cart,
        payment_proof_url: undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || cart.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-700 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-white">
            <Package className="w-5 h-5" />
            <div>
              <h2 className="text-base font-bold">Form Pengajuan Pesanan (Sales Order)</h2>
              <p className="text-xs text-blue-200">Tahap 1: Pengajuan draft pesanan ke tim Finance & Gudang</p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Customer Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Akun Pemesan B2B
                </div>
                <div className="font-bold text-slate-800 text-base flex items-center gap-2 mt-0.5">
                  <Building2 className="w-4 h-4 text-blue-600" /> {customer.company_name}
                </div>
                <div className="text-xs text-gray-500">
                  PIC: {customer.pic_name} | {customer.phone}
                </div>
              </div>
              <div className="text-right sm:border-l border-gray-200 sm:pl-4">
                <div className="text-xs text-gray-400">Status Akun:</div>
                <div className="font-bold text-emerald-600">AKTIF</div>
              </div>
            </div>

            {/* Cart Items List */}
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Daftar Pesanan ({cart.length} Varian)
              </div>

              {cart.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-slate-400 text-xs">
                  Keranjang pesanan kosong. Silakan pilih varian bibit parfum pada katalog.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cart.map((item) => {
                    const info = getVariantPriceInfo(item);
                    return (
                      <div
                        key={`${item.product.id}-${item.packSizeKg}`}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-[10px] shrink-0">
                            {(item.product.application || item.product.fragrance_family || 'FO').slice(0, 3).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{info.variantName}</div>
                            <div className="text-[11px] text-blue-700 font-medium">
                              Harga Varian: {formatIDR(info.priceIdr)} / Kg
                            </div>
                            <div className="font-mono text-[10px] font-bold text-slate-500 mt-0.5">
                              Kemasan: {item.packSizeKg < 1 ? `${Math.round(item.packSizeKg * 1000)} gr (${item.packSizeKg} Kg)` : `${item.packSizeKg} Kg`} | Qty: {item.quantity} Unit ({formatKg(item.packSizeKg * item.quantity)})
                            </div>
                            <div className="font-mono text-[10px] font-bold text-slate-800 mt-0.5">
                              Subtotal: {formatIDR(info.subtotal)}
                            </div>
                          </div>
                        </div>

                        {/* Quantity Controls (Add / Reduce / Remove) */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => handleAdjustQty(item.product.id, item.packSizeKg, -1)}
                              className="w-6 h-6 rounded bg-gray-100 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-slate-700 font-bold transition-colors"
                              title="Kurangi 1 Unit"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-bold text-blue-700 text-xs px-2 min-w-[3rem] text-center">
                              {item.quantity} Unit
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustQty(item.product.id, item.packSizeKg, 1)}
                              className="w-6 h-6 rounded bg-gray-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-slate-700 font-bold transition-colors"
                              title="Tambah 1 Unit"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemove(item.product.id, item.packSizeKg)}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Hapus dari pesanan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Estimated Total Price Summary Bar */}
            {cart.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1">
                <div className="flex justify-between items-center text-slate-800 font-bold text-xs">
                  <span>ESTIMASI TOTAL NILAI BARANG:</span>
                  <span className="font-mono text-base text-blue-700">{formatIDR(estimatedTotal)}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  *Belum termasuk PPN (11%) dan Ongkos Kirim. Rincian total tagihan final akan tertera pada Invoice resmi dari tim Finance.
                </div>
              </div>
            )}

            {/* Payment Method Choice */}
            <div className="mt-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Opsi Pembayaran Diharapkan
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setPaymentMethod('LUNAS_TRANSFER')}
                  className={`cursor-pointer rounded-xl p-3.5 border-2 transition-all ${
                    paymentMethod === 'LUNAS_TRANSFER'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" /> Transfer Bank (Tunai)
                    </span>
                    {paymentMethod === 'LUNAS_TRANSFER' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Bayar via transfer bank setelah Invoice resmi terbit.</p>
                </div>

                <div
                  onClick={() => setPaymentMethod('TEMPO')}
                  className={`cursor-pointer rounded-xl p-3.5 border-2 transition-all ${
                    paymentMethod === 'TEMPO'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-500" /> Kredit Tempo ({customer.credit_terms_days} Hari)
                    </span>
                    {paymentMethod === 'TEMPO' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Bayar sesuai jatuh tempo kredit B2B yang disetujui.</p>
                </div>
              </div>
            </div>

            {/* B2B Workflow Guidance Notice Card */}
            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 space-y-2.5 text-xs text-amber-900">
              <div className="font-bold flex items-center gap-2 text-amber-800 text-sm">
                <Send className="w-4 h-4 text-amber-600" /> Alur Pemesanan & Pembayaran B2B
              </div>
              <div className="space-y-1.5 text-amber-800/90 leading-relaxed text-[11px]">
                <p>
                  1. <strong>Pengajuan Pesanan:</strong> Anda mengajukan daftar pesanan ini ke tim Admin & Finance.
                </p>
                <p>
                  2. <strong>Verifikasi & Penerbitan Invoice:</strong> Tim Finance akan memeriksa ketersediaan stok fisik gudang, konfirmasi harga final, menghitung PPN (11%), serta menentukan ongkos kirim sesuai kurir Anda, lalu menerbitkan <strong>Invoice Resmi</strong>.
                </p>
                <p>
                  3. <strong>Pembayaran:</strong> Setelah Invoice resmi terbit di menu <em>Riwayat Pesanan</em>, Anda dapat mengunduh Invoice dan melakukan pembayaran / mengunggah bukti transfer.
                </p>
              </div>
            </div>
          </div>

          {/* Sticky Actions Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-150 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow transition-all ${
                isSubmitDisabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              }`}
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Mengajukan...' : 'Ajukan Pesanan ke Finance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
