'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  ShoppingBag,
  Receipt,
  Sparkles,
  Layers,
  ChevronDown,
  FileText,
  ShoppingCart,
  CreditCard,
  Building2,
  LogOut,
  User,
  History,
  BookOpen,
  Truck,
  Store,
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  ExternalLink,
} from 'lucide-react';
import { formatIDR } from '@/lib/utils';

export function AdminTopNav() {
  const pathname = usePathname();
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [companyTagline, setCompanyTagline] = useState('B2B Fragrance Oil Supplier & Management Hub');
  const [currentUser, setCurrentUser] = useState<any>({
    name: 'Super Admin',
    role: 'ADMIN',
    email: 'admin@artaroma.co.id',
  });

  // Notification States for incoming Sales Orders
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [readOrderIds, setReadOrderIds] = useState<string[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [toastNewOrder, setToastNewOrder] = useState<any | null>(null);

  const financeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const prevPendingCountRef = useRef<number>(0);

  // Active section checks
  const isDashboardActive = pathname === '/admin';
  const isMasterActive = pathname.startsWith('/admin/master');
  const isStockActive = pathname.startsWith('/admin/stock');
  const isFinanceActive = pathname.startsWith('/admin/finance');
  const isTransactionsActive = pathname.startsWith('/admin/transactions');
  const isCatalogActive = pathname.startsWith('/customer');
  const isCourierActive = pathname.startsWith('/courier');

  const isPOActive = pathname.startsWith('/admin/procurement');
  const isSOActive = pathname.startsWith('/admin/sales-orders') || pathname.startsWith('/admin/orders');

  const isCustomerInvoicesActive = pathname === '/admin/finance';
  const isVendorPayablesActive = pathname.startsWith('/admin/finance/payables');

  // Load read order IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('artaroma_read_so_notifs');
      if (stored) {
        setReadOrderIds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch Pending Sales Orders for Notifications
  const fetchPendingOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/sales-orders', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const pendings = json.data.filter(
            (o: any) => o.status === 'PENDING_APPROVAL' || o.status === 'DIAJUKAN'
          );
          setPendingOrders(pendings);

          // Detect newly arrived order
          if (
            prevPendingCountRef.current !== 0 &&
            pendings.length > prevPendingCountRef.current
          ) {
            const newest = pendings[0];
            if (newest) {
              setToastNewOrder(newest);
            }
          }
          prevPendingCountRef.current = pendings.length;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch SO notifications:', err);
    }
  }, []);

  // Fetch company tagline, auth info, and setup polling for new SOs
  useEffect(() => {
    fetch('/api/company-settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.company_tagline) {
          setCompanyTagline(json.data.company_tagline);
        }
      })
      .catch((err) => console.warn('Failed to load company tagline in TopNav:', err));

    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.warn('Failed to load auth user in TopNav:', err));

    fetchPendingOrders();
    const interval = setInterval(fetchPendingOrders, 15000); // Check every 15s

    const handleNewSOCreated = () => {
      fetchPendingOrders();
    };
    window.addEventListener('artaroma_new_so_created', handleNewSOCreated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('artaroma_new_so_created', handleNewSOCreated);
    };
  }, [fetchPendingOrders]);

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      } catch {
        window.location.href = '/login';
      }
    }
  };

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (financeRef.current && !financeRef.current.contains(event.target as Node)) {
        setIsFinanceOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Mark all pending notifications as read
  const handleMarkAllAsRead = () => {
    const allIds = pendingOrders.map((o) => o.id);
    setReadOrderIds(allIds);
    try {
      localStorage.setItem('artaroma_read_so_notifs', JSON.stringify(allIds));
    } catch {
      // ignore
    }
  };

  const handleMarkSingleAsRead = (orderId: string) => {
    if (!readOrderIds.includes(orderId)) {
      const updated = [...readOrderIds, orderId];
      setReadOrderIds(updated);
      try {
        localStorage.setItem('artaroma_read_so_notifs', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const unreadPendingOrders = pendingOrders.filter((o) => !readOrderIds.includes(o.id));
  const unreadCount = unreadPendingOrders.length;

  const initials = (currentUser?.name || 'Admin')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isSuperAdmin =
    currentUser?.is_super_admin ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'SUPER_ADMIN';
  const allowedMods: string[] = currentUser?.allowed_modules || [];

  // Permission flags based directly on assigned modules or Super Admin
  const canAccessDashboard = isSuperAdmin || allowedMods.includes('Dashboard');
  const canAccessMaster = isSuperAdmin || allowedMods.includes('Master Data');
  const canAccessPO = isSuperAdmin || allowedMods.includes('Purchase Order (PO)');
  const canAccessSO = isSuperAdmin || allowedMods.includes('Sales Order (SO)');
  const canAccessStock = isSuperAdmin || allowedMods.includes('Lihat Stok (Gudang)');
  const canAccessFinance = isSuperAdmin || allowedMods.includes('Finance & Invoice');
  const canAccessLogBook =
    isSuperAdmin || allowedMods.includes('Log Book & Arsip') || allowedMods.includes('Log Book');
  const canAccessCustomerCatalog = isSuperAdmin || allowedMods.includes('Katalog Customer');
  const canAccessCourierApp = isSuperAdmin || allowedMods.includes('Aplikasi Kurir');

  return (
    <>
      {/* Top Header Bar */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <Link href="/admin" className="flex items-center gap-3 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://artaroma.co.id/wp-content/uploads/2022/09/bibit-parfum-laundry.png"
              alt="Artaroma Logo"
              className="h-8 object-contain"
            />
            <div className="hidden sm:flex flex-col border-l border-slate-200 pl-3">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight leading-tight">
                {companyTagline}
              </span>
            </div>
          </Link>

          {/* Right side info & actions */}
          <div className="flex items-center gap-3.5 text-sm text-slate-500">
            <span className="hidden md:block text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
              FEFO Engine: ACTIVE
            </span>

            {/* REAL-TIME SO NOTIFICATIONS BELL WIDGET */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                title="Notifikasi Pesanan Masuk"
                className={`relative p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs border ${
                  unreadCount > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    : 'bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border-slate-200 hover:border-blue-200'
                }`}
              >
                {unreadCount > 0 ? (
                  <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs border-2 border-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {isNotifOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-xs">Notifikasi Pesanan Masuk</span>
                      {unreadCount > 0 && (
                        <span className="bg-amber-400 text-slate-900 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                          {unreadCount} Baru
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] text-blue-200 hover:text-white underline cursor-pointer"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                  </div>

                  {/* Body List */}
                  <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-100 text-xs">
                    {pendingOrders.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 space-y-1.5">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                        <div className="font-semibold text-xs text-slate-600">
                          Tidak Ada Pesanan Tertunda
                        </div>
                        <div className="text-[11px]">Semua Sales Order telah diproses/disetujui.</div>
                      </div>
                    ) : (
                      pendingOrders.map((order) => {
                        const isUnread = !readOrderIds.includes(order.id);
                        return (
                          <div
                            key={order.id}
                            className={`p-3.5 hover:bg-blue-50/50 transition-colors flex items-start justify-between gap-2.5 ${
                              isUnread ? 'bg-amber-50/40' : 'bg-white'
                            }`}
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-blue-700 text-xs">
                                  {order.so_number}
                                </span>
                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                                )}
                                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 rounded">
                                  Perlu Persetujuan
                                </span>
                              </div>
                              <div className="font-bold text-slate-800 text-xs truncate max-w-[220px]">
                                {order.customer_company || order.customer_name || 'Customer B2B'}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                                <span className="font-mono font-bold text-slate-700">
                                  {formatIDR(order.grand_total || order.total_amount || 0)}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 font-mono">
                                  <Clock className="w-3 h-3" />
                                  {order.order_date ? String(order.order_date).substring(0, 10) : 'Hari Ini'}
                                </span>
                              </div>
                            </div>
                            <Link
                              href={`/admin/orders/${order.id}`}
                              onClick={() => {
                                handleMarkSingleAsRead(order.id);
                                setIsNotifOpen(false);
                              }}
                              className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-2xs inline-flex items-center gap-1 transition-colors shrink-0 mt-1"
                            >
                              Tinjau <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="bg-slate-50 px-4 py-2 border-t border-gray-200 text-center">
                    <Link
                      href="/admin/sales-orders"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-[11px] font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
                    >
                      Buka Semua Sales Order <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-black shadow-xs">
                  {initials}
                </div>
                <div className="hidden md:block leading-tight text-left">
                  <div className="text-xs font-bold text-slate-800">
                    {currentUser?.name || 'Super Admin'}
                  </div>
                  <div className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">
                    {isSuperAdmin ? 'SUPER ADMIN' : `${allowedMods.length} Modul Aktif`}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                title="Keluar / Logout"
                className="bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 p-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-[11px]">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Horizontal Navigation Menu Bar */}
      <nav className="bg-blue-700 sticky top-14 z-30 shadow-md">
        <div className="max-w-screen-2xl mx-auto px-6">
          <div className="flex items-center h-11 gap-1 overflow-visible flex-wrap sm:flex-nowrap">
            {/* Dashboard */}
            {canAccessDashboard && (
              <Link
                href="/admin"
                className={`flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isDashboardActive
                    ? 'bg-white/15 text-white border-white'
                    : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
            )}

            {/* Master Data */}
            {canAccessMaster && (
              <Link
                href="/admin/master"
                className={`flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isMasterActive
                    ? 'bg-white/15 text-white border-white'
                    : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Master Data</span>
              </Link>
            )}

            {/* Purchase Order (PO) */}
            {canAccessPO && (
              <Link
                href="/admin/procurement"
                className={`flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isPOActive
                    ? 'bg-white/15 text-white border-white'
                    : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Purchase Order (PO)</span>
              </Link>
            )}

            {/* Sales Order (SO) */}
            {canAccessSO && (
              <Link
                href="/admin/sales-orders"
                className={`flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all border-b-2 whitespace-nowrap relative ${
                  isSOActive
                    ? 'bg-white/15 text-white border-white'
                    : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Sales Order (SO)</span>
                {unreadCount > 0 && (
                  <span className="bg-amber-400 text-slate-900 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Lihat Stok */}
            {canAccessStock && (
              <Link
                href="/admin/stock"
                className={`flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isStockActive
                    ? 'bg-white/15 text-white border-white'
                    : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Lihat Stok</span>
              </Link>
            )}

            {/* Log Book Operasional & Riwayat Aktivitas */}
            {canAccessLogBook && (
              <Link
                href="/admin/transactions"
                className={`flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isTransactionsActive
                    ? 'bg-white/15 text-white border-white'
                    : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Log Book</span>
              </Link>
            )}

            {/* Katalog Customer */}
            {canAccessCustomerCatalog && (
              <Link
                href="/customer/catalog"
                className={`flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isCatalogActive
                    ? 'bg-white/15 text-white border-white'
                    : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Katalog Customer</span>
              </Link>
            )}

            {/* Aplikasi Kurir */}
            {canAccessCourierApp && (
              <Link
                href="/courier"
                className={`flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isCourierActive
                    ? 'bg-white/15 text-white border-white'
                    : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Aplikasi Kurir</span>
              </Link>
            )}

            {/* Dropdown Menu 2: Finance & Invoice */}
            {canAccessFinance && (
              <div ref={financeRef} className="relative h-full">
                <button
                  type="button"
                  onClick={() => {
                    setIsFinanceOpen((prev) => !prev);
                  }}
                  className={`flex items-center gap-1.5 px-4 h-full text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                    isFinanceActive
                      ? 'bg-white/20 text-white border-white font-bold'
                      : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Finance & Invoice</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${isFinanceOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Sub-menu Dropdown Finance */}
                {isFinanceOpen && (
                  <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in">
                    <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
                      Pilih Sub-Menu Keuangan:
                    </div>

                    <Link
                      href="/admin/finance"
                      onClick={() => setIsFinanceOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-blue-50 transition-colors ${
                        isCustomerInvoicesActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">1. Invoice Penjualan (Piutang)</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Tagihan & Verifikasi Bayar Customer
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/admin/finance/payables"
                      onClick={() => setIsFinanceOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-blue-50 transition-colors ${
                        isVendorPayablesActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">2. Tagihan Suplier (Hutang PO)</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Pembayaran & Bukti Transfer PO
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Sub-Bar Navigation when inside Finance Pages */}
      {isFinanceActive && (
        <div className="bg-blue-800 border-t border-blue-600 text-white shadow-inner">
          <div className="max-w-screen-2xl mx-auto px-6 flex items-center gap-2 py-1.5 text-xs font-semibold">
            <span className="text-blue-200 font-normal">Sub-Menu Keuangan:</span>
            <Link
              href="/admin/finance"
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                isCustomerInvoicesActive
                  ? 'bg-white text-blue-900 font-bold shadow-sm'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Invoice Penjualan (Piutang Customer)
            </Link>
            <Link
              href="/admin/finance/payables"
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                isVendorPayablesActive
                  ? 'bg-white text-blue-900 font-bold shadow-sm'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Tagihan Suplier (Hutang PO)
            </Link>
          </div>
        </div>
      )}

      {/* FLOATING REAL-TIME TOAST NOTIFICATION FOR NEW SALES ORDER */}
      {toastNewOrder && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-blue-500/50 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 text-amber-400 font-bold text-xs">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-400">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <span>Sales Order Baru Masuk!</span>
            </div>
            <button
              onClick={() => setToastNewOrder(null)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2.5 space-y-1 text-xs">
            <div className="font-mono font-extrabold text-blue-300">{toastNewOrder.so_number}</div>
            <div className="font-bold text-slate-100 truncate">
              {toastNewOrder.customer_company || toastNewOrder.customer_name || 'Customer B2B'}
            </div>
            <div className="text-slate-400 text-[11px]">
              Total:{' '}
              <strong className="text-emerald-400 font-mono">
                {formatIDR(toastNewOrder.grand_total || toastNewOrder.total_amount || 0)}
              </strong>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex justify-end gap-2 text-xs">
            <button
              onClick={() => setToastNewOrder(null)}
              className="px-3 py-1 text-slate-400 hover:text-white text-[11px] font-semibold cursor-pointer"
            >
              Nanti
            </button>
            <Link
              href={`/admin/orders/${toastNewOrder.id}`}
              onClick={() => {
                handleMarkSingleAsRead(toastNewOrder.id);
                setToastNewOrder(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              Tinjau Pesanan <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
