'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { SalesOrderPDFModal } from '@/components/common/sales-order-pdf-modal';
import { InvoicePDFModal } from '@/components/common/invoice-pdf-modal';
import { SuratJalanPDFModal } from '@/components/common/surat-jalan-pdf-modal';
import { POPDFModal } from '@/components/common/po-pdf-modal';
import { formatIDR, formatKg } from '@/lib/utils';
import {
  BookOpen,
  FileText,
  ShoppingCart,
  Truck,
  Receipt,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Camera,
  Plus,
  X,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Download,
  Image as ImageIcon,
  User,
  ShieldCheck,
  Tag,
  Upload,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

export default function LogBookPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total_logs: 0,
    sales_logs: 0,
    pod_logs: 0,
    finance_logs: 0,
    procurement_logs: 0,
    warehouse_logs: 0,
    manual_logs: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for Documents
  const [selectedSOForPDF, setSelectedSOForPDF] = useState<any>(null);
  const [selectedInvoiceForPDF, setSelectedInvoiceForPDF] = useState<any>(null);
  const [selectedSJForPDF, setSelectedSJForPDF] = useState<any>(null);
  const [selectedPOForPDF, setSelectedPOForPDF] = useState<any>(null);

  // Modal for Image/Photo Preview
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    description?: string;
  } | null>(null);

  // Modal for Creating Manual Log Entry
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLogTitle, setNewLogTitle] = useState('');
  const [newLogCategory, setNewLogCategory] = useState('CATATAN_MANUAL');
  const [newLogActorName, setNewLogActorName] = useState('Admin Operasional');
  const [newLogActorRole, setNewLogActorRole] = useState('ADMIN');
  const [newLogRefId, setNewLogRefId] = useState('');
  const [newLogDescription, setNewLogDescription] = useState('');
  const [newLogPhotoUrl, setNewLogPhotoUrl] = useState('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Fetch Log Book Data
  const fetchLogBook = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        category: activeCategory,
        q: searchQuery,
      });
      const res = await fetch(`/api/transactions/history?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLogs(json.data);
        if (json.stats) setStats(json.stats);
      }
    } catch (err) {
      console.warn('Failed to load log book events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogBook();
  }, [activeCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogBook();
  };

  // Submit Manual Log Entry
  const handleSaveManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogTitle.trim() || !newLogDescription.trim()) {
      alert('Judul aktivitas dan rincian catatan wajib diisi!');
      return;
    }

    setIsSubmittingLog(true);
    try {
      const res = await fetch('/api/transactions/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLogTitle.trim(),
          category: newLogCategory,
          actor_name: newLogActorName.trim(),
          actor_role: newLogActorRole,
          reference_id: newLogRefId.trim() || null,
          description: newLogDescription.trim(),
          photo_url: newLogPhotoUrl.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert('Entri Log Book berhasil dicatat ke sistem!');
        setIsCreateModalOpen(false);
        setNewLogTitle('');
        setNewLogDescription('');
        setNewLogRefId('');
        setNewLogPhotoUrl('');
        await fetchLogBook();
      } else {
        alert(`Gagal menyimpan entri log: ${json.message}`);
      }
    } catch (err: any) {
      alert(`Error menyimpan log: ${err.message}`);
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Helper to open PDF modal
  const handleOpenDoc = (type: 'SO' | 'SJ' | 'INV' | 'PO', log: any) => {
    if (type === 'SO') {
      setSelectedSOForPDF({
        id: log.so_id || log.id,
        so_number: log.ref_code,
        customer_name: log.party_pic || log.actor_name,
        customer_company: log.party_name || 'Customer B2B',
        order_date: log.timestamp,
        status: 'PROSES_GUDANG',
        grand_total: log.grand_total || 0,
        items: log.items || [],
      });
    } else if (type === 'INV') {
      const orderObj = {
        id: log.so_id || log.id,
        so_number: log.ref_code,
        customer_name: log.party_pic || log.actor_name,
        customer_company: log.party_name || 'Customer B2B',
        order_date: log.timestamp,
        status: 'PROSES_GUDANG',
        grand_total: log.grand_total || 0,
        items: log.items || [],
      };
      const invObj = {
        id: `inv-${log.so_id || log.id}`,
        invoice_number: log.invoice_number || `INV-${log.ref_code}`,
        so_id: log.so_id || log.id,
        so_number: log.ref_code,
        customer_id: 'cust-001',
        customer_name: log.party_name || 'Customer B2B',
        total_amount: log.grand_total || 0,
        paid_amount: log.grand_total || 0,
        status: 'PAID' as const,
        issue_date: log.timestamp,
        due_date: log.timestamp,
      };
      setSelectedInvoiceForPDF({ order: orderObj, invoice: invObj });
    } else if (type === 'SJ') {
      setSelectedSJForPDF({
        id: log.so_id || log.id,
        so_number: log.ref_code,
        surat_jalan_number: log.surat_jalan_number || log.document_number,
        customer_name: log.party_pic || log.actor_name,
        customer_company: log.party_name || 'Customer B2B',
        customer_address: 'Alamat Tujuan Customer B2B',
        courier_name: log.actor_name || 'Kurir Pengiriman',
        delivered_date: log.timestamp,
        items: log.items || [],
      });
    } else if (type === 'PO') {
      setSelectedPOForPDF({
        id: log.po_id || log.id,
        po_number: log.ref_code,
        supplier_name: log.party_name || 'Suplier Distributor',
        order_date: log.timestamp,
        status: 'DITERIMA',
        total_amount: log.grand_total || 0,
        items: log.items || [],
      });
    }
  };

  // Category styling helper
  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'SALES':
        return {
          label: 'Penjualan B2B',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <ShoppingCart className="w-3 h-3" />,
        };
      case 'LOGISTICS':
        return {
          label: 'Kirim Kurir / SJ',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: <Truck className="w-3 h-3" />,
        };
      case 'POD':
        return {
          label: 'Serah Terima POD',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 className="w-3 h-3" />,
        };
      case 'FINANCE':
        return {
          label: 'Keuangan & Bayar',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Receipt className="w-3 h-3" />,
        };
      case 'PROCUREMENT':
        return {
          label: 'Pengadaan PO',
          badge: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <Building2 className="w-3 h-3" />,
        };
      case 'WAREHOUSE':
        return {
          label: 'Gudang & Opname',
          badge: 'bg-teal-50 text-teal-700 border-teal-200',
          icon: <Layers className="w-3 h-3" />,
        };
      case 'CANCELLED':
        return {
          label: 'Pembatalan',
          badge: 'bg-red-50 text-red-700 border-red-200',
          icon: <AlertTriangle className="w-3 h-3" />,
        };
      default:
        return {
          label: 'Catatan Manual',
          badge: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <MessageSquare className="w-3 h-3" />,
        };
    }
  };

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20">
      <AdminTopNav />

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
        {/* Top Header Banner Log Book */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[10px] font-mono px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                BUKU LOG AKTIVITAS OPERASIONAL
              </span>
            </div>
            <h1 className="text-2xl font-bold mt-1.5 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-300" />
              Log Book Operasional, Riwayat Dokumen &amp; Bukti Foto
            </h1>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl">
              Buku log digital yang mencatat secara kronologis seluruh peristiwa operasional: penerbitan SO, serah terima kurir (POD), pembayaran invoice, penerimaan PO, audit stok, serta catatan lapangan tim.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Catat Entri Log Baru
            </button>
            <button
              onClick={fetchLogBook}
              disabled={isLoading}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold px-3.5 py-2.5 rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* 4 Summary Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Entri Log</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{stats.total_logs} Aktivitas</div>
              <div className="text-[10px] text-blue-600 font-semibold mt-0.5">Semua Peristiwa Terdata</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Log Penjualan &amp; SO</div>
              <div className="text-2xl font-black text-blue-700 mt-1">{stats.sales_logs} Pesanan</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Order &amp; Surat Jalan</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bukti POD &amp; Foto Serah Terima</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{stats.pod_logs} Bukti</div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Foto &amp; TTD Customer</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catatan Lapangan / Manual</div>
              <div className="text-2xl font-black text-purple-700 mt-1">{stats.manual_logs} Catatan</div>
              <div className="text-[10px] text-purple-600 font-semibold mt-0.5">Diinput Tim Operasional</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter and Category Tabs */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { key: 'ALL', label: `Semua Log (${stats.total_logs})` },
                { key: 'SALES', label: `Penjualan (${stats.sales_logs})` },
                { key: 'LOGISTICS', label: 'Pengiriman Kurir' },
                { key: 'POD', label: `Serah Terima POD (${stats.pod_logs})` },
                { key: 'FINANCE', label: `Keuangan (${stats.finance_logs})` },
                { key: 'PROCUREMENT', label: `Pengadaan PO (${stats.procurement_logs})` },
                { key: 'WAREHOUSE', label: `Stok & Opname (${stats.warehouse_logs})` },
                { key: 'CATATAN_MANUAL', label: `Catatan Manual (${stats.manual_logs})` },
              ].map((c) => (
                <button
                  key={c.key}
                  onClick={() => setActiveCategory(c.key)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold border transition-colors shrink-0 cursor-pointer text-xs ${
                    activeCategory === c.key
                      ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-gray-200 hover:bg-slate-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari aktivitas, no referensi, aktor..."
                className="w-full pl-9 pr-18 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Cari
              </button>
            </form>
          </div>
        </div>

        {/* LOG BOOK TABLE VIEW */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Daftar Catatan &amp; Riwayat Log Book ({logs.length} Entri Ditampilkan)
            </h2>
            <span className="text-[11px] text-slate-400">Diurutkan berdasarkan waktu terbaru</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-gray-200 text-slate-500 uppercase tracking-wide font-bold text-[10px]">
                  <th className="px-5 py-3 w-40">WAKTU &amp; TANGGAL</th>
                  <th className="px-4 py-3 w-44">KATEGORI</th>
                  <th className="px-4 py-3 w-36">AKTOR / PELAKU</th>
                  <th className="px-5 py-3">AKTIVITAS &amp; RINCIAN CATATAN</th>
                  <th className="px-4 py-3 w-32">NO. REFERENSI</th>
                  <th className="px-4 py-3 text-center w-36">DOKUMEN TERKAIT</th>
                  <th className="px-4 py-3 text-center w-28">LAMPIRAN FOTO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400 text-xs italic">
                      {isLoading ? 'Memuat data Log Book...' : 'Belum ada catatan log book yang cocok dengan filter.'}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const catInfo = getCategoryBadge(log.category);
                    const formattedDate = new Date(log.timestamp).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    });

                    return (
                      <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                        {/* 1. Timestamp */}
                        <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          <div className="font-bold text-slate-800">{formattedDate.split(',')[0]}</div>
                          <div className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {formattedDate.split(',')[1] || ''}
                          </div>
                        </td>

                        {/* 2. Category */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] px-2.5 py-1 rounded-full font-bold border inline-flex items-center gap-1 ${catInfo.badge}`}
                          >
                            {catInfo.icon}
                            {catInfo.label}
                          </span>
                        </td>

                        {/* 3. Actor */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800 text-xs truncate max-w-[130px]" title={log.actor_name}>
                            {log.actor_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Role: {log.actor_role || 'STAFF'}
                          </div>
                        </td>

                        {/* 4. Description */}
                        <td className="px-5 py-3.5 max-w-md">
                          <div className="font-bold text-slate-900 text-xs">
                            {log.title}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            {log.description}
                          </div>
                        </td>

                        {/* 5. Reference Code */}
                        <td className="px-4 py-3.5">
                          {log.ref_code && log.ref_code !== '-' ? (
                            <span className="bg-slate-100 text-slate-800 font-mono font-bold text-[11px] px-2 py-1 rounded-md border border-slate-200 inline-block">
                              {log.ref_code}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[11px]">-</span>
                          )}
                        </td>

                        {/* 6. Document Links */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center gap-1 justify-center flex-wrap">
                            {log.document_type === 'SO' && (
                              <button
                                type="button"
                                onClick={() => handleOpenDoc('SO', log)}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-1 rounded-md transition-colors cursor-pointer"
                                title="Buka Sales Order PDF"
                              >
                                📄 SO PDF
                              </button>
                            )}

                            {log.document_type === 'SJ' && (
                              <button
                                type="button"
                                onClick={() => handleOpenDoc('SJ', log)}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-1 rounded-md transition-colors cursor-pointer"
                                title="Buka Surat Jalan PDF"
                              >
                                🚚 Surat Jalan
                              </button>
                            )}

                            {log.document_type === 'INV' && (
                              <button
                                type="button"
                                onClick={() => handleOpenDoc('INV', log)}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-1 rounded-md transition-colors cursor-pointer"
                                title="Buka Invoice PDF"
                              >
                                🧾 Invoice
                              </button>
                            )}

                            {log.document_type === 'PO' && (
                              <button
                                type="button"
                                onClick={() => handleOpenDoc('PO', log)}
                                className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-bold px-2 py-1 rounded-md transition-colors cursor-pointer"
                                title="Buka Purchase Order PDF"
                              >
                                📄 PO PDF
                              </button>
                            )}

                            {!log.document_type && (
                              <span className="text-slate-300 text-[10px] italic">-</span>
                            )}
                          </div>
                        </td>

                        {/* 7. Photos / Attachments */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            {log.photo_url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    url: log.photo_url,
                                    title: `Foto Lampiran Log: ${log.title}`,
                                    description: `Waktu: ${formattedDate} | Aktor: ${log.actor_name}`,
                                  })
                                }
                                className="relative group border border-emerald-300 rounded-lg overflow-hidden w-8 h-8 bg-slate-100 cursor-pointer shadow-2xs hover:scale-105 transition-transform"
                                title="Lihat Foto Lampiran"
                              >
                                <img src={log.photo_url} alt="Foto" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Eye className="w-3 h-3" />
                                </div>
                              </button>
                            ) : null}

                            {log.signature_url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    url: log.signature_url,
                                    title: `Tanda Tangan Digital (${log.ref_code})`,
                                    description: `Penandatangan: ${log.actor_name}`,
                                  })
                                }
                                className="border border-blue-300 rounded-lg p-0.5 bg-white cursor-pointer shadow-2xs hover:scale-105 transition-transform w-8 h-8 flex items-center justify-center"
                                title="Lihat TTD Digital"
                              >
                                <img src={log.signature_url} alt="TTD" className="max-h-full max-w-full object-contain" />
                              </button>
                            ) : null}

                            {!log.photo_url && !log.signature_url && (
                              <span className="text-slate-300 text-[10px] italic">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL 1: TAMBAH ENTRI LOG BOOK MANUAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="bg-blue-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-200" />
                <h3 className="font-bold text-sm">Catat Entri Log Book Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-blue-200 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveManualLog} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Aktivitas / Kejadian *</label>
                <input
                  type="text"
                  value={newLogTitle}
                  onChange={(e) => setNewLogTitle(e.target.value)}
                  placeholder="Misal: Pemeriksaan QC Drum Tambahan, Konfirmasi Pengiriman Customer..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Log *</label>
                  <select
                    value={newLogCategory}
                    onChange={(e) => setNewLogCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="CATATAN_MANUAL">Catatan Manual / Lapangan</option>
                    <option value="SALES">Penjualan B2B (SO)</option>
                    <option value="LOGISTICS">Pengiriman / Armada</option>
                    <option value="POD">Serah Terima POD</option>
                    <option value="FINANCE">Keuangan & Pembayaran</option>
                    <option value="WAREHOUSE">Gudang & QC</option>
                    <option value="PROCUREMENT">Pengadaan Suplier</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Referensi / SO / PO</label>
                  <input
                    type="text"
                    value={newLogRefId}
                    onChange={(e) => setNewLogRefId(e.target.value)}
                    placeholder="Misal: SO-2026-342"
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Petugas / Pelapor *</label>
                  <input
                    type="text"
                    value={newLogActorName}
                    onChange={(e) => setNewLogActorName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peran / Role</label>
                  <select
                    value={newLogActorRole}
                    onChange={(e) => setNewLogActorRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="WAREHOUSE">GUDANG / QC</option>
                    <option value="LOGISTICS">KURIR / LOGISTIK</option>
                    <option value="SALES">SALES</option>
                    <option value="FINANCE">KEUANGAN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rincian Deskripsi / Catatan Kejadian *</label>
                <textarea
                  rows={3}
                  value={newLogDescription}
                  onChange={(e) => setNewLogDescription(e.target.value)}
                  placeholder="Tuliskan catatan kejadian lapangan, nomor batch yang diperiksa, kondisi fisik, atau detail lainnya..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lampiran URL Foto / Bukti Fisik</label>
                <input
                  type="text"
                  value={newLogPhotoUrl}
                  onChange={(e) => setNewLogPhotoUrl(e.target.value)}
                  placeholder="https://... atau data:image/..."
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Opsional: Masukkan URL foto serah terima, foto fisik drum, atau dokumen pendukung.
                </p>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold transition-colors shadow-xs cursor-pointer"
                >
                  {isSubmittingLog ? 'Menyimpan...' : 'Simpan ke Log Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PREVIEW FOTO / GAMBAR DOKUMEN RESOLUSI TINGGI */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm">{previewImage.title}</h3>
                  {previewImage.description && (
                    <p className="text-[11px] text-slate-300">{previewImage.description}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Body */}
            <div className="p-6 bg-slate-950/90 flex flex-col items-center justify-center min-h-[300px]">
              <div className="max-h-[60vh] max-w-full overflow-hidden rounded-xl bg-white p-2 shadow-inner">
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  className="max-h-[55vh] w-auto object-contain mx-auto rounded-lg"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center text-xs">
              <div className="text-slate-500 text-[11px]">
                Arsip Bukti Foto Log Book Artaroma
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="bg-white border border-gray-300 hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Gambar
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SALES ORDER PDF MODAL */}
      {selectedSOForPDF && (
        <SalesOrderPDFModal
          isOpen={true}
          onClose={() => setSelectedSOForPDF(null)}
          order={selectedSOForPDF}
        />
      )}

      {/* MODAL 4: SURAT JALAN PDF MODAL */}
      {selectedSJForPDF && (
        <SuratJalanPDFModal
          isOpen={true}
          onClose={() => setSelectedSJForPDF(null)}
          order={selectedSJForPDF}
        />
      )}

      {/* MODAL 5: INVOICE PDF MODAL */}
      {selectedInvoiceForPDF && (
        <InvoicePDFModal
          isOpen={true}
          onClose={() => setSelectedInvoiceForPDF(null)}
          order={selectedInvoiceForPDF.order}
          invoice={selectedInvoiceForPDF.invoice}
        />
      )}

      {/* MODAL 6: PURCHASE ORDER PDF MODAL */}
      {selectedPOForPDF && (
        <POPDFModal
          isOpen={true}
          onClose={() => setSelectedPOForPDF(null)}
          po={selectedPOForPDF}
        />
      )}
    </div>
  );
}
