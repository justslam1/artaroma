'use client';

import React, { useState, useEffect } from 'react';
import { Invoice } from '@/lib/types';
import { formatIDR, formatDate } from '@/lib/utils';
import { X, CheckCircle, XCircle, FileText, Upload, ShieldCheck, DollarSign, Calculator, AlertCircle } from 'lucide-react';

interface VerifyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onVerify: (
    invoiceId: string,
    status: 'VERIFIED' | 'REJECTED',
    paidAmount?: number,
    paymentNotes?: string
  ) => void;
}

export function VerifyPaymentModal({ isOpen, onClose, invoice, onVerify }: VerifyPaymentModalProps) {
  const totalBill = Number(invoice?.total_amount || 0);
  const alreadyPaid = Number(invoice?.paid_amount || 0);
  const remainingBill = Math.max(0, totalBill - alreadyPaid);

  const [inputAmount, setInputAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  useEffect(() => {
    if (invoice) {
      const rem = Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
      setInputAmount(rem.toString());
      setPaymentNotes(invoice.payment_notes || '');
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

  const handleConfirm = () => {
    if (parsedInput <= 0) {
      alert('Masukkan nominal transfer pembayaran yang valid (minimal lebih dari Rp 0).');
      return;
    }
    onVerify(invoice.id, 'VERIFIED', parsedInput, paymentNotes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-200" />
            <div>
              <h3 className="font-bold text-base">Verifikasi Pembayaran Transfer</h3>
              <p className="text-xs text-blue-200">Konfirmasi nominal pembayaran penuh atau sebagian (cicilan)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
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

          {/* Manual Transfer Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Nominal Transfer Masuk (IDR) <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickPreset('FULL')}
                  className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  100% Lunas
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('HALF')}
                  className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  50% Sisa
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('CLEAR')}
                  className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

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

          {/* Payment Notes */}
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

          {/* Proof of payment image preview */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Foto Bukti Transfer Customer</label>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
              {invoice.payment_proof_url ? (
                <img
                  src={invoice.payment_proof_url}
                  alt="Bukti Transfer"
                  className="max-h-40 rounded-lg mx-auto object-contain shadow-2xs"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60";
                  }}
                />
              ) : (
                <div className="py-6 text-slate-400 text-xs italic">Belum ada foto bukti transfer terlampir.</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 flex-wrap">
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
              disabled={parsedInput <= 0}
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
    </div>
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
