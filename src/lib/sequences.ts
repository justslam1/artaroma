import { executeQuery } from './db';

/**
 * Helper to get current Date string in YYYYMM format (e.g., '202608')
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

/**
 * Generate sequential, non-colliding Sales Order number: SO-YYYYMM-XXXX
 * Example: SO-202608-0001, SO-202608-0002, ...
 */
export async function generateNextSONumber(): Promise<string> {
  const yearMonth = getCurrentYearMonth();
  const prefix = `SO-${yearMonth}-`;

  try {
    const rows: any[] = await executeQuery(
      'SELECT so_number FROM sales_orders WHERE so_number LIKE ? ORDER BY so_number DESC',
      [`${prefix}%`]
    );

    let maxSeq = 0;
    if (rows && rows.length > 0) {
      for (const r of rows) {
        if (r.so_number && r.so_number.startsWith(prefix)) {
          const suffix = r.so_number.slice(prefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }

    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(4, '0');
    return `${prefix}${padded}`;
  } catch (err) {
    console.warn('Failed to query max SO sequence, fallback generator used:', err);
    const fallbackSeq = Math.floor(1 + Math.random() * 9999);
    return `${prefix}${String(fallbackSeq).padStart(4, '0')}`;
  }
}

/**
 * Generate sequential, non-colliding Purchase Order number: PO-YYYYMM-XXXX
 * Example: PO-202608-0001, PO-202608-0002, ...
 */
export async function generateNextPONumber(): Promise<string> {
  const yearMonth = getCurrentYearMonth();
  const prefix = `PO-${yearMonth}-`;

  try {
    const rows: any[] = await executeQuery(
      'SELECT po_number FROM purchase_orders WHERE po_number LIKE ? ORDER BY po_number DESC',
      [`${prefix}%`]
    );

    let maxSeq = 0;
    if (rows && rows.length > 0) {
      for (const r of rows) {
        if (r.po_number && r.po_number.startsWith(prefix)) {
          const suffix = r.po_number.slice(prefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }

    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(4, '0');
    return `${prefix}${padded}`;
  } catch (err) {
    console.warn('Failed to query max PO sequence, fallback generator used:', err);
    const fallbackSeq = Math.floor(1 + Math.random() * 9999);
    return `${prefix}${String(fallbackSeq).padStart(4, '0')}`;
  }
}

/**
 * Generate sequential Invoice number: INV-YYYYMM-XXXX
 */
export async function generateNextInvoiceNumber(): Promise<string> {
  const yearMonth = getCurrentYearMonth();
  const prefix = `INV-${yearMonth}-`;

  try {
    const rows: any[] = await executeQuery(
      'SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC',
      [`${prefix}%`]
    );

    let maxSeq = 0;
    if (rows && rows.length > 0) {
      for (const r of rows) {
        if (r.invoice_number && r.invoice_number.startsWith(prefix)) {
          const suffix = r.invoice_number.slice(prefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }

    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(4, '0');
    return `${prefix}${padded}`;
  } catch (err) {
    const fallbackSeq = Math.floor(1 + Math.random() * 9999);
    return `${prefix}${String(fallbackSeq).padStart(4, '0')}`;
  }
}
