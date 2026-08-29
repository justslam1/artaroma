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
  Trash2,
  ShieldAlert,
  Undo2,
  Lock,
  KeyRound,
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
  onVoidPayment?: (
    poId: string,
    paymentRecordId: string,
    amount: number
  ) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function POPaymentModal({
  isOpen,
  onClose,
  po,
  onConfirmPayment,
  onVoidPayment,
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
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [voidTargetItem, setVoidTargetItem] = useState<POPaymentRecord | null>(null);
  const [showSuperAdminRequiredModal, setShowSuperAdminRequiredModal] = useState<boolean>(false);
  const [showVoidConfirmModal, setShowVoidConfirmModal] = useState<boolean>(false);
  const [isVoiding, setIsVoiding] = useState<boolean>(false);

  // On-the-spot Super Admin authorization state
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [isAuthorizingSuperAdmin, setIsAuthorizingSuperAdmin] = useState(false);
  const [superAdminAuthError, setSuperAdminAuthError] = useState('');

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
    if (po) {
      const rem = Math.max(0, Number(po.total_amount || 0) - Number(po.paid_amount || 0));
      setInputAmount(rem > 0 ? rem.toString() : '0');
      setPaymentNotes(rem === totalBill ? 'Pelunasan Tagihan PO' : `Pembayaran Termin PO ${po.po_number}`);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setTransferRef(po.payment_reference_no || '');
      setProofUrl(po.payment_proof_url || '');
      setShowConfirmModal(false);
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
    // Open confirmation step to allow user to re-check or cancel before submitting
    setShowConfirmModal(true);
  };

  const executeConfirmPayment = () => {
    setShowConfirmModal(false);
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

  const handleInitiateVoidPayment = (item: POPaymentRecord) => {
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
    if (!voidTargetItem || !onVoidPayment || !po) return;
    try {
      setIsVoiding(true);
      await onVoidPayment(po.id, voidTargetItem.id || `hist-legacy-${po.id}`, voidTargetItem.amount);
      setShowVoidConfirmModal(false);
      setVoidTargetItem(null);
    } catch (err: any) {
      alert('Gagal membatalkan transaksi pembayaran: ' + (err?.message || 'Terjadi kesalahan.'));
    } finally {
      setIsVoiding(false);
    }
  };

  const handleAuthorizeSuperAdminOnSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminEmail.trim() || !superAdminPassword) {
      setSuperAdminAuthError('Email/Username dan Password Super Admin wajib diisi.');
      return;
    }
    setIsAuthorizingSuperAdmin(true);
    setSuperAdminAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: superAdminEmail.trim(), password: superAdminPassword }),
      });
      const json = await res.json();
      if (json.success && (json.user?.is_super_admin || json.user?.role === 'SUPER_ADMIN')) {
        setSuperAdminAuthError('');
        setShowSuperAdminRequiredModal(false);
        setShowVoidConfirmModal(true);
      } else if (json.success && !(json.user?.is_super_admin || json.user?.role === 'SUPER_ADMIN')) {
        setSuperAdminAuthError('Akun yang dimasukkan bukan akun berlevel Super Admin.');
      } else {
        setSuperAdminAuthError(json.message || 'Kredensial Super Admin tidak valid.');
      }
    } catch (err: any) {
      setSuperAdminAuthError('Gagal memverifikasi Super Admin: ' + err.message);
    } finally {
      setIsAuthorizingSuperAdmin(false);
    }
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
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.payment_proof_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewImageModal(item.payment_proof_url || null)}
                            className="text-purple-600 hover:text-purple-800 flex items-center gap-1 text-[10px] font-bold bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded-lg shrink-0 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> Bukti
                          </button>
                        )}
                        {onVoidPayment && (
                          <button
                            type="button"
                            onClick={() => handleInitiateVoidPayment(item)}
                            className="text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Batalkan / Koreksi transaksi pembayaran ini (Diperlukan Persetujuan Super Admin)"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" /> Batalkan
                          </button>
                        )}
                      </div>
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

      {/* Confirmation Modal before committing payment */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className={`p-2.5 rounded-xl ${isLunas ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                {isLunas ? <CheckCircle2 className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800">
                  {isLunas ? 'Konfirmasi Pelunasan PO' : 'Konfirmasi Pembayaran PO'}
                </h3>
                <p className="text-xs text-slate-500">
                  Periksa kembali rincian transaksi sebelum disimpan ke Buku Kas.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs border border-slate-200/80">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">No. Purchase Order:</span>
                <span className="font-mono font-bold text-slate-800">{po.po_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Suplier / Vendor:</span>
                <span className="font-bold text-slate-800 text-right">{po.distributor_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Jenis Pembayaran:</span>
                <span className={`font-extrabold ${isLunas ? 'text-emerald-700' : 'text-purple-700'}`}>
                  {isLunas ? '✓ PELUNASAN PENUH' : '• TERMIN / CICILAN'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Nominal yang Dibayarkan:</span>
                <span className="font-mono font-extrabold text-emerald-700 text-sm">{formatIDR(parsedInput)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Rekening Kas Keluar (BKK):</span>
                <span className="font-semibold text-slate-800 text-right max-w-[200px] truncate">
                  {selectedSourceBankId === 'acc-mandiri'
                    ? 'Mandiri (156-00-1928374-1)'
                    : selectedSourceBankId === 'acc-bni'
                    ? 'BNI (009-445-8876)'
                    : 'BCA (882-019-3881)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Tanggal Bayar:</span>
                <span className="font-medium text-slate-700">{formatDate(paymentDate)}</span>
              </div>
              {transferRef && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">No. Referensi:</span>
                  <span className="font-mono font-bold text-slate-700">{transferRef}</span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Sisa Hutang Setelah Bayar:</span>
                <span className={`font-mono font-extrabold ${sisaSetelahBayar === 0 ? 'text-emerald-600' : 'text-amber-700'}`}>
                  {formatIDR(sisaSetelahBayar)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Pengeluaran dana ini akan otomatis dicatat sebagai <strong>Bukti Kas Keluar (BKK)</strong> pada Manajemen Kas dan memotong saldo kas bank terkait.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                ↩ Batal / Cek Ulang
              </button>
              <button
                type="button"
                onClick={executeConfirmPayment}
                disabled={isSubmitting}
                className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                  isLunas ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-700 hover:bg-purple-800'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                {isSubmitting ? 'Memproses...' : isLunas ? '✓ Ya, Proses Pelunasan' : '✓ Ya, Proses Pembayaran'}
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
                Pembatalan transaksi pembayaran kas keluar (BKK) dan pemulihan status hutang PO merupakan aksi finansial kritis yang <strong>hanya dapat disetujui & diproses oleh akun Super Admin</strong>.
              </p>
              {voidTargetItem && (
                <div className="bg-white rounded-lg p-2.5 border border-rose-200 space-y-1 font-mono text-[11px] mt-2">
                  <div className="text-slate-600 font-sans font-bold">Rincian Transaksi:</div>
                  <div>• Nominal: <strong className="text-rose-700">{formatIDR(voidTargetItem.amount)}</strong></div>
                  <div>• Rekening: {voidTargetItem.bank_name || '-'}</div>
                  <div>• Tanggal: {formatDate(voidTargetItem.payment_date)}</div>
                </div>
              )}
            </div>

            {/* Otorisasi On-The-Spot Super Admin */}
            <form onSubmit={handleAuthorizeSuperAdminOnSpot} className="space-y-3 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                <span>Otorisasi di Tempat (Super Admin):</span>
              </div>
              <div className="space-y-2">
                <div>
                  <input
                    type="text"
                    placeholder="Email / Username Super Admin"
                    value={superAdminEmail}
                    onChange={(e) => setSuperAdminEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Password Super Admin"
                    value={superAdminPassword}
                    onChange={(e) => setSuperAdminPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white"
                  />
                </div>
                {superAdminAuthError && (
                  <p className="text-[11px] text-red-600 font-semibold">{superAdminAuthError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuperAdminRequiredModal(false);
                    setVoidTargetItem(null);
                    setSuperAdminEmail('');
                    setSuperAdminPassword('');
                    setSuperAdminAuthError('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  ✕ Batal
                </button>
                <button
                  type="submit"
                  disabled={isAuthorizingSuperAdmin}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {isAuthorizingSuperAdmin ? 'Memverifikasi...' : '🔑 Otorisasi & Lanjutkan'}
                </button>
              </div>
            </form>
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
                  Batalkan Pembayaran PO (Super Admin)
                </h3>
                <p className="text-xs text-slate-500">
                  Koreksi & Rollback Transaksi Kas Keluar
                </p>
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-rose-200/60">
                <span className="text-slate-600">No. PO:</span>
                <span className="font-mono font-bold text-slate-800">{po.po_number}</span>
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
                <span className="text-slate-600">Status Sisa Hutang:</span>
                <span className="font-mono font-bold text-amber-700">
                  Akan dipulihkan (+{formatIDR(voidTargetItem.amount)})
                </span>
              </div>
            </div>

            <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>
                <strong>Dampak Tindakan:</strong> Transaksi pengeluaran kas (BKK) terkait akan dibatalkan, saldo kas rekening bank akan dipulihkan, dan status PO dikembalikan ke belum lunas/sebagian.
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
