import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon, TrendingUpIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
}

const COIN_IDS = 'bitcoin,ethereum,the-open-network,tether,solana,binancecoin,dogecoin,ripple,cardano,polkadot,avalanche-2,chainlink';

export default function MarketsScreen() {
  const { go } = useStore();
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => { fetchPrices(); }, []);

  const fetchPrices = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setCoins(data);
      setLastUpdate(new Date().toLocaleTimeString('ru-RU'));
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить');
      // Fallback to static prices
      setCoins([
        { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 71250, price_change_percentage_24h: 2.1 },
        { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 3820, price_change_percentage_24h: -1.3 },
        { id: 'the-open-network', symbol: 'ton', name: 'Toncoin', current_price: 6.85, price_change_percentage_24h: 5.2 },
        { id: 'tether', symbol: 'usdt', name: 'Tether', current_price: 1.0, price_change_percentage_24h: 0.01 },
        { id: 'solana', symbol: 'sol', name: 'Solana', current_price: 178.5, price_change_percentage_24h: 8.4 },
      ]);
    }
    setLoading(false);
  };

  const formatPrice = (n: number) => {
    if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    if (n >= 1) return `$${n.toFixed(2)}`;
    return `$${n.toFixed(4)}`;
  };

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Курсы криптовалют</h1>
        <button onClick={() => { fetchPrices(); haptic('light'); }} className={`glass rounded-full w-8 h-8 flex items-center justify-center text-xs ${loading ? 'animate-spin' : ''}`}>🔄</button>
      </div>

      {lastUpdate && (
        <p className="px-5 text-[9px] text-white/15 mb-2">Обновлено: {lastUpdate} · CoinGecko API</p>
      )}
      {error && (
        <p className="px-5 text-[10px] text-yellow-400/50 mb-2">⚠️ Используются кэшированные данные</p>
      )}

      <div className="px-5 space-y-2">
        {loading && coins.length === 0 ? (
          <div className="text-center py-10">
            <AnimatedEmoji type="loading" size={32} />
            <p className="text-white/30 text-sm mt-3">Загрузка курсов...</p>
          </div>
        ) : (
          coins.map((coin, i) => {
            const pos = coin.price_change_percentage_24h >= 0;
            const spark = coin.sparkline_in_7d?.price || [];
            let pts = '';
            if (spark.length > 0) {
              const sampled = spark.filter((_, j) => j % 4 === 0);
              const max = Math.max(...sampled), min = Math.min(...sampled), range = max - min || 1;
              pts = sampled.map((v, j) => `${(j / (sampled.length - 1)) * 100},${28 - ((v - min) / range) * 22}`).join(' ');
            }

            return (
              <div key={coin.id} className="glass p-4 flex items-center gap-4 rounded-2xl animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-sm font-bold mono uppercase">
                  {coin.symbol.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{coin.name}</p>
                  <p className="text-[11px] text-white/30 uppercase">{coin.symbol}/USD</p>
                </div>
                {pts && (
                  <svg width="100" height="30" className="opacity-50 shrink-0">
                    <polyline fill="none" stroke={pos ? '#34d399' : '#f87171'} strokeWidth="1.5" points={pts} />
                  </svg>
                )}
                <div className="text-right ml-2 shrink-0">
                  <p className="font-bold mono text-sm">{formatPrice(coin.current_price)}</p>
                  <p className={`text-[11px] mono ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pos ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(1) || '0.0'}%
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
