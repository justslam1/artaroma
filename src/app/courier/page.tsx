'use client';

import React, { useState } from 'react';
import { PODModal } from '@/components/courier/pod-modal';
import { initialDeliveryTasks, initialCouriers } from '@/lib/mock-data';
import { DeliveryTask, Courier } from '@/lib/types';
import { formatKg } from '@/lib/utils';
import { Truck, MapPin, Phone, CheckSquare, Square, CheckCircle2, UserCheck, LogOut } from 'lucide-react';

export default function CourierPWAPage() {
  const [couriers] = useState<Courier[]>(initialCouriers);
  const [selectedCourier, setSelectedCourier] = useState<Courier>(initialCouriers[0]);
  const [tasks, setTasks] = useState<DeliveryTask[]>(initialDeliveryTasks);
  const [selectedTaskForPOD, setSelectedTaskForPOD] = useState<DeliveryTask | null>(null);

  const toggleCheckItem = (taskId: string, productId: string) => {
    setTasks(tasks.map((task) => {
      if (task.id === taskId) {
        const updatedItems = task.items.map((item) =>
          item.product_id === productId ? { ...item, verified: !item.verified } : item
        );
        return { ...task, items: updatedItems };
      }
      return task;
    }));
  };

  const handleSubmitPOD = (taskId: string, recipientName: string, photoUrl: string, signatureUrl: string) => {
    setTasks(tasks.map((t) => t.id === taskId
      ? { ...t, status: 'DELIVERED', recipient_name: recipientName, proof_photo_url: photoUrl, digital_signature_url: signatureUrl, delivered_at: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }
      : t
    ));
  };

  return (
    <div className="bg-[#f5f7fa] min-h-screen pb-16 flex flex-col items-center">
      {/* Mobile View Wrapper */}
      <div className="w-full max-w-md bg-white border-x border-gray-200 min-h-screen flex flex-col shadow-xl">
        {/* PWA App Header */}
        <header className="bg-blue-700 px-4 py-3.5 sticky top-0 z-40 flex items-center justify-between">
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
            <select
              value={selectedCourier.id}
              onChange={(e) => { const c = couriers.find((cur) => cur.id === e.target.value); if (c) setSelectedCourier(c); }}
              className="bg-blue-800 border border-blue-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
            >
              {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              onClick={async () => {
                if (confirm('Keluar dari sesi kurir?')) {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/login';
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
            <span className="font-bold text-slate-800 text-sm">{selectedCourier.name}</span>
            <span className="text-amber-600 font-semibold text-[11px] block">{selectedCourier.vehicle_number}</span>
          </div>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
            ONLINE
          </span>
        </div>

        {/* Task List */}
        <main className="p-4 space-y-4 flex-1">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Tugas Pengiriman ({tasks.length})
            </h2>
          </div>

          {tasks.map((task) => {
            const allVerified = task.items.every((item) => item.verified);
            const isDelivered = task.status === 'DELIVERED';

            return (
              <div key={task.id} className={`border rounded-2xl overflow-hidden shadow-sm transition-all ${isDelivered ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                {/* Task Header */}
                <div className={`px-4 py-3 flex justify-between items-start border-b ${isDelivered ? 'border-emerald-100 bg-emerald-100/50' : 'border-gray-100 bg-gray-50'}`}>
                  <div>
                    <div className="font-mono text-xs font-bold text-blue-600">{task.so_number}</div>
                    <div className="font-bold text-slate-800">{task.company_name}</div>
                    <div className="text-xs text-gray-500">{task.customer_name}</div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                    isDelivered ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                  }`}>
                    {task.status}
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Address & Phone */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <span>{task.delivery_address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <a href={`tel:${task.phone}`} className="text-blue-600 underline font-mono">{task.phone}</a>
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
                            {item.verified
                              ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                              : <Square className="w-4 h-4 text-gray-400 shrink-0" />}
                            <div>
                              <div className="font-semibold">{item.product_name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">Batch: {item.batch_number}</div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-blue-700">{formatKg(item.qty_kg)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Delivered summary */}
                  {isDelivered && (
                    <div className="bg-emerald-100 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5 text-emerald-700">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4" /> Serah Terima Selesai ({task.delivered_at})
                      </div>
                      <div>Penerima: {task.recipient_name}</div>
                      {task.digital_signature_url && (
                        <div className="bg-white rounded-lg p-1 w-max border border-emerald-200">
                          <img src={task.digital_signature_url} alt="TTD" className="h-8 object-contain" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Handover Button */}
                  {!isDelivered && (
                    <button
                      disabled={!allVerified}
                      onClick={() => setSelectedTaskForPOD(task)}
                      className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        allVerified
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      {allVerified ? 'Serah Terima & Ambil TTD Digital' : 'Centang Semua Item Terlebih Dahulu'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </main>
      </div>

      <PODModal isOpen={!!selectedTaskForPOD} onClose={() => setSelectedTaskForPOD(null)} task={selectedTaskForPOD} onSubmitPOD={handleSubmitPOD} />
    </div>
  );
}
