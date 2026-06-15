import { CURRENCIES, CRYPTO_PRICES, SUBSCRIPTION_PLANS, LNC_RATE_USD } from './constants';
import type { SubscriptionPlan } from './store';

// ===== Greeting =====
export function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: 'Доброе утро', emoji: '☀️', gradient: 'from-amber-500/20 via-orange-400/10 to-transparent' };
  if (h >= 12 && h < 17) return { text: 'Добрый день', emoji: '🌤️', gradient: 'from-sky-500/20 via-blue-400/10 to-transparent' };
  if (h >= 17 && h < 22) return { text: 'Добрый вечер', emoji: '🌆', gradient: 'from-purple-500/20 via-pink-400/10 to-transparent' };
  return { text: 'Доброй ночи', emoji: '🌙', gradient: 'from-indigo-900/30 via-slate-800/20 to-transparent' };
}

// ===== PIN Hashing =====
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + ':' + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ===== Money Formatting =====
export function formatMoney(amountUSD: number, displayCurrency: string = 'USD'): string {
  const c = CURRENCIES[displayCurrency];
  if (!c) return `$${amountUSD.toFixed(2)}`;
  const val = amountUSD * c.rate;
  if (Math.abs(val) >= 1_000_000) return `${c.symbol}${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 100_000) return `${c.symbol}${(val / 1_000).toFixed(1)}K`;
  return `${c.symbol}${val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCrypto(amount: number, currency: string): string {
  const map: Record<string, [string, number]> = {
    BTC: ['₿', 8],
    ETH: ['Ξ', 6],
    TON: ['💎 ', 4],
    USDT: ['$', 2],
    LNC: ['◎', 2],
  };
  const [sym, dec] = map[currency] || ['', 2];
  return `${sym}${amount.toFixed(dec)}`;
}

export function balanceInUsd(balance: number, currency: string): number {
  return balance * (CRYPTO_PRICES[currency] || 1);
}

// ===== Commission =====
export function getCommission(plan: SubscriptionPlan, amount: number): number {
  const p = SUBSCRIPTION_PLANS.find((s) => s.id === plan);
  return p ? Math.round(amount * (p.commission / 100) * 100) / 100 : amount * 0.005;
}

// ===== Address shortener =====
export function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

// ===== Time ago =====
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

// ===== Haptic feedback =====
export function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      if (type === 'success' || type === 'error') {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    }
  } catch {
    // silently fail outside Telegram
  }
}
