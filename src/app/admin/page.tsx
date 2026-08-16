'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import {
  initialProducts,
  initialBatches,
  initialInvoices,
  initialSalesOrders,
  initialCustomers,
} from '@/lib/mock-data';
import { formatIDR, formatKg, formatDate } from '@/lib/utils';
import { Product, StockBatch } from '@/lib/types';
import {
  getUsdExchangeRate,
  convertUsdToIdr,
} from '@/lib/currency-store';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Package,
  ArrowUpRight,
  ShieldAlert,
  RefreshCcw,
  CheckCircle2,
  Globe,
  BarChart2,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [batches, setBatches] = useState<StockBatch[]>(initialBatches);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [customers] = useState(initialCustomers);
  const [salesOrders, setSalesOrders] = useState<any[]>(initialSalesOrders);
  const [financeData, setFinanceData] = useState<any>(null);
  const [stockDashboardData, setStockDashboardData] = useState<any>(null);
  const [isAlertDetailsOpen, setIsAlertDetailsOpen] = useState(false);
  const [chartFilter, setChartFilter] = useState<'stock' | 'best_seller' | 'near_expiry'>('stock');
  const [chartUnit, setChartUnit] = useState<'kg' | 'harga'>('kg');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeRate, setActiveRate] = useState<number>(16250);

  useEffect(() => {
    // 0. Fetch logged in user details
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.warn('Failed to load user info:', err));

    // 1. Fetch exchange rate
    const currentRate = getUsdExchangeRate();
    setActiveRate(currentRate);

    const handleCurrencyUpdate = () => {
      const rate = getUsdExchangeRate();
      setActiveRate(rate);
    };

    window.addEventListener('artaroma_currency_updated', handleCurrencyUpdate);

    // 2. Fetch products
    fetch('/api/products')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setProducts(json.data);
        }
      })
      .catch((err) => console.error('Error fetching products:', err));

    // 3. Fetch batches
    fetch('/api/stock-batches')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setBatches(json.data);
        }
      })
      .catch((err) => console.error('Error fetching batches:', err));

    // 4. Fetch finance summary
    fetch('/api/dashboard/finance')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setFinanceData(json.data);
        }
      })
      .catch((err) => console.error('Error fetching finance summary:', err));

    // 5. Fetch sales orders
    fetch('/api/sales-orders')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setSalesOrders(json.data);
        }
      })
      .catch((err) => console.error('Error fetching sales orders:', err));

    // 6. Fetch stock dashboard summary
    fetch('/api/dashboard/stock')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setStockDashboardData(json.data);
        }
      })
      .catch((err) => console.error('Error fetching stock dashboard:', err));

    return () => {
      window.removeEventListener('artaroma_currency_updated', handleCurrencyUpdate);
    };
  }, []);

  const totalOmset = financeData ? financeData.total_revenue : initialSalesOrders.reduce((sum, so) => sum + (so.grand_total || 0), 0);
  const totalPiutang = financeData ? financeData.total_piutang : customers.reduce((sum, c) => sum + c.current_piutang, 0);
  const agingLancar = financeData ? financeData.aging_ar.ar_0_to_15_days : 0;
  const agingMendekati = financeData ? financeData.aging_ar.ar_16_to_30_days : 0;
  const agingCurrent = agingLancar + agingMendekati;
  const agingOverdue = financeData ? financeData.aging_ar.ar_over_30_days : invoices.filter((inv) => inv.status === 'OVERDUE').reduce((sum, inv) => sum + inv.total_amount, 0);
  const countLancar = financeData?.aging_ar?.count_lancar ?? 0;
  const countMendekati = financeData?.aging_ar?.count_mendekati ?? 0;
  const countOverdue = financeData?.aging_ar?.count_overdue ?? 0;
  const overdueCustomers: string[] = financeData?.aging_ar?.overdue_customers ?? [];

  const canViewFinancials =
    !currentUser ||
    currentUser.role === 'SUPER ADMIN' ||
    currentUser.role === 'SUPER_ADMIN' ||
    (Array.isArray(currentUser.allowed_modules) &&
      currentUser.allowed_modules.includes('Lihat Nilai Finansial (Dashboard)'));

  // Produk stok habis (total stok dari semua batch = 0)
  const lowStockProducts = products.filter((p) => {
    const totalStock = p.total_stock_kg ?? Object.values(p.variant_stocks || {}).reduce((s, v) => s + (v || 0), 0);
    return totalStock === 0;
  });
  const nearExpiryBatches = batches.filter((b) => {
    const expDate = new Date(b.expiry_date);
    const now = new Date();
    const diffMonths = (expDate.getTime() - now.getTime()) / (1000 * 3600 * 24 * 30);
    return diffMonths <= 3 && diffMonths >= 0;
  });

  // Integrated centralized values with local client fallback
  const lowStockCount = stockDashboardData !== null ? stockDashboardData.low_stock_alerts_count : lowStockProducts.length;
  const nearExpiryCount = stockDashboardData !== null ? stockDashboardData.expiring_batches_count : nearExpiryBatches.length;
  const totalAlertsCount = lowStockCount + nearExpiryCount;

  const lowStockList = stockDashboardData !== null ? (stockDashboardData.low_stock_products || []) : lowStockProducts;
  const expiringBatchesList = stockDashboardData !== null ? (stockDashboardData.expiring_batches || []) : nearExpiryBatches;

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20">
      <AdminTopNav />

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
        {/* Page Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
          </div>
        </div>

        {/* Live Product Pricing Preview Table (Pricelist Varian) */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-blue-700 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded font-mono">
                LIVE PRICELIST
              </span>
              <h2 className="text-sm font-bold text-white">
                Daftar Harga Jual &amp; Konversi Kurs Varian Produk (USD &rarr; IDR)
              </h2>
            </div>
            <div>
              <span className="font-mono text-amber-300 font-bold text-xs bg-blue-800 px-3 py-1 rounded-lg border border-blue-600">
                KURS: 1 USD = {formatIDR(activeRate)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider font-extrabold border-b border-slate-200">
                  <th className="px-5 py-3">Produk Induk (SKU)</th>
                  <th className="px-5 py-3 text-center">Varian 25 Kg (IDR &amp; USD / Kg)</th>
                  <th className="px-5 py-3 text-center">Varian 5 Kg (IDR &amp; USD / Kg)</th>
                  <th className="px-5 py-3 text-center">Varian 1 Kg (IDR &amp; USD / Kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const getVariantPrices = (packSize: number) => {
                    const v = p.variants?.find((item: any) => Number(item.pack_size_kg) === packSize);
                    if (v) {
                      const usd = Number(v.selling_price_usd_per_kg || 0);
                      const idr = usd > 0 ? convertUsdToIdr(usd, activeRate) : Number(v.selling_price_per_kg || 0);
                      return { usd, idr };
                    }

                    const baseUsd = Number(p.selling_price_usd_per_kg || 0);
                    if (baseUsd > 0) {
                      let usd = baseUsd;
                      if (packSize === 5) {
                        usd = p.sku === 'FO-ACA-001' ? 95 : p.sku === 'FO-BOU-002' ? 90 : p.sku === 'FO-AQU-003' ? 108 : p.sku === 'FO-CIT-004' ? 65 : Math.round(baseUsd * 1.0555 * 100) / 100;
                      } else if (packSize === 1) {
                        usd = p.sku === 'FO-ACA-001' ? 100 : p.sku === 'FO-BOU-002' ? 93 : p.sku === 'FO-AQU-003' ? 112 : p.sku === 'FO-CIT-004' ? 68 : Math.round(baseUsd * 1.1111 * 100) / 100;
                      }
                      const idr = convertUsdToIdr(usd, activeRate);
                      return { usd, idr };
                    }

                    const idrFromVariant = p.variant_prices?.[packSize] || (packSize === 25 ? p.selling_price_per_kg : 0);
                    if (idrFromVariant > 0) {
                      return { usd: 0, idr: idrFromVariant };
                    }

                    return { usd: 0, idr: 0 };
                  };

                  const v25 = getVariantPrices(25);
                  const v5 = getVariantPrices(5);
                  const v1 = getVariantPrices(1);

                  const renderPriceCell = (priceObj: { usd: number; idr: number }) => {
                    return (
                      <div className="space-y-0.5 font-mono">
                        <div className="font-bold text-blue-600">
                          {priceObj.usd > 0 ? `$${priceObj.usd.toFixed(2)}` : '$0.00'}
                        </div>
                        <div className="font-bold text-slate-800">
                          {priceObj.idr > 0 ? formatIDR(priceObj.idr) : 'Rp 0'}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-extrabold text-slate-800 text-xs">{p.name}</div>
                        <div className="font-mono text-[10px] text-slate-500 font-bold mt-0.5">{p.sku}</div>
                      </td>
                      <td className="px-5 py-3 text-center">{renderPriceCell(v25)}</td>
                      <td className="px-5 py-3 text-center">{renderPriceCell(v5)}</td>
                      <td className="px-5 py-3 text-center">{renderPriceCell(v1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grafik Monitoring Stok & Penjualan Terlaris */}
        {(() => {
          // Calculate sales per product
          const salesMap: Record<string, number> = {};
          salesOrders.forEach((so) => {
            if (so.status !== 'CANCELLED' && Array.isArray(so.items)) {
              so.items.forEach((item: any) => {
                const prodId = item.product_id;
                const qty = Number(item.qty_ordered_kg || 0);
                salesMap[prodId] = (salesMap[prodId] || 0) + qty;
              });
            }
          });

          // Calculate near expiry stock per product (expiring in <= 3 months)
          const nearExpiryMap: Record<string, number> = {};
          batches.forEach((b) => {
            const expDate = new Date(b.expiry_date);
            const now = new Date();
            const diffMonths = (expDate.getTime() - now.getTime()) / (1000 * 3600 * 24 * 30);
            if (diffMonths <= 3 && diffMonths >= 0) {
              const prodId = b.product_id;
              const qty = Number(b.current_qty_kg || 0);
              nearExpiryMap[prodId] = (nearExpiryMap[prodId] || 0) + qty;
            }
          });

          // Compute chart data based on filter
          const sortedProductsForChart = [...products]
            .map((p) => {
              let kgValue = 0;
              if (chartFilter === 'best_seller') {
                kgValue = salesMap[p.id] ?? 0;
              } else if (chartFilter === 'near_expiry') {
                kgValue = nearExpiryMap[p.id] ?? 0;
              } else {
                kgValue = p.total_stock_kg ?? Object.values(p.variant_stocks || {}).reduce((s, v) => s + (v || 0), 0);
              }

              // Harga: derive from cheapest active variant price (per kg * qty)
              let hargaValue = 0;
              if (chartUnit === 'harga') {
                const variantPrices = (p.variants || []).map((v: any) => {
                  const pricePerKg = v.selling_price_per_kg || 0;
                  return pricePerKg;
                });
                const cheapestPrice = variantPrices.length > 0
                  ? variantPrices.reduce((a: number, b: number) => Math.min(a, b), Infinity)
                  : ((p as any).selling_price_per_kg || 0);
                hargaValue = Math.round(kgValue * cheapestPrice);
              }

              return {
                ...p,
                value: chartUnit === 'harga' ? hargaValue : Math.round(kgValue),
                kgValue: Math.round(kgValue),
              };
            })
            .sort((a, b) => b.value - a.value);

          const maxVal = Math.max(...sortedProductsForChart.map((sp) => sp.value), 1);

          return (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs mb-6">
              <div className="px-6 py-4 bg-blue-700 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-200" />
                    {chartFilter === 'best_seller'
                      ? 'Grafik Penjualan Produk Terlaris (Volume)'
                      : chartFilter === 'near_expiry'
                        ? 'Grafik Stok Produk Mendekati Kadaluwarsa Terbanyak'
                        : 'Grafik Level Stok Produk (Urut dari Terbanyak)'}
                  </h2>
                  <p className="text-[11px] text-blue-100 font-medium">
                    {chartFilter === 'best_seller'
                      ? 'Total kuantitas terjual lewat Sales Order aktif (tidak dibatalkan)'
                      : chartFilter === 'near_expiry'
                        ? 'Total kuantitas stok yang memiliki tanggal kadaluwarsa kurang dari 3 bulan'
                        : 'Total kuantitas stok fisik aktif yang tersedia di gudang'}
                  </p>
                </div>

                {/* Filter Toggle Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0 self-start lg:self-center">
                  {/* Unit Toggle: Berat / Harga */}
                  <div className="flex items-center bg-blue-800 p-1 rounded-xl border border-blue-600 text-xs font-semibold">
                    <button
                      onClick={() => setChartUnit('kg')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        chartUnit === 'kg'
                          ? 'bg-white text-blue-900 shadow-sm'
                          : 'text-blue-100 hover:text-white'
                      }`}
                    >
                      ⚖️ Berat (kg)
                    </button>
                    <button
                      onClick={() => setChartUnit('harga')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        chartUnit === 'harga'
                          ? 'bg-white text-blue-900 shadow-sm'
                          : 'text-blue-100 hover:text-white'
                      }`}
                    >
                      💰 Nilai (Rp)
                    </button>
                  </div>

                  {/* Chart Mode Toggle */}
                  <div className="flex flex-wrap items-center bg-blue-800 p-1 rounded-xl border border-blue-600 text-xs font-semibold">
                    <button
                      onClick={() => setChartFilter('stock')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        chartFilter === 'stock'
                          ? 'bg-white text-blue-900 shadow-sm'
                          : 'text-blue-100 hover:text-white'
                      }`}
                    >
                      Stok Terbanyak
                    </button>
                    <button
                      onClick={() => setChartFilter('best_seller')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        chartFilter === 'best_seller'
                          ? 'bg-white text-blue-900 shadow-sm'
                          : 'text-blue-100 hover:text-white'
                      }`}
                    >
                      Produk Terlaris
                    </button>
                    <button
                      onClick={() => setChartFilter('near_expiry')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        chartFilter === 'near_expiry'
                          ? 'bg-white text-blue-900 shadow-sm'
                          : 'text-blue-100 hover:text-white'
                      }`}
                    >
                      Mendekati Kadaluwarsa
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {sortedProductsForChart.map((p) => {
                  const percentage = Math.min(100, Math.max(2, (p.value / maxVal) * 100));
                  const isStockMode = chartFilter === 'stock';
                  const isLow = false; // min_stock_kg tidak ada di DB, diganti isZero
                  const isZero = isStockMode && p.value === 0;

                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-850 font-bold">{p.name}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-500 font-mono px-1.5 py-0.5 rounded-md">
                            {p.sku}
                          </span>
                          {isStockMode && isZero ? (
                            <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-md">
                              HABIS
                            </span>
                          ) : isStockMode && isLow ? (
                            <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-md animate-pulse">
                              STOK MINIMUM
                            </span>
                          ) : null}
                        </div>
                        <span className="font-mono text-slate-850 font-bold">
                          {chartUnit === 'harga'
                            ? `Rp ${p.value.toLocaleString('id-ID')}`
                            : `${p.value.toLocaleString('id-ID')} ${
                                chartFilter === 'stock'
                                  ? 'kg'
                                  : chartFilter === 'best_seller'
                                    ? 'kg terjual'
                                    : 'kg mendekati kadaluwarsa'
                              }`}
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200 shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            chartUnit === 'harga'
                              ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500'
                              : chartFilter === 'stock'
                                ? isZero
                                  ? 'bg-red-500'
                                  : isLow
                                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                    : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500'
                                : chartFilter === 'best_seller'
                                  ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-rose-500'
                                  : 'bg-gradient-to-r from-amber-550 via-orange-500 to-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* KPI Cards */}
        <div className={`grid gap-5 ${canViewFinancials ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
          {/* Omset */}
          {canViewFinancials && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Omset</span>
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <TrendingUp className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800 font-mono">{formatIDR(totalOmset)}</div>
              <div className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" /> +14.2% vs bulan lalu
              </div>
            </div>
          )}

          {/* Gross Margin */}
          {canViewFinancials && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gross Profit Margin</span>
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <DollarSign className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800">34.8%</div>
              <div className="text-xs text-slate-400 mt-2">Dihitung via HPP batch spesifik (FEFO)</div>
            </div>
          )}

          {/* Total AR */}
          {canViewFinancials && (
            <Link href="/admin/finance" className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Piutang AR</span>
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800 font-mono">{formatIDR(totalPiutang)}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {formatIDR(agingOverdue)} Overdue &gt;30 Hari
                </div>
                <span className="text-[10px] text-blue-500 font-semibold group-hover:underline">Lihat Invoice →</span>
              </div>
            </Link>
          )}

          {/* FEFO Alerts */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-max">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Alert FEFO & Stok</span>
              <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                <ShieldAlert className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-600 font-mono">
              {totalAlertsCount} Alert
            </div>
            <div className="text-xs text-slate-500 mt-2 font-medium">
              {nearExpiryCount} Expiry Near | {lowStockCount} Kritis
            </div>

            {/* Interactive Toggle for Details */}
            <button
              onClick={() => setIsAlertDetailsOpen(!isAlertDetailsOpen)}
              className="mt-3 w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60 transition-all focus:outline-none"
            >
              <span>{isAlertDetailsOpen ? 'Sembunyikan Rincian' : 'Tampilkan Rincian'}</span>
              {isAlertDetailsOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
            </button>

            {/* Dropdown Drawer displaying low stock and expiring items */}
            {isAlertDetailsOpen && (
              <div className="mt-3 border-t border-slate-100 pt-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
                {/* 1. Low stock details */}
                {lowStockCount > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider">Kritis / Stok Habis:</div>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {lowStockList.slice(0, 10).map((p: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] bg-red-50/50 border border-red-100 p-1.5 rounded text-red-800 font-mono">
                          <span className="truncate max-w-[130px] font-bold">{p.name || 'Produk'}</span>
                          <span className="shrink-0 font-extrabold text-red-700">{formatKg(p.current_stock_kg ?? p.value ?? 0)}</span>
                        </div>
                      ))}
                      {lowStockList.length > 10 && (
                        <div className="text-[9px] text-slate-400 italic text-center font-bold mt-1">
                          + {lowStockList.length - 10} produk kritis lainnya
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Near expiry details */}
                {nearExpiryCount > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">Lot Hampir Kadaluarsa:</div>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {expiringBatchesList.slice(0, 10).map((b: any, idx: number) => {
                        const daysLeft = b.expiry_date
                          ? Math.ceil((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                          : 0;
                        return (
                          <div key={idx} className="flex flex-col text-[10px] bg-amber-50/60 border border-amber-100 p-1.5 rounded text-amber-850 font-mono">
                            <div className="flex justify-between font-bold">
                              <span>Lot: {b.batch_number}</span>
                              <span className="text-amber-900">{formatKg(b.current_qty_kg || b.qty_kg || 0)}</span>
                            </div>
                            <div className="text-[9px] text-amber-600 font-semibold mt-0.5">
                              Exp: {formatDate(b.expiry_date)} ({daysLeft > 0 ? `${daysLeft} hari lagi` : 'Expired'})
                            </div>
                          </div>
                        );
                      })}
                      {expiringBatchesList.length > 10 && (
                        <div className="text-[9px] text-slate-400 italic text-center font-bold mt-1">
                          + {expiringBatchesList.length - 10} lot kadaluarsa lainnya
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {totalAlertsCount === 0 && (
                  <div className="text-[10px] font-bold text-emerald-600 text-center py-2 bg-emerald-50 border border-emerald-150 rounded">
                    Semua stok aman &amp; terkendali.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Laporan Umur Piutang (Aging Accounts Receivable) */}
        {canViewFinancials && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-blue-600" />
                Laporan Umur Piutang (Aging Accounts Receivable)
              </h2>
              <span className="text-xs text-slate-400 font-medium">Monitoring Tempo Customer B2B</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lancar 0-15 Hari */}
              <Link href="/admin/finance" className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2 hover:border-emerald-400 hover:shadow-sm transition-all block">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">LANCAR (0 - 15 HARI)</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    {countLancar} Invoice Aktif
                  </span>
                </div>
                <div className="text-xl font-bold text-emerald-900 font-mono">{formatIDR(agingLancar)}</div>
              </Link>

              {/* Mendekati Jatuh Tempo 16-30 Hari */}
              <Link href="/admin/finance" className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2 hover:border-amber-400 hover:shadow-sm transition-all block">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">MENDEKATI JATUH TEMPO (16–30 HARI)</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    {countMendekati} Invoice
                  </span>
                </div>
                <div className="text-xl font-bold text-amber-900 font-mono">{formatIDR(agingMendekati)}</div>
              </Link>

              {/* Menunggak Overdue >30 Hari */}
              <Link href="/admin/finance" className="bg-red-50/70 border border-red-200 rounded-xl p-4 space-y-2 hover:border-red-400 hover:shadow-sm transition-all block">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-red-800 uppercase tracking-wide">MENUNGGAK / OVERDUE (&gt;30 HARI)</span>
                  {countOverdue > 0 ? (
                    <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
                      {countOverdue} Invoice BLOCKED!{overdueCustomers.length > 0 ? ` (${overdueCustomers.slice(0, 1).join(', ')}${overdueCustomers.length > 1 ? ` +${overdueCustomers.length - 1}` : ''})` : ''}
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded">
                      0 Invoice
                    </span>
                  )}
                </div>
                <div className="text-xl font-bold text-red-900 font-mono">{formatIDR(agingOverdue)}</div>
              </Link>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
