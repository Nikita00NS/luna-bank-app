import { supabase } from './supabase';
import { useStore } from './store';

export interface CommissionRecord {
  id: string;
  user_id: string;
  type: 'swap' | 'service' | 'p2p' | 'fiat_onramp' | 'virtual_card' | 'transfer';
  amount_usd: number;
  amount_crypto: number;
  currency: string;
  commission_rate: number;
  commission_usd: number;
  commission_crypto: number;
  tx_hash?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface RevenueStats {
  total_revenue_usd: number;
  total_revenue_crypto: number;
  by_type: Record<string, { count: number; revenue_usd: number }>;
  by_currency: Record<string, { count: number; revenue_usd: number }>;
  last_24h: number;
  last_7d: number;
  last_30d: number;
}

export const DEFAULT_COMMISSION_RATES = {
  swap: 0.005,        // 0.5% on DEX swaps
  service: 0.05,      // 5% on service payments
  p2p: 0.01,          // 1% on P2P trades
  fiat_onramp: 0.01,  // 1% MoonPay affiliate
  virtual_card: 0.02, // 2% on virtual card issuance
  transfer: 0.001,    // 0.1% on transfers
};

export async function recordCommission(params: {
  userId: string;
  type: keyof typeof DEFAULT_COMMISSION_RATES;
  amountUsd: number;
  amountCrypto: number;
  currency: string;
  txHash?: string;
  metadata?: Record<string, any>;
}): Promise<CommissionRecord | null> {
  const rate = DEFAULT_COMMISSION_RATES[params.type] || 0.005;
  const commissionUsd = params.amountUsd * rate;
  const commissionCrypto = params.amountCrypto * rate;

  const record: Omit<CommissionRecord, 'id'> = {
    user_id: params.userId,
    type: params.type,
    amount_usd: params.amountUsd,
    amount_crypto: params.amountCrypto,
    currency: params.currency,
    commission_rate: rate,
    commission_usd: commissionUsd,
    commission_crypto: commissionCrypto,
    tx_hash: params.txHash,
    metadata: params.metadata,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('commissions')
      .insert(record)
      .select()
      .single();

    if (error) throw error;
    return data as CommissionRecord;
  } catch (err) {
    console.error('[Commission] Record error:', err);
    return null;
  }
}

export async function getRevenueStats(userId?: string): Promise<RevenueStats> {
  try {
    let query = supabase.from('commissions').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const records = data as CommissionRecord[];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const stats: RevenueStats = {
      total_revenue_usd: 0,
      total_revenue_crypto: 0,
      by_type: {},
      by_currency: {},
      last_24h: 0,
      last_7d: 0,
      last_30d: 0,
    };

    for (const r of records) {
      stats.total_revenue_usd += r.commission_usd;
      stats.total_revenue_crypto += r.commission_crypto;

      if (!stats.by_type[r.type]) {
        stats.by_type[r.type] = { count: 0, revenue_usd: 0 };
      }
      stats.by_type[r.type].count++;
      stats.by_type[r.type].revenue_usd += r.commission_usd;

      if (!stats.by_currency[r.currency]) {
        stats.by_currency[r.currency] = { count: 0, revenue_usd: 0 };
      }
      stats.by_currency[r.currency].count++;
      stats.by_currency[r.currency].revenue_usd += r.commission_usd;

      const created = new Date(r.created_at).getTime();
      if (now - created < dayMs) stats.last_24h += r.commission_usd;
      if (now - created < 7 * dayMs) stats.last_7d += r.commission_usd;
      if (now - created < 30 * dayMs) stats.last_30d += r.commission_usd;
    }

    return stats;
  } catch (err) {
    console.error('[Commission] Stats error:', err);
    return {
      total_revenue_usd: 0,
      total_revenue_crypto: 0,
      by_type: {},
      by_currency: {},
      last_24h: 0,
      last_7d: 0,
      last_30d: 0,
    };
  }
}

export async function getCommissionHistory(userId: string, limit: number = 50): Promise<CommissionRecord[]> {
  try {
    const { data, error } = await supabase
      .from('commissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as CommissionRecord[];
  } catch (err) {
    console.error('[Commission] History error:', err);
    return [];
  }
}

export function useCommissionTracker() {
  const { tonWallet } = useStore();

  const trackSwap = async (amountUsd: number, amountCrypto: number, currency: string, txHash: string) => {
    if (!tonWallet) return;
    return recordCommission({
      userId: tonWallet,
      type: 'swap',
      amountUsd,
      amountCrypto,
      currency,
      txHash,
    });
  };

  const trackService = async (amountUsd: number, amountCrypto: number, currency: string, txHash: string, serviceName: string) => {
    if (!tonWallet) return;
    return recordCommission({
      userId: tonWallet,
      type: 'service',
      amountUsd,
      amountCrypto,
      currency,
      txHash,
      metadata: { service: serviceName },
    });
  };

  const trackFiatOnramp = async (amountUsd: number, amountCrypto: number, currency: string, txHash: string) => {
    if (!tonWallet) return;
    return recordCommission({
      userId: tonWallet,
      type: 'fiat_onramp',
      amountUsd,
      amountCrypto,
      currency,
      txHash,
    });
  };

  const trackVirtualCard = async (amountUsd: number, amountCrypto: number, currency: string, txHash: string) => {
    if (!tonWallet) return;
    return recordCommission({
      userId: tonWallet,
      type: 'virtual_card',
      amountUsd,
      amountCrypto,
      currency,
      txHash,
    });
  };

  const trackP2P = async (amountUsd: number, amountCrypto: number, currency: string, txHash: string) => {
    if (!tonWallet) return;
    return recordCommission({
      userId: tonWallet,
      type: 'p2p',
      amountUsd,
      amountCrypto,
      currency,
      txHash,
    });
  };

  return { trackSwap, trackService, trackFiatOnramp, trackVirtualCard, trackP2P };
}