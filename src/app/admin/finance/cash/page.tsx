'use client';

import React, { useState, useEffect } from 'react';
import { AdminTopNav } from '@/components/navigation/admin-topnav';
import {
  CashAccount,
  CashTransaction,
  CashTxType,
  CashCategory,
} from '@/lib/types';
import {
  getStoredCashAccounts,
  saveStoredCashAccounts,
  getStoredCashTransactions,
  saveStoredCashTransactions,
  recordCashTransaction,
  transferCashBetweenAccounts,
  deleteCashTransaction,
  syncBankAccountsFromMaster,
  syncCashTransactionsFromOrders,
  recalculateBalances,
} from '@/lib/cash-store';
import { formatIDR, formatDate } from '@/lib/utils';
import { exportCashLedgerToXLSX } from '@/lib/export-excel';
import {
  RecordTransactionModal,
  TransferCashModal,
  ProofLightboxModal,
} from '@/components/admin/cash-management-modals';
import {
  Wallet,
  Building2,
  Receipt,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Plus,
  Minus,
  FileSpreadsheet,
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  ExternalLink,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  RotateCcw,
  Landmark,
  PiggyBank,
  Briefcase,
  AlertCircle,
  ShoppingBag,
  Car,
} from 'lucide-react';

export default function CashManagementPage() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [selectedTab, setSelectedTab] = useState<string>('ALL'); // 'ALL' | 'KAS_BESAR' | 'KAS_KECIL' | specific account.id
  const [selectedSubFilter, setSelectedSubFilter] = useState<'ALL' | 'KANTOR' | 'SALES' | 'BANK' | 'TUNAI'>('ALL');
  const [selectedTxType, setSelectedTxType] = useState<string>('ALL'); // 'ALL' | 'IN' | 'OUT' | 'TRANSFER'
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordTxType, setRecordTxType] = useState<'IN' | 'OUT'>('IN');
  const [modalAccountId, setModalAccountId] = useState<string | undefined>(undefined);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState<string | undefined>(undefined);
  const [transferToId, setTransferToId] = useState<string | undefined>(undefined);

  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    imageUrl?: string;
    title?: string;
    referenceNumber?: string;
  }>({ isOpen: false });

  const isSyncingRef = React.useRef(false);

  // Load Data with Master Data Bank sync & Database Order payment sync
  const loadData = async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsLoading(true);
    try {
      let masterBanks: any[] = [];
      let purchaseOrders: any[] = [];
      let salesOrders: any[] = [];

      try {
        const [settingsRes, poRes, soRes] = await Promise.all([
          fetch('/api/company-settings', { cache: 'no-store' }),
          fetch('/api/purchase-orders', { cache: 'no-store' }),
          fetch('/api/sales-orders', { cache: 'no-store' }),
        ]);

        if (settingsRes.ok) {
          const sJson = await settingsRes.json();
          if (sJson.success && sJson.data?.bank_accounts) {
            masterBanks = sJson.data.bank_accounts;
          }
        }

        if (poRes.ok) {
          const pJson = await poRes.json();
          if (pJson.success && Array.isArray(pJson.data)) {
            purchaseOrders = pJson.data;
          }
        }

        if (soRes.ok) {
          const sJson = await soRes.json();
          if (sJson.success && Array.isArray(sJson.data)) {
            salesOrders = sJson.data;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch data for cash page:', err);
      }

      // 1. Sync live bank accounts
      let accs = syncBankAccountsFromMaster(masterBanks);

      // 2. Auto-sync Cash Transactions from Restored POs & Sales Orders
      const storedTxs = getStoredCashTransactions();
      const allTxs = syncCashTransactionsFromOrders(purchaseOrders, salesOrders, [], storedTxs);
      saveStoredCashTransactions(allTxs, true);

      // 3. Recalculate account balances
      accs = recalculateBalances(accs, allTxs);
      saveStoredCashAccounts(accs, true);

      setAccounts(accs);
      setTransactions(allTxs);
    } finally {
      setIsLoading(false);
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      if (!isSyncingRef.current) {
        loadData();
      }
    };
    window.addEventListener('artaroma_cash_updated', handleUpdate);
    window.addEventListener('artaroma_company_settings_updated', handleUpdate);
    return () => {
      window.removeEventListener('artaroma_cash_updated', handleUpdate);
      window.removeEventListener('artaroma_company_settings_updated', handleUpdate);
    };
  }, []);

  // Handlers for transactions
  const handleCreateTransaction = (data: any) => {
    recordCashTransaction(data);
    loadData();
  };

  const handleTransferCash = (data: any) => {
    transferCashBetweenAccounts(data);
    loadData();
  };



  const handleDeleteTransaction = (tx: CashTransaction) => {
    const isTransfer = tx.tx_type === 'TRANSFER' || Boolean(tx.transfer_pair_id);
    const confirmMsg = isTransfer
      ? `Hapus transaksi transfer ${tx.tx_number}? Mutasi pasangan pada akun terkait juga akan otomatis dihapus.`
      : `Apakah Anda yakin ingin menghapus transaksi ${tx.tx_number} (${formatIDR(tx.amount)})?`;

    if (confirm(confirmMsg)) {
      deleteCashTransaction(tx.id);
      loadData();
    }
  };

  // Calculations
  const totalAllBalance = accounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);

  const kasBesarBankAccounts = accounts.filter((a) => a.type === 'KAS_BESAR_BANK');
  const kasBesarTunaiAccounts = accounts.filter((a) => a.type === 'KAS_BESAR_TUNAI');
  const kasKecilAccounts = accounts.filter(
    (a) => a.type === 'KAS_KECIL' || a.id === 'acc-petty' || a.type === 'KAS_KANTOR' || a.type === 'KAS_SALES'
  );

  const totalKasBesarBank = kasBesarBankAccounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);
  const totalKasBesarTunai = kasBesarTunaiAccounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);
  const totalKasBesar = totalKasBesarBank + totalKasBesarTunai;

  const totalKasKecil = kasKecilAccounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);

  // Calculate current month expenses for Kas Kecil breakdown (Pos Kantor vs Pos Salesmen)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthTransactions = transactions.filter((t) => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const pettyKantorMonth = currentMonthTransactions
    .filter((t) => {
      const isOut = t.tx_type === 'OUT';
      const isPettyAcc = kasKecilAccounts.some((a) => a.id === t.account_id);
      const isKantorCategory =
        t.category === 'OPERASIONAL_KANTOR' || t.category === 'PETTY_CASH' || t.petty_sub_category === 'KANTOR';
      return isOut && (isPettyAcc || isKantorCategory);
    })
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const pettySalesMonth = currentMonthTransactions
    .filter((t) => {
      const isOut = t.tx_type === 'OUT';
      const isPettyAcc = kasKecilAccounts.some((a) => a.id === t.account_id);
      const isSalesCategory = t.category === 'SALES_OPS' || t.petty_sub_category === 'SALES';
      return isOut && (isPettyAcc || isSalesCategory);
    })
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Filter Transactions
  const filteredTransactions = transactions.filter((t) => {
    // 1. Account / Tab Filter
    if (selectedTab !== 'ALL') {
      if (selectedTab === 'KAS_BESAR') {
        const acc = accounts.find((a) => a.id === t.account_id);
        if (!acc || (acc.type !== 'KAS_BESAR_BANK' && acc.type !== 'KAS_BESAR_TUNAI')) return false;
        if (selectedSubFilter === 'BANK' && acc.type !== 'KAS_BESAR_BANK') return false;
        if (selectedSubFilter === 'TUNAI' && acc.type !== 'KAS_BESAR_TUNAI') return false;
      } else if (selectedTab === 'KAS_KECIL') {
        const acc = accounts.find((a) => a.id === t.account_id);
        const isPettyAcc =
          acc?.type === 'KAS_KECIL' ||
          t.account_id === 'acc-petty' ||
          acc?.type === 'KAS_KANTOR' ||
          acc?.type === 'KAS_SALES';
        if (!isPettyAcc) return false;

        if (selectedSubFilter === 'KANTOR') {
          const isKantor =
            t.category === 'OPERASIONAL_KANTOR' || t.category === 'PETTY_CASH' || t.petty_sub_category === 'KANTOR';
          if (!isKantor) return false;
        } else if (selectedSubFilter === 'SALES') {
          const isSales = t.category === 'SALES_OPS' || t.petty_sub_category === 'SALES';
          if (!isSales) return false;
        }
      } else {
        // Specific account ID
        if (t.account_id !== selectedTab) return false;
      }
    }

    // 2. Tx Type Filter
    if (selectedTxType !== 'ALL' && t.tx_type !== selectedTxType) return false;

    // 3. Category Filter
    if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;

    // 4. Date Filter
    if (dateFilter !== 'ALL') {
      const txDate = new Date(t.date);
      const today = new Date();
      if (dateFilter === 'TODAY') {
        if (txDate.toDateString() !== today.toDateString()) return false;
      } else if (dateFilter === 'WEEK') {
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (txDate < oneWeekAgo) return false;
      } else if (dateFilter === 'MONTH') {
        if (txDate.getMonth() !== today.getMonth() || txDate.getFullYear() !== today.getFullYear()) {
          return false;
        }
      }
    }

    // 5. Search Term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNumber = t.tx_number.toLowerCase().includes(q);
      const matchAcc = t.account_name.toLowerCase().includes(q);
      const matchPayer = (t.recipient_or_payer || '').toLowerCase().includes(q);
      const matchRef = (t.reference_number || '').toLowerCase().includes(q);
      const matchNotes = (t.notes || '').toLowerCase().includes(q);
      if (!matchNumber && !matchAcc && !matchPayer && !matchRef && !matchNotes) return false;
    }

    return true;
  });

  // Table summary calculations
  const tableTotalIn = filteredTransactions
    .filter((t) => t.tx_type === 'IN')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const tableTotalOut = filteredTransactions
    .filter((t) => t.tx_type === 'OUT' || t.tx_type === 'TRANSFER')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const tableNetCashflow = tableTotalIn - tableTotalOut;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <AdminTopNav />

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-700/20">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  Manajemen Kas & Bank
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Kas Besar (Penerimaan Customer & Suplier) & Kas Kecil (Operasional Kantor & Sales Lapangan)
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setRecordTxType('IN');
                setModalAccountId(selectedTab !== 'ALL' && !selectedTab.startsWith('KAS_') ? selectedTab : undefined);
                setIsRecordModalOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Catat Bukti Kas Masuk"
            >
              <Plus className="w-4 h-4" /> Catat Kas Masuk (BKM)
            </button>

            <button
              onClick={() => {
                setRecordTxType('OUT');
                setModalAccountId(selectedTab !== 'ALL' && !selectedTab.startsWith('KAS_') ? selectedTab : undefined);
                setIsRecordModalOpen(true);
              }}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Catat Bukti Kas Keluar"
            >
              <Minus className="w-4 h-4" /> Catat Kas Keluar (BKK)
            </button>

            <button
              onClick={() => {
                setTransferFromId(undefined);
                setTransferToId(undefined);
                setIsTransferModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Transfer Antar Rekening / Top Up Kas Kecil"
            >
              <ArrowRightLeft className="w-4 h-4" /> Transfer / Top-Up Kas
            </button>

            <button
              onClick={() => exportCashLedgerToXLSX(filteredTransactions, accounts)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Ekspor Buku Kas ke File Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" /> Ekspor Buku Kas (XLSX)
            </button>
          </div>
        </div>

        {/* 1. TOP CARDS: SIMPLIFIED 3 CARDS (KAS BESAR & KAS KECIL - MODEL 1) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: TOTAL KAS & BANK */}
          <div
            onClick={() => {
              setSelectedTab('ALL');
              setSelectedSubFilter('ALL');
            }}
            className={`bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col justify-between relative overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
              selectedTab === 'ALL' ? 'ring-2 ring-blue-400' : ''
            }`}
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
            <div>
              <div className="flex items-center justify-between text-blue-300">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Kas & Bank Perusahaan</span>
                <Landmark className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-black font-mono mt-2 tracking-tight text-white">
                {formatIDR(totalAllBalance)}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-200">
              <span>Kas Besar + Kas Kecil</span>
              <span className="font-bold text-emerald-400">● {accounts.length} Akun Aktif</span>
            </div>
          </div>

          {/* Card 2: KAS BESAR (BANK & TUNAI CUSTOMER) */}
          <div
            onClick={() => {
              setSelectedTab('KAS_BESAR');
              setSelectedSubFilter('ALL');
            }}
            className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
              selectedTab === 'KAS_BESAR' ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Pilar 1: Kas Besar
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-800 mt-2">
                {formatIDR(totalKasBesar)}
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md border border-blue-200">
                  🏦 Bank: {formatIDR(totalKasBesarBank)}
                </span>
                <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                  💵 Tunai Customer: {formatIDR(totalKasBesarTunai)}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span>Pelunasan Customer & PO Suplier</span>
              <span className="font-bold text-blue-600">Filter Kas Besar ➔</span>
            </div>
          </div>

          {/* Card 3: KAS KECIL OPERASIONAL (KANTOR & SALESMEN) */}
          <div
            onClick={() => {
              setSelectedTab('KAS_KECIL');
              setSelectedSubFilter('ALL');
            }}
            className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
              selectedTab === 'KAS_KECIL' ? 'border-teal-500 ring-2 ring-teal-100 bg-teal-50/20' : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Pilar 2: Kas Kecil Operasional
                  </span>
                  <span className="text-[9px] bg-teal-100 text-teal-800 font-extrabold px-1.5 py-0.5 rounded">
                    Model 1
                  </span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <PiggyBank className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-teal-900 mt-2">
                {formatIDR(totalKasKecil)}
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                <span className="bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-md border border-purple-200" title="Total pengeluaran Pos Kantor bulan ini">
                  🏢 Pos Kantor: {formatIDR(pettyKantorMonth)}
                </span>
                <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md border border-indigo-200" title="Total pengeluaran Pos Salesmen bulan ini">
                  🚗 Pos Sales: {formatIDR(pettySalesMonth)}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span>Dana Operasional Kantor & Sales</span>
              <span className="font-bold text-teal-600">Filter Kas Kecil ➔</span>
            </div>
          </div>
        </div>

        {/* 2. REKENING & DOMPET KAS GRID (KAS BESAR & KAS KECIL) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                Rincian Akun Kas & Rekening Bank Artaroma:
              </h3>
              <p className="text-[11px] text-slate-500">
                Pilih akun di bawah untuk memfilter transaksi pada buku kas
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTab('ALL');
                setSelectedSubFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                selectedTab === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-blue-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Lihat Semua Akun ({accounts.length})
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* GRUP 1: KAS BESAR (Bank & Tunai Customer) - 8 cols */}
            <div className="lg:col-span-8 bg-blue-50/30 border border-blue-100 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  Kas Besar (Bank Transfer & Brankas Tunai Customer)
                </span>
                <span className="font-mono text-xs font-bold text-blue-700">
                  Total: {formatIDR(totalKasBesar)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {accounts
                  .filter((a) => a.type === 'KAS_BESAR_BANK' || a.type === 'KAS_BESAR_TUNAI')
                  .map((acc) => {
                    const isSelected = selectedTab === acc.id;
                    const isTunai = acc.type === 'KAS_BESAR_TUNAI';
                    return (
                      <div
                        key={acc.id}
                        onClick={() => {
                          setSelectedTab(acc.id);
                          setSelectedSubFilter('ALL');
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-500 bg-white ring-2 ring-blue-300 shadow-sm'
                            : 'border-blue-200/60 bg-white/80 hover:bg-white hover:border-blue-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600">
                              {isTunai ? '💵 Tunai Customer' : `🏦 ${acc.bank_name || 'Bank'}`}
                            </span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-xs mt-1 truncate" title={acc.name}>
                            {acc.name}
                          </h4>
                          {acc.account_number && (
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              {acc.account_number}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <span className="text-xs font-black font-mono text-slate-800 block truncate">
                            {formatIDR(acc.current_balance)}
                          </span>
                          <span className="text-[9px] text-slate-400 block truncate">
                            PIC: {acc.pic_name || 'Finance'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* GRUP 2: KAS KECIL OPERASIONAL (KANTOR & SALES) - 4 cols */}
            <div className="lg:col-span-4 bg-teal-50/40 border border-teal-200/80 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
                    <PiggyBank className="w-3.5 h-3.5 text-teal-600" />
                    Kas Kecil Operasional
                  </span>
                  <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                    Model 1
                  </span>
                </div>
                {accounts
                  .filter((a) => a.type === 'KAS_KECIL' || a.id === 'acc-petty')
                  .slice(0, 1)
                  .map((acc) => {
                    const isSelected = selectedTab === acc.id || selectedTab === 'KAS_KECIL';
                    return (
                      <div
                        key={acc.id}
                        onClick={() => {
                          setSelectedTab('KAS_KECIL');
                          setSelectedSubFilter('ALL');
                        }}
                        className={`mt-2 p-3 rounded-xl border transition-all cursor-pointer bg-white ${
                          isSelected
                            ? 'border-teal-500 ring-2 ring-teal-300 shadow-sm'
                            : 'border-teal-200 hover:border-teal-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-teal-700">
                            💼 1 Dompet Terpadu
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-xs mt-1">
                          {acc.name}
                        </h4>
                        <div className="text-base font-black font-mono text-teal-900 mt-1">
                          {formatIDR(acc.current_balance)}
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-purple-50 text-purple-800 p-1.5 rounded-lg border border-purple-100">
                            <span className="font-bold block">🏢 Pos Kantor</span>
                            <span className="font-mono text-[9px] text-purple-600">Listrik, Wifi, ATK</span>
                          </div>
                          <div className="bg-indigo-50 text-indigo-800 p-1.5 rounded-lg border border-indigo-100">
                            <span className="font-bold block">🚗 Pos Salesmen</span>
                            <span className="font-mono text-[9px] text-indigo-600">BBM, Tol, Sampling</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. FILTER & SEARCH CONTROLS BAR */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            {/* Primary Account Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
              {[
                { id: 'ALL', label: 'Semua Kas' },
                { id: 'KAS_BESAR', label: '🏦 Kas Besar (Bank & Tunai)' },
                { id: 'KAS_KECIL', label: '💼 Kas Kecil (Kantor & Sales)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedTab(tab.id);
                    setSelectedSubFilter('ALL');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                    selectedTab === tab.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari no. bukti, invoice, suplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>
          </div>

          {/* Sub-Filters: Pos Kas Kecil Toggles or Kas Besar Toggles */}
          {(selectedTab === 'KAS_KECIL' || selectedTab === 'KAS_BESAR') && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1">
                Sub-Pos Filter:
              </span>
              {selectedTab === 'KAS_KECIL' ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedSubFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      selectedSubFilter === 'ALL'
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Semua Pos Kas Kecil
                  </button>
                  <button
                    onClick={() => setSelectedSubFilter('KANTOR')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1 ${
                      selectedSubFilter === 'KANTOR'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-slate-50 text-purple-700 border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> 🏢 Pos Kas Kantor
                  </button>
                  <button
                    onClick={() => setSelectedSubFilter('SALES')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1 ${
                      selectedSubFilter === 'SALES'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" /> 🚗 Pos Kas Salesmen
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedSubFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      selectedSubFilter === 'ALL'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Semua Kas Besar
                  </button>
                  <button
                    onClick={() => setSelectedSubFilter('BANK')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1 ${
                      selectedSubFilter === 'BANK'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-blue-700 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> 🏦 Rekening Bank
                  </button>
                  <button
                    onClick={() => setSelectedSubFilter('TUNAI')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1 ${
                      selectedSubFilter === 'TUNAI'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    💵 Kas Tunai Customer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sub-Filters: Tx Type, Category, & Date Filter */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>

            {/* Tx Type Filter */}
            <select
              value={selectedTxType}
              onChange={(e) => setSelectedTxType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-semibold focus:outline-none focus:border-blue-400"
            >
              <option value="ALL">Semua Jenis Mutasi</option>
              <option value="IN">Kas Masuk (Debit)</option>
              <option value="OUT">Kas Keluar (Kredit)</option>
              <option value="TRANSFER">Transfer Antar Kas</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-semibold focus:outline-none focus:border-blue-400"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="PENJUALAN_SO">Penjualan SO (Customer - Kas Besar)</option>
              <option value="PEMBELIAN_PO">Pembelian PO (Suplier - Kas Besar)</option>
              <option value="OPERASIONAL_KANTOR">🏢 Pos Kantor (Listrik/WiFi/ATK - Kas Kecil)</option>
              <option value="SALES_OPS">🚗 Pos Salesmen (BBM/Tol/Visit - Kas Kecil)</option>
              <option value="PETTY_CASH">Konsumsi & Mikro Harian</option>
              <option value="TOPUP_KAS">Top-Up Kas Kecil</option>
              <option value="SETOR_BALIK">Setor Balik Sisa Kas</option>
              <option value="GAJI_KARYAWAN">Gaji Karyawan</option>
              <option value="PAJAK">Pajak Perusahaan</option>
              <option value="MODAL_PEMILIK">Modal Pemilik</option>
              <option value="LAINNYA">Lainnya</option>
            </select>

            {/* Date Quick Filter */}
            <div className="flex items-center gap-1 ml-auto">
              {[
                { id: 'ALL', label: 'Semua Waktu' },
                { id: 'TODAY', label: 'Hari Ini' },
                { id: 'WEEK', label: '7 Hari' },
                { id: 'MONTH', label: 'Bulan Ini' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDateFilter(d.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                    dateFilter === d.id
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. MUTATION LEDGER TABLE (BUKU KAS UTAMA) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                Buku Kas & Jurnal Mutasi Harian
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Menampilkan {filteredTransactions.length} transaksi mutasi kas tercatat
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                + Masuk: {formatIDR(tableTotalIn)}
              </span>
              <span className="text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                - Keluar: {formatIDR(tableTotalOut)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">No. Bukti / Tgl</th>
                  <th className="px-4 py-3">Akun Kas</th>
                  <th className="px-4 py-3">Kategori & Tipe</th>
                  <th className="px-4 py-3">Pihak Terkait & Referensi</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 text-right">Masuk (Debit)</th>
                  <th className="px-4 py-3 text-right">Keluar (Kredit)</th>
                  <th className="px-4 py-3 text-right">Saldo Akhir</th>
                  <th className="px-4 py-3 text-center">Bukti</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <div className="font-bold text-slate-600 text-sm">Belum Ada Transaksi Kas</div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Klik tombol "Catat Kas Masuk", "Catat Kas Keluar", atau "Transfer Antar Kas" di atas.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isMasuk = tx.tx_type === 'IN';
                    const isTransfer = tx.tx_type === 'TRANSFER';
                    const isKeluar = tx.tx_type === 'OUT';

                    return (
                      <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors">
                        {/* No. Bukti & Tanggal */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono font-bold text-blue-700 block">{tx.tx_number}</span>
                          <span className="text-[10px] text-slate-400 block">{formatDate(tx.date)}</span>
                        </td>

                        {/* Akun Kas */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold text-slate-800 block truncate max-w-[170px]">
                            {tx.account_name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {tx.petty_sub_category === 'KANTOR' || tx.category === 'OPERASIONAL_KANTOR' ? (
                              <span className="bg-purple-100 text-purple-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-purple-200">
                                🏢 Pos Kantor
                              </span>
                            ) : tx.petty_sub_category === 'SALES' || tx.category === 'SALES_OPS' ? (
                              <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-indigo-200">
                                🚗 Pos Salesmen
                              </span>
                            ) : null}
                            <span className="text-[10px] text-slate-400">Oleh: {tx.created_by || '-'}</span>
                          </div>
                        </td>

                        {/* Kategori & Tipe */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            {isMasuk ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <ArrowDownLeft className="w-3 h-3" /> KAS MASUK
                              </span>
                            ) : isTransfer ? (
                              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <ArrowRightLeft className="w-3 h-3" /> TRANSFER
                              </span>
                            ) : (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" /> KAS KELUAR
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-slate-600">
                              {tx.category.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>

                        {/* Pihak Terkait & No Referensi */}
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 block truncate max-w-[180px]">
                            {tx.recipient_or_payer || '-'}
                          </span>
                          {tx.reference_number && (
                            <span className="font-mono text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.2 rounded block mt-0.5 truncate max-w-[180px]">
                              Ref: {tx.reference_number}
                            </span>
                          )}
                        </td>

                        {/* Keterangan */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-[11px] text-slate-600 line-clamp-2" title={tx.notes || '-'}>
                            {tx.notes || '-'}
                          </p>
                        </td>

                        {/* Masuk (Debit) */}
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
                          {isMasuk ? (
                            <span className="font-bold text-emerald-600">+{formatIDR(tx.amount)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Keluar (Kredit) */}
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
                          {isKeluar || isTransfer ? (
                            <span className="font-bold text-rose-600">-{formatIDR(tx.amount)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Saldo Akhir */}
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-bold text-slate-800">
                          {formatIDR(tx.balance_after)}
                        </td>

                        {/* Bukti Lampiran */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {tx.proof_url ? (
                            <button
                              onClick={() =>
                                setLightboxData({
                                  isOpen: true,
                                  imageUrl: tx.proof_url,
                                  title: `Bukti ${tx.tx_number}`,
                                  referenceNumber: tx.reference_number,
                                })
                              }
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                              title="Lihat Bukti Lampiran Nota/Transfer"
                            >
                              <Eye className="w-3 h-3" /> Lihat Bukti
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-300">-</span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteTransaction(tx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Net Cash Flow */}
          <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">
              Ringkasan Mutasi Aktif ({filteredTransactions.length} Data)
            </span>
            <div className="flex items-center gap-4 font-mono font-bold">
              <span className="text-slate-700">
                Net Arus Kas:{' '}
                <span className={tableNetCashflow >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  {tableNetCashflow >= 0 ? `+${formatIDR(tableNetCashflow)}` : formatIDR(tableNetCashflow)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}
      <RecordTransactionModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        txType={recordTxType}
        accounts={accounts}
        selectedAccountId={modalAccountId}
        onSuccess={handleCreateTransaction}
      />

      <TransferCashModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        accounts={accounts}
        defaultFromId={transferFromId}
        defaultToId={transferToId}
        onSuccess={handleTransferCash}
      />

      <ProofLightboxModal
        isOpen={lightboxData.isOpen}
        onClose={() => setLightboxData({ isOpen: false })}
        imageUrl={lightboxData.imageUrl}
        title={lightboxData.title}
        referenceNumber={lightboxData.referenceNumber}
      />
    </div>
  );
}
