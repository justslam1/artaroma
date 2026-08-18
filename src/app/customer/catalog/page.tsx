'use client';

import React, { useState, useEffect } from 'react';
import { CustomerNav } from '@/components/navigation/customer-nav';
import { CheckoutModal } from '@/components/customer/checkout-modal';
import { initialCustomers } from '@/lib/mock-data';
import { Product, Customer, SalesOrder, SOItem } from '@/lib/types';
import { formatKg, formatIDR } from '@/lib/utils';
import { getStoredOrders, saveStoredOrders, getStoredInvoices, saveStoredInvoices } from '@/lib/order-store';
import { getUsdExchangeRate, convertUsdToIdr } from '@/lib/currency-store';
import { getApplications } from '@/lib/application-store';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Database,
  AlertCircle,
  Tag,
  Package,
  FileSpreadsheet,
} from 'lucide-react';
import { exportPricelistToXLSX } from '@/lib/export-excel';

const getProductReferencePrice = (product: Product, usdRate: number) => {
  if (product.variants && product.variants.length > 0) {
    const activeVar = product.variants.find(v => v.is_active !== false) || product.variants[0];
    if (activeVar) {
      if (activeVar.selling_price_usd_per_kg) {
        return Number(activeVar.selling_price_usd_per_kg);
      }
      if (activeVar.selling_price_per_kg) {
        return Number(activeVar.selling_price_per_kg) / usdRate;
      }
    }
  }
  if (product.selling_price_usd_per_kg) {
    return Number(product.selling_price_usd_per_kg);
  }
  if (product.selling_price_per_kg) {
    return Number(product.selling_price_per_kg) / usdRate;
  }
  return 1250000 / usdRate; // fallback
};

