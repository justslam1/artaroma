import { CashAccount, CashTransaction, Invoice, PurchaseOrder, SalesOrder } from './types';

export const INITIAL_CASH_ACCOUNTS: CashAccount[] = [
  {
    id: 'acc-bca',
    name: 'BCA Operasional (019-3881)',
    type: 'KAS_BESAR_BANK',
    account_number: '882-019-3881',
    bank_name: 'Bank Central Asia (BCA)',
    holder_name: 'PT Artaroma Jayatama',
    initial_balance: 0,
    current_balance: 0,
    pic_name: 'Finance Treasury',
    description: 'Rekening penerimaan utama tagihan invoice customer & pembayaran suplier',
    badge_color: 'bg-blue-600',
    is_active: true,
  },
  {
    id: 'acc-mandiri',
    name: 'Mandiri Giro (1928-1)',
    type: 'KAS_BESAR_BANK',
    account_number: '156-00-1928374-1',
    bank_name: 'Bank Mandiri',
    holder_name: 'PT Artaroma Jayatama',
    initial_balance: 0,
    current_balance: 0,
    pic_name: 'Finance Treasury',
    description: 'Rekening giro penampungan transaksi B2B & pajak',
    badge_color: 'bg-amber-600',
    is_active: true,
  },
  {
    id: 'acc-pusat',
    name: 'Kas Tunai Pusat',
    type: 'KAS_BESAR_TUNAI',
    initial_balance: 0,
    current_balance: 0,
    pic_name: 'Head of Finance',
    description: 'Brankas kas tunai utama kantor pusat Artaroma',
    badge_color: 'bg-emerald-700',
    is_active: true,
  },
  {
    id: 'acc-kantor',
    name: 'Kas Operasional Kantor',
    type: 'KAS_KANTOR',
    initial_balance: 0,
    current_balance: 0,
    pic_name: 'General Affair (GA)',
    description: 'Biaya rutin bulanan listrik PLN, WiFi kantor, maintenance AC, & perbaikan sarana',
    badge_color: 'bg-purple-600',
    is_active: true,
  },
  {
    id: 'acc-petty',
    name: 'Kas Kecil (Petty Cash)',
    type: 'KAS_KECIL',
    initial_balance: 0,
    current_balance: 0,
    pic_name: 'Staf Finance Kasir',
    description: 'Pengeluaran mikro harian (< Rp 500rb): konsumsi, galon air, kurir darurat, & parkir',
    badge_color: 'bg-teal-600',
    is_active: true,
  },
  {
    id: 'acc-sales',
    name: 'Kas Operasional Sales',
    type: 'KAS_SALES',
    initial_balance: 0,
    current_balance: 0,
    pic_name: 'Tim Sales B2B',
    description: 'Dana jalan visit customer, BBM, akomodasi luar kota, & sampling aroma',
    badge_color: 'bg-indigo-600',
    is_active: true,
  },
];

export const INITIAL_CASH_TRANSACTIONS: CashTransaction[] = [];

const STORAGE_KEY_ACCOUNTS = 'artaroma_cash_accounts_v2';
const STORAGE_KEY_TXS = 'artaroma_cash_transactions_v2';

// Auto-clean legacy v1 cache in user browser
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('artaroma_cash_accounts_v1');
    localStorage.removeItem('artaroma_cash_transactions_v1');
  } catch (_) {}
}

export function getStoredCashAccounts(): CashAccount[] {
  if (typeof window === 'undefined') return INITIAL_CASH_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(INITIAL_CASH_ACCOUNTS));
      return INITIAL_CASH_ACCOUNTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading cash accounts:', e);
    return INITIAL_CASH_ACCOUNTS;
  }
}

export function saveStoredCashAccounts(accounts: CashAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    window.dispatchEvent(new Event('artaroma_cash_updated'));
  } catch (e) {
    console.error('Error saving cash accounts:', e);
  }
}

export function getStoredCashTransactions(): CashTransaction[] {
  if (typeof window === 'undefined') return INITIAL_CASH_TRANSACTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TXS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TXS, JSON.stringify(INITIAL_CASH_TRANSACTIONS));
      return INITIAL_CASH_TRANSACTIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading cash transactions:', e);
    return INITIAL_CASH_TRANSACTIONS;
  }
}

export function saveStoredCashTransactions(txs: CashTransaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TXS, JSON.stringify(txs));
    window.dispatchEvent(new Event('artaroma_cash_updated'));
  } catch (e) {
    console.error('Error saving cash transactions:', e);
  }
}

