'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { CreatePOModal, GoodsReceiptModal } from '@/components/admin/po-modal';
import { POPaymentModal } from '@/components/admin/po-payment-modal';
import { POPDFModal } from '@/components/common/po-pdf-modal';
import { initialPurchaseOrders, initialBatches, initialDistributors, initialProducts } from '@/lib/mock-data';
import { PurchaseOrder, StockBatch, Product, Distributor, CashTransaction, POPaymentRecord } from '@/lib/types';
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
  DollarSign,
  Search,
  RotateCcw,
  Truck,
  Upload,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { exportPurchaseOrdersToXLSX } from '@/lib/export-excel';
import { canUserExportXLSX } from '@/lib/auth';
import DateRangePicker from '@/components/ui/date-range-picker';
import TablePagination from '@/components/ui/table-pagination';
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
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Filter States (Enterprise Grid Theme)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [distributorFilter, setDistributorFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [multiTripOnly, setMultiTripOnly] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentFilter, distributorFilter, startDate, endDate, paymentMethodFilter, multiTripOnly]);

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

    setIsSubmittingPayment(true);
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
        created_by: currentUser?.name || 'Staf Procurement / Finance',
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
            created_by: currentUser?.name || 'Staf Procurement / Finance',
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
      setIsSubmittingPayment(false);
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
        currentUser.allowed_modules.includes('Manajemen Kas') ||
        currentUser.allowed_modules.includes('Finance & Invoice')));

  const showFinancialColumn = canViewFinancials && !isFinancialHidden;

  // Calculate summary figures for PO Financial cards (Consistent with Finance Payables)
  const activePOs = purchaseOrders.filter((po) => po.status !== 'DIBATALKAN' && po.status !== 'CANCELLED');
  const totalSemuaPO = activePOs.reduce((sum, po) => sum + Number(po.total_amount || 0), 0);
  const totalSudahDibayar = activePOs.reduce((sum, po) => sum + Number(po.paid_amount || 0), 0);
  const totalSisaHutang = activePOs.reduce((sum, po) => sum + Math.max(0, Number(po.total_amount || 0) - Number(po.paid_amount || 0)), 0);
  const countPOWithDebt = activePOs.filter(
    (po) => Math.max(0, Number(po.total_amount || 0) - Number(po.paid_amount || 0)) > 0
  ).length;

  // Filtered Purchase Orders
  const filteredPOs = purchaseOrders.filter((po) => {
    // 1. Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchPoNumber = (po.po_number || '').toLowerCase().includes(term);
      const dist = distributors.find((d) => d.id === po.distributor_id);
      const matchDistributor =
        (dist?.name || '').toLowerCase().includes(term) ||
        (po.distributor_id || '').toLowerCase().includes(term);
      const matchItems = (po.items || []).some(
        (item: any) =>
          (item.product_name || '').toLowerCase().includes(term) ||
          (item.product_id || '').toLowerCase().includes(term)
      );

      if (!matchPoNumber && !matchDistributor && !matchItems) {
        return false;
      }
    }

    // 2. Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'BUAT_EMAIL') {
        if (po.status !== 'BUAT_EMAIL') return false;
      } else if (statusFilter === 'DIKIRIM') {
        if (po.status !== 'DIKIRIM') return false;
      } else if (statusFilter === 'DITERIMA') {
        if (po.status !== 'DITERIMA') return false;
      } else if (statusFilter === 'CANCELLED') {
        if (po.status !== 'CANCELLED' && po.status !== 'DIBATALKAN') return false;
      }
    }

    // 3. Payment Filter
    const totalAmount = Number(po.total_amount || 0);
    const paidAmount = Number(po.paid_amount || 0);
    const remaining = Math.max(0, totalAmount - paidAmount);
    const hasDebt = remaining > 0;
    const isLunas = totalAmount > 0 && remaining === 0;

    if (paymentFilter === 'HAS_DEBT' && !hasDebt) return false;
    if (paymentFilter === 'PAID' && !isLunas) return false;

    // 4. Distributor Filter
    if (distributorFilter !== 'ALL') {
      if (po.distributor_id !== distributorFilter) return false;
    }

    // 5. Date Range Filter
    const orderDateStr = (po as any).order_date || (po as any).created_at;
    if (orderDateStr) {
      const dStr = orderDateStr.split('T')[0];
      if (startDate && dStr < startDate) return false;
      if (endDate && dStr > endDate) return false;
    }

    // 6. Payment Method Filter
    if (paymentMethodFilter !== 'ALL' && po.payment_method) {
      if (po.payment_method !== paymentMethodFilter) return false;
    }

    // 7. Multi-Trip Filter
    if (multiTripOnly) {
      const isMulti = (po as any).is_multi_trip || (Array.isArray(po.shipments) && po.shipments.length > 1);
      if (!isMulti) return false;
    }

    return true;
  });

  const countAllPO = purchaseOrders.length;
  const countDiajukanPO = purchaseOrders.filter((p) => p.status === 'BUAT_EMAIL').length;
  const countDikirimPO = purchaseOrders.filter((p) => p.status === 'DIKIRIM').length;
  const countDiterimaPO = purchaseOrders.filter((p) => p.status === 'DITERIMA').length;
  const countCancelledPO = purchaseOrders.filter((p) => p.status === 'CANCELLED' || p.status === 'DIBATALKAN').length;
  const countMultiTripPO = purchaseOrders.filter((p: any) => p.is_multi_trip || (Array.isArray(p.shipments) && p.shipments.length > 1)).length;

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
    setDistributorFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPaymentMethodFilter('ALL');
    setMultiTripOnly(false);
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    statusFilter !== 'ALL' ||
    paymentFilter !== 'ALL' ||
    distributorFilter !== 'ALL' ||
    startDate ||
    endDate ||
    paymentMethodFilter !== 'ALL' ||
    multiTripOnly
  );

  const paginatedPOs = filteredPOs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    const payloadWithCreator = {
      ...newPOData,
      created_by: currentUser?.name || currentUser?.username || 'Admin Procurement',
    };
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithCreator),
      });
      const json = await res.json();
      if (json.success) {
        fetchPurchaseOrders();
        if (autoOpenPDF) {
          setPdfModalPO(json.data);
        }
      } else {
        const createdPO: PurchaseOrder = { ...payloadWithCreator, id: `po-${Date.now()}` };
        setPurchaseOrders([createdPO, ...purchaseOrders]);
        if (autoOpenPDF) {
          setPdfModalPO(createdPO);
        }
      }
    } catch (err) {
      console.warn('Failed to create purchase order:', err);
      const createdPO: PurchaseOrder = { ...payloadWithCreator, id: `po-${Date.now()}` };
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
      return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2.5 py-1 rounded-full font-bold">DIKIRIM</span>;
    }

    switch (po.status) {
      case 'BUAT_EMAIL':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-bold">DIAJUKAN</span>;
      case 'DITERIMA':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold">DITERIMA</span>;
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
              Kelola Pesanan Pembelian dari Suplier.
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

        {/* 3 Summary Cards */}
        {canViewFinancials && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Sisa Hutang Vendor Perlu Dibayar</div>
                <div className="text-xl font-bold font-mono text-purple-700 mt-0.5">
                  {isFinancialHidden ? 'Rp •••••••' : formatIDR(totalSisaHutang)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {countPOWithDebt} PO memiliki sisa hutang
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Total Pembayaran Terbayar (Kas Keluar)</div>
                <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                  {isFinancialHidden ? 'Rp •••••••' : formatIDR(totalSudahDibayar)}
                </div>
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
                <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                  {isFinancialHidden ? 'Rp •••••••' : formatIDR(totalSemuaPO)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {purchaseOrders.length} Total Tagihan PO
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Enterprise Filter Panel (Theme matching reference) */}
        {isFilterOpen ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-5 space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Suplier / Vendor */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Suplier / Vendor</label>
                <div className="relative">
                  <select
                    value={distributorFilter}
                    onChange={(e) => setDistributorFilter(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium pr-8"
                  >
                    <option value="ALL">Pilih suplier</option>
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal</label>
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(start, end) => {
                    setStartDate(start);
                    setEndDate(end);
                  }}
                  placeholder="Pilih rentang tanggal"
                />
              </div>

              {/* Nomor Pesanan / PO / Bibit */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nomor Pesanan</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik nomor PO / bibit"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium pr-8"
                  />
                  {searchTerm ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium pr-8"
                  >
                    <option value="ALL">Pilih status</option>
                    <option value="BUAT_EMAIL">✉️ 1. Diajukan ({countDiajukanPO})</option>
                    <option value="DIKIRIM">🚚 2. Dikirim Vendor ({countDikirimPO})</option>
                    <option value="DITERIMA">📦 3. Diterima Gudang ({countDiterimaPO})</option>
                    <option value="CANCELLED">🔴 Dibatalkan ({countCancelledPO})</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tipe Pengiriman Multi-Trip */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipe Pengiriman</label>
                <div className="relative">
                  <select
                    value={multiTripOnly ? 'MULTI_TRIP' : 'ALL'}
                    onChange={(e) => setMultiTripOnly(e.target.value === 'MULTI_TRIP')}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium pr-8"
                  >
                    <option value="ALL">Pilih tipe pengiriman</option>
                    <option value="MULTI_TRIP">🚛 Multi-Trip / Parsial ({countMultiTripPO})</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Status Hutang */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status Hutang</label>
                <div className="relative">
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium pr-8"
                  >
                    <option value="ALL">Pilih status hutang</option>
                    <option value="HAS_DEBT">⚠️ Ada Sisa Hutang (Perlu Bayar)</option>
                    <option value="PAID">✅ Lunas Terbayar (BKK)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Metode Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Metode Pembayaran</label>
                <div className="relative">
                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium pr-8"
                  >
                    <option value="ALL">Pilih metode pembayaran</option>
                    <option value="TUNAI">TUNAI / CASH</option>
                    <option value="TEMPO">TEMPO / TERMIN VENDOR</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Bottom Action Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Tutup Semua Filter
              </button>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                {canUserExportXLSX(currentUser) && (
                  <button
                    type="button"
                    onClick={() => exportPurchaseOrdersToXLSX(filteredPOs)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" /> Ekspor
                  </button>
                )}

                <span className="text-gray-300">|</span>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>

                <button
                  type="button"
                  onClick={() => {}}
                  className="text-xs font-bold text-blue-600 border border-blue-500 hover:bg-blue-50 hover:border-blue-600 px-8 py-2 rounded-lg transition-all shadow-2xs cursor-pointer"
                >
                  Cari
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-all"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Buka Panel Filter
              </button>
              {hasActiveFilters && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
                  Filter Aktif ({filteredPOs.length} dari {purchaseOrders.length} PO)
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        )}

        {/* PO Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-700">Daftar Purchase Order</h2>
            </div>
            <div className="flex items-center gap-3">
              {canUserExportXLSX(currentUser) && (
                <button
                  onClick={() => exportPurchaseOrdersToXLSX(filteredPOs)}
                  className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-semibold border border-emerald-300 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                  title="Ekspor ke Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Ekspor XLSX
                </button>
              )}
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
              <span className="text-xs text-slate-400 font-medium">
                {filteredPOs.length} dari {purchaseOrders.length} PO
              </span>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={showFinancialColumn ? 8 : 7} className="px-6 py-12 text-center text-slate-400 text-sm">
                      {purchaseOrders.length === 0 ? (
                        'Belum ada Purchase Order dibuat.'
                      ) : (
                        <div className="space-y-2">
                          <div>Tidak ada Purchase Order yang sesuai dengan kriteria filter &amp; pencarian.</div>
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset Semua Filter
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : paginatedPOs.map((po) => {
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
                        {(() => {
                          const total = Number(po.total_amount || 0);
                          const paid = Number(po.paid_amount || 0);
                          const remaining = Math.max(0, total - paid);
                          const isCancelled = po.status === 'DIBATALKAN' || po.status === 'CANCELLED';
                          const isFullyPaid = !isCancelled && (remaining === 0 && total > 0);
                          const isPartial = !isCancelled && (paid > 0 && !isFullyPaid);

                          if (isCancelled) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                                <XCircle className="w-3 h-3" /> BATAL
                              </span>
                            );
                          }

                          if (isFullyPaid) {
                            return (
                              <button
                                type="button"
                                onClick={() => setSelectedPOForPayment(po)}
                                className="text-left group cursor-pointer"
                                title="Klik untuk melihat rincian pembayaran kas"
                              >
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-100/90 hover:bg-emerald-200 px-2.5 py-1 rounded-full border border-emerald-300 transition-colors shadow-2xs">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> LUNAS
                                </span>
                                {po.payment_bank_name && (
                                  <div className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                                    <Building2 className="w-3 h-3 text-blue-600" /> {po.payment_bank_name}
                                  </div>
                                )}
                              </button>
                            );
                          }

                          if (isPartial) {
                            return (
                              <button
                                type="button"
                                onClick={() => setSelectedPOForPayment(po)}
                                className="text-left group cursor-pointer"
                                title="Klik untuk melanjutkan pembayaran tagihan PO"
                              >
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-full border border-amber-300 transition-colors shadow-2xs">
                                  <Clock className="w-3 h-3 text-amber-600" /> SEBAGIAN • Cicil &rarr;
                                </span>
                                <div className="text-[10px] text-amber-900 font-mono mt-0.5 group-hover:underline">
                                  {formatIDR(paid)} / {formatIDR(total)}
                                </div>
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => setSelectedPOForPayment(po)}
                              className="text-left group cursor-pointer"
                              title="Klik untuk langsung input pembayaran PO ke Manajemen Kas"
                            >
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200 transition-all shadow-2xs group-hover:border-rose-400">
                                <CreditCard className="w-3 h-3 text-rose-500" /> BELUM BAYAR • Bayar &rarr;
                              </span>
                              <div className="text-[10px] text-rose-600 font-mono mt-0.5 group-hover:underline">
                                Sisa: {formatIDR(total)}
                              </div>
                            </button>
                          );
                        })()}
                      </td>

                      <td className="px-6 py-3.5">
                        {getPOStatusBadge(po)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="px-6 py-2 border-t border-gray-200 bg-gray-50/50">
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredPOs.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      </main>

      <CreatePOModal isOpen={isPOModalOpen} onClose={() => setIsPOModalOpen(false)} distributors={distributors} products={products} onCreatePO={handleCreatePO} />
      <GoodsReceiptModal isOpen={isGRModalOpen} onClose={() => setIsGRModalOpen(false)} po={selectedPO} onReceiveBatch={handleReceiveBatch} />
      <POPDFModal isOpen={!!pdfModalPO} onClose={() => setPdfModalPO(null)} po={pdfModalPO} companyConfig={companySettings} />

      {/* POPaymentModal */}
      <POPaymentModal
        isOpen={!!selectedPOForPayment}
        onClose={() => setSelectedPOForPayment(null)}
        po={selectedPOForPayment}
        onConfirmPayment={handleConfirmPOPayment}
        isSubmitting={isSubmittingPayment}
      />
    </div>
  );
}
