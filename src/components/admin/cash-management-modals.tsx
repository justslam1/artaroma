'use client';

import React, { useState } from 'react';
import { CashAccount, CashCategory, CashTxType } from '@/lib/types';
import { formatIDR } from '@/lib/utils';
import {
  X,
  Upload,
  ArrowRight,
  CreditCard,
  Building2,
  Receipt,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  Image as ImageIcon,
  DollarSign,
  Car,
  Wallet,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';

/* =========================================================================
   1. RECORD TRANSACTION MODAL (Kas Masuk / Kas Keluar)
   ========================================================================= */

interface RecordTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  txType: 'IN' | 'OUT';
  accounts: CashAccount[];
  selectedAccountId?: string;
  onSuccess: (data: {
    account_id: string;
    tx_type: CashTxType;
    category: CashCategory;
    petty_sub_category?: 'KANTOR' | 'SALES';
    amount: number;
    date: string;
    recipient_or_payer: string;
    reference_number?: string;
    notes?: string;
    proof_url?: string;
    created_by?: string;
    status: 'VERIFIED' | 'DRAFT';
  }) => void;
}

export function RecordTransactionModal({
  isOpen,
  onClose,
  txType,
  accounts,
  selectedAccountId,
  onSuccess,
}: RecordTransactionModalProps) {
  const defaultAccId = selectedAccountId || (accounts.length > 0 ? accounts[0].id : '');

  const [accountId, setAccountId] = useState(defaultAccId);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [pettySubCategory, setPettySubCategory] = useState<'KANTOR' | 'SALES'>('KANTOR');
  const [category, setCategory] = useState<CashCategory>(
    txType === 'IN' ? 'PENJUALAN_SO' : 'OPERASIONAL_KANTOR'
  );
  const [amount, setAmount] = useState<string>('');
  const [recipientOrPayer, setRecipientOrPayer] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [proofUrl, setProofUrl] = useState<string | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  React.useEffect(() => {
    if (selectedAccountId) {
      setAccountId(selectedAccountId);
    } else if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [selectedAccountId, accounts]);

  React.useEffect(() => {
    const acc = accounts.find((a) => a.id === accountId);
    if (txType === 'IN') {
      setCategory('PENJUALAN_SO');
    } else {
      if (acc?.type === 'KAS_KECIL') {
        setCategory(pettySubCategory === 'KANTOR' ? 'OPERASIONAL_KANTOR' : 'SALES_OPS');
      } else {
        setCategory('PEMBELIAN_PO');
      }
    }
  }, [txType, accountId, accounts]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        setPreviewImage(res);
        setProofUrl(res);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
    if (numAmount <= 0) {
      alert('Nominal harus lebih dari 0.');
      return;
    }
    if (!recipientOrPayer.trim()) {
      alert('Nama pihak pembayar/penerima wajib diisi.');
      return;
    }

    const isPetty = selectedAccount?.type === 'KAS_KECIL';
    onSuccess({
      account_id: accountId,
      tx_type: txType,
      category,
      petty_sub_category: isPetty ? pettySubCategory : (category === 'SALES_OPS' ? 'SALES' : category === 'OPERASIONAL_KANTOR' ? 'KANTOR' : undefined),
      amount: numAmount,
      date,
      recipient_or_payer: recipientOrPayer.trim(),
      reference_number: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      proof_url: proofUrl,
      created_by: 'Staf Finance',
      status: 'VERIFIED',
    });

    onClose();
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isMasuk = txType === 'IN';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white ${
            isMasuk ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : 'bg-gradient-to-r from-rose-600 to-red-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {isMasuk ? 'Catat Kas Masuk (Bukti Kas Masuk / BKM)' : 'Catat Kas Keluar (Bukti Kas Keluar / BKK)'}
              </h3>
              <p className="text-[11px] text-white/80">
                {isMasuk ? 'Penerimaan dana order customer, transfer, atau tambahan modal' : 'Pengeluaran operasional kantor, salesmen, atau PO suplier'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Akun Kas & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Pilih Akun Kas <span className="text-red-500">*</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Saldo: {formatIDR(acc.current_balance)})
                  </option>
                ))}
              </select>
              {selectedAccount && (
                <div className="text-[10px] text-slate-500 mt-1 font-mono">
                  Tipe: <span className="font-bold text-blue-700">{selectedAccount.type.replace(/_/g, ' ')}</span> | Saldo: <span className="font-bold text-slate-700">{formatIDR(selectedAccount.current_balance)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Tanggal Transaksi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Special Helper for Kas Besar Tunai Customer */}
          {selectedAccount?.type === 'KAS_BESAR_TUNAI' && isMasuk && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-800 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block">Penerimaan Kas Besar Tunai (Brankas):</span>
                <span>Untuk pelunasan nota/invoice penjualan tunai dari customer langsung.</span>
              </div>
            </div>
          )}

          {/* Sub-Pos Kas Kecil Selector: Model 1 */}
          {selectedAccount?.type === 'KAS_KECIL' && !isMasuk && (
            <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-teal-600" /> Pos Pengeluaran Kas Kecil:
                </span>
                <span className="text-[10px] bg-teal-200/70 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                  Model 1: 1 Kas Kecil Terpadu
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPettySubCategory('KANTOR');
                    setCategory('OPERASIONAL_KANTOR');
                  }}
                  className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    pettySubCategory === 'KANTOR'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" /> 🏢 Pos Kas Kantor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPettySubCategory('SALES');
                    setCategory('SALES_OPS');
                  }}
                  className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    pettySubCategory === 'SALES'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" /> 🚗 Pos Kas Salesmen
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                {pettySubCategory === 'KANTOR'
                  ? '🏢 Pos Kantor: Listrik PLN, WiFi kantor, ATK, konsumsi, galon air, maintenance AC & perbaikan sarana.'
                  : '🚗 Pos Salesmen: Biaya lapangan salesmen (BBM kendaraan, tarif tol, parkir, konsumsi visit B2B, sampling aroma).'}
              </p>
            </div>
          )}

          {/* Kategori Transaksi */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Kategori Transaksi <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => {
                const val = e.target.value as CashCategory;
                setCategory(val);
                if (val === 'SALES_OPS') setPettySubCategory('SALES');
                if (val === 'OPERASIONAL_KANTOR' || val === 'PETTY_CASH') setPettySubCategory('KANTOR');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
              required
            >
              {isMasuk ? (
                <>
                  <option value="PENJUALAN_SO">Penjualan SO (Pelunasan Customer - Kas Besar)</option>
                  <option value="TOPUP_KAS">Penerimaan Top-Up Kas</option>
                  <option value="SETOR_BALIK">Setor Balik Sisa Dana (Sales / Lapangan)</option>
                  <option value="MODAL_PEMILIK">Setoran Modal Pemilik / Investor</option>
                  <option value="LAINNYA">Penerimaan Lainnya</option>
                </>
              ) : (
                <>
                  {selectedAccount?.type === 'KAS_KECIL' ? (
                    <>
                      <option value="OPERASIONAL_KANTOR">🏢 Pos Kantor (Listrik, Wifi, ATK, Galon, Maintenance)</option>
                      <option value="SALES_OPS">🚗 Pos Salesmen (BBM, Tol, Parkir, Visit B2B, Sampling)</option>
                      <option value="PETTY_CASH">Konsumsi & Pengeluaran Mikro Harian</option>
                      <option value="LAINNYA">Pengeluaran Kas Kecil Lainnya</option>
                    </>
                  ) : (
                    <>
                      <option value="PEMBELIAN_PO">Pembayaran PO Suplier (Hutang Dagang - Kas Besar)</option>
                      <option value="OPERASIONAL_KANTOR">Operasional Kantor (Listrik, Wifi, Sewa, Maintenance)</option>
                      <option value="SALES_OPS">Operasional Sales (BBM, Tol, Akomodasi Visit)</option>
                      <option value="GAJI_KARYAWAN">Gaji & Insentif Karyawan</option>
                      <option value="PAJAK">Pajak (PPN / PPh / Retribusi)</option>
                      <option value="LAINNYA">Pengeluaran Lainnya</option>
                    </>
                  )}
                </>
              )}
            </select>
          </div>

          {/* Nominal Rupiah */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Nominal Transaksi (IDR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-slate-500">Rp</span>
              <input
                type="number"
                min="1"
                step="1000"
                placeholder="Contoh: 1500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <p className="text-[11px] text-emerald-700 font-semibold font-mono mt-1">
                Terbaca: {formatIDR(Number(amount))}
              </p>
            )}
          </div>

          {/* Pihak Terkait & No Referensi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {isMasuk ? 'Diterima Dari (Payer)' : 'Dibayarkan Kepada (Payee)'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={isMasuk ? 'Contoh: PT Aroma Sukses' : 'Contoh: PLN Semarang / Staf GA'}
                value={recipientOrPayer}
                onChange={(e) => setRecipientOrPayer(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                No. Referensi / Dokumen
              </label>
              <input
                type="text"
                placeholder="Contoh: INV-001 / PO-0822 / NOTA-99"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Keterangan / Catatan */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Keterangan / Keperluan
            </label>
            <textarea
              rows={2}
              placeholder="Rincian atau keperluan transaksi..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Upload Bukti Struk / Nota */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Upload Foto Bukti Struk / Nota / Transfer (Opsional)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors text-center">
              {previewImage ? (
                <div className="space-y-2">
                  <img
                    src={previewImage}
                    alt="Preview Bukti"
                    className="max-h-32 mx-auto rounded-lg shadow-sm border border-slate-200 object-cover"
                  />
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImage(null);
                        setProofUrl(undefined);
                      }}
                      className="text-red-600 hover:text-red-800 font-bold text-[11px]"
                    >
                      Hapus Foto
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block py-2">
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <span className="text-[11px] font-semibold text-blue-600 hover:underline">
                    Pilih file gambar bukti nota/struk
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP (Maks 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-white font-bold shadow-md transition-all ${
                isMasuk
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
            >
              {isMasuk ? 'Simpan Kas Masuk (BKM)' : 'Simpan Kas Keluar (BKK)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   2. TRANSFER CASH MODAL (Inter-Account Transfer / Top-Up / Setor Balik)
   ========================================================================= */

interface TransferCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: CashAccount[];
  defaultFromId?: string;
  defaultToId?: string;
  onSuccess: (data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    category?: 'TOPUP_KAS' | 'SETOR_BALIK';
    notes?: string;
    proofUrl?: string;
    createdBy?: string;
  }) => void;
}

export function TransferCashModal({
  isOpen,
  onClose,
  accounts,
  defaultFromId,
  defaultToId,
  onSuccess,
}: TransferCashModalProps) {
  const [fromAccountId, setFromAccountId] = useState(defaultFromId || (accounts[0]?.id || ''));
  const [toAccountId, setToAccountId] = useState(
    defaultToId || (accounts.length > 1 ? accounts[1]?.id : accounts[0]?.id || '')
  );
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<'TOPUP_KAS' | 'SETOR_BALIK'>('TOPUP_KAS');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [proofUrl, setProofUrl] = useState<string | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  React.useEffect(() => {
    if (defaultFromId) setFromAccountId(defaultFromId);
    if (defaultToId) setToAccountId(defaultToId);
  }, [defaultFromId, defaultToId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        setPreviewImage(res);
        setProofUrl(res);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromAccountId === toAccountId) {
      alert('Akun asal dan akun tujuan tidak boleh sama.');
      return;
    }
    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
    if (numAmount <= 0) {
      alert('Nominal transfer harus lebih dari 0.');
      return;
    }

    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    if (fromAcc && fromAcc.current_balance < numAmount) {
      const proceed = confirm(
        `Peringatan: Saldo ${fromAcc.name} (${formatIDR(fromAcc.current_balance)}) kurang dari nominal transfer (${formatIDR(numAmount)}). Tetap lanjutkan?`
      );
      if (!proceed) return;
    }

    onSuccess({
      fromAccountId,
      toAccountId,
      amount: numAmount,
      date,
      category,
      notes: notes.trim() || undefined,
      proofUrl,
      createdBy: 'Finance Treasury',
    });

    onClose();
  };

  const fromAcc = accounts.find((a) => a.id === fromAccountId);
  const toAcc = accounts.find((a) => a.id === toAccountId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Transfer Dana Antar Kas & Rekening</h3>
              <p className="text-[11px] text-blue-100">
                Pengisian kas kantor, top-up kas kecil, kas sales, atau penyetoran kembali
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Quick Presets for Awam / Non-finance */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-2">
            <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Shortcut Transfer Paling Sering:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const bca = accounts.find((a) => a.type === 'KAS_BESAR_BANK') || accounts[0];
                  const petty = accounts.find((a) => a.type === 'KAS_KECIL');
                  if (bca && petty) {
                    setFromAccountId(bca.id);
                    setToAccountId(petty.id);
                    setCategory('TOPUP_KAS');
                    setNotes('Top-up saldo Kas Kecil operasional (kantor & salesmen)');
                  }
                }}
                className="text-left px-2.5 py-2 bg-white border border-blue-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg text-slate-700 font-semibold text-[11px] transition-all cursor-pointer shadow-xs"
              >
                <span className="font-bold text-blue-700 block">➔ Top-Up Kas Kecil</span>
                <span className="text-[10px] text-slate-500">Dari Kas Besar Bank BCA ke Kas Kecil</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const bca = accounts.find((a) => a.type === 'KAS_BESAR_BANK') || accounts[0];
                  const petty = accounts.find((a) => a.type === 'KAS_KECIL');
                  if (bca && petty) {
                    setFromAccountId(petty.id);
                    setToAccountId(bca.id);
                    setCategory('SETOR_BALIK');
                    setNotes('Penyetoran balik sisa saldo kas kecil ke rekening bank');
                  }
                }}
                className="text-left px-2.5 py-2 bg-white border border-blue-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg text-slate-700 font-semibold text-[11px] transition-all cursor-pointer shadow-xs"
              >
                <span className="font-bold text-indigo-700 block">➔ Setor Balik Kas Kecil</span>
                <span className="text-[10px] text-slate-500">Dari Kas Kecil ke Kas Besar Bank BCA</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const bca = accounts.find((a) => a.type === 'KAS_BESAR_BANK') || accounts[0];
                  const tunai = accounts.find((a) => a.type === 'KAS_BESAR_TUNAI');
                  if (bca && tunai) {
                    setFromAccountId(tunai.id);
                    setToAccountId(bca.id);
                    setCategory('SETOR_BALIK');
                    setNotes('Setor tunai brankas pembayaran customer ke rekening bank BCA');
                  }
                }}
                className="text-left px-2.5 py-2 bg-white border border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 rounded-lg text-slate-700 font-semibold text-[11px] transition-all cursor-pointer shadow-xs sm:col-span-2"
              >
                <span className="font-bold text-emerald-700 block">➔ Setor Kas Tunai Customer ke Bank</span>
                <span className="text-[10px] text-slate-500">Dari Kas Besar Tunai (Brankas Customer) ke Rekening Bank BCA/Mandiri</span>
              </button>
            </div>
          </div>

          {/* Visual Transfer Flow Indicator */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex-1 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Akun Sumber (Kredit)</span>
              <span className="font-bold text-slate-800 block truncate">{fromAcc?.name || 'Pilih Asal'}</span>
              <span className="font-mono text-[10px] text-slate-500 font-bold block">
                Saldo: {formatIDR(fromAcc?.current_balance || 0)}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black shrink-0">
              ➔
            </div>

            <div className="flex-1 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Akun Tujuan (Debit)</span>
              <span className="font-bold text-slate-800 block truncate">{toAcc?.name || 'Pilih Tujuan'}</span>
              <span className="font-mono text-[10px] text-slate-500 font-bold block">
                Saldo: {formatIDR(toAcc?.current_balance || 0)}
              </span>
            </div>
          </div>

          {/* Dropdown Akun Asal & Akun Tujuan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Dari Akun (Pengirim) <span className="text-red-500">*</span>
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatIDR(acc.current_balance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Ke Akun (Penerima) <span className="text-red-500">*</span>
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                    {acc.name} ({formatIDR(acc.current_balance)}) {acc.id === fromAccountId ? '(Sama)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tanggal & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Tanggal Transfer <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Tujuan / Tipe Transfer <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'TOPUP_KAS' | 'SETOR_BALIK')}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              >
                <option value="TOPUP_KAS">Top-Up / Pengisian Dana Kas Subordinat</option>
                <option value="SETOR_BALIK">Setor Balik Sisa Dana Kas ke Kas Besar</option>
              </select>
            </div>
          </div>

          {/* Nominal Transfer */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Nominal Transfer (IDR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-slate-500">Rp</span>
              <input
                type="number"
                min="1"
                step="10000"
                placeholder="Contoh: 3000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <p className="text-[11px] text-blue-700 font-semibold font-mono mt-1">
                Terbaca: {formatIDR(Number(amount))}
              </p>
            )}
          </div>

          {/* Catatan / Referensi */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Catatan / Keperluan Transfer
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Top-up saldo kas kecil periode akhir bulan / Dropping dana sales visit..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Upload Bukti Struk Transfer */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Upload Bukti Transfer / Resi (Opsional)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors text-center">
              {previewImage ? (
                <div className="space-y-2">
                  <img
                    src={previewImage}
                    alt="Preview Bukti Transfer"
                    className="max-h-32 mx-auto rounded-lg shadow-sm border border-slate-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImage(null);
                      setProofUrl(undefined);
                    }}
                    className="text-red-600 hover:text-red-800 font-bold text-[11px]"
                  >
                    Hapus Bukti
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block py-2">
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <span className="text-[11px] font-semibold text-blue-600 hover:underline">
                    Upload bukti transfer internal
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 transition-all"
            >
              Proses Transfer Antar Kas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   3. PROOF LIGHTBOX MODAL (Preview Gambar Bukti Nota / Transfer)
   ========================================================================= */

interface ProofLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  title?: string;
  referenceNumber?: string;
}

export function ProofLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  referenceNumber,
}: ProofLightboxModalProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-xs">{title || 'Lampiran Bukti Transaksi'}</span>
            {referenceNumber && (
              <span className="bg-slate-700 text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded">
                {referenceNumber}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Content */}
        <div className="p-4 flex-1 flex items-center justify-center bg-black/40 overflow-auto">
          <img
            src={imageUrl}
            alt="Bukti Transaksi"
            className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg border border-slate-800"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400 text-[11px]">PT Artaroma Jayatama - Treasury Audit Proof</span>
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors text-[11px]"
          >
            <Download className="w-3.5 h-3.5" /> Buka Tab Baru / Unduh
          </a>
        </div>
      </div>
    </div>
  );
}
