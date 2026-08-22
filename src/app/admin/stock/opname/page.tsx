'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { Product, StockBatch } from '@/lib/types';
import { formatKg, formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  ClipboardList,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  Clock,
  History,
  Search,
  Plus,
  X,
  FileSpreadsheet,
  Package,
  Check,
} from 'lucide-react';
import { exportToXLSX } from '@/lib/export-excel';
import { canUserExportXLSX } from '@/lib/auth';

export default function StockOpnamePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.warn('Failed to load user info in opname:', err));
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sub-tabs: 'audit' | 'history'
  const [subTab, setSubTab] = useState<'audit' | 'history'>('audit');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Search filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Add new stock batch modal states
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [newBatchForm, setNewBatchForm] = useState({
    batch_number: '',
    pack_size_kg: 25,
    initial_qty_kg: 25,
    production_date: '',
    expiry_date: '',
  });

  const handleOpenAddBatch = (productId: string) => {
    setSelectedProductId(productId);
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const expDate = nextYear.toISOString().split('T')[0];

    setNewBatchForm({
      batch_number: `LOT-2026-NEW-${Math.floor(1000 + Math.random() * 9000)}`,
      pack_size_kg: 25,
      initial_qty_kg: 25,
      production_date: today,
      expiry_date: expDate,
    });
    setIsAddBatchOpen(true);
  };

  const handleSaveNewBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    setIsAddingBatch(true);
    try {
      const res = await fetch('/api/stock-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_number: newBatchForm.batch_number,
          product_id: selectedProductId,
          variant_sku: `${prod.sku}-${newBatchForm.pack_size_kg}K`,
          pack_size_kg: newBatchForm.pack_size_kg,
          unit_count: Math.ceil(newBatchForm.initial_qty_kg / newBatchForm.pack_size_kg),
          production_date: newBatchForm.production_date,
          expiry_date: newBatchForm.expiry_date,
          initial_qty_kg: newBatchForm.initial_qty_kg,
          unit_cost_per_kg: 1450000, // Standard default cost
          is_opname: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsAddBatchOpen(false);
        alert(`Batch ${newBatchForm.batch_number} berhasil didaftarkan ke MySQL database!`);
        await fetchData(); // Refresh data from backend MySQL
      } else {
        alert('Gagal menambah batch: ' + json.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsAddingBatch(false);
    }
  };

  // Map of batchId -> physical quantity input value (string for form input)
  const [physicalQtys, setPhysicalQtys] = useState<Record<string, string>>({});
  const [opnameNotes, setOpnameNotes] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState('Audit Stok Opname Bulanan / Penyelarasan Gudang');

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [prodRes, batchRes] = await Promise.all([
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/stock-batches', { cache: 'no-store' }),
      ]);

      const prodJson = await prodRes.json();
      const batchJson = await batchRes.json();

      if (prodJson.success && Array.isArray(prodJson.data)) {
        setProducts(prodJson.data);
      }
      if (batchJson.success && Array.isArray(batchJson.data)) {
        setBatches(batchJson.data);
        
        // Initialize inputs with current app quantity
        const qtys: Record<string, string> = {};
        const notes: Record<string, string> = {};
        batchJson.data.forEach((b: StockBatch) => {
          qtys[b.id] = (b.current_qty_kg ?? 0).toString();
          notes[b.id] = '';
        });
        setPhysicalQtys(qtys);
        setOpnameNotes(notes);
      }
    } catch (err: any) {
      console.error('Failed to fetch data for opname:', err);
      setError(err.message || 'Gagal memuat data dari database MySQL.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistoryLogs = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/stock-opname/history', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setHistoryLogs(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch history logs:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (subTab === 'history') {
      fetchHistoryLogs();
    }
  }, [subTab]);

  // Helper to find product details by product_id
  const getProductDetails = (productId: string) => {
    return products.find((p) => p.id === productId);
  };

  // Filter products by search term
  const filteredProducts = products.filter((prod) => {
    const term = searchTerm.toLowerCase();
    return (
      prod.name.toLowerCase().includes(term) ||
      (prod.sku && prod.sku.toLowerCase().includes(term))
    );
  });

  // State for itemized confirmation modal before saving
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Calculations for modified rows
  const modifiedBatches = batches.filter((b) => {
    const inputVal = parseFloat(physicalQtys[b.id]) || 0;
    const currentVal = b.current_qty_kg ?? 0;
    // Round to 3 decimal places to prevent floating point inaccuracy
    return Math.abs(inputVal - currentVal) > 0.001;
  });

  const handleOpenConfirmModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (modifiedBatches.length === 0) {
      alert('Tidak ada selisih stok yang terdeteksi. Silakan ubah "Stok Riil" jika ingin menyesuaikan stok.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleExecuteSaveOpname = async () => {
    setIsSaving(true);
    try {
      const batchUpdates = modifiedBatches.map((b) => ({
        id: b.id,
        current_qty_kg: parseFloat(physicalQtys[b.id]) || 0,
        notes: opnameNotes[b.id] || generalNotes || '',
      }));

      const res = await fetch('/api/stock-batches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_updates: batchUpdates }),
      });

      const json = await res.json();
      if (json.success) {
        setIsConfirmModalOpen(false);
        // Kosongkan seluruh isian form stok opname
        setGeneralNotes('');
        setSearchTerm('');
        setOpnameNotes({});
        await fetchData(); // Mengambil data terbaru dari MySQL dan reset form
        alert('✅ Hasil audit Stok Opname berhasil disimpan dan seluruh isian form telah dikosongkan!');
      } else {
        alert('Gagal menyimpan stok opname: ' + json.message);
      }
    } catch (err: any) {
      alert('Error saat menghubungi server: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportOpnameXLSX = () => {
    if (!canUserExportXLSX(currentUser)) {
      alert('Akses Ditolak: Akun Anda tidak memiliki hak akses modul "Ekspor Data (XLSX)". Silakan hubungi Super Admin.');
      return;
    }
    if (subTab === 'history') {
      const data = historyLogs.map((h, idx) => ({
        'No': idx + 1,
        'Waktu Audit': h.created_at ? formatDateTime(h.created_at) : '-',
        'Batch Number': h.batch_number || '-',
        'Nama Produk': h.product_name || '-',
        'Stok Sistem (Kg)': h.qty_before ?? 0,
        'Stok Fisik Riil (Kg)': h.qty_after ?? 0,
        'Selisih (Kg)': h.difference_qty ?? 0,
        'Petugas Audit': h.adjusted_by || 'Staff Gudang',
        'Alasan / Catatan': h.reason || '-',
      }));
      exportToXLSX(data, {
        fileName: `Riwayat_Stok_Opname_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Riwayat Opname',
      });
    } else {
      const rows: any[] = [];
      let no = 1;
      products.forEach((prod) => {
        const prodBatches = batches.filter((b) => b.product_id === prod.id);
        prodBatches.forEach((batch) => {
          const sys = batch.current_qty_kg ?? 0;
          const phys = parseFloat(physicalQtys[batch.id] || '0');
          const diff = isNaN(phys) ? 0 : phys - sys;
          rows.push({
            'No': no++,
            'Nama Produk': prod.name,
            'SKU': prod.sku,
            'Batch Lot': batch.batch_number,
            'Kemasan': batch.pack_size_kg ? `${batch.pack_size_kg} Kg` : '-',
            'Stok Sistem (Kg)': sys,
            'Input Stok Fisik (Kg)': isNaN(phys) ? sys : phys,
            'Selisih (Kg)': diff,
            'Status Selisih': diff === 0 ? 'COCOK' : diff > 0 ? `SURPLUS (+${diff} Kg)` : `DEFISIT (${diff} Kg)`,
            'Catatan Opname': opnameNotes[batch.id] || '-',
          });
        });
      });
      exportToXLSX(rows, {
        fileName: `Audit_Stok_Opname_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Audit Fisik vs Sistem',
      });
    }
  };

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-24">
      <AdminTopNav />

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/stock"
            className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Manajemen Stok & Gudang
          </Link>
        </div>

        {/* Page Header Card */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-700 text-blue-100 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full">
                AUDIT & KONTROL INVENTORI
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold">
                MYSQL LIVE
              </span>
            </div>
            <h1 className="text-2xl font-bold mt-1.5 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-blue-300" />
              Penyelarasan Stok Opname (Fisik vs Aplikasi)
            </h1>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl">
              Ubah kolom "Stok Riil" untuk menyesuaikan sisa stok fisik yang ada di gudang. Sistem secara otomatis menghitung selisih dan melakukan audit penyesuaian.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {canUserExportXLSX(currentUser) && (
              <button
                onClick={handleExportOpnameXLSX}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                title="Ekspor Data Opname ke File Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" /> Ekspor ke XLSX
              </button>
            )}
            <button
              onClick={fetchData}
              disabled={isLoading || isSaving}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-white/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Segarkan Data
            </button>
          </div>
        </div>

        {/* Warning info panel if there are pending modifications */}
        {modifiedBatches.length > 0 && (
          <div className="bg-amber-50 border border-amber-250 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0 animate-pulse" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-amber-800">Menunggu Sinkronisasi ({modifiedBatches.length} Batch Diubah)</div>
              <p className="text-amber-700 leading-relaxed">
                Anda telah mengubah jumlah stok fisik. Tekan tombol <strong>"Simpan Audit Stok Opname"</strong> di bagian bawah halaman untuk menerapkan perubahan ini ke database MySQL.
              </p>
            </div>
          </div>
        )}

        {/* Error panel */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-700">
              <div className="font-bold">Error Memuat Data</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {/* Sub-tab Navigation */}
        <div className="flex border-b border-gray-200 justify-between items-center bg-white px-6 py-3 rounded-xl shadow-xs flex-wrap gap-3">
          <div className="flex gap-6 text-xs font-bold">
            <button
              onClick={() => setSubTab('audit')}
              className={`pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                subTab === 'audit'
                  ? 'border-blue-600 text-blue-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ClipboardList className="w-4 h-4" /> Lakukan Audit Opname
            </button>
            <button
              onClick={() => setSubTab('history')}
              className={`pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                subTab === 'history'
                  ? 'border-blue-600 text-blue-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="w-4 h-4" /> Riwayat Audit & Penyesuaian ({historyLogs.length})
            </button>
          </div>
          {canUserExportXLSX(currentUser) && (
            <button
              onClick={handleExportOpnameXLSX}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Ekspor ke Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Ekspor {subTab === 'history' ? 'Riwayat' : 'Audit'} XLSX
            </button>
          )}
        </div>

        {/* TAB 1: FORM AUDIT OPNAME */}
        {subTab === 'audit' && (
          <div className="space-y-6">
            {/* Main interactive audits table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Daftar Batch & Produk Inventaris</h3>
                  <p className="text-[10px] text-slate-400">Pilih "+ Tambah Batch" pada baris produk induk untuk mendaftarkan batch material baru.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari nama produk / SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-400 w-52 font-medium"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Catatan audit umum..."
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-400 w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-gray-150 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                      <th className="px-6 py-3">Bibit Parfum / Varian SKU</th>
                      <th className="px-6 py-3">No. Batch (Lot)</th>
                      <th className="px-6 py-3">Tgl Produksi / Expiry</th>
                      <th className="px-6 py-3 text-right">Stok Aplikasi (A)</th>
                      <th className="px-6 py-3 text-center">Stok Riil (B)</th>
                      <th className="px-6 py-3 text-right">Selisih (B - A)</th>
                      <th className="px-6 py-3">Catatan Penyesuaian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <span className="font-medium">Memuat database batch gudang...</span>
                          </div>
                        </td>
                      </tr>
                    ) : batches.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                          Tidak ada batch stok aktif di database.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((prod) => {
                        const productBatches = batches
                          .filter((b) => b.product_id === prod.id)
                          .sort((a, b) => {
                            const sizeA = Number(a.pack_size_kg || 0);
                            const sizeB = Number(b.pack_size_kg || 0);
                            if (sizeA !== sizeB) {
                              return sizeB - sizeA;
                            }
                            const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
                            const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
                            return dateA - dateB;
                          });

                        return (
                          <React.Fragment key={prod.id}>
                          {/* Parent Product Header Row */}
                          <tr className="bg-slate-100/85 border-t border-slate-250 border-b border-slate-200">
                            <td colSpan={7} className="px-6 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-700 text-white text-[9px] font-extrabold px-2 py-0.5 rounded tracking-wide uppercase">
                                  {prod.fragrance_family || 'Gourmand'}
                                </span>
                                <span className="font-extrabold text-slate-800 text-[13px]">{prod.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">({prod.sku})</span>
                                
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddBatch(prod.id)}
                                  className="ml-3 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all shadow-xs"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Tambah Batch
                                </button>

                                <span className="ml-auto text-[10px] text-slate-500 font-semibold bg-white border border-slate-250 px-2 py-0.5 rounded-full">
                                  {productBatches.length} Batch Induk
                                </span>
                              </div>
                            </td>
                          </tr>

                          {/* Batch Rows under this Parent Product */}
                          {productBatches.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-8 py-4 text-slate-450 italic text-center bg-slate-50/20 font-medium">
                                Belum ada batch lot fisik untuk varian produk ini. Klik "+ Tambah Batch" di samping nama produk untuk mendaftarkan stok.
                              </td>
                            </tr>
                          ) : (
                            productBatches.map((b) => {
                              const currentVal = b.current_qty_kg ?? 0;
                              const physicalInput = physicalQtys[b.id] ?? '';
                              const physicalVal = parseFloat(physicalInput) || 0;
                              const diff = physicalVal - currentVal;
                              const isChanged = Math.abs(diff) > 0.001;

                              return (
                                <tr
                                  key={b.id}
                                  className={`hover:bg-slate-50/50 transition-colors ${
                                    isChanged ? 'bg-amber-50/20 font-medium' : ''
                                  }`}
                                >
                                  {/* Variant SKU & Packing Size */}
                                  <td className="px-8 py-3">
                                    <div className="font-bold text-slate-750 text-xs">
                                      Kemasan {b.pack_size_kg} Kg
                                    </div>
                                    <span className="font-mono text-[9px] text-blue-600 font-semibold bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                      {b.variant_sku || `${prod.sku}-${b.pack_size_kg}K`}
                                    </span>
                                  </td>

                                  {/* Batch Number */}
                                  <td className="px-6 py-3">
                                    <span className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-250 px-2 py-0.5 rounded text-[10px]">
                                      {b.batch_number}
                                    </span>
                                  </td>

                                  {/* Dates */}
                                  <td className="px-6 py-3 text-slate-500 font-medium text-[11px] space-y-0.5">
                                    <div>Prod: {b.production_date ? formatDate(b.production_date) : '-'}</div>
                                    <div className="font-semibold text-slate-700">Exp: {formatDate(b.expiry_date)}</div>
                                  </td>

                                  {/* Application Qty */}
                                  <td className="px-6 py-3 text-right font-mono font-bold text-slate-750 text-xs">
                                    {formatKg(currentVal)}
                                  </td>

                                  {/* Physical Qty Input */}
                                  <td className="px-6 py-3 text-center">
                                    <div className="relative inline-block">
                                      <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={physicalInput}
                                        onChange={(e) => {
                                          setPhysicalQtys({
                                            ...physicalQtys,
                                            [b.id]: e.target.value,
                                          });
                                        }}
                                        className={`w-28 bg-white border rounded-lg px-2 py-1.5 font-bold font-mono text-slate-800 focus:outline-none focus:ring-1 text-right pr-6 ${
                                          isChanged
                                            ? 'border-amber-450 focus:ring-amber-300 focus:border-amber-500 bg-amber-50/10'
                                            : 'border-slate-300 focus:ring-blue-300 focus:border-blue-500'
                                        }`}
                                      />
                                      <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                                        Kg
                                      </span>
                                    </div>
                                  </td>

                                  {/* Difference display */}
                                  <td className="px-6 py-3 text-right font-mono text-xs">
                                    {isChanged ? (
                                      <span
                                        className={`font-bold px-2 py-0.5 rounded-md ${
                                          diff > 0
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-red-50 text-red-650 border border-red-200'
                                        }`}
                                      >
                                        {diff > 0 ? '+' : ''}
                                        {diff.toFixed(3)} kg
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-bold">0.000 kg</span>
                                    )}
                                  </td>

                                  {/* Adjustment notes */}
                                  <td className="px-6 py-3">
                                    <input
                                      type="text"
                                      placeholder="Catatan selisih..."
                                      value={opnameNotes[b.id] ?? ''}
                                      onChange={(e) => {
                                        setOpnameNotes({
                                          ...opnameNotes,
                                          [b.id]: e.target.value,
                                        });
                                      }}
                                      disabled={!isChanged}
                                      className={`w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 focus:outline-none text-[11px] font-medium ${
                                        isChanged
                                          ? 'bg-white border-slate-300 focus:border-blue-400'
                                          : 'border-slate-150 text-slate-300 cursor-not-allowed'
                                      }`}
                                    />
                                  </td>
                                </tr>
                              );
                            }) ) }
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Form submission controls */}
            {!isLoading && batches.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs text-slate-500">
                  {modifiedBatches.length === 0 ? (
                    <span>Silakan sesuaikan kolom <strong>Stok Riil</strong> di tabel untuk memulai audit opname.</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-700 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      {modifiedBatches.length} batch telah dimodifikasi dan perlu diselaraskan dengan database.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/admin/stock"
                    className="px-5 py-2.5 rounded-xl bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Kembali
                  </Link>
                  <button
                    type="button"
                    onClick={handleOpenConfirmModal}
                    disabled={modifiedBatches.length === 0 || isSaving}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-extrabold px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan Audit...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Simpan Audit Stok Opname</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RIWAYAT PENYESUAIAN STOK OPNAME */}
        {subTab === 'history' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-800 text-sm">Riwayat Audit Stok Opname</h3>
                <p className="text-[10px] text-slate-400">Log audit historis seluruh penyesuaian berat & unit kemasan di database.</p>
              </div>
              <button
                onClick={fetchHistoryLogs}
                disabled={historyLoading}
                className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} /> Refresh Log
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-gray-150 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                    <th className="px-6 py-3">Waktu Audit</th>
                    <th className="px-6 py-3">Bibit Parfum / SKU Varian</th>
                    <th className="px-6 py-3">No. Batch (Lot)</th>
                    <th className="px-6 py-3 text-right">Stok Sistem (A)</th>
                    <th className="px-6 py-3 text-right">Stok Fisik (B)</th>
                    <th className="px-6 py-3 text-right">Selisih (B - A)</th>
                    <th className="px-6 py-3">Catatan Audit</th>
                    <th className="px-6 py-3">Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                          <span className="font-medium">Memuat log audit dari MySQL...</span>
                        </div>
                      </td>
                    </tr>
                  ) : historyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                        Belum ada riwayat penyesuaian stok opname yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    historyLogs.map((log) => {
                      const diff = parseFloat(log.difference_qty_kg || 0);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors font-medium">
                          {/* Waktu Audit */}
                          <td className="px-6 py-3.5 text-slate-500 font-mono">
                            {formatDateTime(log.created_at)}
                          </td>
                          {/* Variant SKU & Product Name */}
                          <td className="px-6 py-3.5">
                            <div className="font-bold text-slate-800 text-xs">
                              {log.product_name || 'Bibit Parfum'}
                            </div>
                            <span className="font-mono text-[9px] text-blue-600 font-semibold bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                              {log.variant_sku}
                            </span>
                          </td>
                          {/* Batch Number */}
                          <td className="px-6 py-3.5">
                            <span className="font-mono font-bold text-slate-700 bg-slate-105 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                              {log.batch_number}
                            </span>
                          </td>
                          {/* System Qty */}
                          <td className="px-6 py-3.5 text-right font-mono text-slate-600">
                            {formatKg(parseFloat(log.system_qty_kg))}
                          </td>
                          {/* Physical Qty */}
                          <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-800">
                            {formatKg(parseFloat(log.physical_qty_kg))}
                          </td>
                          {/* Difference */}
                          <td className="px-6 py-3.5 text-right font-mono">
                            <span
                              className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                                diff > 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-red-50 text-red-600 border border-red-100'
                              }`}
                            >
                              {diff > 0 ? '+' : ''}
                              {diff.toFixed(2)} kg
                            </span>
                          </td>
                          {/* Notes */}
                          <td className="px-6 py-3.5 text-slate-700 text-xs max-w-xs truncate" title={log.notes}>
                            {log.notes || '-'}
                          </td>
                          {/* Auditor */}
                          <td className="px-6 py-3.5 text-slate-500 font-bold uppercase text-[10px]">
                            {log.created_by || 'ADMIN GUDANG'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ADD NEW BATCH MODAL */}
      {isAddBatchOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <h3 className="font-bold text-base">Daftarkan Batch Stok Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBatchOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewBatch} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Nomor Batch (Lot Number) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newBatchForm.batch_number}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, batch_number: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">Kemasan Satuan <span className="text-red-500">*</span></label>
                  <select
                    value={newBatchForm.pack_size_kg}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, pack_size_kg: parseInt(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value={25}>25 Kg (Drum)</option>
                    <option value={5}>5 Kg (Jerry Can)</option>
                    <option value={1}>1 Kg (Alum Bottle)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Berat Stok Fisik (Kg) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={newBatchForm.initial_qty_kg}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, initial_qty_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">Tanggal Produksi</label>
                  <input
                    type="date"
                    value={newBatchForm.production_date}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, production_date: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Tanggal Kedaluwarsa <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={newBatchForm.expiry_date}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, expiry_date: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBatchOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-250 text-slate-750 font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingBatch}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isAddingBatch ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Simpan Batch</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Rincian Stok Opname yang Berubah */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-5 h-5 text-blue-300" />
                <div>
                  <h3 className="text-base font-bold">Konfirmasi Penyesuaian Stok Opname</h3>
                  <p className="text-xs text-blue-200">Periksa kembali rincian produk dan batch yang mengalami perubahan kuantitas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Table of Modified Batches */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-800">
                    Terdapat {modifiedBatches.length} batch yang mengalami perubahan stok fisik:
                  </span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Pastikan angka stok fisik riil di bawah ini sudah sesuai dengan hasil perhitungan fisik di gudang sebelum menyelaraskan ke database.
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                      <th className="px-4 py-2.5">No</th>
                      <th className="px-4 py-2.5">Nama Produk &amp; SKU</th>
                      <th className="px-4 py-2.5">No. Batch (Lot)</th>
                      <th className="px-4 py-2.5 text-center">Kemasan</th>
                      <th className="px-4 py-2.5 text-right">Stok Sistem (A)</th>
                      <th className="px-4 py-2.5 text-right">Stok Riil (B)</th>
                      <th className="px-4 py-2.5 text-right">Selisih (B - A)</th>
                      <th className="px-4 py-2.5">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {modifiedBatches.map((b, idx) => {
                      const prod = products.find((p) => p.id === b.product_id);
                      const sys = b.current_qty_kg ?? 0;
                      const phys = parseFloat(physicalQtys[b.id]) || 0;
                      const diff = phys - sys;
                      const note = opnameNotes[b.id] || generalNotes || '-';

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{prod?.name || 'Produk'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{b.variant_sku || prod?.sku || '-'}</div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">
                            {b.batch_number}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                              {b.pack_size_kg ? `${b.pack_size_kg} Kg` : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            {sys.toFixed(3)} kg
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                            {phys.toFixed(3)} kg
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`font-mono font-extrabold px-2 py-0.5 rounded text-[11px] ${
                                diff > 0
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-red-100 text-red-800 border border-red-300'
                              }`}
                            >
                              {diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)} kg
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">
                            {note}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total Selisih Summary */}
              {(() => {
                let totalSys = 0;
                let totalPhys = 0;
                modifiedBatches.forEach((b) => {
                  totalSys += b.current_qty_kg ?? 0;
                  totalPhys += parseFloat(physicalQtys[b.id]) || 0;
                });
                const totalDiff = totalPhys - totalSys;

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Total Batch Berubah:</span>
                      <span className="font-bold text-slate-800 text-sm">{modifiedBatches.length} Batch</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Total Stok Sistem:</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{totalSys.toFixed(3)} kg</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Total Stok Fisik Riil:</span>
                      <span className="font-mono font-bold text-blue-700 text-sm">{totalPhys.toFixed(3)} kg</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Total Selisih Netto:</span>
                      <span className={`font-mono font-extrabold text-sm ${totalDiff >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {totalDiff >= 0 ? `+${totalDiff.toFixed(3)}` : totalDiff.toFixed(3)} kg
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 bg-slate-50 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal / Tinjau Ulang
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleExecuteSaveOpname}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan &amp; Menyelaraskan...</>
                ) : (
                  <><Check className="w-4 h-4" /> Ya, Simpan &amp; Selaraskan Stok</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
