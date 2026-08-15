'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Building2,
  Truck,
  DollarSign,
  Boxes,
  ShoppingBag,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface DemoAccount {
  role: string;
  name: string;
  email: string;
  pass: string;
  color: string;
  icon: any;
  target: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'SUPER ADMIN',
    name: 'Super Admin HQ',
    email: 'admin@artaroma.co.id',
    pass: 'Artaroma2026!',
    color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    icon: ShieldCheck,
    target: '/admin',
  },
  {
    role: 'SALES',
    name: 'Rangga Sales Executive',
    email: 'sales@artaroma.com',
    pass: 'sales123',
    color: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
    icon: ShoppingBag,
    target: '/admin/sales-orders',
  },
  {
    role: 'FINANCE',
    name: 'Siti Finance Admin',
    email: 'finance@artaroma.com',
    pass: 'Artaroma2026!',
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    icon: DollarSign,
    target: '/admin/finance',
  },
  {
    role: 'GUDANG',
    name: 'Bagus Pengelola Gudang',
    email: 'gudang@artaroma.com',
    pass: 'Artaroma2026!',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    icon: Boxes,
    target: '/admin/stock',
  },
  {
    role: 'KURIR',
    name: 'Agus Kurir Armada',
    email: 'agus@artaroma.co.id',
    pass: 'Artaroma2026!',
    color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    icon: Truck,
    target: '/courier',
  },
  {
    role: 'CUSTOMER B2B',
    name: 'Budi Santoso (Customer)',
    email: 'budi@parfumerieindah.com',
    pass: 'Artaroma2026!',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    icon: Building2,
    target: '/customer/catalog',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectQuery = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [companyName, setCompanyName] = useState('PT Artaroma Jayatama');
  const [companyTagline, setCompanyTagline] = useState('B2B Fragrance Oil Supplier & Management Hub');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch company branding
  useEffect(() => {
    fetch('/api/company-settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          if (json.data.company_name) setCompanyName(json.data.company_name);
          if (json.data.company_tagline) setCompanyTagline(json.data.company_tagline);
        }
      })
      .catch((err) => console.warn('Failed to load branding:', err));
  }, []);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    if (!loginEmail || !loginPass) {
      setErrorMessage('Harap masukkan Email/Username dan Password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const json = await res.json();

      if (json.success) {
        setSuccessMessage(json.message || 'Login berhasil! Mengalihkan...');
        const targetUrl = redirectQuery || json.redirectUrl || '/admin';
        setTimeout(() => {
          router.push(targetUrl);
          router.refresh();
        }, 600);
      } else {
        setErrorMessage(json.message || 'Email atau password tidak sesuai.');
      }
    } catch (err: any) {
      setErrorMessage('Terjadi kesalahan jaringan atau server database tidak terhubung.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    handleLogin(undefined, acc.email, acc.pass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-white p-3 rounded-2xl shadow-xl border border-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://artaroma.co.id/wp-content/uploads/2022/09/bibit-parfum-laundry.png"
              alt="Artaroma Logo"
              className="h-10 object-contain"
            />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">
            {companyName}
          </h1>
          <p className="text-xs text-blue-200 font-medium tracking-wide">
            {companyTagline}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-slate-800">Masuk ke Portal Hub</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan kredensial akun terdaftar Anda untuk melanjutkan
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl flex items-start gap-2.5 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-medium">{successMessage}</div>
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4 text-xs">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">
                Email / Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="admin@artaroma.co.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 focus:border-blue-600 focus:bg-white focus:outline-none rounded-xl pl-10 pr-4 py-3 text-slate-800 text-xs font-semibold transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-700 block">
                  Kata Sandi (Password)
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 focus:border-blue-600 focus:bg-white focus:outline-none rounded-xl pl-10 pr-11 py-3 text-slate-800 text-xs font-mono font-bold transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 text-xs select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Ingat saya selama 7 hari</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-700/30 flex items-center justify-center gap-2 transition-all text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Akun</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher Divider */}
          <div className="relative border-t border-gray-100 pt-5 space-y-3">
            <div className="text-center">
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ⚡ Akun Demo Pengujian Cepat (1-Klik)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc, idx) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickDemoLogin(acc)}
                    disabled={isLoading}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${acc.color} cursor-pointer group`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-extrabold tracking-tight block truncate">
                        {acc.role}
                      </span>
                      <Icon className="w-3.5 h-3.5 shrink-0 opacity-80 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-[11px] font-bold mt-1 text-slate-800 truncate">
                      {acc.name.split(' ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500 space-y-1">
          <p>&copy; 2026 {companyName}. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}
