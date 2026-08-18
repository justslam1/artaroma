'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { initialPurchaseOrders } from '@/lib/mock-data';
import { PurchaseOrder } from '@/lib/types';
import { formatIDR, formatKg, formatDate } from '@/lib/utils';
import {
  Building2,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  Upload,
  ArrowLeft,
  X,
  Send,
  DollarSign,
  ExternalLink,
  FileSpreadsheet,
} from 'lucide-react';
import { exportPayablesToXLSX } from '@/lib/export-excel';
import { canUserExportXLSX } from '@/lib/auth';

export default function FinancePayablesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.warn('Failed to load user in payables:', err));
  }, []);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPOForPayment, setSelectedPOForPayment] = useState<PurchaseOrder | null>(null);

  const [transferRef, setTransferRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/purchase-orders', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Normalize: ensure items is always an array to prevent TypeError crash
        const normalized = json.data.map((po: any) => ({
          ...po,
          items: Array.isArray(po.items) ? po.items : [],
        }));
        setPurchaseOrders(normalized);
      } else {
        setPurchaseOrders(initialPurchaseOrders);
      }
    } catch (err) {
      console.warn('Failed to fetch POs in finance payables:', err);
      setPurchaseOrders(initialPurchaseOrders);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const handlePayVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOForPayment) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPOForPayment.id,
          status: 'DIKIRIM',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setPurchaseOrders(
          purchaseOrders.map((po) =>
            po.id === selectedPOForPayment.id
              ? { ...po, status: 'DIKIRIM' }
              : po
          )
        );
      } else {
        setPurchaseOrders(
          purchaseOrders.map((po) =>
            po.id === selectedPOForPayment.id
              ? { ...po, status: 'DIKIRIM' }
              : po
          )
        );
      }
    } catch (err) {
      console.warn('Failed to update PO status:', err);
      setPurchaseOrders(
        purchaseOrders.map((po) =>
          po.id === selectedPOForPayment.id
            ? { ...po, status: 'DIKIRIM' }
            : po
        )
      );
    } finally {
      setIsSubmitting(false);
      setSelectedPOForPayment(null);
      setTransferRef('');
    }
  };

  const totalHutang = purchaseOrders
    .filter((po) => po.status === 'BUAT_EMAIL')
    .reduce((sum, po) => sum + po.total_amount, 0);

  const totalLunas = purchaseOrders
    .filter((po) => po.status === 'DIKIRIM' || po.status === 'DITERIMA')
    .reduce((sum, po) => sum + po.total_amount, 0);

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20">
      <AdminTopNav />

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              Tagihan Suplier & Hutang PO
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola pembayaran tagihan Purchase Order (PO)
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {canUserExportXLSX(currentUser) && (
              <button
                onClick={() => exportPayablesToXLSX(purchaseOrders)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                title="Ekspor Seluruh Tagihan Hutang PO ke File Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" /> Ekspor ke XLSX
              </button>
            )}
            <Link
              href="/admin/finance"
              className="bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all"
            >
              <CreditCard className="w-4 h-4 text-blue-600" /> Ke Invoice Customer (Piutang) &rarr;
            </Link>
          </div>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Hutang Vendor Perlu Dibayar</div>
              <div className="text-xl font-bold font-mono text-purple-700 mt-0.5">{formatIDR(totalHutang)}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">PO Menunggu Pembayaran Finance</div>
              <div className="text-xl font-bold text-slate-800 mt-0.5">
                {purchaseOrders.filter((po) => po.status === 'BUAT_EMAIL').length} PO
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Pembelian Lunas / Terbayar</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{formatIDR(totalLunas)}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Vendor Payables Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4.5 h-4.5 text-purple-600" />
              <h2 className="text-base font-bold text-slate-700">Daftar Tagihan Purchase Order (PO) Distributor</h2>
            </div>
            <div className="flex items-center gap-3">
              {canUserExportXLSX(currentUser) && (
                <button
                  onClick={() => exportPayablesToXLSX(purchaseOrders)}
                  className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-semibold border border-emerald-300 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                  title="Ekspor ke Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Ekspor XLSX
                </button>
              )}
              <span className="text-xs text-slate-400 font-medium">{purchaseOrders.length} Tagihan PO</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                  <th className="px-6 py-3">No. PO / Tanggal</th>
                  <th className="px-6 py-3">Distributor / Vendor</th>
                  <th className="px-6 py-3">Rincian Item Dipesan</th>
                  <th className="px-6 py-3">Total Tagihan Suplier</th>
                  <th className="px-6 py-3">Status Alur PO</th>
                  <th className="px-6 py-3 text-right">Aksi Pembayaran Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        Memuat data Purchase Order...
                      </div>
                    </td>
                  </tr>
                ) : purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                      Belum ada Purchase Order yang tercatat.
                    </td>
                  </tr>
                ) : purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/admin/procurement/${po.id}`}
                        className="font-mono font-bold text-blue-700 hover:underline flex items-center gap-1 text-sm"
                      >
                        {po.po_number} <ExternalLink className="w-3 h-3" />
                      </Link>
                      <div className="text-[11px] text-slate-400">{formatDate(po.order_date)}</div>
                    </td>

                    <td className="px-6 py-3.5 font-semibold text-slate-800">{po.distributor_name}</td>

                    <td className="px-6 py-3.5 text-xs text-slate-600">
                      {(Array.isArray(po.items) ? po.items : []).map((item, idx) => (
                        <div key={idx}>
                          &bull; {item.product_name} (<span className="font-mono text-emerald-700 font-bold">{formatKg(item.qty_ordered_kg)}</span>)
                        </div>
                      ))}
                      {(!Array.isArray(po.items) || po.items.length === 0) && (
                        <span className="text-slate-400 italic">Tidak ada item</span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 font-mono font-bold text-slate-900">{formatIDR(po.total_amount)}</td>

                    <td className="px-6 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        po.status === 'DIBATALKAN' || po.status === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : po.status === 'DIKIRIM' || po.status === 'DITERIMA'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {po.status}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      {po.status === 'DIBATALKAN' || po.status === 'CANCELLED' ? (
                        <span className="text-xs text-slate-500 font-semibold flex items-center justify-end gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span> PO Dibatalkan (Void)
                        </span>
                      ) : po.status === 'DIKIRIM' || po.status === 'DITERIMA' ? (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pembayaran Lunas
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedPOForPayment(po)}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Bayar Vendor PO
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Pay Vendor Modal */}
      {selectedPOForPayment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-purple-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <h3 className="font-bold text-base">Input Pembayaran Tagihan Suplier PO</h3>
              </div>
              <button onClick={() => setSelectedPOForPayment(null)} className="text-purple-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayVendorSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-xl space-y-1 text-purple-900 font-medium">
                <div>Ref PO: <strong>{selectedPOForPayment.po_number}</strong></div>
                <div>Distributor Suplier: <strong>{selectedPOForPayment.distributor_name}</strong></div>
                <div>Total Nilai Tagihan: <strong className="text-base text-purple-800 font-mono">{formatIDR(selectedPOForPayment.total_amount)}</strong></div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor Referensi Transfer / Bukti Bayar Bank</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: TRF-BCA-2026-990812"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Upload File Bukti Transfer (PDF / JPG)</label>
                <input
                  type="file"
                  className="w-full text-xs text-slate-500 border border-gray-300 rounded-lg p-2 bg-gray-50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedPOForPayment(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Memproses...' : 'Konfirmasi Pembayaran Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