/**
 * Sync bank accounts from Master Data (company_settings bank_accounts)
 */
export function syncBankAccountsFromMaster(masterBanks: any[]): CashAccount[] {
  if (!Array.isArray(masterBanks) || masterBanks.length === 0) {
    return getStoredCashAccounts();
  }

  const existingAccounts = getStoredCashAccounts();
  const txs = getStoredCashTransactions();

  // Keep non-bank accounts (Kas Tunai Pusat, Kas Kantor, Kas Kecil, Kas Sales)
  const nonBankAccounts = existingAccounts.filter((a) => a.type !== 'KAS_BESAR_BANK');

  // Convert master banks to CashAccount
  const bankAccounts: CashAccount[] = masterBanks.map((mb, idx) => {
    const cleanNo = (mb.no || '').replace(/[^0-9]/g, '');
    const cleanBank = (mb.bank || 'Bank').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const id = cleanBank.includes('bca')
      ? 'acc-bca'
      : cleanBank.includes('mandiri')
      ? 'acc-mandiri'
      : cleanBank.includes('bni')
      ? 'acc-bni'
      : `acc-bank-${cleanBank}-${cleanNo.slice(-4) || idx}`;

    // Find existing account to preserve initial_balance or id
    const existing = existingAccounts.find(
      (a) => a.id === id || a.account_number === mb.no || (a.bank_name && a.bank_name.toLowerCase().includes(cleanBank))
    );

    const initBal = existing ? Number(existing.initial_balance) || 0 : 0;

    return {
      id: existing ? existing.id : id,
      name: `${mb.bank} (${mb.no})`,
      type: 'KAS_BESAR_BANK' as const,
      account_number: mb.no,
      bank_name: mb.bank,
      holder_name: mb.atas_nama || 'PT Artaroma Jayatama',
      initial_balance: initBal,
      current_balance: initBal,
      pic_name: 'Finance Treasury',
      description: mb.jenis || 'Rekening Operasional Bank Master Data',
      badge_color: cleanBank.includes('bca') ? 'bg-blue-600' : cleanBank.includes('mandiri') ? 'bg-amber-600' : cleanBank.includes('bni') ? 'bg-orange-600' : 'bg-emerald-600',
      is_active: true,
    };
  });

  const merged = [...bankAccounts, ...nonBankAccounts];
  const recalculated = recalculateBalances(merged, txs);

  saveStoredCashAccounts(recalculated);
  return recalculated;
}

/**
 * Recalculates current_balance for all cash accounts based on transactions
 */
export function recalculateBalances(
  accounts: CashAccount[],
  transactions: CashTransaction[]
): CashAccount[] {
  return accounts.map((acc) => {
    const accTxs = transactions
      .filter((t) => t.account_id === acc.id && t.status === 'VERIFIED')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = Number(acc.initial_balance) || 0;
    accTxs.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.tx_type === 'IN') {
        balance += amt;
      } else if (t.tx_type === 'OUT' || t.tx_type === 'TRANSFER') {
        balance -= amt;
      }
    });

    return {
      ...acc,
      current_balance: balance,
    };
  });
}

/**
 * Automatically sync cash ledger transactions from database Purchase Orders & Invoices payments
 */
