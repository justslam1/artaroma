'use client';

import React, { useState } from 'react';
import { Invoice } from '@/lib/types';
import { formatIDR, formatDate } from '@/lib/utils';
import { X, Upload, CheckCircle2, Image as ImageIcon } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onUploadSuccess: (invoiceId: string, proofUrl: string) => void;
}

export function PaymentModal({ isOpen, onClose, invoice, onUploadSuccess }: PaymentModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen || !invoice) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setTimeout(() => {
      const dummyUrl = previewUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60';
      onUploadSuccess(invoice.id, dummyUrl);
      setIsUploading(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <Upload className="w-5 h-5" />
            <h3 className="font-bold text-base">Upload Bukti Pembayaran</h3>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Invoice Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">No. Invoice:</span>
              <span className="font-mono font-bold text-blue-700">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Tagihan:</span>
              <span className="font-bold text-emerald-700 text-sm">{formatIDR(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Jatuh Tempo:</span>
              <span className="text-slate-700">{formatDate(invoice.due_date)}</span>
            </div>
          </div>

          {/* Upload Area */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
              File Bukti Transfer (JPG, PNG, PDF)
            </label>
            <div className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-6 text-center transition-colors relative cursor-pointer bg-gray-50">
              <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              {previewUrl ? (
                <div className="space-y-2">
                  <img src={previewUrl} alt="Preview" className="max-h-32 mx-auto rounded-lg border border-gray-200 shadow-sm" />
                  <span className="text-xs text-blue-600 font-semibold">{selectedFile?.name}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Klik atau seret file di sini</div>
                  <div className="text-xs text-gray-400">Maks. 5 MB</div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-gray-50">
              Batal
            </button>
            <button type="submit" disabled={isUploading} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-1.5 shadow transition-all">
              <CheckCircle2 className="w-4 h-4" />
              {isUploading ? 'Mengunggah...' : 'Kirim Bukti Bayar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
