'use client';

import React, { useState, useEffect } from 'react';
import { CustomerNav } from '@/components/navigation/customer-nav';
import { CustomerOrderDetailModal } from '@/components/customer/customer-order-detail-modal';
import { initialCustomers } from '@/lib/mock-data';
import { Customer, Invoice, SalesOrder } from '@/lib/types';
import { formatIDR, formatKg } from '@/lib/utils';
import {
  getStoredOrders,
  getStoredInvoices,
  saveStoredInvoices,
  saveStoredOrders,
  updateSalesOrderStatus,
} from '@/lib/order-store';
import {
  FileText,
  Upload,
  Download,
  CheckCircle2,
  Clock,
  FileCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function CustomerOrdersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [currentCustomer, setCurrentCustomer] = useState<Customer>(initialCustomers[0]);

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Load orders & invoices from OrderStore & API
  const syncOrdersAndInvoices = () => {
    const storedInvoices = getStoredInvoices();
    setInvoices(storedInvoices);

    fetch('/api/sales-orders')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setSalesOrders(json.data);
          saveStoredOrders(json.data, false);
        } else {
          setSalesOrders(getStoredOrders());
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch sales orders from database, fallback to local storage:', err);
        setSalesOrders(getStoredOrders());
      });
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setCustomers(json.data);
        const savedId = localStorage.getItem('artaroma_customer_id');
        const matched = json.data.find((c: any) => c.id === savedId) || json.data[0];
        if (matched) {
          setCurrentCustomer(matched);
        }
      }
    } catch (err) {
      console.error('Failed to fetch customers in B2B orders:', err);
    }
  };

  useEffect(() => {
    syncOrdersAndInvoices();
    fetchCustomers();

    const handleUpdate = () => syncOrdersAndInvoices();
    window.addEventListener('artaroma_orders_updated', handleUpdate);
    window.addEventListener('artaroma_invoices_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('artaroma_orders_updated', handleUpdate);
      window.removeEventListener('artaroma_invoices_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const customerOrders = salesOrders.filter(
    (so) => so.customer_id === currentCustomer.id
  );

  const handleUploadSuccess = (invoiceId: string, proofUrl: string) => {
    const targetInv = invoices.find((inv) => inv.id === invoiceId || inv.so_id === selectedOrder?.id);
    const targetSoNumber = selectedOrder?.so_number || targetInv?.so_number;

    if (targetInv) {
      const updatedInvoices = invoices.map((inv) =>
        inv.id === targetInv.id
          ? {
              ...inv,
              payment_proof_url: proofUrl,
              payment_verification_status: 'PENDING' as const,
            }
          : inv
      );
      saveStoredInvoices(updatedInvoices);
    }

    if (targetSoNumber) {
      // Keep order status as is (DIAJUKAN or DIKONFIRMASI). Tim Keuangan will verify.
    }
    syncOrdersAndInvoices();
    alert('Bukti transfer pembayaran berhasil diunggah! Tim Keuangan akan segera memvalidasi pembayaran Anda.');
  };

  // Helper function to simulate Admin confirmation for demo/testing
  const handleSimulateAdminConfirm = (soNumber: string) => {
    const targetSO = salesOrders.find((so) => so.so_number === soNumber);
    if (!targetSO) return;

    let total = targetSO.grand_total;
    if (!total || total === 0) {
      total = targetSO.items.reduce(
        (sum, item) => sum + item.qty_kg * (item.unit_price_per_kg || 1850000),
        0
      );
    }

    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      invoice_number: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      so_id: targetSO.id,
      so_number: targetSO.so_number,
      customer_id: targetSO.customer_id,
      customer_name: targetSO.customer_company,
      status: 'UNPAID',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '2026-08-25',
      total_amount: total,
      paid_amount: 0,
      faktur_pajak_file_url: '/dummy-faktur-pajak.pdf',
    };

    updateSalesOrderStatus(
      soNumber,
      'DIKONFIRMASI',
      { grand_total: total, total_goods_amount: total },
      newInv
    );

    syncOrdersAndInvoices();
    alert(`Status pesanan ${soNumber} BERHASIL DIKONFIRMASI ADMIN!\nTotal Tagihan: Rp ${total.toLocaleString()}`);
  };

  const getStatusBadge = (status: SalesOrder['status']) => {
    switch (status) {
      case 'DIAJUKAN':
      case 'PENDING_APPROVAL':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DIKONFIRMASI':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DIBAYAR':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PROSES_GUDANG':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DIKIRIM':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'DITERIMA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-20">
      <CustomerNav
        currentCustomer={currentCustomer}
        onCustomerChange={(id) => {
          const c = customers.find((c) => c.id === id);
          if (c) {
            setCurrentCustomer(c);
            localStorage.setItem('artaroma_customer_id', id);
          }
        }}
        allCustomers={customers}
      />

      <main className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
        {/* Title & Sync Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Histori Pesanan & Status Alur Tagihan
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {currentCustomer.company_name} — Pantau Alur (Diajukan &rarr; Dikonfirmasi &rarr; Proses Gudang &rarr; Dikirim &rarr; Diterima)
            </p>
          </div>

          <button
            onClick={syncOrdersAndInvoices}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Status Pesanan
          </button>
        </div>

        {/* Workflow Lifecycle Summary Banner (5 Steps) */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Alur Status Pesanan B2B (5 Proses):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 font-medium text-amber-800">
              1. DIAJUKAN
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 font-medium text-blue-800">
              2. DIKONFIRMASI
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 font-medium text-indigo-800">
              3. PROSES GUDANG
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-2 font-medium text-teal-800">
              4. DIKIRIM
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 font-medium text-emerald-800">
              5. DITERIMA
            </div>
          </div>
        </div>

        {/* Orders List Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {customerOrders.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              Belum ada riwayat pesanan untuk akun <strong>{currentCustomer.company_name}</strong>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-6 py-3">No. SO / Tanggal</th>
                    <th className="px-6 py-3">Item Bibit Parfum (Kg)</th>
                    <th className="px-6 py-3">Total Tagihan</th>
                    <th className="px-6 py-3">Status Alur Pesanan</th>
                    <th className="px-6 py-3">Bukti Pembayaran</th>
                    <th className="px-6 py-3 text-right">Dokumen PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerOrders.map((so) => {
                    const inv = invoices.find((i) => i.so_number === so.so_number || i.so_id === so.id);

                    return (
                      <tr key={so.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          {/* CLICKABLE NO. SO LINK/BUTTON TO OPEN ORDER DETAILS & PAYMENT MODAL */}
                          <button
                            onClick={() => {
                              setSelectedOrder(so);
                              setSelectedInvoice(inv || null);
                            }}
                            className="font-mono font-bold text-blue-700 hover:underline flex items-center gap-1 text-left"
                          >
                            {so.so_number} <ExternalLink className="w-3 h-3 text-blue-500" />
                          </button>
                          <div className="text-[11px] text-slate-400">{so.order_date}</div>
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-600">
                          {so.items.map((item, idx) => (
                            <div key={idx}>
                              • {item.product_name} (
                              <span className="font-mono font-semibold text-blue-700">
                                {formatKg(item.qty_kg)}
                              </span>
                              )
                            </div>
                          ))}
                        </td>

                        <td className="px-6 py-4 font-mono font-bold text-slate-800">
                          {so.grand_total ? (
                            <span className="text-blue-700">{formatIDR(so.grand_total)}</span>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded font-normal italic border border-amber-200 block w-max">
                                Menunggu Harga Admin
                              </span>
                              <button
                                onClick={() => handleSimulateAdminConfirm(so.so_number)}
                                className="text-[10px] text-blue-600 hover:text-blue-800 underline block font-semibold"
                              >
                                ⚡ [Simulasi Konfirmasi Admin]
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getStatusBadge(
                              so.status
                            )}`}
                          >
                            {so.status === 'PENDING_APPROVAL' ? 'DIAJUKAN' : so.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {so.status === 'DIAJUKAN' ? (
                            <div className="space-y-1">
                              <span className="text-xs text-slate-400 italic block">
                                Menunggu konfirmasi admin
                              </span>
                              <button
                                onClick={() => handleSimulateAdminConfirm(so.so_number)}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded"
                              >
                                + Set Status: DIKONFIRMASI
                              </button>
                            </div>
                          ) : (so.status === 'DIKONFIRMASI' || so.status === 'APPROVED') ? (
                            <button
                              onClick={() => {
                                setSelectedOrder(so);
                                setSelectedInvoice(inv || null);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Upload className="w-3.5 h-3.5" /> Upload Bukti Bayar
                            </button>
                          ) : inv?.payment_verification_status === 'PENDING' || so.status === 'DIBAYAR' ? (
                            <span className="text-purple-700 bg-purple-50 border border-purple-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-max">
                              <Clock className="w-3.5 h-3.5" /> Pengecekan Finance
                            </span>
                          ) : (
                            <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Lunas / Diterima
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right space-x-2">
                          {inv ? (
                            <>
                              <button
                                onClick={() =>
                                  alert(`Download Invoice PDF ${inv.invoice_number}`)
                                }
                                className="bg-white hover:bg-gray-50 text-slate-700 border border-gray-200 font-semibold text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5 text-blue-500" /> Invoice
                              </button>
                              {inv.faktur_pajak_file_url ? (
                                <button
                                  onClick={() =>
                                    alert(`Download Faktur Pajak PDF ${inv.invoice_number}`)
                                  }
                                  className="bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 transition-colors"
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-amber-600" /> Faktur Pajak
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">
                                  Pajak Pending
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Belum terbit</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* DETAILED ORDER & PAYMENT MODAL */}
      <CustomerOrderDetailModal
        isOpen={!!selectedOrder}
        onClose={() => {
          setSelectedOrder(null);
          setSelectedInvoice(null);
        }}
        order={selectedOrder}
        invoice={selectedInvoice}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
