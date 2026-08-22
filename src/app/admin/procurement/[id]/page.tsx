'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { POPDFModal } from '@/components/common/po-pdf-modal';
import { GoodsReceiptModal } from '@/components/admin/po-modal';
import {
  initialPurchaseOrders,
  initialBatches,
} from '@/lib/mock-data';
import { PurchaseOrder, StockBatch, Distributor } from '@/lib/types';
import { formatIDR, formatKg, formatDate, formatDateTime } from '@/lib/utils';
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

  // Confirmed shipping quantities state
  const [shippedQtys, setShippedQtys] = useState<Record<string, number>>({});
  const [suratJalanName, setSuratJalanName] = useState<string>('');
  const [suratJalanData, setSuratJalanData] = useState<string>('');
  const [activeShipmentForGR, setActiveShipmentForGR] = useState<any | null>(null);

  // Cancel PO modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);

  // Surat Jalan list modal state
  const [isSJModalOpen, setIsSJModalOpen] = useState(false);

  // Company / Warehouse Settings state
  const [companySettings, setCompanySettings] = useState<any>({
    company_name: 'PT Artaroma Jayatama',
    company_tagline: 'B2B Fragrance Oil Supplier & Management Hub',
    warehouse_address: 'Jl. Elang Raya, Perum Kampoeng Elang Blok A5 Semarang – 50272',
    logistics_pic: 'Tim Gudang FEFO Engine',
    delivery_schedule_rule: 'Max 7 Hari setelah PO diterbitkan',
  });

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
    sjName: string,
    sjData?: string
  ) => {
    const nextTripNumber = (po.shipments?.length || 0) + 1;
    const newShipment = {
      id: `sj-${Date.now()}`,
      trip_number: nextTripNumber,
      shipment_date: new Date().toISOString().split('T')[0],
      surat_jalan_name: sjName,
      surat_jalan_data: sjData || suratJalanData,
      status: 'DIKIRIM' as const,
      items: itemsShipped,
    };
    
    const updatedShipments = [...(po.shipments || []), newShipment];
    
    // Update po.items qty_shipped_kg — match by po_item_id first, fallback to product_id
    const updatedPOItems = po.items.map((item) => {
      const sumShipped = updatedShipments.reduce((sum, s) => {
        const itemVal = s.items.find(si =>
          si.po_item_id ? si.po_item_id === item.id : si.product_id === item.product_id
        );
        return sum + (itemVal ? itemVal.qty_shipped_kg : 0);
      }, 0);
      return { ...item, qty_shipped_kg: sumShipped };
    });

    const updatedPO = {
      ...po,
      status: 'DIKIRIM' as const,
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
    
    if (shipmentId && po.shipments) {
      const updatedShipments = po.shipments.map(s => 
        s.id === shipmentId ? { ...s, status: 'DITERIMA' as const } : s
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
        shipments: updatedShipments
      };

      setPurchaseOrders(
        purchaseOrders.map((p) =>
          p.id === po.id ? updatedPO : p
        )
      );

      savePOUpdate(updatedPO);
    } else {
      handleAdvanceStatus('DITERIMA');
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
    ? (lastReceivedShipment ? formatDateTime(lastReceivedShipment.shipment_date) : formatDate(new Date().toISOString()))
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

  // Tahapan PO: Buat Email -> Pesanan Dikirim -> Pesanan Diterima
  const steps = [
    {
      key: 'BUAT_EMAIL',
      title: 'Buat Email',
      time: stepBuatEmailTime,
      actor: 'Oleh ADMIN PROCUREMENT',
    },
    {
      key: 'DIKIRIM',
      title: 'Pesanan Dikirim',
      time: (po.status === 'DIKIRIM' || po.status === 'DITERIMA') ? stepDikirimTime : '-',
      actor: 'Oleh EKSPEDISI CARGO DISTRIBUTOR',
    },
    {
      key: 'DITERIMA',
      title: 'Pesanan Diterima',
      time: stepDiterimaTime,
      actor: 'Oleh GUDANG FEFO ARTAROMA',
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
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Status Purchase Order (3 Tahapan Alur Kerja)
            </div>
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
                    <div className="font-semibold text-slate-600">{step.time}</div>
                    <div className="text-[10px] text-slate-400 uppercase leading-tight font-medium">
                      {step.actor}
                    </div>
                  </div>
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
          {po.status === 'BUAT_EMAIL' && (
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
                    return (
                      <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="font-bold text-slate-800">{item.product_name}</div>
                          <div className="text-slate-400 text-[10px] flex items-center gap-1.5 mt-0.5">
                            <span>Dipesan:</span>
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
                    );
                  })}
                </div>
              </div>

              {/* Surat Jalan File Upload */}
              <div className="space-y-2 pt-2">
                <div className="font-bold text-slate-750 uppercase tracking-wider text-[10px] text-slate-700">
                  Upload Dokumen Surat Jalan dari Distributor <span className="text-red-500">*</span>
                </div>
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 text-center bg-slate-50/30 transition-all relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    required
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
                    <div className="flex items-center justify-center gap-1.5 text-blue-700 font-bold font-mono">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>{suratJalanName}</span>
                    </div>
                  ) : (
                    <div className="space-y-1 text-slate-500">
                      <div className="font-bold text-[11px] text-slate-700">Pilih atau seret file Surat Jalan di sini</div>
                      <div className="text-[10px] text-slate-400">Mendukung format gambar (JPG/PNG) atau PDF</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-155 flex justify-end">
                <button
                  onClick={() => {
                    if (!suratJalanName) {
                      alert('Harap unggah Surat Jalan dari distributor terlebih dahulu.');
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

                    handleAddShipment(itemsShipped, suratJalanName);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-md inline-flex items-center gap-1.5 transition-colors animate-in fade-in"
                >
                  <Send className="w-4 h-4" /> Konfirmasi Pesanan Telah Dikirim oleh Distributor (Status: DIKIRIM)
                </button>
              </div>
            </div>
          )}

          {/* Action Step 2: DIKIRIM */}
          {po.status === 'DIKIRIM' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Shipments List */}
              <div className="bg-white p-5 rounded-xl border border-blue-100 text-xs space-y-3 shadow-sm">
                <div className="font-bold text-slate-800 text-sm border-b border-gray-100 pb-2 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600" /> Daftar Pengiriman Multi-Trip (Surat Jalan)
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
                        <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                          s.status === 'DITERIMA' 
                            ? 'bg-emerald-100 text-emerald-800 font-extrabold' 
                            : 'bg-amber-100 text-amber-800 font-extrabold'
                        }`}>
                          {s.status === 'DITERIMA' ? 'Sudah Masuk Gudang' : 'Dalam Perjalanan'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-slate-100 py-2.5 my-1">
                        <div className="flex items-center gap-1.5 text-slate-600 font-semibold flex-wrap">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <span>Surat Jalan: <strong className="text-slate-800 font-mono">{s.surat_jalan_name}</strong></span>
                          <button
                            onClick={() => handleDownloadSuratJalan(s)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ml-1 cursor-pointer transition-colors"
                            title="Unduh Surat Jalan ini"
                          >
                            <Download className="w-3 h-3" /> Unduh
                          </button>
                        </div>
                        
                        {s.status === 'DIKIRIM' && (
                          <button
                            onClick={() => {
                              setActiveShipmentForGR(s);
                              setIsGRModalOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1"
                          >
                            <PackageCheck className="w-3.5 h-3.5" /> Input Goods Receipt (Masuk Gudang)
                          </button>
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

                    {/* Surat Jalan Upload */}
                    <div className="space-y-2">
                      <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Upload Surat Jalan Trip #{nextTripNum} <span className="text-red-500">*</span>
                      </div>
                      <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 text-center bg-slate-50/30 transition-all relative cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          required
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
                          <div className="flex items-center justify-center gap-1.5 text-blue-700 font-bold font-mono">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span>{suratJalanName}</span>
                          </div>
                        ) : (
                          <div className="space-y-1 text-slate-500">
                            <div className="font-bold text-[11px] text-slate-700">Pilih atau seret file Surat Jalan Trip #{nextTripNum} di sini</div>
                            <div className="text-[10px] text-slate-400">Mendukung format gambar atau PDF</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => {
                          if (!suratJalanName) {
                            alert(`Harap unggah Surat Jalan untuk Trip #${nextTripNum} terlebih dahulu.`);
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

                          handleAddShipment(itemsShipped, suratJalanName);
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
            <div className="bg-white p-4 rounded-lg border border-blue-100 text-xs space-y-1 text-slate-700">
              <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Procurement Selesai — Goods Receipt & Batch FEFO Telah Masuk Inventaris Gudang
              </div>
              <div>Tanggal Penerimaan Gudang: 23 JUL 2026 08:30</div>
            </div>
          )}
        </div>

        {/* Item Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-800">
              Item Pesanan Purchase Order ({po.items.length})
            </h2>
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
                <span className="text-xs font-mono font-bold text-blue-700">
                  Total PO: {formatIDR(po.total_amount)}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                  <th className="px-6 py-3">Material / Bibit Parfum</th>
                  <th className="px-6 py-3">Pesanan (Kg)</th>
                  {po.currency && po.currency !== 'IDR' && (
                    <th className="px-6 py-3 text-right">Harga ({po.currency})</th>
                  )}
                  <th className="px-6 py-3 text-right">HPP / Kg (IDR)</th>
                  <th className="px-6 py-3 text-right">Subtotal</th>
                  <th className="px-6 py-3">Batch Number (FEFO)</th>
                  <th className="px-6 py-3">Status Item</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {po.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{item.product_name}</div>
                      <div className="text-xs text-blue-600 font-mono mt-0.5">
                        {item.qty_ordered_kg % 25 === 0
                          ? `Kemasan 25 Kg × ${item.qty_ordered_kg / 25} unit`
                          : item.qty_ordered_kg % 5 === 0
                          ? `Kemasan 5 Kg × ${item.qty_ordered_kg / 5} unit`
                          : item.qty_ordered_kg % 1 === 0
                          ? `Kemasan 1 Kg × ${item.qty_ordered_kg} unit`
                          : `${formatKg(item.qty_ordered_kg)} total`}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-slate-800">
                        {formatKg(item.qty_ordered_kg)}
                      </div>
                      {item.qty_shipped_kg !== undefined && (
                        <div className="text-[10px] text-slate-500 font-semibold mt-1">
                          Dikirim: <span className="text-blue-700 font-bold font-mono">{formatKg(item.qty_shipped_kg)}</span>
                        </div>
                      )}
                    </td>

                    {po.currency && po.currency !== 'IDR' && (
                      <td className="px-6 py-4 font-mono text-amber-700 font-bold text-right">
                        {po.currency} {(item.foreign_cost_per_kg || (item.cost_per_kg / (po.exchange_rate || 1))).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    )}

                    <td className="px-6 py-4 font-mono text-slate-700 text-right">
                      {formatIDR(item.cost_per_kg)}
                    </td>

                    <td className="px-6 py-4 font-mono font-bold text-slate-800 text-right">
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

                    <td className="px-6 py-4 text-xs">
                      {po.status === 'DITERIMA' ? (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-mono font-semibold">
                          BTC-2026-88
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum Diterima</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {(po.status === 'DIBATALKAN' || po.status === 'CANCELLED') ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Dibatalkan
                        </span>
                      ) : po.status === 'DITERIMA' ? (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Masuk Gudang
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">Dalam Process</span>
                      )}
                    </td>
                  </tr>
                ))}
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
                      <div className="font-bold text-slate-800 text-xs">Trip #{s.trip_number}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.shipment_date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600 truncate max-w-[150px] text-[10px]" title={s.surat_jalan_name}>
                        {s.surat_jalan_name}
                      </span>
                      <button
                        onClick={() => handleDownloadSuratJalan(s)}
                        className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors text-[10px] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh
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
    </div>
  );
}
