'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Users,
  Building2,
  Truck,
  ShoppingCart,
  CreditCard,
  Lock,
  RotateCcw,
  Sparkles,
  Loader2,
  HardDrive,
  ShieldAlert,
  Server,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TABLE_META: Record<string, { label: string; icon: any; category: 'MASTER' | 'OPERATIONAL' }> = {
  products: { label: 'Master Produk & Varian', icon: Layers, category: 'MASTER' },
  product_variants: { label: 'Varian Kemasan Produk (25kg, 5kg, 1kg)', icon: Layers, category: 'MASTER' },
  customers: { label: 'Pelanggan & Plafon Kredit B2B', icon: Users, category: 'MASTER' },
  distributors: { label: 'Suplier & Distributor Bibit', icon: Building2, category: 'MASTER' },
  couriers: { label: 'Daftar Kurir & Armada', icon: Truck, category: 'MASTER' },
  users: { label: 'Akun Pengguna & Hak Akses', icon: Users, category: 'MASTER' },
  company_settings: { label: 'Pengaturan Perusahaan', icon: Building2, category: 'MASTER' },
  sales_orders: { label: 'Sales Orders (SO)', icon: ShoppingCart, category: 'OPERATIONAL' },
  so_items: { label: 'Detail Item Sales Order', icon: ShoppingCart, category: 'OPERATIONAL' },
  purchase_orders: { label: 'Purchase Orders (PO)', icon: FileSpreadsheet, category: 'OPERATIONAL' },
  po_items: { label: 'Detail Item PO', icon: FileSpreadsheet, category: 'OPERATIONAL' },
  stock_batches: { label: 'Stok Batch Gudang & FEFO', icon: Layers, category: 'OPERATIONAL' },
  invoices: { label: 'Invoice Penjualan & Piutang', icon: CreditCard, category: 'OPERATIONAL' },
  transactions_history: { label: 'Log Book & Riwayat Transaksi', icon: RotateCcw, category: 'OPERATIONAL' },
  push_subscriptions: { label: 'Perangkat Notifikasi HP', icon: HardDrive, category: 'OPERATIONAL' },
};

