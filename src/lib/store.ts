import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Page =
  | 'home' | 'send' | 'receive' | 'swap' | 'history'
  | 'tx-detail' | 'portfolio' | 'p2p' | 'settings'
  | 'profile' | 'qr-scan' | 'nfc-pay' | 'ble-transfer'
  | 'aggregator' | 'token-detail' | 'nft-gallery' | 'notifications'
  | 'seed-phrase' | 'faq' | 'splash'
  | 'services' | 'service-pay' | 'virtual-cards' | 'service-history'
  | 'admin' | 'admin-users' | 'admin-support' | 'admin-services' | 'admin-settings' | 'admin-revenue';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin' | 'owner';
  subscription: 'free' | 'plus' | 'pro' | 'business';
  subscription_expires: string;
  commission_rate: number;
  created_at: string;
}

export interface TokenBalance {
  symbol: string; name: string; balance: number; decimals: number;
  address: string; image?: string; verified: boolean;
  priceUsd?: number; priceChange24h?: number; jettonWallet?: string;
}

export interface BlockchainTx {
  hash: string; lt: string; timestamp: number; fee: number;
  from: string; to: string; value: number; symbol: string;
  comment?: string; status: 'completed' | 'pending' | 'failed';
}

export interface NFTItem {
  address: string; name: string; image: string; collection: string; description?: string;
}

export interface ServicePurchase {
  id: string; user_id: string; service_name: string;
  service_category: string; period: string;
  price_usd: number; price_crypto: number; crypto_currency: string;
  activation_code: string; status: 'active' | 'expired' | 'pending';
  tx_hash: string; created_at: string; expires_at: string;
}

export interface VirtualCard {
  id: string; user_id: string; card_number: string;
  cvv: string; expiry: string; balance: number;
  status: 'active' | 'frozen' | 'closed'; created_at: string;
}

export interface SupportTicket {
  id: string; user_id: string; user_name: string;
  subject: string; message: string; status: 'open' | 'answered' | 'closed';
  admin_response: string; created_at: string; updated_at: string;
}

export interface AppNotification {
  id: string; title: string; message: string;
  type: 'transaction' | 'system' | 'service' | 'support';
  read: boolean; created_at: string;
}

export interface AppEvent {
  id: string; title: string; description: string;
  date: string; type: 'maintenance' | 'update' | 'promo' | 'announcement';
  active: boolean; created_at: string;
}

interface AppState {
  page: Page; prevPage: Page | null;
  go: (p: Page) => void; back: () => void;

  // Wallet
  tonWallet: string | null; tonWalletName: string | null;
  setTonWallet: (a: string | null, name?: string) => void;
  walletReady: boolean;

  // Tokens
  tokens: TokenBalance[]; setTokens: (t: TokenBalance[]) => void;
  updateTokenBalance: (symbol: string, balance: number) => void;
  totalUsdBalance: number;

  // Transactions
  txs: BlockchainTx[]; setTxs: (txs: BlockchainTx[]) => void;
  addTx: (tx: BlockchainTx) => void;
  selTxHash: string | null; selTx: (hash: string | null) => void;

  nfts: NFTItem[]; setNfts: (n: NFTItem[]) => void;

  notifications: AppNotification[];
  addNotification: (n: AppNotification) => void;
  setNotifications: (n: AppNotification[]) => void;
  markRead: (id: string) => void; unreadCount: () => number;

  // Services
  purchases: ServicePurchase[]; setPurchases: (p: ServicePurchase[]) => void;
  addPurchase: (p: ServicePurchase) => void;
  virtualCards: VirtualCard[]; setVirtualCards: (c: VirtualCard[]) => void;

  // Admin
  users: User[]; setUsers: (u: User[]) => void;
  supportTickets: SupportTicket[]; setSupportTickets: (t: SupportTicket[]) => void;
  events: AppEvent[]; setEvents: (e: AppEvent[]) => void;
  maintenanceMode: boolean; setMaintenanceMode: (v: boolean) => void;
  systemCommission: number; setSystemCommission: (v: number) => void;

  // UI
  loading: boolean; setLoading: (v: boolean) => void;
  hiddenTokens: string[]; toggleHiddenToken: (symbol: string) => void;
  lastSync: number; setLastSync: (t: number) => void;
  balanceVisible: boolean; toggleBalanceVisibility: () => void;
}

export const uid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      page: 'splash' as Page, prevPage: null,
      go: (p) => set((s) => ({ page: p, prevPage: s.page })),
      back: () => set((s) => ({ page: s.prevPage || 'home', prevPage: null })),

      tonWallet: null, tonWalletName: null,
      setTonWallet: (a, name) => set({ tonWallet: a, tonWalletName: name || null, walletReady: !!a }),
      walletReady: false,

      tokens: [],
      setTokens: (tokens) => set((s) => {
        const total = tokens.reduce((sum, t) => sum + (t.balance * (t.priceUsd || 0)), 0);
        return { tokens, totalUsdBalance: total };
      }),
      updateTokenBalance: (symbol, balance) => set((s) => {
        const ts = s.tokens.map((t) => t.symbol === symbol ? { ...t, balance } : t);
        return { tokens: ts, totalUsdBalance: ts.reduce((sum, t) => sum + (t.balance * (t.priceUsd || 0)), 0) };
      }),
      totalUsdBalance: 0,

      txs: [], setTxs: (txs) => set({ txs }),
      addTx: (tx) => set((s) => ({ txs: [tx, ...s.txs].slice(0, 100) })),
      selTxHash: null, selTx: (hash) => set({ selTxHash: hash }),

      nfts: [], setNfts: (nfts) => set({ nfts }),

      notifications: [],
      addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications].slice(0, 50) })),
      setNotifications: (n) => set({ notifications: n }),
      markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) })),
      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      purchases: [], setPurchases: (p) => set({ purchases: p }),
      addPurchase: (p) => set((s) => ({ purchases: [p, ...s.purchases] })),
      virtualCards: [], setVirtualCards: (c) => set({ virtualCards: c }),

      users: [], setUsers: (u) => set({ users: u }),
      supportTickets: [], setSupportTickets: (t) => set({ supportTickets: t }),
      events: [], setEvents: (e) => set({ events: e }),
      maintenanceMode: false, setMaintenanceMode: (v) => set({ maintenanceMode: v }),
      systemCommission: 0.005, setSystemCommission: (v) => set({ systemCommission: v }),

      loading: false, setLoading: (v) => set({ loading: v }),
      hiddenTokens: [],
      toggleHiddenToken: (symbol) => set((s) => ({
        hiddenTokens: s.hiddenTokens.includes(symbol)
          ? s.hiddenTokens.filter((h) => h !== symbol)
          : [...s.hiddenTokens, symbol],
      })),
      lastSync: 0, setLastSync: (t) => set({ lastSync: t }),
      balanceVisible: true,
      toggleBalanceVisibility: () => set((s) => ({ balanceVisible: !s.balanceVisible })),
    }),
    {
      name: 'luna-wallet',
      partialize: (s) => ({
        tonWallet: s.tonWallet, tonWalletName: s.tonWalletName, walletReady: s.walletReady,
        tokens: s.tokens, txs: s.txs, nfts: s.nfts,
        hiddenTokens: s.hiddenTokens, totalUsdBalance: s.totalUsdBalance,
        notifications: s.notifications, balanceVisible: s.balanceVisible,
        purchases: s.purchases, virtualCards: s.virtualCards,
        users: s.users, supportTickets: s.supportTickets, events: s.events,
        maintenanceMode: s.maintenanceMode, systemCommission: s.systemCommission,
      }),
    }
  )
);