'use client';

import React, { useState } from 'react';
import { SalesOrder, Invoice } from '@/lib/types';
import { formatIDR, formatKg, formatDate } from '@/lib/utils';
import {
  X,
  Upload,
  CheckCircle2,
  Image as ImageIcon,
  Building2,
  Copy,
  Check,
  CreditCard,
  FileText,
  AlertCircle,
  Clock,
  Download,
} from 'lucide-react';

interface CustomerOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder | null;
  invoice: Invoice | null;
  onUploadSuccess: (invoiceId: string, proofUrl: string) => void;
}

export function CustomerOrderDetailModal({
  isOpen,
  onClose,
  order,
  invoice,
  onUploadSuccess,
}: CustomerOrderDetailModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [senderBankInfo, setSenderBankInfo] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  React.useEffect(() => {
    if (!isOpen) return;
    fetch('/api/company-settings', { cache: 'no-store' })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.bank_accounts) {
          setBankAccounts(json.data.bank_accounts);
        }
      })
      .catch(err => console.warn('Failed to load bank settings in detail modal:', err));
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handleCopyAccount = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(String(idx));
    setTimeout(() => setCopiedBank(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    setTimeout(() => {
      const dummyUrl =
        previewUrl ||
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60';
      
      const invId = invoice ? invoice.id : `inv-${order.id}`;
      onUploadSuccess(invId, dummyUrl);
      setIsUploading(false);
      onClose();
    }, 700);
  };

  const getStatusBadge = (status: SalesOrder['status']) => {
    switch (status) {
      case 'DIAJUKAN':
      case 'PENDING_APPROVAL':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'DIKONFIRMASI':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'DIBAYAR':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'PROSES_GUDANG':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'DIKIRIM':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'DITERIMA':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const calculatedTotal =
    order.grand_total ||
    order.items.reduce(
      (sum, item) => sum + item.qty_kg * (item.unit_price_per_kg || 1850000),
      0
    );

  const isConfirmedOrLater = order.status !== 'DIAJUKAN';
  const isPaidOrLater =
    order.status === 'DIBAYAR' ||
    order.status === 'PROSES_GUDANG' ||
    order.status === 'DIKIRIM' ||
    order.status === 'DITERIMA';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-200" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Rincian Pesanan & Pembayaran</h2>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                    order.status
                  )}`}
                >
                  {order.status === 'PENDING_APPROVAL' ? 'DIAJUKAN' : order.status}
                </span>
              </div>
              <p className="text-xs text-blue-200 font-mono mt-0.5">
                Nomor SO: {order.so_number} | Tanggal: {formatDate(order.order_date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1.5 rounded-xl hover:bg-blue-600/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Customer & Order Metadata Box */}
          <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Customer B2B Pemesan
              </span>
              <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                {order.customer_company}
              </div>
              <div className="text-slate-500 mt-1">PIC: {order.customer_name}</div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Metode Pembayaran
              </span>
              <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                {order.payment_method === 'TEMPO'
                  ? 'TEMPO (Kredit Pembayaran B2B)'
                  : 'LUNAS TRANSFER (Cash Before Delivery)'}
              </div>
              <div className="text-slate-500 mt-1 font-mono">
                Invoice:{' '}
                <span className="font-bold text-blue-700">
                  {invoice ? invoice.invoice_number : 'Diterbitkan saat Konfirmasi'}
                </span>
              </div>
            </div>
          </div>

          {/* ITEM BREAKDOWN TABLE (DETIL PESANAN) */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" /> Rincian Varian Bibit Parfum Dipesan:
            </h3>

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-slate-600 text-[10px] uppercase font-bold tracking-wide">
                    <th className="px-4 py-2.5">Varian Bibit Parfum</th>
                    <th className="px-4 py-2.5 text-right">Jumlah (Kg)</th>
                    <th className="px-4 py-2.5 text-right">Harga / Kg (IDR)</th>
                    <th className="px-4 py-2.5 text-right">Subtotal (IDR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item, idx) => {
                    const price = item.unit_price_per_kg || 1850000;
                    const subtotal = item.subtotal || item.qty_kg * price;

                    return (
                      <tr key={idx} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {item.product_name}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                          {formatKg(item.qty_kg)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {isConfirmedOrLater ? (
                            formatIDR(price)
                          ) : (
                            <span className="text-amber-600 italic text-[11px]">Menunggu Admin</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {isConfirmedOrLater ? (
                            formatIDR(subtotal)
                          ) : (
                            <span className="text-amber-600 italic text-[11px]">Menunggu Admin</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50/80 border-t border-blue-200 font-bold">
                    <td colSpan={3} className="px-4 py-3 text-slate-700 text-right text-xs">
                      TOTAL TAGIHAN PESANAN:
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-blue-700">
                      {isConfirmedOrLater ? (
                        formatIDR(calculatedTotal)
                      ) : (
                        <span className="text-amber-600 font-sans text-xs italic">
                          Menunggu Konfirmasi Admin
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* OFFICIAL BANK ACCOUNT NUMBERS (NOMOR REKENING PEMBAYARAN RESMI) */}
          {isConfirmedOrLater && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-sm">
                    Nomor Rekening Resmi Pembayaran (PT Artaroma Fragrance Hub)
                  </h3>
                </div>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  TRANSFER BANK
                </span>
              </div>

              <p className="text-slate-600 text-xs">
                Silakan lakukan transfer pembayaran sebesar{' '}
                <strong className="text-blue-700 font-mono font-extrabold text-sm">
                  {formatIDR(calculatedTotal)}
                </strong>{' '}
                ke salah satu rekening resmi perusahaan di bawah ini:
              </p>

              {/* Bank Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {bankAccounts.map((acc, idx) => (
                  <div key={idx} className="bg-white border border-blue-200 rounded-xl p-3.5 shadow-sm space-y-1.5 relative">
                    <div className="flex justify-between items-center">
                      <span className={`text-white font-extrabold text-[10px] px-2 py-0.5 rounded ${
                        acc.bank.toUpperCase().includes('BCA') ? 'bg-blue-700' : acc.bank.toUpperCase().includes('MANDIRI') ? 'bg-amber-600' : 'bg-slate-700'
                      }`}>
                        {acc.bank.toUpperCase()}
                      </span>
                      {acc.jenis && <span className="text-[10px] text-gray-400">{acc.jenis}</span>}
                    </div>
                    <div className="font-mono font-extrabold text-slate-900 text-base tracking-wider flex items-center justify-between">
                      <span>{acc.no}</span>
                      <button
                        onClick={() => handleCopyAccount(acc.no.replace(/\-/g, ''), idx)}
                        className="text-xs font-sans text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 px-2 py-1 rounded flex items-center gap-1 font-semibold"
                      >
                        {copiedBank === String(idx) ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" /> Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Salin
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      a.n. <strong>{acc.atas_nama}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UPLOAD BUKTI TRANSFER FIELD & FORM */}
          {isConfirmedOrLater && (
            <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-sm">
                    Upload Bukti Transfer Pembayaran
                  </h3>
                </div>

                {isPaidOrLater ? (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> LUNAS / BUKTI TERVERIFIKASI
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> MENUNGGU UPLOAD BUKTI
                  </span>
                )}
              </div>

              {isPaidOrLater ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-emerald-900 text-xs">
                        Pembayaran Berhasil Dikonfirmasi & Verifikasi Lunas
                      </h4>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Bukti transfer telah diterima oleh tim Finance & pesanan diproses ke Gudang.
                      </p>
                    </div>
                  </div>

                  <a
                    href={invoice?.payment_proof_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60'}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white border border-emerald-300 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Lihat Resi Transfer
                  </a>
                </div>
              ) : (
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  {/* Additional info field */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Catatan Pengirim / Bank Asal (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Transfer via BCA Mobile a.n. Hendrik Wijaya"
                      value={senderBankInfo}
                      onChange={(e) => setSenderBankInfo(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* File Drag-and-Drop / Selector */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Upload File Resi Bukti Transfer (JPG, PNG, PDF) <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-6 text-center transition-colors relative cursor-pointer bg-gray-50/80">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {previewUrl ? (
                        <div className="space-y-2">
                          <img
                            src={previewUrl}
                            alt="Resi Transfer Preview"
                            className="max-h-40 mx-auto rounded-lg border border-gray-300 shadow-md"
                          />
                          <span className="text-xs text-blue-700 font-mono font-bold block">
                            ✓ {selectedFile?.name || 'File Resi Dipilih'}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto text-blue-600">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                          <div className="text-xs text-slate-700 font-bold">
                            Klik atau seret foto/file resi transfer di sini
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Format yang didukung: JPG, PNG, PDF (Maks. 5 MB)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 font-medium hover:bg-gray-50"
                    >
                      Tutup
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isUploading ? (
                        'Mengunggah Bukti Pembayaran...'
                      ) : (
                        <>
                          <Upload className="w-4 h-4" /> Kirim Bukti Transfer & Konfirmasi Pembayaran
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
