'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Invoice, InvoicePaymentRecord } from '@/lib/types';
import { formatIDR, formatDate } from '@/lib/utils';
import {
  X,
  CheckCircle,
  CheckCircle2,
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
  Building2,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
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
    paymentProofUrl?: string,
    targetAccountId?: string,
    targetBankName?: string
  ) => void;
  onVoidPayment?: (
    invoiceId: string,
    paymentRecordId: string,
    amount: number
  ) => Promise<void> | void;
}

export function VerifyPaymentModal({ isOpen, onClose, invoice, onVerify, onVoidPayment }: VerifyPaymentModalProps) {
  const totalBill = Number(invoice?.total_amount || 0);
  const alreadyPaid = Number(invoice?.paid_amount || 0);
  const remainingBill = Math.max(0, totalBill - alreadyPaid);

  const [inputAmount, setInputAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [financeProofUrl, setFinanceProofUrl] = useState<string>('');
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState<boolean>(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('acc-bca');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [voidTargetItem, setVoidTargetItem] = useState<any | null>(null);
  const [showSuperAdminRequiredModal, setShowSuperAdminRequiredModal] = useState<boolean>(false);
  const [showVoidConfirmModal, setShowVoidConfirmModal] = useState<boolean>(false);
  const [isVoiding, setIsVoiding] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch(() => {});

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
    if (invoice) {
      const rem = Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
      setInputAmount(rem.toString());
      setPaymentNotes(invoice.payment_notes || '');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setFinanceProofUrl(invoice.payment_proof_url || '');
      setShowPaymentConfirm(false);
      setShowVoidConfirmModal(false);
      setShowSuperAdminRequiredModal(false);
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

  const getSelectedBankDisplayName = () => {
    const matchedBank = bankAccounts.find((b: any) => {
      const cleanBank = (b.bank || '').toLowerCase();
      if (selectedBankId === 'acc-bca' && cleanBank.includes('bca')) return true;
      if (selectedBankId === 'acc-mandiri' && cleanBank.includes('mandiri')) return true;
      if (selectedBankId === 'acc-bni' && cleanBank.includes('bni')) return true;
      return false;
    });
    return matchedBank
      ? `${matchedBank.bank} - ${matchedBank.no} (${matchedBank.holder || 'PT Artaroma Jayatama'})`
      : selectedBankId === 'acc-mandiri'
      ? 'Bank Mandiri - 156-00-1928374-1 (PT Artaroma Jayatama)'
      : selectedBankId === 'acc-bni'
      ? 'Bank BNI - 009-445-8876 (PT Artaroma Jayatama)'
      : 'Bank Central Asia (BCA) - 882-019-3881 (PT Artaroma Jayatama)';
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

    // Munculkan dialog konfirmasi sebelum memproses (baik lunas maupun sebagian)
    setShowPaymentConfirm(true);
  };

  const executeVerify = () => {
    const bankName = getSelectedBankDisplayName();

    onVerify(
      invoice.id,
      'VERIFIED',
      parsedInput,
      paymentNotes,
      paymentDate,
      financeProofUrl,
      selectedBankId,
      bankName
    );
    setShowPaymentConfirm(false);
    onClose();
  };

  const handleInitiateVoidPayment = (item: any) => {
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    if (!isSuperAdmin) {
      setVoidTargetItem(item);
      setShowSuperAdminRequiredModal(true);
      return;
    }
    setVoidTargetItem(item);
    setShowVoidConfirmModal(true);
  };

  const handleExecuteVoidPayment = async () => {
    if (!voidTargetItem || !onVoidPayment || !invoice) return;
    try {
      setIsVoiding(true);
      await onVoidPayment(invoice.id, voidTargetItem.id || `hist-${invoice.id}`, voidTargetItem.amount);
      setShowVoidConfirmModal(false);
      setVoidTargetItem(null);
    } catch (err: any) {
      alert('Gagal membatalkan transaksi penerimaan pembayaran: ' + (err?.message || 'Terjadi kesalahan.'));
    } finally {
      setIsVoiding(false);
    }
  };

  const isAlreadyPaid = invoice.status === 'PAID' || remainingBill <= 0;

  const paymentHistory: InvoicePaymentRecord[] =
    Array.isArray(invoice.payment_history) && invoice.payment_history.length > 0
      ? invoice.payment_history
      : invoice.status === 'PAID' || Number(invoice.paid_amount || 0) > 0
      ? [
          {
            id: `hist-${invoice.id}`,
            payment_date: invoice.last_payment_date || invoice.issue_date || '-',
            amount: Number(invoice.paid_amount || invoice.total_amount || 0),
            remaining_after: 0,
            payment_proof_url: invoice.payment_proof_url,
            payment_notes: invoice.payment_notes || 'Pelunasan invoice terverifikasi',
            verified_by: 'Staf Finance',
            created_at: invoice.issue_date,
          },
        ]
      : [];

  const handleSaveProofUpdate = () => {
    onVerify(invoice.id, 'VERIFIED', 0, paymentNotes, paymentDate, financeProofUrl);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white border border-gray-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className={`px-6 py-4 flex items-center justify-between text-white shrink-0 ${
            isAlreadyPaid
              ? 'bg-gradient-to-r from-emerald-700 to-teal-800'
              : 'bg-gradient-to-r from-blue-700 to-indigo-800'
          }`}>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-200" />
              <div>
                <h3 className="font-bold text-base">
                  {isAlreadyPaid ? 'Detail & Riwayat Pembayaran (Lunas)' : 'Verifikasi & Pencatatan Pembayaran'}
                </h3>
                <p className="text-xs text-blue-100">
                  {isAlreadyPaid
                    ? 'Melihat riwayat transaksi cicilan, tanggal bayar, & bukti transfer'
                    : 'Input tanggal bayar, nominal transfer, & upload bukti transfer finance'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-blue-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Lunas Banner for Paid Invoices */}
            {isAlreadyPaid && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs font-semibold shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div>Tagihan ini telah terverifikasi <strong>LUNAS PENUH</strong>.</div>
                    <div className="text-[11px] text-emerald-700 font-normal mt-0.5">
                      Penerimaan dana telah otomatis dibukukan sebagai <strong>Bukti Kas Masuk (BKM)</strong> di Manajemen Kas.
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
                    PAID
                  </span>
                </div>
              </div>
            )}

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
                  <span className="font-medium">Total Telah Dibayar:</span>
                  <span className="font-mono font-bold">{formatIDR(alreadyPaid)}</span>
                </div>
              )}
              <div className={`flex justify-between border-t border-slate-200/80 pt-1.5 p-2 rounded-lg ${
                isAlreadyPaid ? 'bg-emerald-50/70 text-emerald-900' : 'bg-blue-50/50'
              }`}>
                <span className="font-bold">Sisa Tagihan:</span>
                <span className={`font-mono font-extrabold text-sm ${isAlreadyPaid ? 'text-emerald-700' : 'text-blue-700'}`}>
                  {isAlreadyPaid ? 'Rp 0 (LUNAS)' : formatIDR(remainingBill)}
                </span>
              </div>
            </div>

            {/* Riwayat Pembayaran Sebelumnya (Ledger History) */}
            {paymentHistory.length > 0 && (
              <div className="border border-purple-200 bg-purple-50/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-purple-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-purple-600" />
                    Riwayat Pembayaran ({paymentHistory.length}x Pembayaran)
                  </span>
                  <span className="text-[11px] text-purple-700 font-mono">
                    Total: {formatIDR(alreadyPaid || totalBill)}
                  </span>
                </div>
                <div className="divide-y divide-purple-100 bg-white rounded-lg border border-purple-200/70 overflow-hidden shadow-2xs">
                  {paymentHistory.map((item, idx) => (
                    <div key={item.id || idx} className="p-2.5 flex items-center justify-between text-[11px] gap-2 hover:bg-purple-50/20 transition-colors">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                          <span className="text-purple-900">Bayar #{idx + 1}:</span>
                          <span className="font-mono text-emerald-700 font-extrabold">{formatIDR(item.amount)}</span>
                          <span className="bg-emerald-100/90 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-bold text-[9px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Tercatat di Kas Besar (BKM)
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 flex-wrap">
                          <span>📅 Tgl: <strong className="text-slate-700">{item.payment_date || '-'}</strong></span>
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-bold text-[9px]">
                            🏦 {item.bank_name || 'Bank BCA Operasional (019-3881)'}
                          </span>
                          {item.payment_notes && <span>• 📝 {item.payment_notes}</span>}
                          {item.verified_by && <span>• 👤 {item.verified_by}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.payment_proof_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewImageModal(item.payment_proof_url || null)}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-800 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> Bukti
                          </button>
                        )}
                        {onVoidPayment && (
                          <button
                            type="button"
                            onClick={() => handleInitiateVoidPayment(item)}
                            className="text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Batalkan / Koreksi transaksi penerimaan ini (Diperlukan Persetujuan Super Admin)"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" /> Batalkan
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

            {/* Input Form for unpaid balance (Only if remainingBill > 0) */}
            {!isAlreadyPaid && (
              <>
                {/* Rekening Bank Penerima */}
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Rekening Bank Penerima Dana <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none shadow-2xs"
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
                            {b.bank} - {b.no} ({b.atas_nama || 'PT Artaroma Jayatama'})
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="acc-bca">Bank Central Asia (BCA) - 882-019-3881</option>
                        <option value="acc-mandiri">Bank Mandiri - 156-00-1928374-1</option>
                        <option value="acc-bni">Bank BNI - 009-445-8876</option>
                      </>
                    )}
                  </select>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Dana kas masuk (BKM) akan otomatis dicatat ke buku kas rekening bank yang dipilih di atas.
                  </span>
                </div>

                {/* Input Tanggal & Nominal Pembayaran Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                {/* Catatan Pembayaran */}
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
              </>
            )}

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
                    <Upload className="w-3.5 h-3.5" /> {financeProofUrl ? 'Ganti Bukti Transfer' : 'Upload Bukti (Staf Finance)'}
                  </button>
                </div>
              </div>

              {/* Image Preview Box */}
              {financeProofUrl ? (
                <div className="relative bg-white border border-slate-200 rounded-xl p-2 text-center group">
                  <img
                    src={financeProofUrl}
                    alt="Bukti Transfer"
                    className="max-h-48 rounded-lg mx-auto object-contain cursor-pointer hover:opacity-90 transition-opacity shadow-2xs"
                    onClick={() => setPreviewImageModal(financeProofUrl)}
                  />
                  <div className="flex items-center justify-center gap-3 mt-2 pt-1.5 border-t border-slate-100">
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
                  Belum ada bukti transfer terlampir. Staf Finance atau Customer dapat mengunggah bukti pembayaran di atas.
                </div>
              )}
            </div>
          </div>

          {/* Actions Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0 flex-wrap">
            {isAlreadyPaid ? (
              <>
                {financeProofUrl !== invoice.payment_proof_url && (
                  <button
                    type="button"
                    onClick={handleSaveProofUpdate}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" /> Simpan Pembaruan Bukti Transfer
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Tutup &amp; Selesai
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal before marking as LUNAS or Partial Payment */}
      {showPaymentConfirm && (
        <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`bg-white border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150 ${
            isLunas ? 'border-emerald-300' : 'border-blue-300'
          }`}>
            <div className="flex items-start gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                isLunas
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-blue-100 text-blue-700 border-blue-200'
              }`}>
                {isLunas ? <CheckCircle2 className="w-6 h-6" /> : <Calculator className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-slate-800">
                  {isLunas ? 'Konfirmasi Status "Lunas Penuh"' : 'Konfirmasi Pembayaran Sebagian (Termin)'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {isLunas ? (
                    <>
                      Apakah Anda yakin ingin memverifikasi pembayaran ini dan mengubah status invoice menjadi{' '}
                      <strong className="text-emerald-700 font-bold">LUNAS PENUH</strong>?
                    </>
                  ) : (
                    <>
                      Apakah Anda yakin ingin mencatat pembayaran sebagian sebesar{' '}
                      <strong className="text-blue-700 font-bold">{formatIDR(parsedInput)}</strong> untuk tagihan ini?
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Summary Details Box */}
            <div className={`border rounded-xl p-3.5 space-y-2 text-xs ${
              isLunas ? 'bg-emerald-50/70 border-emerald-200' : 'bg-blue-50/70 border-blue-200'
            }`}>
              <div className="flex justify-between items-center text-slate-600">
                <span>No. Invoice:</span>
                <span className="font-bold font-mono text-blue-700">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Customer B2B:</span>
                <span className="font-bold text-slate-800 truncate max-w-[200px]">{invoice.customer_name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Nilai Tagihan:</span>
                <span className="font-mono font-semibold text-slate-700">{formatIDR(totalBill)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 border-t border-slate-200/80 pt-1.5">
                <span>{isLunas ? 'Nominal Pelunasan:' : 'Nominal Transfer Masuk:'}</span>
                <span className={`font-bold font-mono text-sm ${isLunas ? 'text-emerald-700' : 'text-blue-700'}`}>
                  {formatIDR(parsedInput)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Sisa Piutang Setelah Bayar:</span>
                <span className={`font-mono font-bold ${sisaSetelahBayar === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {formatIDR(sisaSetelahBayar)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Status Tagihan:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  isLunas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isLunas ? '✓ LUNAS PENUH (PAID)' : '⏳ SEBAGIAN (PARTIAL)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 border-t border-slate-200/80 pt-1.5">
                <span>Rekening Penerima:</span>
                <span className="font-semibold text-slate-700 text-right truncate max-w-[200px]">
                  {getSelectedBankDisplayName()}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Tanggal Pembayaran:</span>
                <span className="font-semibold text-slate-700">{formatDate(paymentDate)}</span>
              </div>
            </div>

            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Penerimaan dana ini akan otomatis dicatat sebagai <strong>Bukti Kas Masuk (BKM)</strong> pada Manajemen Kas dan menambah saldo rekening terkait.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal / Cek Kembali
              </button>
              <button
                type="button"
                onClick={executeVerify}
                className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                  isLunas ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                {isLunas ? 'Ya, Set Jadi Lunas' : 'Ya, Konfirmasi Pembayaran'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Required Notice Modal */}
      {showSuperAdminRequiredModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                <ShieldAlert className="w-6 h-6 text-rose-600 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800">
                  Persetujuan Super Admin Diperlukan
                </h3>
                <p className="text-xs text-rose-600 font-semibold">
                  Akses Dibatasi (Hanya untuk Super Admin)
                </p>
              </div>
            </div>

            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-4 space-y-2 text-xs text-rose-950">
              <p className="leading-relaxed">
                Pembatalan transaksi penerimaan kas masuk (BKM) dan pemulihan status piutang Invoice/SO merupakan aksi finansial kritis yang <strong>hanya dapat disetujui & diproses oleh akun Super Admin</strong>.
              </p>
              {voidTargetItem && (
                <div className="bg-white rounded-lg p-2.5 border border-rose-200 space-y-1 font-mono text-[11px] mt-2">
                  <div className="text-slate-600 font-sans font-bold">Rincian Transaksi:</div>
                  <div>• Nominal: <strong className="text-rose-700">{formatIDR(voidTargetItem.amount)}</strong></div>
                  <div>• Rekening: {voidTargetItem.bank_name || '-'}</div>
                  <div>• Tanggal: {formatDate(voidTargetItem.payment_date)}</div>
                </div>
              )}
              <p className="text-[11px] text-slate-600 pt-1">
                Silakan hubungi <strong>Super Admin</strong> untuk membatalkan atau merevisi transaksi penerimaan ini.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuperAdminRequiredModal(false);
                  setVoidTargetItem(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs transition-colors cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Void Confirmation Modal */}
      {showVoidConfirmModal && voidTargetItem && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-300">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800">
                  Batalkan Penerimaan Pembayaran (Super Admin)
                </h3>
                <p className="text-xs text-slate-500">
                  Koreksi & Rollback Transaksi Kas Masuk (BKM)
                </p>
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-rose-200/60">
                <span className="text-slate-600">No. Invoice:</span>
                <span className="font-mono font-bold text-slate-800">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-rose-200/60">
                <span className="text-slate-600">Customer:</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">{invoice.customer_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-rose-200/60">
                <span className="text-slate-600">Nominal Dibatalkan:</span>
                <span className="font-mono font-extrabold text-rose-700 text-sm">{formatIDR(voidTargetItem.amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-rose-200/60">
                <span className="text-slate-600">Rekening Kas:</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]">{voidTargetItem.bank_name || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-rose-200/60">
                <span className="text-slate-600">Tanggal Bayar:</span>
                <span className="font-medium text-slate-700">{formatDate(voidTargetItem.payment_date)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-600">Status Sisa Tagihan:</span>
                <span className="font-mono font-bold text-amber-700">
                  Akan dipulihkan (+{formatIDR(voidTargetItem.amount)})
                </span>
              </div>
            </div>

            <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>
                <strong>Dampak Tindakan:</strong> Transaksi penerimaan kas masuk (BKM) terkait akan dibatalkan, saldo kas rekening bank akan dipotong kembali, dan status Invoice/SO dikembalikan ke belum lunas/sebagian.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowVoidConfirmModal(false);
                  setVoidTargetItem(null);
                }}
                disabled={isVoiding}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                ↩ Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteVoidPayment}
                disabled={isVoiding}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {isVoiding ? 'Membatalkan...' : 'Ya, Batalkan Transaksi Ini'}
              </button>
            </div>
          </div>
        </div>
      )}

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
