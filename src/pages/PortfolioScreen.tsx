import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon, TrendingUpIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';

interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  image: string;
  sparkline_in_7d?: { price: number[] };
}

const WATCHED_COINS = ['bitcoin', 'ethereum', 'the-open-network', 'tether', 'solana', 'dogecoin', 'ripple', 'cardano'];

export default function PortfolioScreen() {
  const { user, accounts, go } = useStore();
  const [prices, setPrices] = useState<CoinPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'portfolio' | 'watchlist'>('portfolio');
  const [lastUpdate, setLastUpdate] = useState('');

  if (!user) return null;

  useEffect(() => { fetchPrices(); }, []);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const resp = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${WATCHED_COINS.join(',')}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`
      );
      if (resp.ok) {
        const data = await resp.json();
        setPrices(data);
        setLastUpdate(new Date().toLocaleTimeString('ru-RU'));
      }
    } catch (err) {
      console.warn('[Portfolio] CoinGecko error:', err);
    }
    setLoading(false);
  };

  // Calculate portfolio value from accounts
  const symbolMap: Record<string, string> = { TON: 'the-open-network', BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether' };
  const portfolio = accounts
    .filter((a) => symbolMap[a.currency])
    .map((a) => {
      const coin = prices.find((p) => p.id === symbolMap[a.currency]);
      const value = a.balance * (coin?.current_price || 0);
      return { ...a, coinData: coin, value };
    })
    .filter((a) => a.balance > 0 || a.coinData);

  const totalValue = portfolio.reduce((s, p) => s + p.value, 0);

  const formatPrice = (n: number) => {
    if (n >= 1000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (n >= 1) return `$${n.toFixed(2)}`;
    return `$${n.toFixed(4)}`;
  };

  const formatCap = (n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Крипто-портфель</h1>
        <button onClick={() => { fetchPrices(); haptic('light'); }} className={`glass rounded-full w-8 h-8 flex items-center justify-center text-xs ${loading ? 'animate-spin' : ''}`}>🔄</button>
      </div>

      {/* Total value */}
      <div className="px-5 mt-2">
        <div className="glass-accent p-5 rounded-2xl">
          <p className="text-xs text-white/35 uppercase tracking-wide">Портфель</p>
          <p className="text-3xl font-extrabold mono mt-1">${totalValue.toFixed(2)}</p>
          {lastUpdate && <p className="text-[9px] text-white/20 mt-1">Обновлено: {lastUpdate}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 mt-3 flex gap-2">
        {(['portfolio', 'watchlist'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); haptic('light'); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'portfolio' ? '💼 Мои активы' : '📊 Рынок'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 mt-3">
        {loading ? (
          <div className="text-center py-10">
            <AnimatedEmoji type="loading" size={32} />
            <p className="text-white/30 text-sm mt-3">Загрузка цен...</p>
          </div>
        ) : tab === 'portfolio' ? (
          <div className="space-y-2 animate-fade-in">
            {portfolio.length === 0 ? (
              <div className="text-center py-10">
                <AnimatedEmoji type="wallet" size={48} />
                <p className="text-white/30 text-sm mt-3">Нет крипто-активов</p>
                <button onClick={() => go('ton-connect')} className="btn-primary mt-4 px-6">Подключить кошелёк</button>
              </div>
            ) : (
              portfolio.map((p, i) => {
                const change = p.coinData?.price_change_percentage_24h || 0;
                const pos = change >= 0;
                return (
                  <div key={p.id} className="glass p-4 rounded-2xl animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex items-center gap-3">
                      {p.coinData?.image && <img src={p.coinData.image} alt="" className="w-8 h-8 rounded-full" />}
                      <div className="flex-1">
                        <p className="font-bold text-sm">{p.currency}</p>
                        <p className="text-[10px] text-white/25">{p.coinData?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold mono text-sm">{formatPrice(p.coinData?.current_price || 0)}</p>
                        <p className={`text-[10px] mono ${pos ? 'text-emerald-400' : 'text-red-400'}`}>{pos ? '+' : ''}{change.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-white/[0.04] text-xs">
                      <span className="text-white/25">Баланс: {p.balance.toFixed(4)} {p.currency}</span>
                      <span className="mono font-bold">${p.value.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {prices.map((coin, i) => {
              const pos = coin.price_change_percentage_24h >= 0;
              const sparkline = coin.sparkline_in_7d?.price || [];
              const max = Math.max(...sparkline), min = Math.min(...sparkline), range = max - min || 1;
              const pts = sparkline.filter((_, j) => j % 4 === 0).map((v, j, arr) =>
                `${(j / (arr.length - 1)) * 80},${25 - ((v - min) / range) * 20}`
              ).join(' ');

              return (
                <div key={coin.id} className="glass p-3 flex items-center gap-3 rounded-xl animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
                  <img src={coin.image} alt="" className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{coin.name}</p>
                    <p className="text-[9px] text-white/20 uppercase">{coin.symbol} · {formatCap(coin.market_cap)}</p>
                  </div>
                  {sparkline.length > 0 && (
                    <svg width="80" height="25" className="opacity-50 shrink-0">
                      <polyline fill="none" stroke={pos ? '#34d399' : '#f87171'} strokeWidth="1.5" points={pts} />
                    </svg>
                  )}
                  <div className="text-right shrink-0">
                    <p className="font-bold mono text-sm">{formatPrice(coin.current_price)}</p>
                    <p className={`text-[10px] mono ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pos ? '+' : ''}{coin.price_change_percentage_24h.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
            <p className="text-center text-[9px] text-white/15 mt-2">Данные: CoinGecko API (реальные цены)</p>
          </div>
        )}
      </div>
    </div>
  );
}
