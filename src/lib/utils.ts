import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIDR(amount: number | null | undefined): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return "Rp 0,00";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatKg(kg?: number | null): string {
  if (kg === undefined || kg === null || isNaN(Number(kg))) {
    return '0,00 kg';
  }
  const num = Number(kg);
  return `${num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Tier Diskon Kuantiti Berdasarkan Total Kg Pesanan (Opsi 2):
 * - < 5 kg: 0%
 * - 5 - 14.99 kg: 5%
 * - >= 15 kg: 7%
 */
export function calculateQuantityDiscount(totalKg: number): { percent: number; label: string; nextTierKg?: number; nextTierPercent?: number } {
  const qty = Math.round((Number(totalKg) || 0) * 100) / 100;
  if (qty >= 15) {
    return { percent: 7, label: '7%' };
  }
  if (qty >= 5) {
    return { percent: 5, label: '5%', nextTierKg: 15, nextTierPercent: 7 };
  }
  return { percent: 0, label: '0%', nextTierKg: 5, nextTierPercent: 5 };
}

