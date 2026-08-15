'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, ShoppingBag, Truck, DollarSign, Database, FileText, Layers, Boxes } from 'lucide-react';

export function RoleSwitcher() {
  const pathname = usePathname();

  const links = [
    { label: 'Admin HQ', href: '/admin', icon: ShieldCheck },
    { label: 'Master Data', href: '/admin/master', icon: Database },
    { label: 'Sales (SO)', href: '/admin/orders', icon: ShoppingBag },
    { label: 'Purchasing (PO)', href: '/admin/procurement', icon: FileText },
    { label: 'Stok & Gudang', href: '/admin/stock', icon: Boxes },
    { label: 'Finance', href: '/admin/finance', icon: DollarSign },
    { label: 'Katalog Customer', href: '/customer/catalog', icon: ShoppingBag },
    { label: 'Courier PWA', href: '/courier', icon: Truck },
  ];

  return (
    <div className="bg-slate-700 text-white text-xs px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-slate-600 sticky top-0 z-50">
      <div className="flex items-center gap-2 font-bold tracking-wider text-slate-200">
        <span className="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest border border-emerald-500/40">
          PREVIEW MODE
        </span>
        <span>Artaroma B2B Hub</span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
        <span className="text-slate-400 mr-1 font-medium hidden sm:inline">Role Simulator:</span>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
