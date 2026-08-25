'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { formatIDR, formatKg } from '@/lib/utils';
import { exportToXLSX } from '@/lib/export-excel';

interface MonthlyTrendsViewProps {
  initialSubTab?: 'sales' | 'procurement' | 'customer';
}

export default function MonthlyTrendsView({ initialSubTab = 'sales' }: MonthlyTrendsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'procurement' | 'customer'>(initialSubTab);
  const [periodMonths, setPeriodMonths] = useState<number>(12);
  const [metricUnit, setMetricUnit] = useState<'currency' | 'volume'>('currency');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Handle Export to XLSX for each specific analytics view
  const handleExportAnalytics = () => {
    if (!data) return;

    if (activeSubTab === 'sales') {
      const exportRows = data.salesTrends.map((s: any) => ({
        Bulan: s.monthLabel,
        'Total Omset Penjualan (IDR)': s.totalOmset,
        'Volume Terjual (Kg)': s.totalVolumeKg,
        'Jumlah Pesanan SO': s.totalOrders,
        'Jumlah Customer Aktif': s.uniqueCustomers,
        'Pertumbuhan MoM (%)': `${s.growthPercent}%`,
      }));
      exportToXLSX(exportRows, { fileName: `Laporan-Tren-Penjualan-Produk-${new Date().toISOString().slice(0, 10)}.xlsx` });
    } else if (activeSubTab === 'procurement') {
      const exportRows = data.poTrends.map((p: any) => ({
        Bulan: p.monthLabel,
        'Total Belanja PO (IDR)': p.totalPOAmount,
        'Total Terbayar (IDR)': p.totalPaidAmount,
        'Sisa Hutang Vendor (IDR)': p.totalSisaHutang,
        'Volume Pengadaan (Kg)': p.totalVolumeKg,
        'Jumlah PO Terbit': p.totalPOs,
      }));
      exportToXLSX(exportRows, { fileName: `Laporan-Tren-Purchase-Order-${new Date().toISOString().slice(0, 10)}.xlsx` });
    } else if (activeSubTab === 'customer') {
      const exportRows = data.customerTrends.map((c: any) => ({
        'Nama Perusahaan Customer': c.name,
        'Total Belanja Akumulasi (IDR)': c.totalSpent,
        'Frekuensi Pesanan': `${c.totalOrders} Transaksi`,
        'Rata-rata Nilai Order (IDR)': c.avgOrderValue,
      }));
      exportToXLSX(exportRows, { fileName: `Laporan-Tren-Transaksi-Customer-${new Date().toISOString().slice(0, 10)}.xlsx` });
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

  const salesTrends = data?.salesTrends || [];
  const poTrends = data?.poTrends || [];
  const customerTrends = data?.customerTrends || [];
  const summary = data?.summary || {};

  // Calculate max values for dynamic bar heights
  const maxSalesRevenue = Math.max(...salesTrends.map((s: any) => s.totalOmset), 1);
  const maxSalesVolume = Math.max(...salesTrends.map((s: any) => s.totalVolumeKg), 1);
  const maxPOAmount = Math.max(...poTrends.map((p: any) => p.totalPOAmount), 1);
  const maxPOVolume = Math.max(...poTrends.map((p: any) => p.totalVolumeKg), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Sub-Menu Tabs Navigation & Controls */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('sales')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'sales'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Tren Penjualan Produk
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('procurement')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'procurement'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" /> Tren Purchase Order (PO)
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('customer')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'customer'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" /> Tren Transaksi Customer B2B
          </button>
        </div>

        {/* Filter Controls & Export */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Unit Toggle */}
          {activeSubTab !== 'customer' && (
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setMetricUnit('currency')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  metricUnit === 'currency' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Rupiah (IDR)
              </button>
              <button
                type="button"
                onClick={() => setMetricUnit('volume')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  metricUnit === 'volume' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Volume (Kg)
              </button>
            </div>
          )}

          {/* Period Selector */}
          <select
            value={periodMonths}
            onChange={(e) => setPeriodMonths(parseInt(e.target.value, 10))}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
          >
            <option value={6}>6 Bulan Terakhir</option>
            <option value={12}>12 Bulan Terakhir</option>
            <option value={24}>24 Bulan Terakhir</option>
          </select>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportAnalytics}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Ekspor Laporan Analitik Tren Bulanan ke Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Ekspor XLSX
          </button>
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
                  {formatIDR(salesTrends.reduce((sum: number, s: any) => sum + s.totalOmset, 0))}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Akumulasi Sales Orders Aktif
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
                  {formatKg(salesTrends.reduce((sum: number, s: any) => sum + s.totalVolumeKg, 0))}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Dari {salesTrends.reduce((sum: number, s: any) => sum + s.totalOrders, 0)} Total Transaksi SO
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
                    salesTrends.length > 0
                      ? Math.round(salesTrends.reduce((sum: number, s: any) => sum + s.totalOmset, 0) / salesTrends.length)
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
                  Visualisasi grafik batang {metricUnit === 'currency' ? 'nilai rupiah omset' : 'volume penjualan (kg)'} tiap bulan.
                </p>
              </div>
            </div>

            {/* CSS Bar Chart */}
            <div className="h-64 flex items-end gap-2 sm:gap-3 pt-8 pb-2 px-2 overflow-x-auto">
              {salesTrends.map((st: any, idx: number) => {
                const val = metricUnit === 'currency' ? st.totalOmset : st.totalVolumeKg;
                const maxVal = metricUnit === 'currency' ? maxSalesRevenue : maxSalesVolume;
                const heightPercent = maxVal > 0 ? Math.max((val / maxVal) * 100, 4) : 4;

                return (
                  <div key={st.monthKey} className="flex-1 min-w-[50px] flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 pointer-events-none bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap">
                      <div><strong>{st.monthLabel}</strong></div>
                      <div>Omset: {formatIDR(st.totalOmset)}</div>
                      <div>Volume: {formatKg(st.totalVolumeKg)} ({st.totalOrders} SO)</div>
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
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-slate-600">
                          {metricUnit === 'currency' ? (st.totalOmset >= 1000000 ? `${(st.totalOmset / 1000000).toFixed(0)}Jt` : formatIDR(st.totalOmset)) : `${st.totalVolumeKg}kg`}
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
                  {salesTrends.map((st: any) => (
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
                  {salesTrends.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">Belum ada data penjualan pada periode ini.</td>
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
                  {formatIDR(poTrends.reduce((sum: number, p: any) => sum + p.totalPOAmount, 0))}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Dari {poTrends.reduce((sum: number, p: any) => sum + p.totalPOs, 0)} Total Tagihan PO
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
                  {formatIDR(poTrends.reduce((sum: number, p: any) => sum + p.totalPaidAmount, 0))}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Tercatat di Buku Kas Besar</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Total Volume Pengadaan Suplier</div>
                <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                  {formatKg(poTrends.reduce((sum: number, p: any) => sum + p.totalVolumeKg, 0))}
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
                  Visualisasi grafik {metricUnit === 'currency' ? 'nominal belanja pengadaan PO' : 'volume pengadaan bahan baku (kg)'} tiap bulan.
                </p>
              </div>
            </div>

            {/* CSS Bar Chart */}
            <div className="h-64 flex items-end gap-2 sm:gap-3 pt-8 pb-2 px-2 overflow-x-auto">
              {poTrends.map((pt: any) => {
                const val = metricUnit === 'currency' ? pt.totalPOAmount : pt.totalVolumeKg;
                const maxVal = metricUnit === 'currency' ? maxPOAmount : maxPOVolume;
                const heightPercent = maxVal > 0 ? Math.max((val / maxVal) * 100, 4) : 4;

                return (
                  <div key={pt.monthKey} className="flex-1 min-w-[50px] flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 pointer-events-none bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap">
                      <div><strong>{pt.monthLabel}</strong></div>
                      <div>Total PO: {formatIDR(pt.totalPOAmount)}</div>
                      <div>Terbayar: {formatIDR(pt.totalPaidAmount)}</div>
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
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-purple-800">
                          {metricUnit === 'currency' ? (pt.totalPOAmount >= 1000000 ? `${(pt.totalPOAmount / 1000000).toFixed(0)}Jt` : formatIDR(pt.totalPOAmount)) : `${pt.totalVolumeKg}kg`}
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
                  {poTrends.map((pt: any) => (
                    <tr key={pt.monthKey} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{pt.monthLabel}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-purple-900">{formatIDR(pt.totalPOAmount)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-700 font-semibold">{formatIDR(pt.totalPaidAmount)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">{formatIDR(pt.totalSisaHutang)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-blue-700 font-semibold">{formatKg(pt.totalVolumeKg)}</td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-700">{pt.totalPOs} PO</td>
                    </tr>
                  ))}
                  {poTrends.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">Belum ada data purchase order pada periode ini.</td>
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
                  Analisis perbandingan nominal transaksi bulanan per masing-masing customer B2B.
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
                    {data?.monthKeys.slice(-6).map((k: string) => {
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
                  {customerTrends.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {c.name}
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
                  {customerTrends.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-5 py-8 text-center text-slate-400">Belum ada data transaksi customer.</td>
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
