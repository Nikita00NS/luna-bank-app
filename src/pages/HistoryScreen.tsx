import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { formatMoney, balanceInUsd, haptic, timeAgo } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';
import LncIcon from '../components/LncIcon';

const TX_ICONS: Record<string, string> = {
  transfer: '📤',
  deposit: '📥',
  withdrawal: '📤',
  subscription: '⭐',
  job: '💼',
  business: '🏪',
  card: '💳',
};

const TX_LABELS: Record<string, string> = {
  transfer: 'Перевод',
  deposit: 'Пополнение',
  withdrawal: 'Оплата',
  subscription: 'Подписка',
  job: 'Работа',
  business: 'Бизнес',
  card: 'Карта',
};

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'transfer', label: 'Переводы' },
  { id: 'deposit', label: 'Пополнения' },
  { id: 'withdrawal', label: 'Оплаты' },
  { id: 'job', label: 'Работа' },
];

export default function HistoryScreen() {
  const { user, txs, go, selTx } = useStore();
  const [filter, setFilter] = useState('all');
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');

  if (!user) return null;

  // Filter transactions
  const filtered = useMemo(() => {
    let list = txs;

    if (filter !== 'all') {
      list = list.filter((t) => t.type === filter);
    }

    if (period !== 'all') {
      const now = Date.now();
      const ms = period === 'week' ? 7 * 86400000 : 30 * 86400000;
      list = list.filter((t) => now - new Date(t.created_at).getTime() < ms);
    }

    return list;
  }, [txs, filter, period]);

  // Stats for chart
  const stats = useMemo(() => {
    const byType: Record<string, { count: number; total: number }> = {};
    let totalIn = 0;
    let totalOut = 0;

    for (const tx of filtered) {
      const isOut = tx.from_user_id === user.telegram_id;
      const usd = balanceInUsd(tx.amount, tx.currency);

      if (isOut) totalOut += usd;
      else totalIn += usd;

      const key = tx.type;
      if (!byType[key]) byType[key] = { count: 0, total: 0 };
      byType[key].count++;
      byType[key].total += usd;
    }

    return { byType, totalIn, totalOut, net: totalIn - totalOut };
  }, [filtered, user.telegram_id]);

  // Chart bar data
  const chartBars = useMemo(() => {
    const entries = Object.entries(stats.byType).sort((a, b) => b[1].total - a[1].total);
    const max = entries.length > 0 ? Math.max(...entries.map(([, v]) => v.total)) : 1;
    return entries.map(([type, data]) => ({
      type,
      label: TX_LABELS[type] || type,
      icon: TX_ICONS[type] || '💰',
      count: data.count,
      total: data.total,
      pct: (data.total / max) * 100,
    }));
  }, [stats]);

  // Daily chart (last 7 or 30 days)
  const dailyChart = useMemo(() => {
    const days = period === 'week' ? 7 : 30;
    const buckets: number[] = new Array(days).fill(0);
    const now = Date.now();

    for (const tx of filtered) {
      const age = now - new Date(tx.created_at).getTime();
      const dayIndex = days - 1 - Math.floor(age / 86400000);
      if (dayIndex >= 0 && dayIndex < days) {
        const isOut = tx.from_user_id === user.telegram_id;
        buckets[dayIndex] += isOut ? -balanceInUsd(tx.amount, tx.currency) : balanceInUsd(tx.amount, tx.currency);
      }
    }

    const max = Math.max(1, ...buckets.map(Math.abs));
    return { buckets, max, days };
  }, [filtered, period, user.telegram_id]);

  const openDetail = (txId: string) => {
    haptic('light');
    selTx(txId);
    go('tx-detail');
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">История операций</h1>
        <span className="text-xs text-white/20">{filtered.length} операций</span>
      </div>

      {/* Period selector */}
      <div className="px-5 mt-1 flex gap-1.5 p-1 glass rounded-2xl">
        {(['week', 'month', 'all'] as const).map((p) => (
          <button key={p} onClick={() => { setPeriod(p); haptic('light'); }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${period === p ? 'bg-white text-black' : 'text-white/40'}`}>
            {p === 'week' ? '7 дней' : p === 'month' ? '30 дней' : 'Всё время'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {/* Summary cards */}
        <div className="flex gap-2 mt-4">
          <div className="flex-1 glass p-3 rounded-2xl">
            <p className="text-[9px] text-white/30 uppercase">Доход</p>
            <p className="text-lg font-extrabold text-emerald-400 mono">+{formatMoney(stats.totalIn, 'USD')}</p>
          </div>
          <div className="flex-1 glass p-3 rounded-2xl">
            <p className="text-[9px] text-white/30 uppercase">Расход</p>
            <p className="text-lg font-extrabold text-red-400 mono">-{formatMoney(stats.totalOut, 'USD')}</p>
          </div>
          <div className="flex-1 glass p-3 rounded-2xl">
            <p className="text-[9px] text-white/30 uppercase">Итого</p>
            <p className={`text-lg font-extrabold mono ${stats.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.net >= 0 ? '+' : ''}{formatMoney(stats.net, 'USD')}
            </p>
          </div>
        </div>

        {/* Daily activity chart */}
        {filtered.length > 0 && (
          <div className="mt-4 glass p-4 rounded-2xl">
            <p className="text-xs text-white/30 mb-3">Активность по дням</p>
            <div className="flex items-end gap-[2px] h-16">
              {dailyChart.buckets.map((val, i) => {
                const h = Math.abs(val) / dailyChart.max * 100;
                const pos = val >= 0;
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end h-full">
                    <div
                      className={`w-full rounded-t-sm min-h-[2px] transition-all ${pos ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
                      style={{ height: `${Math.max(3, h)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[8px] text-white/15 mt-1">
              <span>{dailyChart.days}д назад</span>
              <span>Сегодня</span>
            </div>
          </div>
        )}

        {/* By category chart */}
        {chartBars.length > 0 && (
          <div className="mt-4 glass p-4 rounded-2xl">
            <p className="text-xs text-white/30 mb-3">По категориям</p>
            <div className="space-y-2.5">
              {chartBars.map((bar) => (
                <div key={bar.type}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5">
                      <span>{bar.icon}</span>
                      <span className="text-white/60">{bar.label}</span>
                      <span className="text-white/20">({bar.count})</span>
                    </span>
                    <span className="mono font-bold">{formatMoney(bar.total, 'USD')}</span>
                  </div>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all"
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => { setFilter(f.id); haptic('light'); }}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === f.id ? 'bg-white text-black' : 'glass text-white/40'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        <div className="mt-3 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-white/30 text-sm">Нет операций за этот период</p>
            </div>
          ) : (
            filtered.map((tx, i) => {
              const isOut = tx.from_user_id === user.telegram_id;
              return (
                <button
                  key={tx.id}
                  onClick={() => openDetail(tx.id)}
                  className="w-full glass p-3 flex items-center gap-3 rounded-xl active:scale-[0.98] transition-all animate-slide-up text-left"
                  style={{ animationDelay: `${Math.min(i, 15) * 0.03}s` }}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                    isOut ? 'bg-red-500/10' : 'bg-emerald-500/10'
                  }`}>
                    {TX_ICONS[tx.type] || '💰'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.note || TX_LABELS[tx.type] || tx.type}</p>
                    <p className="text-[10px] text-white/25">{timeAgo(tx.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold mono text-sm ${isOut ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isOut ? '-' : '+'}{formatMoney(balanceInUsd(tx.amount, tx.currency), 'USD')}
                    </p>
                    <p className="text-[9px] text-white/20 mono">
                      <LncIcon size={9} animate={false} />{tx.amount}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
