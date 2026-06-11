// ===== LUNA BANK CONSTANTS =====

export const PROJECT_WALLET = 'UQA9IgVuB-8GUVRttmh4zjhg5yFYXBMhGHWyt7ASJF1VuZJD';

// 1 LNC = $0.05 (5 центов)
export const LNC_RATE_USD = 0.05;

// ===== Account Types =====
export const ACCOUNT_TYPES = [
  {
    id: 'personal',
    name: 'Личный',
    currency: 'LNC',
    icon: '👤',
    requiresWallet: false,
    desc: 'Основной счёт в Luna Coin',
  },
  {
    id: 'business',
    name: 'Бизнес',
    currency: 'LNC',
    icon: '💼',
    requiresWallet: false,
    desc: 'Для предпринимателей',
  },
  {
    id: 'ton',
    name: 'TON',
    currency: 'TON',
    icon: '💎',
    requiresWallet: true,
    desc: 'Крипто-счёт Toncoin',
  },
  {
    id: 'usdt',
    name: 'USDT',
    currency: 'USDT',
    icon: '💵',
    requiresWallet: true,
    desc: 'Стейблкоин Tether',
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    currency: 'BTC',
    icon: '₿',
    requiresWallet: true,
    desc: 'Крипто-счёт Bitcoin',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    currency: 'ETH',
    icon: 'Ξ',
    requiresWallet: true,
    desc: 'Крипто-счёт Ethereum',
  },
] as const;

// ===== Card Designs =====
export const CARD_DESIGNS = [
  { id: 'classic', name: 'Classic', bg: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', color: '#fff' },
  { id: 'white', name: 'White', bg: 'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)', color: '#000' },
  { id: 'gradient', name: 'Gradient', bg: 'linear-gradient(145deg, #7c3aed 0%, #a855f7 40%, #ec4899 100%)', color: '#fff' },
  { id: 'night', name: 'Night', bg: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)', color: '#fff' },
  { id: 'ocean', name: 'Ocean', bg: 'linear-gradient(145deg, #0c4a6e 0%, #0284c7 50%, #06b6d4 100%)', color: '#fff' },
  { id: 'metal', name: 'Metal', bg: 'linear-gradient(145deg, #71717a 0%, #a1a1aa 30%, #71717a 60%, #a1a1aa 100%)', color: '#000' },
] as const;

// ===== Subscription Plans =====
export const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    commission: 0.5,
    cashback: 0,
    dailyLimit: 1000,
    support: 'Чат',
    icon: '🆓',
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 4.99,
    commission: 0.3,
    cashback: 1,
    dailyLimit: 10000,
    support: 'Приоритет',
    icon: '⭐',
  },
  {
    id: 'cosmic',
    name: 'Cosmic',
    price: 19.99,
    commission: 0,
    cashback: 3,
    dailyLimit: Infinity,
    support: 'VIP 24/7',
    icon: '🚀',
  },
] as const;

// ===== Display Currencies =====
export const CURRENCIES: Record<string, { symbol: string; flag: string; rate: number }> = {
  USD: { symbol: '$', flag: '🇺🇸', rate: 1 },
  LNC: { symbol: '◎', flag: '🌙', rate: 1 / LNC_RATE_USD },
  RUB: { symbol: '₽', flag: '🇷🇺', rate: 89.5 },
  EUR: { symbol: '€', flag: '🇪🇺', rate: 0.92 },
  GBP: { symbol: '£', flag: '🇬🇧', rate: 0.79 },
  CNY: { symbol: '¥', flag: '🇨🇳', rate: 7.24 },
  JPY: { symbol: '¥', flag: '🇯🇵', rate: 149.5 },
  TRY: { symbol: '₺', flag: '🇹🇷', rate: 32.1 },
  KZT: { symbol: '₸', flag: '🇰🇿', rate: 449.0 },
  UAH: { symbol: '₴', flag: '🇺🇦', rate: 41.2 },
};

// ===== Crypto Prices =====
export const CRYPTO_PRICES: Record<string, number> = {
  TON: 6.85,
  BTC: 71250,
  ETH: 3820,
  USDT: 1.0,
  LNC: LNC_RATE_USD,
};
