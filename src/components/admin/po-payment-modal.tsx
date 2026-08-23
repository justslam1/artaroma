'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PurchaseOrder, POPaymentRecord } from '@/lib/types';
import { formatIDR, formatDate, formatDateTime } from '@/lib/utils';
import {
  CreditCard,
  X,
  Send,
  Building2,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  ExternalLink,
  Upload,
  Eye,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';

interface POPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  onConfirmPayment: (
    poId: string,
    paidAmount: number,
    paymentDate: string,
    bankAccountId: string,
    bankName: string,
    referenceNo?: string,
    paymentNotes?: string,
    proofUrl?: string
  ) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function POPaymentModal({
  isOpen,
  onClose,
  po,
  onConfirmPayment,
  isSubmitting = false,
}: POPaymentModalProps) {
  const totalBill = Number(po?.total_amount || 0);
  const alreadyPaid = Number(po?.paid_amount || 0);
  const remainingBill = Math.max(0, totalBill - alreadyPaid);

  const [inputAmount, setInputAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [transferRef, setTransferRef] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedSourceBankId, setSelectedSourceBankId] = useState<string>('acc-bca');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch('/api/company-settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.bank_accounts) {
          setBankAccounts(json.data.bank_accounts);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (po) {
      const rem = Math.max(0, Number(po.total_amount || 0) - Number(po.paid_amount || 0));
      setInputAmount(rem > 0 ? rem.toString() : '0');
      setPaymentNotes(rem === totalBill ? 'Pelunasan Tagihan PO' : `Pembayaran Termin PO ${po.po_number}`);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setTransferRef(po.payment_reference_no || '');
      setProofUrl(po.payment_proof_url || '');
    }
  }, [po, totalBill]);

  if (!isOpen || !po) return null;

  const parsedInput = Math.max(0, parseFloat(inputAmount) || 0);
  const newAccumulatedPaid = Math.min(totalBill, alreadyPaid + parsedInput);
  const sisaSetelahBayar = Math.max(0, totalBill - newAccumulatedPaid);
  const isLunas = newAccumulatedPaid >= totalBill && totalBill > 0;
  const isPartial = parsedInput > 0 && !isLunas;
  const isAlreadyFullyPaid = remainingBill <= 0 && totalBill > 0;

  const handleQuickPreset = (type: 'FULL' | 'HALF' | 'QUARTER' | 'CLEAR') => {
    if (type === 'FULL') {
      setInputAmount(remainingBill.toString());
    } else if (type === 'HALF') {
      setInputAmount(Math.round(remainingBill / 2).toString());
    } else if (type === 'QUARTER') {
      setInputAmount(Math.round(remainingBill * 0.25).toString());
    } else {
      setInputAmount('0');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file bukti transfer maksimal 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedInput <= 0 && !isAlreadyFullyPaid) {
      alert('Masukkan nominal transfer pembayaran yang valid (minimal lebih dari Rp 0).');
      return;
    }
    if (!paymentDate) {
      alert('Silakan pilih tanggal pembayaran.');
      return;
    }

    const matchedBank = bankAccounts.find((b: any) => {
      const cleanBank = (b.bank || '').toLowerCase();
      if (selectedSourceBankId === 'acc-bca' && cleanBank.includes('bca')) return true;
      if (selectedSourceBankId === 'acc-mandiri' && cleanBank.includes('mandiri')) return true;
      if (selectedSourceBankId === 'acc-bni' && cleanBank.includes('bni')) return true;
      return false;
    });

    const bankName = matchedBank
      ? `${matchedBank.bank} - ${matchedBank.no} (${matchedBank.jenis || 'Rekening Operasional'})`
      : selectedSourceBankId === 'acc-mandiri'
      ? 'Bank Mandiri - 156-00-1928374-1 (Rekening Operasional)'
      : selectedSourceBankId === 'acc-bni'
      ? 'Bank BNI - 009-445-8876 (Rekening Operasional)'
      : 'Bank Central Asia (BCA) - 882-019-3881 (Rekening Operasional)';

    onConfirmPayment(
      po.id,
      parsedInput,
      paymentDate,
      selectedSourceBankId,
      bankName,
      transferRef,
      paymentNotes,
      proofUrl
    );
  };

  const paymentHistory: POPaymentRecord[] =
    Array.isArray(po.payment_history) && po.payment_history.length > 0
      ? po.payment_history
      : alreadyPaid > 0
      ? [
          {
            id: `hist-legacy-${po.id}`,
            payment_date: po.last_payment_date || po.order_date || '-',
            amount: alreadyPaid,
            remaining_after: remainingBill,
            bank_name: po.payment_bank_name || 'Bank Central Asia (BCA)',
            reference_no: po.payment_reference_no || '-',
            payment_proof_url: po.payment_proof_url,
            payment_notes: 'Pembayaran tagihan suplier tercatat',
            created_by: 'Staf Finance',
            created_at: po.order_date,
          },
        ]
      : [];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white border border-gray-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div
            className={`px-6 py-4 flex items-center justify-between text-white shrink-0 ${
              isAlreadyFullyPaid
                ? 'bg-gradient-to-r from-emerald-700 to-teal-800'
                : 'bg-gradient-to-r from-purple-800 to-indigo-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-purple-200" />
              <div>
                <h3 className="font-bold text-base">
                  {isAlreadyFullyPaid ? 'Detail & Riwayat Pembayaran Tagihan PO' : 'Input Pembayaran Tagihan Suplier PO'}
                </h3>
                <p className="text-xs text-purple-100">
                  {isAlreadyFullyPaid
                    ? 'Status tagihan LUNAS. Melihat riwayat cicilan & bukti transfer kas keluar'
                    : 'Mendukung pembayaran penuh maupun cicilan / parsial (termin) suplier'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-purple-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Lunas Banner if Fully Paid */}
            {isAlreadyFullyPaid && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs font-semibold shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div>Tagihan Suplier PO ini telah <strong>LUNAS PENUH</strong>.</div>
                    <div className="text-[11px] text-emerald-700 font-normal mt-0.5">
                      Pengeluaran dana tercatat resmi sebagai <strong>Bukti Kas Keluar (BKK)</strong> di Manajemen Kas.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/admin/finance/cash"
                    target="_blank"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                    title="Buka Halaman Manajemen Kas"
                  >
                    <span>Buku Kas</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shrink-0">
                    LUNAS
                  </span>
                </div>
              </div>
            )}

            {/* PO Summary Card */}
            <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-xl space-y-2 text-xs text-purple-950 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Ref PO:</span>
                <span className="font-mono font-bold text-purple-800">{po.po_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Distributor Suplier:</span>
                <span className="font-bold text-slate-800">{po.distributor_name}</span>
              </div>
              <div className="flex justify-between border-t border-purple-200/80 pt-1.5">
                <span className="text-slate-500 font-medium">Total Nilai Tagihan:</span>
                <span className="font-mono font-bold text-slate-900">{formatIDR(totalBill)}</span>
              </div>
              {alreadyPaid > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span className="font-medium">Sudah Dibayar Sebelumnya:</span>
                  <span className="font-mono font-bold">{formatIDR(alreadyPaid)}</span>
                </div>
              )}
              <div
                className={`flex justify-between border-t border-purple-200/80 pt-1.5 p-2 rounded-lg ${
                  isAlreadyFullyPaid ? 'bg-emerald-50 text-emerald-900' : 'bg-white border border-purple-200/60'
                }`}
              >
                <span className="font-bold">Sisa Hutang Saat Ini:</span>
                <span
                  className={`font-mono font-extrabold text-sm ${
                    isAlreadyFullyPaid ? 'text-emerald-700' : 'text-purple-900'
                  }`}
                >
                  {isAlreadyFullyPaid ? 'Rp 0 (LUNAS)' : formatIDR(remainingBill)}
                </span>
              </div>
            </div>

            {/* Riwayat Pembayaran Termin Sebelumnya */}
            {paymentHistory.length > 0 && (
              <div className="border border-purple-200 bg-purple-50/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-purple-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-purple-600" />
                    Riwayat Pembayaran Termin ({paymentHistory.length}x Transaksi)
                  </span>
                  <span className="text-[11px] text-purple-700 font-mono">
                    Total: {formatIDR(alreadyPaid || totalBill)}
                  </span>
                </div>
                <div className="divide-y divide-purple-100 bg-white rounded-lg border border-purple-200/70 overflow-hidden shadow-2xs">
                  {paymentHistory.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-2.5 flex items-center justify-between text-[11px] gap-2 hover:bg-purple-50/20 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                          <span className="text-purple-900">Termin #{idx + 1}:</span>
                          <span className="font-mono text-purple-800 font-extrabold">{formatIDR(item.amount)}</span>
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-bold text-[9px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Kas Keluar (BKK)
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 flex-wrap">
                          <span>
                            📅 Tgl: <strong className="text-slate-700">{item.payment_date || '-'}</strong>
                          </span>
                          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.2 rounded font-bold text-[9px]">
                            🏦 {item.bank_name || 'Bank Central Asia (BCA)'}
                          </span>
                          {item.reference_no && <span>• Ref: {item.reference_no}</span>}
                          {item.payment_notes && <span>• 📝 {item.payment_notes}</span>}
                          {item.created_by && <span>• 👤 {item.created_by}</span>}
                        </div>
                      </div>
                      {item.payment_proof_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewImageModal(item.payment_proof_url || null)}
                          className="text-purple-600 hover:text-purple-800 flex items-center gap-1 text-[10px] font-bold bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded-lg shrink-0 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Bukti
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Nominal Pembayaran (Hanya jika belum lunas) */}
            {!isAlreadyFullyPaid && (
              <>
                <div className="space-y-2 border border-purple-200 bg-purple-50/30 p-3.5 rounded-xl">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                      <span>Nominal Pembayaran Kali Ini (Rp)</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Mendukung cicilan / parsial</span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleQuickPreset('FULL')}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3" /> Pelunasan Sisa ({formatIDR(remainingBill)})
                    </button>
                    {remainingBill > 100000 && (
                      <button
                        type="button"
                        onClick={() => handleQuickPreset('HALF')}
                        className="px-2.5 py-1 bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 rounded-lg font-bold text-[10px] cursor-pointer transition-colors"
                      >
                        50% ({formatIDR(Math.round(remainingBill / 2))})
                      </button>
                    )}
                    {remainingBill > 500000 && (
                      <button
                        type="button"
                        onClick={() => handleQuickPreset('QUARTER')}
                        className="px-2.5 py-1 bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 rounded-lg font-bold text-[10px] cursor-pointer transition-colors"
                      >
                        25% ({formatIDR(Math.round(remainingBill * 0.25))})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleQuickPreset('CLEAR')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 rounded-lg font-medium text-[10px] cursor-pointer ml-auto"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Input field */}
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-slate-400 font-mono text-sm">Rp</span>
                    <input
                      type="number"
                      required
                      min={1}
                      max={remainingBill}
                      value={inputAmount}
                      onChange={(e) => setInputAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-white border-2 border-purple-400 focus:border-purple-600 rounded-xl pl-10 pr-4 py-2 font-mono font-black text-slate-900 text-base focus:outline-none shadow-xs"
                    />
                  </div>

                  {/* Realtime calculation banner */}
                  {parsedInput > 0 && (
                    <div
                      className={`p-3 rounded-lg border flex items-center justify-between text-xs font-semibold ${
                        isLunas
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-amber-50 border-amber-300 text-amber-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {isLunas ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600" />
                        )}
                        <span>
                          {isLunas ? 'Status setelah bayar: LUNAS' : `Status: DIBAYAR PARSIAL (Sisa ${formatIDR(sisaSetelahBayar)})`}
                        </span>
                      </div>
                      <span className="font-mono font-bold">
                        Akumulasi: {formatIDR(newAccumulatedPaid)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Rekening Bank Sumber */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Rekening Bank Sumber Pembayaran (Kas Keluar) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedSourceBankId}
                    onChange={(e) => setSelectedSourceBankId(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-purple-500"
                  >
                    {bankAccounts.length > 0 ? (
                      bankAccounts.map((b: any, idx: number) => {
                        const cleanBank = (b.bank || 'Bank').toLowerCase();
                        const accId = cleanBank.includes('bca')
                          ? 'acc-bca'
                          : cleanBank.includes('mandiri')
                          ? 'acc-mandiri'
                          : cleanBank.includes('bni')
                          ? 'acc-bni'
                          : `acc-bank-${idx}`;
                        return (
                          <option key={idx} value={accId}>
                            {b.bank} - {b.no} ({b.jenis || 'Rekening Operasional'})
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="acc-bca">Bank Central Asia (BCA) - 882-019-3881 (Rekening Operasional)</option>
                        <option value="acc-mandiri">Bank Mandiri - 156-00-1928374-1 (Rekening Operasional)</option>
                        <option value="acc-bni">Bank BNI - 009-445-8876 (Rekening Operasional)</option>
                      </>
                    )}
                  </select>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Dana kas keluar (BKK) akan otomatis memotong saldo rekening bank yang dipilih pada Manajemen Kas.
                  </span>
                </div>

                {/* Tanggal & Referensi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Tanggal Pembayaran <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs font-bold font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      No. Referensi / Bukti Transfer Bank
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: TRF-BCA-2026-990812"
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Catatan Pembayaran */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catatan Pembayaran (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pembayaran DP 50% / Pelunasan termin 2"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Upload Bukti Bayar */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Upload Bukti Transfer Bank (PDF / JPG / PNG)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="w-full text-xs text-slate-500 border border-gray-300 rounded-lg p-2 bg-gray-50 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                    />
                    {proofUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImageModal(proofUrl)}
                        className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Footer buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
              {!isAlreadyFullyPaid && (
                <button
                  type="submit"
                  disabled={isSubmitting || parsedInput <= 0}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting
                    ? 'Memproses...'
                    : `Konfirmasi Pembayaran (${formatIDR(parsedInput)})`}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImageModal && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-sm text-slate-800">Preview Bukti Transfer</h4>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50 rounded-xl p-2">
              <img
                src={previewImageModal}
                alt="Bukti Transfer"
                className="max-h-[65vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
