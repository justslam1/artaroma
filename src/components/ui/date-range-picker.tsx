'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string; // 'YYYY-MM-DD' or ''
  endDate: string;   // 'YYYY-MM-DD' or ''
  onChange: (startDate: string, endDate: string) => void;
  placeholder?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = 'Pilih tanggal',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync temp dates when props change
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format date to DD/MM/YYYY
  const formatDisplay = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const [y, m, d] = isoStr.split('-');
      if (y && m && d) return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      const dt = new Date(isoStr);
      if (isNaN(dt.getTime())) return isoStr;
      const day = String(dt.getDate()).padStart(2, '0');
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const year = dt.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return isoStr;
    }
  };

  const displayText = () => {
    if (startDate && endDate) {
      if (startDate === endDate) return formatDisplay(startDate);
      return `${formatDisplay(startDate)}  –  ${formatDisplay(endDate)}`;
    }
    if (startDate) return `${formatDisplay(startDate)} – s/d sekarang`;
    if (endDate) return `s/d ${formatDisplay(endDate)}`;
    return '';
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempStart('');
    setTempEnd('');
    onChange('', '');
    setIsOpen(false);
  };

  const handlePreset = (preset: string) => {
    const now = new Date();
    const toISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let start = '';
    let end = '';

    if (preset === 'TODAY') {
      start = toISO(now);
      end = toISO(now);
    } else if (preset === '7_DAYS') {
      const d7 = new Date();
      d7.setDate(now.getDate() - 6);
      start = toISO(d7);
      end = toISO(now);
    } else if (preset === '30_DAYS') {
      const d30 = new Date();
      d30.setDate(now.getDate() - 29);
      start = toISO(d30);
      end = toISO(now);
    } else if (preset === 'THIS_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      start = toISO(first);
      end = toISO(last);
    } else if (preset === 'LAST_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      start = toISO(first);
      end = toISO(last);
    } else if (preset === 'ALL') {
      start = '';
      end = '';
    }

    setTempStart(start);
    setTempEnd(end);
    onChange(start, end);
    setIsOpen(false);
  };

  const handleApply = () => {
    if (tempStart && tempEnd && tempStart > tempEnd) {
      onChange(tempEnd, tempStart);
    } else {
      onChange(tempStart, tempEnd);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input Box Display matching reference screenshot */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-white border rounded-lg px-3 py-2 text-xs flex items-center justify-between transition-all cursor-pointer font-medium text-left ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 text-slate-800'
            : startDate || endDate
            ? 'border-blue-400 text-slate-800 bg-blue-50/10'
            : 'border-gray-300 text-slate-500 hover:border-gray-400'
        }`}
      >
        <span className="truncate pr-2 font-mono text-[13px] tracking-tight">
          {displayText() || <span className="text-slate-400 font-sans text-xs">{placeholder}</span>}
        </span>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {(startDate || endDate) && (
            <span
              onClick={handleClear}
              className="p-0.5 hover:text-slate-700 hover:bg-gray-100 rounded cursor-pointer transition-colors"
              title="Hapus filter tanggal"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <Calendar className="w-4 h-4 text-slate-500" />
        </div>
      </button>

      {/* Popover Dropdown Picker */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 w-72 sm:w-80 space-y-3.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-bold text-slate-700">Pilih Rentang Tanggal</span>
            {(startDate || endDate || tempStart || tempEnd) && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handlePreset('TODAY')}
              className="px-2 py-1.5 text-[11px] font-medium bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-md border border-gray-200 transition-colors text-slate-600 cursor-pointer text-center"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handlePreset('7_DAYS')}
              className="px-2 py-1.5 text-[11px] font-medium bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-md border border-gray-200 transition-colors text-slate-600 cursor-pointer text-center"
            >
              7 Hari Lalu
            </button>
            <button
              type="button"
              onClick={() => handlePreset('30_DAYS')}
              className="px-2 py-1.5 text-[11px] font-medium bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-md border border-gray-200 transition-colors text-slate-600 cursor-pointer text-center"
            >
              30 Hari Lalu
            </button>
            <button
              type="button"
              onClick={() => handlePreset('THIS_MONTH')}
              className="px-2 py-1.5 text-[11px] font-medium bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-md border border-gray-200 transition-colors text-slate-600 cursor-pointer text-center"
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => handlePreset('LAST_MONTH')}
              className="px-2 py-1.5 text-[11px] font-medium bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-md border border-gray-200 transition-colors text-slate-600 cursor-pointer text-center"
            >
              Bulan Lalu
            </button>
            <button
              type="button"
              onClick={() => handlePreset('ALL')}
              className="px-2 py-1.5 text-[11px] font-medium bg-gray-50 hover:bg-slate-100 rounded-md border border-gray-200 transition-colors text-slate-600 cursor-pointer text-center"
            >
              Semua
            </button>
          </div>

          {/* Custom Date Pickers */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={tempStart}
                onChange={(e) => setTempStart(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={tempEnd}
                onChange={(e) => setTempEnd(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 bg-white"
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-gray-100 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
