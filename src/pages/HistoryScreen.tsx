import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../lib/store';
import { fetchTransactions } from '../lib/ton';
import { formatCrypto, formatTimeAgo, haptic } from '../lib/utils';
import { shortAddress } from '../lib/ton';
import { ArrowLeftIcon } from '../components/Icons';

export default function HistoryScreen() {
  const { go, back, tonWallet, txs, setTxs, selTx } = useStore();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');

  const fetchHistory = useCallback(async () => {
    if (!tonWallet) return;
    setLoading(true);
    const history = await fetchTransactions(tonWallet, 30);
    setTxs(history.map(tx => ({ hash: tx.hash, lt: tx.lt, timestamp: tx.timestamp, fee: tx.fee, from: tx.from, to: tx.to, value: tx.value, symbol: 'TON', comment: tx.comment, status: 'completed' as const })));
    setLoading(false);
  }, [tonWallet, setTxs]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = txs.filter(tx => {
    if (filter === 'incoming') return tx.to === tonWallet;
    if (filter === 'outgoing') return tx.from === tonWallet;
    return true;
  });

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Activity</p>
      </div>
      <div className="flex gap-1.5 px-4 mt-2">
        {(['all', 'incoming', 'outgoing'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
            {f === 'all' ? 'All' : f === 'incoming' ? 'Received' : 'Sent'}
          </button>
        ))}
      </div>
      <div className="px-4 mt-4 space-y-0.5">
        {loading && filtered.length === 0 ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-14 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[var(--text-tertiary)]">{filter === 'all' ? 'No transactions yet' : 'No ' + filter + ' transactions'}</p>
          </div>
        ) : (
          filtered.map((tx, i) => {
            const isIn = tx.to === tonWallet;
            return (
              <button key={tx.hash + i} onClick={() => { selTx(tx.hash); go('tx-detail'); }}
                className="list-item">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isIn ? 'bg-[var(--green)]/10' : 'bg-[var(--red)]/10'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isIn ? 'var(--green)' : 'var(--red)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                  <p className="text-[10px] text-[var(--text-tertiary)]">{formatTimeAgo(tx.timestamp)}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
