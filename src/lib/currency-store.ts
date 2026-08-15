const CURRENCY_KEY = 'artaroma_usd_exchange_rate_v1';
export const DEFAULT_USD_RATE = 16250; // Default Rp 16.250 / USD

export function getUsdExchangeRate(): number {
  if (typeof window === 'undefined') return DEFAULT_USD_RATE;
  try {
    const stored = localStorage.getItem(CURRENCY_KEY);
    if (!stored) {
      localStorage.setItem(CURRENCY_KEY, String(DEFAULT_USD_RATE));
      return DEFAULT_USD_RATE;
    }
    const parsed = parseFloat(stored);
    return isNaN(parsed) || parsed <= 0 ? DEFAULT_USD_RATE : parsed;
  } catch {
    return DEFAULT_USD_RATE;
  }
}

export function setUsdExchangeRate(rate: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CURRENCY_KEY, String(rate));
    window.dispatchEvent(new Event('artaroma_currency_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn('Failed to save USD exchange rate:', e);
  }
}

/**
 * Calculates IDR price based on base USD price and current USD/IDR exchange rate
 */
export function convertUsdToIdr(usdPrice: number, customRate?: number): number {
  const rate = customRate || getUsdExchangeRate();
  return Math.round(usdPrice * rate);
}
