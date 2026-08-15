'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ShoppingBag, Truck, Sparkles, ArrowRight, DollarSign, Database, Layers } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-41px)] bg-[#f5f7fa] flex flex-col">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://artaroma.co.id/wp-content/uploads/2022/09/bibit-parfum-laundry.png"
            alt="Artaroma Logo"
            className="h-12 object-contain"
          />
          <p className="text-slate-500 text-xs md:text-sm font-medium">
            B2B Fragrance Oil Management System &mdash; FEFO Batch Inventory & Precision Order
          </p>
        </div>
      </div>

      {/* Blue Nav Bar Demo */}
      <div className="bg-blue-700 shadow-md">
        <div className="max-w-5xl mx-auto px-6 h-11 flex items-center gap-0.5">
          <span className="text-blue-100 text-sm font-semibold px-4 border-b-2 border-transparent">
            Pilih Portal &rarr;
          </span>
        </div>
      </div>

      {/* Role Cards */}
      <main className="max-w-5xl mx-auto px-6 py-10 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Admin & Finance */}
          <Link
            href="/admin"
            className="group bg-white border border-gray-200 hover:border-blue-400 hover:shadow-lg rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all duration-200"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-800 group-hover:text-blue-700 transition-colors">Admin & Finance</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Dashboard Omset, Master Data, Procurement (PO & FEFO Batch), Verifikasi Transfer & Faktur Pajak.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 pt-5">
              Buka Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Customer B2B Portal */}
          <Link
            href="/customer/catalog"
            className="group bg-white border border-gray-200 hover:border-blue-400 hover:shadow-lg rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all duration-200"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-800 group-hover:text-amber-600 transition-colors">Customer B2B Portal</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Katalog Bibit Parfum, Profile Aroma Notes, Order Eceran Kg (Preset Cepat), & Credit Limit Tempo Lock.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 pt-5">
              Masuk Portal B2B <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Courier PWA */}
          <Link
            href="/courier"
            className="group bg-white border border-gray-200 hover:border-blue-400 hover:shadow-lg rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all duration-200"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-800 group-hover:text-emerald-600 transition-colors">Courier PWA Mobile</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tugas Pengiriman, Checklist Verifikasi Fisik Bawaan (Batch/Qty), & Canvas Tanda Tangan Digital POD.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 pt-5">
              Buka View Kurir <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