export default function CustomerCatalogPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [currentCustomer, setCurrentCustomer] = useState<Customer>(initialCustomers[0]);

  // Dynamic Products state fetched from MySQL Database API
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active USD exchange rate & Application Categories
  const [usdRate, setUsdRate] = useState<number>(16250);
  const [applicationCategories, setApplicationCategories] = useState<string[]>(['Industry', 'Fine Fragrance']);

  const [selectedApplication, setSelectedApplication] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [cartItems, setCartItems] = useState<{ product: Product; packSizeKg: number; quantity: number }[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Minimum purchase unit: 1 Kg whole increments
  const presets = [1, 5, 10, 25];

  // Fetch products from MySQL database API (/api/products)
  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setProducts(json.data);
      } else {
        throw new Error(json.message || 'Gagal memuat produk dari database.');
      }
    } catch (err: any) {
      console.error('Failed to fetch products from API:', err);
      setError(err.message || 'Koneksi ke MySQL database gagal.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setCustomers(json.data);
        const savedId = localStorage.getItem('artaroma_customer_id');
        const matched = json.data.find((c: any) => c.id === savedId) || json.data[0];
        if (matched) {
          setCurrentCustomer(matched);
        }
      }
    } catch (err) {
      console.error('Failed to fetch customers in B2B portal:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    setUsdRate(getUsdExchangeRate());
    setApplicationCategories(getApplications());

    const handleUpdate = () => {
      setUsdRate(getUsdExchangeRate());
      setApplicationCategories(getApplications());
    };
    window.addEventListener('artaroma_currency_updated', handleUpdate);
    window.addEventListener('artaroma_applications_updated', handleUpdate);
    return () => {
      window.removeEventListener('artaroma_currency_updated', handleUpdate);
      window.removeEventListener('artaroma_applications_updated', handleUpdate);
    };
  }, []);

  const handleAddToCart = (product: Product, packSizeKg: number) => {
    const existingIdx = cartItems.findIndex(
      (item) => item.product.id === product.id && item.packSizeKg === packSizeKg
    );
    if (existingIdx >= 0) {
      const updated = [...cartItems];
      updated[existingIdx].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, { product, packSizeKg, quantity: 1 }]);
    }
  };

  const handleReduceFromCart = (product: Product, packSizeKg: number) => {
    const existingIdx = cartItems.findIndex(
      (item) => item.product.id === product.id && item.packSizeKg === packSizeKg
    );
    if (existingIdx >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIdx].quantity - 1;
      if (newQty <= 0) {
        setCartItems(
          cartItems.filter(
            (item) => !(item.product.id === product.id && item.packSizeKg === packSizeKg)
          )
        );
      } else {
        updated[existingIdx].quantity = newQty;
        setCartItems(updated);
      }
    }
  };

  const handleRemoveFromCart = (productId: string, packSizeKg: number) => {
    setCartItems(
      cartItems.filter(
        (item) => !(item.product.id === productId && item.packSizeKg === packSizeKg)
      )
    );
  };

  const filteredProducts = products.filter((p) => {
    // 1. Check if product is set/allowed for this customer by Super Admin
    const isAllowedForCustomer =
      !currentCustomer.allowed_product_ids ||
      currentCustomer.allowed_product_ids.length === 0 ||
      currentCustomer.allowed_product_ids.includes(p.id);

    // 2. Application & Search filters
    const prodApps = p.applications && p.applications.length > 0
      ? p.applications
      : [p.application || 'Fine Fragrance'];

    const matchesApplication = selectedApplication === 'ALL' || prodApps.includes(selectedApplication);
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.top_notes && p.top_notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.middle_notes && p.middle_notes.toLowerCase().includes(searchTerm.toLowerCase()));

    return isAllowedForCustomer && matchesApplication && matchesSearch;
  });

  const totalItemCount = cartItems.length;
  const totalWeightKg = cartItems.reduce((sum, item) => sum + (item.packSizeKg * item.quantity), 0);

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20">
      <CustomerNav
        currentCustomer={currentCustomer}
        onCustomerChange={(id) => {
          const c = customers.find((c) => c.id === id);
          if (c) {
            setCurrentCustomer(c);
            localStorage.setItem('artaroma_customer_id', id);
          }
        }}
        allCustomers={customers}
        cartCount={cartItems.length}
        onOpenCart={() => setIsCheckoutOpen(true)}
      />

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
        {/* Header Title with Live DB & Currency Info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              Katalog Produk
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportPricelistToXLSX(products, usdRate, `Katalog_Pricelist_Artaroma_${new Date().toISOString().split('T')[0]}.xlsx`)}
              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Ekspor Katalog & Pricelist ke File Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" /> Ekspor Pricelist (XLSX)
            </button>
            <span className="bg-blue-50 text-blue-800 border border-blue-200 text-xs font-mono font-bold px-3 py-1.5 rounded-lg">
              Kurs Hari Ini: 1 USD = {formatIDR(usdRate)}
            </span>
            <button
              onClick={fetchProducts}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '↻ Refresh Data'}
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', ...applicationCategories].map((app) => (
              <button
                key={app}
                onClick={() => setSelectedApplication(app)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${
                  selectedApplication === app
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white text-slate-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                }`}
              >
                {app === 'ALL' ? 'Semua Aplikasi' : app}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari varian / aroma notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Loading Spinner State */}
        {isLoading && (
          <div className="py-16 text-center space-y-3 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Mengambil Daftar Produk dari Database MySQL `fragrance_hub`...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Gagal memuat produk: {error}</span>
            </div>
            <button
              onClick={fetchProducts}
              className="bg-red-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-red-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}


        {/* PRODUCT GRID VIEW (TAMPILAN MODERN E-COMMERCE CARD GRID) */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const packSizes = product.pack_sizes || [25, 5, 1];

              return (
                <div key={product.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-350 transition-all flex flex-col group">
                  {/* Scent Visual Header */}
                  <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-5 text-white relative overflow-hidden flex-shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-[9px] font-bold text-blue-400 tracking-wider bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded">
                        {product.sku}
                      </span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                        {(product.applications && product.applications.length > 0
                          ? product.applications
                          : [product.application || 'Fine Fragrance']
                        ).map((app) => (
                          <span key={app} className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider bg-white/10 text-white backdrop-blur-xs">
                            {app}
                          </span>
                        ))}
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-white mt-3.5 tracking-tight group-hover:text-amber-300 transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  {/* Scent Pyramid Profile Label */}
                  <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex-1 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">PROFIL AROMA</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] leading-relaxed">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Top Note</span>
                        <span className="font-semibold text-slate-700 truncate block" title={product.top_notes || '-'}>{product.top_notes || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Mid Note</span>
                        <span className="font-semibold text-slate-700 truncate block" title={product.middle_notes || '-'}>{product.middle_notes || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Base Note</span>
                        <span className="font-semibold text-slate-500 truncate block" title={product.base_notes || '-'}>{product.base_notes || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Scent Pack Sizes Ordered Rows */}
                  <div className="p-4 space-y-3 bg-white">
                    {packSizes.map((kg) => {
                      const variant = product.variants?.find(
                        (v) => Math.round(Number(v.pack_size_kg)) === kg
                      );
                      const variantIdr = variant?.selling_price_per_kg 
                        ? Number(variant.selling_price_per_kg) 
                        : (product.selling_price_per_kg || (kg === 25 ? 1353000 : kg === 5 ? 1090000 : 1100000));
                      
                      const variantUsd = variant?.selling_price_usd_per_kg 
                        ? Number(variant.selling_price_usd_per_kg) 
                        : (product.selling_price_usd_per_kg || (variantIdr / usdRate));

                      const variantInCart = cartItems.find(
                        (item) => item.product.id === product.id && item.packSizeKg === kg
                      );
                      const variantStockKg = product.variant_stocks
                        ? (product.variant_stocks[String(kg)] ?? 0)
                        : (product.total_stock_kg ?? 9999);
                      const maxAvailableUnits = Math.max(0, Math.floor(variantStockKg / kg));
                      const currentQtyInCart = variantInCart ? variantInCart.quantity : 0;
                      const isOutOfStock = maxAvailableUnits <= 0;
                      const isAddDisabled = isOutOfStock || (currentQtyInCart >= maxAvailableUnits);

                      return (
                        <div key={kg} className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-all bg-slate-50/40">
                          {/* Scent size & stock status */}
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-slate-900 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded">
                                {kg} Kg
                              </span>
                              {isOutOfStock ? (
                                <span className="text-[9px] text-red-600 font-extrabold">HABIS</span>
                              ) : (
                                <span className="text-[9px] text-slate-400 font-bold uppercase">
                                  Stok: {maxAvailableUnits}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              (${Number(variantUsd).toFixed(2)} USD/Kg)
                            </div>
                          </div>

                          {/* Price Display */}
                          <div className="text-right flex-1 pr-1.5">
                            <span className="text-sm font-black text-slate-800 font-mono block">
                              {formatIDR(variantIdr)}<span className="text-[10px] text-slate-500 font-normal">/Kg</span>
                            </span>
                          </div>

                          {/* Add to Cart Actions */}
                          <div className="flex items-center gap-1">
                            {variantInCart ? (
                              <>
                                <button
                                  onClick={() => handleReduceFromCart(product, kg)}
                                  className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg flex items-center justify-center font-black text-sm transition-colors cursor-pointer"
                                  title="Kurangi 1 Unit"
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs font-bold text-slate-850 px-1 min-w-[18px] text-center">
                                  {variantInCart.quantity}
                                </span>
                              </>
                            ) : null}
                            <button
                              onClick={() => !isAddDisabled && handleAddToCart(product, kg)}
                              disabled={isAddDisabled}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-sm transition-colors cursor-pointer ${
                                isAddDisabled
                                  ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                              }`}
                              title={isAddDisabled ? (isOutOfStock ? "Stok Habis" : "Batas Maksimal Stok Tercapai") : "Tambah ke Keranjang"}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 transition-all"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Pesanan ({totalItemCount} Varian)</span>
            <span className="bg-white text-blue-700 font-mono font-bold px-2 py-0.5 rounded-lg text-xs">
              {formatKg(totalWeightKg)}
            </span>
          </button>
        </div>
      )}

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cartItems}
        customer={currentCustomer}
        usdRate={usdRate}
        onUpdateCart={(updatedCart) => setCartItems(updatedCart)}
        onSuccess={async (submittedData) => {
          // Snapshot cart items before clearing
          const snapshotCart = [...cartItems];
          const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

          const itemPayload = snapshotCart.map((c) => {
            const variant = c.product.variants?.find(
              (v) => Math.round(Number(v.pack_size_kg)) === c.packSizeKg
            );
            const pIdr = variant?.selling_price_per_kg
              ? Number(variant.selling_price_per_kg)
              : (c.product.selling_price_per_kg || (c.packSizeKg === 25 ? 1353000 : c.packSizeKg === 5 ? 1090000 : 1100000));

            return {
              product_id: c.product.id,
              product_name: `${c.product.name} ${c.packSizeKg}K`,
              qty_kg: c.packSizeKg * c.quantity,
              unit_price_per_kg: pIdr,
            };
          });

          try {
            // POST to backend API — awaited so we know the result before continuing
            const res = await fetch('/api/sales-orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customer_id: currentCustomer.id,
                payment_method: submittedData.payment_method,
                items: itemPayload,
              }),
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
              // Server-side rejection (credit limit, overdue, stock, etc.)
              alert(`Pesanan GAGAL diajukan:\n${json.message || 'Terjadi kesalahan pada server.'}`);
              return;
            }

            // Use SO number from the server response
            const savedSoNumber = json.data?.so_number || `SO-2026-07-${Math.floor(100 + Math.random() * 900)}`;
            const savedSoId = json.data?.id || `so-${Date.now()}`;

            // Build local order object for instant customer portal UI sync
            const orderItems: SOItem[] = itemPayload.map((item, idx) => ({
              id: `so-item-${Date.now()}-${idx}`,
              so_id: savedSoId,
              product_id: item.product_id,
              product_name: item.product_name,
              qty_kg: item.qty_kg,
              unit_price_per_kg: item.unit_price_per_kg,
              subtotal: item.unit_price_per_kg * item.qty_kg,
            }));

            const newOrder: SalesOrder = {
              id: savedSoId,
              so_number: savedSoNumber,
              customer_id: currentCustomer.id,
              customer_name: currentCustomer.pic_name,
              customer_company: currentCustomer.company_name,
              status: 'DIAJUKAN',
              payment_method: submittedData.payment_method || 'LUNAS_TRANSFER',
              order_date: nowStr,
              items: orderItems,
            };

            // Save to local order store for instant customer orders page sync
            const currentOrders = getStoredOrders();
            saveStoredOrders([newOrder, ...currentOrders]);

            // Pre-create invoice in local store if payment proof uploaded
            if (submittedData.payment_proof_url) {
              const grandTotal = orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
              const newInv = {
                id: `inv-${Date.now()}`,
                invoice_number: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
                so_id: savedSoId,
                so_number: savedSoNumber,
                customer_id: currentCustomer.id,
                customer_name: currentCustomer.company_name,
                status: 'UNPAID' as const,
                issue_date: nowStr.split(' ')[0],
                due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                total_amount: grandTotal,
                paid_amount: 0,
                payment_proof_url: submittedData.payment_proof_url,
                payment_verification_status: 'PENDING' as const,
              };
              const currentInvoices = getStoredInvoices();
              saveStoredInvoices([newInv, ...currentInvoices]);
            }

            setCartItems([]);
            fetchProducts();
            window.dispatchEvent(new Event('artaroma_orders_updated'));
            window.dispatchEvent(new Event('artaroma_new_so_created'));
            alert(`✅ Pesanan B2B (${savedSoNumber}) Berhasil Diajukan!\nMenunggu verifikasi pembayaran & konfirmasi stok dari Admin.`);

          } catch (err: any) {
            console.error('Checkout API error:', err);
            alert(`Pesanan GAGAL diajukan. Periksa koneksi jaringan Anda.\nError: ${err.message}`);
          }
        }}
      />
    </div>
  );
}
