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
    setCategory(txType === 'IN' ? 'PENJUALAN_SO' : 'OPERASIONAL_KANTOR');
  }, [txType]);

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

    onSuccess({
      account_id: accountId,
      tx_type: txType,
      category,
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
                {isMasuk ? 'Penerimaan dana, piutang customer, atau tambahan modal' : 'Pengeluaran operasional, hutang suplier, atau biaya kantor'}
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
                  PIC: {selectedAccount.pic_name || 'Finance'} | Saldo: <span className="font-bold text-slate-700">{formatIDR(selectedAccount.current_balance)}</span>
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

          {/* Kategori Transaksi */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Kategori Transaksi <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CashCategory)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
              required
            >
              {isMasuk ? (
                <>
                  <option value="PENJUALAN_SO">Penjualan SO (Piutang Customer)</option>
                  <option value="TOPUP_KAS">Penerimaan Top-Up Kas</option>
                  <option value="SETOR_BALIK">Setor Balik Sisa Dana (Sales / Lapangan)</option>
                  <option value="MODAL_PEMILIK">Setoran Modal Pemilik / Investor</option>
                  <option value="LAINNYA">Penerimaan Lainnya</option>
                </>
              ) : (
                <>
                  <option value="OPERASIONAL_KANTOR">Operasional Kantor (Listrik, Wifi, Sewa, Maintenance)</option>
                  <option value="PETTY_CASH">Kas Kecil (Petty Cash - Galon, Konsumsi, ATK Mikro)</option>
                  <option value="SALES_OPS">Operasional Sales (BBM, Tol, Akomodasi Visit)</option>
                  <option value="PEMBELIAN_PO">Pembayaran PO Suplier (Hutang Dagang)</option>
                  <option value="GAJI_KARYAWAN">Gaji & Insentif Karyawan</option>
                  <option value="PAJAK">Pajak (PPN / PPh / Retribusi)</option>
                  <option value="LAINNYA">Pengeluaran Lainnya</option>
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
