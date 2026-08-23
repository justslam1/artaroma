'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { CreatePOModal, GoodsReceiptModal } from '@/components/admin/po-modal';
import { POPDFModal } from '@/components/common/po-pdf-modal';
import { initialPurchaseOrders, initialBatches, initialDistributors, initialProducts } from '@/lib/mock-data';
import { PurchaseOrder, StockBatch, Product, Distributor, CashTransaction } from '@/lib/types';
import { formatIDR, formatKg, formatDate } from '@/lib/utils';
import {
  ShoppingBag,
  Plus,
  FileText,
  PackageCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ExternalLink,
  XCircle,
  FileSpreadsheet,
  Clock,
  AlertTriangle,
  CreditCard,
  Building2,
  Calendar,
  X,
  Send,
} from 'lucide-react';
import { exportPurchaseOrdersToXLSX } from '@/lib/export-excel';
import { canUserExportXLSX } from '@/lib/auth';
import {
  getStoredCashAccounts,
  getStoredCashTransactions,
  recordCashTransaction,
  calculatePODueDateInfo,
  getPOPaymentStatusFromCash,
} from '@/lib/cash-store';

export default function ProcurementPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
  const [batches, setBatches] = useState<StockBatch[]>(initialBatches);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [distributors, setDistributors] = useState<Distributor[]>(initialDistributors);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isGRModalOpen, setIsGRModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFinancialHidden, setIsFinancialHidden] = useState(false);

  // PDF Preview State
  const [pdfModalPO, setPdfModalPO] = useState<PurchaseOrder | null>(null);
  const [companySettings, setCompanySettings] = useState<any>({
    company_name: 'PT Artaroma Jayatama',
    company_tagline: 'B2B Fragrance Oil Supplier & Management Hub',
    warehouse_address: 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272',
  });

  const [readPOIds, setReadPOIds] = useState<string[]>([]);
  const [cashTxs, setCashTxs] = useState<CashTransaction[]>([]);
  const [selectedPOForPayment, setSelectedPOForPayment] = useState<PurchaseOrder | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedSourceBankId, setSelectedSourceBankId] = useState<string>('acc-bca');
  const [transferRef, setTransferRef] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

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

  useEffect(() => {
    fetch('/api/company-settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.bank_accounts) {
          setBankAccounts(json.data.bank_accounts);
        }
      })
      .catch(() => {});
  }, []);

  const handlePayVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOForPayment) return;

    setIsSubmittingPayment(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPOForPayment.id,
          status: 'DIKIRIM',
        }),
      });

      // Auto-record BKK to specific Kas Besar Bank (Treasury)
      try {
        const cashAccounts = getStoredCashAccounts();
        const selectedAcc =
          cashAccounts.find((a) => a.id === selectedSourceBankId) ||
          cashAccounts.find((a) => a.id === 'acc-bca') ||
          cashAccounts[0];

        if (selectedPOForPayment.total_amount > 0 && selectedAcc) {
          recordCashTransaction({
            account_id: selectedAcc.id,
            account_name: selectedAcc.name,
            tx_type: 'OUT',
            category: 'PEMBELIAN_PO',
            amount: Number(selectedPOForPayment.total_amount),
            date: new Date().toISOString().split('T')[0],
            recipient_or_payer: selectedPOForPayment.distributor_name || 'Suplier Distributor',
            reference_number: selectedPOForPayment.po_number,
            notes: `Pembayaran hutang PO ${selectedPOForPayment.po_number} kepada ${selectedPOForPayment.distributor_name || 'Suplier'} via ${selectedAcc.name}${transferRef ? ` (Ref: ${transferRef})` : ''}`,
            proof_url: undefined,
            created_by: currentUser?.name || 'Staf Procurement / Finance',
            status: 'VERIFIED',
          });
        }
      } catch (e) {
        console.warn('Failed to auto-record BKK to cash store:', e);
      }

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
      setIsSubmittingPayment(false);
      setSelectedPOForPayment(null);
      setTransferRef('');
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('artaroma_read_po_ids');
      if (stored) {
        setReadPOIds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const markAsRead = (id: string) => {
    if (!readPOIds.includes(id)) {
      const updated = [...readPOIds, id];
      setReadPOIds(updated);
      try {
        localStorage.setItem('artaroma_read_po_ids', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.warn('Failed to load user info in procurement:', err));
  }, []);

  // Determine financial permission: Super Admin or has 'Lihat Nilai Finansial (PO/SO)' or 'Finance & Invoice'
  const canViewFinancials =
    currentUser?.is_super_admin ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'FINANCE' ||
    (Array.isArray(currentUser?.allowed_modules) &&
      (currentUser.allowed_modules.includes('Lihat Nilai Finansial (PO/SO)') ||
        currentUser.allowed_modules.includes('Finance & Invoice')));

  const showFinancialColumn = canViewFinancials && !isFinancialHidden;

  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/purchase-orders', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const sorted = [...json.data].sort((a: any, b: any) => {
          const timeA = a.created_at
            ? new Date(a.created_at).getTime()
            : a.order_date
            ? new Date(a.order_date).getTime()
            : 0;
          const timeB = b.created_at
            ? new Date(b.created_at).getTime()
            : b.order_date
            ? new Date(b.order_date).getTime()
            : 0;
          return timeB - timeA;
        });
        setPurchaseOrders(sorted);
      }
    } catch (err) {
      console.warn('Failed to fetch purchase orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setProducts(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch products in procurement page:', err);
    }
  };

  const fetchDistributors = async () => {
    try {
      const res = await fetch('/api/distributors', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDistributors(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch distributors in procurement page:', err);
    }
  };

  React.useEffect(() => {
    fetchPurchaseOrders();
    fetchProducts();
    fetchDistributors();

    fetch('/api/company-settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCompanySettings(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load company settings in Procurement:', err));
  }, []);

  const handleCreatePO = async (newPOData: Omit<PurchaseOrder, 'id'>, autoOpenPDF?: boolean) => {
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPOData),
      });
      const json = await res.json();
      if (json.success) {
        fetchPurchaseOrders();
        if (autoOpenPDF) {
          setPdfModalPO(json.data);
        }
      } else {
        const createdPO: PurchaseOrder = { ...newPOData, id: `po-${Date.now()}` };
        setPurchaseOrders([createdPO, ...purchaseOrders]);
        if (autoOpenPDF) {
          setPdfModalPO(createdPO);
        }
      }
    } catch (err) {
      console.warn('Failed to create purchase order:', err);
      const createdPO: PurchaseOrder = { ...newPOData, id: `po-${Date.now()}` };
      setPurchaseOrders([createdPO, ...purchaseOrders]);
      if (autoOpenPDF) {
        setPdfModalPO(createdPO);
      }
    }
  };

  const handleReceiveBatch = (newBatch: StockBatch) => {
    setBatches([newBatch, ...batches]);
    if (selectedPO) {
      setPurchaseOrders(purchaseOrders.map((po) =>
        po.id === selectedPO.id ? { ...po, status: 'DITERIMA' } : po
      ));
    }
  };

  const getPOStatusBadge = (po: PurchaseOrder) => {
    if (po.status === 'DIKIRIM') {
      // Calculate shipped vs ordered — use po_item_id to track per variant
      const totalOrdered = po.items.reduce((s, i) => s + i.qty_ordered_kg, 0);
      const shippedPerItem: Record<string, number> = {};
      if (po.shipments) {
        po.shipments.forEach(s => {
          s.items.forEach((si: any) => {
            const key = si.po_item_id || si.product_id;
            shippedPerItem[key] = (shippedPerItem[key] || 0) + si.qty_shipped_kg;
          });
        });
      }
      const totalShipped = Object.values(shippedPerItem).reduce((a, b) => a + b, 0);
      const pct = totalOrdered > 0 ? Math.min(100, Math.round((totalShipped / totalOrdered) * 100)) : 0;
      const isPartial = totalShipped > 0 && totalShipped < totalOrdered;
      const isFull = totalOrdered > 0 && totalShipped >= totalOrdered;

      if (isPartial) {
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-300 text-xs px-2.5 py-1 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
            DIKIRIM SEBAGIAN ({pct}%)
          </span>
        );
      }
      if (isFull) {
        return (
          <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs px-2.5 py-1 rounded-full font-bold">
            <CheckCircle2 className="w-3 h-3" /> DIKIRIM LENGKAP
          </span>
        );
      }
      // Not yet shipped at all
      return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2.5 py-1 rounded-full font-bold">PESANAN DIKIRIM</span>;
    }

    switch (po.status) {
      case 'BUAT_EMAIL':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-bold">BUAT EMAIL</span>;
      case 'DITERIMA':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold">PESANAN DITERIMA</span>;
      case 'DIBATALKAN':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-xs px-2.5 py-1 rounded-full font-bold">
            <XCircle className="w-3 h-3" /> DIBATALKAN
          </span>
        );
      default:
        return <span className="bg-gray-100 text-gray-700 border border-gray-200 text-xs px-2.5 py-1 rounded-full font-bold">{po.status}</span>;
    }
  };

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20">
      <AdminTopNav />

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              Purchase Order
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola Alur Kerja PO 3 Tahap (Buat Email &rarr; Pesanan Dikirim &rarr; Pesanan Diterima)
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {canUserExportXLSX(currentUser) && (
              <button
                onClick={() => exportPurchaseOrdersToXLSX(purchaseOrders)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                title="Ekspor Seluruh Purchase Orders ke File Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" /> Ekspor ke XLSX
              </button>
            )}
            <button
              onClick={() => setIsPOModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Buat Purchase Order Baru
            </button>
          </div>
        </div>

        {/* PO Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-700">Daftar Purchase Order</h2>
            </div>
            <div className="flex items-center gap-3">
              {canViewFinancials && (
                <button
                  onClick={() => setIsFinancialHidden((prev) => !prev)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                    isFinancialHidden
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border-slate-200'
                  }`}
                  title={isFinancialHidden ? "Tampilkan Kolom Nilai Finansial" : "Sembunyikan Kolom Nilai Finansial"}
                >
                  {isFinancialHidden ? (
                    <EyeOff className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}
              <span className="text-xs text-slate-400 font-medium">{purchaseOrders.length} PO</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                  <th className="px-6 py-3">No. PO / Tanggal</th>
                  <th className="px-6 py-3">Suplier</th>
                  <th className="px-6 py-3">Item Pesanan</th>
                  {showFinancialColumn && <th className="px-6 py-3">Total Nilai</th>}
                  <th className="px-6 py-3">Jatuh Tempo</th>
                  <th className="px-6 py-3">Sisa Hari</th>
                  <th className="px-6 py-3">Status Bayar (Kas)</th>
                  <th className="px-6 py-3">STATUS ALUR PO</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchaseOrders.map((po) => {
                  const isRead = readPOIds.includes(po.id);
                  const dueInfo = calculatePODueDateInfo(po);
                  const payStatus = getPOPaymentStatusFromCash(po, cashTxs);

                  return (
                    <tr
                      key={po.id}
                      className={`transition-colors ${
                        isRead ? 'bg-white hover:bg-gray-50/80 text-slate-600' : 'bg-blue-50/25 hover:bg-blue-50/50 font-medium'
                      }`}
                    >
                      <td className="px-6 py-3.5">
                        <Link
                          href={`/admin/procurement/${po.id}`}
                          onClick={() => markAsRead(po.id)}
                          className={`font-mono flex items-center gap-1.5 text-sm hover:underline ${
                            isRead ? 'font-normal text-slate-600 hover:text-blue-600' : 'font-extrabold text-blue-700'
                          }`}
                        >
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 inline-block shadow-2xs" title="Belum Dibaca" />
                          )}
                          <span>{po.po_number}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </Link>
                        <div className="text-[11px] text-slate-400">{formatDate(po.order_date)}</div>
                        {po.payment_method && (
                          <span
                            className={`inline-block mt-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                              po.payment_method === 'TUNAI'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {po.payment_method}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-3.5">
                        <div className={`text-slate-800 ${isRead ? 'font-normal' : 'font-bold'}`}>
                          {po.distributor_name}
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        {po.items.map((item, idx) => (
                          <div key={idx}>
                            • {item.product_name} (<span className="font-mono text-emerald-700 font-bold">{formatKg(item.qty_ordered_kg)}</span>)
                          </div>
                        ))}
                      </td>

                      {showFinancialColumn && (
                        <td className="px-6 py-3.5 font-mono">
                          <span className={`text-slate-800 ${isRead ? 'font-medium' : 'font-extrabold'}`}>
                            {formatIDR(po.total_amount)}
                          </span>
                          {po.currency && po.currency !== 'IDR' && (
                            <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                              {po.currency} {((po.foreign_total_amount || (po.total_amount / (po.exchange_rate || 1)))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              <span className="text-slate-400 font-normal"> (@ {formatIDR(po.exchange_rate || 1)})</span>
                            </div>
                          )}
                        </td>
                      )}

                      {/* Kolom Jatuh Tempo */}
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs">
                        <div className="font-medium text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(dueInfo.dueDateStr)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          TOP: {po.payment_terms_days || 30} Hari
                        </div>
                      </td>

                      {/* Kolom Sisa Hari */}
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs">
                        {payStatus.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Lunas Selesai
                          </span>
                        ) : po.status === 'DIBATALKAN' || po.status === 'CANCELLED' ? (
                          <span className="text-slate-400 text-xs">-</span>
                        ) : dueInfo.isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-300 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> {dueInfo.displayText}
                          </span>
                        ) : dueInfo.isDueToday ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" /> Hari Ini
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                            dueInfo.diffDays <= 7
                              ? 'text-amber-800 bg-amber-50 border-amber-200'
                              : 'text-blue-700 bg-blue-50 border-blue-200'
                          }`}>
                            <Clock className="w-3 h-3" /> {dueInfo.displayText}
                          </span>
                        )}
                      </td>

                      {/* Kolom Status Bayar (dari Manajemen Kas) - Interactive Link */}
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs">
                        {payStatus.status === 'PAID' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedPOForPayment(po)}
                            className="text-left group cursor-pointer"
                            title="Klik untuk melihat rincian pembayaran kas"
                          >
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-100/90 hover:bg-emerald-200 px-2.5 py-1 rounded-full border border-emerald-300 transition-colors shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> LUNAS
                            </span>
                            {payStatus.bankName && (
                              <div className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                                <Building2 className="w-3 h-3 text-blue-600" /> {payStatus.bankName}
                              </div>
                            )}
                          </button>
                        ) : payStatus.status === 'PARTIAL' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedPOForPayment(po)}
                            className="text-left group cursor-pointer"
                            title="Klik untuk melanjutkan pembayaran tagihan PO"
                          >
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-full border border-amber-300 transition-colors shadow-2xs">
                              <Clock className="w-3 h-3 text-amber-600" /> SEBAGIAN • Input Bayar &rarr;
                            </span>
                            <div className="text-[10px] text-amber-900 font-mono mt-0.5 group-hover:underline">
                              {formatIDR(payStatus.totalPaid)} / {formatIDR(po.total_amount)}
                            </div>
                          </button>
                        ) : po.status === 'DIBATALKAN' || po.status === 'CANCELLED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                            <XCircle className="w-3 h-3" /> BATAL
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedPOForPayment(po)}
                            className="text-left group cursor-pointer"
                            title="Klik untuk langsung input pembayaran PO ke Manajemen Kas"
                          >
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200 transition-all shadow-2xs group-hover:border-rose-400">
                              <CreditCard className="w-3 h-3 text-rose-500" /> BELUM BAYAR • Input Bayar &rarr;
                            </span>
                            <div className="text-[10px] text-rose-600 font-mono mt-0.5 group-hover:underline">
                              Sisa: {formatIDR(po.total_amount)}
                            </div>
                          </button>
                        )}
                      </td>

                      <td className="px-6 py-3.5">
                        {getPOStatusBadge(po)}
                      </td>

                      <td className="px-6 py-3.5 text-right space-x-2">
                        <Link
                          href={`/admin/procurement/${po.id}`}
                          onClick={() => markAsRead(po.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-sm transition-colors ${
                            isRead
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold'
                              : 'bg-blue-600 hover:bg-blue-700 text-white font-bold'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail PO
                        </Link>

                        <button
                          onClick={() => setPdfModalPO(po)}
                          className="bg-white hover:bg-gray-50 text-blue-700 border border-blue-200 font-semibold text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" /> PDF PO
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <CreatePOModal isOpen={isPOModalOpen} onClose={() => setIsPOModalOpen(false)} distributors={distributors} products={products} onCreatePO={handleCreatePO} />
      <GoodsReceiptModal isOpen={isGRModalOpen} onClose={() => setIsGRModalOpen(false)} po={selectedPO} onReceiveBatch={handleReceiveBatch} />
      <POPDFModal isOpen={!!pdfModalPO} onClose={() => setPdfModalPO(null)} po={pdfModalPO} companyConfig={companySettings} />

      {/* Pay Vendor PO Modal */}
      {selectedPOForPayment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-purple-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <h3 className="font-bold text-base">Input Pembayaran Tagihan Suplier PO</h3>
              </div>
              <button onClick={() => setSelectedPOForPayment(null)} className="text-purple-200 hover:text-white cursor-pointer">
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
                <label className="font-bold text-slate-700 block mb-1">
                  Rekening Bank Sumber Pembayaran (Kas Keluar) <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSourceBankId}
                  onChange={(e) => setSelectedSourceBankId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-purple-500"
                >
                  {bankAccounts.length > 0 ? (
                    bankAccounts.map((b: any, idx: number) => {
                      const cleanBank = (b.bank || 'Bank').toLowerCase();
                      const accId = cleanBank.includes('bca')
                        ? 'acc-bca'
                        : cleanBank.includes('mandiri')
                        ? 'acc-mandiri'
                        : cleanBank.includes('bni')
                        ? 'acc-bni'
                        : `acc-bank-${idx}`;
                      return (
                        <option key={idx} value={accId}>
                          {b.bank} - {b.no} ({b.jenis || 'Rekening Operasional'})
                        </option>
                      );
                    })
                  ) : (
                    <>
                      <option value="acc-bca">Bank Central Asia (BCA) - 882-019-3881</option>
                      <option value="acc-mandiri">Bank Mandiri - 156-00-1928374-1</option>
                      <option value="acc-bni">Bank BNI - 009-445-8876</option>
                    </>
                  )}
                </select>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Dana kas keluar (BKK) akan otomatis memotong saldo rekening bank yang dipilih di atas pada Manajemen Kas.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor Referensi Transfer / Bukti Bayar Bank</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: TRF-BCA-2026-990812"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-purple-500"
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
                  className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmittingPayment ? 'Memproses...' : 'Konfirmasi Pembayaran Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
