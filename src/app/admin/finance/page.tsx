'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { VerifyPaymentModal, UploadTaxInvoiceModal } from '@/components/admin/finance-modal';
import { Invoice, InvoicePaymentRecord, SalesOrder } from '@/lib/types';
import { formatIDR, formatDate } from '@/lib/utils';
import { getStoredInvoices, saveStoredInvoices, getStoredOrders, saveStoredOrders } from '@/lib/order-store';
import {
  CreditCard,
  FileText,
  Upload,
  Eye,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Download,
  Building2,
  DollarSign,
  FileSpreadsheet,
} from 'lucide-react';
import { exportInvoicesToXLSX } from '@/lib/export-excel';
import { canUserExportXLSX } from '@/lib/auth';
import { getStoredCashAccounts, recordCashTransaction } from '@/lib/cash-store';

export default function FinanceInvoicesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.warn('Failed to load user in finance:', err));
  }, []);

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [selectedInvoiceForVerify, setSelectedInvoiceForVerify] = useState<Invoice | null>(null);
  const [selectedInvoiceForTax, setSelectedInvoiceForTax] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Guard against re-entrant calls triggered by our own localStorage saves
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const syncInvoices = async () => {
      if (isSyncingRef.current) return;   // ← break the loop
      isSyncingRef.current = true;
      setIsLoading(true);

      // 1. Fetch latest confirmed SOs from MySQL API (authoritative source)
      let apiOrders: SalesOrder[] = [];
      try {
        const res = await fetch('/api/sales-orders', { cache: 'no-store' });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          apiOrders = json.data.map((so: any) => ({
            ...so,
            items: Array.isArray(so.items) ? so.items : [],
          }));
          // Write silently to localStorage WITHOUT dispatching artaroma_orders_updated
          // to avoid triggering this same listener again.
          try { localStorage.setItem('artaroma_sales_orders_v1', JSON.stringify(apiOrders)); } catch (_) {}
          setSalesOrders(apiOrders);
        }
      } catch (err) {
        console.warn('Finance page: falling back to localStorage for orders:', err);
      }

      const ordersToUse: SalesOrder[] = apiOrders.length > 0 ? apiOrders : getStoredOrders();
      if (apiOrders.length === 0) setSalesOrders(ordersToUse);

      // 2. Merge localStorage invoices with any confirmed SOs not yet invoiced
      const storedInv = getStoredInvoices();
      const allInvoices: Invoice[] = [...storedInv];

      ordersToUse.forEach((so) => {
        const isConfirmedOrBeyond = ['DIKONFIRMASI', 'PROSES_GUDANG', 'DIKIRIM', 'DITERIMA'].includes(so.status);
        if (isConfirmedOrBeyond) {
          const hasInv = allInvoices.some((inv) => inv.so_id === so.id || inv.so_number === so.so_number);
          if (!hasInv) {
            const cleanNum = so.so_number.replace(/[^0-9]/g, '') || String(Math.floor(100 + Math.random() * 900));
            const newInv: Invoice = {
              id: (so as any).invoice_id || `inv-${so.id}`,
              invoice_number: `INV-2026-${cleanNum}`,
              so_id: so.id,
              so_number: so.so_number,
              customer_id: so.customer_id,
              customer_name: (so as any).customer_company || so.customer_name || '',
              status: 'UNPAID',
              issue_date: so.order_date || new Date().toISOString().split('T')[0],
              due_date: (() => {
                const d = new Date();
                d.setDate(d.getDate() + 30);
                return d.toISOString().split('T')[0];
              })(),
              total_amount: Number((so as any).grand_total || (so as any).total_goods_amount || 0),
              paid_amount: 0,
            };
            allInvoices.unshift(newInv);
          }
        }
      });

      // Normalize numeric fields to prevent NaN crashes
      const normalized = allInvoices.map((inv) => ({
        ...inv,
        total_amount: Number(inv.total_amount) || 0,
        paid_amount: Number(inv.paid_amount) || 0,
        invoice_number: inv.invoice_number || '',
        so_number: inv.so_number || '',
        customer_name: inv.customer_name || '',
        status: inv.status || 'UNPAID',
      }));

      setInvoices(normalized as Invoice[]);
      // Write silently to localStorage WITHOUT dispatching artaroma_invoices_updated
      // to avoid re-triggering this same listener.
      try { localStorage.setItem('artaroma_invoices_v1', JSON.stringify(normalized)); } catch (_) {}

      setIsLoading(false);
      isSyncingRef.current = false;
    };

    syncInvoices();

    // Only re-sync when OTHER pages trigger these events (e.g. order detail confirms an SO)
    const handleExternalUpdate = () => {
      if (!isSyncingRef.current) syncInvoices();
    };
    window.addEventListener('artaroma_invoices_updated', handleExternalUpdate);
    window.addEventListener('artaroma_orders_updated', handleExternalUpdate);

    return () => {
      window.removeEventListener('artaroma_invoices_updated', handleExternalUpdate);
      window.removeEventListener('artaroma_orders_updated', handleExternalUpdate);
    };
  }, []);

  const handleUploadTaxInvoice = (invoiceId: string, pdfUrl: string) => {
    const updated = invoices.map((inv) =>
      inv.id === invoiceId ? { ...inv, faktur_pajak_file_url: pdfUrl } : inv
    );
    setInvoices(updated);
    saveStoredInvoices(updated);
  };

  const handleVerifyPayment = (
    invoiceId: string,
    status: 'VERIFIED' | 'REJECTED',
    newPaymentAmount?: number,
    paymentNotes?: string,
    paymentDate?: string,
    paymentProofUrl?: string
  ) => {
    const updated = invoices.map((inv) => {
      if (inv.id !== invoiceId) return inv;

      if (status === 'REJECTED') {
        return {
          ...inv,
          payment_verification_status: 'REJECTED' as const,
        };
      }

      const prevPaid = Number(inv.paid_amount || 0);
      const incomingPayment = newPaymentAmount !== undefined ? Number(newPaymentAmount) : Number(inv.total_amount) - prevPaid;
      const totalAccumulatedPaid = Math.min(Number(inv.total_amount), prevPaid + incomingPayment);
      const isFullyPaid = totalAccumulatedPaid >= Number(inv.total_amount);
      const payDate = paymentDate || new Date().toISOString().split('T')[0];
      const remainingAfter = Math.max(0, Number(inv.total_amount) - totalAccumulatedPaid);

      const newHistoryItem: InvoicePaymentRecord = {
        id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        payment_date: payDate,
        amount: incomingPayment,
        remaining_after: remainingAfter,
        payment_proof_url: paymentProofUrl || inv.payment_proof_url,
        payment_notes: paymentNotes || inv.payment_notes,
        verified_by: currentUser?.name || currentUser?.username || 'Staf Finance',
        created_at: new Date().toISOString(),
      };

      const existingHistory = Array.isArray(inv.payment_history) ? inv.payment_history : [];

      // Auto-record BKM to Kas Besar (Treasury)
      try {
        const cashAccounts = getStoredCashAccounts();
        const bcaAcc = cashAccounts.find((a) => a.id === 'acc-bca') || cashAccounts[0];
        if (incomingPayment > 0 && bcaAcc) {
          recordCashTransaction({
            account_id: bcaAcc.id,
            tx_type: 'IN',
            category: 'PENJUALAN_SO',
            amount: incomingPayment,
            date: payDate,
            recipient_or_payer: inv.customer_name || 'Customer B2B',
            reference_number: `${inv.invoice_number || 'INV'} / ${inv.so_number || 'SO'}`,
            notes: paymentNotes || `Pelunasan piutang invoice ${inv.invoice_number || ''}`,
            proof_url: paymentProofUrl || inv.payment_proof_url,
            created_by: currentUser?.name || 'Staf Finance',
            status: 'VERIFIED',
          });
        }
      } catch (e) {
        console.warn('Failed to auto-record BKM to cash store:', e);
      }

      return {
        ...inv,
        paid_amount: totalAccumulatedPaid,
        status: (isFullyPaid ? 'PAID' : 'PARTIALLY_PAID') as any,
        payment_verification_status: 'VERIFIED' as const,
        payment_notes: paymentNotes || inv.payment_notes,
        last_payment_date: payDate,
        payment_proof_url: paymentProofUrl || inv.payment_proof_url,
        payment_history: [...existingHistory, newHistoryItem],
      };
    });
    setInvoices(updated);
    saveStoredInvoices(updated);
  };

  const totalPiutang = invoices.reduce((sum, inv) => sum + ((Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0)), 0);
  const pendingVerifyCount = invoices.filter((i) => i.payment_verification_status === 'PENDING').length;
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20">
      <AdminTopNav />

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Invoice Penjualan (Piutang Customer B2B)
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola penagihan invoice, verifikasi bukti transfer pembayaran customer, & unggah Faktur Pajak PDF
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {canUserExportXLSX(currentUser) && (
              <button
                onClick={() => exportInvoicesToXLSX(invoices)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                title="Ekspor Seluruh Invoice Piutang ke File Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" /> Ekspor ke XLSX
              </button>
            )}
            <Link
              href="/admin/finance/payables"
              className="bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all"
            >
              <Building2 className="w-4 h-4 text-purple-600" /> Ke Tagihan Suplier / PO (Hutang) &rarr;
            </Link>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Piutang Aktif</div>
              <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">{formatIDR(totalPiutang)}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Invoice Terbit</div>
              <div className="text-xl font-bold text-slate-800 mt-0.5">{invoices.length} Invoice</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Perlu Verifikasi Transfer</div>
              <div className="text-xl font-bold text-amber-600 mt-0.5">{pendingVerifyCount} Transaksi</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Overdue / Jatuh Tempo</div>
              <div className="text-xl font-bold text-red-600 mt-0.5">{overdueCount} Customer</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Invoice Customer Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-700">Daftar Tagihan Invoice Customer B2B</h2>
            </div>
            <div className="flex items-center gap-3">
              {canUserExportXLSX(currentUser) && (
                <button
                  onClick={() => exportInvoicesToXLSX(invoices)}
                  className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-semibold border border-emerald-300 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                  title="Ekspor ke Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Ekspor XLSX
                </button>
              )}
              <span className="text-xs text-slate-400 font-medium">{invoices.length} Invoice</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                  <th className="px-6 py-3">No. Invoice / Terbit</th>
                  <th className="px-6 py-3">Ref No. SO</th>
                  <th className="px-6 py-3">Customer B2B</th>
                  <th className="px-6 py-3">Total Tagihan (IDR)</th>
                  <th className="px-6 py-3">Jatuh Tempo</th>
                  <th className="px-6 py-3">Sisa Hari / Overdue</th>
                  <th className="px-6 py-3">Status Bayar</th>
                  <th className="px-6 py-3">Faktur Pajak</th>
                  <th className="px-6 py-3 text-right">Aksi Finance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Memuat data Invoice...
                      </div>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm">
                      Belum ada invoice yang tercatat. Invoice akan muncul saat SO berstatus DIKONFIRMASI.
                    </td>
                  </tr>
                ) : invoices.map((inv) => {
                  const getRemainingDaysInfo = (dueDateStr?: string, status?: string) => {
                    if (status === 'PAID') {
                      return (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                          ✓ Lunas
                        </span>
                      );
                    }

                    if (!dueDateStr) {
                      return <span className="text-slate-400 text-xs">-</span>;
                    }

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const due = new Date(dueDateStr);
                    due.setHours(0, 0, 0, 0);

                    if (isNaN(due.getTime())) {
                      return <span className="text-slate-400 text-xs">-</span>;
                    }

                    const diffTime = due.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                      const overdueDays = Math.abs(diffDays);
                      return (
                        <span className="bg-red-50 text-red-700 border border-red-300 text-[11px] px-2.5 py-0.5 rounded-full font-black inline-flex items-center gap-1 shadow-2xs animate-pulse">
                          ⚠️ Lewat {overdueDays} Hari (Overdue)
                        </span>
                      );
                    }

                    if (diffDays === 0) {
                      return (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] px-2.5 py-0.5 rounded-full font-extrabold">
                          ⚠️ Jatuh Tempo Hari Ini
                        </span>
                      );
                    }

                    if (diffDays <= 3) {
                      return (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                          ⏳ Sisa {diffDays} Hari
                        </span>
                      );
                    }

                    return (
                      <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                        Sisa {diffDays} Hari
                      </span>
                    );
                  };

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="font-mono font-bold text-blue-700">{inv.invoice_number}</div>
                        <div className="text-[11px] text-slate-400">{inv.issue_date}</div>
                      </td>

                      <td className="px-6 py-3.5">
                        <Link
                          href={`/admin/orders/${inv.so_id}`}
                          className="font-mono font-bold text-blue-600 hover:underline"
                        >
                          {inv.so_number}
                        </Link>
                      </td>

                      <td className="px-6 py-3.5 font-semibold text-slate-800">{inv.customer_name}</td>

                      <td className="px-6 py-3.5">
                        <div className="font-mono font-bold text-slate-900">{formatIDR(Number(inv.total_amount) || 0)}</div>
                        {Number(inv.paid_amount || 0) > 0 && Number(inv.paid_amount || 0) < Number(inv.total_amount) && (
                          <div className="text-[11px] font-mono text-amber-700 font-bold">
                            Sisa: {formatIDR(Number(inv.total_amount) - Number(inv.paid_amount))}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-xs text-slate-600 font-mono">{inv.due_date}</td>

                      <td className="px-6 py-3.5">
                        {getRemainingDaysInfo(inv.due_date, inv.status)}
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="space-y-1">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold border inline-block ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : (inv.status as string) === 'PARTIALLY_PAID'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : inv.status === 'OVERDUE'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {(inv.status as string) === 'PARTIALLY_PAID' ? 'SEBAGIAN' : inv.status}
                          </span>
                          {inv.last_payment_date && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              Bayar: {inv.last_payment_date}
                            </div>
                          )}
                          {Array.isArray(inv.payment_history) && inv.payment_history.length > 1 && (
                            <div className="text-[10px] text-purple-700 font-semibold">
                              ({inv.payment_history.length}x Cicilan)
                            </div>
                          )}
                        </div>
                      </td>

                    <td className="px-6 py-3.5">
                      {inv.faktur_pajak_file_url ? (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 w-max">
                          <Download className="w-3 h-3 text-blue-600" /> ADA FAKTUR
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedInvoiceForTax(inv)}
                          className="text-xs text-amber-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Upload className="w-3 h-3" /> Upload PDF
                        </button>
                      )}
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      {inv.payment_verification_status === 'PENDING' ? (
                        <button
                          onClick={() => setSelectedInvoiceForVerify(inv)}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-sm transition-all animate-pulse cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" /> Verifikasi Transfer
                        </button>
                      ) : inv.status === 'PAID' ? (
                        <button
                          onClick={() => setSelectedInvoiceForVerify(inv)}
                          className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          title="Klik untuk melihat riwayat pembayaran & bukti transfer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Terverifikasi Lunas
                        </button>
                      ) : (inv.status as string) === 'PARTIALLY_PAID' ? (
                        <button
                          onClick={() => setSelectedInvoiceForVerify(inv)}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Input Pelunasan Sisa
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedInvoiceForVerify(inv)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Cek Pembayaran
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <VerifyPaymentModal
        isOpen={!!selectedInvoiceForVerify}
        onClose={() => setSelectedInvoiceForVerify(null)}
        invoice={selectedInvoiceForVerify}
        onVerify={handleVerifyPayment}
      />

      <UploadTaxInvoiceModal
        isOpen={!!selectedInvoiceForTax}
        onClose={() => setSelectedInvoiceForTax(null)}
        invoice={selectedInvoiceForTax}
        onUploadTaxInvoice={handleUploadTaxInvoice}
      />
    </div>
  );
}
