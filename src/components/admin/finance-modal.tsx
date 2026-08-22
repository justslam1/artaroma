'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Invoice, InvoicePaymentRecord } from '@/lib/types';
import { formatIDR, formatDate } from '@/lib/utils';
import {
  X,
  CheckCircle,
  XCircle,
  FileText,
  Upload,
  ShieldCheck,
  DollarSign,
  Calculator,
  AlertCircle,
  Calendar,
  History,
  Image as ImageIcon,
  Paperclip,
  Eye,
  Trash2,
  Receipt,
  UserCheck,
} from 'lucide-react';

interface VerifyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onVerify: (
    invoiceId: string,
    status: 'VERIFIED' | 'REJECTED',
    paidAmount?: number,
    paymentNotes?: string,
    paymentDate?: string,
    paymentProofUrl?: string
  ) => void;
}

export function VerifyPaymentModal({ isOpen, onClose, invoice, onVerify }: VerifyPaymentModalProps) {
  const totalBill = Number(invoice?.total_amount || 0);
  const alreadyPaid = Number(invoice?.paid_amount || 0);
  const remainingBill = Math.max(0, totalBill - alreadyPaid);

  const [inputAmount, setInputAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [financeProofUrl, setFinanceProofUrl] = useState<string>('');
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (invoice) {
      const rem = Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
      setInputAmount(rem.toString());
      setPaymentNotes(invoice.payment_notes || '');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setFinanceProofUrl(invoice.payment_proof_url || '');
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const parsedInput = Math.max(0, parseFloat(inputAmount) || 0);
  const newAccumulatedPaid = Math.min(totalBill, alreadyPaid + parsedInput);
  const sisaSetelahBayar = Math.max(0, totalBill - newAccumulatedPaid);
  const isLunas = newAccumulatedPaid >= totalBill && totalBill > 0;
  const isPartial = parsedInput > 0 && !isLunas;

  const handleQuickPreset = (type: 'FULL' | 'HALF' | 'CLEAR') => {
    if (type === 'FULL') {
      setInputAmount(remainingBill.toString());
    } else if (type === 'HALF') {
      setInputAmount(Math.round(remainingBill / 2).toString());
    } else {
      setInputAmount('0');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file bukti transfer maksimal 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFinanceProofUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (parsedInput <= 0) {
      alert('Masukkan nominal transfer pembayaran yang valid (minimal lebih dari Rp 0).');
      return;
    }
    if (!paymentDate) {
      alert('Silakan pilih tanggal pembayaran.');
      return;
    }
    onVerify(invoice.id, 'VERIFIED', parsedInput, paymentNotes, paymentDate, financeProofUrl);
    onClose();
  };

  const paymentHistory: InvoicePaymentRecord[] = Array.isArray(invoice.payment_history) ? invoice.payment_history : [];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white border border-gray-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-blue-200" />
              <div>
                <h3 className="font-bold text-base">Verifikasi &amp; Pencatatan Pembayaran</h3>
                <p className="text-xs text-blue-200">Input tanggal bayar, nominal transfer, &amp; upload bukti transfer finance</p>
              </div>
            </div>
            <button onClick={onClose} className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Invoice Summary Info Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Customer B2B:</span>
                <span className="font-bold text-slate-800">{invoice.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">No. Invoice:</span>
                <span className="font-mono font-bold text-blue-700">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
                <span className="text-slate-500 font-medium">Total Nilai Tagihan:</span>
                <span className="font-mono font-bold text-slate-800">{formatIDR(totalBill)}</span>
              </div>
              {alreadyPaid > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span className="font-medium">Sudah Dibayar Sebelumnya:</span>
                  <span className="font-mono font-bold">-{formatIDR(alreadyPaid)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200/80 pt-1.5 bg-blue-50/50 p-2 rounded-lg">
                <span className="font-bold text-blue-900">Sisa Tagihan Saat Ini:</span>
                <span className="font-mono font-extrabold text-blue-700 text-sm">{formatIDR(remainingBill)}</span>
              </div>
            </div>

            {/* Riwayat Pembayaran Sebelumnya (Ledger History) */}
            {paymentHistory.length > 0 && (
              <div className="border border-purple-200 bg-purple-50/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-purple-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-purple-600" />
                    Riwayat Pembayaran Sebelumnya ({paymentHistory.length}x Bayar)
                  </span>
                  <span className="text-[11px] text-purple-700 font-mono">
                    Total Masuk: {formatIDR(alreadyPaid)}
                  </span>
                </div>
                <div className="divide-y divide-purple-100 bg-white rounded-lg border border-purple-200/70 overflow-hidden">
                  {paymentHistory.map((item, idx) => (
                    <div key={item.id || idx} className="p-2.5 flex items-center justify-between text-[11px] gap-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>Bayar #{idx + 1}:</span>
                          <span className="font-mono text-emerald-700">{formatIDR(item.amount)}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span>Tgl: <strong className="text-slate-700">{item.payment_date || '-'}</strong></span>
                          {item.payment_notes && <span>• Catatan: {item.payment_notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.payment_proof_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewImageModal(item.payment_proof_url || null)}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-800 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> Bukti
                          </button>
                        )}
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Sisa: {formatIDR(item.remaining_after)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Tanggal & Nominal Pembayaran Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tanggal Pembayaran Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Tanggal Pembayaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 focus:outline-none shadow-2xs"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-col justify-end">
                <span className="text-[11px] font-bold text-slate-500 mb-1.5">Preset Nominal:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('FULL')}
                    className="flex-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 py-1.5 rounded-lg cursor-pointer transition-colors text-center"
                  >
                    100% Lunas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('HALF')}
                    className="flex-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 py-1.5 rounded-lg cursor-pointer transition-colors text-center"
                  >
                    50% Sisa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('CLEAR')}
                    className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Manual Transfer Amount Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Nominal Transfer Masuk (IDR) <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-sm">Rp</span>
                <input
                  type="number"
                  min={0}
                  max={remainingBill}
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  placeholder="Masukkan nominal transfer..."
                  className="w-full pl-11 pr-4 py-2 bg-white border-2 border-blue-400 focus:border-blue-600 rounded-xl font-mono text-base font-extrabold text-slate-900 focus:outline-none shadow-xs"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 px-1 font-medium">
                <span>Terbilang: <strong className="text-slate-700 font-mono">{formatIDR(parsedInput)}</strong></span>
                {parsedInput > remainingBill && (
                  <span className="text-red-600 font-bold">⚠️ Melebihi sisa tagihan!</span>
                )}
              </div>
            </div>

            {/* Dynamic Real-time Calculation Result */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Akumulasi Pembayaran:</span>
                <span className="font-mono font-bold text-slate-800">{formatIDR(newAccumulatedPaid)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Sisa Piutang Pasca Verifikasi:</span>
                <span className={`font-mono font-extrabold ${sisaSetelahBayar === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {formatIDR(sisaSetelahBayar)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-1.5">
                <span className="text-slate-600">Status Tagihan Setelah Verifikasi:</span>
                {isLunas ? (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full text-[11px]">
                    ✓ LUNAS PENUH (PAID)
                  </span>
                ) : isPartial ? (
                  <span className="bg-purple-100 text-purple-800 border border-purple-300 font-bold px-2 py-0.5 rounded-full text-[11px]">
                    ⚡ PEMBAYARAN SEBAGIAN (PARTIAL)
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-700 border border-slate-300 font-bold px-2 py-0.5 rounded-full text-[11px]">
                    BELUM ADA PEMBAYARAN
                  </span>
                )}
              </div>
            </div>

            {/* Catatan Pembayaran / Referensi Bank */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Catatan Verifikasi / Referensi Bank (Opsional)</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Contoh: Transfer BCA Ref #88921 Tahap 1..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Upload & Preview Bukti Transfer Section */}
            <div className="space-y-2 border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-indigo-600" />
                  Bukti Transfer Pembayaran
                </label>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Bukti (Staf Finance)
                  </button>
                </div>
              </div>

              {/* Image Preview Box */}
              {financeProofUrl ? (
                <div className="relative bg-white border border-slate-200 rounded-xl p-2 text-center group">
                  <img
                    src={financeProofUrl}
                    alt="Bukti Transfer"
                    className="max-h-40 rounded-lg mx-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setPreviewImageModal(financeProofUrl)}
                  />
                  <div className="flex items-center justify-center gap-2 mt-2 pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setPreviewImageModal(financeProofUrl)}
                      className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Perbesar Foto
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setFinanceProofUrl('')}
                      className="text-xs text-red-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Foto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs italic bg-white border border-dashed border-slate-300 rounded-xl">
                  Belum ada bukti transfer. Customer atau Staf Finance dapat mengupload foto bukti transfer di atas.
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => { onVerify(invoice.id, 'REJECTED'); onClose(); }}
              className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" /> Tolak
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={parsedInput <= 0 || !paymentDate}
              className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isLunas
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {isLunas
                ? `Verifikasi & Set Lunas Penuh (${formatIDR(parsedInput)})`
                : `Konfirmasi Pembayaran Sebagian (${formatIDR(parsedInput)})`}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom Image Modal */}
      {previewImageModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setPreviewImageModal(null)}>
          <div className="relative max-w-3xl max-h-[90vh] bg-white p-2 rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-1.5 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImageModal} alt="Pratinjau Bukti Transfer" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </>
  );
}

interface UploadTaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onUploadTaxInvoice: (invoiceId: string, pdfUrl: string) => void;
}

export function UploadTaxInvoiceModal({ isOpen, onClose, invoice, onUploadTaxInvoice }: UploadTaxInvoiceModalProps) {
  if (!isOpen || !invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUploadTaxInvoice(invoice.id, '/dummy-faktur-pajak.pdf');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-amber-500 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5" />
            <h3 className="font-bold text-base">Upload Faktur Pajak PDF</h3>
          </div>
          <button onClick={onClose} className="text-amber-100 hover:text-white p-1 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
            <div className="text-gray-400">Target Invoice:</div>
            <div className="font-mono font-bold text-slate-800 text-sm">{invoice.invoice_number}</div>
            <div className="text-gray-500">{invoice.customer_name}</div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">File Faktur Pajak PDF</label>
            <div className="border border-gray-200 bg-gray-50 rounded-xl p-4">
              <input type="file" accept=".pdf" className="w-full text-sm text-gray-600" />
              <span className="text-[11px] text-gray-400 mt-1 block">Format: PDF e-Faktur Pajak resmi</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-gray-50">Batal</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold flex items-center gap-1.5 shadow transition-all">
              <Upload className="w-4 h-4" /> Simpan Faktur Pajak
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
