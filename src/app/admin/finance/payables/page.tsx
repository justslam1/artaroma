'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { initialPurchaseOrders } from '@/lib/mock-data';
import { PurchaseOrder, POPaymentRecord } from '@/lib/types';
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
  Calendar,
  AlertTriangle,
  XCircle,
  Eye,
  Check,
} from 'lucide-react';
import { exportPayablesToXLSX } from '@/lib/export-excel';
import { canUserExportXLSX } from '@/lib/auth';
import {
  getStoredCashAccounts,
  getStoredCashTransactions,
  recordCashTransaction,
  calculatePODueDateInfo,
  getPOPaymentStatusFromCash,
} from '@/lib/cash-store';
import { POPaymentModal } from '@/components/admin/po-payment-modal';

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

  const [cashTxs, setCashTxs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCashTxs(getStoredCashTransactions());
    const handleCashUpdate = () => {
      setCashTxs(getStoredCashTransactions());
    };
    window.addEventListener('artaroma_cash_updated', handleCashUpdate);
    return () => {
      window.removeEventListener('artaroma_cash_updated', handleCashUpdate);
    };
  }, []);

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
          paid_amount: Number(po.paid_amount) || 0,
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

  const handleConfirmPOPayment = async (
    poId: string,
    paidAmount: number,
    paymentDate: string,
    bankAccountId: string,
    bankName: string,
    referenceNo?: string,
    paymentNotes?: string,
    proofUrl?: string
  ) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;

    setIsSubmitting(true);
    try {
      const prevPaid = Number(po.paid_amount || 0);
      const newAccumulatedPaid = Math.min(Number(po.total_amount || 0), prevPaid + paidAmount);
      const remaining = Math.max(0, Number(po.total_amount || 0) - newAccumulatedPaid);
      const isLunas = remaining === 0;
      const paymentStatus = isLunas ? 'PAID' : 'PARTIALLY_PAID';

      const newPaymentRecord: POPaymentRecord = {
        id: `po-pay-${Date.now()}`,
        payment_date: paymentDate,
        amount: paidAmount,
        remaining_after: remaining,
        bank_account_id: bankAccountId,
        bank_name: bankName,
        reference_no: referenceNo,
        payment_proof_url: proofUrl,
        payment_notes: paymentNotes || (isLunas ? 'Pelunasan Tagihan PO' : 'Pembayaran Termin PO'),
        created_by: currentUser?.name || 'Staf Finance',
        created_at: new Date().toISOString(),
      };

      const existingHistory: POPaymentRecord[] = Array.isArray(po.payment_history) ? po.payment_history : [];
      const updatedHistory = [...existingHistory, newPaymentRecord];

      const newPoStatus = po.status === 'BUAT_EMAIL' ? 'DIKIRIM' : po.status;

      await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: po.id,
          status: newPoStatus,
          paid_amount: newAccumulatedPaid,
          payment_status: paymentStatus,
          payment_proof_url: proofUrl || po.payment_proof_url,
          payment_reference_no: referenceNo || po.payment_reference_no,
          payment_bank_id: bankAccountId,
          payment_bank_name: bankName,
          payment_history: updatedHistory,
          last_payment_date: paymentDate,
        }),
      });

      // Auto-record BKK to specific Kas Besar Bank (Treasury)
      try {
        const cashAccounts = getStoredCashAccounts();
        const selectedAcc =
          cashAccounts.find((a) => a.id === bankAccountId) ||
          cashAccounts.find((a) => a.id === 'acc-bca') ||
          cashAccounts[0];

        if (paidAmount > 0 && selectedAcc) {
          recordCashTransaction({
            account_id: selectedAcc.id,
            account_name: selectedAcc.name,
            tx_type: 'OUT',
            category: 'PEMBELIAN_PO',
            amount: paidAmount,
            date: paymentDate,
            recipient_or_payer: po.distributor_name || 'Suplier Distributor',
            reference_number: po.po_number,
            notes: `Pembayaran ${isLunas ? 'Pelunasan' : 'Termin/Cicilan'} PO ${po.po_number} kepada ${po.distributor_name || 'Suplier'} via ${selectedAcc.name}${referenceNo ? ` (Ref: ${referenceNo})` : ''}`,
            proof_url: proofUrl,
            created_by: currentUser?.name || 'Staf Finance',
            status: 'VERIFIED',
          });
        }
      } catch (e) {
        console.warn('Failed to auto-record BKK to cash store:', e);
      }

      const updatedPO: PurchaseOrder = {
        ...po,
        status: newPoStatus,
        paid_amount: newAccumulatedPaid,
        payment_status: paymentStatus,
        payment_proof_url: proofUrl || po.payment_proof_url,
        payment_reference_no: referenceNo || po.payment_reference_no,
        payment_bank_id: bankAccountId,
        payment_bank_name: bankName,
        payment_history: updatedHistory,
        last_payment_date: paymentDate,
      };

      setPurchaseOrders((prev) =>
        prev.map((p) => (p.id === po.id ? updatedPO : p))
      );

      setSelectedPOForPayment(null);
      alert(
        `✅ Pembayaran ${isLunas ? 'PELUNASAN' : 'TERMIN/CICILAN'} PO ${po.po_number} berhasil dicatat!\n\nNominal Bayar: ${formatIDR(paidAmount)}\nSisa Hutang: ${formatIDR(remaining)}\nKas Keluar (BKK) otomatis tercatat pada ${bankName}.`
      );
    } catch (err: any) {
      console.error('Failed to submit PO payment:', err);
      alert('Gagal mencatat pembayaran PO: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSisaHutang = purchaseOrders
    .filter((po) => po.status !== 'DIBATALKAN' && po.status !== 'CANCELLED')
    .reduce((sum, po) => sum + Math.max(0, Number(po.total_amount || 0) - Number(po.paid_amount || 0)), 0);

  const totalSudahDibayar = purchaseOrders
    .filter((po) => po.status !== 'DIBATALKAN' && po.status !== 'CANCELLED')
    .reduce((sum, po) => sum + Number(po.paid_amount || 0), 0);

  const totalSemuaPO = purchaseOrders
    .filter((po) => po.status !== 'DIBATALKAN' && po.status !== 'CANCELLED')
    .reduce((sum, po) => sum + Number(po.total_amount || 0), 0);

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
              <div className="text-xs text-slate-400 font-medium">Sisa Hutang Vendor Perlu Dibayar</div>
              <div className="text-xl font-bold font-mono text-purple-700 mt-0.5">{formatIDR(totalSisaHutang)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {purchaseOrders.filter((po) => Math.max(0, Number(po.total_amount || 0) - Number(po.paid_amount || 0)) > 0).length} PO memiliki sisa hutang
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Pembayaran Terbayar (Kas Keluar)</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{formatIDR(totalSudahDibayar)}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                Tercatat otomatis di Buku Kas Besar (BKK)
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Komitmen Tagihan PO</div>
              <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">{formatIDR(totalSemuaPO)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {purchaseOrders.length} Total Tagihan PO
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Vendor Payables Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4.5 h-4.5 text-purple-600" />
              <h2 className="text-base font-bold text-slate-700">Daftar Tagihan &amp; Pembayaran Purchase Order (PO)</h2>
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
                  <th className="px-6 py-3 text-right">Total Tagihan</th>
                  <th className="px-6 py-3 text-right">Sudah Dibayar</th>
                  <th className="px-6 py-3 text-right">Sisa Hutang</th>
                  <th className="px-6 py-3">Jatuh Tempo</th>
                  <th className="px-6 py-3 text-center">Status Pembayaran</th>
                  <th className="px-6 py-3 text-center">Status Alur PO</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        Memuat data Purchase Order...
                      </div>
                    </td>
                  </tr>
                ) : purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm">
                      Belum ada Purchase Order yang tercatat.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => {
                    const dueInfo = calculatePODueDateInfo(po);
                    const total = Number(po.total_amount || 0);
                    const paid = Number(po.paid_amount || 0);
                    const remaining = Math.max(0, total - paid);
                    const isCancelled = po.status === 'DIBATALKAN' || po.status === 'CANCELLED';
                    const isFullyPaid = !isCancelled && remaining === 0 && total > 0;
                    const isPartial = !isCancelled && paid > 0 && !isFullyPaid;
                    const payHistoryCount = Array.isArray(po.payment_history) ? po.payment_history.length : paid > 0 ? 1 : 0;

                    return (
                      <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                        {/* No. PO */}
                        <td className="px-6 py-3.5">
                          <Link
                            href={`/admin/procurement/${po.id}`}
                            className="font-mono font-bold text-blue-700 hover:underline flex items-center gap-1 text-sm"
                          >
                            {po.po_number} <ExternalLink className="w-3 h-3" />
                          </Link>
                          <div className="text-[11px] text-slate-400">{formatDate(po.order_date)}</div>
                        </td>

                        {/* Distributor */}
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-slate-800">{po.distributor_name}</div>
                          <div className="text-[10px] text-slate-400">
                            {(Array.isArray(po.items) ? po.items : []).length} Item Dipesan
                          </div>
                        </td>

                        {/* Total Tagihan */}
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                          {formatIDR(total)}
                        </td>

                        {/* Sudah Dibayar */}
                        <td className="px-6 py-3.5 text-right">
                          <div className={`font-mono font-bold ${paid > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {formatIDR(paid)}
                          </div>
                          {payHistoryCount > 0 && (
                            <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded inline-block mt-0.5">
                              {payHistoryCount}x Termin
                            </span>
                          )}
                        </td>

                        {/* Sisa Hutang */}
                        <td className="px-6 py-3.5 text-right">
                          <span
                            className={`font-mono font-extrabold ${
                              isCancelled
                                ? 'text-slate-400 line-through'
                                : remaining > 0
                                ? 'text-purple-900'
                                : 'text-emerald-600'
                            }`}
                          >
                            {isCancelled ? 'Batal' : remaining === 0 ? 'Rp 0' : formatIDR(remaining)}
                          </span>
                        </td>

                        {/* Jatuh Tempo & Sisa Hari */}
                        <td className="px-6 py-3.5 whitespace-nowrap text-xs">
                          <div className="font-medium text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatDate(dueInfo.dueDateStr)}</span>
                          </div>
                          <div className="mt-0.5">
                            {isFullyPaid ? (
                              <span className="text-[10px] font-semibold text-emerald-700">Lunas ✓</span>
                            ) : isCancelled ? (
                              <span className="text-[10px] text-slate-400">-</span>
                            ) : dueInfo.isOverdue ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5" /> {dueInfo.displayText}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-500">
                                TOP {po.payment_terms_days || 30} Hari ({dueInfo.displayText})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Pembayaran */}
                        <td className="px-6 py-3.5 whitespace-nowrap text-center">
                          {isCancelled ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              <XCircle className="w-3 h-3" /> BATAL
                            </span>
                          ) : isFullyPaid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> LUNAS
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                              <Clock className="w-3 h-3 text-amber-600" /> DIBAYAR PARSIAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <CreditCard className="w-3 h-3 text-rose-500" /> BELUM BAYAR
                            </span>
                          )}
                        </td>

                        {/* Status Alur PO */}
                        <td className="px-6 py-3.5 text-center">
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                              isCancelled
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : po.status === 'DIKIRIM' || po.status === 'DITERIMA'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {po.status === 'BUAT_EMAIL' ? 'DIAJUKAN' : po.status}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                          {isCancelled ? (
                            <span className="text-xs text-slate-400 italic">Dibatalkan</span>
                          ) : isFullyPaid ? (
                            <button
                              type="button"
                              onClick={() => setSelectedPOForPayment(po)}
                              className="bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-300 font-bold text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              title="Lihat Riwayat Bukti Pembayaran Kas"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" /> Riwayat Bayar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedPOForPayment(po)}
                              className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              title="Input Pembayaran / Cicilan Tagihan Suplier PO"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              {isPartial ? 'Cicil / Lunasi PO' : 'Bayar Vendor PO'}
                            </button>
                          )}
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

      {/* POPaymentModal */}
      <POPaymentModal
        isOpen={!!selectedPOForPayment}
        onClose={() => setSelectedPOForPayment(null)}
        po={selectedPOForPayment}
        onConfirmPayment={handleConfirmPOPayment}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
