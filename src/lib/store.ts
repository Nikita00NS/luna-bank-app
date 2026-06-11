import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ===== Types =====
export type AccountType = 'personal' | 'business' | 'ton' | 'usdt' | 'bitcoin' | 'ethereum';
export type Currency = 'LNC' | 'TON' | 'USDT' | 'BTC' | 'ETH';
export type KYCStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type SubscriptionPlan = 'free' | 'plus' | 'cosmic';
export type CardType = 'virtual' | 'premium' | 'plastic';
export type CardDesign = 'classic' | 'white' | 'gradient' | 'night' | 'ocean' | 'metal';

export type Page =
  | 'splash' | 'onboarding' | 'welcome' | 'home'
  | 'cards' | 'account-detail' | 'open-account'
  | 'transfer' | 'deposit' | 'receive' | 'qr'
  | 'profile' | 'subscription' | 'kyc' | 'settings'
  | 'notifications' | 'chat' | 'news' | 'city'
  | 'faq' | 'admin' | 'ton-connect' | 'markets'
  | 'swap' | 'exchange' | 'earn'
  | 'games' | 'nft'
  | 'social' | 'payments' | 'themes' | 'escrow'
  | 'job-game';

export interface User {
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  pin_hash: string;
  role: 'user' | 'admin' | 'owner';
  luna_id: string;
  level: number;
  xp: number;
  kyc_status: KYCStatus;
  subscription: SubscriptionPlan;
  subscription_expires?: string;
  created_at: string;
  display_currency: string;
  biometrics_enabled: boolean;
}

export interface Account {
  id: string;
  user_id: number;
  type: AccountType;
  name: string;
  currency: Currency;
  balance: number;
  account_number: string;
  iban: string;
  created_at: string;
  wallet_address?: string;
  contract_signed?: boolean;
  signature_data?: string;
}

export interface Card {
  id: string;
  account_id: string;
  type: CardType;
  design: CardDesign;
  number: string;
  cvv: string;
  expiry: string;
  holder: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  from_user_id: number;
  to_user_id: number;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  fee: number;
  currency: Currency;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'subscription' | 'job' | 'business' | 'card';
  status: 'pending' | 'completed' | 'failed';
  note?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'transfer' | 'deposit' | 'system' | 'promo';
  read: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface OwnedBusiness {
  id: string;
  type: string;
  name: string;
  income: number;
}

// ===== Helpers =====
export const uid = () =>
  Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

export const genAccNum = () =>
  Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join('');

export const genIBAN = () =>
  'LU' + Array.from({ length: 22 }, () => Math.floor(Math.random() * 10)).join('');

export const genCardNum = () =>
  Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('')
  ).join(' ');

export const genCVV = () =>
  Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join('');

export const genExpiry = () =>
  `${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}/28`;

export const genLunaId = () =>
  'LN' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');

// ===== Store Interface =====
interface AppState {
  // Navigation
  page: Page;
  prevPage: Page | null;
  tab: number;
  go: (p: Page) => void;
  back: () => void;
  setTab: (t: number) => void;

  // Auth
  authed: boolean;
  isNew: boolean;
  user: User | null;
  setUser: (u: User) => void;
  setAuthed: (v: boolean) => void;
  setIsNew: (v: boolean) => void;
  patchUser: (p: Partial<User>) => void;

  // Accounts
  accounts: Account[];
  selAccountId: string | null;
  addAccount: (a: Account) => void;
  setAccounts: (accs: Account[]) => void;
  updateBalance: (id: string, delta: number) => void;
  selAccount: (id: string | null) => void;

  // Cards
  cards: Card[];
  addCard: (c: Card) => void;

  // Transactions
  txs: Transaction[];
  addTx: (t: Transaction) => void;
  setTxs: (txs: Transaction[]) => void;

  // Notifications
  notifs: Notification[];
  addNotif: (n: Notification) => void;
  readNotif: (id: string) => void;
  unreadCount: () => number;

  // TON
  tonWallet: string | null;
  setTonWallet: (a: string | null) => void;

  // City
  businesses: OwnedBusiness[];
  jobCooldowns: Record<string, number>;
  addBiz: (b: OwnedBusiness) => void;
  setJobCD: (jobId: string, until: number) => void;

  // Chat
  aiMsgs: ChatMessage[];
  supportMsgs: ChatMessage[];
  addAiMsg: (m: ChatMessage) => void;
  addSupportMsg: (m: ChatMessage) => void;

  // Display
  dispCurrency: string;
  setDispCurrency: (c: string) => void;

  // Auth
  logout: () => void;
}

// ===== Store =====
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      page: 'splash',
      prevPage: null,
      tab: 0,
      go: (p) => set((s) => ({ page: p, prevPage: s.page })),
      back: () => set((s) => ({ page: s.prevPage || 'home', prevPage: null })),
      setTab: (t) => {
        const pages: Page[] = ['home', 'cards', 'city', 'news', 'chat'];
        set({ tab: t, page: pages[t], prevPage: null });
      },

      // Auth
      authed: false,
      isNew: true,
      user: null,
      setUser: (u) => set({ user: u }),
      setAuthed: (v) => set({ authed: v }),
      setIsNew: (v) => set({ isNew: v }),
      patchUser: (p) => set((s) => ({
        user: s.user ? { ...s.user, ...p } : null,
      })),

      // Accounts
      accounts: [],
      selAccountId: null,
      addAccount: (a) => set((s) => ({ accounts: [...s.accounts, a] })),
      setAccounts: (accs) => set({ accounts: accs }),
      updateBalance: (id, delta) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === id
              ? { ...a, balance: Math.round((a.balance + delta) * 100) / 100 }
              : a
          ),
        })),
      selAccount: (id) => set({ selAccountId: id }),

      // Cards
      cards: [],
      addCard: (c) => set((s) => ({ cards: [...s.cards, c] })),

      // Transactions
      txs: [],
      addTx: (t) => set((s) => ({ txs: [t, ...s.txs] })),
      setTxs: (txs) => set({ txs }),

      // Notifications
      notifs: [],
      addNotif: (n) => set((s) => ({ notifs: [n, ...s.notifs] })),
      readNotif: (id) =>
        set((s) => ({
          notifs: s.notifs.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      unreadCount: () => get().notifs.filter((n) => !n.read).length,

      // TON
      tonWallet: null,
      setTonWallet: (a) => set({ tonWallet: a }),

      // City
      businesses: [],
      jobCooldowns: {},
      addBiz: (b) => set((s) => ({ businesses: [...s.businesses, b] })),
      setJobCD: (jobId, until) =>
        set((s) => ({ jobCooldowns: { ...s.jobCooldowns, [jobId]: until } })),

      // Chat
      aiMsgs: [],
      supportMsgs: [],
      addAiMsg: (m) => set((s) => ({ aiMsgs: [...s.aiMsgs, m] })),
      addSupportMsg: (m) => set((s) => ({ supportMsgs: [...s.supportMsgs, m] })),

      // Display
      dispCurrency: 'USD',
      setDispCurrency: (c) => set({ dispCurrency: c }),

      // Logout
      logout: () => set({ authed: false, page: 'welcome' }),
    }),
    {
      name: 'luna-bank-v3',
      partialize: (s) => ({
        user: s.user,
        isNew: s.isNew,
        accounts: s.accounts,
        cards: s.cards,
        txs: s.txs,
        notifs: s.notifs,
        tonWallet: s.tonWallet,
        businesses: s.businesses,
        jobCooldowns: s.jobCooldowns,
        dispCurrency: s.dispCurrency,
      }),
    }
  )
);
