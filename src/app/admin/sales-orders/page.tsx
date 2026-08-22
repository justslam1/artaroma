'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { getStoredOrders, saveStoredOrders } from '@/lib/order-store';
import { SalesOrder } from '@/lib/types';
import { formatIDR, formatKg, formatDate } from '@/lib/utils';
import { FileText, Eye, EyeOff, Lock, ExternalLink, ShoppingCart, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { exportSalesOrdersToXLSX } from '@/lib/export-excel';
import { canUserExportXLSX } from '@/lib/auth';

export default function SalesOrdersPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFinancialHidden, setIsFinancialHidden] = useState(false);
  const [readOrderIds, setReadOrderIds] = useState<string[]>([]);

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
        currentUser.allowed_modules.includes('Finance & Invoice')));

  const showFinancialColumn = canViewFinancials && !isFinancialHidden;

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
                  onClick={() => exportSalesOrdersToXLSX(salesOrders)}
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
              <span className="text-xs text-slate-400 font-medium">{isLoading ? 'Memuat...' : `${salesOrders.length} Pesanan`}</span>
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
                  <th className="px-6 py-3">Customer B2B</th>
                  <th className="px-6 py-3">Rincian Item Dipesan</th>
                  {showFinancialColumn && <th className="px-6 py-3">Total Nilai Tagihan</th>}
                  <th className="px-6 py-3">STATUS SO</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={showFinancialColumn ? 6 : 5} className="px-6 py-12 text-center text-slate-400 text-sm">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                      Memuat data pesanan dari database...
                    </td>
                  </tr>
                ) : salesOrders.length === 0 ? (
                  <tr>
                    <td colSpan={showFinancialColumn ? 6 : 5} className="px-6 py-12 text-center text-slate-400 text-sm">
                      Belum ada Sales Order masuk. Pesanan dari Customer B2B akan muncul di sini.
                    </td>
                  </tr>
                ) : salesOrders.map((so) => {
                  const isRead = readOrderIds.includes(so.id);
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

                      <td className="px-6 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          {getStatusBadge(so.status)}
                          {so.requires_super_admin_approval && (so.credit_approval_status === 'PENDING' || !so.credit_approval_status) && (
                            <span className="text-[10px] font-extrabold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              ⚠️ Butuh Approval Super Admin
                            </span>
                          )}
                          {so.requires_super_admin_approval && so.credit_approval_status === 'APPROVED' && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              ✓ Approved Super Admin
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/admin/orders/${so.id}`}
                          onClick={() => markAsRead(so.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-sm transition-colors ${
                            isRead
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold'
                              : 'bg-blue-600 hover:bg-blue-700 text-white font-bold'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail SO
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
