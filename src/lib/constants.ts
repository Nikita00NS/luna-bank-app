// ===== LUNA WALLET — CONSTANTS =====

export const PROJECT_WALLET = 'UQA9IgVuB-8GUVRttmh4zjhg5yFYXBMhGHWyt7ASJF1VuZJD';

// ===== KNOWN TOKENS ON TON =====
export const KNOWN_TOKENS: Record<string, {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  coingeckoId?: string;
}> = {
  'TON': {
    symbol: 'TON',
    name: 'Toncoin',
    decimals: 9,
    address: 'native',
    coingeckoId: 'the-open-network',
  },
  'USDT': {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    address: 'EQCxE6mUtBJKFmn2kTORjOt1lZYcOKJfWQKxFs_s3A1NOI',
    coingeckoId: 'tether',
  },
  'HMSTR': {
    symbol: 'HMSTR',
    name: 'Hamster Kombat',
    decimals: 9,
    address: 'EQD6s6s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5',
    coingeckoId: 'hamster-kombat',
  },
  'tsTON': {
    symbol: 'tsTON',
    name: 'Tonstakers TON',
    decimals: 9,
    address: 'EQCxE6mUtBJKFmn2kTORjOt1lZYcOKJfWQKxFs_s3A1NOI',
    coingeckoId: 'tonstakers',
  },
};

// ===== FIAT CURRENCIES =====
export const FIAT_CURRENCIES = {
  RUB: { symbol: '₽', name: 'Рубль', flag: '🇷🇺' },
  USD: { symbol: '$', name: 'Dollar', flag: '🇺🇸' },
  EUR: { symbol: '€', name: 'Euro', flag: '🇪🇺' },
};

// ===== PAYMENT METHODS =====
export const PAYMENT_METHODS = [
  'Сбербанк',
  'Т-Банк',
  'Альфа-Банк',
  'ВТБ',
  'Райффайзен',
  'ЮMoney',
  'Qiwi',
  'Наличные',
];

// ===== DEX LIST =====
export const DEX_LIST = [
  { name: 'STON.fi', url: 'https://api.ston.fi/v1', icon: '🪨' },
  { name: 'DeDust', url: 'https://api.dedust.io/v1', icon: '🌪️' },
];

// ===== EXCHANGE AGGREGATOR LIST =====
export const EXCHANGES = [
  { name: 'BestChange', url: 'https://bestchange.ru', icon: '🔄', rating: 4.8 },
  { name: 'ChangeNOW', url: 'https://changenow.io', icon: '⚡', rating: 4.6 },
  { name: 'SwapSpace', url: 'https://swapspace.co', icon: '🌐', rating: 4.5 },
  { name: 'Exolix', url: 'https://exolix.com', icon: '💱', rating: 4.4 },
  { name: 'SimpleSwap', url: 'https://simpleswap.io', icon: '🔄', rating: 4.3 },
  { name: 'FixedFloat', url: 'https://fixedfloat.com', icon: '🔒', rating: 4.7 },
];

// ===== CHAIN EXPLORERS =====
export const TON_EXPLORER = 'https://tonviewer.com';
export const TON_EXPLORER_TX = 'https://tonviewer.com/transaction';