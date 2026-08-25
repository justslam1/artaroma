import { initialSalesOrders, initialInvoices } from './mock-data';
import { SalesOrder, Invoice } from './types';

const ORDERS_KEY = 'artaroma_sales_orders_v1';
const INVOICES_KEY = 'artaroma_invoices_v1';

export function getStoredOrders(): SalesOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredOrders(orders: SalesOrder[], emitEvent: boolean = true) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    if (emitEvent) {
      window.dispatchEvent(new Event('artaroma_orders_updated'));
    }
  } catch (e) {
    console.warn('Failed to save orders to localStorage:', e);
  }
}

export function getStoredInvoices(): Invoice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INVOICES_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredInvoices(invoices: Invoice[], emitEvent: boolean = true) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
    if (emitEvent) {
      window.dispatchEvent(new Event('artaroma_invoices_updated'));
    }
  } catch (e) {
    console.warn('Failed to save invoices to localStorage:', e);
  }
}

/**
 * Helper to update a specific Sales Order's status and automatically issue/update invoice
 */
export function updateSalesOrderStatus(
  orderIdOrNumber: string,
  newStatus: SalesOrder['status'],
  additionalOrderProps?: Partial<SalesOrder>,
  newInvoiceData?: Invoice
) {
  const currentOrders = getStoredOrders();
  const currentInvoices = getStoredInvoices();

  let targetId = orderIdOrNumber;
  let found = false;
  const updatedOrders = currentOrders.map((so) => {
    if (so.id === orderIdOrNumber || so.so_number === orderIdOrNumber) {
      targetId = so.id;
      found = true;
      return {
        ...so,
        status: newStatus,
        ...additionalOrderProps,
      };
    }
    return so;
  });

  if (!found) {
    updatedOrders.unshift({
      id: orderIdOrNumber,
      so_number: orderIdOrNumber,
      customer_id: 'cust-01',
      customer_name: additionalOrderProps?.customer_name || 'Customer B2B',
      customer_company: additionalOrderProps?.customer_company || 'PT Customer B2B',
      status: newStatus,
      payment_method: 'LUNAS_TRANSFER',
      order_date: new Date().toISOString(),
      items: [],
      ...additionalOrderProps,
    });
  }

  const updatedOrder = updatedOrders.find((o) => o.id === targetId || o.so_number === orderIdOrNumber);

  saveStoredOrders(updatedOrders);

  if (newInvoiceData) {
    const existingIdx = currentInvoices.findIndex(
      (inv) => inv.id === newInvoiceData.id || inv.so_number === newInvoiceData.so_number
    );
    let updatedInvoices: Invoice[];
    if (existingIdx >= 0) {
      updatedInvoices = [...currentInvoices];
      updatedInvoices[existingIdx] = { ...updatedInvoices[existingIdx], ...newInvoiceData };
    } else {
      updatedInvoices = [newInvoiceData, ...currentInvoices];
    }
    saveStoredInvoices(updatedInvoices);
  }

  // Asynchronously sync the status change to MySQL database
  fetch(`/api/sales-orders/${orderIdOrNumber}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: newStatus,
      total_goods_amount: updatedOrder?.total_goods_amount,
      grand_total: updatedOrder?.grand_total,
      courier_name: updatedOrder?.courier_name,
      surat_jalan_number: updatedOrder?.surat_jalan_number,
      received_by: updatedOrder?.received_by,
      received_photo: updatedOrder?.received_photo,
      received_signature: updatedOrder?.received_signature,
      cancellation_reason: updatedOrder?.cancellation_reason || additionalOrderProps?.cancellation_reason,
      cancelled_at: updatedOrder?.cancelled_at || additionalOrderProps?.cancelled_at,
      cancelled_by: updatedOrder?.cancelled_by || additionalOrderProps?.cancelled_by,
      items: updatedOrder?.items,
    }),
  }).catch((err) => console.warn('Background sync to MySQL failed:', err));
}
