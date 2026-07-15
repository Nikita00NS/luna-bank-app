import React, { useEffect, useState, useCallback } from 'react';
import { useStore, TokenBalance } from '../lib/store';
import { fetchTonBalance, fetchJettons, shortAddress, fetchTransactions } from '../lib/ton';
import { getPrice } from '../lib/coingecko';
import { formatCrypto, formatUsd, haptic } from '../lib/utils';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { SendIcon, DownloadIcon, SwapIcon, ScanIcon } from '../components/Icons';

export default function HomeScreen() {
  const { tonWallet, tokens, setTokens, setTonWallet, go, txs, setTxs, loading, setLoading, hiddenTokens, totalUsdBalance, balanceVisible, toggleBalanceVisibility, setLastSync, selTx } = useStore();
  const [tonConnectUI] = useTonConnectUI();
  const tonWalletRaw = useTonWallet();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (tonWalletRaw?.account?.address) {
      const addr = tonWalletRaw.account.address;
      const raw = tonWalletRaw as any;
      if (addr !== tonWallet) setTonWallet(addr, raw.name || 'Wallet');
    }
  }, [tonWalletRaw]);

  const syncAll = useCallback(async () => {
    if (!tonWallet) return;
    setLoading(true);
    try {
      const [tonBal, jettons, recentTxs] = await Promise.all([fetchTonBalance(tonWallet), fetchJettons(tonWallet), fetchTransactions(tonWallet, 10)]);
      const list: TokenBalance[] = [];
      if (tonBal.ok) list.push({ symbol: 'TON', name: 'Toncoin', balance: tonBal.balance, decimals: 9, address: 'native', verified: true });
      for (const j of jettons) list.push(j);
      try { const p = await getPrice('the-open-network'); if (p) list.forEach(t => { if (t.symbol === 'TON') { t.priceUsd = p.current_price; t.priceChange24h = p.price_change_24h; } }); } catch {}
      setTokens(list);
      setTxs(recentTxs.map(tx => ({ hash: tx.hash, lt: tx.lt, timestamp: tx.timestamp, fee: tx.fee, from: tx.from, to: tx.to, value: tx.value, symbol: 'TON', comment: tx.comment, status: 'completed' as const })));
      setLastSync(Date.now());
    } catch (err) { console.warn('[Home]', err); }
    setLoading(false);
  }, [tonWallet]);

  useEffect(() => { syncAll(); }, [syncAll]);

  const handleRefresh = async () => { setRefreshing(true); haptic('medium'); await syncAll(); setTimeout(() => setRefreshing(false), 500); };
  const handleConnect = async () => { haptic('medium'); try { await tonConnectUI.openModal(); } catch {} };

  const visibleTokens = tokens.filter(t => !hiddenTokens.includes(t.symbol));

  return (
    <div className="page safe-top">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="text-sm font-semibold">Luna</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleRefresh} disabled={refreshing} className="w-8 h-8 rounded-lg flex items-center justify-center active:bg-[var(--bg-card)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}>
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button onClick={() => go('settings')} className="w-8 h-8 rounded-lg flex items-center justify-center active:bg-[var(--bg-card)]">
            <div className="w-7 h-7 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-[10px] font-medium text-[var(--text-secondary)]">U</div>
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="px-4 mt-6">
        <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Balance</p>
        <div className="flex items-center gap-2">
          <p className="text-4xl font-bold mono tracking-tight">{balanceVisible ? `$${totalUsdBalance.toFixed(2)}` : '••••••'}</p>
          <button onClick={toggleBalanceVisibility} className="text-xs text-[var(--text-tertiary)] px-2 py-1 rounded-lg active:bg-[var(--bg-card)] transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {balanceVisible ? <><path d="M1 12s4-8 11-8 11 8-4 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>}
            </svg>
          </button>
        </div>
        {tonWallet && <p className="text-xs text-[var(--text-tertiary)] mt-1.5 font-mono">{shortAddress(tonWallet)}</p>}
        {!tonWallet && <p className="text-xs text-[var(--orange)] mt-1.5">Wallet not connected</p>}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-1 px-4 mt-8">
        {[
          { icon: SendIcon, label: 'Send', page: 'send' as const, color: 'var(--accent)' },
          { icon: DownloadIcon, label: 'Receive', page: 'receive' as const, color: 'var(--green)' },
          { icon: SwapIcon, label: 'Swap', page: 'swap' as const, color: 'var(--orange)' },
          { icon: ScanIcon, label: 'Scan', page: 'qr-scan' as const, color: 'var(--text)' },
        ].map(a => (
          <button key={a.label} onClick={() => { if (!tonWallet && a.page !== 'receive') { handleConnect(); return; } haptic('light'); go(a.page); }}
            className="flex flex-col items-center gap-1.5 flex-1 active:opacity-70 transition-all">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] flex items-center justify-center border border-[var(--border)]">
              <a.icon size={20} color={a.color} />
            </div>
            <span className="text-[10px] font-medium text-[var(--text-secondary)]">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Connect / Assets */}
      {!tonWallet ? (
        <div className="px-4 mt-8">
          <button onClick={handleConnect} className="btn btn-primary">Connect Wallet</button>
          <p className="text-xs text-[var(--text-tertiary)] text-center mt-3">Connect via Tonkeeper or other TON wallet</p>
        </div>
      ) : (
        <>
          <div className="px-4 mt-8">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Assets</p>
            {visibleTokens.length === 0 ? (
              <div className="py-12 text-center"><p className="text-sm text-[var(--text-tertiary)]">No assets yet</p></div>
            ) : (
              <div className="space-y-0.5">
                {visibleTokens.map((token, i) => (
                  <button key={token.symbol} onClick={() => { haptic('light'); go('send'); }}
                    className="w-full flex items-center gap-3 py-3 px-3 rounded-xl active:bg-[var(--bg-card)] transition-all">
                    {token.image ? <img src={token.image} alt="" className="w-9 h-9 rounded-full" /> :
                      <div className="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">{token.symbol.slice(0, 2)}</div>
                    }
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">{token.symbol}</p>
                        {token.priceChange24h !== undefined && (
                          <span className={`text-[10px] font-medium ${token.priceChange24h >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                            {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">{token.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium mono">{formatCrypto(token.balance)}</p>
                      {token.priceUsd ? <p className="text-xs text-[var(--text-tertiary)]">${(token.balance * token.priceUsd).toFixed(2)}</p> : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          {txs.length > 0 && (
            <div className="px-4 mt-6 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Activity</p>
                <button onClick={() => go('history')} className="text-xs text-[var(--accent)]">View all</button>
              </div>
              <div className="space-y-0.5">
                {txs.slice(0, 5).map((tx, i) => {
                  const isIn = tx.to === tonWallet;
                  return (
                    <button key={tx.hash + i} onClick={() => { selTx(tx.hash); go('tx-detail'); }}
                      className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl active:bg-[var(--bg-card)] transition-all">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isIn ? 'bg-[var(--green)]/10' : 'bg-[var(--red)]/10'}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isIn ? 'var(--green)' : 'var(--red)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          {isIn ? <polyline points="7 13 12 18 17 13" /> : <polyline points="17 11 12 6 7 11" />}
                          <line x1="12" y1="18" x2="12" y2="6" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium">{isIn ? 'Received' : 'Sent'}</p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">{tx.comment || shortAddress(isIn ? tx.from : tx.to)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium mono ${isIn ? 'text-[var(--green)]' : ''}`}>{isIn ? '+' : '-'}{formatCrypto(tx.value)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}