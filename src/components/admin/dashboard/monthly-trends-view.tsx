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

const PRODUCT_COLOR_PALETTE = [
  { name: 'Blue', bg: 'bg-gradient-to-t from-blue-600 to-indigo-600', dot: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-500' },
  { name: 'Purple', bg: 'bg-gradient-to-t from-purple-600 to-fuchsia-600', dot: 'bg-purple-600', text: 'text-purple-700', border: 'border-purple-500' },
  { name: 'Emerald', bg: 'bg-gradient-to-t from-emerald-600 to-teal-600', dot: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-500' },
  { name: 'Amber', bg: 'bg-gradient-to-t from-amber-500 to-orange-600', dot: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-500' },
  { name: 'Rose', bg: 'bg-gradient-to-t from-rose-600 to-pink-600', dot: 'bg-rose-600', text: 'text-rose-700', border: 'border-rose-500' },
  { name: 'Cyan', bg: 'bg-gradient-to-t from-cyan-600 to-sky-600', dot: 'bg-cyan-600', text: 'text-cyan-700', border: 'border-cyan-500' },
  { name: 'Violet', bg: 'bg-gradient-to-t from-violet-600 to-indigo-700', dot: 'bg-violet-600', text: 'text-violet-700', border: 'border-violet-500' },
  { name: 'Lime', bg: 'bg-gradient-to-t from-lime-600 to-emerald-700', dot: 'bg-lime-600', text: 'text-lime-700', border: 'border-lime-500' },
];

export default function MonthlyTrendsView({
  initialSubTab = 'sales',
  activeSubTab: propSubTab,
}: MonthlyTrendsViewProps) {
  const activeSubTab = propSubTab || initialSubTab;
  const [periodPreset, setPeriodPreset] = useState<string>('12');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

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
      let url = '/api/dashboard/monthly-trends';
      if (periodPreset === 'CUSTOM') {
        url += `?startDate=${customStartDate}&endDate=${customEndDate}`;
      } else if (periodPreset === 'YTD') {
        const currentYear = new Date().getFullYear();
        url += `?startDate=${currentYear}-01-01&endDate=${new Date().toISOString().slice(0, 10)}`;
      } else {
        url += `?months=${periodPreset}`;
      }
      const res = await fetch(url, { cache: 'no-store' });
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
  }, [periodPreset, customStartDate, customEndDate]);

  // Master lists
  const availableProducts: any[] = data?.availableProducts || [];
  const availableDistributors: any[] = data?.availableDistributors || [];
  const monthKeys: string[] = data?.monthKeys || [];

  const formatMonthLabel = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  };

  // Map product IDs to consistent color indices
  const productColorsMap = useMemo(() => {
    const map: Record<string, number> = {};
    availableProducts.forEach((p, idx) => {
      map[String(p.id)] = idx % PRODUCT_COLOR_PALETTE.length;
      if (p.name) map[p.name.toLowerCase()] = idx % PRODUCT_COLOR_PALETTE.length;
    });
    return map;
  }, [availableProducts]);

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

      // Generate product segments breakdown inside this month
      const productBreakdownMap: Record<string, { productId: string; name: string; volumeKg: number; revenue: number; count: number }> = {};
      itemsInMonth.forEach((it) => {
        const pId = String(it.product_id || 'unknown');
        const pName = it.product_name || 'Produk Lainnya';
        if (!productBreakdownMap[pId]) {
          productBreakdownMap[pId] = { productId: pId, name: pName, volumeKg: 0, revenue: 0, count: 0 };
        }
        productBreakdownMap[pId].volumeKg += Number(it.qty_kg || 0);
        productBreakdownMap[pId].revenue += Number(it.subtotal || 0);
        productBreakdownMap[pId].count += 1;
      });

      const productSegments = Object.values(productBreakdownMap).sort((a, b) => b.revenue - a.revenue);

      return {
        monthKey: key,
        monthLabel: formatMonthLabel(key),
        totalOmset,
        totalVolumeKg,
        totalOrders,
        uniqueCustomers,
        productSegments,
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
  }, [data, monthKeys, selectedProductId, salesPaymentStatusFilter, productColorsMap]);

  // All active distinct products in the filtered range
  const allActiveProductsInPeriod = useMemo(() => {
    const map: Record<string, { id: string; name: string; totalRevenue: number; totalVolumeKg: number }> = {};
    filteredSalesTrends.forEach((st: any) => {
      (st.productSegments || []).forEach((ps: any) => {
        if (!map[ps.productId]) {
          map[ps.productId] = { id: ps.productId, name: ps.name, totalRevenue: 0, totalVolumeKg: 0 };
        }
        map[ps.productId].totalRevenue += ps.revenue;
        map[ps.productId].totalVolumeKg += ps.volumeKg;
      });
    });
    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredSalesTrends]);

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

      // Group by product in this PO month
      const poProductMap: Record<string, { productId: string; name: string; volumeKg: number; cost: number }> = {};
      itemsInMonth.forEach((it) => {
        const pId = String(it.product_id || 'unknown');
        const pName = it.product_name || 'Bahan Baku';
        if (!poProductMap[pId]) {
          poProductMap[pId] = { productId: pId, name: pName, volumeKg: 0, cost: 0 };
        }
        poProductMap[pId].volumeKg += Number(it.qty_ordered_kg || 0);
        poProductMap[pId].cost += Number(it.subtotal || 0);
      });

      const poProductSegments = Object.values(poProductMap).sort((a, b) => b.cost - a.cost);

      return {
        monthKey: key,
        monthLabel: formatMonthLabel(key),
        totalPOAmount,
        totalPaidAmount,
        totalSisaHutang,
        totalVolumeKg,
        totalPOs,
        poProductSegments,
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

            {/* Period Preset Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value)}
                className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value="3">3 Bulan Terakhir</option>
                <option value="6">6 Bulan Terakhir</option>
                <option value="12">12 Bulan Terakhir (1 Tahun)</option>
                <option value="24">24 Bulan Terakhir (2 Tahun)</option>
                <option value="YTD">Tahun Berjalan (YTD)</option>
                <option value="CUSTOM">🗓️ Kustom Rentang Tanggal</option>
              </select>
            </div>

            {/* Custom Date Pickers (Shown when CUSTOM is selected) */}
            {periodPreset === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200 px-3 py-1.5 rounded-xl text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-blue-900 font-bold text-[11px]">Dari:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white border border-blue-300 rounded-lg px-2 py-0.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-blue-900 font-bold text-[11px]">Sampai:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white border border-blue-300 rounded-lg px-2 py-0.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

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

          {/* Monthly Bar Chart Visualizer with Product Names Inside */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  Grafik Perkembangan Penjualan Produk ({monthKeys.length} Bulan Analisis)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualisasi grafik batang bertumpuk dengan rincian nama produk di dalam batang{' '}
                  {metricUnit === 'currency'
                    ? 'nilai rupiah omset'
                    : metricUnit === 'volume'
                    ? 'volume penjualan (kg)'
                    : 'jumlah transaksi SO'}{' '}
                  tiap bulan.
                </p>
              </div>

              {allActiveProductsInPeriod.length > 0 && (
                <div className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg self-start sm:self-auto flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span>{allActiveProductsInPeriod.length} Produk Aktif Terjual</span>
                </div>
              )}
            </div>

            {/* CSS Stacked Bar Chart with Product Names */}
            <div className="h-80 flex items-end gap-3 sm:gap-4 pt-10 pb-2 px-2 overflow-x-auto">
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

                const heightPercent = maxVal > 0 ? Math.max((val / maxVal) * 100, 6) : 6;
                const segments: any[] = st.productSegments || [];

                return (
                  <div key={st.monthKey} className="flex-1 min-w-[70px] max-w-[160px] flex flex-col items-center h-full justify-end group relative">
                    {/* Rich Floating Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-28 z-30 pointer-events-none bg-slate-950/95 text-white text-[11px] py-2.5 px-3 rounded-xl shadow-2xl min-w-[210px] border border-slate-700 backdrop-blur-xs">
                      <div className="font-bold text-blue-300 border-b border-slate-700 pb-1 mb-1.5 flex justify-between items-center">
                        <span>{st.monthLabel}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{st.totalOrders} Transaksi</span>
                      </div>
                      <div className="text-slate-200 font-bold text-xs mb-1.5">
                        Total: {formatIDR(st.totalOmset)} • {formatKg(st.totalVolumeKg)}
                      </div>
                      {segments.length > 0 && (
                        <div className="space-y-1 border-t border-slate-800 pt-1.5 max-h-36 overflow-y-auto">
                          {segments.map((ps: any, idx: number) => {
                            const colorObj = PRODUCT_COLOR_PALETTE[productColorsMap[ps.productId] ?? (idx % PRODUCT_COLOR_PALETTE.length)];
                            const pct = st.totalOmset > 0 ? ((ps.revenue / st.totalOmset) * 100).toFixed(0) : 0;
                            return (
                              <div key={ps.productId} className="flex items-center justify-between text-[10px] gap-2">
                                <span className="flex items-center gap-1.5 text-slate-200 truncate max-w-[130px]">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${colorObj.dot}`} />
                                  {ps.name}
                                </span>
                                <span className="font-mono font-bold text-white shrink-0">
                                  {metricUnit === 'currency' ? formatIDR(ps.revenue) : formatKg(ps.volumeKg)} ({pct}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Stacked Bar Container */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-xl transition-all duration-300 relative flex flex-col-reverse justify-start overflow-hidden border shadow-sm ${
                        val > 0
                          ? 'border-blue-400/40 bg-slate-100'
                          : 'border-slate-200 bg-slate-100'
                      }`}
                    >
                      {/* Top Total Badge */}
                      {val > 0 && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-black text-slate-700 whitespace-nowrap bg-white/90 px-1.5 py-0.2 rounded border border-slate-200 shadow-2xs z-10">
                          {metricUnit === 'currency'
                            ? st.totalOmset >= 1000000
                              ? `${(st.totalOmset / 1000000).toFixed(1)}Jt`
                              : formatIDR(st.totalOmset)
                            : metricUnit === 'volume'
                            ? formatKg(st.totalVolumeKg)
                            : `${st.totalOrders} SO`}
                        </span>
                      )}

                      {/* Segments with Product Names Inside */}
                      {val > 0 && segments.length > 0 ? (
                        segments.map((ps: any, idx: number) => {
                          const prodVal = metricUnit === 'currency' ? ps.revenue : ps.volumeKg;
                          const totalBase = metricUnit === 'currency' ? st.totalOmset : st.totalVolumeKg;
                          const segPct = totalBase > 0 ? (prodVal / totalBase) * 100 : 100 / segments.length;
                          const colorObj = PRODUCT_COLOR_PALETTE[productColorsMap[ps.productId] ?? (idx % PRODUCT_COLOR_PALETTE.length)];

                          return (
                            <div
                              key={ps.productId}
                              style={{ height: `${segPct}%` }}
                              className={`w-full ${colorObj.bg} border-t border-white/25 transition-all hover:brightness-110 flex flex-col items-center justify-center p-1 relative group/seg overflow-hidden min-h-[26px]`}
                              title={`${ps.name}: ${formatIDR(ps.revenue)} (${formatKg(ps.volumeKg)})`}
                            >
                              {/* Product Name Printed Directly Inside the Bar */}
                              <span className="text-[10px] font-black text-white leading-tight truncate w-full text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] px-0.5 tracking-tight uppercase">
                                {ps.name}
                              </span>
                              {segPct >= 18 && (
                                <span className="text-[9px] font-mono text-white/95 font-bold leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] mt-0.5">
                                  {metricUnit === 'currency'
                                    ? ps.revenue >= 1000000
                                      ? `${(ps.revenue / 1000000).toFixed(1)}Jt`
                                      : formatIDR(ps.revenue)
                                    : `${ps.volumeKg}kg`}
                                </span>
                              )}
                            </div>
                          );
                        })
                      ) : val > 0 ? (
                        <div className="w-full h-full bg-gradient-to-t from-blue-600 to-indigo-600 flex items-center justify-center p-1">
                          <span className="text-[10px] font-extrabold text-white truncate w-full text-center">
                            {formatIDR(st.totalOmset)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Month Label */}
                    <div className="text-[11px] font-bold text-slate-600 mt-2 truncate w-full text-center">
                      {st.monthLabel}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Product Color Legend */}
            {allActiveProductsInPeriod.length > 0 && (
              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Legenda Produk:
                </span>
                {allActiveProductsInPeriod.map((prod: any, idx: number) => {
                  const colorObj = PRODUCT_COLOR_PALETTE[productColorsMap[prod.id] ?? (idx % PRODUCT_COLOR_PALETTE.length)];
                  return (
                    <span
                      key={prod.id}
                      className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${colorObj.dot} shrink-0`} />
                      <span className="font-bold">{prod.name}</span>
                      <span className="font-mono text-[10px] text-slate-500 font-normal">
                        ({formatIDR(prod.totalRevenue)})
                      </span>
                    </span>
                  );
                })}
              </div>
            )}
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
                <div className="text-xs text-slate-400 font-medium">Total Belanja PO Terpilih</div>
                <div className="text-xl font-bold font-mono text-purple-800 mt-0.5">
                  {formatIDR(filteredPoTrends.reduce((sum: number, p: any) => sum + p.totalPOAmount, 0))}
                </div>
                <div className="text-[10px] text-purple-600 font-medium mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {selectedDistributorId !== 'ALL' ? 'Suplier Terpilih' : 'Akumulasi Semua Suplier'}
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Sisa Hutang Berjalan</div>
                <div className="text-xl font-bold font-mono text-rose-600 mt-0.5">
                  {formatIDR(filteredPoTrends.reduce((sum: number, p: any) => sum + p.totalSisaHutang, 0))}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Terbayar: {formatIDR(filteredPoTrends.reduce((sum: number, p: any) => sum + p.totalPaidAmount, 0))}
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Total Bahan Baku Masuk</div>
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
                  Grafik Perkembangan Belanja Purchase Order ({monthKeys.length} Bulan Analisis)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualisasi grafik batang bertumpuk rincian produk{' '}
                  {metricUnit === 'currency'
                    ? 'nominal belanja pengadaan PO'
                    : 'volume pengadaan bahan baku (kg)'}{' '}
                  tiap bulan.
                </p>
              </div>
            </div>

            {/* CSS Bar Chart */}
            <div className="h-80 flex items-end gap-3 sm:gap-4 pt-10 pb-2 px-2 overflow-x-auto">
              {filteredPoTrends.map((pt: any) => {
                const val = metricUnit === 'currency' ? pt.totalPOAmount : pt.totalVolumeKg;
                const maxVal = metricUnit === 'currency' ? maxPOAmount : maxPOVolume;
                const heightPercent = maxVal > 0 ? Math.max((val / maxVal) * 100, 6) : 6;
                const poSegments: any[] = pt.poProductSegments || [];

                return (
                  <div key={pt.monthKey} className="flex-1 min-w-[70px] max-w-[160px] flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-28 z-30 pointer-events-none bg-slate-950/95 text-white text-[11px] py-2.5 px-3 rounded-xl shadow-2xl min-w-[210px] border border-slate-700 backdrop-blur-xs">
                      <div className="font-bold text-purple-300 border-b border-slate-700 pb-1 mb-1.5 flex justify-between items-center">
                        <span>{pt.monthLabel}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{pt.totalPOs} PO</span>
                      </div>
                      <div className="text-slate-200 font-bold mb-1">Total: {formatIDR(pt.totalPOAmount)} • {formatKg(pt.totalVolumeKg)}</div>
                      <div className="text-slate-400 text-[10px]">Terbayar: {formatIDR(pt.totalPaidAmount)}</div>
                      <div className="text-rose-300 text-[10px] mb-1.5">Sisa Hutang: {formatIDR(pt.totalSisaHutang)}</div>
                      {poSegments.length > 0 && (
                        <div className="space-y-1 border-t border-slate-800 pt-1.5 max-h-36 overflow-y-auto">
                          {poSegments.map((seg: any, sIdx: number) => {
                            const colorObj = PRODUCT_COLOR_PALETTE[sIdx % PRODUCT_COLOR_PALETTE.length];
                            return (
                              <div key={seg.productId} className="flex items-center justify-between text-[10px] gap-2">
                                <span className="flex items-center gap-1.5 text-slate-200 truncate max-w-[130px]">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${colorObj.dot}`} />
                                  {seg.name}
                                </span>
                                <span className="font-mono font-bold text-white shrink-0">
                                  {metricUnit === 'currency' ? formatIDR(seg.cost) : formatKg(seg.volumeKg)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Stacked Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-xl transition-all duration-300 relative flex flex-col-reverse justify-start overflow-hidden border shadow-sm ${
                        val > 0
                          ? 'border-purple-400/40 bg-slate-100'
                          : 'border-slate-200 bg-slate-100'
                      }`}
                    >
                      {val > 0 && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-black text-purple-900 whitespace-nowrap bg-white/90 px-1.5 py-0.2 rounded border border-purple-200 shadow-2xs z-10">
                          {metricUnit === 'currency'
                            ? pt.totalPOAmount >= 1000000
                              ? `${(pt.totalPOAmount / 1000000).toFixed(1)}Jt`
                              : formatIDR(pt.totalPOAmount)
                            : `${pt.totalVolumeKg}kg`}
                        </span>
                      )}

                      {val > 0 && poSegments.length > 0 ? (
                        poSegments.map((seg: any, sIdx: number) => {
                          const segVal = metricUnit === 'currency' ? seg.cost : seg.volumeKg;
                          const totalBase = metricUnit === 'currency' ? pt.totalPOAmount : pt.totalVolumeKg;
                          const segPct = totalBase > 0 ? (segVal / totalBase) * 100 : 100 / poSegments.length;
                          const colorObj = PRODUCT_COLOR_PALETTE[sIdx % PRODUCT_COLOR_PALETTE.length];

                          return (
                            <div
                              key={seg.productId}
                              style={{ height: `${segPct}%` }}
                              className={`w-full ${colorObj.bg} border-t border-white/25 transition-all hover:brightness-110 flex flex-col items-center justify-center p-1 relative group/seg overflow-hidden min-h-[26px]`}
                              title={`${seg.name}: ${formatIDR(seg.cost)} (${formatKg(seg.volumeKg)})`}
                            >
                              <span className="text-[10px] font-black text-white leading-tight truncate w-full text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] px-0.5 tracking-tight uppercase">
                                {seg.name}
                              </span>
                              {segPct >= 18 && (
                                <span className="text-[9px] font-mono text-white/95 font-bold leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] mt-0.5">
                                  {metricUnit === 'currency'
                                    ? seg.cost >= 1000000
                                      ? `${(seg.cost / 1000000).toFixed(1)}Jt`
                                      : formatIDR(seg.cost)
                                    : `${seg.volumeKg}kg`}
                                </span>
                              )}
                            </div>
                          );
                        })
                      ) : val > 0 ? (
                        <div className="w-full h-full bg-gradient-to-t from-purple-600 to-indigo-600 flex items-center justify-center p-1">
                          <span className="text-[10px] font-extrabold text-white truncate w-full text-center">
                            {formatIDR(pt.totalPOAmount)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Label */}
                    <div className="text-[11px] font-bold text-slate-600 mt-2 truncate w-full text-center">
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
