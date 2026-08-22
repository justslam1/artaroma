'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  Search,
} from 'lucide-react';
import { Product } from '@/lib/types';
import {
  exportPricelistTemplateXLSX,
  parsePricelistExcel,
  ParsedPricelistRow,
} from '@/lib/export-excel';

interface ImportPricelistModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSuccess: () => void;
}

export default function ImportPricelistModal({
  isOpen,
  onClose,
  products,
  onSuccess,
}: ImportPricelistModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedPricelistRow[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Download Template
  const handleDownloadTemplate = () => {
    exportPricelistTemplateXLSX(products);
  };

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMessage(null);
    setIsLoadingFile(true);

    try {
      const rows = await parsePricelistExcel(selectedFile);

      // Match with products in database to fill in product_id if not present
      const enhancedRows = rows.map((r) => {
        let matchedProd = products.find((p) => p.id === r.productId);
        if (!matchedProd && r.skuInduk) {
          matchedProd = products.find((p) => p.sku.toLowerCase() === r.skuInduk.toLowerCase());
        }
        if (!matchedProd && r.skuVarian) {
          matchedProd = products.find((p) => {
            const hasVariant = Object.values(p.variant_skus || {}).some(
              (vSku) => vSku.toLowerCase() === r.skuVarian.toLowerCase()
            );
            return hasVariant || p.sku.toLowerCase() === r.skuVarian.toLowerCase();
          });
        }

        if (matchedProd) {
          return {
            ...r,
            productId: matchedProd.id,
            productName: r.productName || matchedProd.name,
            isValid: r.isValid && r.newPriceIdr >= 0,
          };
        } else {
          return {
            ...r,
            isValid: false,
            errorMessage: r.errorMessage || 'Produk tidak ditemukan di database.',
          };
        }
      });

      setParsedRows(enhancedRows);
    } catch (err: any) {
      console.error('Parse Excel error:', err);
      setErrorMessage(err.message || 'Gagal membaca format file Excel.');
      setParsedRows([]);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Submit parsed valid rows to backend
  const handleSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('Tidak ada baris data valid untuk diimpor.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        reason: `Impor File Excel (${file?.name || 'Pricelist'})`,
        changed_by: 'Super Admin',
        updates: validRows.map((r) => ({
          product_id: r.productId,
          variant_sku: r.skuVarian,
          pack_size_kg: r.packSizeKg,
          new_price_idr: r.newPriceIdr,
          new_price_usd: r.newPriceUsd,
        })),
      };

      const res = await fetch('/api/products/pricelist/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        alert('Gagal mengimpor pricelist: ' + json.message);
      }
    } catch (err: any) {
      console.error('Import submit error:', err);
      alert('Terjadi kesalahan saat memproses data impor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  const filteredDisplayRows = parsedRows.filter(
    (r) =>
      r.productName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.skuVarian.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.skuInduk.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Impor Pricelist Excel
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 font-normal">
                  Bulk Excel Upload
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Unggah spreadsheet Excel (.xlsx) untuk memperbarui harga master dan varian secara instan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 flex flex-col">
          
          {/* Step 1: Upload & Download Template Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Download Template Box */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  1. Unduh Template Excel
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Format template berisi seluruh produk & varian aktif saat ini siap untuk diedit.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Template .XLSX
              </button>
            </div>

            {/* Upload File Dropzone */}
            <div className="md:col-span-2 bg-slate-950/40 p-4 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-center hover:border-emerald-500/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-slate-500 mb-2" />
              <div className="text-xs font-bold text-slate-200">
                {file ? file.name : 'Pilih file Excel yang telah diperbarui'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Format file didukung: .xlsx atau .xls'}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoadingFile}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isLoadingFile ? 'Membaca file...' : file ? 'Ganti File Excel' : 'Pilih File Excel'}
              </button>
            </div>

          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Step 2: Parsed Results Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 flex-1 flex flex-col">
              
              {/* Summary Toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-300">
                    Total Terbaca: <strong>{parsedRows.length} baris</strong>
                  </span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} Siap Impor
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {invalidCount} Tidak Valid
                    </span>
                  )}
                </div>

                {/* Filter Search */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter tabel..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2.5 w-12 text-center">Baris</th>
                      <th className="px-4 py-2.5">Nama Produk</th>
                      <th className="px-4 py-2.5">SKU Varian</th>
                      <th className="px-4 py-2.5 text-center">Kemasan</th>
                      <th className="px-4 py-2.5 text-right text-emerald-400">Harga IDR / Kg Baru</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                    {filteredDisplayRows.map((r, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          !r.isValid ? 'bg-red-500/5' : ''
                        }`}
                      >
                        <td className="px-4 py-2 text-center text-slate-500 font-mono">
                          {r.rowNumber}
                        </td>
                        <td className="px-4 py-2 font-bold text-white">
                          {r.productName || '-'}
                        </td>
                        <td className="px-4 py-2 font-mono text-slate-300">
                          {r.skuVarian || '-'}
                        </td>
                        <td className="px-4 py-2 text-center font-mono text-slate-300">
                          {r.packSizeKg} Kg
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-emerald-300 bg-emerald-500/5">
                          Rp {r.newPriceIdr.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {r.isValid ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              Valid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold" title={r.errorMessage}>
                              {r.errorMessage || 'Error'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* Bottom Action */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || validCount === 0 || submitSuccess}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Menyimpan ke Database...</span>
              ) : submitSuccess ? (
                <span className="flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-white" /> Impor Berhasil Disimpan!
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Terapkan & Simpan {validCount} Harga Produk
                </span>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
