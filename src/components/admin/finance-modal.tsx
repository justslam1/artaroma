'use client';

import React, { useState } from 'react';
import { Invoice } from '@/lib/types';
import { formatIDR, formatDate } from '@/lib/utils';
import { X, CheckCircle, XCircle, FileText, Upload, ShieldCheck } from 'lucide-react';

interface VerifyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onVerify: (invoiceId: string, status: 'VERIFIED' | 'REJECTED') => void;
}

export function VerifyPaymentModal({ isOpen, onClose, invoice, onVerify }: VerifyPaymentModalProps) {
  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="bg-blue-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-bold text-base">Verifikasi Pembayaran Transfer</h3>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white p-1 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Customer B2B:</span>
              <span className="font-bold text-slate-800">{invoice.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">No. Invoice:</span>
              <span className="font-mono font-bold text-blue-700">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Jumlah Transfer:</span>
              <span className="font-bold text-emerald-700 text-sm">{formatIDR(invoice.total_amount)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">Foto Bukti Transfer Customer</label>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 text-center">
              {invoice.payment_proof_url ? (
                <img
                  src={invoice.payment_proof_url}
                  alt="Bukti Transfer"
                  className="max-h-48 rounded-lg mx-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60";
                  }}
                />
              ) : (
                <div className="py-8 text-gray-400 text-sm">Belum ada foto bukti transfer.</div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => { onVerify(invoice.id, 'REJECTED'); onClose(); }}
              className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 font-bold text-sm flex items-center gap-1.5 transition-colors"
            >
              <XCircle className="w-4 h-4" /> Tolak
            </button>
            <button
              onClick={() => { onVerify(invoice.id, 'VERIFIED'); onClose(); }}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center gap-1.5 shadow transition-all"
            >
              <CheckCircle className="w-4 h-4" /> Verifikasi & Set Lunas
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