export function syncCashTransactionsFromOrders(
  purchaseOrders: any[] = [],
  invoices: any[] = [],
  existingTxs: CashTransaction[] = []
): CashTransaction[] {
  const txMap = new Map<string, CashTransaction>();

  // 1. Keep existing manual transactions (e.g. transfers, manual operational expenses)
  for (const tx of existingTxs) {
    if (tx && tx.id) {
      txMap.set(tx.id, tx);
    }
  }

  // 2. Generate BKK transactions from Purchase Orders payment_history
  for (const po of purchaseOrders) {
    if (po.status === 'DIBATALKAN' || po.status === 'CANCELLED') continue;

    const history: any[] = Array.isArray(po.payment_history)
      ? po.payment_history
      : typeof po.payment_history === 'string'
      ? (() => { try { return JSON.parse(po.payment_history); } catch { return []; } })()
      : [];

    if (history.length > 0) {
      history.forEach((pay: any, idx: number) => {
        const txId = pay.id || `tx-po-${po.id}-${idx}`;
        const accId = pay.bank_account_id || (pay.bank_name?.toLowerCase().includes('mandiri') ? 'acc-mandiri' : pay.bank_name?.toLowerCase().includes('bni') ? 'acc-bni' : 'acc-bca');
        const txNum = pay.reference_no || `BKK-PO-${(pay.payment_date || '2026-08-20').replace(/-/g, '').slice(0, 6)}-${String(idx + 1).padStart(3, '0')}`;
        txMap.set(txId, {
          id: txId,
          tx_number: txNum,
          date: pay.payment_date || (po.order_date ? po.order_date.split('T')[0] : '2026-08-23'),
          account_id: accId,
          account_name: pay.bank_name || 'Bank Central Asia (BCA)',
          tx_type: 'OUT',
          category: 'PEMBELIAN_PO',
          amount: Number(pay.amount || 0),
          balance_after: 0,
          recipient_or_payer: po.distributor_name || 'Vendor Suplier',
          reference_number: po.po_number || 'PO Tagihan',
          notes: pay.payment_notes || `Pembayaran tagihan ${po.po_number}`,
          proof_url: pay.payment_proof_url,
          created_by: pay.created_by || 'Staf Finance',
          status: 'VERIFIED',
          created_at: pay.created_at || new Date().toISOString(),
        });
      });
    } else if (Number(po.paid_amount || 0) > 0) {
      const txId = `tx-po-paid-${po.id}`;
      const accId = po.payment_bank_id || 'acc-bca';
      const txNum = `BKK-PO-${po.po_number || po.id}`;
      txMap.set(txId, {
        id: txId,
        tx_number: txNum,
        date: po.last_payment_date || (po.order_date ? po.order_date.split('T')[0] : '2026-08-23'),
        account_id: accId,
        account_name: po.payment_bank_name || 'Bank Central Asia (BCA)',
        tx_type: 'OUT',
        category: 'PEMBELIAN_PO',
        amount: Number(po.paid_amount),
        balance_after: 0,
        recipient_or_payer: po.distributor_name || 'Vendor Suplier',
        reference_number: po.po_number || 'PO Tagihan',
        notes: `Pembayaran tagihan ${po.po_number}`,
        proof_url: po.payment_proof_url,
        created_by: 'Staf Finance',
        status: 'VERIFIED',
        created_at: new Date().toISOString(),
      });
    }
  }

  // 3. Generate BKM transactions from Invoices payment_history
  for (const inv of invoices) {
    const history: any[] = Array.isArray(inv.payment_history)
      ? inv.payment_history
      : typeof inv.payment_history === 'string'
      ? (() => { try { return JSON.parse(inv.payment_history); } catch { return []; } })()
      : [];

    if (history.length > 0) {
      history.forEach((pay: any, idx: number) => {
        const txId = pay.id || `tx-inv-${inv.id}-${idx}`;
        const accId = pay.bank_account_id || (pay.bank_name?.toLowerCase().includes('mandiri') ? 'acc-mandiri' : pay.bank_name?.toLowerCase().includes('bni') ? 'acc-bni' : 'acc-bca');
        const txNum = pay.reference_no || `BKM-INV-${(pay.payment_date || '2026-08-20').replace(/-/g, '').slice(0, 6)}-${String(idx + 1).padStart(3, '0')}`;
        txMap.set(txId, {
          id: txId,
          tx_number: txNum,
          date: pay.payment_date || (inv.issue_date ? inv.issue_date.split('T')[0] : '2026-08-23'),
          account_id: accId,
          account_name: pay.bank_name || 'Bank Central Asia (BCA)',
          tx_type: 'IN',
          category: 'PENJUALAN_SO',
          amount: Number(pay.amount || 0),
          balance_after: 0,
          recipient_or_payer: inv.customer_name || 'Customer B2B',
          reference_number: inv.invoice_number || inv.so_number || 'Invoice',
          notes: pay.payment_notes || `Pelunasan invoice ${inv.invoice_number}`,
          proof_url: pay.payment_proof_url,
          created_by: pay.created_by || 'Staf Finance',
          status: 'VERIFIED',
          created_at: pay.created_at || new Date().toISOString(),
        });
      });
    } else if (Number(inv.paid_amount || 0) > 0) {
      const txId = `tx-inv-paid-${inv.id}`;
      const accId = 'acc-bca';
      const txNum = `BKM-INV-${inv.invoice_number || inv.id}`;
      txMap.set(txId, {
        id: txId,
        tx_number: txNum,
        date: inv.last_payment_date || (inv.issue_date ? inv.issue_date.split('T')[0] : '2026-08-23'),
        account_id: accId,
        account_name: 'Bank Central Asia (BCA)',
        tx_type: 'IN',
        category: 'PENJUALAN_SO',
        amount: Number(inv.paid_amount),
        balance_after: 0,
        recipient_or_payer: inv.customer_name || 'Customer B2B',
        reference_number: inv.invoice_number || inv.so_number || 'Invoice',
        notes: `Pelunasan invoice ${inv.invoice_number}`,
        proof_url: inv.payment_proof_url,
        created_by: 'Staf Finance',
        status: 'VERIFIED',
        created_at: new Date().toISOString(),
      });
    }
  }

  const result = Array.from(txMap.values());
  result.sort((a, b) => new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime());
  return result;
}

