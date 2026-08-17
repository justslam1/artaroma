'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Auto-reload to fetch fresh bundles on chunk load failure
    console.warn('[Artaroma Global Error] Triggering auto-recovery...');
    window.location.reload();
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Menyegarkan Halaman...</h2>
          <p className="text-xs text-slate-500">
            Sistem mendeteksi pembaruan versi baru dan sedang memuat ulang aset terbaru.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow cursor-pointer"
          >
            Klik untuk Muat Ulang
          </button>
        </div>
      </body>
    </html>
  );
}
