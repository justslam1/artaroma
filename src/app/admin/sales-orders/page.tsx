'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { getStoredOrders, saveStoredOrders, getStoredInvoices, saveStoredInvoices } from '@/lib/order-store';
import { SalesOrder, Customer, Invoice, InvoicePaymentRecord, CashTransaction } from '@/lib/types';
import { initialCustomers } from '@/lib/mock-data';
import { formatIDR, formatKg, formatDate } from '@/lib/utils';
import {
  FileText,
  Eye,
  EyeOff,
  Lock,
  ExternalLink,
  ShoppingCart,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Building2,
  XCircle,
  DollarSign,
  Search,
  Users,
  RotateCcw,
  X,
  Upload,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { exportSalesOrdersToXLSX } from '@/lib/export-excel';
import { canUserExportXLSX } from '@/lib/auth';
import { VerifyPaymentModal, UploadTaxInvoiceModal } from '@/components/admin/finance-modal';
import DateRangePicker from '@/components/ui/date-range-picker';
import {
  getStoredCashAccounts,
  getStoredCashTransactions,
  recordCashTransaction,
  calculateSODueDateInfo,
  getSOPaymentStatusFromCash,
} from '@/lib/cash-store';

export default function SalesOrdersPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFinancialHidden, setIsFinancialHidden] = useState(false);
  const [readOrderIds, setReadOrderIds] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cashTxs, setCashTxs] = useState<CashTransaction[]>([]);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [selectedInvoiceForTax, setSelectedInvoiceForTax] = useState<Invoice | null>(null);

  const handleUploadTaxInvoice = (invoiceId: string, pdfUrl: string) => {
    const updated = invoices.map((inv) =>
      inv.id === invoiceId ? { ...inv, faktur_pajak_file_url: pdfUrl } : inv
    );
    setInvoices(updated);
    saveStoredInvoices(updated);
  };

  const handleOpenTaxForSO = (so: SalesOrder) => {
    let inv = invoices.find((i) => i.so_id === so.id || i.so_number === so.so_number);
    if (!inv) {
      const soTotal = Number(so.grand_total || so.total_goods_amount || 0);
      const cleanNum = (so.so_number || '').replace(/[^0-9]/g, '') || String(Math.floor(100 + Math.random() * 900));
      inv = {
        id: (so as any).invoice_id || `inv-${so.id}`,
        invoice_number: `INV-2026-${cleanNum}`,
        so_id: so.id,
        so_number: so.so_number,
        customer_id: so.customer_id,
        customer_name: (so as any).customer_company || so.customer_name || '',
        status: 'UNPAID',
        issue_date: so.order_date || new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        total_amount: soTotal,
        paid_amount: 0,
      };
    }
    setSelectedInvoiceForTax(inv);
  };

  // Filter States (Enterprise Grid Theme)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [shippingTypeFilter, setShippingTypeFilter] = useState<string>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');

  const syncFinanceData = () => {
    setInvoices(getStoredInvoices());
    setCashTxs(getStoredCashTransactions());
  };

  useEffect(() => {
    syncFinanceData();
    const handleFinanceUpdate = () => syncFinanceData();
    window.addEventListener('artaroma_invoices_updated', handleFinanceUpdate);
    window.addEventListener('artaroma_cash_updated', handleFinanceUpdate);
    return () => {
      window.removeEventListener('artaroma_invoices_updated', handleFinanceUpdate);
      window.removeEventListener('artaroma_cash_updated', handleFinanceUpdate);
    };
  }, []);

  const handleOpenPaymentForSO = (so: SalesOrder) => {
    const currentInvs = getStoredInvoices();
    let targetInv = currentInvs.find((i) => i.so_id === so.id || i.so_number === so.so_number);
    if (!targetInv) {
      const cleanNum = so.so_number.replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000);
      targetInv = {
        id: `inv-${so.id}`,
        invoice_number: `INV-2026-${cleanNum}`,
        so_id: so.id,
        so_number: so.so_number,
        customer_id: so.customer_id,
        customer_name: (so as any).customer_company || so.customer_name || 'Customer B2B',
        status: 'UNPAID',
        issue_date: so.order_date || new Date().toISOString().split('T')[0],
        due_date: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          return d.toISOString().split('T')[0];
        })(),
        total_amount: Number((so as any).grand_total || (so as any).total_goods_amount || 0),
        paid_amount: 0,
        payment_proof_url: (so as any).payment_proof_url,
        payment_verification_status: (so as any).payment_proof_url ? 'PENDING' : undefined,
      };
    } else if ((so as any).payment_proof_url && !targetInv.payment_proof_url) {
      targetInv = {
        ...targetInv,
        payment_proof_url: (so as any).payment_proof_url,
        payment_verification_status: targetInv.payment_verification_status || 'PENDING',
      };
    }
    setSelectedInvoiceForPayment(targetInv);
  };

  const handleVerifyPayment = (
    invoiceId: string,
    status: 'VERIFIED' | 'REJECTED',
    newPaymentAmount?: number,
    paymentNotes?: string,
    paymentDate?: string,
    paymentProofUrl?: string,
    targetAccountId?: string,
    targetBankName?: string
  ) => {
    const currentInvs = getStoredInvoices();
    const updatedInvoices = currentInvs.map((inv) => {
      if (inv.id !== invoiceId && inv.invoice_number !== selectedInvoiceForPayment?.invoice_number) return inv;

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
        bank_account_id: targetAccountId,
        bank_name: targetBankName,
        payment_proof_url: paymentProofUrl || inv.payment_proof_url,
        payment_notes: paymentNotes || inv.payment_notes,
        verified_by: currentUser?.name || currentUser?.username || 'Staf Finance',
        created_at: new Date().toISOString(),
      };

      const existingHistory = Array.isArray(inv.payment_history) ? inv.payment_history : [];

      // Auto-record BKM to Kas Besar (Treasury)
      try {
        const cashAccounts = getStoredCashAccounts();
        const selectedAcc = cashAccounts.find((a) => a.id === targetAccountId) || cashAccounts.find((a) => a.id === 'acc-bca') || cashAccounts[0];
        if (incomingPayment > 0 && selectedAcc) {
          recordCashTransaction({
            account_id: selectedAcc.id,
            account_name: selectedAcc.name,
            tx_type: 'IN',
            category: 'PENJUALAN_SO',
            amount: incomingPayment,
            date: payDate,
            recipient_or_payer: inv.customer_name || 'Customer B2B',
            reference_number: `${inv.invoice_number || 'INV'} / ${inv.so_number || 'SO'}`,
            notes: paymentNotes || `Pelunasan piutang invoice ${inv.invoice_number || ''} via ${targetBankName || selectedAcc.name}`,
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

    // If it was a new invoice not in store yet
    if (!currentInvs.some((i) => i.id === invoiceId || i.invoice_number === selectedInvoiceForPayment?.invoice_number) && selectedInvoiceForPayment) {
      const incomingPayment = newPaymentAmount !== undefined ? Number(newPaymentAmount) : Number(selectedInvoiceForPayment.total_amount);
      const isFullyPaid = incomingPayment >= Number(selectedInvoiceForPayment.total_amount);
      const payDate = paymentDate || new Date().toISOString().split('T')[0];

      const newInvRecord: Invoice = {
        ...selectedInvoiceForPayment,
        paid_amount: incomingPayment,
        status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
        payment_verification_status: 'VERIFIED',
        last_payment_date: payDate,
        payment_history: [
          {
            id: `pay-${Date.now()}`,
            payment_date: payDate,
            amount: incomingPayment,
            remaining_after: Math.max(0, Number(selectedInvoiceForPayment.total_amount) - incomingPayment),
            bank_account_id: targetAccountId,
            bank_name: targetBankName,
            payment_proof_url: paymentProofUrl,
            payment_notes: paymentNotes,
            verified_by: currentUser?.name || 'Staf Finance',
            created_at: new Date().toISOString(),
          },
        ],
      };
      updatedInvoices.unshift(newInvRecord);

      // Record BKM
      try {
        const cashAccounts = getStoredCashAccounts();
        const selectedAcc = cashAccounts.find((a) => a.id === targetAccountId) || cashAccounts.find((a) => a.id === 'acc-bca') || cashAccounts[0];
        if (incomingPayment > 0 && selectedAcc) {
          recordCashTransaction({
            account_id: selectedAcc.id,
            account_name: selectedAcc.name,
            tx_type: 'IN',
            category: 'PENJUALAN_SO',
            amount: incomingPayment,
            date: payDate,
            recipient_or_payer: newInvRecord.customer_name || 'Customer B2B',
            reference_number: `${newInvRecord.invoice_number || 'INV'} / ${newInvRecord.so_number || 'SO'}`,
            notes: paymentNotes || `Pelunasan piutang invoice ${newInvRecord.invoice_number} via ${targetBankName || selectedAcc.name}`,
            proof_url: paymentProofUrl,
            created_by: currentUser?.name || 'Staf Finance',
            status: 'VERIFIED',
          });
        }
      } catch (e) {}
    }

    setInvoices(updatedInvoices);
    saveStoredInvoices(updatedInvoices);
    syncFinanceData();
    fetchOrders();
    setSelectedInvoiceForPayment(null);
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('artaroma_read_so_ids');
      if (stored) {
        setReadOrderIds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const markAsRead = (id: string) => {
    if (!readOrderIds.includes(id)) {
      const updated = [...readOrderIds, id];
      setReadOrderIds(updated);
      try {
        localStorage.setItem('artaroma_read_so_ids', JSON.stringify(updated));
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
      .catch((err) => console.warn('Failed to load user info in sales orders:', err));

    fetch('/api/customers', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCustomers(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load customers in sales orders:', err));
  }, []);

  // Determine financial permission: Super Admin or has 'Lihat Nilai Finansial (PO/SO)' or 'Finance & Invoice'
  const canViewFinancials =
    currentUser?.is_super_admin ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'FINANCE' ||
    currentUser?.role === 'SALES' ||
    (Array.isArray(currentUser?.allowed_modules) &&
      (currentUser.allowed_modules.includes('Lihat Nilai Finansial (PO/SO)') ||
        currentUser.allowed_modules.includes('Manajemen Kas') ||
        currentUser.allowed_modules.includes('Finance & Invoice')));

  const showFinancialColumn = canViewFinancials && !isFinancialHidden;

  // Calculate summary figures for Sales Orders financial cards (Active SOs only)
  const activeSOs = salesOrders.filter((so: any) => so.status !== 'DIBATALKAN' && so.status !== 'CANCELLED');
  const totalSemuaSO = activeSOs.reduce(
    (sum, so: any) => sum + Number(so.grand_total || so.total_goods_amount || so.total_amount || 0),
    0
  );

  // SOs that have reached the confirmation stage (Tahap "Konfirmasi" dan seterusnya)
  const confirmedSOs = salesOrders.filter((so: any) => 
    so.status !== 'DIAJUKAN' && 
    so.status !== 'PENDING_APPROVAL' && 
    so.status !== 'DIBATALKAN' && 
    so.status !== 'CANCELLED'
  );

  const totalSudahDibayar = activeSOs.reduce((sum, so: any) => {
    const inv = invoices.find((i) => i.so_id === so.id || i.so_number === so.so_number);
    const paid = inv ? Number(inv.paid_amount || 0) : Number(so.paid_amount || 0);
    return sum + paid;
  }, 0);

  // Aturan Piutang: SO masuk ke dalam kartu "Sisa Piutang Customer Perlu Ditagih" ketika di tahap "Konfirmasi" (dan seterusnya)
  const totalSisaPiutang = confirmedSOs.reduce((sum, so: any) => {
    const soTotal = Number(so.grand_total || so.total_goods_amount || so.total_amount || 0);
    const inv = invoices.find((i) => i.so_id === so.id || i.so_number === so.so_number);
    const paid = inv ? Number(inv.paid_amount || 0) : Number(so.paid_amount || 0);
    return sum + Math.max(0, soTotal - paid);
  }, 0);

  const countSOWithPiutang = confirmedSOs.filter((so: any) => {
    const soTotal = Number(so.grand_total || so.total_goods_amount || so.total_amount || 0);
    const inv = invoices.find((i) => i.so_id === so.id || i.so_number === so.so_number);
    const paid = inv ? Number(inv.paid_amount || 0) : Number(so.paid_amount || 0);
    return Math.max(0, soTotal - paid) > 0;
  }).length;

  // Filtered Sales Orders
  const filteredOrders = salesOrders.filter((so) => {
    // 1. Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchSoNumber = (so.so_number || '').toLowerCase().includes(term);
      const matchCustomer =
        ((so as any).customer_company || '').toLowerCase().includes(term) ||
        (so.customer_name || '').toLowerCase().includes(term);
      const matchSuratJalan = (so.surat_jalan_number || '').toLowerCase().includes(term);
      const matchItems = (so.items || []).some(
        (item: any) =>
          (item.product_name || '').toLowerCase().includes(term) ||
          (item.product_sku || '').toLowerCase().includes(term)
      );

      if (!matchSoNumber && !matchCustomer && !matchSuratJalan && !matchItems) {
        return false;
      }
    }

    // 2. Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'DIAJUKAN') {
        if (so.status !== 'DIAJUKAN' && so.status !== 'PENDING_APPROVAL') return false;
      } else if (statusFilter === 'DIKONFIRMASI') {
        if (so.status !== 'DIKONFIRMASI') return false;
      } else if (statusFilter === 'PROSES_GUDANG') {
        if (so.status !== 'PROSES_GUDANG') return false;
      } else if (statusFilter === 'DIKIRIM') {
        if (so.status !== 'DIKIRIM') return false;
      } else if (statusFilter === 'DITERIMA') {
        if (so.status !== 'DITERIMA') return false;
      } else if (statusFilter === 'CANCELLED') {
        if (so.status !== 'CANCELLED' && (so.status as any) !== 'DIBATALKAN') return false;
      }
    }

    // 3. Payment Filter
    const soTotal = Number((so as any).grand_total || (so as any).total_goods_amount || (so as any).total_amount || 0);
    const inv = invoices.find((i) => i.so_id === so.id || i.so_number === so.so_number);
    const paid = inv ? Number(inv.paid_amount || 0) : Number((so as any).paid_amount || 0);
    const remaining = Math.max(0, soTotal - paid);
    const isLunas = soTotal > 0 && remaining === 0;
    const isOverdue = inv?.due_date && new Date(inv.due_date).getTime() < new Date().setHours(0, 0, 0, 0) && remaining > 0;

    if (paymentFilter === 'UNPAID_OR_PARTIAL' && isLunas) return false;
    if (paymentFilter === 'PAID' && !isLunas) return false;
    if (paymentFilter === 'OVERDUE' && !isOverdue) return false;

    // 4. Customer Filter
    if (customerFilter !== 'ALL') {
      if (
        so.customer_id !== customerFilter &&
        so.customer_name !== customerFilter &&
        (so as any).customer_company !== customerFilter
      ) {
        return false;
      }
    }

    // 5. Date Range Filter
    if (so.order_date) {
      const orderDateStr = so.order_date.split('T')[0];
      if (startDate && orderDateStr < startDate) return false;
      if (endDate && orderDateStr > endDate) return false;
    }

    // 6. Shipping Type Filter
    if (shippingTypeFilter !== 'ALL') {
      if (so.shipping_type !== shippingTypeFilter) return false;
    }

    // 7. Payment Method Filter
    if (paymentMethodFilter !== 'ALL') {
      const pm = String(so.payment_method || '').toUpperCase();
      if (paymentMethodFilter === 'TUNAI' && !pm.includes('TUNAI') && !pm.includes('TRANSFER')) return false;
      if (paymentMethodFilter === 'TEMPO' && !pm.includes('TEMPO') && !pm.includes('KREDIT')) return false;
    }

    return true;
  });

  const countAll = salesOrders.length;
  const countDiajukan = salesOrders.filter((s) => s.status === 'DIAJUKAN' || s.status === 'PENDING_APPROVAL').length;
  const countDikonfirmasi = salesOrders.filter((s) => s.status === 'DIKONFIRMASI').length;
  const countProsesGudang = salesOrders.filter((s) => s.status === 'PROSES_GUDANG').length;
  const countDikirim = salesOrders.filter((s) => s.status === 'DIKIRIM').length;
  const countDiterima = salesOrders.filter((s) => s.status === 'DITERIMA').length;
  const countCancelled = salesOrders.filter((s) => s.status === 'CANCELLED' || (s.status as any) === 'DIBATALKAN').length;

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
    setCustomerFilter('ALL');
    setStartDate('');
    setEndDate('');
    setShippingTypeFilter('ALL');
    setPaymentMethodFilter('ALL');
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    statusFilter !== 'ALL' ||
    paymentFilter !== 'ALL' ||
    customerFilter !== 'ALL' ||
    startDate ||
    endDate ||
    shippingTypeFilter !== 'ALL' ||
    paymentMethodFilter !== 'ALL'
  );

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sales-orders', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Ensure each order has an items array and sort newest first
        const normalized = json.data.map((so: any) => ({
          ...so,
          items: Array.isArray(so.items) ? so.items : [],
        }));
        normalized.sort((a: any, b: any) => {
          const timeA = a.order_date ? new Date(a.order_date).getTime() : 0;
          const timeB = b.order_date ? new Date(b.order_date).getTime() : 0;
          return timeB - timeA;
        });
        setSalesOrders(normalized);
        saveStoredOrders(normalized, false);
      } else {
        const stored = getStoredOrders();
        stored.sort((a: any, b: any) => {
          const timeA = a.order_date ? new Date(a.order_date).getTime() : 0;
          const timeB = b.order_date ? new Date(b.order_date).getTime() : 0;
          return timeB - timeA;
        });
        setSalesOrders(stored);
      }
    } catch (err) {
      console.warn('Failed to fetch sales orders from MySQL, fallback to local:', err);
      setSalesOrders(getStoredOrders());
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOrders();
    const handleUpdate = () => fetchOrders();
    window.addEventListener('artaroma_orders_updated', handleUpdate);
    return () => window.removeEventListener('artaroma_orders_updated', handleUpdate);
  }, []);

  const getStatusBadge = (status: SalesOrder['status']) => {
    switch (status) {
      case 'DIAJUKAN':
      case 'PENDING_APPROVAL':
        return <span className="bg-amber-50 text-amber-800 border border-amber-300 text-xs px-3 py-1 rounded-full font-extrabold uppercase">DIAJUKAN</span>;
      case 'DIKONFIRMASI':
        return <span className="bg-blue-50 text-blue-800 border border-blue-300 text-xs px-3 py-1 rounded-full font-extrabold uppercase">DIKONFIRMASI</span>;
      case 'DIBAYAR':
        return <span className="bg-purple-50 text-purple-700 border border-purple-300 text-xs px-3 py-1 rounded-full font-bold uppercase">DIBAYAR</span>;
      case 'PROSES_GUDANG':
        return <span className="bg-indigo-50 text-indigo-800 border border-indigo-300 text-xs px-3 py-1 rounded-full font-extrabold uppercase">PROSES GUDANG</span>;
      case 'DIKIRIM':
        return <span className="bg-teal-50 text-teal-800 border border-teal-300 text-xs px-3 py-1 rounded-full font-extrabold uppercase">DIKIRIM</span>;
      case 'DITERIMA':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs px-3 py-1 rounded-full font-extrabold uppercase">DITERIMA</span>;
      case 'CANCELLED':
      case 'DIBATALKAN' as any:
        return <span className="bg-red-50 text-red-800 border border-red-300 text-xs px-3 py-1 rounded-full font-extrabold uppercase">DIBATALKAN</span>;
      default:
        return <span className="bg-gray-50 text-gray-700 border border-gray-300 text-xs px-3 py-1 rounded-full font-extrabold uppercase">{String(status).replace('_', ' ')}</span>;
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
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              Sales Order
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Daftar Pesanan Penjualan dari Customer.
            </p>
          </div>
          {canUserExportXLSX(currentUser) && (
            <button
              onClick={() => exportSalesOrdersToXLSX(salesOrders)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
              title="Ekspor Seluruh Sales Orders ke File Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" /> Ekspor ke XLSX
            </button>
          )}
        </div>

        {/* 3 Summary Cards */}
        {canViewFinancials && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Sisa Piutang Customer Perlu Ditagih</div>
                <div className="text-xl font-bold font-mono text-purple-700 mt-0.5">
                  {isFinancialHidden ? 'Rp •••••••' : formatIDR(totalSisaPiutang)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {countSOWithPiutang} SO terkonfirmasi memiliki sisa piutang
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Total Pembayaran Diterima (Kas Masuk)</div>
                <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                  {isFinancialHidden ? 'Rp •••••••' : formatIDR(totalSudahDibayar)}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                  Tercatat otomatis di Buku Kas Besar (BKM)
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Total Nilai Penjualan (Omset SO)</div>
                <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                  {isFinancialHidden ? 'Rp •••••••' : formatIDR(totalSemuaSO)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {activeSOs.length} Total Pesanan Sales Order
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Enterprise Filter Panel (Theme matching reference) */}
        {isFilterOpen ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-5 space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Customer */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Customer</label>
                <div className="relative">
                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium pr-8"
                  >
                    <option value="ALL">Pilih customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name || (c as any).name || (c as any).pic_name}
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

              {/* Nomor Pesanan / Search */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nomor Pesanan</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik nomor pesanan / aroma"
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
                    <option value="DIAJUKAN">🟡 Diajukan ({countDiajukan})</option>
                    <option value="DIKONFIRMASI">🔵 Dikonfirmasi ({countDikonfirmasi})</option>
                    <option value="PROSES_GUDANG">📦 Proses Gudang ({countProsesGudang})</option>
                    <option value="DIKIRIM">🚚 Dikirim ({countDikirim})</option>
                    <option value="DITERIMA">🟢 Selesai / Diterima ({countDiterima})</option>
                    <option value="CANCELLED">🔴 Dibatalkan ({countCancelled})</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tipe Pengiriman */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipe Pengiriman</label>
                <div className="relative">
                  <select
                    value={shippingTypeFilter}
                    onChange={(e) => setShippingTypeFilter(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium pr-8"
                  >
                    <option value="ALL">Pilih tipe pengiriman</option>
                    <option value="FRANCO">FRANCO (Ongkir Ditanggung Penjual)</option>
                    <option value="LOCO">LOCO (Ongkir Ditanggung Pembeli)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Status Pembayaran (Kas) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status Pembayaran</label>
                <div className="relative">
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium pr-8"
                  >
                    <option value="ALL">Pilih status bayar</option>
                    <option value="UNPAID_OR_PARTIAL">⚠️ Belum Lunas (Ada Sisa Piutang)</option>
                    <option value="PAID">✅ Lunas (Kas Masuk BKM)</option>
                    <option value="OVERDUE">🚨 Lewat Jatuh Tempo (Overdue)</option>
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
                    <option value="TUNAI">TUNAI / TRANSFER BANK</option>
                    <option value="TEMPO">TEMPO / TERMIN B2B</option>
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
                    onClick={() => exportSalesOrdersToXLSX(filteredOrders)}
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
                  Filter Aktif ({filteredOrders.length} dari {salesOrders.length} Pesanan)
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

        {/* Sales Orders List Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-700">Daftar Sales Order (SO)</h2>
            </div>
            <div className="flex items-center gap-3">
              {canUserExportXLSX(currentUser) && (
                <button
                  onClick={() => exportSalesOrdersToXLSX(filteredOrders)}
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
                  title={isFinancialHidden ? "Tampilkan Kolom Nilai Tagihan" : "Sembunyikan Kolom Nilai Tagihan"}
                >
                  {isFinancialHidden ? (
                    <EyeOff className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}
              <span className="text-xs text-slate-400 font-medium">
                {isLoading ? 'Memuat...' : `${filteredOrders.length} dari ${salesOrders.length} Pesanan`}
              </span>
              <button
                onClick={fetchOrders}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                  <th className="px-6 py-3">No. SO / Tanggal</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Item Dipesan</th>
                  {showFinancialColumn && <th className="px-6 py-3">Total Nilai</th>}
                  <th className="px-6 py-3">Jatuh Tempo</th>
                  <th className="px-6 py-3">Sisa Hari</th>
                  <th className="px-6 py-3">Status Bayar (Kas)</th>
                  <th className="px-6 py-3">STATUS ALUR SO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={showFinancialColumn ? 8 : 7} className="px-6 py-12 text-center text-slate-400 text-sm">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                      Memuat data pesanan dari database...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={showFinancialColumn ? 8 : 7} className="px-6 py-12 text-center text-slate-400 text-sm">
                      {salesOrders.length === 0 ? (
                        'Belum ada Sales Order masuk. Pesanan dari Customer akan muncul di sini.'
                      ) : (
                        <div className="space-y-2">
                          <div>Tidak ada Sales Order yang sesuai dengan kriteria filter &amp; pencarian.</div>
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
                ) : filteredOrders.map((so) => {
                  const isRead = readOrderIds.includes(so.id);
                  const matchingInv = invoices.find((i) => i.so_id === so.id || i.so_number === so.so_number);
                  const dueInfo = calculateSODueDateInfo(so, matchingInv);
                  const payStatus = getSOPaymentStatusFromCash(so, matchingInv, cashTxs);

                  return (
                    <tr
                      key={so.id}
                      className={`transition-colors ${
                        isRead ? 'bg-white hover:bg-gray-50/80 text-slate-600' : 'bg-blue-50/25 hover:bg-blue-50/50 font-medium'
                      }`}
                    >
                      <td className="px-6 py-3.5">
                        <Link
                          href={`/admin/orders/${so.id}`}
                          onClick={() => markAsRead(so.id)}
                          className={`font-mono flex items-center gap-1.5 text-sm hover:underline ${
                            isRead ? 'font-normal text-slate-600 hover:text-blue-600' : 'font-extrabold text-blue-700'
                          }`}
                        >
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 inline-block shadow-2xs" title="Belum Dibaca" />
                          )}
                          <span>{so.so_number}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </Link>
                        <div className="text-[11px] text-slate-400">
                          {so.order_date ? new Date(so.order_date).toLocaleString('id-ID') : '-'}
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <div className={`text-slate-800 ${isRead ? 'font-normal' : 'font-bold'}`}>
                          {so.customer_company || so.customer_name || so.customer_id}
                        </div>
                        <div className="text-xs text-slate-400">PIC: {so.customer_name || '-'}</div>
                      </td>

                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        {(so.items ?? []).length === 0 ? (
                          <span className="text-slate-400 italic">Memuat item...</span>
                        ) : (so.items ?? []).map((item, idx) => (
                          <div key={idx}>
                            • {item.product_name} (<span className="font-mono text-emerald-700 font-bold">{formatKg(item.qty_kg)}</span>)
                          </div>
                        ))}
                      </td>

                      {showFinancialColumn && (
                        <td className="px-6 py-3.5 font-mono">
                          {so.grand_total ? (
                            <>
                              <div className={`text-slate-800 ${isRead ? 'font-medium' : 'font-extrabold'}`}>{formatIDR(so.grand_total)}</div>
                              <div className="text-[10px] font-sans font-semibold text-slate-400 mt-0.5">
                                {so.shipping_type === 'LOCO' ? (
                                  <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                    LOCO (+{formatIDR(so.shipping_cost || 0)})
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    FRANCO (Gratis)
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <span className="text-amber-600 italic font-sans text-xs">Menunggu Konfirmasi Admin</span>
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
                          {so.payment_method === 'LUNAS_TRANSFER' ? 'Transfer Lunas' : 'TOP: 30 Hari'}
                        </div>
                      </td>

                      {/* Kolom Sisa Hari */}
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs">
                        {payStatus.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Lunas Selesai
                          </span>
                        ) : so.status === 'CANCELLED' || (so as any).status === 'DIBATALKAN' ? (
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
                            onClick={() => handleOpenPaymentForSO(so)}
                            className="text-left group cursor-pointer"
                            title="Klik untuk melihat riwayat penerimaan kas"
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
                            onClick={() => handleOpenPaymentForSO(so)}
                            className="text-left group cursor-pointer"
                            title="Klik untuk input cicilan / sisa pelunasan invoice"
                          >
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-full border border-amber-300 transition-colors shadow-2xs">
                              <Clock className="w-3 h-3 text-amber-600" /> SEBAGIAN • Input Bayar &rarr;
                            </span>
                            <div className="text-[10px] text-amber-900 font-mono mt-0.5 group-hover:underline">
                              {formatIDR(payStatus.totalPaid)} / {formatIDR(so.grand_total || (so as any).total_goods_amount || 0)}
                            </div>
                            {(matchingInv?.payment_proof_url || (so as any).payment_proof_url) && (
                              <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 font-semibold flex items-center gap-1 w-max">
                                <Upload className="w-3 h-3 text-amber-600 animate-pulse" /> Bukti Transfer Masuk
                              </div>
                            )}
                          </button>
                        ) : so.status === 'CANCELLED' || (so as any).status === 'DIBATALKAN' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                            <XCircle className="w-3 h-3" /> BATAL
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentForSO(so)}
                            className="text-left group cursor-pointer"
                            title="Klik untuk langsung input verifikasi pembayaran masuk ke Manajemen Kas"
                          >
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200 transition-all shadow-2xs group-hover:border-rose-400">
                              <CreditCard className="w-3 h-3 text-rose-500" /> BELUM BAYAR • Input Bayar &rarr;
                            </span>
                            <div className="text-[10px] text-rose-600 font-mono mt-0.5 group-hover:underline">
                              Sisa: {formatIDR(so.grand_total || (so as any).total_goods_amount || 0)}
                            </div>
                            {(matchingInv?.payment_proof_url || (so as any).payment_proof_url) && (
                              <div className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 mt-1 font-semibold flex items-center gap-1 w-max animate-pulse">
                                <Upload className="w-3 h-3 text-blue-600" /> Bukti Transfer Masuk
                              </div>
                            )}
                          </button>
                        )}

                        {/* Faktur Pajak Action */}
                        <div className="mt-1.5 pt-1 border-t border-dashed border-gray-200">
                          {matchingInv?.faktur_pajak_file_url ? (
                            <a
                              href={matchingInv.faktur_pajak_file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md inline-flex items-center gap-1 transition-colors"
                              title="Lihat / Download Faktur Pajak PDF"
                            >
                              <FileText className="w-3 h-3 text-emerald-600" /> Faktur Pajak PDF
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenTaxForSO(so)}
                              className="text-[10px] font-semibold text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 px-2 py-0.5 rounded-md inline-flex items-center gap-1 transition-all cursor-pointer"
                              title="Unggah berkas PDF Faktur Pajak untuk pesanan ini"
                            >
                              <Upload className="w-3 h-3 text-slate-400" /> + Faktur Pajak
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        {(() => {
                          const soCustomer = customers.find((c) => c.id === so.customer_id) ||
                                             initialCustomers.find((c) => c.id === so.customer_id || c.company_name === so.customer_company);
                          const soCreditLimit = soCustomer ? Number(soCustomer.credit_limit || 0) : Number(so.credit_limit_amount || 40000000);
                          const soCurrentPiutang = soCustomer ? Number(soCustomer.current_piutang || 0) : Number(so.current_piutang_amount || 0);
                          const soGrandTotal = so.grand_total || (so.items || []).reduce((s: number, it: any) => s + (it.subtotal || 0), 0);
                          const soProjected = soCurrentPiutang + soGrandTotal;
                          const isSoExceeding = soCreditLimit > 0 && soProjected > soCreditLimit;
                          const isSoOverdue = Boolean(soCustomer?.has_overdue);
                          const isSoTempo = so.payment_method === 'TEMPO' || (so as any).payment_method === 'KREDIT' || !so.payment_method;
                          const isInitialStage = so.status === 'DIAJUKAN' || so.status === 'PENDING_APPROVAL';

                          const soNeedsApproval =
                            isInitialStage && (
                              Boolean(so.requires_super_admin_approval) ||
                              (isSoTempo && (isSoExceeding || isSoOverdue)) ||
                              (isSoExceeding && soCreditLimit > 0)
                            );

                          const soIsPending = soNeedsApproval && (so.credit_approval_status !== 'APPROVED');
                          const soIsApproved = isInitialStage && so.requires_super_admin_approval && (so.credit_approval_status === 'APPROVED');

                          return (
                            <div className="flex flex-col items-start gap-1">
                              {getStatusBadge(so.status)}
                              {soIsPending && (
                                <span className="text-[10px] font-black text-red-700 bg-red-50 border border-red-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs animate-pulse">
                                  ⚠️ Butuh Approval Super Admin
                                </span>
                              )}
                              {soIsApproved && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                  ✓ Approved Super Admin
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Verify Payment Modal for 1-Click SO Payment */}
      <VerifyPaymentModal
        isOpen={!!selectedInvoiceForPayment}
        onClose={() => setSelectedInvoiceForPayment(null)}
        invoice={selectedInvoiceForPayment}
        onVerify={handleVerifyPayment}
      />

      {/* Upload & View Tax Invoice PDF Modal */}
      <UploadTaxInvoiceModal
        isOpen={!!selectedInvoiceForTax}
        onClose={() => setSelectedInvoiceForTax(null)}
        invoice={selectedInvoiceForTax}
        onUploadTaxInvoice={handleUploadTaxInvoice}
      />
    </div>
  );
}
