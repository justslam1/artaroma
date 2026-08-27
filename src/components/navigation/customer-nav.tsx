'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  ShoppingBag,
  FileText,
  ShieldAlert,
  CheckCircle2,
  LogOut,
  KeyRound,
  Bell,
  BellRing,
  Truck,
  Clock,
  Package,
  AlertCircle,
  Receipt,
  Smartphone,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { Customer, SalesOrder, Invoice } from '@/lib/types';
import { formatIDR, formatDate } from '@/lib/utils';
import { CustomerPasswordModal } from '@/components/customer/customer-password-modal';
import { getStoredInvoices } from '@/lib/order-store';

interface CustomerNavProps {
  currentCustomer: Customer;
  onCustomerChange?: (customerId: string) => void;
  allCustomers?: Customer[];
  cartCount?: number;
  onOpenCart?: () => void;
}

interface CustomerNotifItem {
  id: string;
  title: string;
  message: string;
  category: 'ORDER' | 'DELIVERY' | 'INVOICE' | 'SYSTEM';
  date: string;
  badgeText: string;
  badgeColor: string;
  icon: any;
  linkUrl?: string;
}

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

export function CustomerNav({ currentCustomer, onCustomerChange, allCustomers = [], cartCount = 0, onOpenCart }: CustomerNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const currentPiutang = Number(currentCustomer?.current_piutang) || 0;
  const creditLimit = Number(currentCustomer?.credit_limit) || 0;
  const creditUsedPercent = creditLimit > 0 ? Math.min(100, Math.round((currentPiutang / creditLimit) * 100)) : 0;

  const [companyTagline, setCompanyTagline] = useState('B2B Fragrance Oil Supplier & Management Hub');
  const [whatsappNumber, setWhatsappNumber] = useState('+62 852-2518-4422');
  const [whatsappCsName, setWhatsappCsName] = useState('Customer Support Artaroma');

  // Notification States
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<CustomerNotifItem[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  const [activeNotifFilter, setActiveNotifFilter] = useState<'ALL' | 'ORDER' | 'DELIVERY' | 'INVOICE'>('ALL');
  const notifRef = useRef<HTMLDivElement>(null);

  // Web Push Notification States
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  // Helper to format WhatsApp direct chat URL
  const getWhatsAppLink = () => {
    let clean = (whatsappNumber || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    if (!clean.startsWith('62')) clean = '62' + clean;
    const msg = encodeURIComponent(
      `Halo CS Artaroma, saya ${currentCustomer.company_name || currentCustomer.pic_name || 'Customer B2B'}, ingin bertanya terkait produk / pemesanan bibit parfum.`
    );
    return `https://api.whatsapp.com/send?phone=${clean}&text=${msg}`;
  };

  // 1. Fetch Company Settings (Tagline & WhatsApp Number)
  useEffect(() => {
    const loadSettings = () => {
      fetch('/api/company-settings', { cache: 'no-store' })
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            if (json.data.company_tagline) setCompanyTagline(json.data.company_tagline);
            if (json.data.whatsapp_number) setWhatsappNumber(json.data.whatsapp_number);
            if (json.data.whatsapp_cs_name) setWhatsappCsName(json.data.whatsapp_cs_name);
          }
        })
        .catch((err) => console.warn('Failed to load company settings in CustomerNav:', err));
    };

    loadSettings();
    window.addEventListener('artaroma_company_settings_updated', loadSettings);
    return () => window.removeEventListener('artaroma_company_settings_updated', loadSettings);
  }, []);

  // 2. Load Read Notification IDs from localStorage
  useEffect(() => {
    if (!currentCustomer?.id) return;
    try {
      const stored = localStorage.getItem(`artaroma_cust_read_notifs_${currentCustomer.id}`);
      if (stored) {
        setReadNotifIds(JSON.parse(stored));
      } else {
        setReadNotifIds([]);
      }
    } catch {
      setReadNotifIds([]);
    }
  }, [currentCustomer?.id]);

  // 3. Fetch Customer Notifications (Orders, Deliveries, Invoices)
  const fetchCustomerNotifications = useCallback(async () => {
    if (!currentCustomer?.id) return;

    try {
      const res = await fetch('/api/sales-orders', { cache: 'no-store' });
      const json = await res.json();
      const allOrders: SalesOrder[] = json.success && Array.isArray(json.data) ? json.data : [];

      // Filter orders for current customer
      const custOrders = allOrders.filter(
        (o: any) =>
          o.customer_id === currentCustomer.id ||
          o.customer_name === currentCustomer.pic_name ||
          o.customer_company === currentCustomer.company_name
      );

      const items: CustomerNotifItem[] = [];

      custOrders.forEach((so) => {
        const orderDate = so.order_date || new Date().toISOString();
        const totalFormatted = formatIDR(so.grand_total || (so as any).total_amount || 0);

        if (so.status === 'DIKIRIM') {
          items.push({
            id: `notif-deliv-${so.id}`,
            title: `Pesanan ${so.so_number} Sedang Dikirim`,
            message: `Pesanan senilai ${totalFormatted} sedang dalam perjalanan pengantaran kurir ${so.courier_name ? `(${so.courier_name})` : ''}.`,
            category: 'DELIVERY',
            date: so.delivered_date || orderDate,
            badgeText: 'DIKIRIM KURIR',
            badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
            icon: Truck,
            linkUrl: '/customer/orders',
          });
        } else if (so.status === 'PROSES_GUDANG' || so.status === 'APPROVED') {
          items.push({
            id: `notif-proc-${so.id}`,
            title: `Pesanan ${so.so_number} Telah Dikonfirmasi`,
            message: `Pesanan ${totalFormatted} telah disetujui Admin HQ & sedang disiapkan tim gudang dengan batch FEFO.`,
            category: 'ORDER',
            date: orderDate,
            badgeText: 'PROSES GUDANG',
            badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            icon: Package,
            linkUrl: '/customer/orders',
          });
        } else if (so.status === 'DITERIMA') {
          items.push({
            id: `notif-done-${so.id}`,
            title: `Pesanan ${so.so_number} Selesai Diterima`,
            message: `Pesanan telah diterima oleh ${so.received_by || 'pihak Anda'}. Surat jalan & bukti serah terima digital tersedia.`,
            category: 'DELIVERY',
            date: so.delivered_date || orderDate,
            badgeText: 'SELESAI DITERIMA',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            icon: CheckCircle2,
            linkUrl: '/customer/orders',
          });
        } else if (so.status === 'PENDING_APPROVAL' || so.status === 'DIAJUKAN') {
          items.push({
            id: `notif-sub-${so.id}`,
            title: `Pesanan ${so.so_number} Berhasil Diajukan`,
            message: `Pesanan baru sebesar ${totalFormatted} telah masuk ke sistem dan menunggu verifikasi Admin HQ.`,
            category: 'ORDER',
            date: orderDate,
            badgeText: 'DIAJUKAN',
            badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
            icon: Clock,
            linkUrl: '/customer/orders',
          });
        }

        // Check payment proof verification
        if ((so as any).payment_verification_status === 'VERIFIED' || so.payment_status === 'PAID') {
          items.push({
            id: `notif-pay-${so.id}`,
            title: `Pembayaran ${so.so_number} Terverifikasi`,
            message: `Pembayaran pesanan ${so.so_number} (${totalFormatted}) telah diverifikasi LUNAS oleh Finance Artaroma.`,
            category: 'INVOICE',
            date: orderDate,
            badgeText: 'LUNAS',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            icon: Receipt,
            linkUrl: '/customer/orders',
          });
        }
      });

      // Sort by newest date first
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setNotifItems(items);
    } catch (err) {
      console.warn('Failed to fetch customer notifications:', err);
    }
  }, [currentCustomer]);

  // 4. Polling Notifications every 20s
  useEffect(() => {
    fetchCustomerNotifications();
    const interval = setInterval(fetchCustomerNotifications, 20000);
    return () => clearInterval(interval);
  }, [fetchCustomerNotifications]);

  // 5. Push Notification Readiness Check
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setIsPushSubscribed(!!sub);
      }).catch(() => {});
    }
  }, []);

  // 6. Handle Push Subscription Activation
  const handleSubscribePush = async () => {
    if (!isPushSupported) {
      alert('Browser atau perangkat ini tidak mendukung Web Push Notification.');
      return;
    }

    setIsPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Izin notifikasi ditolak. Silakan aktifkan izin notifikasi di browser/HP Anda.');
        setIsPushLoading(false);
        return;
      }

      const keyRes = await fetch('/api/notifications/push');
      const keyJson = await keyRes.json();
      if (!keyJson.success || !keyJson.vapidPublicKey) {
        throw new Error('Gagal memuat VAPID Public Key');
      }

      const registration = await navigator.serviceWorker.ready;
      const convertedKey = urlBase64ToUint8Array(keyJson.vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      const saveRes = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          subscription,
          user: {
            id: currentCustomer.id,
            name: currentCustomer.company_name,
            role: 'CUSTOMER',
          },
        }),
      });

      const saveJson = await saveRes.json();
      if (saveJson.success) {
        setIsPushSubscribed(true);
        alert('🎉 Push Notification berhasil diaktifkan! Anda akan menerima update status pesanan dan pengiriman secara instan di HP/Browser Anda.');
      } else {
        alert(saveJson.message || 'Gagal mendaftarkan notifikasi');
      }
    } catch (err: any) {
      alert(`Gagal mengaktifkan notifikasi: ${err.message}`);
    } finally {
      setIsPushLoading(false);
    }
  };

  // 7. Click Outside Listener for Notification Panel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const allIds = notifItems.map((n) => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem(`artaroma_cust_read_notifs_${currentCustomer.id}`, JSON.stringify(allIds));
    } catch {}
  };

  // Mark single item as read and navigate
  const handleItemClick = (item: CustomerNotifItem) => {
    if (!readNotifIds.includes(item.id)) {
      const updated = [...readNotifIds, item.id];
      setReadNotifIds(updated);
      try {
        localStorage.setItem(`artaroma_cust_read_notifs_${currentCustomer.id}`, JSON.stringify(updated));
      } catch {}
    }
    setIsNotifOpen(false);
    if (item.linkUrl) {
      router.push(item.linkUrl);
    }
  };

  const unreadCount = notifItems.filter((n) => !readNotifIds.includes(n.id)).length;

  const filteredNotifs = notifItems.filter((n) => {
    if (activeNotifFilter === 'ORDER') return n.category === 'ORDER';
    if (activeNotifFilter === 'DELIVERY') return n.category === 'DELIVERY';
    if (activeNotifFilter === 'INVOICE') return n.category === 'INVOICE';
    return true;
  });

  return (
    <>
      {/* White header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/customer/catalog" className="flex items-center gap-3 shrink-0">
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

          {/* Customer Switcher */}
          {allCustomers.length > 0 && onCustomerChange && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs hidden md:block">
              <span className="text-slate-400 block text-[10px] mb-0.5">Akun Login B2B:</span>
              <select
                value={currentCustomer.id}
                onChange={(e) => onCustomerChange(e.target.value)}
                className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer pr-1 text-sm"
              >
                {allCustomers.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.company_name} {cust.has_overdue ? '(BLOCKED)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Credit Limit Widget */}
          <div className="hidden lg:flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-xs shrink-0 max-h-11">
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium leading-tight">
                <span>Plafon Tempo:</span>
                {currentCustomer.has_overdue ? (
                  <span className="bg-red-50 text-red-600 text-[9px] px-1 rounded font-bold border border-red-200 flex items-center gap-0.5">
                    <ShieldAlert className="w-2.5 h-2.5" /> BLOCKED
                  </span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-600 text-[9px] px-1 rounded font-bold border border-emerald-200 flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> OK
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono leading-tight mt-0.5 whitespace-nowrap">
                <span className="font-bold text-blue-700">{formatIDR(currentPiutang)}</span>
                <span className="text-slate-400 font-normal">/</span>
                <span className="text-slate-500">{formatIDR(creditLimit)}</span>
              </div>
            </div>
            <div className="w-12 bg-gray-200 h-1.5 rounded-full overflow-hidden shrink-0">
              <div
                className={`h-full transition-all ${creditUsedPercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${creditUsedPercent}%` }}
              />
            </div>
          </div>

          {/* Right nav & Notifications */}
          <div className="flex items-center gap-2">
            {/* Cart Button */}
            {onOpenCart && (
              <button
                onClick={onOpenCart}
                className="relative bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Keranjang</span>
                {cartCount > 0 && (
                  <span className="bg-amber-400 text-slate-900 font-extrabold text-[11px] rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* CUSTOMER NOTIFICATION BELL WIDGET */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                title="Pusat Notifikasi Customer"
                className={`relative p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer border ${
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
                <div className="absolute top-full right-0 mt-2 w-80 sm:w-[400px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-amber-300" />
                      <span className="font-bold text-xs">Pusat Notifikasi</span>
                      {unreadCount > 0 && (
                        <span className="bg-amber-400 text-slate-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                          {unreadCount} Baru
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] text-blue-100 hover:text-white underline cursor-pointer"
                      >
                        Tandai Semua Dibaca
                      </button>
                    )}
                  </div>

                  {/* Web Push Notification Banner */}
                  <div className="bg-blue-50/80 border-b border-blue-200/80 px-3.5 py-2.5 flex items-center justify-between gap-2">
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
                            ? 'Update pesanan & pengiriman akan masuk ke HP Anda'
                            : 'Aktifkan agar HP berbunyi saat pesanan dikirim & diproses'}
                        </div>
                      </div>
                    </div>

                    {!isPushSubscribed && (
                      <button
                        type="button"
                        disabled={isPushLoading}
                        onClick={handleSubscribePush}
                        className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <Smartphone className="w-3 h-3" />
                        {isPushLoading ? 'Mengaktifkan...' : 'Aktifkan di HP'}
                      </button>
                    )}
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="flex border-b border-gray-100 bg-gray-50/80 text-[11px] font-semibold px-2 pt-1 gap-1">
                    {[
                      { key: 'ALL', label: 'Semua' },
                      { key: 'ORDER', label: 'Pesanan' },
                      { key: 'DELIVERY', label: 'Pengiriman' },
                      { key: 'INVOICE', label: 'Tagihan' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveNotifFilter(tab.key as any)}
                        className={`px-3 py-1.5 rounded-t-lg transition-colors cursor-pointer ${
                          activeNotifFilter === tab.key
                            ? 'bg-white text-blue-700 border-t border-x border-gray-200 font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Notification Items List */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                    {filteredNotifs.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <Bell className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-medium">Belum ada notifikasi baru untuk kategori ini.</p>
                      </div>
                    ) : (
                      filteredNotifs.map((item) => {
                        const Icon = item.icon;
                        const isUnread = !readNotifIds.includes(item.id);

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className={`p-3.5 hover:bg-blue-50/50 transition-colors cursor-pointer flex items-start gap-3 ${
                              isUnread ? 'bg-amber-50/30' : 'bg-white'
                            }`}
                          >
                            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                              <Icon className="w-4 h-4 text-blue-600" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
                                  {item.badgeText}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatDate(item.date)}
                                </span>
                              </div>

                              <h4 className="text-xs font-bold text-slate-800 leading-tight">
                                {item.title}
                              </h4>
                              <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                {item.message}
                              </p>
                            </div>

                            {isUnread && (
                              <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50 border-t border-gray-200 px-4 py-2.5 text-center">
                    <Link
                      href="/customer/orders"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center justify-center gap-1"
                    >
                      Buka Riwayat Pesanan & Tagihan
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Change Password */}
            {currentCustomer && (
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                title="Ganti Password Akun B2B"
                className="bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Ganti Password</span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={async () => {
                if (confirm('Keluar dari sesi akun Customer?')) {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                  } catch (e) {
                    console.warn('Customer logout error:', e);
                  } finally {
                    window.location.replace('/login');
                  }
                }
              }}
              title="Keluar / Logout"
              className="bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 p-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Blue horizontal nav bar */}
      <nav className="bg-blue-700 sticky top-14 z-30 shadow-md">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex items-center justify-between h-11 gap-2">
            <div className="flex items-center h-full gap-0.5">
              {[
                { label: 'Katalog Bibit Parfum', href: '/customer/catalog', icon: ShoppingBag },
                { label: 'Pesanan & Tagihan', href: '/customer/orders', icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className={`flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all border-b-2 ${
                      isActive
                        ? 'bg-white/15 text-white border-white'
                        : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* WhatsApp CS Topnav Contact Link */}
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              title={`Hubungi WhatsApp Customer Support (${whatsappCsName})`}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-all hover:shadow-md cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.079-1.895-.445-1.503-.623-2.45-2.146-2.525-2.247-.075-.101-.606-.807-.606-1.539 0-.733.385-1.093.522-1.242.137-.149.3-.186.4-.186.1 0 .2.002.288.006.094.004.22-.036.344.262.128.307.436 1.066.475 1.144.039.078.065.17.013.273-.052.103-.078.167-.156.257-.078.091-.164.203-.235.272-.078.077-.16.16-.069.316.091.156.404.667.868 1.08 1.018.907 1.874 1.189 2.138 1.32.264.13.419.11.575-.07.156-.18.667-.777.844-1.043.177-.267.354-.222.593-.133.24.089 1.52.716 1.781.846.261.13.435.195.499.305.064.11.064.638-.08 1.043z" />
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.662 1.442 5.178L2 22l4.981-1.399A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2a8.168 8.168 0 0 1-4.222-1.176l-.303-.18-2.962.833.844-2.887-.197-.314A8.16 8.16 0 0 1 3.8 12c0-4.522 3.678-8.2 8.2-8.2 4.522 0 8.2 3.678 8.2 8.2 0 4.522-3.678 8.2-8.2 8.2z" />
              </svg>
              <span className="hidden sm:inline font-bold">WhatsApp CS:</span>
              <span className="font-mono font-extrabold">{whatsappNumber}</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Customer Change Password Modal */}
      {currentCustomer && (
        <CustomerPasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          customer={currentCustomer}
        />
      )}
    </>
  );
}

