'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { POPDFModal } from '@/components/common/po-pdf-modal';
import { GoodsReceiptModal } from '@/components/admin/po-modal';
import { POPaymentModal } from '@/components/admin/po-payment-modal';
import {
  initialPurchaseOrders,
  initialBatches,
} from '@/lib/mock-data';
import { PurchaseOrder, StockBatch, Distributor, POPaymentRecord } from '@/lib/types';
import { formatIDR, formatKg, formatDate, formatDateTime } from '@/lib/utils';
import { getStoredCashAccounts, recordCashTransaction } from '@/lib/cash-store';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  Building2,
  Truck,
  Download,
  Eye,
  Check,
  PackageCheck,
  Layers,
  Mail,
  CreditCard,
  Edit3,
  Send,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  RotateCcw,
  Undo2,
  Trash2,
  Lock,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';
import { exportToXLSX } from '@/lib/export-excel';
import { canUserExportXLSX } from '@/lib/auth';

export default function PODetailPage() {
  const params = useParams();
  const poId = (params?.id as string) || 'po-001';

  // Current user for permissions
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.warn('Failed to load user info in PO detail:', err));
  }, []);

  // State
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
  const [batches, setBatches] = useState<StockBatch[]>(initialBatches);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // PDF Preview State
  const [isPOPDFOpen, setIsPOPDFOpen] = useState(false);

  // Goods Receipt Modal State
  const [isGRModalOpen, setIsGRModalOpen] = useState(false);

  // Confirmed shipping quantities & Surat Jalan state
  const [shippedQtys, setShippedQtys] = useState<Record<string, number>>({});
  const [suratJalanNumber, setSuratJalanNumber] = useState<string>('');
  const [suratJalanDate, setSuratJalanDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [suratJalanName, setSuratJalanName] = useState<string>('');
  const [suratJalanData, setSuratJalanData] = useState<string>('');
  const [activeShipmentForGR, setActiveShipmentForGR] = useState<any | null>(null);

  // Fulfillment mode for partial shipment: 'ADJUST_PO' (Final adjustment) vs 'MULTI_TRIP' (Multi-Trip)
  const [fulfillmentMode, setFulfillmentMode] = useState<'ADJUST_PO' | 'MULTI_TRIP'>('ADJUST_PO');

  // Cancel PO modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);

  // Super Admin Role & Revert Authorization States
  const isSuperAdmin = Boolean(currentUser?.is_super_admin || currentUser?.role === 'SUPER_ADMIN');
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [isAuthorizingSuperAdmin, setIsAuthorizingSuperAdmin] = useState(false);
  const [superAdminAuthError, setSuperAdminAuthError] = useState('');
  const [isSuperAdminApprovedOnSpot, setIsSuperAdminApprovedOnSpot] = useState(false);

  // Revert / Rollback Status Modal state
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [revertNote, setRevertNote] = useState('');
  const [isRevertSubmitting, setIsRevertSubmitting] = useState(false);

  // Surat Jalan list modal state
  const [isSJModalOpen, setIsSJModalOpen] = useState(false);

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

  // Helper: Authorize Super Admin credentials on the spot for staff
  const handleAuthorizeSuperAdminOnSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminEmail.trim() || !superAdminPassword) {
      setSuperAdminAuthError('Email/Username dan Password Super Admin wajib diisi.');
      return;
    }
    setIsAuthorizingSuperAdmin(true);
    setSuperAdminAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: superAdminEmail.trim(), password: superAdminPassword }),
      });
      const json = await res.json();
      if (json.success && (json.user?.is_super_admin || json.user?.role === 'SUPER_ADMIN')) {
        setIsSuperAdminApprovedOnSpot(true);
        setSuperAdminAuthError('');
      } else if (json.success && !(json.user?.is_super_admin || json.user?.role === 'SUPER_ADMIN')) {
        setSuperAdminAuthError('Akun yang dimasukkan bukan akun berlevel Super Admin.');
      } else {
        setSuperAdminAuthError(json.message || 'Kredensial Super Admin tidak valid.');
      }
    } catch (err: any) {
      setSuperAdminAuthError('Gagal memverifikasi Super Admin: ' + err.message);
    } finally {
      setIsAuthorizingSuperAdmin(false);
    }
  };

  // Company / Warehouse Settings state
  const [companySettings, setCompanySettings] = useState<any>({
    company_name: 'PT Artaroma Jayatama',
    company_tagline: 'B2B Fragrance Oil Supplier & Management Hub',
    warehouse_address: 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272',
    logistics_pic: 'Tim Gudang FEFO Engine',
    delivery_schedule_rule: 'Max 7 Hari setelah PO diterbitkan',
  });

  const handleConfirmPOPayment = async (
    targetPoId: string,
    paidAmount: number,
    paymentDate: string,
    bankAccountId: string,
    bankName: string,
    referenceNo?: string,
    paymentNotes?: string,
    proofUrl?: string
  ) => {
    const currentPO = purchaseOrders.find((p) => p.id === targetPoId);
    if (!currentPO) return;

    setIsPaymentSubmitting(true);
    try {
      const prevPaid = Number(currentPO.paid_amount || 0);
      const newAccumulatedPaid = Math.min(Number(currentPO.total_amount || 0), prevPaid + paidAmount);
      const remaining = Math.max(0, Number(currentPO.total_amount || 0) - newAccumulatedPaid);
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

      const existingHistory: POPaymentRecord[] = Array.isArray(currentPO.payment_history) ? currentPO.payment_history : [];
      const updatedHistory = [...existingHistory, newPaymentRecord];

      const newPoStatus = currentPO.status === 'BUAT_EMAIL' ? 'DIKIRIM' : currentPO.status;

      await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentPO.id,
          status: newPoStatus,
          paid_amount: newAccumulatedPaid,
          payment_status: paymentStatus,
          payment_proof_url: proofUrl || currentPO.payment_proof_url,
          payment_reference_no: referenceNo || currentPO.payment_reference_no,
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
            recipient_or_payer: currentPO.distributor_name || 'Suplier Distributor',
            reference_number: currentPO.po_number,
            notes: `Pembayaran ${isLunas ? 'Pelunasan' : 'Termin/Cicilan'} PO ${currentPO.po_number} kepada ${currentPO.distributor_name || 'Suplier'} via ${selectedAcc.name}${referenceNo ? ` (Ref: ${referenceNo})` : ''}`,
            proof_url: proofUrl,
            created_by: currentUser?.name || 'Staf Procurement / Finance',
            status: 'VERIFIED',
          });
        }
      } catch (e) {
        console.warn('Failed to auto-record BKK to cash store:', e);
      }

      const updatedPO: PurchaseOrder = {
        ...currentPO,
        status: newPoStatus,
        paid_amount: newAccumulatedPaid,
        payment_status: paymentStatus,
        payment_proof_url: proofUrl || currentPO.payment_proof_url,
        payment_reference_no: referenceNo || currentPO.payment_reference_no,
        payment_bank_id: bankAccountId,
        payment_bank_name: bankName,
        payment_history: updatedHistory,
        last_payment_date: paymentDate,
      };

      setPurchaseOrders((prev) =>
        prev.map((p) => (p.id === currentPO.id ? updatedPO : p))
      );

      setIsPaymentModalOpen(false);
      alert(
        `✅ Pembayaran ${isLunas ? 'PELUNASAN' : 'TERMIN/CICILAN'} PO ${currentPO.po_number} berhasil dicatat!\n\nNominal Bayar: ${formatIDR(paidAmount)}\nSisa Hutang: ${formatIDR(remaining)}\nKas Keluar (BKK) otomatis tercatat pada ${bankName}.`
      );
    } catch (err: any) {
      console.error('Failed to submit PO payment:', err);
      alert('Gagal mencatat pembayaran PO: ' + err.message);
    } finally {
      setIsPaymentSubmitting(false);
    }
  };

  const handleRevertStatus = async () => {
    if (!po) return;

    // Super Admin authorization check for reverting DITERIMA -> DIKIRIM
    if (po.status === 'DITERIMA' && !isSuperAdmin && !isSuperAdminApprovedOnSpot) {
      alert('⛔ AKSES DITOLAK: Mengembalikan status PO dari Diterima ke Dikirim memerlukan otorisasi dan persetujuan Super Admin.');
      return;
    }

    setIsRevertSubmitting(true);
    try {
      let newStatus: PurchaseOrder['status'] = 'BUAT_EMAIL';
      let updatedShipments = po.shipments;
      let updatedItems = po.items;

      if (po.status === 'DIKIRIM') {
        newStatus = 'BUAT_EMAIL';
        // Reset shipments & shipped quantities so user can re-input correctly
        updatedShipments = [];
        updatedItems = po.items.map((item) => ({
          ...item,
          qty_shipped_kg: 0,
        }));
      } else if (po.status === 'DITERIMA') {
        // === VALIDASI PENGGUNAAN STOK ===
        const poItemIds = new Set(po.items.map((i) => i.id));
        const associatedBatches = batches.filter(
          (b) =>
            (b.po_item_id && poItemIds.has(b.po_item_id)) ||
            (b.batch_number && b.batch_number.includes(po.po_number))
        );

        const usedBatches = associatedBatches.filter((b) => {
          const initial = Number(b.initial_qty_kg || 0);
          const current = Number(b.current_qty_kg || 0);
          return current < initial;
        });

        if (usedBatches.length > 0) {
          const details = usedBatches
            .map((b) => {
              const init = Number(b.initial_qty_kg || 0);
              const curr = Number(b.current_qty_kg || 0);
              const used = Math.max(0, init - curr);
              return `• ${b.product_name || 'Item'} (Batch: ${b.batch_number}): Terpakai ${formatKg(used)} (Sisa: ${formatKg(curr)} dari ${formatKg(init)})`;
            })
            .join('\n');

          alert(
            `⛔ ROLLBACK DITOLAK — STOK SUDAH TERPAKAI!\n\nStatus PO tidak dapat dikembalikan ke 'DIKIRIM' karena batch barang dari PO ini telah terpakai dalam transaksi penjualan (SO) atau repacking:\n\n${details}\n\n💡 Saran: Lakukan penyesuaian selisih fisik melalui modul Stok Opname / Stock Adjustment demi menjaga konsistensi inventaris.`
          );
          setIsRevertSubmitting(false);
          return;
        }

        // Jika stok masih utuh 100%, hapus batch penerimaan yang belum terpakai dari inventaris gudang
        if (associatedBatches.length > 0) {
          try {
            for (const b of associatedBatches) {
              await fetch(`/api/stock-batches?id=${encodeURIComponent(b.id)}`, {
                method: 'DELETE',
              });
            }
            // Update local state batches
            const deletedIds = new Set(associatedBatches.map((b) => b.id));
            setBatches((prev) => prev.filter((b) => !deletedIds.has(b.id)));
          } catch (batchErr) {
            console.warn('Failed to delete associated untouched batches on rollback:', batchErr);
          }
        }

        newStatus = 'DIKIRIM';
        // Set completed shipments back to DIKIRIM
        updatedShipments = (po.shipments || []).map((s) => ({
          ...s,
          status: 'DIKIRIM' as const,
          received_by: undefined,
        }));
      }

      const updatedPO: PurchaseOrder = {
        ...po,
        status: newStatus,
        shipped_by: newStatus === 'BUAT_EMAIL' ? undefined : po.shipped_by,
        received_by: undefined,
        shipments: updatedShipments,
        items: updatedItems,
      };

      setPurchaseOrders((prev) =>
        prev.map((p) => (p.id === po.id ? updatedPO : p))
      );

      await savePOUpdate(updatedPO);

      setIsRevertModalOpen(false);
      setRevertNote('');
      alert(
        `✅ Status PO berhasil dikembalikan ke tahap "${
          newStatus === 'BUAT_EMAIL' ? 'Diajukan (BUAT_EMAIL)' : 'Dikirim (DIKIRIM)'
        }". Data inventaris telah diverifikasi dan Anda kini dapat mengoreksi data dengan aman.`
      );
    } catch (err: any) {
      console.error('Failed to revert PO status:', err);
      alert('Gagal mengembalikan status PO: ' + err.message);
    } finally {
      setIsRevertSubmitting(false);
    }
  };

  const handleDeleteShipment = async (shipmentId: string) => {
    if (!po || !po.shipments) return;
    if (!confirm('Apakah Anda yakin ingin menghapus pengiriman / Surat Jalan ini untuk mengoreksi input?')) return;

    const filteredShipments = po.shipments.filter((s) => s.id !== shipmentId);
    const newStatus: PurchaseOrder['status'] = filteredShipments.length === 0 ? 'BUAT_EMAIL' : 'DIKIRIM';

    const updatedPOItems = po.items.map((item) => {
      const sumShipped = filteredShipments.reduce((sum, s) => {
        const match = s.items.find((si) =>
          si.po_item_id ? si.po_item_id === item.id : si.product_id === item.product_id
        );
        return sum + (match ? match.qty_shipped_kg : 0);
      }, 0);
      return { ...item, qty_shipped_kg: sumShipped };
    });

    const updatedPO: PurchaseOrder = {
      ...po,
      status: newStatus,
      shipped_by: newStatus === 'BUAT_EMAIL' ? undefined : po.shipped_by,
      shipments: filteredShipments,
      items: updatedPOItems,
    };

    setPurchaseOrders((prev) =>
      prev.map((p) => (p.id === po.id ? updatedPO : p))
    );

    await savePOUpdate(updatedPO);
    alert('✅ Pengiriman / Surat Jalan berhasil dihapus. Kuantitas dikirim telah disesuaikan.');
  };

  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/purchase-orders', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPurchaseOrders(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch purchase orders:', err);
    } finally {
      setIsLoading(false);
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
      console.warn('Failed to fetch distributors:', err);
    }
  };

  React.useEffect(() => {
    fetchPurchaseOrders();
    fetchDistributors();
    
    fetch('/api/company-settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCompanySettings(json.data);
        }
      })
      .catch((err) => console.warn('Failed to fetch company settings:', err));

    fetch('/api/stock-batches', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setBatches(json.data);
        }
      })
      .catch((err) => console.warn('Failed to fetch batches:', err));
  }, []);

  // Target PO — resolved AFTER data fetch
  const po = purchaseOrders.find((p) => p.id === poId || p.po_number === poId);

  // Distributor info — resolved dynamically from master data (distributors list)
  const dbDistributor = po ? distributors.find((d) => d.id === po.distributor_id) : null;

  const distributor = {
    name: dbDistributor?.name || po?.distributor_name || '—',
    contact_name: dbDistributor?.contact_name || '—',
    email: dbDistributor?.email || '—',
    phone: dbDistributor?.phone || '—',
    address: dbDistributor?.address || '—',
  };

  // Show loading spinner while fetching
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Memuat detail Purchase Order...</p>
        </div>
      </div>
    );
  }

  // Show not found if PO doesn't exist
  if (!po) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-300 font-bold text-lg">Purchase Order tidak ditemukan</p>
          <p className="text-slate-500 text-sm">ID: {poId}</p>
          <Link href="/admin/procurement" className="text-emerald-400 hover:text-emerald-300 text-sm underline">← Kembali ke daftar PO</Link>
        </div>
      </div>
    );
  }

  const savePOUpdate = async (updatedPO: PurchaseOrder) => {
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: updatedPO.id,
          status: updatedPO.status,
          total_amount: updatedPO.total_amount,
          payment_method: updatedPO.payment_method,
          payment_terms_days: updatedPO.payment_terms_days,
          items: updatedPO.items,
          shipments: updatedPO.shipments,
          cancellation_note: updatedPO.cancellation_note,
          cancelled_at: updatedPO.cancelled_at,
          cancelled_by: updatedPO.cancelled_by,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchPurchaseOrders();
      }
    } catch (err) {
      console.warn('Failed to update PO in DB:', err);
    }
  };

  // Handler: Cancel PO
  const handleCancelPO = async () => {
    if (!cancelNote.trim()) return;
    setIsCancelSubmitting(true);
    const updatedPO: PurchaseOrder = {
      ...po,
      status: 'DIBATALKAN',
      cancellation_note: cancelNote.trim(),
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'ADMIN PROCUREMENT',
    };
    setPurchaseOrders(purchaseOrders.map(p => p.id === po.id ? updatedPO : p));
    await savePOUpdate(updatedPO);
    setIsCancelSubmitting(false);
    setIsCancelModalOpen(false);
    setCancelNote('');
  };

  // Step Advancement Handlers
  const handleAdvanceStatus = (nextStatus: PurchaseOrder['status'], updatedItems?: typeof po.items) => {
    const updatedPO = {
      ...po,
      status: nextStatus,
      items: updatedItems || po.items
    };
    
    setPurchaseOrders(
      purchaseOrders.map((p) =>
        p.id === po.id ? updatedPO : p
      )
    );

    savePOUpdate(updatedPO);
  };

  const handleAddShipment = (
    itemsShipped: { po_item_id?: string; product_id: string; product_name?: string; qty_shipped_kg: number }[],
    sjNumber: string,
    sjDate?: string,
    sjName?: string,
    sjData?: string,
    adjustPOFinal: boolean = false
  ) => {
    const nextTripNumber = (po.shipments?.length || 0) + 1;
    const finalSJNumber = (sjNumber || '').trim() || `SJ-${po.po_number}-${nextTripNumber}`;
    const newShipment = {
      id: `sj-${Date.now()}`,
      trip_number: nextTripNumber,
      shipment_date: sjDate || suratJalanDate || new Date().toISOString().split('T')[0],
      surat_jalan_number: finalSJNumber,
      surat_jalan_name: sjName || finalSJNumber,
      surat_jalan_data: sjData || suratJalanData || undefined,
      status: 'DIKIRIM' as const,
      items: itemsShipped,
    };
    
    const updatedShipments = [...(po.shipments || []), newShipment];
    
    let updatedPOItems: typeof po.items = [];
    let newTotalAmount = po.total_amount;

    if (adjustPOFinal) {
      // Opsi 1: Menyesuaikan Pesanan PO (Final tanpa Trip 2)
      updatedPOItems = po.items
        .map((item) => {
          const shippedObj = itemsShipped.find((si) =>
            si.po_item_id ? si.po_item_id === item.id : si.product_id === item.product_id
          );
          const shippedQty = shippedObj ? shippedObj.qty_shipped_kg : 0;
          const unitCost = item.cost_per_kg || item.unit_price || 0;
          const newSubtotal = shippedQty * unitCost;
          return {
            ...item,
            qty_ordered_kg: shippedQty,
            qty_shipped_kg: shippedQty,
            subtotal: newSubtotal,
          };
        })
        .filter((item) => item.qty_ordered_kg > 0);

      newTotalAmount = updatedPOItems.reduce(
        (sum, item) => sum + (item.subtotal !== undefined ? item.subtotal : item.qty_ordered_kg * (item.cost_per_kg || item.unit_price || 0)),
        0
      );
    } else {
      // Opsi 2: Pengiriman Multi-Trip (Bertahap)
      updatedPOItems = po.items.map((item) => {
        const sumShipped = updatedShipments.reduce((sum, s) => {
          const itemVal = s.items.find((si) =>
            si.po_item_id ? si.po_item_id === item.id : si.product_id === item.product_id
          );
          return sum + (itemVal ? itemVal.qty_shipped_kg : 0);
        }, 0);
        return { ...item, qty_shipped_kg: sumShipped };
      });
    }

    const currentUserName = currentUser?.name || currentUser?.username || 'Super Admin HQ';
    const updatedPO: PurchaseOrder = {
      ...po,
      status: 'DIKIRIM' as const,
      shipped_by: currentUserName,
      total_amount: newTotalAmount,
      items: updatedPOItems,
      shipments: updatedShipments
    };

    setPurchaseOrders(
      purchaseOrders.map((p) =>
        p.id === po.id ? updatedPO : p
      )
    );

    savePOUpdate(updatedPO);

    // Reset local upload states
    setShippedQtys({});
    setSuratJalanNumber('');
    setSuratJalanDate(new Date().toISOString().split('T')[0]);
    setSuratJalanName('');
    setSuratJalanData('');
  };

  const handleReceiveBatch = (newBatch: StockBatch, shipmentId?: string) => {
    // Save stock batch in DB
    fetch('/api/stock-batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBatch),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          fetch('/api/stock-batches', { cache: 'no-store' })
            .then((r) => r.json())
            .then((j) => {
              if (j.success && Array.isArray(j.data)) {
                setBatches(j.data);
              }
            });
        }
      })
      .catch((err) => console.warn('Failed to save batch in DB:', err));

    setBatches([newBatch, ...batches]);
    
    const currentUserName = currentUser?.name || currentUser?.username || 'Gudang FEFO';
    if (shipmentId && po.shipments) {
      const updatedShipments = po.shipments.map(s => 
        s.id === shipmentId ? { ...s, status: 'DITERIMA' as const, received_by: currentUserName } : s
      );
      
      const allReceived = updatedShipments.every(s => s.status === 'DITERIMA');
      
      const totalShippedMap: Record<string, number> = {};
      po.items.forEach(item => {
        totalShippedMap[item.id] = updatedShipments.reduce((sum, s) => {
          const match = s.items.find(si => si.po_item_id ? si.po_item_id === item.id : si.product_id === item.product_id);
          return sum + (match ? match.qty_shipped_kg : 0);
        }, 0);
      });
      
      const allShippedFully = po.items.every(item => 
        (totalShippedMap[item.id] || 0) >= item.qty_ordered_kg
      );

      const nextPOStatus = (allReceived && allShippedFully) ? 'DITERIMA' as const : 'DIKIRIM' as const;
      
      const updatedPO = {
        ...po,
        status: nextPOStatus,
        received_by: currentUserName,
        shipments: updatedShipments
      };

      setPurchaseOrders(
        purchaseOrders.map((p) =>
          p.id === po.id ? updatedPO : p
        )
      );

      savePOUpdate(updatedPO);
    } else {
      const updatedPO = {
        ...po,
        status: 'DITERIMA' as const,
        received_by: currentUserName,
      };
      setPurchaseOrders(
        purchaseOrders.map((p) =>
          p.id === po.id ? updatedPO : p
        )
      );
      savePOUpdate(updatedPO);
    }
  };

  // ── Step timestamps from real PO data ─────────────────────────────────
  // Step 1: Buat Email → order creation date
  const stepBuatEmailTime = po.order_date ? formatDateTime(po.order_date) : '-';

  // Step 2: Dikirim → earliest shipment date
  const firstShipment = po.shipments && po.shipments.length > 0
    ? po.shipments.sort((a, b) => new Date(a.shipment_date).getTime() - new Date(b.shipment_date).getTime())[0]
    : null;
  const stepDikirimTime = firstShipment ? formatDateTime(firstShipment.shipment_date) : '-';

  // Step 3: Diterima → latest received shipment date (or PO updated_at if available)
  const receivedShipments = po.shipments?.filter(s => s.status === 'DITERIMA') || [];
  const lastReceivedShipment = receivedShipments.length > 0
    ? receivedShipments.sort((a, b) => new Date(b.shipment_date).getTime() - new Date(a.shipment_date).getTime())[0]
    : null;
  const stepDiterimaTime = po.status === 'DITERIMA'
    ? (lastReceivedShipment ? formatDateTime(lastReceivedShipment.shipment_date) : (po.order_date ? formatDateTime(po.order_date) : formatDate(new Date().toISOString())))
    : po.status === 'DIKIRIM'
    ? 'Menunggu Kedatangan Barang'
    : po.status === 'BUAT_EMAIL'
    ? 'Menunggu Pengiriman Suplier'
    : '-';
  // ────────────────────────────────────────────────────────────────────────

  // ── Surat Jalan file connections ─────────────────────────────────────────
  const shipmentsWithSJ = po.shipments?.filter(s => s.surat_jalan_name) || [];
  const hasSJ = shipmentsWithSJ.length > 0;

  const handleDownloadSuratJalan = (shipment: any) => {
    if (!shipment) return;
    if (shipment.surat_jalan_data) {
      const link = document.createElement('a');
      link.href = shipment.surat_jalan_data;
      link.download = shipment.surat_jalan_name || `Surat_Jalan_${po.po_number}_Trip_${shipment.trip_number}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Generate realistic printable HTML/PDF document blob as download fallback
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <title>Surat Jalan ${shipment.surat_jalan_name || po.po_number}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.5; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .company-name { font-size: 20px; font-weight: 800; color: #1e3a8a; }
          .badge { background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
          th { background: #0f172a; color: white; font-size: 11px; text-transform: uppercase; }
          .footer { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; text-align: center; font-size: 12px; }
          .sig { border-top: 1px solid #94a3b8; width: 200px; padding-top: 6px; margin: 60px auto 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="company-name">${po.distributor_name}</div>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 11px;">Authorized Fragrance Oil &amp; Industrial Aroma Supplier</p>
            </div>
            <div style="text-align: right;">
              <span class="badge">SURAT JALAN PENGIRIMAN (TRIP #${shipment.trip_number})</span>
              <div style="font-family: monospace; font-weight: bold; font-size: 12px; margin-top: 6px;">Ref: ${shipment.surat_jalan_name || 'SJ-DIST-' + po.po_number}</div>
            </div>
          </div>
        </div>
        <div class="info-grid">
          <div>
            <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">PENGIRIM (DISTRIBUTOR):</div>
            <div style="font-weight: 700; margin-top: 2px;">${po.distributor_name}</div>
            <div style="font-size: 11px; color: #475569;">No. PO Ref: ${po.po_number}</div>
            <div style="font-size: 11px; color: #475569;">Tanggal Kirim: ${shipment.shipment_date}</div>
          </div>
          <div>
            <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">TUJUAN PENGIRIMAN:</div>
            <div style="font-weight: 700; margin-top: 2px;">PT ARTAROMA INDAH INDONESIA</div>
            <div style="font-size: 11px; color: #475569;">Gedung Gudang Utama Fragrance Oil Lt. 1, Cikarang Barat</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">NO</th>
              <th>DESKRIPSI VARIAN BIBIT PARFUM</th>
              <th style="text-align: right; width: 150px;">KUANTITAS DIKIRIM (KG)</th>
            </tr>
          </thead>
          <tbody>
            ${(shipment.items || []).map((it: any, idx: number) => `
              <tr>
                <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
                <td style="font-weight: 600;">${it.product_name || 'Varian Produk'}</td>
                <td style="text-align: right; font-family: monospace; font-weight: 700;">${it.qty_shipped_kg} Kg</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <div>
            <div style="font-weight: 700; color: #475569;">Pengirim (Ekspedisi / Distributor):</div>
            <div class="sig">Petugas Ekspedisi</div>
          </div>
          <div>
            <div style="font-weight: 700; color: #475569;">Penerima (Gudang Central Artaroma):</div>
            <div class="sig">Admin Gudang Peneliti FEFO</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const rawName = shipment.surat_jalan_name || `Surat_Jalan_${po.po_number}_Trip_${shipment.trip_number}`;
    const fileName = rawName.includes('.') ? rawName : `${rawName}.html`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenSuratJalan = () => {
    if (!hasSJ) return;
    if (shipmentsWithSJ.length === 1) {
      handleDownloadSuratJalan(shipmentsWithSJ[0]);
    } else {
      setIsSJModalOpen(true);
    }
  };
  // ────────────────────────────────────────────────────────────────────────

  // Tahapan PO: Diajukan -> Dikirim -> Diterima
  const poCreatorName = po.created_by || currentUser?.name || currentUser?.username || 'SUPER ADMIN HQ';
  const isShipped = po.status === 'DIKIRIM' || po.status === 'DITERIMA' || (po.shipments && po.shipments.length > 0);
  const isReceived = po.status === 'DITERIMA' || (receivedShipments && receivedShipments.length > 0);

  const poShippedActorName = po.shipped_by || (currentUser?.name ? `${currentUser.name} (Ekspedisi ${po.distributor_name || 'Vendor'})` : (po.distributor_name ? `Ekspedisi ${po.distributor_name}` : 'Ekspedisi Cargo Distributor'));
  const poReceivedActorName = po.received_by || currentUser?.name || 'Gudang FEFO Artaroma';

  const steps = [
    {
      key: 'BUAT_EMAIL',
      title: 'Diajukan',
      time: stepBuatEmailTime,
      actor: `Oleh ${poCreatorName.toUpperCase()}`,
    },
    {
      key: 'DIKIRIM',
      title: 'Dikirim',
      time: isShipped ? stepDikirimTime : 'Menunggu Pengiriman Suplier',
      actor: isShipped
        ? `Oleh ${poShippedActorName.toUpperCase()}`
        : null,
    },
    {
      key: 'DITERIMA',
      title: 'Diterima',
      time: stepDiterimaTime,
      actor: isReceived ? `Oleh ${poReceivedActorName.toUpperCase()}` : null,
    },
  ];

  const getStepIndex = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'BUAT_EMAIL':
        return 0;
      case 'DIKIRIM':
        return 1;
      case 'DITERIMA':
        return 2;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(po.status);

  // ── Partial Shipment Calculations ──────────────────────────────────────
  // Total qty ordered across all items
  const totalOrderedKg = po.items.reduce((s, i) => s + i.qty_ordered_kg, 0);

  // Total qty shipped (from ALL shipments) — keyed by po_item_id to support multiple variants per product
  const shippedPerItem: Record<string, number> = {};
  if (po.shipments) {
    po.shipments.forEach(s => {
      s.items.forEach((si: any) => {
        // Use po_item_id if present (new data), fall back to product_id (old data)
        const key = si.po_item_id || si.product_id;
        shippedPerItem[key] = (shippedPerItem[key] || 0) + si.qty_shipped_kg;
      });
    });
  }

  const handleExportPODetailXLSX = () => {
    if (!canUserExportXLSX(currentUser)) {
      alert('Akses Ditolak: Akun Anda tidak memiliki hak akses modul "Ekspor Data (XLSX)". Silakan hubungi Super Admin.');
      return;
    }
    const data = po.items.map((item, index) => ({
      'No': index + 1,
      'No PO': po.po_number,
      'Tanggal PO': po.order_date,
      'Suplier': po.distributor_name,
      'SKU Varian': item.variant_sku || '-',
      'Deskripsi Produk': item.product_name,
      'Qty Pesanan (Kg)': item.qty_ordered_kg,
      'Harga Beli / Kg (IDR)': item.cost_per_kg,
      'Subtotal (IDR)': item.subtotal,
    }));
    exportToXLSX(data, {
      fileName: `PO_${po.po_number}_Items_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: `Rincian PO ${po.po_number}`,
    });
  };

  const totalShippedKg = Object.values(shippedPerItem).reduce((a, b) => a + b, 0);

  // Derived flags
  const isPartiallyShipped = totalShippedKg > 0 && totalShippedKg < totalOrderedKg;
  const isFullyShipped = totalOrderedKg > 0 && totalShippedKg >= totalOrderedKg;
  const shipmentPct = totalOrderedKg > 0 ? Math.min(100, Math.round((totalShippedKg / totalOrderedKg) * 100)) : 0;
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20">
      <AdminTopNav />

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/procurement"
            className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Purchase Order
          </Link>
        </div>

        {/* Centered Page Header Title */}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Detail Purchase Order - {po.po_number}
          </h1>
        </div>

        {/* === Cancellation Banner === */}
        {(po.status === 'DIBATALKAN' || po.status === 'CANCELLED') && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <div className="font-bold text-red-800 text-sm">Purchase Order Telah Dibatalkan</div>
              <div className="text-red-700 text-xs">
                <span className="font-semibold">Alasan:</span> {po.cancellation_note || 'Tidak ada catatan alasan'}
              </div>
              <div className="text-red-500 text-[10px] flex items-center gap-3">
                <span>Oleh: <strong>{po.cancelled_by || 'ADMIN PROCUREMENT'}</strong></span>
                {po.cancelled_at && <span>{formatDateTime(po.cancelled_at)}</span>}
              </div>
            </div>
          </div>
        )}

        {/* === Status Stepper === */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Status Purchase Order (3 Tahapan Alur Kerja)
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tombol Rollback / Kembali ke Tahap Sebelumnya */}
              {(po.status === 'DIKIRIM' || po.status === 'DITERIMA') && (
                <button
                  type="button"
                  onClick={() => setIsRevertModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-extrabold px-3 py-1 rounded-full transition-all cursor-pointer shadow-2xs hover:border-amber-400"
                  title={po.status === 'DITERIMA' && !isSuperAdmin ? 'Kembali ke tahap Dikirim (Memerlukan persetujuan Super Admin)' : 'Kembali ke tahap sebelumnya untuk mengoreksi salah input'}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>
                    {po.status === 'DIKIRIM'
                      ? '↩️ Kembali ke Tahap Diajukan (Koreksi)'
                      : isSuperAdmin
                      ? '↩️ Kembali ke Tahap Dikirim (Koreksi)'
                      : '🔒 ↩️ Kembali ke Tahap Dikirim (Persetujuan Super Admin)'}
                  </span>
                </button>
              )}

              {/* Opsi 3: Badge DIKIRIM SEBAGIAN */}
              {isPartiallyShipped && po.status === 'DIKIRIM' && (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-700 text-[10px] font-bold px-3 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  DIKIRIM SEBAGIAN — {shipmentPct}%
                </span>
              )}
              {isFullyShipped && po.status === 'DIKIRIM' && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> DIKIRIM LENGKAP
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {steps.map((step, idx) => {
              const isPassed = idx <= currentStepIdx;
              // Opsi 3: mark Pesanan Dikirim step as partial when applicable
              const isPartialStep = step.key === 'DIKIRIM' && isPartiallyShipped;

              return (
                <div key={step.key} className="space-y-1 text-center">
                  <div
                    className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${
                      isPartialStep
                        ? 'bg-amber-100 text-amber-800 border-amber-400'
                        : isPassed
                        ? step.key === 'BUAT_EMAIL'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : step.key === 'DIKIRIM'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-gray-100 text-gray-400 border-gray-200'
                    }`}
                  >
                    {isPartialStep ? `Dikirim Sebagian (${shipmentPct}%)` : step.title}
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1">
                    <div className={`font-semibold ${step.key === 'DITERIMA' && po.status === 'DIKIRIM' ? 'text-amber-700 font-bold' : 'text-slate-600'}`}>
                      {step.time}
                    </div>
                    {step.actor && (
                      <div className="text-[10px] text-slate-400 uppercase leading-tight font-medium">
                        {step.actor}
                      </div>
                    )}
                  </div>

                  {/* Tombol Cepat Aksi Penerimaan Barang untuk Tahap 3 */}
                  {step.key === 'DITERIMA' && po.status === 'DIKIRIM' && (
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          const pendingShipment = po.shipments?.find((s) => s.status === 'DIKIRIM') || (po.shipments && po.shipments[0]) || null;
                          setActiveShipmentForGR(pendingShipment);
                          setIsGRModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer hover:scale-105 active:scale-95 animate-pulse hover:animate-none"
                        title="Klik untuk langsung konfirmasi penerimaan fisik barang di gudang"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Terima Barang (Gudang) &rarr;</span>
                      </button>
                    </div>
                  )}

                  {step.key === 'DITERIMA' && po.status === 'DITERIMA' && (
                    <div className="pt-1.5 flex justify-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Barang Masuk Gudang FEFO
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Opsi 2: Progress Bar per item — shown when status = DIKIRIM */}
          {po.status === 'DIKIRIM' && totalOrderedKg > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Progress Pengiriman Barang
              </div>

              {/* Grand total progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-semibold">
                  <span className="text-slate-600">Total PO</span>
                  <span className={isPartiallyShipped ? 'text-amber-600' : isFullyShipped ? 'text-emerald-600' : 'text-slate-400'}>
                    {formatKg(totalShippedKg)} / {formatKg(totalOrderedKg)} ({shipmentPct}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${
                      isFullyShipped ? 'bg-emerald-500' : shipmentPct > 0 ? 'bg-amber-400' : 'bg-gray-200'
                    }`}
                    style={{ width: `${shipmentPct}%` }}
                  />
                </div>
              </div>

              {/* Per-item progress bars */}
              {po.items.map(item => {
                // Match by po_item_id (new) or product_id (legacy)
                const shippedKg = shippedPerItem[item.id] ?? shippedPerItem[item.product_id] ?? 0;
                const pct = item.qty_ordered_kg > 0 ? Math.min(100, Math.round((shippedKg / item.qty_ordered_kg) * 100)) : 0;
                const isFull = pct >= 100;
                const isNone = pct === 0;
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600 font-medium truncate max-w-[60%]">{item.product_name}</span>
                      <span className={`font-bold font-mono ${
                        isFull ? 'text-emerald-600' : isNone ? 'text-slate-400' : 'text-amber-600'
                      }`}>
                        {formatKg(shippedKg)} / {formatKg(item.qty_ordered_kg)}
                        {isFull && ' ✓'}
                        {isNone && po.shipments && po.shipments.length > 0 ? ' — Belum Dikirim' : ''}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          isFull ? 'bg-emerald-400' : pct > 0 ? 'bg-amber-300' : 'bg-gray-200'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Penerima & Pengirim Side-by-Side Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Penerima */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-800 border-b border-gray-100 pb-2">
              Penerima (Artaroma Central Warehouse)
            </h2>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Nama Penerima:</span>
                <span className="col-span-2 font-bold text-slate-800">
                  {companySettings.company_name}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Alamat Warehouse:</span>
                <span className="col-span-2 text-slate-700">
                  {companySettings.warehouse_address}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">UP Logistik:</span>
                <span className="col-span-2 text-slate-700">{companySettings.logistics_pic}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Jadwal Terima:</span>
                <span className="col-span-2 font-bold text-blue-700">
                  {companySettings.delivery_schedule_rule}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Metode Pembayaran:</span>
                <span className="col-span-2 font-bold text-indigo-700">
                  {po.payment_method === 'KREDIT' 
                    ? `KREDIT (Credit / Tempo) - TOP ${po.payment_terms_days || 30} Hari` 
                    : 'TUNAI (Cash)'}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Mata Uang & Kurs:</span>
                <span className="col-span-2 font-bold text-amber-700">
                  {po.currency && po.currency !== 'IDR'
                    ? `${po.currency} (Kurs 1 ${po.currency} = ${formatIDR(po.exchange_rate || 1)})`
                    : 'IDR (Rupiah Indonesia)'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Pengirim */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-800 border-b border-gray-100 pb-2">
              Pengirim (Distributor Resmi)
            </h2>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Nama Distributor:</span>
                <span className="col-span-2 font-bold text-slate-800">
                  {distributor.name}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Contact Person:</span>
                <span className="col-span-2 text-slate-700">
                  {distributor.contact_name}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Telepon & Email:</span>
                <span className="col-span-2 text-slate-700">
                  {distributor.phone} | {distributor.email}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Alamat Vendor:</span>
                <span className="col-span-2 text-slate-700">{distributor.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Document Action Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPOPDFOpen(true)}
            className="bg-white hover:bg-gray-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" /> Purchase order PDF
          </button>

          {canUserExportXLSX(currentUser) && (
            <button
              onClick={handleExportPODetailXLSX}
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Ekspor Rincian Item PO ke File Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Ekspor Rincian PO (XLSX)
            </button>
          )}

          <button
            onClick={handleOpenSuratJalan}
            disabled={!hasSJ}
            className={`text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors border ${
              hasSJ
                ? 'bg-white hover:bg-gray-50 border-blue-200 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title={hasSJ ? 'Lihat dokumen Surat Jalan Distributor' : 'Belum ada Surat Jalan yang diunggah'}
          >
            <Truck className="w-3.5 h-3.5 text-blue-600" /> Surat Jalan Distributor
            {hasSJ && (
              <span className="bg-blue-150 text-blue-800 text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ml-0.5 border border-blue-200 bg-blue-50">
                {shipmentsWithSJ.length}
              </span>
            )}
          </button>

          {/* Payment / Cicilan Button */}
          {po.status !== 'DIBATALKAN' && po.status !== 'CANCELLED' && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className={`text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all border cursor-pointer ${
                Number(po.paid_amount || 0) >= Number(po.total_amount || 0) && Number(po.total_amount || 0) > 0
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                  : 'bg-purple-600 hover:bg-purple-700 border-purple-700 text-white'
              }`}
              title="Input Pembayaran / Cicilan Tagihan Vendor PO"
            >
              <CreditCard className="w-3.5 h-3.5" />
              {Number(po.paid_amount || 0) >= Number(po.total_amount || 0) && Number(po.total_amount || 0) > 0
                ? '✓ Lunas (Lihat Riwayat Bayar)'
                : Number(po.paid_amount || 0) > 0
                ? `Cicil / Lunasi PO (Sisa ${formatIDR(Math.max(0, Number(po.total_amount || 0) - Number(po.paid_amount || 0)))})`
                : 'Input Pembayaran Vendor PO'}
            </button>
          )}

          {/* Rollback / Kembali ke Tahap Sebelumnya */}
          {(po.status === 'DIKIRIM' || po.status === 'DITERIMA') && (
            <button
              type="button"
              onClick={() => setIsRevertModalOpen(true)}
              className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:border-amber-400"
              title={po.status === 'DITERIMA' && !isSuperAdmin ? 'Kembali ke tahap Dikirim (Memerlukan persetujuan Super Admin)' : 'Kembali ke tahap sebelumnya untuk mengoreksi salah input'}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>
                {po.status === 'DIKIRIM'
                  ? '↩️ Kembali ke Tahap Diajukan (Koreksi Input)'
                  : isSuperAdmin
                  ? '↩️ Kembali ke Tahap Dikirim (Koreksi Penerimaan)'
                  : '🔒 ↩️ Kembali ke Tahap Dikirim (Persetujuan Super Admin)'}
              </span>
            </button>
          )}

          {/* Cancel PO Button — only if not yet completed/cancelled */}
          {(po.status === 'BUAT_EMAIL' || po.status === 'DIKIRIM') && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="ml-auto bg-white hover:bg-red-50 border border-red-200 text-red-600 hover:text-red-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> Batalkan PO
            </button>
          )}
        </div>

        {/* WORKFLOW ACTION PANEL (Interactive based on 6 PO statuses) */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Form Eksekusi Aksi Alur Kerja PO
            </h3>
            <span className={`text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-full ${
              (po.status === 'DIBATALKAN' || po.status === 'CANCELLED')
                ? 'bg-red-600'
                : po.status === 'DITERIMA'
                ? 'bg-emerald-650 text-white border border-emerald-500 bg-emerald-600'
                : po.status === 'DIKIRIM'
                ? 'bg-amber-600'
                : 'bg-blue-600'
            }`}>
              STATUS PO: {po.status}
            </span>
          </div>

          {/* Action Step 1: BUAT_EMAIL -> DIKIRIM */}
          {po.status === 'BUAT_EMAIL' && (() => {
            const totalOrderedKg = po.items.reduce((sum, item) => sum + (item.qty_ordered_kg || 0), 0);
            const totalShippedKg = po.items.reduce((sum, item) => {
              const finalQty = shippedQtys[item.id] !== undefined ? shippedQtys[item.id] : item.qty_ordered_kg;
              return sum + (finalQty || 0);
            }, 0);
            const totalRemainingKg = Math.max(0, totalOrderedKg - totalShippedKg);
            const hasPartialDifference = totalShippedKg < totalOrderedKg;

            return (
              <div className="bg-white p-5 rounded-xl border border-blue-100 text-xs space-y-4 shadow-sm">
                <div className="font-bold text-slate-800 text-sm border-b border-gray-100 pb-2">
                  Langkah 1: Konfirmasi Pengiriman & Upload Surat Jalan Distributor
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Hubungi distributor via email dan kirimkan dokumen PO. Ketika distributor telah mengirimkan barang, harap input jumlah aktual yang dikirim untuk masing-masing item, upload dokumen Surat Jalan, kemudian klik tombol konfirmasi di bawah.
                </p>

                {/* Items List to Confirm Qty */}
                <div className="space-y-3 pt-2">
                  <div className="font-bold text-slate-750 uppercase tracking-wider text-[10px] text-slate-700">
                    Konfirmasi Jumlah Item yang Dikirim (Kg)
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                    {po.items.map((item) => {
                      const currentVal = Math.round(shippedQtys[item.id] !== undefined ? shippedQtys[item.id] : item.qty_ordered_kg);
                      const isLess = currentVal < item.qty_ordered_kg;
                      const diffKg = Math.max(0, item.qty_ordered_kg - currentVal);
                      return (
                        <div key={item.id} className="p-3.5 space-y-2 hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="font-bold text-slate-800">{item.product_name}</div>
                              <div className="text-slate-400 text-[10px] flex items-center gap-1.5 mt-0.5">
                                <span>Pesanan Awal:</span>
                                <span className="font-bold text-slate-700 font-mono">{formatKg(Math.round(item.qty_ordered_kg))}</span>
                                <span>•</span>
                                <span>Harga Satuan:</span>
                                <span className="font-bold text-slate-700 font-mono">{formatIDR(item.cost_per_kg || item.unit_price || 0)}/kg</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-slate-500 font-medium">Konfirmasi Jumlah (Kg):</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={currentVal}
                                  onChange={(e) => {
                                    setShippedQtys({
                                      ...shippedQtys,
                                      [item.id]: Math.round(Number(e.target.value)) || 0
                                    });
                                  }}
                                  className="w-28 bg-white border border-slate-350 rounded-lg px-2 py-1.5 font-bold font-mono text-slate-800 focus:outline-none focus:border-blue-500 text-right pr-6"
                                />
                                <span className="absolute right-2 top-2 text-slate-400 font-bold text-[10px] pointer-events-none">Kg</span>
                              </div>
                            </div>
                          </div>

                          {/* Inline warning per item if shipped < ordered */}
                          {isLess && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                              <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>
                                {currentVal === 0 ? 'Kuantitas 0 Kg: ' : `Kuantitas ${currentVal} Kg: `}
                                Produk ini ({diffKg} Kg) akan{' '}
                                {fulfillmentMode === 'ADJUST_PO'
                                  ? 'disesuaikan secara final (dihapus/dikurangi dari pesanan PO)'
                                  : 'masuk ke Multi-Trip selanjutnya (Trip 2)'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pilihan: Penyesuaian Pesanan PO vs Pengiriman Multi-Trip */}
                {hasPartialDifference && (
                  <div className="bg-amber-50/90 border-2 border-amber-300 rounded-xl p-4 space-y-3 shadow-xs animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-amber-700 shrink-0" />
                        <div>
                          <span className="font-extrabold text-amber-900 text-sm block">
                            Kuantitas Dikirim Vendor Kurang: Pilih Opsi Pemenuhan Pesanan
                          </span>
                          <span className="text-[11px] text-amber-800">
                            Terdapat kuantitas atau item yang tidak dikirim penuh oleh distributor pada pengiriman ini.
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold bg-amber-200 text-amber-950 px-2.5 py-1 rounded-full w-max">
                        Siap Kirim (Trip 1): {totalShippedKg} Kg | Sisa: {totalRemainingKg} Kg
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Opsi 1: Menyesuaikan Pesanan PO (Penyesuaian Final) */}
                      <div
                        onClick={() => setFulfillmentMode('ADJUST_PO')}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          fulfillmentMode === 'ADJUST_PO'
                            ? 'border-blue-600 bg-white shadow-sm ring-2 ring-blue-100'
                            : 'border-amber-200/80 bg-white/70 hover:bg-white hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              fulfillmentMode === 'ADJUST_PO' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                            }`}>
                              {fulfillmentMode === 'ADJUST_PO' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            1. Menyesuaikan Pesanan PO (Final)
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Tanpa Trip 2
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Pesanan disesuaikan secara final menjadi <strong>{totalShippedKg} Kg</strong>. Item/kuantitas yang tidak dikirim dihapus dari komitmen pesanan PO dan <strong>tidak ada pengiriman susulan (Trip 2)</strong>. Total tagihan PO akan disesuaikan otomatis.
                        </p>
                      </div>

                      {/* Opsi 2: Pengiriman Multi-Trip (Kirim Bertahap) */}
                      <div
                        onClick={() => setFulfillmentMode('MULTI_TRIP')}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          fulfillmentMode === 'MULTI_TRIP'
                            ? 'border-blue-600 bg-white shadow-sm ring-2 ring-blue-100'
                            : 'border-amber-200/80 bg-white/70 hover:bg-white hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              fulfillmentMode === 'MULTI_TRIP' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                            }`}>
                              {fulfillmentMode === 'MULTI_TRIP' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            2. Pengiriman Multi-Trip (Bertahap)
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            Trip 1 + Trip 2
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Bagi pesanan menjadi 2 tahap: <strong>Trip 1 ({totalShippedKg} Kg)</strong> siap dikirim sekarang, dan sisa <strong>Trip 2 ({totalRemainingKg} Kg)</strong> menunggu pengiriman susulan dari distributor.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tanggal & Nomor Surat Jalan (Wajib) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" /> Tanggal Surat Jalan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={suratJalanDate}
                      onChange={(e) => setSuratJalanDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" /> Nomor Surat Jalan Distributor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: SJ-GIV-2026-0889"
                      value={suratJalanNumber}
                      onChange={(e) => setSuratJalanNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Surat Jalan File Upload (Opsional) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="font-bold uppercase tracking-wider text-[10px] text-slate-700 flex items-center gap-1">
                      Upload Foto / Dokumen Surat Jalan
                      <span className="text-[10px] text-slate-400 font-normal lowercase">(opsional)</span>
                    </div>
                    {suratJalanName && (
                      <button
                        type="button"
                        onClick={() => { setSuratJalanName(''); setSuratJalanData(''); }}
                        className="text-[10px] text-red-500 hover:underline font-bold"
                      >
                        Hapus Lampiran
                      </button>
                    )}
                  </div>
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 text-center bg-slate-50/30 transition-all relative cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setSuratJalanName(file.name);
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setSuratJalanData(ev.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {suratJalanName ? (
                      <div className="flex items-center justify-center gap-1.5 text-blue-700 font-bold font-mono text-xs">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span>{suratJalanName}</span>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-500">
                        <div className="font-bold text-[11px] text-slate-700">Pilih atau seret file foto/PDF Surat Jalan di sini (Opsional)</div>
                        <div className="text-[10px] text-slate-400">Mendukung format gambar (JPG/PNG) atau PDF</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-155 flex justify-end">
                  <button
                    onClick={() => {
                      if (!suratJalanDate) {
                        alert('Harap masukkan Tanggal Surat Jalan terlebih dahulu.');
                        return;
                      }
                      if (!suratJalanNumber.trim()) {
                        alert('Harap masukkan Nomor Surat Jalan dari distributor terlebih dahulu.');
                        return;
                      }
                      
                      // Map items with confirmed shipped quantity — include po_item_id and product_name to track per variant
                      const itemsShipped = po.items.map((item) => {
                        const finalQty = shippedQtys[item.id] !== undefined ? shippedQtys[item.id] : item.qty_ordered_kg;
                        return {
                          po_item_id: item.id,
                          product_id: item.product_id,
                          product_name: item.product_name,
                          qty_shipped_kg: finalQty
                        };
                      }).filter(si => si.qty_shipped_kg > 0);

                      const adjustPOFinal = hasPartialDifference && fulfillmentMode === 'ADJUST_PO';
                      handleAddShipment(itemsShipped, suratJalanNumber, suratJalanDate, suratJalanName, suratJalanData, adjustPOFinal);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-md inline-flex items-center gap-1.5 transition-colors animate-in fade-in"
                  >
                    <Send className="w-4 h-4" /> Konfirmasi Pesanan Telah Dikirim oleh Distributor (Status: DIKIRIM)
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Action Step 2: DIKIRIM */}
          {po.status === 'DIKIRIM' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Alert Rollback / Koreksi */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-amber-900">
                    <strong className="block font-bold">Perlu mengoreksi data atau salah input pengiriman?</strong>
                    <span className="text-amber-800 text-[11px]">
                      Anda dapat menghapus trip pengiriman individu atau mengembalikan status PO secara penuh ke tahap awal (Diajukan).
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRevertModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 flex-shrink-0 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Kembalikan ke Tahap 1 (Diajukan)
                </button>
              </div>

              {/* Shipments List */}
              <div className="bg-white p-5 rounded-xl border border-blue-100 text-xs space-y-3 shadow-sm">
                <div className="font-bold text-slate-800 text-sm border-b border-gray-100 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" /> Daftar Pengiriman Multi-Trip (Surat Jalan)
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {(po.shipments || []).length} Trip Pengiriman
                  </span>
                </div>
                
                <div className="space-y-3.5 pt-1">
                  {(po.shipments || []).map((s) => (
                    <div key={s.id} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Trip #{s.trip_number}
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-500 font-normal">{s.shipment_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                            s.status === 'DITERIMA' 
                              ? 'bg-emerald-100 text-emerald-800 font-extrabold' 
                              : 'bg-amber-100 text-amber-800 font-extrabold'
                          }`}>
                            {s.status === 'DITERIMA' ? 'Sudah Masuk Gudang' : 'Dalam Perjalanan'}
                          </span>
                          {s.status === 'DIKIRIM' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteShipment(s.id)}
                              className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 p-1 rounded-md transition-colors cursor-pointer"
                              title="Hapus / Batalkan trip pengiriman ini untuk koreksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-slate-100 py-2.5 my-1">
                        <div className="flex items-center gap-2 text-slate-600 font-semibold flex-wrap">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <span>No. Surat Jalan: <strong className="text-slate-800 font-mono">{s.surat_jalan_number || s.surat_jalan_name || '-'}</strong></span>
                          <button
                            onClick={() => handleDownloadSuratJalan(s)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ml-1 cursor-pointer transition-colors"
                            title="Unduh / Cetak Dokumen Surat Jalan"
                          >
                            <Download className="w-3 h-3" /> {s.surat_jalan_data ? 'Unduh Lampiran' : 'Cetak Dokumen'}
                          </button>
                        </div>
                        
                        {s.status === 'DIKIRIM' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteShipment(s.id)}
                              className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold text-[10px] px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Hapus trip ini jika ada salah input jumlah atau no. SJ"
                            >
                              <Trash2 className="w-3 h-3" /> Hapus Trip
                            </button>
                            <button
                              onClick={() => {
                                setActiveShipmentForGR(s);
                                setIsGRModalOpen(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <PackageCheck className="w-3.5 h-3.5" /> Input Goods Receipt (Masuk Gudang)
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Shipment Items */}
                      <div className="space-y-1">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Item dalam Pengiriman ini:</div>
                        {s.items.map((si: any, idx: number) => {
                          const itemInfo = po.items.find(item => si.po_item_id ? item.id === si.po_item_id : item.product_id === si.product_id);
                          const displayName = si.product_name || itemInfo?.product_name || 'Bibit Parfum';
                          return (
                            <div key={idx} className="flex justify-between items-center text-slate-700">
                              <span>• {displayName}</span>
                              <span className="font-bold font-mono text-slate-800">{formatKg(si.qty_shipped_kg)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form to Add New Shipment if there is remaining quantity */}
              {(() => {
                const shipmentsList = po.shipments || [];
                const totalShippedMap: Record<string, number> = {};
                po.items.forEach(item => {
                  totalShippedMap[item.id] = shipmentsList.reduce((sum, s) => {
                    const match = s.items.find(si => si.po_item_id ? si.po_item_id === item.id : si.product_id === item.product_id);
                    return sum + (match ? match.qty_shipped_kg : 0);
                  }, 0);
                });
                const remainingToShipList = po.items.map(item => {
                  const shipped = totalShippedMap[item.id] || 0;
                  return {
                    item,
                    remaining: Math.max(0, item.qty_ordered_kg - shipped)
                  };
                });
                const hasRemainingToShip = remainingToShipList.some(r => r.remaining > 0);

                if (!hasRemainingToShip) return null;

                const nextTripNum = shipmentsList.length + 1;

                return (
                  <div className="bg-white p-5 rounded-xl border border-blue-100 text-xs space-y-4 shadow-sm animate-in fade-in duration-350">
                    <div className="font-bold text-slate-800 text-sm border-b border-gray-100 pb-2">
                      Tambah Pengiriman Baru (Trip #{nextTripNum})
                    </div>
                    <p className="text-slate-500 leading-relaxed">
                      Sebagian pesanan belum dikirim. Masukkan kuantitas pengiriman untuk **Trip #{nextTripNum}** dan unggah Surat Jalan terkait di bawah ini.
                    </p>

                    {/* Items List */}
                    <div className="space-y-3">
                      <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Kuantitas Pengiriman Trip #{nextTripNum} (Kg)
                      </div>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        {remainingToShipList.map(({ item, remaining }) => {
                          if (remaining <= 0) return null;
                          const currentVal = Math.round(shippedQtys[item.id] !== undefined ? shippedQtys[item.id] : remaining);
                          return (
                            <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                              <div>
                                <div className="font-bold text-slate-800">{item.product_name}</div>
                                <div className="text-slate-400 text-[10px] flex items-center gap-1.5 mt-0.5">
                                  <span>Sisa pesanan:</span>
                                  <span className="font-bold text-orange-600 font-mono">{formatKg(Math.round(remaining))}</span>
                                  <span className="text-slate-300">|</span>
                                  <span>Total dipesan:</span>
                                  <span className="font-bold text-slate-700 font-mono">{formatKg(Math.round(item.qty_ordered_kg))}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-slate-500 font-medium">Jumlah dikirim:</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    max={Math.round(remaining)}
                                    value={currentVal}
                                    onChange={(e) => {
                                      setShippedQtys({
                                        ...shippedQtys,
                                        [item.id]: Math.round(Number(e.target.value)) || 0
                                      });
                                    }}
                                    className="w-28 bg-white border border-slate-300 rounded-lg px-2 py-1.5 font-bold font-mono text-slate-800 focus:outline-none focus:border-blue-500 text-right pr-6"
                                  />
                                  <span className="absolute right-2 top-2 text-slate-400 font-bold text-[10px] pointer-events-none">Kg</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tanggal & Nomor Surat Jalan (Wajib) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" /> Tanggal Surat Jalan <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={suratJalanDate}
                          onChange={(e) => setSuratJalanDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-600" /> Nomor Surat Jalan Trip #{nextTripNum} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={`Contoh: SJ-GIV-2026-TRIP${nextTripNum}`}
                          value={suratJalanNumber}
                          onChange={(e) => setSuratJalanNumber(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 placeholder:font-normal placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Surat Jalan Upload (Opsional) */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                          Upload Surat Jalan Trip #{nextTripNum}
                          <span className="text-[10px] text-slate-400 font-normal lowercase">(opsional)</span>
                        </div>
                        {suratJalanName && (
                          <button
                            type="button"
                            onClick={() => { setSuratJalanName(''); setSuratJalanData(''); }}
                            className="text-[10px] text-red-500 hover:underline font-bold"
                          >
                            Hapus Lampiran
                          </button>
                        )}
                      </div>
                      <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 text-center bg-slate-50/30 transition-all relative cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setSuratJalanName(file.name);
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setSuratJalanData(ev.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        {suratJalanName ? (
                          <div className="flex items-center justify-center gap-1.5 text-blue-700 font-bold font-mono text-xs">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span>{suratJalanName}</span>
                          </div>
                        ) : (
                          <div className="space-y-1 text-slate-500">
                            <div className="font-bold text-[11px] text-slate-700">Pilih atau seret file foto/PDF Surat Jalan Trip #{nextTripNum} di sini (Opsional)</div>
                            <div className="text-[10px] text-slate-400">Mendukung format gambar atau PDF</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => {
                          if (!suratJalanDate) {
                            alert('Harap masukkan Tanggal Surat Jalan terlebih dahulu.');
                            return;
                          }
                          if (!suratJalanNumber.trim()) {
                            alert(`Harap masukkan Nomor Surat Jalan untuk Trip #${nextTripNum} terlebih dahulu.`);
                            return;
                          }
                          
                          const itemsShipped = remainingToShipList.map(({ item, remaining }) => {
                            const finalQty = shippedQtys[item.id] !== undefined ? shippedQtys[item.id] : remaining;
                            return {
                              po_item_id: item.id,
                              product_id: item.product_id,
                              product_name: item.product_name,
                              qty_shipped_kg: finalQty
                            };
                          }).filter(si => si.qty_shipped_kg > 0);

                          handleAddShipment(itemsShipped, suratJalanNumber, suratJalanDate, suratJalanName, suratJalanData);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-md inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Send className="w-4 h-4" /> Konfirmasi Pengiriman Trip #{nextTripNum}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Action Step 3: DITERIMA */}
          {po.status === 'DITERIMA' && (
            <div className="bg-white p-5 rounded-xl border border-emerald-200 text-xs space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Procurement Selesai — Barang Telah Masuk Gudang FEFO
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    Seluruh item dan batch barang telah tercatat dalam inventaris stok aktif gudang.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRevertModalOpen(true)}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                  title="Kembali ke tahap pengiriman jika ada salah input penerimaan barang"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Koreksi Penerimaan (Kembali ke Status Dikirim)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Item Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-slate-800">
                Rincian Item Pesanan Purchase Order ({po.items.length})
              </h2>
              {po.shipments && po.shipments.length > 1 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-0.5 rounded-full shadow-2xs animate-in fade-in">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  Pengiriman Multi-Trip ({po.shipments.length} Trip)
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                Total Barang: {formatKg(po.items.reduce((s, it) => s + (it.qty_ordered_kg || 0), 0))}
              </span>
              <div className="text-right">
                {po.currency && po.currency !== 'IDR' ? (
                  <div>
                    <div className="text-sm font-mono font-extrabold text-amber-700">
                      {po.currency} {((po.foreign_total_amount || (po.total_amount / (po.exchange_rate || 1)))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs font-mono font-bold text-blue-700">
                      ≈ {formatIDR(po.total_amount)} <span className="text-[10px] text-slate-400 font-normal">(@ Kurs {formatIDR(po.exchange_rate || 1)})</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                    Total PO: {formatIDR(po.total_amount)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                  <th className="px-6 py-3">Material / Bibit Parfum</th>
                  <th className="px-6 py-3 text-center">Pesanan</th>
                  <th className="px-6 py-3 text-center">Alokasi Batch (FEFO)</th>
                  <th className="px-6 py-3 text-center">Dikirim</th>
                  <th className="px-6 py-3 text-center">Diterima</th>
                  {po.currency && po.currency !== 'IDR' && (
                    <th className="px-6 py-3 text-right">Harga ({po.currency})</th>
                  )}
                  <th className="px-6 py-3 text-right">HPP Satuan (IDR)</th>
                  <th className="px-6 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {po.items.map((item, idx) => {
                  const isDelivered = po.status === 'DITERIMA';
                  const isShipped = po.status === 'DIKIRIM' || isDelivered;
                  const hasShipments = Boolean(po.shipments && po.shipments.length > 0);

                  const rawShipped = hasShipments
                    ? (shippedPerItem[item.id] ?? shippedPerItem[item.product_id] ?? item.qty_shipped_kg ?? item.qty_ordered_kg)
                    : (isShipped ? item.qty_ordered_kg : 0);

                  const receivedSum = hasShipments
                    ? po.shipments!.filter(s => s.status === 'DITERIMA').reduce((sum, s) => {
                        const match = s.items.find((si: any) => si.po_item_id ? si.po_item_id === item.id : si.product_id === item.product_id);
                        return sum + (match ? match.qty_shipped_kg : 0);
                      }, 0)
                    : (isDelivered ? item.qty_ordered_kg : 0);

                  // Correctly reflect received quantity for partial receipts or full delivery
                  const displayReceivedKg = isDelivered ? (receivedSum > 0 ? receivedSum : item.qty_ordered_kg) : receivedSum;
                  const displayShippedKg = isDelivered ? Math.max(rawShipped, displayReceivedKg) : rawShipped;

                  const matchingBatch = batches.find(
                    (b) => (b.po_item_id && b.po_item_id === item.id) || (b.product_id === item.product_id && b.batch_number?.includes(po.po_number))
                  );
                  const fallbackBatchCode = `BTC-2026-${String(88 + idx).padStart(2, '0')}`;
                  const itemBatchCode = matchingBatch ? matchingBatch.batch_number : fallbackBatchCode;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      {/* Material */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{item.product_name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>
                            {item.qty_ordered_kg % 25 === 0
                              ? `Kemasan 25 Kg × ${item.qty_ordered_kg / 25} unit`
                              : item.qty_ordered_kg % 5 === 0
                              ? `Kemasan 5 Kg × ${item.qty_ordered_kg / 5} unit`
                              : item.qty_ordered_kg % 1 === 0
                              ? `Kemasan 1 Kg × ${item.qty_ordered_kg} unit`
                              : `${formatKg(item.qty_ordered_kg)} total`}
                          </span>
                          {po.shipments && po.shipments.length > 1 && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded">
                              <Truck className="w-2.5 h-2.5 text-blue-600" /> Multi-Trip ({po.shipments.length} Trip)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Pesanan */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 text-center">
                        {formatKg(item.qty_ordered_kg)}
                      </td>

                      {/* Batch Number FEFO */}
                      <td className="px-6 py-4 text-xs text-center">
                        {displayReceivedKg > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded font-mono font-bold text-[11px] inline-block shadow-2xs">
                              {itemBatchCode}
                            </span>
                            {po.shipments && po.shipments.length > 1 && (
                              <span className="text-[9px] text-indigo-600 font-semibold">Multi-Trip Batch</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Menunggu Penerimaan</span>
                        )}
                      </td>

                      {/* Dikirim */}
                      <td className="px-6 py-4 text-center">
                        {displayShippedKg > 0 ? (
                          <div className="flex flex-col items-center">
                            <span className="text-slate-800 font-mono font-bold">
                              {formatKg(displayShippedKg)}
                            </span>
                            {displayShippedKg < item.qty_ordered_kg ? (
                              <span className="text-[10px] text-blue-600 font-semibold mt-0.5">
                                Parsial (Sisa {formatKg(item.qty_ordered_kg - displayShippedKg)})
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                Lengkap ✓
                              </span>
                            )}

                            {/* Multi-trip breakdown per trip */}
                            {po.shipments && po.shipments.length > 1 && (
                              <div className="flex flex-wrap items-center justify-center gap-1 mt-1.5 pt-1 border-t border-slate-100 text-[10px]">
                                {po.shipments.map((s, sIdx) => {
                                  const itemInTrip = s.items.find((si: any) => si.po_item_id ? si.po_item_id === item.id : si.product_id === item.product_id);
                                  const tripQty = itemInTrip ? itemInTrip.qty_shipped_kg : 0;
                                  if (tripQty <= 0) return null;
                                  return (
                                    <span key={s.id || sIdx} className="bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded border border-slate-200 text-[9px]" title={`Trip ${s.trip_number || sIdx + 1}: ${s.surat_jalan_number || ''}`}>
                                      Trip {s.trip_number || sIdx + 1}: {formatKg(tripQty)}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Diterima */}
                      <td className="px-6 py-4 text-center">
                        {displayReceivedKg > 0 ? (
                          <div className="flex flex-col items-center">
                            <span className={`px-2.5 py-0.5 rounded-md inline-block font-mono font-bold text-xs ${
                              displayReceivedKg < item.qty_ordered_kg
                                ? 'text-amber-700 bg-amber-50 border border-amber-200'
                                : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            }`}>
                              {formatKg(displayReceivedKg)}
                            </span>
                            <span className={`text-[10px] font-semibold mt-0.5 ${
                              displayReceivedKg < item.qty_ordered_kg ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {displayReceivedKg < item.qty_ordered_kg
                                ? `Parsial (Sisa ${formatKg(item.qty_ordered_kg - displayReceivedKg)})`
                                : 'Lengkap ✓'}
                            </span>

                            {/* Multi-trip received breakdown */}
                            {po.shipments && po.shipments.length > 1 && (
                              <div className="flex flex-wrap items-center justify-center gap-1 mt-1.5 pt-1 border-t border-slate-100 text-[10px]">
                                {po.shipments.map((s, sIdx) => {
                                  const itemInTrip = s.items.find((si: any) => si.po_item_id ? si.po_item_id === item.id : si.product_id === item.product_id);
                                  const tripQty = itemInTrip ? itemInTrip.qty_shipped_kg : 0;
                                  if (tripQty <= 0) return null;
                                  const isTripReceived = s.status === 'DITERIMA';
                                  return (
                                    <span
                                      key={s.id || sIdx}
                                      className={`font-mono px-1.5 py-0.5 rounded border text-[9px] ${
                                        isTripReceived
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                                          : 'bg-amber-50 text-amber-800 border-amber-200 italic'
                                      }`}
                                      title={`Trip ${s.trip_number || sIdx + 1}: ${isTripReceived ? 'Diterima' : 'Belum Diterima'}`}
                                    >
                                      Trip {s.trip_number || sIdx + 1}: {formatKg(tripQty)} {isTripReceived ? '✓' : '⏳'}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Foreign Currency */}
                      {po.currency && po.currency !== 'IDR' && (
                        <td className="px-6 py-4 font-mono text-amber-700 font-bold text-right">
                          {po.currency} {(item.foreign_cost_per_kg || (item.cost_per_kg / (po.exchange_rate || 1))).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      )}

                      {/* HPP Satuan */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-700 text-right">
                        {formatIDR(item.cost_per_kg)} <span className="text-[10px] text-slate-400 font-normal">/Kg</span>
                      </td>

                      {/* Subtotal */}
                      <td className="px-6 py-4 font-mono font-extrabold text-blue-700 text-right">
                        {po.currency && po.currency !== 'IDR' ? (
                          <div>
                            <div className="text-amber-700">
                              {po.currency} {((item.foreign_cost_per_kg || (item.cost_per_kg / (po.exchange_rate || 1))) * item.qty_ordered_kg).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              ≈ {formatIDR(item.subtotal)}
                            </div>
                          </div>
                        ) : (
                          formatIDR(item.subtotal)
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

      {/* PDF Modal */}
      <POPDFModal isOpen={isPOPDFOpen} onClose={() => setIsPOPDFOpen(false)} po={po} companyConfig={companySettings} />

      {/* Goods Receipt Modal */}
      <GoodsReceiptModal
        isOpen={isGRModalOpen}
        onClose={() => {
          setIsGRModalOpen(false);
          setActiveShipmentForGR(null);
        }}
        po={po}
        shipment={activeShipmentForGR}
        onReceiveBatch={handleReceiveBatch}
      />

      {/* ===== Cancel PO Confirmation Modal ===== */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-bold text-red-800 text-base">Batalkan Purchase Order</h3>
                <p className="text-xs text-red-500">{po.po_number} — {po.distributor_name}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Tindakan ini akan mengubah status PO menjadi <strong className="text-red-600">DIBATALKAN</strong> dan tidak dapat diubah kembali ke status sebelumnya.
              </p>

              {/* Reason textarea */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Alasan Pembatalan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  placeholder="Tuliskan alasan pembatalan PO secara singkat dan jelas..."
                  rows={3}
                  maxLength={500}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-red-400 resize-none"
                />
                <div className="text-right text-[10px] text-slate-400 mt-0.5">{cancelNote.length}/500</div>
              </div>

              {/* Warning boxes for PO with shipments */}
              {po.shipments && po.shipments.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>PO ini sudah memiliki {po.shipments.length} pengiriman. Pembatalan tidak akan menghapus data pengiriman yang ada.</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setIsCancelModalOpen(false); setCancelNote(''); }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleCancelPO}
                  disabled={!cancelNote.trim() || isCancelSubmitting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCancelSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Membatalkan...</>
                  ) : (
                    <><XCircle className="w-4 h-4" /> Konfirmasi Batalkan PO</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===== Surat Jalan Distributor Modal ===== */}
      {isSJModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-xs">
            {/* Header */}
            <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 flex items-center gap-3">
              <Truck className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-blue-800 text-base">Surat Jalan Distributor</h3>
                <p className="text-xs text-blue-500">{po.po_number} — {po.distributor_name}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-500">
                Ditemukan {shipmentsWithSJ.length} berkas Surat Jalan yang diunggah untuk pengiriman multi-trip PO ini:
              </p>

              {/* List */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/20">
                {shipmentsWithSJ.map((s) => (
                  <div key={s.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <span>Trip #{s.trip_number}</span>
                        <span className="font-mono text-blue-700 font-bold">({s.surat_jalan_number || s.surat_jalan_name || '-'})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Tgl Kirim: {formatDate(s.shipment_date)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadSuratJalan(s)}
                        className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors text-[10px] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> {s.surat_jalan_data ? 'Unduh Lampiran' : 'Cetak Dokumen'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsSJModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Revert / Rollback Status Confirmation Modal ===== */}
      {isRevertModalOpen && (() => {
        const poItemIds = new Set(po.items.map((i) => i.id));
        const associatedBatches = batches.filter(
          (b) =>
            (b.po_item_id && poItemIds.has(b.po_item_id)) ||
            (b.batch_number && b.batch_number.includes(po.po_number))
        );

        const usedBatches = associatedBatches.filter((b) => {
          const initial = Number(b.initial_qty_kg || 0);
          const current = Number(b.current_qty_kg || 0);
          return current < initial;
        });

        const isStockBlocked = po.status === 'DITERIMA' && usedBatches.length > 0;
        const isAuthorizedForRollback = po.status !== 'DITERIMA' || isSuperAdmin || isSuperAdminApprovedOnSpot;

        const handleCloseRevertModal = () => {
          setIsRevertModalOpen(false);
          setRevertNote('');
          setSuperAdminEmail('');
          setSuperAdminPassword('');
          setSuperAdminAuthError('');
          setIsSuperAdminApprovedOnSpot(false);
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className={`px-6 py-4 flex items-center justify-between text-white ${
                isStockBlocked
                  ? 'bg-gradient-to-r from-red-600 to-rose-700'
                  : po.status === 'DITERIMA'
                  ? 'bg-gradient-to-r from-indigo-700 via-blue-700 to-amber-700'
                  : 'bg-gradient-to-r from-amber-600 to-amber-700'
              }`}>
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-5 h-5 text-amber-200" />
                  <div>
                    <h3 className="font-bold text-base">
                      {po.status === 'DITERIMA'
                        ? 'Rollback Status DITERIMA → DIKIRIM'
                        : 'Kembali ke Tahap Sebelumnya'}
                    </h3>
                    <p className="text-xs text-amber-100">{po.po_number} — {po.distributor_name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseRevertModal}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                {/* Super Admin Authorization Card for DITERIMA -> DIKIRIM */}
                {po.status === 'DITERIMA' && !isStockBlocked && (
                  !isAuthorizedForRollback ? (
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-4 space-y-3 text-indigo-950 shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <Lock className="w-5 h-5 text-indigo-700 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-extrabold text-xs text-indigo-900">
                            Persetujuan & Otorisasi Super Admin Diperlukan
                          </h4>
                          <p className="text-[11px] text-indigo-700 leading-tight mt-0.5">
                            Status &apos;DITERIMA&apos; menandakan barang fisik telah dicatat ke inventaris gudang FEFO. Pengembalian status ini memerlukan otorisasi resmi dari Super Admin untuk mereset batch secara aman.
                          </p>
                        </div>
                      </div>

                      {/* On-the-spot Super Admin Login Form */}
                      <form onSubmit={handleAuthorizeSuperAdminOnSpot} className="space-y-2.5 pt-2 border-t border-indigo-200/80">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                          Masukkan Kredensial Super Admin untuk Otorisasi:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-700 block mb-0.5">
                              Email / Username
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="superadmin@artaroma.com"
                              value={superAdminEmail}
                              onChange={(e) => setSuperAdminEmail(e.target.value)}
                              className="w-full bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-700 block mb-0.5">
                              Password Super Admin
                            </label>
                            <input
                              type="password"
                              required
                              placeholder="••••••••"
                              value={superAdminPassword}
                              onChange={(e) => setSuperAdminPassword(e.target.value)}
                              className="w-full bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                        </div>

                        {superAdminAuthError && (
                          <div className="text-[11px] text-red-700 font-semibold bg-red-50 p-2 rounded-lg border border-red-200">
                            {superAdminAuthError}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isAuthorizingSuperAdmin}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isAuthorizingSuperAdmin ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Memverifikasi Otorisasi Super Admin...</span>
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Verifikasi & Buka Kunci Persetujuan Super Admin</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center gap-2 text-emerald-900 text-xs shadow-2xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div>
                        <strong className="block font-bold text-emerald-950">Otorisasi Super Admin Disetujui ✓</strong>
                        <span className="text-[11px] text-emerald-700">
                          {isSuperAdminApprovedOnSpot
                            ? `Disetujui via otorisasi kredensial (${superAdminEmail})`
                            : `Akun aktif terverifikasi sebagai Super Admin (${currentUser?.name || 'Super Admin HQ'})`}
                        </span>
                      </div>
                    </div>
                  )
                )}

                {/* Blocked Alert if stock is used */}
                {isStockBlocked ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3 text-red-900">
                    <div className="font-bold text-sm text-red-950 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span>Rollback Ditolak: Sebagian Stok Telah Terpakai</span>
                    </div>
                    <p className="text-xs text-red-800 leading-relaxed">
                      Status penerimaan PO ini tidak dapat di-rollback otomatis karena barang sudah terpotong oleh transaksi penjualan (SO) atau proses repacking. Mereset status sekarang akan menyebabkan <strong>stok gudang minus atau tidak seimbang</strong>.
                    </p>

                    <div className="space-y-1.5 pt-2 border-t border-red-200">
                      <div className="font-bold text-[11px] text-red-950 uppercase tracking-wider">
                        Rincian Batch yang Telah Digunakan:
                      </div>
                      <div className="divide-y divide-red-200/70 max-h-36 overflow-y-auto bg-white/70 rounded-lg p-2.5 border border-red-200">
                        {usedBatches.map((b) => {
                          const init = Number(b.initial_qty_kg || 0);
                          const curr = Number(b.current_qty_kg || 0);
                          const used = Math.max(0, init - curr);
                          return (
                            <div key={b.id} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between text-[11px]">
                              <div>
                                <strong className="text-slate-800">{b.product_name || 'Bibit Parfum'}</strong>
                                <div className="text-[10px] text-slate-500 font-mono">Batch #{b.batch_number}</div>
                              </div>
                              <div className="text-right font-mono">
                                <span className="text-red-700 font-bold">Terpakai: {formatKg(used)}</span>
                                <div className="text-[10px] text-slate-500">Sisa: {formatKg(curr)} / {formatKg(init)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-red-200 text-[11px] text-slate-700 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Solusi Rekomendasi:</strong> Jika terjadi selisih kuantitas fisik di gudang, silakan gunakan fitur <strong>Stok Opname / Stock Adjustment</strong> untuk menyesuaikan stok secara akuntabel.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-amber-900">
                    <div className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      {po.status === 'DIKIRIM'
                        ? 'Konfirmasi Rollback ke Tahap 1: Diajukan (BUAT_EMAIL)'
                        : 'Konfirmasi Rollback ke Tahap 2: Dikirim (DIKIRIM)'}
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {po.status === 'DIKIRIM'
                        ? 'Gunakan opsi ini jika terdapat kesalahan input data kuantitas dikirim, salah nomor Surat Jalan, atau distributor belum jadi mengirimkan barang.'
                        : 'Gunakan opsi ini jika terdapat kesalahan saat proses penerimaan barang atau input nomor batch di gudang.'}
                    </p>

                    <div className="space-y-1.5 pt-1 text-[11px] border-t border-amber-200/80">
                      <div className="font-semibold text-amber-950">Dampak Aksi Ini:</div>
                      {po.status === 'DIKIRIM' ? (
                        <ul className="list-disc list-inside space-y-1 text-amber-850">
                          <li>Status PO dikembalikan ke <strong>DIAJUKAN (BUAT_EMAIL)</strong>.</li>
                          <li>Data pengiriman dan Surat Jalan yang ada akan direset agar Anda dapat menginput ulang dari awal dengan benar.</li>
                          <li>Kuantitas terkirim seluruh item dikembalikan ke 0 Kg.</li>
                        </ul>
                      ) : (
                        <ul className="list-disc list-inside space-y-1 text-amber-850">
                          <li>Status PO dikembalikan ke <strong>DIKIRIM</strong>.</li>
                          <li>Status pengiriman barang dikembalikan ke dalam perjalanan sehingga tim gudang dapat menginput ulang penerimaan.</li>
                          <li>Batch barang masuk ({associatedBatches.length} batch) terverifikasi <strong>masih utuh 100%</strong> dan akan otomatis ditarik dari gudang FEFO.</li>
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* Catatan Alasan */}
                {!isStockBlocked && isAuthorizedForRollback && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Catatan Alasan Koreksi (Opsional)
                    </label>
                    <textarea
                      value={revertNote}
                      onChange={(e) => setRevertNote(e.target.value)}
                      placeholder="Contoh: Koreksi jumlah kg salah input / salah nomor surat jalan vendor..."
                      rows={2}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>
                )}

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseRevertModal}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                  >
                    {isStockBlocked ? 'Tutup' : 'Batal'}
                  </button>
                  {!isStockBlocked && (
                    <button
                      type="button"
                      onClick={handleRevertStatus}
                      disabled={isRevertSubmitting || !isAuthorizedForRollback}
                      className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                        !isAuthorizedForRollback
                          ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                          : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                      } disabled:opacity-60`}
                    >
                      {isRevertSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Memproses...</span>
                        </>
                      ) : !isAuthorizedForRollback ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Butuh Persetujuan Super Admin</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>
                            {po.status === 'DIKIRIM'
                              ? 'Konfirmasi Kembali ke Tahap Diajukan'
                              : 'Konfirmasi Kembali ke Tahap Dikirim'}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* POPaymentModal */}
      <POPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        po={po}
        onConfirmPayment={handleConfirmPOPayment}
        isSubmitting={isPaymentSubmitting}
      />
    </div>
  );
}
