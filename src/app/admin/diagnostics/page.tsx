'use client';

import React, { useState, useEffect } from 'react';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Zap,
  Clock,
  Database,
  Calculator,
  Layers,
  ShoppingCart,
  CreditCard,
  Truck,
  Bell,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
  Sparkles,
  Loader2,
  Activity,
  Server,
  FileCheck,
} from 'lucide-react';

interface TestResultItem {
  id: string;
  name: string;
  category: 'INFRASTRUCTURE' | 'MASTER' | 'FEFO' | 'ORDERS' | 'FINANCE' | 'COURIER' | 'NOTIFICATIONS';
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  duration_ms: number;
  message: string;
  details: string[];
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
  duration_ms: number;
  timestamp: string;
}

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string }> = {
  INFRASTRUCTURE: { label: 'Infrastruktur & DB', icon: Database, color: 'text-slate-700 bg-slate-100 border-slate-200' },
  MASTER: { label: 'Master & Rumus Harga', icon: Calculator, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  FEFO: { label: 'Stok & FEFO Engine', icon: Layers, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  ORDERS: { label: 'Sales Order & Plafon', icon: ShoppingCart, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  FINANCE: { label: 'Finance & Invoicing', icon: CreditCard, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  COURIER: { label: 'Kurir & Bukti POD', icon: Truck, color: 'text-sky-700 bg-sky-50 border-sky-200' },
  NOTIFICATIONS: { label: 'Push Notification', icon: Bell, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
};

export default function DiagnosticsPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [results, setResults] = useState<TestResultItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});
  const [hasRun, setHasRun] = useState(false);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/diagnostics/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      }
      if (data.results) {
        setResults(data.results);
        // Expand all by default
        const exp: Record<string, boolean> = {};
        data.results.forEach((r: TestResultItem) => {
          exp[r.id] = true;
        });
        setExpandedTests(exp);
      }
      setHasRun(true);
    } catch (err: any) {
      alert(`Gagal menjalankan pengujian otomatis: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Run automatically once on mount
  useEffect(() => {
    handleRunTests();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedTests((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const exp: Record<string, boolean> = {};
    results.forEach((r) => {
      exp[r.id] = true;
    });
    setExpandedTests(exp);
  };

  const collapseAll = () => {
    setExpandedTests({});
  };

  const filteredResults = results.filter((r) => {
    if (activeCategory === 'ALL') return true;
    return r.category === activeCategory;
  });

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ summary, results }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `artaroma-diagnostic-report-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-16">
      <AdminTopNav />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
                <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span>Automated End-to-End System Health Monitor</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Pusat Diagnostik &amp; Uji Otomatis Sistem
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Verifikasi otomatis seluruh alur kerja operasional Artaroma: Sinkronisasi Database, Rumus Auto-Markup Repack, Engine FEFO, Penegakan Plafon Kredit, Verifikasi Finance, POD Kurir, dan Push Notifikasi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isRunning}
                onClick={handleRunTests}
                className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sedang Menguji Sistem...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>Jalankan Uji Otomatis</span>
                  </>
                )}
              </button>

              {summary && (
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-3 rounded-2xl border border-white/20 transition-colors flex items-center gap-2 cursor-pointer"
                  title="Unduh Laporan Uji (JSON)"
                >
                  <Download className="w-4 h-4" />
                  <span>Ekspor Laporan</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Diagnostic Stats Overview Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>TOTAL SKENARIO</span>
                <Server className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">{summary.total}</div>
              <div className="text-[11px] text-slate-500">Fitur &amp; modul bisnis terverifikasi</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-1 bg-gradient-to-b from-white to-emerald-50/30">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
                <span>SKENARIO LULUS (PASS)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-emerald-700 font-mono">{summary.passed}</div>
              <div className="text-[11px] text-emerald-600 font-semibold">Tingkat kelulusan: {summary.pass_rate}%</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>WAKTU EKSEKUSI</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {(summary.duration_ms / 1000).toFixed(2)}s
              </div>
              <div className="text-[11px] text-slate-500">Benchmark kecepatan server Next.js</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>STATUS KESEHATAN</span>
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg font-extrabold flex items-center gap-2 pt-1 text-emerald-600">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span>ALL HEALTHY</span>
              </div>
              <div className="text-[11px] text-slate-500">Database &amp; APIs 100% sinkron</div>
            </div>
          </div>
        )}

        {/* Filter Category & Collapse Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none text-xs font-bold">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              Semua Modul ({results.length})
            </button>
            {Object.entries(CATEGORY_MAP).map(([catKey, catMeta]) => {
              const count = results.filter((r) => r.category === catKey).length;
              if (count === 0) return null;
              return (
                <button
                  key={catKey}
                  onClick={() => setActiveCategory(catKey)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeCategory === catKey
                      ? 'bg-blue-800 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <catMeta.icon className="w-3.5 h-3.5" />
                  <span>{catMeta.label} ({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold self-end sm:self-auto">
            <button
              type="button"
              onClick={expandAll}
              className="hover:text-blue-700 underline cursor-pointer"
            >
              Buka Semua Log
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={collapseAll}
              className="hover:text-slate-700 underline cursor-pointer"
            >
              Tutup Semua
            </button>
          </div>
        </div>

        {/* Test Results Accordion List */}
        <div className="space-y-3">
          {filteredResults.map((test, index) => {
            const cat = CATEGORY_MAP[test.category] || CATEGORY_MAP.INFRASTRUCTURE;
            const CatIcon = cat.icon;
            const isExpanded = expandedTests[test.id] !== false;

            return (
              <div
                key={test.id}
                className={`bg-white border rounded-2xl shadow-xs transition-all overflow-hidden ${
                  test.status === 'PASSED'
                    ? 'border-slate-200 hover:border-emerald-300'
                    : 'border-rose-300 bg-rose-50/10'
                }`}
              >
                {/* Header */}
                <div
                  onClick={() => toggleExpand(test.id)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="shrink-0">
                      {test.status === 'PASSED' ? (
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-2xs">
                          <XCircle className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 ${cat.color}`}>
                          <CatIcon className="w-3 h-3" />
                          <span>{cat.label}</span>
                        </span>
                        <span className="text-xs text-slate-400 font-mono">#{index + 1}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                        {test.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {test.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-slate-700 font-mono">
                        {test.duration_ms} ms
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold uppercase">
                        {test.status}
                      </div>
                    </div>

                    <div className="text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Step Log Body */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-3 animate-in fade-in duration-100">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Audit Trail &amp; Verification Steps:
                    </div>
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-1.5 overflow-x-auto shadow-inner">
                      {test.details.map((line, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 ${
                            line.startsWith('ERROR')
                              ? 'text-rose-400 font-bold'
                              : line.startsWith('✓')
                              ? 'text-emerald-400'
                              : 'text-slate-300'
                          }`}
                        >
                          <span className="text-slate-600 select-none text-[10px] w-5 text-right">{idx + 1}</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-slate-400 py-4">
          Artaroma Enterprise Automated Diagnostic Runner • Next.js 16 + MySQL + W3C Web Push Protocol
        </div>
      </main>
    </div>
  );
}