/**
 * Record a single cash inflow or outflow transaction
 */
export function recordCashTransaction(
  txData: Omit<CashTransaction, 'id' | 'tx_number' | 'account_name' | 'balance_after' | 'created_at'> & {
    account_name?: string;
  }
): CashTransaction {
  const accounts = getStoredCashAccounts();
  const txs = getStoredCashTransactions();

  const targetAcc = accounts.find((a) => a.id === txData.account_id) || accounts[0];
  const prefix = txData.tx_type === 'IN' ? 'BKM' : 'BKK';
  const monthStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const count = txs.filter((t) => t.tx_number.startsWith(prefix)).length + 1;
  const txNumber = `${prefix}-${monthStr}-${String(count).padStart(4, '0')}`;

  const currentBal = Number(targetAcc.current_balance) || 0;
  const newBal = txData.tx_type === 'IN' ? currentBal + Number(txData.amount) : currentBal - Number(txData.amount);

  const newTx: CashTransaction = {
    ...txData,
    id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    tx_number: txNumber,
    account_name: targetAcc.name,
    balance_after: newBal,
    created_at: new Date().toISOString(),
  };

  const updatedTxs = [newTx, ...txs];
  const updatedAccs = recalculateBalances(accounts, updatedTxs);

  saveStoredCashTransactions(updatedTxs);
  saveStoredCashAccounts(updatedAccs);

  return newTx;
}

/**
 * Inter-Account Transfer (e.g. Kas Besar -> Kas Kantor / Kas Kecil / Kas Sales, or Setor Balik)
 */
export function transferCashBetweenAccounts(params: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  category?: 'TOPUP_KAS' | 'SETOR_BALIK';
  notes?: string;
  proofUrl?: string;
  createdBy?: string;
}): { outTx: CashTransaction; inTx: CashTransaction } {
  const accounts = getStoredCashAccounts();
  const txs = getStoredCashTransactions();

  const fromAcc = accounts.find((a) => a.id === params.fromAccountId);
  const toAcc = accounts.find((a) => a.id === params.toAccountId);

  if (!fromAcc || !toAcc) {
    throw new Error('Akun asal atau akun tujuan tidak ditemukan.');
  }

  const monthStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const trfCount = txs.filter((t) => t.tx_type === 'TRANSFER').length + 1;
  const trfNumber = `TRF-${monthStr}-${String(trfCount).padStart(4, '0')}`;

  const pairId = `pair-${Date.now()}`;
  const outTxId = `tx-${Date.now()}-out`;
  const inTxId = `tx-${Date.now()}-in`;

  const category = params.category || 'TOPUP_KAS';

  const outTx: CashTransaction = {
    id: outTxId,
    tx_number: trfNumber,
    date: params.date,
    account_id: fromAcc.id,
    account_name: fromAcc.name,
    tx_type: 'TRANSFER',
    category,
    amount: params.amount,
    balance_after: (Number(fromAcc.current_balance) || 0) - params.amount,
    recipient_or_payer: toAcc.name,
    reference_number: trfNumber,
    notes: params.notes || `Transfer dana ke ${toAcc.name}`,
    proof_url: params.proofUrl,
    created_by: params.createdBy || 'Finance Treasury',
    transfer_pair_id: inTxId,
    status: 'VERIFIED',
    created_at: new Date().toISOString(),
  };

  const inTx: CashTransaction = {
    id: inTxId,
    tx_number: `${trfNumber}-IN`,
    date: params.date,
    account_id: toAcc.id,
    account_name: toAcc.name,
    tx_type: 'IN',
    category,
    amount: params.amount,
    balance_after: (Number(toAcc.current_balance) || 0) + params.amount,
    recipient_or_payer: fromAcc.name,
    reference_number: trfNumber,
    notes: params.notes ? `[Diterima dari ${fromAcc.name}] ${params.notes}` : `Penerimaan transfer dari ${fromAcc.name}`,
    proof_url: params.proofUrl,
    created_by: params.createdBy || 'Finance Treasury',
    transfer_pair_id: outTxId,
    status: 'VERIFIED',
    created_at: new Date().toISOString(),
  };

  const updatedTxs = [outTx, inTx, ...txs];
  const updatedAccs = recalculateBalances(accounts, updatedTxs);

  saveStoredCashTransactions(updatedTxs);
  saveStoredCashAccounts(updatedAccs);

  return { outTx, inTx };
}

