'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  BarChart2,
  Calendar,
  DollarSign,
  Package,
  ShoppingCart,
  Building2,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  RefreshCw,
  Loader2,
  Filter,
  Search,
  SlidersHorizontal,
  X,
  CreditCard,
  ArrowUpDown,
} from 'lucide-react';
import { formatIDR, formatKg } from '@/lib/utils';
import { exportToXLSX } from '@/lib/export-excel';

interface MonthlyTrendsViewProps {
  initialSubTab?: 'sales' | 'procurement' | 'customer';
  activeSubTab?: 'sales' | 'procurement' | 'customer';
}

export default function MonthlyTrendsView({
  initialSubTab = 'sales',
  activeSubTab: propSubTab,
}: MonthlyTrendsViewProps) {
  const activeSubTab = propSubTab || initialSubTab;
  const [periodMonths, setPeriodMonths] = useState<number>(12);
  const [metricUnit, setMetricUnit] = useState<'currency' | 'volume' | 'count'>('currency');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sales-specific filters
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');
  const [salesPaymentStatusFilter, setSalesPaymentStatusFilter] = useState<'ALL' | 'LUNAS' | 'BELUM_LUNAS'>('ALL');

  // PO-specific filters
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>('ALL');
  const [poPaymentStatusFilter, setPoPaymentStatusFilter] = useState<'ALL' | 'LUNAS' | 'BELUM_LUNAS'>('ALL');

  // Customer-specific filters
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [customerLimitFilter, setCustomerLimitFilter] = useState<string>('ALL');
  const [customerSortBy, setCustomerSortBy] = useState<'totalSpent' | 'totalOrders' | 'avgOrderValue' | 'name'>('totalSpent');

  const fetchTrends = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/monthly-trends?months=${periodMonths}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch monthly trends:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [periodMonths]);

  // Master lists
  const availableProducts: any[] = data?.availableProducts || [];
  const availableDistributors: any[] = data?.availableDistributors || [];
  const monthKeys: string[] = data?.monthKeys || [];

  const formatMonthLabel = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  };

  // =========================================================================
  // DYNAMIC COMPUTATION FOR PRODUCT SALES TRENDS (WITH PRODUCT & PAYMENT FILTERS)
  // =========================================================================
  const filteredSalesTrends = useMemo(() => {
    if (!data?.rawSalesOrders) return data?.salesTrends || [];

    const rawOrders: any[] = data.rawSalesOrders;
    const rawItems: any[] = data.rawSoItems || [];

    return monthKeys.map((key) => {
      // Filter items in this month
      let itemsInMonth = rawItems.filter((it) => {
        const dStr = it.order_date || it.created_at;
        if (!dStr) return false;
        const d = new Date(dStr);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return k === key;
      });

      // Apply product filter to items
      if (selectedProductId !== 'ALL') {
        itemsInMonth = itemsInMonth.filter((it) => String(it.product_id) === String(selectedProductId));
      }

      // Apply payment status filter to items
      if (salesPaymentStatusFilter !== 'ALL') {
        if (salesPaymentStatusFilter === 'LUNAS') {
          itemsInMonth = itemsInMonth.filter(
            (it) => it.payment_status === 'PAID' || it.payment_status === 'LUNAS' || it.payment_method === 'LUNAS_TRANSFER'
          );
        } else {
          itemsInMonth = itemsInMonth.filter(
            (it) => it.payment_status !== 'PAID' && it.payment_status !== 'LUNAS' && it.payment_method !== 'LUNAS_TRANSFER'
          );
        }
      }

      // Filter orders in this month
      let ordersInMonth = rawOrders.filter((so) => {
        const dStr = so.order_date || so.created_at;
        if (!dStr) return false;
        const d = new Date(dStr);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return k === key;
      });

      if (salesPaymentStatusFilter !== 'ALL') {
        if (salesPaymentStatusFilter === 'LUNAS') {
          ordersInMonth = ordersInMonth.filter(
            (so) => so.payment_status === 'PAID' || so.payment_status === 'LUNAS' || so.payment_method === 'LUNAS_TRANSFER'
          );
        } else {
          ordersInMonth = ordersInMonth.filter(
            (so) => so.payment_status !== 'PAID' && so.payment_status !== 'LUNAS' && so.payment_method !== 'LUNAS_TRANSFER'
          );
        }
      }

      let totalOmset = 0;
      let totalVolumeKg = 0;
      let totalOrders = 0;
      let uniqueCustomers = 0;

      if (selectedProductId !== 'ALL') {
        totalOmset = itemsInMonth.reduce((sum, it) => sum + Number(it.subtotal || 0), 0);
        totalVolumeKg = itemsInMonth.reduce((sum, it) => sum + Number(it.qty_kg || 0), 0);
        const orderIds = new Set(itemsInMonth.map((it) => it.so_id));
        totalOrders = orderIds.size;
        uniqueCustomers = new Set(itemsInMonth.map((it) => it.customer_id).filter(Boolean)).size;
      } else {
        totalOmset = ordersInMonth.reduce((sum, so) => sum + Number(so.grand_total || so.total_goods_amount || 0), 0);
        totalVolumeKg = itemsInMonth.reduce((sum, it) => sum + Number(it.qty_kg || 0), 0);
        totalOrders = ordersInMonth.length;
        uniqueCustomers = new Set(ordersInMonth.map((so) => so.customer_id || so.customer_name).filter(Boolean)).size;
      }

      return {
        monthKey: key,
        monthLabel: formatMonthLabel(key),
        totalOmset,
        totalVolumeKg,
        totalOrders,
        uniqueCustomers,
      };
    }).map((st, idx, arr) => {
      let growthPercent = 0;
      if (idx > 0 && arr[idx - 1].totalOmset > 0) {
        growthPercent = Number((((st.totalOmset - arr[idx - 1].totalOmset) / arr[idx - 1].totalOmset) * 100).toFixed(1));
      }
      return {
        ...st,
        growthPercent,
      };
    });
  }, [data, monthKeys, selectedProductId, salesPaymentStatusFilter]);

  // =========================================================================
  // DYNAMIC COMPUTATION FOR PURCHASE ORDER TRENDS (WITH DISTRIBUTOR & PAYMENT FILTERS)
  // =========================================================================
  const filteredPoTrends = useMemo(() => {
    if (!data?.rawPurchaseOrders) return data?.poTrends || [];

    const rawPOs: any[] = data.rawPurchaseOrders;
    const rawItems: any[] = data.rawPoItems || [];

    return monthKeys.map((key) => {
      let posInMonth = rawPOs.filter((po) => {
        const dStr = po.order_date || po.created_at;
        if (!dStr) return false;
        const d = new Date(dStr);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return k === key;
      });

      let itemsInMonth = rawItems.filter((pi) => {
        const dStr = pi.order_date || pi.created_at;
        if (!dStr) return false;
        const d = new Date(dStr);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return k === key;
      });

      // Filter by distributor
      if (selectedDistributorId !== 'ALL') {
        posInMonth = posInMonth.filter((po) => String(po.distributor_id) === String(selectedDistributorId));
        itemsInMonth = itemsInMonth.filter((pi) => String(pi.distributor_id) === String(selectedDistributorId));
      }

      // Filter by PO payment status
      if (poPaymentStatusFilter !== 'ALL') {
        if (poPaymentStatusFilter === 'LUNAS') {
          posInMonth = posInMonth.filter((po) => po.payment_status === 'LUNAS' || Number(po.paid_amount) >= Number(po.total_amount));
        } else {
          posInMonth = posInMonth.filter((po) => po.payment_status !== 'LUNAS' && Number(po.paid_amount) < Number(po.total_amount));
        }
      }

      const totalPOAmount = posInMonth.reduce((sum, po) => sum + Number(po.total_amount || 0), 0);
      const totalPaidAmount = posInMonth.reduce((sum, po) => sum + Number(po.paid_amount || 0), 0);
      const totalSisaHutang = Math.max(0, totalPOAmount - totalPaidAmount);
      const totalVolumeKg = itemsInMonth.reduce((sum, pi) => sum + Number(pi.qty_ordered_kg || 0), 0);
      const totalPOs = posInMonth.length;

      return {
        monthKey: key,
        monthLabel: formatMonthLabel(key),
        totalPOAmount,
        totalPaidAmount,
        totalSisaHutang,
        totalVolumeKg,
        totalPOs,
      };
    });
  }, [data, monthKeys, selectedDistributorId, poPaymentStatusFilter]);

  // =========================================================================
  // DYNAMIC COMPUTATION FOR CUSTOMER TRANSACTION TRENDS (WITH SEARCH, LIMIT & SORT)
  // =========================================================================
  const filteredCustomerTrends = useMemo(() => {
    let list = data?.customerTrends ? [...data.customerTrends] : [];

    // Search query filter
    if (customerSearchQuery.trim()) {
      const q = customerSearchQuery.toLowerCase();
      list = list.filter((c: any) => c.name.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a: any, b: any) => {
      if (customerSortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return b[customerSortBy] - a[customerSortBy];
    });

    // Limit filter
    if (customerLimitFilter === 'TOP_5') {
      list = list.slice(0, 5);
    } else if (customerLimitFilter === 'TOP_10') {
      list = list.slice(0, 10);
    }

    return list;
  }, [data, customerSearchQuery, customerSortBy, customerLimitFilter]);

  // Handle Export to XLSX for each specific analytics view (Respecting Active Filters)
  const handleExportAnalytics = () => {
    if (!data) return;

    if (activeSubTab === 'sales') {
      const prodName = selectedProductId !== 'ALL' ? (availableProducts.find((p) => String(p.id) === String(selectedProductId))?.name || 'Produk') : 'Semua-Produk';
      const exportRows = filteredSalesTrends.map((s: any) => ({
        Bulan: s.monthLabel,
        'Total Omset Penjualan (IDR)': s.totalOmset,
        'Volume Terjual (Kg)': s.totalVolumeKg,
        'Jumlah Pesanan SO': s.totalOrders,
        'Jumlah Customer Aktif': s.uniqueCustomers,
        'Pertumbuhan MoM (%)': `${s.growthPercent}%`,
      }));
      exportToXLSX(exportRows, { fileName: `Laporan-Tren-Penjualan-${prodName}-${new Date().toISOString().slice(0, 10)}.xlsx` });
    } else if (activeSubTab === 'procurement') {
      const distName = selectedDistributorId !== 'ALL' ? (availableDistributors.find((d) => String(d.id) === String(selectedDistributorId))?.name || 'Suplier') : 'Semua-Suplier';
      const exportRows = filteredPoTrends.map((p: any) => ({
        Bulan: p.monthLabel,
        'Total Belanja PO (IDR)': p.totalPOAmount,
        'Total Terbayar (IDR)': p.totalPaidAmount,
        'Sisa Hutang Vendor (IDR)': p.totalSisaHutang,
        'Volume Pengadaan (Kg)': p.totalVolumeKg,
        'Jumlah PO Terbit': p.totalPOs,
      }));
      exportToXLSX(exportRows, { fileName: `Laporan-Tren-PO-${distName}-${new Date().toISOString().slice(0, 10)}.xlsx` });
    } else if (activeSubTab === 'customer') {
      const exportRows = filteredCustomerTrends.map((c: any) => ({
        'Nama Perusahaan Customer': c.name,
        'Total Belanja Akumulasi (IDR)': c.totalSpent,
        'Frekuensi Pesanan': `${c.totalOrders} Transaksi`,
        'Rata-rata Nilai Order (IDR)': c.avgOrderValue,
      }));
      exportToXLSX(exportRows, { fileName: `Laporan-Tren-Customer-${new Date().toISOString().slice(0, 10)}.xlsx` });
    }
  };

  if (isLoading && !data) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-slate-500 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <div className="text-sm font-semibold">Memuat Data Analitik Tren Bulanan...</div>
      </div>
    );
  }

  // Calculate max values for dynamic bar heights
  const maxSalesRevenue = Math.max(...filteredSalesTrends.map((s: any) => s.totalOmset), 1);
  const maxSalesVolume = Math.max(...filteredSalesTrends.map((s: any) => s.totalVolumeKg), 1);
  const maxSalesCount = Math.max(...filteredSalesTrends.map((s: any) => s.totalOrders), 1);

  const maxPOAmount = Math.max(...filteredPoTrends.map((p: any) => p.totalPOAmount), 1);
  const maxPOVolume = Math.max(...filteredPoTrends.map((p: any) => p.totalVolumeKg), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* COMPREHENSIVE FILTER TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Title & Category Badge */}
          <div className="flex items-center gap-3">
            {activeSubTab === 'sales' && (
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Analitik Tren Penjualan Produk</h3>
                  <p className="text-[11px] text-slate-500">Performa omset &amp; volume pesanan Sales Order tiap bulan</p>
                </div>
              </div>
            )}
            {activeSubTab === 'procurement' && (
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Analitik Tren Purchase Order (PO)</h3>
                  <p className="text-[11px] text-slate-500">Komitmen belanja pengadaan barang baku &amp; vendor suplier</p>
                </div>
              </div>
            )}
            {activeSubTab === 'customer' && (
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Matriks Transaksi Customer B2B</h3>
                  <p className="text-[11px] text-slate-500">Histori nilai belanja &amp; kontribusi omset per pelanggan tiap bulan</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions (Unit Toggle + Period + Export) */}
          <div className="flex items-center gap-2.5 flex-wrap justify-end w-full lg:w-auto">
            {/* Unit Toggle */}
            {activeSubTab === 'sales' && (
              <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setMetricUnit('currency')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    metricUnit === 'currency' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Rupiah (IDR)
                </button>
                <button
                  type="button"
                  onClick={() => setMetricUnit('volume')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    metricUnit === 'volume' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Volume (Kg)
                </button>
                <button
                  type="button"
                  onClick={() => setMetricUnit('count')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    metricUnit === 'count' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Jml Transaksi
                </button>
              </div>
            )}

            {activeSubTab === 'procurement' && (
              <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setMetricUnit('currency')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    metricUnit === 'currency' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Rupiah (IDR)
                </button>
                <button
                  type="button"
                  onClick={() => setMetricUnit('volume')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    metricUnit === 'volume' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Volume (Kg)
                </button>
              </div>
            )}

            {/* Period Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={periodMonths}
                onChange={(e) => setPeriodMonths(parseInt(e.target.value, 10))}
                className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value={3}>3 Bulan Terakhir</option>
                <option value={6}>6 Bulan Terakhir</option>
                <option value={12}>12 Bulan Terakhir (1 Tahun)</option>
                <option value={24}>24 Bulan Terakhir (2 Tahun)</option>
              </select>
            </div>

            {/* Export XLSX Button */}
            <button
              type="button"
              onClick={handleExportAnalytics}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Ekspor Analitik Laporan ke File Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Ekspor XLSX
            </button>
          </div>
        </div>

        {/* Dynamic Filter Controls Row */}
        <div className="pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter Analisis:
          </div>

          {/* 1. SALES FILTERS */}
          {activeSubTab === 'sales' && (
            <>
              {/* Product Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-slate-400 font-normal">Produk:</span>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[200px] truncate"
                >
                  <option value="ALL">Semua Produk</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-slate-400 font-normal">Status Pembayaran:</span>
                <select
                  value={salesPaymentStatusFilter}
                  onChange={(e) => setSalesPaymentStatusFilter(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="LUNAS">Hanya Lunas / Verified</option>
                  <option value="BELUM_LUNAS">Tempo / Belum Lunas</option>
                </select>
              </div>

              {(selectedProductId !== 'ALL' || salesPaymentStatusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId('ALL');
                    setSalesPaymentStatusFilter('ALL');
                  }}
                  className="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Reset Filter
                </button>
              )}
            </>
          )}

          {/* 2. PO FILTERS */}
          {activeSubTab === 'procurement' && (
            <>
              {/* Supplier Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-slate-400 font-normal">Suplier / Vendor:</span>
                <select
                  value={selectedDistributorId}
                  onChange={(e) => setSelectedDistributorId(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[200px] truncate"
                >
                  <option value="ALL">Semua Suplier</option>
                  {availableDistributors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* PO Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-slate-400 font-normal">Status Pelunasan:</span>
                <select
                  value={poPaymentStatusFilter}
                  onChange={(e) => setPoPaymentStatusFilter(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="LUNAS">Sudah Lunas</option>
                  <option value="BELUM_LUNAS">Masih Ada Sisa Hutang</option>
                </select>
              </div>

              {(selectedDistributorId !== 'ALL' || poPaymentStatusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDistributorId('ALL');
                    setPoPaymentStatusFilter('ALL');
                  }}
                  className="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Reset Filter
                </button>
              )}
            </>
          )}

          {/* 3. CUSTOMER FILTERS */}
          {activeSubTab === 'customer' && (
            <>
              {/* Search Customer */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex-1 min-w-[180px] max-w-[260px]">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama customer..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="bg-transparent w-full text-xs text-slate-800 font-medium focus:outline-none"
                />
                {customerSearchQuery && (
                  <button type="button" onClick={() => setCustomerSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Limit Filter (Top 5 / 10) */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-slate-400 font-normal">Tampilkan:</span>
                <select
                  value={customerLimitFilter}
                  onChange={(e) => setCustomerLimitFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Customer ({data?.customerTrends?.length || 0})</option>
                  <option value="TOP_5">Top 5 Customer Terbesar</option>
                  <option value="TOP_10">Top 10 Customer Terbesar</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-normal">Urutkan:</span>
                <select
                  value={customerSortBy}
                  onChange={(e) => setCustomerSortBy(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="totalSpent">Total Belanja Terbesar</option>
                  <option value="totalOrders">Frekuensi Order Terbanyak</option>
                  <option value="avgOrderValue">Rata-rata Order Tertinggi</option>
                  <option value="name">Nama Customer (A - Z)</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. PRODUCT SALES TRENDS VIEW */}
      {/* ========================================================= */}
      {activeSubTab === 'sales' && (
        <div className="space-y-6">
          {/* 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Total Omset Periode Terpilih</div>
                <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                  {formatIDR(filteredSalesTrends.reduce((sum: number, s: any) => sum + s.totalOmset, 0))}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {selectedProductId !== 'ALL' ? 'Omset Produk Terpilih' : 'Akumulasi Semua Produk'}
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Total Volume Terjual</div>
                <div className="text-xl font-bold font-mono text-blue-700 mt-0.5">
                  {formatKg(filteredSalesTrends.reduce((sum: number, s: any) => sum + s.totalVolumeKg, 0))}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Dari {filteredSalesTrends.reduce((sum: number, s: any) => sum + s.totalOrders, 0)} Total Transaksi SO
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Rata-Rata Penjualan Bulanan</div>
                <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                  {formatIDR(
                    filteredSalesTrends.length > 0
                      ? Math.round(filteredSalesTrends.reduce((sum: number, s: any) => sum + s.totalOmset, 0) / filteredSalesTrends.length)
                      : 0
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Performa per bulan</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Monthly Bar Chart Visualizer */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  Grafik Perkembangan Penjualan Produk ({periodMonths} Bulan Terakhir)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualisasi grafik batang{' '}
                  {metricUnit === 'currency'
                    ? 'nilai rupiah omset'
                    : metricUnit === 'volume'
                    ? 'volume penjualan (kg)'
                    : 'jumlah transaksi SO'}{' '}
                  tiap bulan.
                </p>
              </div>
            </div>

            {/* CSS Bar Chart */}
            <div className="h-64 flex items-end gap-2 sm:gap-3 pt-8 pb-2 px-2 overflow-x-auto">
              {filteredSalesTrends.map((st: any) => {
                const val =
                  metricUnit === 'currency'
                    ? st.totalOmset
                    : metricUnit === 'volume'
                    ? st.totalVolumeKg
                    : st.totalOrders;

                const maxVal =
                  metricUnit === 'currency'
                    ? maxSalesRevenue
                    : metricUnit === 'volume'
                    ? maxSalesVolume
                    : maxSalesCount;

                const heightPercent = maxVal > 0 ? Math.max((val / maxVal) * 100, 4) : 4;

                return (
                  <div key={st.monthKey} className="flex-1 min-w-[50px] flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-14 z-20 pointer-events-none bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-lg whitespace-nowrap">
                      <div className="font-bold text-blue-300">{st.monthLabel}</div>
                      <div>Omset: {formatIDR(st.totalOmset)}</div>
                      <div>Volume: {formatKg(st.totalVolumeKg)} ({st.totalOrders} SO)</div>
                      <div>Customer Aktif: {st.uniqueCustomers}</div>
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 relative ${
                        val > 0
                          ? 'bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-700 group-hover:to-indigo-600'
                          : 'bg-slate-100'
                      }`}
                    >
                      {val > 0 && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-slate-600 whitespace-nowrap">
                          {metricUnit === 'currency'
                            ? st.totalOmset >= 1000000
                              ? `${(st.totalOmset / 1000000).toFixed(0)}Jt`
                              : formatIDR(st.totalOmset)
                            : metricUnit === 'volume'
                            ? `${st.totalVolumeKg}kg`
                            : `${st.totalOrders} SO`}
                        </span>
                      )}
                    </div>

                    {/* Label */}
                    <div className="text-[10px] font-medium text-slate-500 mt-2 truncate w-full text-center">
                      {st.monthLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Tabel Rincian Perkembangan Penjualan Bulanan
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-gray-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="px-5 py-3">Bulan</th>
                    <th className="px-5 py-3 text-right">Total Omset (IDR)</th>
                    <th className="px-5 py-3 text-right">Volume (Kg)</th>
                    <th className="px-5 py-3 text-center">Jumlah SO</th>
                    <th className="px-5 py-3 text-center">Customer Aktif</th>
                    <th className="px-5 py-3 text-right">Pertumbuhan MoM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSalesTrends.map((st: any) => (
                    <tr key={st.monthKey} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{st.monthLabel}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">{formatIDR(st.totalOmset)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-blue-700 font-semibold">{formatKg(st.totalVolumeKg)}</td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-700">{st.totalOrders} Transaksi</td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-700">{st.uniqueCustomers} Customer</td>
                      <td className="px-5 py-3.5 text-right font-mono">
                        {st.growthPercent > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                            <ArrowUpRight className="w-3.5 h-3.5" /> +{st.growthPercent}%
                          </span>
                        ) : st.growthPercent < 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold">
                            <ArrowDownRight className="w-3.5 h-3.5" /> {st.growthPercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredSalesTrends.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        Tidak ada data transaksi yang cocok dengan filter yang dipilih.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. PURCHASE ORDER TRENDS VIEW */}
      {/* ========================================================= */}
      {activeSubTab === 'procurement' && (
        <div className="space-y-6">
          {/* 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Total Belanja PO Periode Terpilih</div>
                <div className="text-xl font-bold font-mono text-purple-700 mt-0.5">
                  {formatIDR(filteredPoTrends.reduce((sum: number, p: any) => sum + p.totalPOAmount, 0))}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Dari {filteredPoTrends.reduce((sum: number, p: any) => sum + p.totalPOs, 0)} Total Tagihan PO
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Total Pembayaran Terbayar</div>
                <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                  {formatIDR(filteredPoTrends.reduce((sum: number, p: any) => sum + p.totalPaidAmount, 0))}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Tercatat di Buku Kas Keluar</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Total Volume Pengadaan Suplier</div>
                <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                  {formatKg(filteredPoTrends.reduce((sum: number, p: any) => sum + p.totalVolumeKg, 0))}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Masuk ke Stok Batch FEFO</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Monthly Bar Chart Visualizer for PO */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-purple-600" />
                  Grafik Perkembangan Belanja Purchase Order ({periodMonths} Bulan Terakhir)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualisasi grafik{' '}
                  {metricUnit === 'currency'
                    ? 'nominal belanja pengadaan PO'
                    : 'volume pengadaan bahan baku (kg)'}{' '}
                  tiap bulan.
                </p>
              </div>
            </div>

            {/* CSS Bar Chart */}
            <div className="h-64 flex items-end gap-2 sm:gap-3 pt-8 pb-2 px-2 overflow-x-auto">
              {filteredPoTrends.map((pt: any) => {
                const val = metricUnit === 'currency' ? pt.totalPOAmount : pt.totalVolumeKg;
                const maxVal = metricUnit === 'currency' ? maxPOAmount : maxPOVolume;
                const heightPercent = maxVal > 0 ? Math.max((val / maxVal) * 100, 4) : 4;

                return (
                  <div key={pt.monthKey} className="flex-1 min-w-[50px] flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-14 z-20 pointer-events-none bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-lg whitespace-nowrap">
                      <div className="font-bold text-purple-300">{pt.monthLabel}</div>
                      <div>Total PO: {formatIDR(pt.totalPOAmount)}</div>
                      <div>Terbayar: {formatIDR(pt.totalPaidAmount)}</div>
                      <div>Sisa Hutang: {formatIDR(pt.totalSisaHutang)}</div>
                      <div>Volume: {formatKg(pt.totalVolumeKg)} ({pt.totalPOs} PO)</div>
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 relative ${
                        val > 0
                          ? 'bg-gradient-to-t from-purple-600 to-indigo-500 group-hover:from-purple-700 group-hover:to-indigo-600'
                          : 'bg-slate-100'
                      }`}
                    >
                      {val > 0 && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-purple-800 whitespace-nowrap">
                          {metricUnit === 'currency'
                            ? pt.totalPOAmount >= 1000000
                              ? `${(pt.totalPOAmount / 1000000).toFixed(0)}Jt`
                              : formatIDR(pt.totalPOAmount)
                            : `${pt.totalVolumeKg}kg`}
                        </span>
                      )}
                    </div>

                    {/* Label */}
                    <div className="text-[10px] font-medium text-slate-500 mt-2 truncate w-full text-center">
                      {pt.monthLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PO Breakdown Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Tabel Rincian Perkembangan Purchase Order Bulanan
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-gray-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="px-5 py-3">Bulan</th>
                    <th className="px-5 py-3 text-right">Total Belanja PO (IDR)</th>
                    <th className="px-5 py-3 text-right">Sudah Dibayar (IDR)</th>
                    <th className="px-5 py-3 text-right">Sisa Hutang (IDR)</th>
                    <th className="px-5 py-3 text-right">Volume (Kg)</th>
                    <th className="px-5 py-3 text-center">Jumlah PO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPoTrends.map((pt: any) => (
                    <tr key={pt.monthKey} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{pt.monthLabel}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-purple-900">{formatIDR(pt.totalPOAmount)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-700 font-semibold">{formatIDR(pt.totalPaidAmount)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">{formatIDR(pt.totalSisaHutang)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-blue-700 font-semibold">{formatKg(pt.totalVolumeKg)}</td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-700">{pt.totalPOs} PO</td>
                    </tr>
                  ))}
                  {filteredPoTrends.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        Tidak ada data purchase order yang cocok dengan filter yang dipilih.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. CUSTOMER TRANSACTION TRENDS VIEW */}
      {/* ========================================================= */}
      {activeSubTab === 'customer' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  Matriks Pembelian Customer B2B per Bulan
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Menampilkan {filteredCustomerTrends.length} Customer B2B — Analisis perbandingan nominal belanja bulanan.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-gray-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="px-5 py-3">Nama Perusahaan Customer</th>
                    <th className="px-5 py-3 text-right">Total Akumulasi</th>
                    <th className="px-5 py-3 text-center">Frekuensi Order</th>
                    <th className="px-5 py-3 text-right">Rata-Rata Order</th>
                    {monthKeys.slice(-6).map((k: string) => {
                      const [y, m] = k.split('-');
                      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
                      return (
                        <th key={k} className="px-3 py-3 text-right whitespace-nowrap">
                          {d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCustomerTrends.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{c.name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-800">{formatIDR(c.totalSpent)}</td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-700">{c.totalOrders} Pesanan</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">{formatIDR(c.avgOrderValue)}</td>
                      {c.history.slice(-6).map((h: any) => (
                        <td key={h.monthKey} className="px-3 py-3.5 text-right font-mono text-slate-700 whitespace-nowrap">
                          {h.amount > 0 ? (
                            <span className="font-bold text-slate-900">{formatIDR(h.amount)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filteredCustomerTrends.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-5 py-8 text-center text-slate-400">
                        Tidak ada data customer yang cocok dengan pencarian / filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
