'use client';

import React, { useState, useEffect } from 'react';
import { getApplications } from '@/lib/application-store';
import Link from 'next/link';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { initialProducts, initialBatches, initialSalesOrders } from '@/lib/mock-data';
import { Product, StockBatch, SalesOrder } from '@/lib/types';
import { formatIDR, formatKg, formatDate } from '@/lib/utils';
import {
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Package,
  CheckCircle2,
  X,
  Eye,
  Edit3,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Save,
  Boxes,
  Truck,
  ClipboardList,
  UserCheck,
  RotateCcw,
  ArrowRight,
  Check,
  Loader2,
  Database,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { exportStockInventoryToXLSX } from '@/lib/export-excel';
import { canUserExportXLSX } from '@/lib/auth';

export default function StockInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(initialSalesOrders);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAplikasi, setSelectedAplikasi] = useState('ALL');

  // Application categories — synced from Master Data via application-store
  const [applicationCategories, setApplicationCategories] = useState<string[]>([]);

  // Sync applicationCategories from Master Data (localStorage) on mount and on updates
  useEffect(() => {
    setApplicationCategories(getApplications());
    const handleAppUpdate = () => setApplicationCategories(getApplications());
    window.addEventListener('artaroma_applications_updated', handleAppUpdate);
    return () => window.removeEventListener('artaroma_applications_updated', handleAppUpdate);
  }, []);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.warn('Failed to load user info in stock page:', err));
  }, []);

  // Determine permission to access warehouse operations & Stok Opname
  const canEditBatch =
    Boolean(currentUser) &&
    (currentUser.is_super_admin ||
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'WAREHOUSE' ||
      currentUser.role === 'GUDANG' ||
      currentUser.role === 'STAFF' ||
      (Array.isArray(currentUser.allowed_modules) &&
        (currentUser.allowed_modules.includes('Lihat Stok (Gudang)') ||
          currentUser.allowed_modules.includes('Stok & Gudang') ||
          currentUser.allowed_modules.includes('Edit Batch & ED (Gudang)'))));

  // Expanded product IDs for inline lot/batch hierarchy drawers (Expand All by default)
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);

  // Warehouse Modals State
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [isPackingOpen, setIsPackingOpen] = useState(false);
  const [isOpnameOpen, setIsOpnameOpen] = useState(false);
  const [isRepackOpen, setIsRepackOpen] = useState(false);

  // Mode Repack: 'SINGLE' (Pecah 1 Batch) | 'MULTI' (Gabung Banyak Batch Berbeda)
  const [repackMode, setRepackMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');

  // Form State for Single Repacking Varian Stok
  const [repackForm, setRepackForm] = useState({
    source_batch_id: '',
    target_pack_size: 1,
    repack_qty_kg: 1.0,
    loss_kg: 0.0,
  });

  // Form State for Multi-Batch Repacking (Kombinasi / Blending)
  const [multiRepackForm, setMultiRepackForm] = useState({
    product_id: '',
    target_pack_size: 5,
    new_batch_number: '',
    selectedSources: {} as Record<string, number>, // batchId -> qty_kg
  });
  const [isRepackingSubmitting, setIsRepackingSubmitting] = useState(false);

  // Form State for Receiving New Stock Batch (Penerimaan Stok PO)
  const [newBatchForm, setNewBatchForm] = useState({
    product_id: '',
    po_number: 'PO-2026-001',
    batch_number: `LOT-2026-${Math.floor(100 + Math.random() * 900)}`,
    pack_size_kg: 25,
    initial_qty_kg: 25.0,
    unit_cost_per_kg: 1450000,
    production_date: '2026-01-15',
    expiry_date: '2027-07-15',
  });

  // Form State for Stok Opname
  const [opnameForm, setOpnameForm] = useState({
    product_id: '',
    system_qty_kg: 18.5,
    physical_qty_kg: 18.0,
    notes: 'Penyesuaian sampel pengujian lab & QC',
  });

  // Form State for Editing Batch Information (No. Batch & Tanggal ED)
  const [isEditBatchOpen, setIsEditBatchOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [editBatchForm, setEditBatchForm] = useState({
    id: '',
    batch_number: '',
    expiry_date: '',
    production_date: '',
    notes: '',
  });
  const [isEditBatchSubmitting, setIsEditBatchSubmitting] = useState(false);

  // Fetch products and stock batches from MySQL Database APIs
  const fetchStockData = async () => {
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
        const sortedData = [...prodJson.data].sort((a: Product, b: Product) => a.name.localeCompare(b.name));
        setProducts(sortedData);
        if (sortedData.length > 0) {
          // Collapse all products by default on load
          setExpandedProductIds([]);
          setNewBatchForm((prev) => ({ ...prev, product_id: sortedData[0].id }));
          setOpnameForm((prev) => ({ ...prev, product_id: sortedData[0].id }));
        }
      }

      if (batchJson.success && Array.isArray(batchJson.data)) {
        setBatches(batchJson.data);
        if (batchJson.data.length > 0) {
          setRepackForm((prev) => ({ ...prev, source_batch_id: batchJson.data[0].id }));
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch stock data from MySQL API:', err);
      setError(err.message || 'Koneksi ke MySQL database gagal.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  // --- RECEIVE NEW STOCK BATCH (PENERIMAAN STOK PO - POST TO MYSQL) ---
  const handleCreateNewBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === newBatchForm.product_id);
    if (!prod) return;

    try {
      const res = await fetch('/api/stock-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_number: newBatchForm.batch_number,
          product_id: prod.id,
          variant_sku: `${prod.sku}-${newBatchForm.pack_size_kg}K`,
          pack_size_kg: Number(newBatchForm.pack_size_kg),
          unit_count: Math.ceil(Number(newBatchForm.initial_qty_kg) / Number(newBatchForm.pack_size_kg)),
          production_date: newBatchForm.production_date,
          expiry_date: newBatchForm.expiry_date,
          initial_qty_kg: Number(newBatchForm.initial_qty_kg),
          unit_cost_per_kg: Number(newBatchForm.unit_cost_per_kg),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsAddBatchOpen(false);
        await fetchStockData(); // Refresh live MySQL inventory
        alert(`Batch stok ${newBatchForm.batch_number} (${prod.name}) sebanyak ${newBatchForm.initial_qty_kg} Kg berhasil diterima ke Database MySQL Gudang FEFO!`);
      } else {
        alert(`Gagal menyimpan batch: ${json.message}`);
      }
    } catch (err: any) {
      alert(`Error koneksi: ${err.message}`);
    }
  };

  // --- FULFILL ORDER (PICK & PACK / AMBIL LANGSUNG) ---
  const handleFulfillOrder = (soId: string, method: 'COURIER' | 'SELF_PICKUP') => {
    setSalesOrders(
      salesOrders.map((so) =>
        so.id === soId
          ? {
              ...so,
              status: method === 'COURIER' ? 'DIKIRIM' : 'DITERIMA',
              delivered_date: new Date().toISOString().split('T')[0],
            }
          : so
      )
    );

    const targetSO = salesOrders.find((s) => s.id === soId);
    alert(
      method === 'COURIER'
        ? `Pesanan ${targetSO?.so_number} telah disiapkan & diserahkan ke Kurir Cargo untuk dikirim!`
        : `Pesanan ${targetSO?.so_number} telah disiapkan & diambil langsung oleh Customer di Gudang HQ!`
    );
  };

  // --- STOK OPNAME SUBMIT ---
  const handleSaveOpname = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === opnameForm.product_id);
    if (!prod) return;

    const diff = Number(opnameForm.physical_qty_kg) - Number(opnameForm.system_qty_kg);
    alert(
      `Stok Opname untuk ${prod.name} Berhasil Disimpan!\n\nStok Sistem: ${opnameForm.system_qty_kg} Kg\nStok Fisik: ${opnameForm.physical_qty_kg} Kg\nSelisih: ${diff > 0 ? '+' : ''}${diff.toFixed(2)} Kg\nCatatan Opname: ${opnameForm.notes}`
    );

    setIsOpnameOpen(false);
  };

  // --- REPACK SUBMIT (SINGLE & MULTI-BATCH) ---
  const handleRepackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (repackMode === 'MULTI') {
      if (!multiRepackForm.product_id) {
        alert('Silakan pilih produk induk terlebih dahulu.');
        return;
      }

      const activeSources = Object.entries(multiRepackForm.selectedSources)
        .filter(([_, qty]) => Number(qty) > 0)
        .map(([batch_id, qty_kg]) => ({ batch_id, qty_kg: Number(qty_kg) }));

      if (activeSources.length === 0) {
        alert('Harap masukkan jumlah Kg yang akan diambil dari minimal satu batch.');
        return;
      }

      const totalInputKg = activeSources.reduce((acc, s) => acc + s.qty_kg, 0);
      const targetPackSize = Number(multiRepackForm.target_pack_size);

      // Validate stock availability for each batch
      for (const src of activeSources) {
        const b = batches.find((x) => x.id === src.batch_id);
        const cur = Number(b?.current_qty_kg || 0);
        if (src.qty_kg > cur) {
          alert(`Stok batch ${b?.batch_number || src.batch_id} tidak mencukupi. Tersedia: ${cur} Kg, Diminta: ${src.qty_kg} Kg`);
          return;
        }
      }

      setIsRepackingSubmitting(true);
      try {
        const res = await fetch('/api/stock-batches/repack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'MULTI',
            product_id: multiRepackForm.product_id,
            target_pack_size: targetPackSize,
            new_batch_number: multiRepackForm.new_batch_number,
            sources: activeSources,
            loss_kg: 0,
          }),
        });

        const json = await res.json();
        if (json.success) {
          setIsRepackOpen(false);
          await fetchStockData();
          alert(json.message || 'Repack gabungan multi-batch berhasil dijalankan!');
        } else {
          alert(`Gagal memproses repack: ${json.message}`);
        }
      } catch (err: any) {
        alert(`Error koneksi: ${err.message}`);
      } finally {
        setIsRepackingSubmitting(false);
      }

    } else {
      // SINGLE BATCH REPACK
      if (!repackForm.source_batch_id) {
        alert('Silakan pilih batch sumber terlebih dahulu.');
        return;
      }

      const sourceBatch = batches.find((b) => b.id === repackForm.source_batch_id);
      if (!sourceBatch) {
        alert('Batch sumber tidak valid.');
        return;
      }

      const qty = Number(repackForm.repack_qty_kg);
      const curQty = Number(sourceBatch.current_qty_kg || 0);

      if (qty > curQty) {
        alert(`Stok batch sumber tidak mencukupi. Tersedia: ${curQty} Kg, Diminta: ${qty} Kg`);
        return;
      }

      setIsRepackingSubmitting(true);
      try {
        const res = await fetch('/api/stock-batches/repack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'SINGLE',
            source_batch_id: repackForm.source_batch_id,
            target_pack_size: Number(repackForm.target_pack_size),
            repack_qty_kg: qty,
            loss_kg: 0,
          }),
        });

        const json = await res.json();
        if (json.success) {
          setIsRepackOpen(false);
          await fetchStockData();
          alert(json.message || 'Repack berhasil dijalankan!');
        } else {
          alert(`Gagal memproses repack: ${json.message}`);
        }
      } catch (err: any) {
        alert(`Error koneksi: ${err.message}`);
      } finally {
        setIsRepackingSubmitting(false);
      }
    }
  };

  // Handlers for Editing Batch
  const handleOpenEditBatch = (batch: any) => {
    setEditingBatch(batch);
    setEditBatchForm({
      id: batch.id,
      batch_number: batch.batch_number || '',
      expiry_date: batch.expiry_date ? String(batch.expiry_date).split('T')[0] : '',
      production_date: batch.production_date ? String(batch.production_date).split('T')[0] : '',
      notes: '',
    });
    setIsEditBatchOpen(true);
  };

  const handleSaveEditBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBatchForm.id || !editBatchForm.batch_number.trim() || !editBatchForm.expiry_date) {
      alert('Nomor Batch dan Tanggal Expired (ED) wajib diisi!');
      return;
    }

    setIsEditBatchSubmitting(true);
    try {
      const res = await fetch('/api/stock-batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editBatchForm),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal memperbarui batch di server');
      }

      setIsEditBatchOpen(false);
      setEditingBatch(null);
      alert(`Informasi Batch '${editBatchForm.batch_number}' berhasil diperbarui!`);
      await fetchStockData();
    } catch (err: any) {
      console.error(err);
      alert(`Gagal menyimpan perubahan batch: ${err.message}`);
    } finally {
      setIsEditBatchSubmitting(false);
    }
  };

  // Filter Products (Sorted Alphabetically by Name)
  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAplikasi =
        selectedAplikasi === 'ALL' ||
        (Array.isArray(p.applications)
          ? p.applications.some((a: string) => a.toLowerCase() === selectedAplikasi.toLowerCase())
          : (p as any).application?.toLowerCase() === selectedAplikasi.toLowerCase());
      return matchesSearch && matchesAplikasi;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20">
      <AdminTopNav />

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
        {/* Title & Warehouse Role Actions Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-blue-900 via-slate-800 to-blue-950 p-6 rounded-2xl text-white shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Inventory
              </span>
              <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] font-mono px-2 py-0.5 rounded font-bold flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-300" /> MYSQL DATABASE CONNECTED
              </span>
            </div>
            <h1 className="text-2xl font-bold mt-1.5 flex items-center gap-2">
              <Boxes className="w-6 h-6 text-amber-400" />
              Manajemen Stok FEFO &amp; Penyiapan Barang Gudang
            </h1>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl">
              {canEditBatch
                ? 'Tugas Pengelola Gudang: Menerima Stok PO Distributor, Menyiapkan Barang untuk Kurir / Customer Ambil Langsung, & Audit Stok Opname.'
                : 'Pantau ketersediaan stok fisik bibit parfum real-time, varian kemasan, dan urutan prioritas FEFO untuk Sales Order.'}
            </p>
          </div>

          {/* Action Buttons for Warehouse Manager */}
          {canEditBatch && (
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/admin/procurement"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-all"
              >
                <Package className="w-4 h-4" /> 1. Terima Stok PO Vendor
              </Link>
              <button
                onClick={() => {
                  if (batches.length > 0) {
                    setRepackForm({
                      source_batch_id: batches[0].id,
                      target_pack_size: 1,
                      repack_qty_kg: 1.0,
                      loss_kg: 0.0,
                    });
                  }
                  setIsRepackOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" /> 2. Repack Varian Stok
              </button>
              <Link
                href="/admin/sales-orders"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-all"
              >
                <Truck className="w-4 h-4" /> 3. Menyiapkan Barang (Pick/Pack)
              </Link>
              <Link
                href="/admin/stock/opname"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-all"
              >
                <ClipboardList className="w-4 h-4" /> 3. Stok Opname (Audit)
              </Link>
            </div>
          )}
        </div>

        {/* Search & Fragrance Family Filter Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari SKU atau nama varian parfum..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            {canUserExportXLSX(currentUser) && (
              <button
                onClick={() => exportStockInventoryToXLSX(batches)}
                className="text-xs font-bold text-emerald-700 hover:bg-emerald-100 bg-emerald-50 border border-emerald-300 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Ekspor Seluruh Data Batch Stok Gudang ke File Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Ekspor Stok (XLSX)
              </button>
            )}

            <button
              onClick={() => {
                if (expandedProductIds.length === filteredProducts.length) {
                  setExpandedProductIds([]);
                } else {
                  setExpandedProductIds(filteredProducts.map((p) => p.id));
                }
              }}
              className="text-xs font-bold text-purple-700 hover:bg-purple-100 bg-purple-50 border border-purple-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              {expandedProductIds.length === filteredProducts.length ? 'Tutup Semua Hirarki' : 'Buka Semua Hirarki'}
            </button>

            <button
              onClick={fetchStockData}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg flex items-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '↻ Refresh MySQL'}
            </button>

            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Aplikasi:</span>
            <select
              value={selectedAplikasi}
              onChange={(e) => setSelectedAplikasi(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Aplikasi</option>
              {applicationCategories.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading Spinner & Skeleton State */}
        {isLoading && (
          <div className="py-16 text-center space-y-3 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Mengambil Data Stok & Batch Lot dari Database MySQL `fragrance_hub`...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Gagal memuat stok: {error}</span>
            </div>
            <button
              onClick={fetchStockData}
              className="bg-red-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-red-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* 3-LEVEL PRODUCT HIERARCHY DISPLAY */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {filteredProducts.map((p, index) => {
              const productBatches = batches.filter((b) => b.product_id === p.id);
              const totalStockKg = productBatches.reduce((sum, b) => sum + Number(b.current_qty_kg || 0), 0);
              const packSizes = p.pack_sizes || [25, 5, 1];
              const isExpanded = expandedProductIds.includes(p.id);

              const variantDetails = packSizes.map((sizeKg) => {
                const getPackSize = (b: any): number => {
                  if (b.pack_size_kg && [25, 5, 1].includes(Number(b.pack_size_kg))) return Number(b.pack_size_kg);
                  const sku = (b.variant_sku || '').toUpperCase();
                  const num = (b.batch_number || '').toUpperCase();
                  if (sku.includes('-25K') || num.includes('25K') || num.includes('-25-')) return 25;
                  if (sku.includes('-5K') || num.includes('5K') || num.includes('-5-')) return 5;
                  if (sku.includes('-1K') || num.includes('1K') || num.includes('-1-')) return 1;
                  const qty = Number(b.current_qty_kg || 0);
                  if (qty >= 25 && qty % 25 === 0) return 25;
                  if (qty >= 5 && qty % 5 === 0) return 5;
                  if (qty >= 1 && qty % 1 === 0) return 1;
                  return 25;
                };

                const variantBatches = productBatches.filter((b) => getPackSize(b) === sizeKg && Number(b.current_qty_kg || 0) > 0);
                const totalKg = variantBatches.reduce((sum, b) => sum + Number(b.current_qty_kg || 0), 0);
                const units = variantBatches.reduce((sum, b) => {
                  const u = Math.max(0, Math.round(Number(b.current_qty_kg || 0) / sizeKg));
                  return sum + u;
                }, 0);

                const variantObj = p.variants?.find((v) => Math.round(Number(v.pack_size_kg)) === sizeKg);
                const minStockKg = variantObj ? Number(variantObj.min_stock_kg) : 0;
                
                const isOutOfStock = totalKg <= 0;
                const isLowStock = !isOutOfStock && totalKg <= minStockKg;

                return { sizeKg, totalKg, units, isOutOfStock, isLowStock, minStockKg };
              });

              const isAllOutOfStock = totalStockKg <= 0 || variantDetails.every((vd) => vd.isOutOfStock);
              const hasOutOfStockVariant = variantDetails.some((vd) => vd.isOutOfStock);
              const hasLowStockVariant = variantDetails.some((vd) => vd.isLowStock);

              const toggleExpand = (pId: string) => {
                if (expandedProductIds.includes(pId)) {
                  setExpandedProductIds(expandedProductIds.filter((id) => id !== pId));
                } else {
                  setExpandedProductIds([...expandedProductIds, pId]);
                }
              };               return (
                <div
                  key={p.id}
                  className={`bg-white border rounded-2xl overflow-hidden transition-all shadow-sm ${
                    isAllOutOfStock 
                      ? 'border-red-300 ring-1 ring-red-200' 
                      : hasLowStockVariant 
                        ? 'border-amber-300 ring-1 ring-amber-200' 
                        : 'border-gray-200'
                  }`}
                >
                  {/* LEVEL 1: Produk Template Header */}
                  <div
                    onClick={() => toggleExpand(p.id)}
                    className="p-5 bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-850 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-extrabold text-sm shrink-0 shadow-sm">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold tracking-widest text-blue-400 uppercase">
                            Produk Induk
                          </span>
                          {isAllOutOfStock && (
                            <span className="bg-red-500/20 text-red-300 border border-red-400/40 text-[10px] px-2 py-0.5 rounded font-extrabold flex items-center gap-1 uppercase tracking-wide">
                              <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" /> STOK HABIS
                            </span>
                          )}
                          {!isAllOutOfStock && hasOutOfStockVariant && (
                            <span className="bg-red-500/10 text-red-300 border border-red-500/30 text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 uppercase tracking-wide">
                              <AlertTriangle className="w-3 h-3 text-red-400" /> ADA VARIAN HABIS
                            </span>
                          )}
                          {hasLowStockVariant && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 uppercase tracking-wide">
                              <AlertTriangle className="w-3 h-3 text-amber-400" /> STOK MINIMUM
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl font-extrabold text-white mt-0.5">{p.name}</h2>
                        <div className="text-xs text-slate-300 font-mono mt-1 flex flex-wrap items-center gap-3">
                          <span>SKU Induk: <strong>{p.sku}</strong></span>
                        </div>
                        {/* Application badge */}
                        {(() => {
                          const app = (Array.isArray(p.applications) && p.applications.length > 0 ? p.applications[0] : (p as any).application) || 'Fine Fragrance';
                          const color =
                            app === 'Industry'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : app === 'Fine Fragrance'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : app === 'Indoor'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : app === 'Homecare'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-600/30 text-slate-300 border-slate-500/40';
                          return (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${color}`}>
                                {app}
                              </span>
                            </div>
                          );
                        })()}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {variantDetails.map(({ sizeKg, totalKg, units, isOutOfStock: isVOutOfStock, isLowStock: isVLowStock }) => (
                            <span 
                              key={sizeKg} 
                              className={`border text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 font-mono transition-colors ${
                                isVOutOfStock
                                  ? 'bg-red-950/40 border-red-900/50 text-red-400'
                                  : isVLowStock
                                    ? 'bg-amber-950/40 border-amber-900/50 text-amber-400'
                                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
                              }`}
                            >
                              <span className={isVOutOfStock ? 'text-red-500 font-extrabold' : isVLowStock ? 'text-amber-500 font-extrabold' : 'text-purple-400 font-extrabold'}>
                                {sizeKg}K:
                              </span>
                              <span className="text-white font-extrabold">{units} Unit</span>
                              <span className="opacity-80">({Math.round(totalKg)} Kg)</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                      <div className="text-left md:text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Stok Fisik All Varian</div>
                        <div className="text-xl font-mono font-extrabold text-emerald-400">
                          {formatKg(totalStockKg)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-300 bg-blue-900/50 px-3 py-1.5 rounded-lg border border-blue-700/50">
                          {packSizes.length} Varian Kemasan
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* LEVEL 2 & LEVEL 3: Produk Varian & FEFO Batch Tables */}
                  {isExpanded && (
                    <div className="p-6 space-y-6 bg-slate-50/60 divide-y divide-gray-200">
                      <div className="flex items-center justify-between pb-2">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-blue-600" /> Hirarki Produk Varian Kemasan & Rincian Batch FEFO
                        </h3>
                        {canEditBatch && (
                          <button
                            onClick={() => {
                              setNewBatchForm({ ...newBatchForm, product_id: p.id });
                              setIsAddBatchOpen(true);
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Terima Batch PO Vendor
                          </button>
                        )}
                      </div>

                      {packSizes.map((sizeKg) => {
                        const variantSku = `${p.sku}-${sizeKg}K`;
                        const getPackSize = (b: any): number => {
                          if (b.pack_size_kg && [25, 5, 1].includes(Number(b.pack_size_kg))) return Number(b.pack_size_kg);
                          const sku = (b.variant_sku || '').toUpperCase();
                          const num = (b.batch_number || '').toUpperCase();
                          if (sku.includes('-25K') || num.includes('25K') || num.includes('-25-')) return 25;
                          if (sku.includes('-5K') || num.includes('5K') || num.includes('-5-')) return 5;
                          if (sku.includes('-1K') || num.includes('1K') || num.includes('-1-')) return 1;
                          const qty = Number(b.current_qty_kg || 0);
                          if (qty >= 25 && qty % 25 === 0) return 25;
                          if (qty >= 5 && qty % 5 === 0) return 5;
                          if (qty >= 1 && qty % 1 === 0) return 1;
                          return 25;
                        };

                        const variantBatches = productBatches.filter((b) => getPackSize(b) === sizeKg && Number(b.current_qty_kg || 0) > 0);
                        const variantUnits = variantBatches.reduce((sum, b) => {
                          const u = Math.max(0, Math.round(Number(b.current_qty_kg || 0) / sizeKg));
                          return sum + u;
                        }, 0);
                        const variantTotalKg = variantBatches.reduce((sum, b) => sum + Number(b.current_qty_kg || 0), 0);

                        const details = variantDetails.find((vd) => vd.sizeKg === sizeKg);
                        const isVOutOfStock = details?.isOutOfStock ?? (variantTotalKg <= 0);
                        const isVLowStock = details?.isLowStock ?? false;
                        const minStockKg = details?.minStockKg ?? 0;

                        return (
                          <div key={sizeKg} className="pt-5 first:pt-0 space-y-3">
                            {/* LEVEL 2: Produk Varian Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="text-[10px] font-extrabold text-purple-700 tracking-wider uppercase">
                                  Produk Varian
                                </div>
                                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                  <span>{p.name} – {sizeKg} K</span>
                                  <span className="text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-md">
                                    {variantSku}
                                  </span>
                                </h3>
                              </div>
                              <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
                                <span className="bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-lg font-bold">
                                  Kemasan Satuan: {sizeKg} Kg
                                </span>
                                {isVOutOfStock ? (
                                  <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-lg font-extrabold flex items-center gap-1.5 uppercase tracking-wide">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-655 animate-pulse" /> Stok Habis (0.0 Kg)
                                  </span>
                                ) : isVLowStock ? (
                                  <>
                                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg font-extrabold flex items-center gap-1.5 uppercase tracking-wide">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Stok Minimum (Limit: {minStockKg} Kg)
                                    </span>
                                    <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-lg font-extrabold">
                                      Stok: {variantUnits} Unit ({formatKg(variantTotalKg)})
                                    </span>
                                  </>
                                ) : (
                                  <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-lg font-extrabold">
                                    Stok: {variantUnits} Unit ({formatKg(variantTotalKg)})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* LEVEL 3: Tabel Rincian Batch FEFO khusus Varian ini */}
                            <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                              <table className="w-full text-xs text-left">
                                <thead>
                                  <tr className="bg-gray-100/90 border-b border-gray-200 text-slate-600 uppercase tracking-wide font-semibold text-[10px]">
                                    <th className="px-4 py-2.5">SKU VARIAN & NO. BATCH</th>
                                    <th className="px-4 py-2.5">KEMASAN SATUAN</th>
                                    <th className="px-4 py-2.5">TANGGAL PRODUKSI</th>
                                    <th className="px-4 py-2.5">KADALUARSA (FEFO ORDER)</th>
                                    <th className="px-4 py-2.5 text-right">STOK FISIK (UNIT & KG)</th>
                                    <th className="px-4 py-2.5 text-center">STATUS FEFO</th>
                                    {canEditBatch && <th className="px-4 py-2.5 text-center">AKSI</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {(() => {
                                    const groupedVariantBatches = (() => {
                                      const map: { [key: string]: typeof variantBatches[0] & { total_initial_qty: number } } = {};
                                      variantBatches.forEach((b) => {
                                        const key = (b.batch_number || '').trim().toUpperCase();
                                        const currentUnit = Math.max(0, Math.round(Number(b.current_qty_kg || 0) / sizeKg));
                                        
                                        if (!map[key]) {
                                          map[key] = {
                                            ...b,
                                            current_qty_kg: Number(b.current_qty_kg || 0),
                                            total_initial_qty: Number(b.initial_qty_kg || 0),
                                            unit_count: currentUnit,
                                          };
                                        } else {
                                          const existing = map[key]!;
                                          existing.current_qty_kg = (existing.current_qty_kg || 0) + Number(b.current_qty_kg || 0);
                                          existing.total_initial_qty = (existing.total_initial_qty || 0) + Number(b.initial_qty_kg || 0);
                                          existing.unit_count = (existing.unit_count || 0) + currentUnit;
                                          if (Number(existing.unit_cost_per_kg) === 0 && Number(b.unit_cost_per_kg) > 0) {
                                            existing.unit_cost_per_kg = b.unit_cost_per_kg;
                                          }
                                        }
                                      });
                                      return Object.values(map);
                                    })();

                                    return groupedVariantBatches.length > 0 ? (
                                      groupedVariantBatches.map((b, idx) => {
                                        const unitCount = b.unit_count;
                                        const batchKg = Number(b.current_qty_kg || 0);
                                        const isRepacked = Number(b.current_qty_kg) < Number(b.total_initial_qty);
                                        return (
                                          <tr key={b.id} className={`hover:bg-blue-50/40 transition-colors font-medium ${isRepacked ? 'bg-amber-100/60 border-l-4 border-l-amber-600' : ''}`}>
                                            <td className="px-4 py-3">
                                              <div className="font-mono text-xs font-extrabold text-purple-700">
                                                {b.variant_sku || variantSku}
                                              </div>
                                              <div className="font-mono font-bold text-blue-700 text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                <span>No. Batch: {b.batch_number}</span>
                                                {idx === 0 && (
                                                  <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded font-extrabold tracking-wide uppercase border border-emerald-300">
                                                    KELUAR PERTAMA
                                                  </span>
                                                )}
                                                {isRepacked && (
                                                  <span className="bg-amber-600 text-white text-[9px] px-2.5 py-0.5 rounded-md font-extrabold tracking-wide uppercase border border-amber-700 shadow-2xs">
                                                    TERPAKAI SEBAGIAN (REPACK)
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3">
                                              <span className="bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold font-mono px-2.5 py-1 rounded">
                                                {sizeKg} Kg
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 font-mono">{formatDate(b.production_date)}</td>
                                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{formatDate(b.expiry_date)}</td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                                              <div className="text-sm">{formatKg(batchKg)}</div>
                                              <div className="text-[10px] text-slate-400 font-medium">
                                                ({unitCount} Unit @ {sizeKg}kg)
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              {b.is_expired ? (
                                                <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] px-2.5 py-1 rounded-full font-extrabold">EXPIRED</span>
                                              ) : (
                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2.5 py-1 rounded-full font-extrabold">READY FEFO</span>
                                              )}
                                            </td>
                                            {canEditBatch && (
                                              <td className="px-4 py-3 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenEditBatch(b)}
                                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs"
                                                  title="Edit Nomor Batch & Tanggal Expired"
                                                >
                                                  <Edit3 className="w-3 h-3 text-blue-600" />
                                                  Edit
                                                </button>
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan={canEditBatch ? 7 : 6} className="px-4 py-4 text-center text-slate-400 text-xs italic bg-gray-50/50">
                                          Belum ada batch lot fisik untuk varian {sizeKg} Kg ini.
                                        </td>
                                      </tr>
                                    );
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL 1: PENERIMAAN STOK BATCH BARU DARI PO VENDOR */}
      {isAddBatchOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-amber-500 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                <h3 className="font-bold text-base">Penerimaan Stok PO Distributor</h3>
              </div>
              <button onClick={() => setIsAddBatchOpen(false)} className="text-amber-100 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewBatch} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Varian Bibit Parfum Diterima</label>
                <select
                  value={newBatchForm.product_id}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, product_id: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 font-bold text-slate-800 text-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Varian Satuan Kemasan Diterima</label>
                <select
                  value={newBatchForm.pack_size_kg}
                  onChange={(e) => {
                    const size = Number(e.target.value);
                    setNewBatchForm({
                      ...newBatchForm,
                      pack_size_kg: size,
                      initial_qty_kg: size,
                    });
                  }}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 font-mono font-bold text-amber-800 text-xs"
                >
                  <option value={25}>Kemasan 25 Kg (Jerigen / Drum Besar)</option>
                  <option value={5}>Kemasan 5 Kg (Jerigen Sedang)</option>
                  <option value={1}>Kemasan 1 Kg (Botol / Jerigen Kecil)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nomor Referensi PO</label>
                  <input
                    type="text"
                    required
                    value={newBatchForm.po_number}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, po_number: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nomor Batch Lot Vendor</label>
                  <input
                    type="text"
                    required
                    value={newBatchForm.batch_number}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, batch_number: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 font-mono text-xs font-bold text-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jumlah Diterima (Kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newBatchForm.initial_qty_kg}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, initial_qty_kg: Number(e.target.value) })}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 font-mono text-xs font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harga Modal / Kg (IDR)</label>
                  <input
                    type="number"
                    step="50000"
                    required
                    value={newBatchForm.unit_cost_per_kg}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, unit_cost_per_kg: Number(e.target.value) })}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Produksi</label>
                  <input
                    type="date"
                    required
                    value={newBatchForm.production_date}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, production_date: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Expiry (FEFO Order)</label>
                  <input
                    type="date"
                    required
                    value={newBatchForm.expiry_date}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, expiry_date: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 font-mono text-xs font-bold text-amber-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddBatchOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow"
                >
                  Simpan Batch Stok Baru ke MySQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PENYIAPAN BARANG (PICK & PACK / CUSTOMER SELF-PICKUP) */}
      {isPackingOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-base">Penyiapan Barang Gudang (Fulfillment)</h3>
                  <p className="text-xs text-emerald-200">Untuk Kurir Cargo ATAU Customer Ambil Langsung</p>
                </div>
              </div>
              <button onClick={() => setIsPackingOpen(false)} className="text-emerald-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <h4 className="font-bold text-slate-700 text-sm">Daftar Pesanan yang Perlu Disiapkan Gudang:</h4>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {salesOrders
                  .filter((so) => so.status === 'PROSES_GUDANG' || so.status === 'DIBAYAR' || so.status === 'DIKONFIRMASI')
                  .map((so) => (
                    <div key={so.id} className="bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-mono font-bold text-blue-700 text-sm">{so.so_number}</div>
                          <div className="font-bold text-slate-800">{so.customer_company}</div>
                        </div>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          {so.status}
                        </span>
                      </div>

                      <div className="text-slate-600 bg-white p-2.5 rounded-lg border border-gray-200 space-y-1">
                        {so.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-[11px]">
                            <span>• {item.product_name}</span>
                            <span className="font-mono font-bold text-slate-800">{formatKg(item.qty_kg)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end items-center gap-2 pt-1">
                        <button
                          onClick={() => handleFulfillOrder(so.id, 'SELF_PICKUP')}
                          className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-amber-700" /> Customer Ambil Langsung di HQ
                        </button>
                        <button
                          onClick={() => handleFulfillOrder(so.id, 'COURIER')}
                          className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all"
                        >
                          <Truck className="w-3.5 h-3.5" /> Serahkan ke Kurir Cargo
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: STOK OPNAME (AUDIT FISIK GUDANG) */}
      {isOpnameOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                <h3 className="font-bold text-base">Stok Opname (Penyesuaian Fisik)</h3>
              </div>
              <button onClick={() => setIsOpnameOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOpname} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Varian Produk Parfum</label>
                <select
                  value={opnameForm.product_id}
                  onChange={(e) => {
                    const selected = products.find((p) => p.id === e.target.value);
                    const prodBatches = batches.filter((b) => b.product_id === e.target.value);
                    const sysTotal = prodBatches.reduce((s, b) => s + Number(b.current_qty_kg || 0), 0);

                    setOpnameForm({
                      ...opnameForm,
                      product_id: e.target.value,
                      system_qty_kg: sysTotal,
                      physical_qty_kg: sysTotal,
                    });
                  }}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 font-bold text-slate-800 text-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Stok di Sistem (Kg)</label>
                  <input
                    type="number"
                    disabled
                    value={opnameForm.system_qty_kg}
                    className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2 font-mono text-xs font-bold text-slate-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hasil Hitung Fisik (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={opnameForm.physical_qty_kg}
                    onChange={(e) => setOpnameForm({ ...opnameForm, physical_qty_kg: Number(e.target.value) })}
                    className="w-full bg-white border border-blue-400 rounded-lg p-2 font-mono text-xs font-bold text-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alasan / Catatan Stok Opname</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Pengujian sampel lab QC, selisih kebocoran drum..."
                  value={opnameForm.notes}
                  onChange={(e) => setOpnameForm({ ...opnameForm, notes: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOpnameOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow"
                >
                  Simpan Penyesuaian Opname
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: REPACK VARIAN STOK (SINGLE & MULTI-BATCH BLENDING) */}
      {isRepackOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in">
            {/* Modal Header */}
            <div className="bg-purple-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5 text-purple-200" />
                <div>
                  <h3 className="font-bold text-base">Proses Repack Varian Stok</h3>
                  <p className="text-xs text-purple-200">Pecah kemasan besar atau gabungkan sisa batch (Multi-Batch Blending)</p>
                </div>
              </div>
              <button onClick={() => setIsRepackOpen(false)} className="text-purple-200 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tab Switcher */}
            <div className="flex border-b border-purple-100 bg-purple-50/50 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setRepackMode('SINGLE')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  repackMode === 'SINGLE'
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-transparent text-purple-800 hover:bg-purple-100/60'
                }`}
              >
                <Package className="w-3.5 h-3.5" /> 1. Repack Tunggal (Pecah 1 Drum)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRepackMode('MULTI');
                  if (!multiRepackForm.product_id && products.length > 0) {
                    const firstProd = products.find(p => batches.some(b => b.product_id === p.id && Number(b.current_qty_kg || 0) > 0));
                    if (firstProd) {
                      const autoBatch = `RPK-${firstProd.sku || 'MIX'}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
                      setMultiRepackForm({
                        product_id: firstProd.id,
                        target_pack_size: 5,
                        new_batch_number: autoBatch,
                        selectedSources: {},
                      });
                    }
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  repackMode === 'MULTI'
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-transparent text-purple-800 hover:bg-purple-100/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> 2. Repack Gabungan (Kombinasi Multi-Batch)
              </button>
            </div>

            <form onSubmit={handleRepackSubmit} className="p-6 space-y-4 text-xs">
              {repackMode === 'MULTI' ? (
                /* ───────────────────────────────────────────────────────────── */
                /* MODE MULTI-BATCH (BLENDING / GABUNG BATCH BERBEDA)            */
                /* ───────────────────────────────────────────────────────────── */
                <div className="space-y-4">
                  {/* 1. Pilih Produk Induk */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Pilih Produk Induk</label>
                    <select
                      value={multiRepackForm.product_id}
                      onChange={(e) => {
                        const pId = e.target.value;
                        const prod = products.find((p) => p.id === pId);
                        const autoBatch = prod ? `RPK-${prod.sku || 'MIX'}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}` : '';
                        setMultiRepackForm({
                          ...multiRepackForm,
                          product_id: pId,
                          new_batch_number: autoBatch,
                          selectedSources: {},
                        });
                      }}
                      className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-bold text-slate-800 text-xs"
                      required
                    >
                      <option value="">-- Pilih Produk yang akan Digabung --</option>
                      {products
                        .filter((p) => batches.some((b) => b.product_id === p.id && Number(b.current_qty_kg || 0) > 0))
                        .map((p) => {
                          const activeBatchesCount = batches.filter((b) => b.product_id === p.id && Number(b.current_qty_kg || 0) > 0).length;
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} ({activeBatchesCount} Batch Aktif Tersedia)
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  {/* 2. Daftar Batch Tersedia untuk Produk Ini */}
                  {multiRepackForm.product_id && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700">Pilih & Tentukan Jumlah Ambil dari Setiap Batch Sumber:</label>
                        <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full">
                          Prinsip FEFO Otomatis
                        </span>
                      </div>

                      <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-56 overflow-y-auto">
                        {batches
                          .filter((b) => b.product_id === multiRepackForm.product_id && Number(b.current_qty_kg || 0) > 0)
                          .map((b) => {
                            const curQty = Number(b.current_qty_kg || 0);
                            const takenQty = multiRepackForm.selectedSources[b.id] !== undefined ? multiRepackForm.selectedSources[b.id] : 0;
                            const isSelected = takenQty > 0;

                            return (
                              <div
                                key={b.id}
                                className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                                  isSelected ? 'bg-purple-50/60' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="space-y-0.5 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-blue-700 font-mono text-xs">{b.batch_number}</span>
                                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                      Kemasan Awal: {b.pack_size_kg || 25} Kg
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2">
                                    <span>Tersedia: <strong className="text-emerald-700 font-mono">{formatKg(curQty)}</strong></span>
                                    <span className="text-slate-300">|</span>
                                    <span>Kadaluarsa: <strong className="text-amber-700 font-mono">{formatDate(b.expiry_date)}</strong></span>
                                    <span className="text-slate-300">|</span>
                                    <span>HPP: <strong className="text-slate-700 font-mono">{formatIDR(b.unit_cost_per_kg)}/Kg</strong></span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      max={curQty}
                                      value={takenQty || ''}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const val = Math.max(0, Math.min(curQty, Number(e.target.value) || 0));
                                        setMultiRepackForm({
                                          ...multiRepackForm,
                                          selectedSources: {
                                            ...multiRepackForm.selectedSources,
                                            [b.id]: val,
                                          },
                                        });
                                      }}
                                      className="w-24 bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-right font-mono font-bold text-xs text-purple-800 pr-6"
                                    />
                                    <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold pointer-events-none">Kg</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextVal = takenQty === curQty ? 0 : curQty;
                                      setMultiRepackForm({
                                        ...multiRepackForm,
                                        selectedSources: {
                                          ...multiRepackForm.selectedSources,
                                          [b.id]: nextVal,
                                        },
                                      });
                                    }}
                                    className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-colors ${
                                      takenQty === curQty
                                        ? 'bg-purple-100 border-purple-300 text-purple-800'
                                        : 'bg-white border-gray-200 text-slate-600 hover:bg-gray-50'
                                    }`}
                                  >
                                    {takenQty === curQty ? 'Batal' : 'Ambil Semua'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* 3. Pilih Kemasan Varian Tujuan */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">Kemasan Varian Tujuan</label>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { val: 1, label: '1 Kg (Botol Aluminium)' },
                        { val: 5, label: '5 Kg (Jerigen Sedang)' },
                        { val: 25, label: '25 Kg (Drum Standar)' },
                      ].map((opt) => (
                        <label key={opt.val} className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-700">
                          <input
                            type="radio"
                            name="multi_target_pack_size"
                            checked={multiRepackForm.target_pack_size === opt.val}
                            onChange={() => setMultiRepackForm({ ...multiRepackForm, target_pack_size: opt.val })}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 4. Nomor Batch Hasil Repack */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nomor Batch Hasil Repack (Otomatis / Kustom)</label>
                    <input
                      type="text"
                      required
                      value={multiRepackForm.new_batch_number}
                      onChange={(e) => setMultiRepackForm({ ...multiRepackForm, new_batch_number: e.target.value })}
                      placeholder="Contoh: RPK-CIT-2026-01"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 font-mono font-bold text-xs text-blue-700"
                    />
                  </div>

                  {/* 5. Live Estimasi Multi-Batch Blending */}
                  {(() => {
                    const activeEntries = Object.entries(multiRepackForm.selectedSources)
                      .filter(([_, qty]) => Number(qty) > 0);
                    
                    const totalInputKg = activeEntries.reduce((acc, [_, qty]) => acc + Number(qty), 0);
                    const targetSize = Number(multiRepackForm.target_pack_size);
                    const targetUnits = totalInputKg > 0 ? Math.ceil(totalInputKg / targetSize) : 0;

                    let totalCost = 0;
                    let earliestExpiry: string | null = null;

                    activeEntries.forEach(([bId, qty]) => {
                      const b = batches.find((x) => x.id === bId);
                      if (b) {
                        totalCost += (Number(qty) * Number(b.unit_cost_per_kg || 0));
                        const exp = b.expiry_date ? String(b.expiry_date).split('T')[0] : null;
                        if (exp && (!earliestExpiry || exp < earliestExpiry)) {
                          earliestExpiry = exp;
                        }
                      }
                    });

                    const weightedAvgHpp = totalInputKg > 0 ? Math.round(totalCost / totalInputKg) : 0;

                    return (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2.5">
                        <div className="font-bold text-purple-800 text-[11px] uppercase tracking-wider flex items-center justify-between">
                          <span>Kalkulasi Otomatis Hasil Repack Gabungan:</span>
                          <span className="text-purple-600 font-mono lowercase">{activeEntries.length} batch dikombinasikan</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 text-xs font-medium border-t border-purple-100 pt-2">
                          <div>
                            <span className="text-slate-500">Total Bahan Diambil:</span>
                            <div className="font-bold text-slate-800 font-mono text-sm">{formatKg(totalInputKg)}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">Estimasi Hasil Varian ({targetSize} Kg):</span>
                            <div className="font-bold text-purple-700 font-mono text-sm">
                              +{formatKg(totalInputKg)} ({targetUnits} Unit)
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500 flex items-center gap-1">
                              <span>Tanggal Kadaluarsa Hasil:</span>
                              <span className="text-[9px] text-amber-700 font-normal">(FEFO Tertua)</span>
                            </span>
                            <div className="font-bold text-amber-800 font-mono">
                              {earliestExpiry ? formatDate(earliestExpiry) : '-'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">HPP Rata-Rata Tertimbang:</span>
                            <div className="font-bold text-emerald-700 font-mono">
                              {formatIDR(weightedAvgHpp)} / Kg
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* ───────────────────────────────────────────────────────────── */
                /* MODE SINGLE BATCH (PECAH 1 BATCH BESAR KE KECIL)              */
                /* ───────────────────────────────────────────────────────────── */
                <div className="space-y-4">
                  {/* 1. Pilih Batch Sumber */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Batch Sumber (Varian Besar)</label>
                    <select
                      value={repackForm.source_batch_id}
                      onChange={(e) => {
                        const selected = batches.find((b) => b.id === e.target.value);
                        setRepackForm({
                          ...repackForm,
                          source_batch_id: e.target.value,
                          repack_qty_kg: selected ? Math.min(1.0, Number(selected.current_qty_kg || 0)) : 1.0,
                        });
                      }}
                      className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-bold text-slate-800 text-xs font-mono"
                      required
                    >
                      <option value="">-- Pilih Batch Lot Sumber --</option>
                      {batches
                        .filter((b) => Number(b.current_qty_kg || 0) > 0)
                        .map((b) => {
                          const prodName = products.find((p) => p.id === b.product_id)?.name || 'Produk';
                          return (
                            <option key={b.id} value={b.id}>
                              {prodName} | {b.batch_number} ({formatKg(b.current_qty_kg)} Tersedia)
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  {/* Tampilkan Informasi Batch Sumber Terpilih */}
                  {(() => {
                    const b = batches.find((x) => x.id === repackForm.source_batch_id);
                    if (!b) return null;
                    const prodName = products.find((p) => p.id === b.product_id)?.name || 'Produk';
                    return (
                      <div className="bg-slate-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
                        <div className="font-bold text-slate-700">Rincian Batch Sumber:</div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-medium">
                          <div>Nama Produk: <span className="font-bold text-slate-800">{prodName}</span></div>
                          <div>No. Batch: <span className="font-bold text-blue-700 font-mono">{b.batch_number}</span></div>
                          <div>Kemasan Awal: <span className="font-bold text-slate-800 font-mono">{b.pack_size_kg || 25} Kg</span></div>
                          <div>Stok Saat Ini: <span className="font-bold text-emerald-700 font-mono">{formatKg(b.current_qty_kg)} ({Math.max(0, Math.round(Number(b.current_qty_kg || 0) / (b.pack_size_kg || 25)))} unit)</span></div>
                          <div>Kadaluarsa: <span className="font-bold text-slate-800 font-mono">{formatDate(b.expiry_date)}</span></div>
                          <div>Modal/Kg: <span className="font-bold text-slate-800 font-mono">{formatIDR(b.unit_cost_per_kg)}</span></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. Pilih Kemasan Varian Tujuan */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">Kemasan Varian Tujuan</label>
                    <div className="flex gap-4">
                      {[
                        { val: 1, label: '1 Kg (Botol Aluminium)' },
                        { val: 5, label: '5 Kg (Jerigen Sedang)' },
                      ].map((opt) => {
                        const sourceBatch = batches.find((b) => b.id === repackForm.source_batch_id);
                        const sourcePackSize = sourceBatch?.pack_size_kg || 25;
                        const disabled = opt.val >= sourcePackSize;

                        return (
                          <label key={opt.val} className={`flex items-center gap-1.5 font-bold cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : 'text-slate-700'}`}>
                            <input
                              type="radio"
                              name="single_target_pack_size"
                              disabled={disabled}
                              checked={repackForm.target_pack_size === opt.val}
                              onChange={() => setRepackForm({ ...repackForm, target_pack_size: opt.val })}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Tentukan Jumlah Repack */}
                  <div className="w-full">
                    <label className="font-bold text-slate-700 block mb-1">Jumlah Di-repack (Kg)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={repackForm.repack_qty_kg}
                      onChange={(e) => setRepackForm({ ...repackForm, repack_qty_kg: Number(e.target.value) })}
                      className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-mono text-xs font-bold text-purple-700"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Dapat dilakukan dalam kelipatan 1 Kg</p>
                  </div>

                  {/* 4. Live Estimasi Konversi */}
                  {(() => {
                    const b = batches.find((x) => x.id === repackForm.source_batch_id);
                    if (!b) return null;
                    const sourceQty = Number(b.current_qty_kg || 0);
                    const repackQty = Number(repackForm.repack_qty_kg);
                    const targetSize = Number(repackForm.target_pack_size);
                    
                    const targetQty = repackQty;
                    const targetUnits = Math.ceil(targetQty / targetSize);
                    const remainingQty = Math.max(0, sourceQty - repackQty);

                    return (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2">
                        <div className="font-bold text-purple-800 text-[11px] uppercase tracking-wider">Estimasi Hasil Repack:</div>
                        <div className="space-y-1 text-slate-700 text-xs font-medium">
                          <div className="flex justify-between">
                            <span>Sisa Batch Sumber ({b.pack_size_kg} Kg):</span>
                            <span className="font-bold text-slate-800 font-mono">{formatKg(remainingQty)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Hasil Varian Baru ({targetSize} Kg):</span>
                            <span className="font-bold text-purple-700 font-mono">+{formatKg(targetQty)} ({targetUnits} Unit)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRepackOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRepackingSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold shadow-md flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isRepackingSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Memproses...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> {repackMode === 'MULTI' ? 'Jalankan Repack Gabungan' : 'Jalankan Repack Varian'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT INFORMASI NO. BATCH & TANGGAL EXPIRED (ED) */}
      {isEditBatchOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-200" />
                <div>
                  <h3 className="font-bold text-sm">Edit Informasi Batch Stok (FEFO)</h3>
                  <p className="text-[11px] text-blue-100">Koreksi nomor batch atau perbarui masa kedaluwarsa</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditBatchOpen(false);
                  setEditingBatch(null);
                }}
                className="text-blue-200 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBatch} className="p-6 space-y-4 text-xs">
              {editingBatch && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <div className="font-bold text-slate-800">{editingBatch.variant_sku || 'Varian Produk'}</div>
                  <div className="text-slate-500 text-[11px]">
                    Sisa Stok Fisik: <strong className="text-slate-700 font-mono">{formatKg(editingBatch.current_qty_kg)}</strong>
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nomor Batch / Lot Vendor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editBatchForm.batch_number}
                  onChange={(e) => setEditBatchForm({ ...editBatchForm, batch_number: e.target.value })}
                  placeholder="Contoh: LOT-2026-881"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 font-mono text-xs font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Pastikan sesuai dengan kode lot faktur fisik/CoA</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Produksi</label>
                  <input
                    type="date"
                    value={editBatchForm.production_date}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, production_date: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 font-mono text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tanggal Expired (ED) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editBatchForm.expiry_date}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, expiry_date: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan / Alasan Perubahan (Opsional)</label>
                <textarea
                  rows={2}
                  value={editBatchForm.notes}
                  onChange={(e) => setEditBatchForm({ ...editBatchForm, notes: e.target.value })}
                  placeholder="Contoh: Koreksi typo penulisan no lot dari suplier"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditBatchOpen(false);
                    setEditingBatch(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isEditBatchSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isEditBatchSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
