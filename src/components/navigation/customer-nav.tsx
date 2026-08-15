'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, ShoppingBag, FileText, ShieldAlert, CheckCircle2, LogOut } from 'lucide-react';
import { Customer } from '@/lib/types';
import { formatIDR } from '@/lib/utils';

interface CustomerNavProps {
  currentCustomer: Customer;
  onCustomerChange?: (customerId: string) => void;
  allCustomers?: Customer[];
  cartCount?: number;
  onOpenCart?: () => void;
}

export function CustomerNav({ currentCustomer, onCustomerChange, allCustomers = [], cartCount = 0, onOpenCart }: CustomerNavProps) {
  const pathname = usePathname();
  const creditUsedPercent = Math.min(100, Math.round((currentCustomer.current_piutang / currentCustomer.credit_limit) * 100));

  const [companyTagline, setCompanyTagline] = React.useState('B2B Fragrance Oil Supplier & Management Hub');

  React.useEffect(() => {
    fetch('/api/company-settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.company_tagline) {
          setCompanyTagline(json.data.company_tagline);
        }
      })
      .catch((err) => console.warn('Failed to load company tagline in CustomerNav:', err));

    const handleUpdate = () => {
      fetch('/api/company-settings', { cache: 'no-store' })
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.company_tagline) {
            setCompanyTagline(json.data.company_tagline);
          }
        })
        .catch((err) => console.warn('Failed to reload company tagline in CustomerNav:', err));
    };

    window.addEventListener('artaroma_company_settings_updated', handleUpdate);
    return () => window.removeEventListener('artaroma_company_settings_updated', handleUpdate);
  }, []);

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
          <div className="hidden lg:flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                Plafon Tempo:
                {currentCustomer.has_overdue ? (
                  <span className="bg-red-50 text-red-600 text-[10px] px-1.5 rounded font-bold border border-red-200 flex items-center gap-0.5">
                    <ShieldAlert className="w-3 h-3" /> BLOCKED
                  </span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] px-1.5 rounded font-bold border border-emerald-200 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> OK
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-blue-700">{formatIDR(currentCustomer.current_piutang)}</span>
                <span className="text-slate-400">/ {formatIDR(currentCustomer.credit_limit)}</span>
              </div>
            </div>
            <div className="w-14 bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${creditUsedPercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${creditUsedPercent}%` }}
              />
            </div>
          </div>

          {/* Right nav */}
          <div className="flex items-center gap-2">
            {onOpenCart && (
              <button
                onClick={onOpenCart}
                className="relative bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
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

            <button
              onClick={async () => {
                if (confirm('Keluar dari sesi akun Customer?')) {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/login';
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
          <div className="flex items-center h-11 gap-0.5">
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
        </div>
      </nav>
    </>
  );
}
