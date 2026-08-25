'use client';

import React, { useState, useRef } from 'react';
import {
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
  RotateCcw,
  Sparkles,
  Loader2,
  HardDrive,
  ShieldAlert,
  Server,
  FileCheck,
  RefreshCw,
  Clock,
  Check,
  Play,
  Activity,
  Calculator,
  Bell,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';

interface BackupRestorePanelProps {
  onSuccess?: () => void;
}

const DIAG_CATEGORY_MAP: Record<string, { label: string; icon: any; color: string }> = {
  INFRASTRUCTURE: { label: 'Infrastruktur & DB', icon: Database, color: 'text-slate-700 bg-slate-100 border-slate-200' },
  MASTER: { label: 'Master & Rumus Harga', icon: Calculator, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  FEFO: { label: 'Stok & FEFO Engine', icon: Layers, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  ORDERS: { label: 'Sales Order & Plafon', icon: ShoppingCart, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  FINANCE: { label: 'Finance & Invoicing', icon: CreditCard, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  COURIER: { label: 'Kurir & Bukti POD', icon: Truck, color: 'text-sky-700 bg-sky-50 border-sky-200' },
  NOTIFICATIONS: { label: 'Push Notification', icon: Bell, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
};

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

export default function BackupRestorePanel({ onSuccess }: BackupRestorePanelProps) {
  const [subTab, setSubTab] = useState<'BACKUP' | 'RESTORE' | 'DIAGNOSTICS'>('BACKUP');
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Restore state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<any | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [selectedTablesToRestore, setSelectedTablesToRestore] = useState<string[]>([]);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [restoreResult, setRestoreResult] = useState<any | null>(null);

  // Diagnostics state
  const [isDiagRunning, setIsDiagRunning] = useState(false);
  const [diagSummary, setDiagSummary] = useState<any | null>(null);
  const [diagResults, setDiagResults] = useState<any[]>([]);
  const [diagCategory, setDiagCategory] = useState<string>('ALL');
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});
  const [diagHasRun, setDiagHasRun] = useState(false);

  const handleRunDiagnostics = async () => {
    setIsDiagRunning(true);
    try {
      const res = await fetch('/api/diagnostics/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.summary) setDiagSummary(data.summary);
      if (data.results) {
        setDiagResults(data.results);
        const exp: Record<string, boolean> = {};
        data.results.forEach((r: any) => { exp[r.id] = true; });
        setExpandedTests(exp);
      }
      setDiagHasRun(true);
    } catch (err: any) {
      alert(`Gagal menjalankan pengujian diagnostik: ${err.message}`);
    } finally {
      setIsDiagRunning(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Cadangkan &amp; Pulihkan Database (Backup &amp; Restore)</h2>
            <p className="text-xs text-indigo-200 mt-0.5 max-w-2xl">
              Simpan seluruh database sistem (Produk, Pelanggan, Suplier, Stok FEFO, Purchase Order, Sales Order, Invoice, Akun Pengguna) ke dalam format file JSON terenkripsi dan pulihkan kapan saja dengan aman.
            </p>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setSubTab('BACKUP')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'BACKUP'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Download className="w-4 h-4" /> Cadangkan Data (Backup JSON)
        </button>
        <button
          type="button"
          onClick={() => setSubTab('RESTORE')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'RESTORE'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" /> Pulihkan Data (Restore JSON)
        </button>
        <button
          type="button"
          onClick={() => {
            setSubTab('DIAGNOSTICS');
            if (!diagHasRun) {
              handleRunDiagnostics();
            }
          }}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'DIAGNOSTICS'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" /> Diagnostik &amp; Uji Sistem
        </button>
      </div>

      {/* BACKUP TAB CONTENT */}
      {subTab === 'BACKUP' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Semua Modul Terarsip</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  15 Tabel Master Data, Transaksi SO/PO, Jurnal Kas, &amp; Batch Stok FEFO.
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Aman &amp; Siap Diunduh</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Format JSON standar terbuka yang dapat dibuka dan dipulihkan kembali ke server kapan saja.
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Proteksi Super Admin</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Akun Super Admin terlindungi dan dijamin tidak akan terhapus saat pemulihan data.
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Disarankan melakukan pencadangan data berkala sebelum melakukan perubahan besar atau sebelum akhir bulan.
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan File Backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Unduh File Backup (.json)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* RESTORE TAB CONTENT */}
      {subTab === 'RESTORE' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          {/* File Upload Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Pilih File Backup JSON (.json)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">
                {uploadedFile ? uploadedFile.name : 'Klik untuk Memilih File Backup (.json)'}
              </div>
              <div className="text-xs text-slate-500">
                {uploadedFile
                  ? `Ukuran file: ${(uploadedFile.size / 1024).toFixed(1)} KB — Klik untuk mengganti file`
                  : 'Hanya mendukung file .json yang diekspor dari aplikasi Artaroma Hub'}
              </div>
            </div>
          </div>

          {/* If file is parsed successfully */}
          {parsedBackup && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Metadata Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Aplikasi: </span>
                  <strong className="text-slate-800">{parsedBackup.app || 'Artaroma Fragrance Hub'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Waktu Backup: </span>
                  <strong className="text-slate-800">
                    {parsedBackup.exported_at ? new Date(parsedBackup.exported_at).toLocaleString('id-ID') : '-'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Total Baris Data: </span>
                  <strong className="text-indigo-700 font-bold">{parsedBackup.total_records || 0} Rekaman</strong>
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Metode Pemulihan Data:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    onClick={() => setRestoreMode('merge')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      restoreMode === 'merge'
                        ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <RefreshCw className="w-4 h-4 text-indigo-600" /> Mode Gabungkan / Perbarui (Merge)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Data yang ada di file backup akan dimasukkan atau memperbarui data yang cocok (UPSERT) tanpa menghapus data lain di database.
                    </p>
                  </div>

                  <div
                    onClick={() => setRestoreMode('replace')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      restoreMode === 'replace'
                        ? 'border-rose-600 bg-rose-50/40 text-rose-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-rose-700">
                      <ShieldAlert className="w-4 h-4 text-rose-600" /> Mode Timpa Bersih (Clean Replace)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Mengosongkan tabel terpilih di database lalu mengisi ulang persis seperti saat file backup dibuat.
                    </p>
                  </div>
                </div>
              </div>

              {/* Table Selection Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Pilih Tabel Data yang Ingin Dipulihkan ({selectedTablesToRestore.length} Tabel Terpilih):
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllRestoreTables}
                      className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllRestoreTables}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Hapus Pilihan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {Object.keys(parsedBackup.data || {}).map((tableName) => {
                    const count = Array.isArray(parsedBackup.data[tableName]) ? parsedBackup.data[tableName].length : 0;
                    if (count === 0) return null;
                    const meta = TABLE_META[tableName] || { label: tableName, icon: Database, category: 'MASTER' };
                    const Icon = meta.icon;
                    const isChecked = selectedTablesToRestore.includes(tableName);

                    return (
                      <div
                        key={tableName}
                        onClick={() => handleToggleTableToRestore(tableName)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs truncate">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isChecked ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <span className="truncate">{meta.label}</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-bold shrink-0">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Confirmation for Replace Mode */}
              {restoreMode === 'replace' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    Konfirmasi Keamanan Mode Timpa Bersih
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Ketik kata <strong className="font-mono bg-rose-200 px-1 py-0.5 rounded text-rose-900">PULIHKAN</strong> pada kotak di bawah ini untuk mengonfirmasi bahwa Anda memahami bahwa data yang ada di tabel terpilih akan dikosongkan sebelum data backup diimpor.
                  </p>
                  <input
                    type="text"
                    placeholder="Ketik 'PULIHKAN' di sini..."
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs text-rose-900 font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoring || (restoreMode === 'replace' && confirmationCode.trim().toUpperCase() !== 'PULIHKAN')}
                  className={`font-bold text-xs px-6 py-3 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                    restoreMode === 'replace'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
                  }`}
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Memulihkan Data ke Database...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Mulai Proses Pemulihan Data
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DIAGNOSTICS TAB CONTENT */}
      {subTab === 'DIAGNOSTICS' && (
        <div className="space-y-6">
          {/* Header & Run Action */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold border border-blue-400/30 mb-2">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Automated System Health &amp; Workflow Monitor</span>
              </div>
              <h3 className="text-base font-bold">Pengujian Otomatis Integritas Sistem &amp; Alur Kerja</h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                Verifikasi otomatis integritas tabel database, rumus markup USD varian, urutan FEFO stok gudang, penegakan plafon kredit SO, verifikasi kas masuk, dan push notifikasi.
              </p>
            </div>

            <button
              type="button"
              disabled={isDiagRunning}
              onClick={handleRunDiagnostics}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isDiagRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menguji Sistem...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Jalankan Diagnostik Sistem
                </>
              )}
            </button>
          </div>

          {/* Diagnostic Summary Cards */}
          {diagSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Pass Rate</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{diagSummary.pass_rate}%</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Tingkat kelulusan uji</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Total Pengujian</div>
                <div className="text-2xl font-black text-slate-800 mt-1">{diagSummary.total} Test</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Skenario end-to-end</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Status Lulus</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{diagSummary.passed} Passed</div>
                <div className="text-[10px] text-emerald-600 mt-0.5 font-semibold">Semua sistem normal</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Durasi Eksekusi</div>
                <div className="text-2xl font-black text-blue-600 mt-1">{diagSummary.duration_ms} ms</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Respons server instan</div>
              </div>
            </div>
          )}

          {/* Category Filters */}
          {diagResults.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setDiagCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                  diagCategory === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Semua Kategori ({diagResults.length})
              </button>
              {Object.entries(DIAG_CATEGORY_MAP).map(([key, meta]) => {
                const count = diagResults.filter((r) => r.category === key).length;
                if (count === 0) return null;
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDiagCategory(key)}
                    className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      diagCategory === key
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{meta.label}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Test Results List */}
          <div className="space-y-3">
            {diagResults
              .filter((r) => diagCategory === 'ALL' || r.category === diagCategory)
              .map((test) => {
                const isPassed = test.status === 'PASSED';
                const isExpanded = expandedTests[test.id] !== false;
                const catMeta = DIAG_CATEGORY_MAP[test.category] || { label: test.category, color: 'bg-slate-100' };

                return (
                  <div
                    key={test.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all"
                  >
                    <div
                      onClick={() => setExpandedTests((prev) => ({ ...prev, [test.id]: !isExpanded }))}
                      className="px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isPassed ? (
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                            <span>{test.name}</span>
                            <span className="text-[10px] font-semibold text-slate-400 font-mono">
                              ({test.duration_ms} ms)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{test.message}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catMeta.color}`}>
                          {catMeta.label}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && test.details && test.details.length > 0 && (
                      <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 space-y-1.5 text-xs font-mono">
                        {test.details.map((detail: string, dIdx: number) => (
                          <div key={dIdx} className="text-slate-600 flex items-start gap-2 text-[11px]">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