export default function BackupRestoreModal({ isOpen, onClose, onSuccess }: BackupRestoreModalProps) {
  const [activeTab, setActiveTab] = useState<'BACKUP' | 'RESTORE'>('BACKUP');
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Restore state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<any | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [selectedTablesToRestore, setSelectedTablesToRestore] = useState<string[]>([]);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [restoreResult, setRestoreResult] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle download backup JSON
  const handleDownloadBackup = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) {
        throw new Error('Gagal mengunduh data backup dari server');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `artaroma-database-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert(`Error membuat backup: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle upload & parse JSON backup file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Hanya file backup berformat .json yang didukung.');
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || !parsed.data || typeof parsed.data !== 'object') {
          throw new Error('Struktur file JSON tidak valid. Format arsip Artaroma tidak terdeteksi.');
        }

        setParsedBackup(parsed);
        // Select all tables by default
        const availableTables = Object.keys(parsed.data).filter(
          (t) => Array.isArray(parsed.data[t]) && parsed.data[t].length > 0
        );
        setSelectedTablesToRestore(availableTables);
        setRestoreResult(null);
      } catch (err: any) {
        alert(`File backup rusak atau tidak valid: ${err.message}`);
        setUploadedFile(null);
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  const handleToggleTableToRestore = (table: string) => {
    setSelectedTablesToRestore((prev) =>
      prev.includes(table) ? prev.filter((t) => t !== table) : [...prev, table]
    );
  };

  const handleSelectAllRestoreTables = () => {
    if (!parsedBackup?.data) return;
    setSelectedTablesToRestore(
      Object.keys(parsedBackup.data).filter((t) => Array.isArray(parsedBackup.data[t]) && parsedBackup.data[t].length > 0)
    );
  };

  const handleClearAllRestoreTables = () => {
    setSelectedTablesToRestore([]);
  };

  // Submit Restore
  const handleExecuteRestore = async () => {
    if (!parsedBackup) return;

    if (selectedTablesToRestore.length === 0) {
      alert('Pilih minimal 1 tabel data yang ingin dipulihkan.');
      return;
    }

    if (restoreMode === 'replace') {
      if (confirmationCode.trim().toUpperCase() !== 'PULIHKAN') {
        alert("Ketik 'PULIHKAN' pada kolom konfirmasi untuk melanjutkan mode Timpa Bersih.");
        return;
      }
      if (!confirm('⚠️ PERINGATAN: Mode Timpa Bersih akan mengosongkan tabel terpilih sebelum mengimpor data. Apakah Anda yakin ingin melanjutkan?')) {
        return;
      }
    }

    setIsRestoring(true);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupData: parsedBackup,
          mode: restoreMode,
          selectedTables: selectedTablesToRestore,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setRestoreResult(json);
        alert(`🎉 Pemulihan Data Berhasil! Total ${json.totalRestored} rekaman berhasil dipulihkan ke database.`);
        if (onSuccess) onSuccess();
      } else {
        alert(`Gagal memulihkan backup: ${json.message}`);
      }
    } catch (err: any) {
      alert(`Error saat memulihkan backup: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-xs">
              <Database className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Pusat Backup &amp; Pemulihan Data
              </h2>
              <p className="text-xs text-blue-200">
                Ekspor salinan aman seluruh database &amp; impor data cadangan ke MySQL
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-3 flex items-center gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('BACKUP')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'BACKUP'
                ? 'bg-white text-blue-900 border-slate-200 shadow-xs font-black'
                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>1. Buat &amp; Unduh Backup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RESTORE')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'RESTORE'
                ? 'bg-white text-blue-900 border-slate-200 shadow-xs font-black'
                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>2. Pulihkan / Import Data Backup</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: BACKUP & EXPORT */}
          {activeTab === 'BACKUP' && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Download className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-blue-950">
                    Cadangkan Seluruh Basis Data Sistem
                  </div>
                  <p className="text-blue-800/80 leading-relaxed">
                    Sistem akan menyusun seluruh rekaman tabel (Master Produk, Pelanggan, Suplier, Kurir, Akun Pengguna, Sales Order, Batch Stok FEFO &amp; Finance) ke dalam 1 file arsip JSON terenkripsi terstruktur.
                  </p>
                </div>
              </div>

              {/* Data Category Summary Overview */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Cakupan Data yang Termasuk dalam Backup:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800">Master Produk &amp; Varian</div>
                      <div className="text-[10px] text-slate-500">Harga USD, IDR &amp; Repack 5kg/1kg</div>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800">Pelanggan &amp; Plafon Kredit</div>
                      <div className="text-[10px] text-slate-500">Alamat, TOP, Kontak PIC &amp; Limit</div>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800">Suplier Distributor PO</div>
                      <div className="text-[10px] text-slate-500">Data vendor &amp; rekening bank</div>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <Truck className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800">Kurir &amp; Armada Logistik</div>
                      <div className="text-[10px] text-slate-500">Data driver &amp; plat kendaraan</div>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800">Pengguna &amp; Hak Akses</div>
                      <div className="text-[10px] text-slate-500">Kredensial &amp; preferensi notifikasi</div>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <ShoppingCart className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800">Sales Orders &amp; Stok FEFO</div>
                      <div className="text-[10px] text-slate-500">Batch kedaluwarsa &amp; riwayat order</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleDownloadBackup}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sedang Mengemas Data...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Unduh Arsip Backup (.JSON) Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE & IMPORT */}
          {activeTab === 'RESTORE' && (
            <div className="space-y-5">
              {/* File Upload Zone */}
              {!parsedBackup ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-800">
                      Klik atau Tarik File Backup (.JSON) ke Sini
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Pilih file arsip JSON yang sebelumnya diunduh dari menu Backup Artaroma
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Uploaded File Overview Card */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="text-xs">
                        <div className="font-extrabold text-emerald-950">
                          {uploadedFile?.name}
                        </div>
                        <div className="text-emerald-700 font-medium">
                          Waktu Backup: {parsedBackup.exported_at ? new Date(parsedBackup.exported_at).toLocaleString('id-ID') : 'N/A'} • Total: {parsedBackup.total_records || 0} Rekaman
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null);
                        setParsedBackup(null);
                        setRestoreResult(null);
                      }}
                      className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Ganti File
                    </button>
                  </div>

                  {/* Mode Selection */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Pilih Metode Pemulihan Data:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        restoreMode === 'merge'
                          ? 'bg-blue-50/70 border-blue-500 shadow-xs'
                          : 'bg-white border-slate-200'
                      }`}>
                        <input
                          type="radio"
                          name="restoreMode"
                          value="merge"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="text-xs">
                          <div className="font-bold text-slate-800">🟢 Gabungkan / Perbarui (Rekomendasi)</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            Memperbarui data yang cocok dan menambah data baru tanpa menghapus data lain.
                          </div>
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        restoreMode === 'replace'
                          ? 'bg-amber-50/70 border-amber-500 shadow-xs'
                          : 'bg-white border-slate-200'
                      }`}>
                        <input
                          type="radio"
                          name="restoreMode"
                          value="replace"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="text-xs">
                          <div className="font-bold text-slate-800">⚠️ Timpa Bersih (Full Replace)</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            Mengosongkan tabel terpilih dan menggantikan 100% dengan data dari file backup.
                          </div>
                        </div>
                      </label>
                    </div>

                    {restoreMode === 'replace' && (
                      <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl space-y-2 animate-in fade-in">
                        <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Konfirmasi Keamanan Timpa Bersih</span>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          Ketik kata <strong className="font-mono bg-amber-200 px-1 py-0.5 rounded text-slate-900">PULIHKAN</strong> di bawah untuk mengonfirmasi:
                        </p>
                        <input
                          type="text"
                          placeholder="Ketik PULIHKAN"
                          value={confirmationCode}
                          onChange={(e) => setConfirmationCode(e.target.value)}
                          className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-bold font-mono text-slate-800 uppercase"
                        />
                      </div>
                    )}
                  </div>

                  {/* Table Selection Checklist */}
                  <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Pilih Tabel Data yang Ingin Dipulihkan:
                      </span>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <button
                          type="button"
                          onClick={handleSelectAllRestoreTables}
                          className="text-blue-700 hover:underline cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={handleClearAllRestoreTables}
                          className="text-slate-500 hover:underline cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {Object.keys(parsedBackup.data || {}).map((table) => {
                        const rowCount = Array.isArray(parsedBackup.data[table]) ? parsedBackup.data[table].length : 0;
                        if (rowCount === 0) return null;
                        const meta = TABLE_META[table] || { label: table, icon: Database };
                        const TableIcon = meta.icon;
                        const isChecked = selectedTablesToRestore.includes(table);

                        return (
                          <label
                            key={table}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-blue-50/50 border-blue-300 text-blue-950 font-bold'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleTableToRestore(table)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <TableIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate max-w-[160px]">{meta.label}</span>
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">
                              {rowCount} baris
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={handleExecuteRestore}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sedang Memulihkan Database...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Mulai Pemulihan Data ({selectedTablesToRestore.length} Tabel)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
