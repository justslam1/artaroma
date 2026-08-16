'use client';

import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';

export function AdminTopNav() {
  const pathname = usePathname();
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [companyTagline, setCompanyTagline] = useState('B2B Fragrance Oil Supplier & Management Hub');
  const [currentUser, setCurrentUser] = useState<any>({
    name: 'Super Admin',
    role: 'ADMIN',
    email: 'admin@artaroma.co.id',
  });

  const financeRef = useRef<HTMLDivElement>(null);

  // Active section checks
  const isDashboardActive = pathname === '/admin';
  const isMasterActive = pathname.startsWith('/admin/master');
  const isStockActive = pathname.startsWith('/admin/stock');
  const isFinanceActive = pathname.startsWith('/admin/finance');
  const isTransactionsActive = pathname.startsWith('/admin/transactions');

  const isPOActive = pathname.startsWith('/admin/procurement');
  const isSOActive = pathname.startsWith('/admin/sales-orders') || pathname.startsWith('/admin/orders');

  const isCustomerInvoicesActive = pathname === '/admin/finance';
  const isVendorPayablesActive = pathname.startsWith('/admin/finance/payables');

  // Fetch company tagline and auth info
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
  }, []);

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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const initials = (currentUser?.name || 'Admin')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isSuperAdmin = currentUser?.is_super_admin || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const allowedMods: string[] = currentUser?.allowed_modules || [];

  // Permission flags based directly on assigned modules or Super Admin
  const canAccessDashboard = isSuperAdmin || allowedMods.includes('Dashboard');
  const canAccessMaster = isSuperAdmin || allowedMods.includes('Master Data');
  const canAccessPO = isSuperAdmin || allowedMods.includes('Purchase Order (PO)');
  const canAccessSO = isSuperAdmin || allowedMods.includes('Sales Order (SO)');
  const canAccessStock = isSuperAdmin || allowedMods.includes('Lihat Stok (Gudang)');
  const canAccessFinance = isSuperAdmin || allowedMods.includes('Finance & Invoice');

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

          {/* Right side info */}
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="hidden md:block text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
              FEFO Engine: ACTIVE
            </span>
            <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-black shadow-xs">
                  {initials}
                </div>
                <div className="hidden md:block leading-tight text-left">
                  <div className="text-xs font-bold text-slate-800">{currentUser?.name || 'Super Admin'}</div>
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
          <div className="flex items-center h-11 gap-1">
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
                className={`flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isSOActive
                    ? 'bg-white/15 text-white border-white'
                    : 'text-blue-100 border-transparent hover:bg-white/10 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Sales Order (SO)</span>
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
            {(isSuperAdmin || canAccessSO || canAccessPO || canAccessFinance) && (
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
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFinanceOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Sub-menu Dropdown Finance */}
                {isFinanceOpen && (
                  <div className="absolute top-full right-0 sm:left-0 mt-0.5 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in">
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
                        <div className="text-[10px] text-slate-400 font-normal">Tagihan & Verifikasi Bayar Customer</div>
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
                        <div className="text-[10px] text-slate-400 font-normal">Pembayaran & Bukti Transfer PO</div>
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
    </>
  );
}