/**
 * Delete a transaction and update running balances
 */
export function deleteCashTransaction(txId: string): void {
  const accounts = getStoredCashAccounts();
  const txs = getStoredCashTransactions();

  const target = txs.find((t) => t.id === txId);
  if (!target) return;

  // Also remove pair transaction if it was an inter-account transfer
  const updatedTxs = txs.filter(
    (t) => t.id !== txId && (target.transfer_pair_id ? t.id !== target.transfer_pair_id : true)
  );

  const updatedAccs = recalculateBalances(accounts, updatedTxs);

  saveStoredCashTransactions(updatedTxs);
  saveStoredCashAccounts(updatedAccs);
}

export interface PODueDateInfo {
  dueDateStr: string;
  diffDays: number;
  isOverdue: boolean;
  isDueToday: boolean;
  displayText: string;
}

export interface POPaymentCashStatus {
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'CANCELLED';
  totalPaid: number;
  remaining: number;
  bankName?: string;
  lastPayDate?: string;
  txNumbers: string[];
}

export function calculatePODueDateInfo(po: PurchaseOrder): PODueDateInfo {
  let dueDateStr = po.due_date;
  if (!dueDateStr) {
    const orderD = po.order_date ? new Date(po.order_date) : new Date();
    const terms = Number(po.payment_terms_days) || 30;
    const d = new Date(orderD);
    d.setDate(d.getDate() + terms);
    dueDateStr = d.toISOString().split('T')[0];
  }

  const dueD = new Date(dueDateStr);
  const now = new Date();
  const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d2 = new Date(dueD.getFullYear(), dueD.getMonth(), dueD.getDate());
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let displayText = '';
  if (diffDays > 0) {
    displayText = `${diffDays} hari lagi`;
  } else if (diffDays === 0) {
    displayText = 'Hari ini';
  } else {
    displayText = `Overdue ${Math.abs(diffDays)} hari`;
  }

  return {
    dueDateStr,
    diffDays,
    isOverdue: diffDays < 0,
    isDueToday: diffDays === 0,
    displayText,
  };
}

