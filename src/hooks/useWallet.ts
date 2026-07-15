/**
 * Luna Wallet v2 — useWallet hook
 * One hook to rule all wallet operations
 */

import { useCallback, useEffect, useState } from 'react';
import { useStore, TokenBalance } from '../lib/store';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { fetchTonBalance, fetchJettons, fetchTransactions, shortAddress, buildTransfer } from '../lib/ton';
import { getPrice } from '../lib/coingecko';
import { haptic } from '../lib/utils';
import { toastSuccess, toastError } from '../lib/toast';

export function useWallet() {
  const {
    tonWallet, tonWalletName, setTonWallet, tokens, setTokens, setTxs,
    totalUsdBalance, setLastSync,
    loading, setLoading, txs,
  } = useStore();
  
  const [tonConnectUI] = useTonConnectUI();
  const tonWalletRaw = useTonWallet();
  const [refreshing, setRefreshing] = useState(false);

  // Sync TON Connect wallet
  useEffect(() => {
    if (tonWalletRaw?.account?.address) {
      const addr = tonWalletRaw.account.address;
      const raw = tonWalletRaw as any;
      if (addr !== tonWallet) {
        setTonWallet(addr, raw.name || 'TON Wallet');
      }
    }
  }, [tonWalletRaw, tonWallet, setTonWallet]);

  // Full sync
  const sync = useCallback(async () => {
    if (!tonWallet) return;
    setLoading(true);
    try {
      const [tonBal, jettons, recentTxs] = await Promise.all([
        fetchTonBalance(tonWallet),
        fetchJettons(tonWallet),
        fetchTransactions(tonWallet, 15),
      ]);

      const list: TokenBalance[] = [];
      if (tonBal.ok) {
        list.push({ symbol: 'TON', name: 'Toncoin', balance: tonBal.balance, decimals: 9, address: 'native', verified: true });
      }
      for (const j of jettons) {
        list.push({ symbol: j.symbol, name: j.name, balance: j.balance, decimals: j.decimals, address: j.address, image: j.image, verified: j.verified, jettonWallet: j.jettonWallet });
      }

      // Fetch prices in parallel
      try {
        const [tonPrice, usdtPrice] = await Promise.all([
          getPrice('the-open-network'),
          getPrice('tether'),
        ]);
        if (tonPrice) {
          list.forEach(t => {
            if (t.symbol === 'TON') { t.priceUsd = tonPrice.current_price; t.priceChange24h = tonPrice.price_change_24h; }
          });
        }
        if (usdtPrice) {
          list.forEach(t => { if (t.symbol === 'USDT' || t.symbol === 'USD₮') t.priceUsd = usdtPrice.current_price; });
        }
      } catch {}

      setTokens(list);
      setTxs(recentTxs.map(tx => ({
        hash: tx.hash, lt: tx.lt, timestamp: tx.timestamp, fee: tx.fee,
        from: tx.from, to: tx.to, value: tx.value, symbol: 'TON',
        comment: tx.comment, status: 'completed' as const,
      })));
      setLastSync(Date.now());
    } catch (err) {
      console.warn('[useWallet] Sync error:', err);
    }
    setLoading(false);
  }, [tonWallet]);

  // Refresh
  const refresh = useCallback(async () => {
    setRefreshing(true); haptic('medium');
    await sync();
    setTimeout(() => setRefreshing(false), 500);
  }, [sync]);

  // Connect
  const connect = useCallback(async () => {
    haptic('medium');
    try { await tonConnectUI.openModal(); } catch {}
  }, [tonConnectUI]);

  // Disconnect
  const disconnect = useCallback(async () => {
    haptic('medium');
    await tonConnectUI.disconnect();
    setTonWallet(null);
  }, [tonConnectUI, setTonWallet]);

  // Send TON
  const sendTon = useCallback(async (to: string, amount: number, comment?: string) => {
    try {
      const tx = buildTransfer(to, amount, comment);
      const result = await tonConnectUI.sendTransaction(tx);
      if (result?.boc) {
        toastSuccess('Отправлено!', `${amount.toFixed(4)} TON → ${shortAddress(to)}`);
        await sync();
        return true;
      }
      return false;
    } catch (err: any) {
      toastError('Ошибка отправки', err?.message || 'Транзакция отклонена');
      return false;
    }
  }, [tonConnectUI, sync]);

  return {
    // State
    wallet: tonWallet,
    walletName: tonWalletName,
    tokens,
    txs,
    loading,
    refreshing,
    totalUsd: totalUsdBalance,
    connected: !!tonWallet,

    // Actions
    sync,
    refresh,
    connect,
    disconnect,
    sendTon,
  };
}