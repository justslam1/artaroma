'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function TablePagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate pagination items with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 text-xs text-slate-600 select-none ${className}`}
    >
      {/* Left side: Page Size Selector & Count info */}
      <div className="flex items-center gap-3">
        <div className="relative inline-flex items-center">
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              onPageSizeChange(newSize);
              onPageChange(1);
            }}
            className="appearance-none bg-white border border-slate-300 hover:border-slate-400 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
        </div>

        <span className="text-slate-500">
          menampilkan <span className="font-semibold text-slate-700">{startItem.toLocaleString('id-ID')}</span> hingga{' '}
          <span className="font-semibold text-slate-700">{endItem.toLocaleString('id-ID')}</span> dari{' '}
          <span className="font-semibold text-slate-700">{totalItems.toLocaleString('id-ID')}</span> hasil
        </span>
      </div>

      {/* Right side: Pagination Navigation Bar */}
      <div className="inline-flex items-stretch rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage <= 1}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-400 disabled:cursor-not-allowed border-r border-slate-200 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Sebelumnya</span>
        </button>

        {/* Page Numbers */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 border-r border-slate-200 flex items-center justify-center bg-slate-50/50"
              >
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === safeCurrentPage;

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[34px] px-2.5 py-1.5 text-xs font-semibold border-r border-slate-200 transition-colors cursor-pointer flex items-center justify-center ${
                isActive
                  ? 'bg-blue-700 text-white font-bold'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-blue-700 bg-white'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <span>Selanjutnya</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
export default TablePagination;
