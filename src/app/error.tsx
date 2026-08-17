'use client';

import React, { useEffect } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // If it's a chunk load error or network error, auto-recover by reloading the page
    if (/ChunkLoadError|Loading chunk|Failed to load chunk|Failed to fetch/i.test(error?.message || '')) {
      console.warn('ChunkLoadError caught in error boundary. Auto-reloading fresh page...');
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800">Pembaruan Sistem Terdeteksi</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Sistem Artaroma baru saja diperbarui ke versi terbaru. Silakan klik tombol di bawah untuk memuat ulang halaman dengan lancar.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Muat Ulang Halaman
          </button>
          <button
            onClick={() => {
              window.location.replace('/login');
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" /> Kembali ke Login
          </button>
        </div>
      </div>
    </div>
  );
}
