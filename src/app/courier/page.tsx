'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PODModal } from '@/components/courier/pod-modal';
import { initialDeliveryTasks, initialCouriers } from '@/lib/mock-data';
import { DeliveryTask, Courier } from '@/lib/types';
import { formatKg, formatDate } from '@/lib/utils';
import {
  Truck,
  MapPin,
  Phone,
  CheckSquare,
  Square,
  CheckCircle2,
  UserCheck,
  LogOut,
  RefreshCw,
  Package,
  FileSpreadsheet,
  Bell,
  BellRing,
  Clock,
  Smartphone,
  ChevronRight,
  X,
  AlertCircle,
} from 'lucide-react';
import { exportToXLSX } from '@/lib/export-excel';

interface CourierNotifItem {
  id: string;
  title: string;
  message: string;
  category: 'TASK' | 'WAREHOUSE' | 'DONE';
  date: string;
  badgeText: string;
  badgeColor: string;
  icon: any;
  taskId?: string;
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

export default function CourierPWAPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingPOD, setIsSubmittingPOD] = useState(false);
  const [selectedTaskForPOD, setSelectedTaskForPOD] = useState<DeliveryTask | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Notification States
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<CourierNotifItem[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  const [activeNotifFilter, setActiveNotifFilter] = useState<'ALL' | 'TASK' | 'WAREHOUSE' | 'DONE'>('ALL');
  const notifRef = useRef<HTMLDivElement>(null);

  // Web Push States
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  // 1. Fetch Couriers and detect logged in courier
  useEffect(() => {
    const initCouriers = async () => {
      try {
        const [courierRes, authRes] = await Promise.all([
          fetch('/api/couriers', { cache: 'no-store' }),
          fetch('/api/auth/me', { cache: 'no-store' }),
        ]);

        let loadedCouriers: Courier[] = [];
        if (courierRes.ok) {
          const courierJson = await courierRes.json();
          if (courierJson.success && Array.isArray(courierJson.data)) {
            loadedCouriers = courierJson.data;
            setCouriers(loadedCouriers);
            if (loadedCouriers.length > 0) {
              setSelectedCourier(loadedCouriers[0]);
            } else {
              setSelectedCourier(null);
            }
          }
        }

        if (authRes.ok) {
          const authJson = await authRes.json();
          if (authJson.success && authJson.user) {
            setCurrentUser(authJson.user);
            const userName = (authJson.user.name || '').toLowerCase();
            const matched = loadedCouriers.find(
              (c) =>
                c.name.toLowerCase().includes(userName) ||
                userName.includes(c.name.toLowerCase()) ||
                c.id === authJson.user.linked_entity_id
            );
            if (matched) {
              setSelectedCourier(matched);
            } else if (loadedCouriers.length > 0) {
              setSelectedCourier(loadedCouriers[0]);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load couriers or auth info:', err);
      }
    };

    initCouriers();
  }, []);

  // 2. Load Read Notification IDs from localStorage
  useEffect(() => {
    if (!selectedCourier?.id) return;
    try {
      const stored = localStorage.getItem(`artaroma_courier_read_notifs_${selectedCourier.id}`);
      if (stored) {
        setReadNotifIds(JSON.parse(stored));
      } else {
        setReadNotifIds([]);
      }
    } catch {
      setReadNotifIds([]);
    }
  }, [selectedCourier?.id]);

  // 3. Generate Notifications from Delivery Tasks
  const generateNotifications = useCallback((taskList: DeliveryTask[]) => {
    const items: CourierNotifItem[] = [];

    taskList.forEach((t) => {
      const totalKg = (t.items || []).reduce((s: number, i: any) => s + (Number(i.qty_kg) || 0), 0);
      const totalKgStr = formatKg(totalKg);
      const statusStr = String(t.status || '');

      if (statusStr === 'DIKIRIM' || statusStr === 'IN_TRANSIT' || statusStr === 'ASSIGNED') {
        items.push({
          id: `notif-deliver-${t.id}`,
          title: `Tugas Kirim Baru: ${t.surat_jalan_number || t.so_number}`,
          message: `Pengiriman ${totalKgStr} ke ${t.company_name || t.customer_name} (${t.delivery_address || 'Alamat tujuan'}). Siap diantarkan.`,
          category: 'TASK',
          date: t.delivered_at || (t as any).received_at || new Date().toISOString(),
          badgeText: 'SIAP ANTAR',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Truck,
          taskId: t.id,
        });
      } else if (statusStr === 'PROSES_GUDANG' || statusStr === 'PENDING') {
        items.push({
          id: `notif-warehouse-${t.id}`,
          title: `Disiapkan Gudang: ${t.so_number}`,
          message: `Barang pesanan ${t.company_name || t.customer_name} (${totalKgStr}) sedang disiapkan tim gudang dengan batch FEFO.`,
          category: 'WAREHOUSE',
          date: new Date().toISOString(),
          badgeText: 'PROSES GUDANG',
          badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: Package,
          taskId: t.id,
        });
      } else if (statusStr === 'DITERIMA' || statusStr === 'DELIVERED') {
        items.push({
          id: `notif-done-${t.id}`,
          title: `Pengantaran Selesai: ${t.so_number}`,
          message: `Serah terima kepada ${t.recipient_name || 'Customer'} berhasil dicatat dan diverifikasi.`,
          category: 'DONE',
          date: t.delivered_at || (t as any).received_at || new Date().toISOString(),
          badgeText: 'SELESAI',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
          taskId: t.id,
        });
      }
    });

    setNotifItems(items);
  }, []);

  // 4. Fetch Delivery Tasks for selected courier
  const fetchTasks = useCallback(async () => {
    if (!selectedCourier) return;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        courier_id: selectedCourier.id || '',
        courier_name: selectedCourier.name || '',
      });
      const res = await fetch(`/api/courier/tasks?${queryParams.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTasks(json.data);
        generateNotifications(json.data);
      } else {
        setTasks(initialDeliveryTasks);
        generateNotifications(initialDeliveryTasks);
      }
    } catch (err) {
      console.warn('Failed to fetch courier tasks:', err);
      setTasks(initialDeliveryTasks);
      generateNotifications(initialDeliveryTasks);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCourier, generateNotifications]);

  // 5. Polling every 15 seconds for real-time live dispatch
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // 6. Check Push Notification Support & Status
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setIsPushSubscribed(!!sub);
      }).catch(() => {});
    }
  }, []);

  // 7. Subscribe Courier to Push Notifications
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
            id: selectedCourier?.id,
            name: selectedCourier?.name,
            role: 'COURIER',
          },
        }),
      });

      const saveJson = await saveRes.json();
      if (saveJson.success) {
        setIsPushSubscribed(true);
        alert('🎉 Push Notification Driver Aktif! HP Anda akan bergetar dan bersuara saat ada penugasan kirim baru dari Admin.');
      } else {
        alert(saveJson.message || 'Gagal mendaftarkan notifikasi');
      }
    } catch (err: any) {
      alert(`Gagal mengaktifkan notifikasi driver: ${err.message}`);
    } finally {
      setIsPushLoading(false);
    }
  };

  // 8. Click outside listener for notification dropdown
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

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    const allIds = notifItems.map((n) => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem(`artaroma_courier_read_notifs_${selectedCourier?.id}`, JSON.stringify(allIds));
    } catch {}
  };

  // Handle clicking a notification
  const handleItemClick = (item: CourierNotifItem) => {
    if (!readNotifIds.includes(item.id)) {
      const updated = [...readNotifIds, item.id];
      setReadNotifIds(updated);
      try {
        localStorage.setItem(`artaroma_courier_read_notifs_${selectedCourier?.id}`, JSON.stringify(updated));
      } catch {}
    }
    setIsNotifOpen(false);
    if (item.taskId) {
      const el = document.getElementById(`task-card-${item.taskId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const unreadNotifCount = notifItems.filter((n) => !readNotifIds.includes(n.id)).length;

  const filteredNotifs = notifItems.filter((n) => {
    if (activeNotifFilter === 'TASK') return n.category === 'TASK';
    if (activeNotifFilter === 'WAREHOUSE') return n.category === 'WAREHOUSE';
    if (activeNotifFilter === 'DONE') return n.category === 'DONE';
    return true;
  });

  // Toggle item physical verification
  const toggleCheckItem = (taskId: string, productId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          const updatedItems = task.items.map((item) =>
            item.product_id === productId ? { ...item, verified: !item.verified } : item
          );
          return { ...task, items: updatedItems };
        }
        return task;
      })
    );
  };

  // Submit Proof of Delivery (POD)
  const handleSubmitPOD = async (
    taskId: string,
    recipientName: string,
    photoUrl: string,
    signatureUrl: string
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setIsSubmittingPOD(true);
    try {
      // 1. Submit to courier deliveries API
      const delivRes = await fetch('/api/courier/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          so_id: task.so_id,
          courier_id: selectedCourier?.id || 'cour-001',
          customer_id: task.customer_id,
          recipient_name: recipientName,
          proof_photo_url: photoUrl,
          digital_signature_url: signatureUrl,
          is_item_verified: true,
          notes: `Diserahkan oleh Kurir ${selectedCourier?.name || 'Artaroma'}`,
        }),
      });

      // 2. Also update Sales Order status to DITERIMA in database
      await fetch(`/api/sales-orders/${task.so_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DITERIMA',
          received_by: recipientName,
          received_photo: photoUrl,
          received_signature: signatureUrl,
        }),
      });

      alert(`Serah terima pesanan '${task.so_number}' berhasil dicatat! Status pesanan kini: DITERIMA.`);
      setSelectedTaskForPOD(null);
      await fetchTasks();
    } catch (err: any) {
      console.error('Submit POD error:', err);
      alert(`Gagal mengirim bukti serah terima: ${err.message}`);
    } finally {
      setIsSubmittingPOD(false);
    }
  };

  const handleExportTasks = () => {
    const data = tasks.map((t, idx) => ({
      'No': idx + 1,
      'No Surat Jalan': t.surat_jalan_number || '-',
      'No SO': t.so_number || '-',
      'Nama Customer': t.customer_name || '-',
      'Perusahaan': t.company_name || '-',
      'Alamat Kirim': t.delivery_address || '-',
      'Telepon': t.phone || '-',
      'Status Pengiriman': t.status || 'PROSES_GUDANG',
      'Total Berat (Kg)': (t.items || []).reduce((s: number, i: any) => s + (Number(i.qty_kg) || 0), 0),
      'Rincian Item': (t.items || []).map(i => `${i.product_name} (${i.qty_kg} kg)`).join('; '),
    }));
    exportToXLSX(data, {
      fileName: `Tugas_Kurir_${(selectedCourier?.name || 'Driver').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Tugas Pengiriman',
    });
  };

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-16 flex flex-col items-center">
      {/* Mobile View Wrapper */}
      <div className="w-full max-w-md bg-white border-x border-gray-200 min-h-screen flex flex-col shadow-xl">
        {/* PWA App Header */}
        <header className="bg-blue-700 px-4 py-3.5 sticky top-0 z-40 flex items-center justify-between shadow">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight">Artaroma Courier</h1>
              <p className="text-[11px] text-blue-200 font-medium">PWA — Verification &amp; Delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.is_super_admin ? (
              <select
                value={selectedCourier?.id || ''}
                onChange={(e) => {
                  const c = couriers.find((cur) => cur.id === e.target.value);
                  if (c) setSelectedCourier(c);
                }}
                className="bg-blue-800 border border-blue-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none font-medium cursor-pointer"
                title="Super Admin: Ganti profil driver untuk simulasi"
              >
                {couriers.length === 0 ? (
                  <option value="">(Belum Ada Kurir)</option>
                ) : (
                  couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            ) : (
              <span className="bg-blue-800/80 border border-blue-600 rounded-lg px-2.5 py-1 text-xs text-white font-bold inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {selectedCourier?.name || currentUser?.name || 'Belum Ada Kurir'}
              </span>
            )}
            {/* COURIER NOTIFICATION BELL WIDGET */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                title="Pusat Notifikasi Tugas Kurir"
                className={`relative p-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer border ${
                  unreadNotifCount > 0
                    ? 'bg-amber-400 text-slate-900 border-amber-300 hover:bg-amber-300'
                    : 'bg-blue-800 hover:bg-blue-900 text-white border-blue-600'
                }`}
              >
                {unreadNotifCount > 0 ? (
                  <BellRing className="w-4 h-4 animate-bounce" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs border border-white animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Courier Notification Dropdown Panel */}
              {isNotifOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white px-3.5 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-xs">Notifikasi Tugas</span>
                      {unreadNotifCount > 0 && (
                        <span className="bg-amber-400 text-slate-900 font-extrabold text-[9px] px-1.5 py-0.2 rounded-full">
                          {unreadNotifCount} Baru
                        </span>
                      )}
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] text-blue-200 hover:text-white underline cursor-pointer"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                  </div>

                  {/* Web Push Notification Banner for Driver */}
                  <div className="bg-blue-50/90 border-b border-blue-200 px-3 py-2 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isPushSubscribed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      <div>
                        <div className="text-[10px] font-bold text-slate-800 flex items-center gap-1">
                          {isPushSubscribed ? 'Push HP: Aktif' : 'Push HP Belum Aktif'}
                          {isPushSubscribed && (
                            <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">
                              ON
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-500">
                          {isPushSubscribed ? 'HP bergetar saat tugas baru masuk' : 'Aktifkan notifikasi getar di jalan'}
                        </div>
                      </div>
                    </div>

                    {!isPushSubscribed && (
                      <button
                        type="button"
                        disabled={isPushLoading}
                        onClick={handleSubscribePush}
                        className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-[9px] px-2 py-1 rounded shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <Smartphone className="w-2.5 h-2.5" />
                        {isPushLoading ? '...' : 'Aktifkan'}
                      </button>
                    )}
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="flex border-b border-gray-100 bg-gray-50/80 text-[10px] font-semibold px-1.5 pt-1 gap-1">
                    {[
                      { key: 'ALL', label: 'Semua' },
                      { key: 'TASK', label: 'Siap Kirim' },
                      { key: 'WAREHOUSE', label: 'Gudang' },
                      { key: 'DONE', label: 'Selesai' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveNotifFilter(tab.key as any)}
                        className={`px-2 py-1 rounded-t transition-colors cursor-pointer ${
                          activeNotifFilter === tab.key
                            ? 'bg-white text-blue-700 border-t border-x border-gray-200 font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                    {filteredNotifs.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 space-y-1.5">
                        <Bell className="w-6 h-6 mx-auto text-slate-300" />
                        <p className="text-[11px]">Tidak ada notifikasi pengiriman.</p>
                      </div>
                    ) : (
                      filteredNotifs.map((item) => {
                        const Icon = item.icon;
                        const isUnread = !readNotifIds.includes(item.id);

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className={`p-2.5 hover:bg-blue-50/50 transition-colors cursor-pointer flex items-start gap-2.5 ${
                              isUnread ? 'bg-amber-50/40' : 'bg-white'
                            }`}
                          >
                            <div className="p-1.5 rounded-lg bg-slate-100 text-blue-600 shrink-0 mt-0.5">
                              <Icon className="w-3.5 h-3.5" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-[8px] font-extrabold px-1 py-0.2 rounded border ${item.badgeColor}`}>
                                  {item.badgeText}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {formatDate(item.date)}
                                </span>
                              </div>

                              <h4 className="text-[11px] font-bold text-slate-800 leading-tight">
                                {item.title}
                              </h4>
                              <p className="text-[10px] text-slate-600 line-clamp-2 leading-tight">
                                {item.message}
                              </p>
                            </div>

                            {isUnread && (
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={async () => {
                if (confirm('Keluar dari sesi kurir?')) {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                  } catch (e) {
                    console.warn('Courier logout error:', e);
                  } finally {
                    window.location.replace('/login');
                  }
                }
              }}
              title="Keluar / Logout"
              className="bg-blue-800 hover:bg-rose-700 p-1.5 rounded-lg text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Courier Info */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-400 block text-[10px]">Kurir Aktif:</span>
            <span className="font-bold text-slate-800 text-sm">{selectedCourier?.name || 'Belum Ada Kurir Terdaftar'}</span>
            <span className="text-amber-600 font-semibold text-[11px] block">
              {selectedCourier?.vehicle_number || '-'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTasks}
              disabled={isLoading}
              title="Refresh Tugas"
              className="bg-white border border-gray-200 hover:border-blue-300 p-1.5 rounded-lg text-slate-600 hover:text-blue-600 transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
              ONLINE
            </span>
          </div>
        </div>

        {/* Task List */}
        <main className="p-4 space-y-4 flex-1">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-600" />
              Tugas Pengiriman ({tasks.length})
            </h2>
            <button
              onClick={handleExportTasks}
              className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Ekspor Tugas Pengiriman ke File Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              Ekspor XLSX
            </button>
          </div>

          {tasks.length === 0 && !isLoading ? (
            <div className="text-center py-12 px-4 bg-slate-50 border border-dashed border-gray-200 rounded-2xl space-y-2">
              <Truck className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="font-bold text-slate-700 text-xs">Belum Ada Tugas Pengiriman</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Tugas pengiriman akan otomatis muncul saat pesanan Sales Order diubah statusnya menjadi <strong>DIKIRIM</strong> oleh tim gudang.
              </p>
              <button
                onClick={fetchTasks}
                className="mt-2 text-xs font-bold text-blue-600 bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-2xs inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Cek Ulang
              </button>
            </div>
          ) : (
            tasks.map((task) => {
              const allVerified = task.items.every((item) => item.verified);
              const isDelivered = task.status === 'DELIVERED';

              return (
                <div
                  key={task.id}
                  id={`task-card-${task.id}`}
                  className={`border rounded-2xl overflow-hidden shadow-sm transition-all ${
                    isDelivered ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Task Header */}
                  <div
                    className={`px-4 py-3 flex justify-between items-start border-b ${
                      isDelivered ? 'border-emerald-100 bg-emerald-100/50' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-blue-600 flex items-center gap-1.5 flex-wrap">
                        <span>{task.so_number}</span>
                        {task.surat_jalan_number && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-1.5 py-0.2 rounded font-mono">
                            {task.surat_jalan_number}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-800 mt-0.5">{task.company_name}</div>
                      <div className="text-xs text-gray-500">{task.customer_name}</div>
                    </div>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                      }`}
                    >
                      {isDelivered ? 'DITERIMA' : 'DIKIRIM'}
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Address & Phone */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{task.delivery_address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <a href={`tel:${task.phone}`} className="text-blue-600 underline font-mono">
                          {task.phone}
                        </a>
                      </div>
                    </div>

                    {/* Checklist */}
                    {!isDelivered && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          <span>Verifikasi Fisik Bawaan:</span>
                          <span className={allVerified ? 'text-emerald-600' : 'text-amber-600'}>
                            {task.items.filter((i) => i.verified).length}/{task.items.length} ✓
                          </span>
                        </div>
                        {task.items.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => toggleCheckItem(task.id, item.product_id)}
                            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer border transition-all text-xs ${
                              item.verified
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-white border-gray-200 text-slate-700 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {item.verified ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-400 shrink-0" />
                              )}
                              <div>
                                <div className="font-semibold">{item.product_name}</div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  Batch: {item.batch_number}
                                </div>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-blue-700">
                              {formatKg(item.qty_kg || item.pack_size_kg || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Delivered summary */}
                    {isDelivered && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5 text-emerald-800">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Serah Terima Selesai
                        </div>
                        <div className="text-slate-600">
                          Penerima: <strong>{task.recipient_name || 'Customer PIC'}</strong>
                        </div>
                        {task.delivered_at && (
                          <div className="text-slate-400 text-[10px]">
                            Waktu: {String(task.delivered_at).replace('T', ' ').substring(0, 19)}
                          </div>
                        )}
                        {task.digital_signature_url && (
                          <div className="bg-white rounded-lg p-1.5 w-max border border-emerald-200 mt-1">
                            <img src={task.digital_signature_url} alt="TTD" className="h-8 object-contain" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Handover Button */}
                    {!isDelivered && (
                      <button
                        disabled={!allVerified || isSubmittingPOD}
                        onClick={() => setSelectedTaskForPOD(task)}
                        className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          allVerified
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        }`}
                      >
                        <UserCheck className="w-4 h-4" />
                        {allVerified ? 'Serah Terima & Ambil TTD Digital (POD)' : 'Centang Semua Item Terlebih Dahulu'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </main>
      </div>

      <PODModal
        isOpen={!!selectedTaskForPOD}
        onClose={() => setSelectedTaskForPOD(null)}
        task={selectedTaskForPOD}
        onSubmitPOD={handleSubmitPOD}
      />
    </div>
  );
}
