'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import { getStoredOrders, saveStoredOrders } from '@/lib/order-store';
import { SalesOrder } from '@/lib/types';
import { formatIDR, formatKg } from '@/lib/utils';
import { FileText, Eye, EyeOff, Lock, ExternalLink, ShoppingCart, RefreshCw } from 'lucide-react';

export default function SalesOrdersPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFinancialHidden, setIsFinancialHidden] = useState(false);

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
        // Ensure each order has an items array (DB may return null)
        const normalized = json.data.map((so: any) => ({
          ...so,
          items: Array.isArray(so.items) ? so.items : [],
        }));
        setSalesOrders(normalized);
        saveStoredOrders(normalized, false);
      } else {
        setSalesOrders(getStoredOrders());
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
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Sales Order (Pesanan Customer B2B)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Daftar Pesanan Penjualan dari Customer.
          </p>
        </div>

        {/* Sales Orders List Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-700">Daftar Sales Order (SO)</h2>
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
                ) : salesOrders.map((so) => (
                  <tr key={so.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/admin/orders/${so.id}`}
                        className="font-mono font-bold text-blue-700 hover:underline flex items-center gap-1 text-sm"
                      >
                        {so.so_number} <ExternalLink className="w-3 h-3" />
                      </Link>
                      <div className="text-[11px] text-slate-400">{so.order_date ? new Date(so.order_date).toLocaleString('id-ID') : '-'}</div>
                    </td>

                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-800">{so.customer_company || so.customer_name || so.customer_id}</div>
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
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-800">
                        {so.grand_total ? formatIDR(so.grand_total) : <span className="text-amber-600 italic font-sans text-xs">Menunggu Konfirmasi Admin</span>}
                      </td>
                    )}

                    <td className="px-6 py-3.5">
                      {getStatusBadge(so.status)}
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/admin/orders/${so.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-sm transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail SO
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
