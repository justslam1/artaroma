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
  LayoutGrid,
  List,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
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

  // UX Optimization States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPackSizes, setSelectedPackSizes] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'>('name-asc');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Minimum purchase unit: 0.1 Kg (100 gram) increments
  const presets = [25, 5, 1, 0.1];

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
      // 1. Check logged-in user session
      let authUser: any = null;
      try {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
        const meJson = await meRes.json();
        if (meJson.success && meJson.user) {
          authUser = meJson.user;
        }
      } catch {}

      const res = await fetch('/api/customers', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        if (authUser && authUser.role === 'CUSTOMER') {
          // If logged in as Customer, strictly filter & lock to their own account only
          const matched =
            json.data.find(
              (c: any) =>
                c.id === authUser.customer_id ||
                c.company_name === authUser.name ||
                c.pic_name === authUser.name ||
                c.company_name === authUser.linked_entity_name
            ) || json.data[0];

          setCurrentCustomer(matched);
          setCustomers([matched]);
        } else {
          // Admin viewing / simulating customer catalog
          setCustomers(json.data);
          const savedId = localStorage.getItem('artaroma_customer_id');
          const matched = json.data.find((c: any) => c.id === savedId) || json.data[0];
          if (matched) {
            setCurrentCustomer(matched);
          }
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
    const isAllowedForCustomer = Boolean(
      currentCustomer.allowed_product_ids &&
      currentCustomer.allowed_product_ids.includes(p.id)
    );

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

  const getBasePrice = (p: Product) => {
    if (p.selling_price_per_kg) return Number(p.selling_price_per_kg);
    if (p.variants && p.variants.length > 0) {
      const v = p.variants[0];
      if (v.selling_price_per_kg) return Number(v.selling_price_per_kg);
      if (v.selling_price_usd_per_kg) return Number(v.selling_price_usd_per_kg) * usdRate;
    }
    if (p.selling_price_usd_per_kg) return Number(p.selling_price_usd_per_kg) * usdRate;
    return 1000000;
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    if (sortBy === 'price-asc') return getBasePrice(a) - getBasePrice(b);
    if (sortBy === 'price-desc') return getBasePrice(b) - getBasePrice(a);
    return 0;
  });

  const displayedProducts = sortedProducts.slice(0, visibleCount);

  const totalItemCount = cartItems.length;
  const totalWeightKg = cartItems.reduce((sum, item) => sum + (item.packSizeKg * item.quantity), 0);

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-28 sm:pb-20">
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

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Header Title with Live DB & Currency Info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
              Katalog Bibit Parfum
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {displayedProducts.length} dari {filteredProducts.length} produk tersedia
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <button
              onClick={() => exportPricelistToXLSX(products, usdRate, `Katalog_Pricelist_Artaroma_${new Date().toISOString().split('T')[0]}.xlsx`)}
              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Ekspor Katalog & Pricelist ke File Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Ekspor XLSX
            </button>
            <span className="bg-blue-50 text-blue-800 border border-blue-200 text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg">
              1 USD = {formatIDR(usdRate)}
            </span>
            <button
              onClick={fetchProducts}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1 cursor-pointer ml-auto md:ml-0"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '↻ Refresh'}
            </button>
          </div>
        </div>

        {/* Filter, Search & View Controls Bar (Sticky on Scroll) */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-3.5 sm:p-4 space-y-3 sticky top-14 z-20">
          {/* Top Row: Categories & Search */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {['ALL', ...applicationCategories].map((app) => (
                <button
                  key={app}
                  onClick={() => {
                    setSelectedApplication(app);
                    setVisibleCount(12);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border cursor-pointer ${
                    selectedApplication === app
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-slate-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                  }`}
                >
                  {app === 'ALL' ? 'Semua Aplikasi' : app}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama aroma / notes..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setVisibleCount(12);
                }}
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Bottom Controls Row: View Mode Switcher & Sort By */}
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-gray-100 text-xs">
            {/* View Mode Toggle: Grid vs Compact List */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-700 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Kartu Modern"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kartu Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-700 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan List Ringkas (Hemat Ruang)"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Daftar Kompak</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Urutkan:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-400 cursor-pointer pr-6 appearance-none"
                >
                  <option value="name-asc">Nama (A &rarr; Z)</option>
                  <option value="name-desc">Nama (Z &rarr; A)</option>
                  <option value="price-asc">Harga Termurah</option>
                  <option value="price-desc">Harga Tertinggi</option>
                </select>
                <ArrowUpDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading Spinner State */}
        {isLoading && (
          <div className="py-16 text-center space-y-3 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Mengambil Daftar Produk dari Database MySQL...</p>
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

        {/* Empty Search State */}
        {!isLoading && !error && displayedProducts.length === 0 && (
          <div className="py-16 text-center space-y-3 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">Tidak ada produk yang cocok</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Coba gunakan kata kunci pencarian lain atau pilih kategori aplikasi "Semua Aplikasi".
            </p>
          </div>
        )}

        {/* 1. GRID VIEW: SLEEK COMPACT CARDS WITH HORIZONTAL PACK SELECTOR */}
        {!isLoading && !error && viewMode === 'grid' && displayedProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
            {displayedProducts.map((product) => {
              const rawPackSizes = product.pack_sizes && product.pack_sizes.length > 0 ? product.pack_sizes : [25, 5, 1, 0.1];
              const packSizes = Array.from(new Set([...rawPackSizes, 0.1])).sort((a, b) => b - a);
              const activeKg = selectedPackSizes[product.id] ?? packSizes[0];

              const variant = product.variants?.find(
                (v) => Math.abs(Number(v.pack_size_kg) - Number(activeKg)) < 0.01
              );
              const variantIdr = variant?.selling_price_per_kg 
                ? Number(variant.selling_price_per_kg) 
                : (product.selling_price_per_kg || (activeKg === 25 ? 1353000 : activeKg === 5 ? 1090000 : activeKg === 1 ? 1100000 : 1200000));
              
              const variantUsd = variant?.selling_price_usd_per_kg 
                ? Number(variant.selling_price_usd_per_kg) 
                : (product.selling_price_usd_per_kg || (variantIdr / usdRate));

              const variantInCart = cartItems.find(
                (item) => item.product.id === product.id && Math.abs(item.packSizeKg - activeKg) < 0.01
              );
              const currentQtyInCart = variantInCart ? variantInCart.quantity : 0;
              const selectedWeightKg = currentQtyInCart * activeKg;

              const isNotesOpen = Boolean(expandedNotes[product.id]);

              return (
                <div
                  key={product.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col group"
                >
                  {/* Scent Visual Header */}
                  <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-3.5 sm:p-4 text-white relative overflow-hidden flex-shrink-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-mono text-[9px] font-bold text-blue-400 tracking-wider bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded">
                        {product.sku}
                      </span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[65%]">
                        {(product.applications && product.applications.length > 0
                          ? product.applications
                          : [product.application || 'Fine Fragrance']
                        ).map((app) => (
                          <span
                            key={app}
                            className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider bg-white/10 text-white backdrop-blur-xs"
                          >
                            {app}
                          </span>
                        ))}
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-white mt-2 tracking-tight group-hover:text-amber-300 transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  {/* Scent Profile Notes (Compact Bar with Toggle) */}
                  <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                          AROMA
                        </span>
                        <span className="text-[11px] text-slate-600 truncate font-medium">
                          {product.top_notes ? `${product.top_notes}` : 'Fragrance Oil'}
                          {product.middle_notes ? ` • ${product.middle_notes}` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedNotes((prev) => ({ ...prev, [product.id]: !prev[product.id] }))}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold shrink-0 ml-1 flex items-center gap-0.5 cursor-pointer"
                        title="Lihat detail piramida aroma"
                      >
                        {isNotesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Detailed Notes Drawer */}
                    {isNotesOpen && (
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[10px] animate-in fade-in duration-150">
                        <div>
                          <span className="text-slate-400 font-bold block uppercase">Top Note</span>
                          <span className="font-semibold text-slate-700 truncate block">{product.top_notes || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block uppercase">Mid Note</span>
                          <span className="font-semibold text-slate-700 truncate block">{product.middle_notes || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block uppercase">Base Note</span>
                          <span className="font-semibold text-slate-500 truncate block">{product.base_notes || '-'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Horizontal Segmented Pack Selector & Order Action */}
                  <div className="p-3.5 sm:p-4 space-y-3 bg-white flex-1 flex flex-col justify-between">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Ukuran Kemasan:
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {packSizes.map((kg) => {
                          const isSelected = Math.abs(activeKg - kg) < 0.01;
                          const hasInCart = cartItems.some(
                            (i) => i.product.id === product.id && Math.abs(i.packSizeKg - kg) < 0.01
                          );
                          return (
                            <button
                              key={kg}
                              type="button"
                              onClick={() => setSelectedPackSizes((prev) => ({ ...prev, [product.id]: kg }))}
                              className={`py-1.5 px-1 rounded-lg text-center font-mono text-xs font-bold transition-all relative cursor-pointer ${
                                isSelected
                                  ? 'bg-slate-900 text-white shadow-xs ring-2 ring-slate-800'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                              }`}
                            >
                              {kg < 1 ? `${Math.round(kg * 1000)}g` : `${kg} Kg`}
                              {hasInCart && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 absolute -top-0.5 -right-0.5 ring-1 ring-white" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Price Box & Action Controls */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900 font-mono">
                            {formatIDR(variantIdr)}
                            <span className="text-[10px] font-normal text-slate-500">/Kg</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            (${Number(variantUsd).toFixed(2)} USD/Kg)
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-mono text-slate-700 font-bold block">
                            Total: {formatIDR(variantIdr * activeKg)}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono block">
                            per kemasan {activeKg < 1 ? `${Math.round(activeKg * 1000)}g` : `${activeKg}kg`}
                          </span>
                        </div>
                      </div>

                      {/* Action Row */}
                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="text-left flex-1 min-w-0">
                          {currentQtyInCart > 0 ? (
                            <span className="text-[10px] font-bold text-blue-700 font-mono block truncate">
                              Terpilih: {formatKg(selectedWeightKg)} ({currentQtyInCart} unit)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block truncate">
                              Belum dipilih
                            </span>
                          )}
                        </div>

                        {currentQtyInCart > 0 ? (
                          <div className="flex items-center bg-white border border-blue-300 rounded-lg p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleReduceFromCart(product, activeKg)}
                              className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-600 rounded flex items-center justify-center font-black text-xs transition-colors cursor-pointer"
                              title="Kurangi 1 Unit"
                            >
                              -
                            </button>
                            <span className="font-mono text-xs font-bold text-blue-700 px-2.5 min-w-[24px] text-center">
                              {currentQtyInCart}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product, activeKg)}
                              className="w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center font-black text-xs transition-colors cursor-pointer shadow-2xs"
                              title="Tambah 1 Unit"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product, activeKg)}
                            className="h-8 px-3.5 rounded-lg flex items-center justify-center gap-1 font-bold text-xs transition-all cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Pesan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. LIST VIEW: COMPACT TABLE / ROW LIST (SUPER COMPACT FOR REPEAT ORDERING) */}
        {!isLoading && !error && viewMode === 'list' && displayedProducts.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-gray-100">
            {displayedProducts.map((product) => {
              const rawPackSizes = product.pack_sizes && product.pack_sizes.length > 0 ? product.pack_sizes : [25, 5, 1, 0.1];
              const packSizes = Array.from(new Set([...rawPackSizes, 0.1])).sort((a, b) => b - a);
              const activeKg = selectedPackSizes[product.id] ?? packSizes[0];

              const variant = product.variants?.find(
                (v) => Math.abs(Number(v.pack_size_kg) - Number(activeKg)) < 0.01
              );
              const variantIdr = variant?.selling_price_per_kg 
                ? Number(variant.selling_price_per_kg) 
                : (product.selling_price_per_kg || (activeKg === 25 ? 1353000 : activeKg === 5 ? 1090000 : activeKg === 1 ? 1100000 : 1200000));

              const variantInCart = cartItems.find(
                (item) => item.product.id === product.id && Math.abs(item.packSizeKg - activeKg) < 0.01
              );
              const currentQtyInCart = variantInCart ? variantInCart.quantity : 0;

              return (
                <div
                  key={product.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Left: Product Info & Notes */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                        {product.sku}
                      </span>
                      <h4 className="font-bold text-sm text-slate-800 truncate">
                        {product.name}
                      </h4>
                      {(product.applications || [product.application || 'Fine Fragrance']).map((app) => (
                        <span key={app} className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {app}
                        </span>
                      ))}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      <span className="font-medium text-amber-700">Aroma:</span> {product.top_notes || '-'} {product.middle_notes ? `• ${product.middle_notes}` : ''}
                    </div>
                  </div>

                  {/* Middle: Horizontal Pack Selector */}
                  <div className="flex items-center gap-1 overflow-x-auto shrink-0">
                    {packSizes.map((kg) => {
                      const isSelected = Math.abs(activeKg - kg) < 0.01;
                      return (
                        <button
                          key={kg}
                          type="button"
                          onClick={() => setSelectedPackSizes((prev) => ({ ...prev, [product.id]: kg }))}
                          className={`py-1 px-2 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {kg < 1 ? `${Math.round(kg * 1000)}g` : `${kg}k`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: Price & Quick Add Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-black font-mono text-slate-900">
                        {formatIDR(variantIdr)}<span className="text-[10px] font-normal text-slate-400">/Kg</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Total: {formatIDR(variantIdr * activeKg)}
                      </div>
                    </div>

                    {currentQtyInCart > 0 ? (
                      <div className="flex items-center bg-white border border-blue-300 rounded-lg p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleReduceFromCart(product, activeKg)}
                          className="w-6 h-6 bg-red-50 hover:bg-red-100 text-red-600 rounded flex items-center justify-center font-black text-xs transition-colors cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold text-blue-700 px-2 min-w-[20px] text-center">
                          {currentQtyInCart}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product, activeKg)}
                          className="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center font-black text-xs transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product, activeKg)}
                        className="h-7 px-3 rounded-lg flex items-center gap-1 font-bold text-xs transition-all cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Pesan</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Pagination Button */}
        {!isLoading && !error && displayedProducts.length < sortedProducts.length && (
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 12)}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-6 py-2.5 rounded-xl border border-gray-200 shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Muat Lebih Banyak ({sortedProducts.length - displayedProducts.length} Produk Tersisa)</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* FLOATING BOTTOM CART BAR (MOBILE STICKY & DESKTOP FLOATING) */}
      {cartItems.length > 0 && (
        <>
          {/* Mobile Full-Width Sticky Bottom Bar */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-4 py-3 shadow-2xl flex items-center justify-between text-white animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm shadow-sm relative">
                <ShoppingBag className="w-4 h-4 text-white" />
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {totalItemCount}
                </span>
              </div>
              <div>
                <div className="text-xs font-bold font-mono">
                  {formatKg(totalWeightKg)} • {totalItemCount} Varian
                </div>
                <div className="text-[10px] text-amber-300 font-mono">
                  Total: {formatIDR(
                    cartItems.reduce((sum, c) => {
                      const variant = c.product.variants?.find(
                        (v) => Math.abs(Number(v.pack_size_kg) - c.packSizeKg) < 0.01
                      );
                      const pIdr = variant?.selling_price_per_kg
                        ? Number(variant.selling_price_per_kg)
                        : (c.product.selling_price_per_kg || 1100000);
                      return sum + (pIdr * c.packSizeKg * c.quantity);
                    }, 0)
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Checkout</span>
              <span>&rarr;</span>
            </button>
          </div>

          {/* Desktop Floating Cart Button */}
          <div className="hidden sm:block fixed bottom-6 right-6 z-40 animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Pesanan ({totalItemCount} Varian)</span>
              <span className="bg-white text-blue-700 font-mono font-bold px-2 py-0.5 rounded-lg text-xs">
                {formatKg(totalWeightKg)}
              </span>
            </button>
          </div>
        </>
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
              requires_super_admin_approval: json.requires_super_admin_approval || json.data?.requires_super_admin_approval || false,
              credit_approval_status: (json.requires_super_admin_approval || json.data?.requires_super_admin_approval) ? 'PENDING' : 'APPROVED',
              credit_warning: json.credit_warning || json.data?.credit_warning,
              credit_limit_amount: json.data?.credit_limit_amount,
              current_piutang_amount: json.data?.current_piutang_amount,
              projected_piutang_amount: json.data?.projected_piutang_amount,
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

            if (json.requires_super_admin_approval) {
              alert(
                `⚠️ Pesanan B2B (${savedSoNumber}) Berhasil Diajukan!\n\n` +
                `Catatan: Pesanan Anda memerlukan Persetujuan Khusus (Approval) dari Super Admin karena melebihi plafon kredit atau terdapat tagihan yang telah jatuh tempo sebelum proses penerbitan invoice dilanjutkan.`
              );
            } else {
              alert(`✅ Pesanan B2B (${savedSoNumber}) Berhasil Diajukan!\nMenunggu verifikasi dan penerbitan Invoice resmi dari Finance.`);
            }

          } catch (err: any) {
            console.error('Checkout API error:', err);
            alert(`Pesanan GAGAL diajukan. Periksa koneksi jaringan Anda.\nError: ${err.message}`);
          }
        }}
      />
    </div>
  );
}
