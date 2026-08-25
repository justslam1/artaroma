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
  Landmark,
  Wallet,
  AlertTriangle,
  FileCheck,
  Activity,
} from 'lucide-react';
import { formatIDR } from '@/lib/utils';
import { getStoredInvoices, getStoredOrders } from '@/lib/order-store';
import { Invoice } from '@/lib/types';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function AdminTopNav() {
  const pathname = usePathname();
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [companyTagline, setCompanyTagline] = useState('B2B Fragrance Oil Supplier & Management Hub');
  const [currentUser, setCurrentUser] = useState<any>({
    name: 'Super Admin',
    role: 'ADMIN',
    email: 'admin@artaroma.co.id',
  });

  // Multi-Category Notification States
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [proofOrders, setProofOrders] = useState<any[]>([]);
  const [dueInvoices, setDueInvoices] = useState<any[]>([]);
  const [readNotifKeys, setReadNotifKeys] = useState<string[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'ALL' | 'ORDERS' | 'PROOFS' | 'DUES'>('ALL');
  const [toastNotif, setToastNotif] = useState<{ type: 'ORDER' | 'PROOF'; data: any } | null>(null);

  // Mobile Web Push Notification States
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [pushSubscriberCount, setPushSubscriberCount] = useState(0);

  const financeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const prevPendingCountRef = useRef<number>(0);
  const prevProofCountRef = useRef<number>(0);

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
  const isCashManagementActive = pathname.startsWith('/admin/finance/cash');
  const isDiagnosticsActive = pathname.startsWith('/admin/diagnostics');

  // Load read notification keys from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('artaroma_read_all_notifs');
      if (stored) {
        setReadNotifKeys(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch Multi-Category Notifications (Orders, Proofs, Receivables)
  const fetchAllNotifications = useCallback(async () => {
    try {
      let orders: any[] = [];
      const res = await fetch('/api/sales-orders', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          orders = json.data;
        }
      }

      if (orders.length === 0) {
        orders = getStoredOrders();
      }

      // 1. Pending Sales Orders (DIAJUKAN / PENDING_APPROVAL)
      const pendings = orders.filter(
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
          setToastNotif({ type: 'ORDER', data: newest });
        }
      }
      prevPendingCountRef.current = pendings.length;

      // 2. Incoming Payment Proofs (Customer uploaded transfer proof, awaiting admin verification)
      const proofs = orders.filter((o: any) => {
        const hasProof = Boolean(o.payment_proof_url || o.payment_proof);
        const isNotPaid = o.payment_status !== 'PAID' && o.payment_status !== 'LUNAS';
        const isNotCancelled = o.status !== 'CANCELLED' && o.status !== 'DIBATALKAN';
        return hasProof && isNotPaid && isNotCancelled;
      });
      setProofOrders(proofs);

      // Detect newly uploaded payment proof
      if (
        prevProofCountRef.current !== 0 &&
        proofs.length > prevProofCountRef.current
      ) {
        const newestProof = proofs[0];
        if (newestProof) {
          setToastNotif({ type: 'PROOF', data: newestProof });
        }
      }
      prevProofCountRef.current = proofs.length;

      // 3. Receivables Approaching Due Date / Overdue (Invoices H-3 or Overdue)
      const storedInvoices = getStoredInvoices();
      const allInvoices: Invoice[] = [...storedInvoices];

      // Merge any confirmed SOs not yet in storedInvoices
      orders.forEach((so) => {
        const isConfirmed = ['DIKONFIRMASI', 'PROSES_GUDANG', 'DIKIRIM', 'DITERIMA'].includes(so.status);
        if (isConfirmed) {
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

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueAlerts: any[] = [];
      allInvoices.forEach((inv) => {
        const total = Number(inv.total_amount) || 0;
        const paid = Number(inv.paid_amount) || 0;
        const remaining = total - paid;
        const isPaid = inv.status === 'PAID' || remaining <= 0;

        if (!isPaid && inv.due_date) {
          const dueDate = new Date(inv.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const diffTime = dueDate.getTime() - today.getTime();
          const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Alert if due in <= 3 days or already overdue (daysLeft < 0)
          if (daysLeft <= 3) {
            dueAlerts.push({
              ...inv,
              remaining_amount: remaining,
              daysLeft,
            });
          }
        }
      });

      // Sort by urgency (most overdue first)
      dueAlerts.sort((a, b) => a.daysLeft - b.daysLeft);
      setDueInvoices(dueAlerts);

    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  }, []);

  // Setup polling and event listeners for real-time updates
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

    fetchAllNotifications();
    const interval = setInterval(fetchAllNotifications, 15000); // Check every 15s

    // Check Push Notification support & active subscription status
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsPushSubscribed(Boolean(sub));
        });
      }).catch((err) => console.warn('[WebPush] SW registration error:', err));
    }

    // Fetch total subscribers count
    fetch('/api/notifications/push')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.subscriberCount !== undefined) {
          setPushSubscriberCount(json.subscriberCount);
        }
      })
      .catch((e) => console.warn(e));

    const handleDataUpdate = () => {
      fetchAllNotifications();
    };
    window.addEventListener('artaroma_new_so_created', handleDataUpdate);
    window.addEventListener('artaroma_orders_updated', handleDataUpdate);
    window.addEventListener('artaroma_invoices_updated', handleDataUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('artaroma_new_so_created', handleDataUpdate);
      window.removeEventListener('artaroma_orders_updated', handleDataUpdate);
      window.removeEventListener('artaroma_invoices_updated', handleDataUpdate);
    };
  }, [fetchAllNotifications]);

  const handleSubscribePush = async () => {
    if (!isPushSupported) {
      alert('Browser atau perangkat ini tidak mendukung Push Notification.');
      return;
    }

    setIsPushLoading(true);
    try {
      // 1. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Izin notifikasi ditolak. Silakan aktifkan izin notifikasi di pengaturan browser/HP Anda.');
        setIsPushLoading(false);
        return;
      }

      // 2. Fetch VAPID public key
      const keyRes = await fetch('/api/notifications/push');
      const keyJson = await keyRes.json();
      if (!keyJson.success || !keyJson.vapidPublicKey) {
        throw new Error('Gagal memuat VAPID Public Key dari server');
      }

      // 3. Register service worker and subscribe
      const registration = await navigator.serviceWorker.ready;
      const convertedKey = urlBase64ToUint8Array(keyJson.vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      // 4. Send subscription to server
      const saveRes = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          subscription,
          user: {
            id: currentUser?.id,
            name: currentUser?.name,
            role: currentUser?.role,
          },
        }),
      });

      const saveJson = await saveRes.json();
      if (saveJson.success) {
        setIsPushSubscribed(true);
        setPushSubscriberCount((prev) => prev + 1);
        alert('🎉 Selamat! Push Notification di HP/Browser Anda telah aktif! Anda akan menerima notifikasi bergetar & bersuara saat ada pesanan baru & bukti transfer.');
      } else {
        alert(saveJson.message || 'Gagal mendaftarkan notifikasi.');
      }
    } catch (err: any) {
      console.error('[WebPush] Subscribe error:', err);
      alert(`Gagal mengaktifkan push notification: ${err.message}`);
    } finally {
      setIsPushLoading(false);
    }
  };

  const handleTestPushNotification = async () => {
    setIsPushLoading(true);
    try {
      const res = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          payload: {
            title: '🔔 Uji Coba Notifikasi Artaroma',
            body: `Halo ${currentUser?.name || 'Admin'}! Push notification di HP Anda berfungsi normal (Vibrasi & Suara Aktif).`,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || 'Notifikasi uji coba berhasil dikirim!');
      } else {
        alert(json.message || 'Gagal mengirim uji coba notifikasi.');
      }
    } catch (err: any) {
      alert(`Error mengirim test notifikasi: ${err.message}`);
    } finally {
      setIsPushLoading(false);
    }
  };

  const handleUnsubscribePush = async () => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan Push Notification pada perangkat ini?')) return;
    setIsPushLoading(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await fetch('/api/notifications/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'unsubscribe',
              subscription: { endpoint: subscription.endpoint },
            }),
          });
        }
      }
      setIsPushSubscribed(false);
      setPushSubscriberCount((prev) => Math.max(0, prev - 1));
      alert('Push notification telah berhasil dinonaktifkan.');
    } catch (err: any) {
      console.error('[WebPush] Unsubscribe error:', err);
      alert(`Gagal menonaktifkan notifikasi: ${err.message}`);
    } finally {
      setIsPushLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        console.warn('Logout request warning:', e);
      } finally {
        window.location.replace('/login');
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

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    const allKeys: string[] = [
      ...pendingOrders.map((o) => `order-${o.id}`),
      ...proofOrders.map((p) => `proof-${p.id}`),
      ...dueInvoices.map((d) => `due-${d.id}`),
    ];
    setReadNotifKeys(allKeys);
    try {
      localStorage.setItem('artaroma_read_all_notifs', JSON.stringify(allKeys));
    } catch {
      // ignore
    }
  };

  const handleMarkSingleAsRead = (key: string) => {
    if (!readNotifKeys.includes(key)) {
      const updated = [...readNotifKeys, key];
      setReadNotifKeys(updated);
      try {
        localStorage.setItem('artaroma_read_all_notifs', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  // Count unread per category
  const unreadPendingOrders = pendingOrders.filter((o) => !readNotifKeys.includes(`order-${o.id}`));
  const unreadProofOrders = proofOrders.filter((p) => !readNotifKeys.includes(`proof-${p.id}`));
  const unreadDueInvoices = dueInvoices.filter((d) => !readNotifKeys.includes(`due-${d.id}`));
  const totalUnreadCount = unreadPendingOrders.length + unreadProofOrders.length + unreadDueInvoices.length;

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

  // Combined notification items list for tab filtering
  const allNotifItems = [
    ...pendingOrders.map((o) => ({
      type: 'ORDER' as const,
      key: `order-${o.id}`,
      id: o.id,
      so_number: o.so_number,
      customer: o.customer_company || o.customer_name || 'Customer B2B',
      amount: o.grand_total || o.total_amount || 0,
      date: o.order_date,
      data: o,
    })),
    ...proofOrders.map((p) => ({
      type: 'PROOF' as const,
      key: `proof-${p.id}`,
      id: p.id,
      so_number: p.so_number,
      customer: p.customer_company || p.customer_name || 'Customer B2B',
      amount: p.grand_total || p.total_amount || 0,
      date: p.order_date,
      proof_url: p.payment_proof_url || p.payment_proof,
      data: p,
    })),
    ...dueInvoices.map((d) => ({
      type: 'DUE' as const,
      key: `due-${d.id}`,
      id: d.id,
      invoice_number: d.invoice_number,
      so_number: d.so_number,
      customer: d.customer_name || 'Customer B2B',
      amount: d.remaining_amount || d.total_amount || 0,
      due_date: d.due_date,
      daysLeft: d.daysLeft,
      data: d,
    })),
  ];

  const filteredNotifItems = allNotifItems.filter((item) => {
    if (activeNotifTab === 'ORDERS') return item.type === 'ORDER';
    if (activeNotifTab === 'PROOFS') return item.type === 'PROOF';
    if (activeNotifTab === 'DUES') return item.type === 'DUE';
    return true;
  });

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

            {/* REAL-TIME MULTI-CATEGORY NOTIFICATIONS BELL WIDGET */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                title="Pusat Notifikasi Operasional"
                className={`relative p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs border ${
                  totalUnreadCount > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    : 'bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border-slate-200 hover:border-blue-200'
                }`}
              >
                {totalUnreadCount > 0 ? (
                  <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs border-2 border-white animate-pulse">
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {isNotifOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 sm:w-[420px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-xs">Pusat Notifikasi</span>
                      {totalUnreadCount > 0 && (
                        <span className="bg-amber-400 text-slate-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                          {totalUnreadCount} Baru
                        </span>
                      )}
                    </div>
                    {totalUnreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] text-blue-200 hover:text-white underline cursor-pointer"
                      >
                        Tandai Semua Dibaca
                      </button>
                    )}
                  </div>

                  {/* Mobile Push Notification Status Banner */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isPushSubscribed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      <div>
                        <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          {isPushSubscribed ? 'Notifikasi HP: Aktif' : 'Notifikasi HP Belum Aktif'}
                          {isPushSubscribed && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">
                              ONLINE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {isPushSubscribed
                            ? `${pushSubscriberCount} perangkat terhubung (Suara & Getar Aktif)`
                            : 'Aktifkan agar HP berbunyi saat ada pesanan & transfer baru'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isPushSubscribed ? (
                        <button
                          type="button"
                          disabled={isPushLoading}
                          onClick={handleSubscribePush}
                          className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Bell className="w-3 h-3" />
                          {isPushLoading ? 'Mengaktifkan...' : 'Aktifkan di HP'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isPushLoading}
                            onClick={handleTestPushNotification}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Kirim notifikasi uji coba ke HP"
                          >
                            <Sparkles className="w-3 h-3" />
                            {isPushLoading ? 'Mengirim...' : 'Tes Push'}
                          </button>
                          <button
                            type="button"
                            disabled={isPushLoading}
                            onClick={handleUnsubscribePush}
                            className="bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-700 font-bold text-[10px] px-2 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Nonaktifkan notifikasi di perangkat ini"
                          >
                            Matikan
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Filter Category Tabs */}
                  <div className="bg-slate-50 border-b border-gray-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold scrollbar-none">
                    <button
                      onClick={() => setActiveNotifTab('ALL')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                        activeNotifTab === 'ALL'
                          ? 'bg-blue-800 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-gray-200 hover:bg-slate-100'
                      }`}
                    >
                      Semua ({allNotifItems.length})
                    </button>
                    <button
                      onClick={() => setActiveNotifTab('ORDERS')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                        activeNotifTab === 'ORDERS'
                          ? 'bg-blue-800 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-gray-200 hover:bg-slate-100'
                      }`}
                    >
                      <ShoppingBag className="w-3 h-3 text-blue-500" />
                      Pesanan ({pendingOrders.length})
                    </button>
                    <button
                      onClick={() => setActiveNotifTab('PROOFS')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                        activeNotifTab === 'PROOFS'
                          ? 'bg-blue-800 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-gray-200 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-3 h-3 text-emerald-600" />
                      Bukti Bayar ({proofOrders.length})
                    </button>
                    <button
                      onClick={() => setActiveNotifTab('DUES')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                        activeNotifTab === 'DUES'
                          ? 'bg-blue-800 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-gray-200 hover:bg-slate-100'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      Jatuh Tempo ({dueInvoices.length})
                    </button>
                  </div>

                  {/* Body List */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 text-xs">
                    {filteredNotifItems.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 space-y-1.5">
                        <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                        <div className="font-semibold text-xs text-slate-700">
                          Tidak Ada Notifikasi
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Semua pesanan, pembayaran, & piutang dalam kondisi aman.
                        </div>
                      </div>
                    ) : (
                      filteredNotifItems.map((item) => {
                        const isUnread = !readNotifKeys.includes(item.key);

                        if (item.type === 'ORDER') {
                          return (
                            <div
                              key={item.key}
                              className={`p-3.5 hover:bg-blue-50/50 transition-colors flex items-start justify-between gap-2.5 ${
                                isUnread ? 'bg-amber-50/40' : 'bg-white'
                              }`}
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-extrabold text-blue-700 text-xs">
                                    {item.so_number}
                                  </span>
                                  {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                                  )}
                                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                                    <ShoppingBag className="w-3 h-3" />
                                    Pesanan Baru
                                  </span>
                                </div>
                                <div className="font-bold text-slate-800 text-xs truncate max-w-[240px]">
                                  {item.customer}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                                  <span className="font-mono font-bold text-slate-700">
                                    {formatIDR(item.amount)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5 font-mono">
                                    <Clock className="w-3 h-3" />
                                    {item.date ? String(item.date).substring(0, 10) : 'Hari Ini'}
                                  </span>
                                </div>
                              </div>
                              <Link
                                href={`/admin/orders/${item.id}`}
                                onClick={() => {
                                  handleMarkSingleAsRead(item.key);
                                  setIsNotifOpen(false);
                                }}
                                className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-2xs inline-flex items-center gap-1 transition-colors shrink-0 mt-1 cursor-pointer"
                              >
                                Tinjau <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          );
                        }

                        if (item.type === 'PROOF') {
                          return (
                            <div
                              key={item.key}
                              className={`p-3.5 hover:bg-emerald-50/50 transition-colors flex items-start justify-between gap-2.5 ${
                                isUnread ? 'bg-emerald-50/40' : 'bg-white'
                              }`}
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-extrabold text-blue-700 text-xs">
                                    {item.so_number}
                                  </span>
                                  {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                                  )}
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    Bukti Transfer Masuk
                                  </span>
                                </div>
                                <div className="font-bold text-slate-800 text-xs truncate max-w-[240px]">
                                  {item.customer}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                                  <span className="font-mono font-bold text-emerald-700">
                                    {formatIDR(item.amount)}
                                  </span>
                                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                                    <FileCheck className="w-3 h-3" /> Perlu Verifikasi
                                  </span>
                                </div>
                              </div>
                              <Link
                                href={`/admin/sales-orders?so=${item.so_number}`}
                                onClick={() => {
                                  handleMarkSingleAsRead(item.key);
                                  setIsNotifOpen(false);
                                }}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-2xs inline-flex items-center gap-1 transition-colors shrink-0 mt-1 cursor-pointer"
                              >
                                Verifikasi <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          );
                        }

                        if (item.type === 'DUE') {
                          const isOverdue = (item.daysLeft ?? 0) < 0;
                          const isToday = item.daysLeft === 0;

                          return (
                            <div
                              key={item.key}
                              className={`p-3.5 hover:bg-amber-50/50 transition-colors flex items-start justify-between gap-2.5 ${
                                isUnread
                                  ? isOverdue
                                    ? 'bg-rose-50/50'
                                    : 'bg-amber-50/40'
                                  : 'bg-white'
                              }`}
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-extrabold text-slate-800 text-xs">
                                    {item.invoice_number || item.so_number}
                                  </span>
                                  {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                                  )}
                                  {isOverdue ? (
                                    <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                      Overdue {Math.abs(item.daysLeft ?? 0)} Hari
                                    </span>
                                  ) : isToday ? (
                                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-700" />
                                      Jatuh Tempo Hari Ini
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      Jatuh Tempo H-{item.daysLeft}
                                    </span>
                                  )}
                                </div>
                                <div className="font-bold text-slate-800 text-xs truncate max-w-[240px]">
                                  {item.customer}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                                  <span className="font-mono font-bold text-rose-700">
                                    Piutang: {formatIDR(item.amount)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Tempo: {String(item.due_date).substring(0, 10)}
                                  </span>
                                </div>
                              </div>
                              <Link
                                href="/admin/finance"
                                onClick={() => {
                                  handleMarkSingleAsRead(item.key);
                                  setIsNotifOpen(false);
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-2xs inline-flex items-center gap-1 transition-colors shrink-0 mt-1 cursor-pointer"
                              >
                                Tagihan <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          );
                        }

                        return null;
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="bg-slate-50 px-4 py-2 border-t border-gray-200 flex items-center justify-between text-[11px] font-bold">
                    <Link
                      href="/admin/sales-orders"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-blue-700 hover:underline inline-flex items-center gap-1"
                    >
                      Daftar Sales Order <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Link
                      href="/admin/sales-orders"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-slate-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                    >
                      Daftar Tagihan Piutang <ExternalLink className="w-3 h-3" />
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
      <nav
        className="bg-blue-700 sticky top-14 z-30 shadow-md transition-colors duration-200"
        style={{ backgroundColor: 'var(--artaroma-primary, #1d4ed8)' }}
      >
        <div className="max-w-screen-2xl mx-auto px-6">
          <div className="flex items-center h-11 gap-1 overflow-visible flex-wrap sm:flex-nowrap">
            {/* Dashboard */}
            {canAccessDashboard && (
              <Link
                href="/admin"
                prefetch={false}
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
                prefetch={false}
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
                prefetch={false}
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
                prefetch={false}
                className={`flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all border-b-2 whitespace-nowrap relative ${
                  isSOActive
                    ? 'bg-white/15 text-white border-white'
                    : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Sales Order (SO)</span>
                {unreadPendingOrders.length > 0 && (
                  <span className="bg-amber-400 text-slate-900 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                    {unreadPendingOrders.length}
                  </span>
                )}
              </Link>
            )}

            {/* Lihat Stok */}
            {canAccessStock && (
              <Link
                href="/admin/stock"
                prefetch={false}
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
                prefetch={false}
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
                prefetch={false}
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
                prefetch={false}
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
                      href="/admin/sales-orders"
                      onClick={() => setIsFinanceOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-blue-50 transition-colors ${
                        isSOActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">1. Sales Order & Invoice Penjualan</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Tagihan, Verifikasi Bayar & Faktur Pajak
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/admin/procurement"
                      onClick={() => setIsFinanceOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-blue-50 transition-colors ${
                        isPOActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">2. Purchase Order & Tagihan Suplier</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Pengadaan, Pembayaran & Bukti Transfer PO
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/admin/finance/cash"
                      onClick={() => setIsFinanceOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-blue-50 transition-colors ${
                        isCashManagementActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <Landmark className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">3. Manajemen Kas & Treasury</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Kas Besar, Kas Kantor, Kas Kecil & Sales
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Diagnostik & Uji Otomatis */}
            <Link
              href="/admin/diagnostics"
              prefetch={false}
              className={`flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                isDiagnosticsActive
                  ? 'bg-white/20 text-white border-white font-bold'
                  : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Diagnostik</span>
            </Link>
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
            <Link
              href="/admin/finance/cash"
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                isCashManagementActive
                  ? 'bg-white text-blue-900 font-bold shadow-sm'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" /> Manajemen Kas & Treasury
            </Link>
          </div>
        </div>
      )}

      {/* FLOATING REAL-TIME TOAST NOTIFICATION FOR NEW SALES ORDER / TRANSFER PROOF */}
      {toastNotif && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-blue-500/50 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className={`flex items-center gap-2.5 font-bold text-xs ${toastNotif.type === 'PROOF' ? 'text-emerald-400' : 'text-amber-400'}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${toastNotif.type === 'PROOF' ? 'bg-emerald-400/20 text-emerald-400' : 'bg-amber-400/20 text-amber-400'}`}>
                {toastNotif.type === 'PROOF' ? (
                  <CreditCard className="w-4 h-4 animate-bounce" />
                ) : (
                  <BellRing className="w-4 h-4 animate-bounce" />
                )}
              </div>
              <span>{toastNotif.type === 'PROOF' ? 'Bukti Transfer Pembayaran Masuk!' : 'Sales Order Baru Masuk!'}</span>
            </div>
            <button
              onClick={() => setToastNotif(null)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2.5 space-y-1 text-xs">
            <div className="font-mono font-extrabold text-blue-300">{toastNotif.data.so_number}</div>
            <div className="font-bold text-slate-100 truncate">
              {toastNotif.data.customer_company || toastNotif.data.customer_name || 'Customer B2B'}
            </div>
            <div className="text-slate-400 text-[11px]">
              Total:{' '}
              <strong className="text-emerald-400 font-mono">
                {formatIDR(toastNotif.data.grand_total || toastNotif.data.total_amount || 0)}
              </strong>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex justify-end gap-2 text-xs">
            <button
              onClick={() => setToastNotif(null)}
              className="px-3 py-1 text-slate-400 hover:text-white text-[11px] font-semibold cursor-pointer"
            >
              Nanti
            </button>
            {toastNotif.type === 'PROOF' ? (
              <Link
                href={`/admin/sales-orders?so=${toastNotif.data.so_number}`}
                onClick={() => {
                  handleMarkSingleAsRead(`proof-${toastNotif.data.id}`);
                  setToastNotif(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                Verifikasi Kas <ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <Link
                href={`/admin/orders/${toastNotif.data.id}`}
                onClick={() => {
                  handleMarkSingleAsRead(`order-${toastNotif.data.id}`);
                  setToastNotif(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                Tinjau Pesanan <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
