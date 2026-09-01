/**
 * WhatsApp Gateway Integration Helper for Artaroma Hub
 * Supports Fonnte REST API (https://api.fonnte.com/send) & Custom Webhook
 */

import { executeQuery } from '@/lib/db';
import { formatIDR, formatKg } from '@/lib/utils';

export interface WASendParams {
  target: string; // Phone number e.g. 081234567890 or international 6281234567890 or Group ID
  message: string;
  token?: string;
  countryCode?: string;
}

export interface WAGatewayConfig {
  enabled: boolean;
  provider: 'fonnte' | 'custom';
  apiToken: string;
  adminPhone: string;
  notifyAdmin: boolean;
  notifyCustomer: boolean;
}

/**
 * Normalizes Indonesian phone numbers into standard format
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62') && cleaned.length > 7) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Fetches active WhatsApp configuration from MySQL company_settings
 */
export async function getWhatsAppConfig(): Promise<WAGatewayConfig> {
  try {
    const rows: any = await executeQuery(
      `SELECT key_name, value_text FROM company_settings WHERE key_name IN (
        'wa_gateway_enabled', 'wa_gateway_provider', 'wa_api_token', 'wa_admin_phone', 'wa_notify_admin', 'wa_notify_customer', 'whatsapp_number'
      )`
    );

    const map: Record<string, string> = {};
    if (Array.isArray(rows)) {
      rows.forEach((r) => {
        map[r.key_name] = r.value_text;
      });
    }

    return {
      enabled: map.wa_gateway_enabled !== 'false' && Boolean(map.wa_api_token),
      provider: (map.wa_gateway_provider as any) || 'fonnte',
      apiToken: map.wa_api_token || '',
      adminPhone: map.wa_admin_phone || map.whatsapp_number || '6285225184422',
      notifyAdmin: map.wa_notify_admin !== 'false',
      notifyCustomer: map.wa_notify_customer !== 'false',
    };
  } catch (err) {
    console.warn('[WhatsApp] Failed to load config from database:', err);
    return {
      enabled: false,
      provider: 'fonnte',
      apiToken: '',
      adminPhone: '6285225184422',
      notifyAdmin: true,
      notifyCustomer: true,
    };
  }
}

/**
 * Sends a WhatsApp message via Fonnte API or Custom Endpoint
 */
export async function sendWhatsAppMessage({
  target,
  message,
  token,
  countryCode = '62',
}: WASendParams): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!target || !message) {
    return { success: false, error: 'Target phone number or message is empty' };
  }

  // Get token from parameter or database
  let activeToken = token;
  if (!activeToken) {
    const cfg = await getWhatsAppConfig();
    activeToken = cfg.apiToken;
  }

  if (!activeToken) {
    console.warn('[WhatsApp] API Token is not configured. Message skipped.');
    return { success: false, error: 'Fonnte API Token is not configured' };
  }

  const cleanTarget = target.includes('@g.us') ? target : normalizePhoneNumber(target);

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: activeToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: cleanTarget,
        message,
        countryCode,
      }),
    });

    const json = await res.json();
    if (json.status === true || json.status === 'true' || json.id) {
      return { success: true, data: json };
    } else {
      console.warn('[WhatsApp] Fonnte API returned warning/error:', json);
      return { success: false, error: json.reason || json.message || 'Failed to send WhatsApp message' };
    }
  } catch (err: any) {
    console.error('[WhatsApp] Network request error:', err);
    return { success: false, error: err.message || 'Network error connecting to WhatsApp Gateway' };
  }
}

/**
 * Formats a clean, high-impact WhatsApp notification for Admin & Sales/Warehouse Team
 */
export function formatNewSalesOrderWAMessage({
  soNumber,
  customerName,
  customerCompany,
  customerPhone,
  paymentMethod,
  orderDate,
  items,
  totalWeightKg,
  grandTotal,
  originUrl = 'https://artaroma.co.id',
}: {
  soNumber: string;
  customerName: string;
  customerCompany?: string;
  customerPhone?: string;
  paymentMethod: string;
  orderDate?: string;
  items: Array<{ name: string; qtyKg: number; unitPrice: number; subtotal: number }>;
  totalWeightKg: number;
  grandTotal: number;
  originUrl?: string;
}): string {
  const dateStr = orderDate || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const companyLabel = customerCompany ? ` (${customerCompany})` : '';
  const phoneLabel = customerPhone ? `\n📱 *No. Kontak*: ${customerPhone}` : '';

  const itemsList = items
    .slice(0, 10)
    .map((item, idx) => `  ${idx + 1}. *${item.name}* (${formatKg(item.qtyKg)}) — ${formatIDR(item.subtotal)}`)
    .join('\n');

  const moreItemsNotice = items.length > 10 ? `\n  ...dan ${items.length - 10} item lainnya.` : '';

  return (
    `🔔 *NOTIFIKASI PESANAN MASUK (SALES ORDER)* 🔔\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *No. SO*: \`${soNumber}\`\n` +
    `👤 *Customer*: *${customerName}*${companyLabel}${phoneLabel}\n` +
    `💳 *Metode Pembayaran*: ${paymentMethod}\n` +
    `📅 *Waktu*: ${dateStr}\n\n` +
    `📦 *Rincian Item Pesanan*:\n` +
    `${itemsList}${moreItemsNotice}\n` +
    `────────────────────\n` +
    `⚖️ *Total Volume*: *${formatKg(totalWeightKg)}*\n` +
    `💰 *Total Tagihan*: *${formatIDR(grandTotal)}*\n\n` +
    `🔗 *Buka & Proses di Admin Hub*:\n` +
    `${originUrl}/admin/sales-orders?so=${encodeURIComponent(soNumber)}`
  );
}

/**
 * Formats a polite, professional order receipt confirmation for the Customer
 */
export function formatCustomerOrderConfirmationWAMessage({
  soNumber,
  customerName,
  items,
  totalWeightKg,
  grandTotal,
}: {
  soNumber: string;
  customerName: string;
  items: Array<{ name: string; qtyKg: number; unitPrice: number; subtotal: number }>;
  totalWeightKg: number;
  grandTotal: number;
}): string {
  const itemsList = items
    .slice(0, 8)
    .map((item, idx) => `  ${idx + 1}. ${item.name} (${formatKg(item.qtyKg)})`)
    .join('\n');

  return (
    `Halo *${customerName}*,\n\n` +
    `Terima kasih telah melakukan pemesanan di *PT Artaroma Jayatama*.\n` +
    `Pesanan Anda telah kami terima dengan rincian sebagai berikut:\n\n` +
    `📋 *No. Pesanan*: \`${soNumber}\`\n` +
    `📦 *Item*:\n${itemsList}\n` +
    `⚖️ *Total Berat*: ${formatKg(totalWeightKg)}\n` +
    `💰 *Total Estimasi*: ${formatIDR(grandTotal)}\n\n` +
    `Tim Admin & Finance kami sedang memeriksa ketersediaan stok FEFO dan akan segera menerbitkan tagihan/invoice resmi untuk pesanan Anda.\n\n` +
    `_Pesan ini dikirim otomatis oleh Artaroma Hub Management System._`
  );
}
