import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { getRevenueStats, getCommissionHistory, CommissionRecord } from '../lib/commission';
import { haptic, formatUsd } from '../lib/utils';
import { ArrowLeftIcon, RefreshIcon, DownloadIcon } from '../components/Icons';
import { toastSuccess } from '../lib/toast';

export default function AdminRevenueScreen() {
  const { go, back } = useStore();
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'history'>('overview');

  useEffect(() => {
    loadStats();
    loadHistory();
  }, []);

  const loadStats = async () => {
    const data = await getRevenueStats();
    setStats(data);
  };

  const loadHistory = async () => {
    setLoading(true);
    const data = await getCommissionHistory('all', 100);
    setHistory(data);
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Amount USD', 'Amount Crypto', 'Currency', 'Commission USD', 'Commission Crypto', 'Rate', 'Tx Hash'];
    const rows = history.map(r => [
      new Date(r.created_at).toLocaleString(),
      r.type,
      r.amount_usd.toFixed(2),
      r.amount_crypto.toFixed(6),
      r.currency,
      r.commission_usd.toFixed(4),
      r.commission_crypto.toFixed(6),
      (r.commission_rate * 100).toFixed(2) + '%',
      r.tx_hash || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess('Exported');
  };

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Revenue</p>
      </div>

      <div className="flex gap-1.5 px-4 mt-2">
        {(['overview', 'history'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); haptic('light'); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
            {t === 'overview' ? 'Overview' : 'History'}
          </button>
        ))}
      </div>

      {tab === 'overview' && stats && (
        <div className="px-4 mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <p className="text-xs text-[var(--text-tertiary)]">Total Revenue</p>
              <p className="text-2xl font-bold mono mt-1">{formatUsd(stats.total_revenue_usd)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-[var(--text-tertiary)]">Last 24h</p>
              <p className="text-2xl font-bold mono mt-1 text-[var(--green)]">{formatUsd(stats.last_24h)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-[var(--text-tertiary)]">Last 7d</p>
              <p className="text-2xl font-bold mono mt-1">{formatUsd(stats.last_7d)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-[var(--text-tertiary)]">Last 30d</p>
              <p className="text-2xl font-bold mono mt-1">{formatUsd(stats.last_30d)}</p>
            </div>
          </div>

          <div className="card p-4">
            <p className="font-semibold text-sm mb-3">By Type</p>
            <div className="space-y-2">
              {Object.entries(stats.by_type).map(([type, data]: [string, any]) => (
                <div key={type} className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-sm font-medium capitalize">{type}</span>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatUsd(data.revenue_usd)}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{data.count} transactions</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <p className="font-semibold text-sm mb-3">By Currency</p>
            <div className="space-y-2">
              {Object.entries(stats.by_currency).map(([currency, data]: [string, any]) => (
                <div key={currency} className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-sm font-medium">{currency}</span>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatUsd(data.revenue_usd)}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{data.count} transactions</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={exportCSV} className="btn btn-secondary flex-1 flex items-center justify-center gap-2">
              <DownloadIcon size={16} color="var(--text-secondary)" /> Export CSV
            </button>
            <button onClick={() => { loadStats(); loadHistory(); haptic('light'); }} className="btn btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading}>
              <RefreshIcon size={16} color="white" className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="px-4 mt-4">
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-14 w-full" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[var(--text-tertiary)]">No commission history</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((r) => (
                <div key={r.id} className="card p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-[var(--accent)/10] text-[var(--accent)] capitalize">{r.type}</span>
                      <span className="text-xs text-[var(--text-tertiary)]">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-[var(--green)]">{formatUsd(r.commission_usd)}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">Rate: {(r.commission_rate * 100).toFixed(2)}%</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
                    <span>{formatUsd(r.amount_usd)} {r.currency}</span>
                    <span>{r.tx_hash ? r.tx_hash.slice(0, 12) + '...' : 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}