export function getPOPaymentStatusFromCash(
  po: PurchaseOrder,
  cashTxs?: CashTransaction[]
): POPaymentCashStatus {
  if (po.status === 'DIBATALKAN' || po.status === 'CANCELLED') {
    return {
      status: 'CANCELLED',
      totalPaid: 0,
      remaining: 0,
      txNumbers: [],
    };
  }

  const txs = cashTxs || getStoredCashTransactions();
  const poNumClean = (po.po_number || '').trim().toLowerCase();

  // Find all OUT / PEMBELIAN_PO transactions matching this PO
  const matchingTxs = txs.filter((tx) => {
    if (tx.status !== 'VERIFIED') return false;
    if (tx.tx_type !== 'OUT' && tx.category !== 'PEMBELIAN_PO') return false;
    const ref = (tx.reference_number || '').toLowerCase();
    const notes = (tx.notes || '').toLowerCase();
    return poNumClean ? ref.includes(poNumClean) || notes.includes(poNumClean) : false;
  });

  const totalPaid = matchingTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const poTotal = Number(po.total_amount) || 0;

  // Fallback: If PO status itself is DIKIRIM / DITERIMA, it is marked paid
  const isPaidByStatus = po.status === 'DIKIRIM' || po.status === 'DITERIMA';
  const isFullyPaid = (totalPaid >= poTotal && poTotal > 0) || (totalPaid === 0 && isPaidByStatus);
  const isPartial = totalPaid > 0 && totalPaid < poTotal;

  const sortedTxs = [...matchingTxs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const latestTx = sortedTxs[0];

  return {
    status: isFullyPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID',
    totalPaid: totalPaid > 0 ? totalPaid : isPaidByStatus ? poTotal : 0,
    remaining: isFullyPaid ? 0 : Math.max(0, poTotal - totalPaid),
    bankName: latestTx?.account_name,
    lastPayDate: latestTx?.date,
    txNumbers: matchingTxs.map((t) => t.tx_number),
  };
}

export interface SOPaymentCashStatus {
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'CANCELLED';
  totalPaid: number;
  remaining: number;
  bankName?: string;
  lastPayDate?: string;
  txNumbers: string[];
}

export function calculateSODueDateInfo(so: SalesOrder, inv?: Invoice): PODueDateInfo {
  let dueDateStr = inv?.due_date || (so as any).due_date;
  if (!dueDateStr) {
    const orderD = so.order_date ? new Date(so.order_date) : new Date();
    const d = new Date(orderD);
    d.setDate(d.getDate() + 30);
    dueDateStr = d.toISOString().split('T')[0];
  }

  const dueD = new Date(dueDateStr);
  const now = new Date();
  const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d2 = new Date(dueD.getFullYear(), dueD.getMonth(), dueD.getDate());
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let displayText = '';
  if (diffDays > 0) {
    displayText = `${diffDays} hari lagi`;
  } else if (diffDays === 0) {
    displayText = 'Hari ini';
  } else {
    displayText = `Overdue ${Math.abs(diffDays)} hari`;
  }

  return {
    dueDateStr,
    diffDays,
    isOverdue: diffDays < 0,
    isDueToday: diffDays === 0,
    displayText,
  };
}

export function getSOPaymentStatusFromCash(
  so: SalesOrder,
  inv?: Invoice,
  cashTxs?: CashTransaction[]
): SOPaymentCashStatus {
  if (so.status === 'CANCELLED') {
    return {
      status: 'CANCELLED',
      totalPaid: 0,
      remaining: 0,
      txNumbers: [],
    };
  }

  const soTotal = Number(so.grand_total || (so as any).total_goods_amount || inv?.total_amount || 0);

  // If invoice is already marked PAID
  if (inv && (inv.status === 'PAID' || Number(inv.paid_amount || 0) >= Number(inv.total_amount || 0))) {
    const latestHist = Array.isArray(inv.payment_history) && inv.payment_history.length > 0 ? inv.payment_history[inv.payment_history.length - 1] : undefined;
    return {
      status: 'PAID',
      totalPaid: Number(inv.paid_amount || soTotal),
      remaining: 0,
      bankName: latestHist?.bank_name || 'Kas Besar (BCA / Mandiri)',
      lastPayDate: inv.last_payment_date || inv.issue_date,
      txNumbers: [],
    };
  }

  // If invoice is PARTIALLY_PAID
  if (inv && Number(inv.paid_amount || 0) > 0) {
    const latestHist = Array.isArray(inv.payment_history) && inv.payment_history.length > 0 ? inv.payment_history[inv.payment_history.length - 1] : undefined;
    return {
      status: 'PARTIAL',
      totalPaid: Number(inv.paid_amount),
      remaining: Math.max(0, soTotal - Number(inv.paid_amount)),
      bankName: latestHist?.bank_name,
      lastPayDate: inv.last_payment_date,
      txNumbers: [],
    };
  }

  const txs = cashTxs || getStoredCashTransactions();
  const soNumClean = (so.so_number || '').trim().toLowerCase();
  const invNumClean = (inv?.invoice_number || '').trim().toLowerCase();

  // Find all IN / PENJUALAN_SO transactions matching this SO or Invoice
  const matchingTxs = txs.filter((tx) => {
    if (tx.status !== 'VERIFIED') return false;
    if (tx.tx_type !== 'IN' && tx.category !== 'PENJUALAN_SO') return false;
    const ref = (tx.reference_number || '').toLowerCase();
    const notes = (tx.notes || '').toLowerCase();
    return (
      (soNumClean && (ref.includes(soNumClean) || notes.includes(soNumClean))) ||
      (invNumClean && (ref.includes(invNumClean) || notes.includes(invNumClean)))
    );
  });

  const totalPaid = matchingTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const isFullyPaid = (totalPaid >= soTotal && soTotal > 0) || so.status === 'DIBAYAR';
  const isPartial = totalPaid > 0 && totalPaid < soTotal;

  const sortedTxs = [...matchingTxs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const latestTx = sortedTxs[0];

  return {
    status: isFullyPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID',
    totalPaid: totalPaid > 0 ? totalPaid : (isFullyPaid ? soTotal : 0),
    remaining: isFullyPaid ? 0 : Math.max(0, soTotal - totalPaid),
    bankName: latestTx?.account_name,
    lastPayDate: latestTx?.date,
    txNumbers: matchingTxs.map((t) => t.tx_number),
  };
}
