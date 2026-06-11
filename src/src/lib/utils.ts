import { CURRENCIES, CRYPTO_PRICES, SUBSCRIPTION_PLANS, LNC_RATE_USD } from './constants';
import type { SubscriptionPlan } from './store';

export function getGreeting(): { text: string; gradient: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: 'Доброе утро', gradient: 'from-amber-500/20 via-orange-400/10 to-transparent', emoji: '☀️' };
  if (h >= 12 && h < 17) return { text: 'Добрый день', gradient: 'from-sky-500/20 via-blue-400/10 to-transparent', emoji: '🌤️' };
  if (h >= 17 && h < 22) return { text: 'Добрый вечер', gradient: 'from-purple-500/20 via-pink-400/10 to-transparent', emoji: '🌆' };
  return { text: 'Доброй ночи', gradient: 'from-indigo-900/30 via-slate-800/20 to-transparent', emoji: '🌙' };
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + ':' + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Format amount in display currency. For LNC accounts, amount is in LNC. */
export function formatMoney(amountUSD: number, displayCurrency: string = 'USD'): string {
  const c = CURRENCIES[displayCurrency];
  if (!c) return `$${amountUSD.toFixed(2)}`;
  const val = amountUSD * c.rate;
  if (Math.abs(val) >= 1_000_000) return `${c.symbol}${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 100_000) return `${c.symbol}${(val / 1_000).toFixed(1)}K`;
  return `${c.symbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Convert LNC balance to USD for display */
export function lncToUsd(lnc: number): number {
  return lnc * LNC_RATE_USD;
}

/** Format crypto amounts */
export function formatCrypto(amount: number, currency: string): string {
  if (currency === 'BTC') return `₿${amount.toFixed(8)}`;
  if (currency === 'ETH') return `Ξ${amount.toFixed(6)}`;
  if (currency === 'TON') return `💎 ${amount.toFixed(4)}`;
  if (currency === 'USDT') return `$${amount.toFixed(2)}`;
  if (currency === 'LNC') return `◎${amount.toFixed(2)}`;
  return `${amount.toFixed(2)} ${currency}`;
}

/** Get balance in USD for any account */
export function balanceInUsd(balance: number, currency: string): number {
  const price = CRYPTO_PRICES[currency] || 1;
  return balance * price;
}

export function getCommission(plan: SubscriptionPlan, amount: number): number {
  const p = SUBSCRIPTION_PLANS.find(s => s.id === plan);
  return p ? Math.round(amount * (p.commission / 100) * 100) / 100 : amount * 0.005;
}

export function shortAddr(addr: string): string {
  return addr.length <= 12 ? addr : addr.slice(0, 6) + '…' + addr.slice(-4);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ч назад`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}д назад`;
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

export function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      if (type === 'success' || type === 'error') tg.HapticFeedback.notificationOccurred(type);
      else tg.HapticFeedback.impactOccurred(type);
    }
  } catch {}
}

export function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
