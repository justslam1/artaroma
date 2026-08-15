'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  ShoppingBag,
  Receipt,
  Sparkles,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

export function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard Overview',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      label: 'Master Data',
      href: '/admin/master',
      icon: Database,
    },
    {
      label: 'Procurement (PO & FEFO)',
      href: '/admin/procurement',
      icon: ShoppingBag,
    },
    {
      label: 'Finance & Invoicing',
      href: '/admin/finance',
      icon: Receipt,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 min-h-[calc(100vh-41px)] p-4 flex flex-col border-r border-slate-800">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://artaroma.co.id/wp-content/uploads/2022/09/bibit-parfum-laundry.png"
          alt="Artaroma Logo"
          className="h-10 object-contain brightness-0 invert"
        />
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1.5">
        <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Management Portal
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Quick Status Widget */}
      <div className="mt-auto bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            FEFO Stock System
          </span>
          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
            ACTIVE
          </span>
        </div>
        <div className="text-[11px] text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Stok Mendekati Expiry:</span>
            <span className="text-amber-400 font-semibold">2 Batch</span>
          </div>
          <div className="flex justify-between">
            <span>Alert Stok Rendah:</span>
            <span className="text-rose-400 font-semibold">1 Varian</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
