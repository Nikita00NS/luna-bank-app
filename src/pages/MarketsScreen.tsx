import React from 'react';
import { useStore } from '../lib/store';
import { CRYPTO_PRICES } from '../lib/constants';
import { ArrowLeftIcon, TrendingUpIcon } from '../components/Icons';

const MARKET_DATA = [
  { sym: 'TON', name: 'Toncoin', price: CRYPTO_PRICES.TON, change: 5.2 },
  { sym: 'BTC', name: 'Bitcoin', price: CRYPTO_PRICES.BTC, change: 2.1 },
  { sym: 'ETH', name: 'Ethereum', price: CRYPTO_PRICES.ETH, change: -1.3 },
  { sym: 'USDT', name: 'Tether', price: CRYPTO_PRICES.USDT, change: 0.01 },
  { sym: 'LNC', name: 'Luna Coin', price: CRYPTO_PRICES.LNC, change: 0 },
  { sym: 'SOL', name: 'Solana', price: 178.5, change: 8.4 },
  { sym: 'BNB', name: 'BNB', price: 605.2, change: -0.8 },
  { sym: 'DOGE', name: 'Dogecoin', price: 0.082, change: 12.3 },
];

// Mini SVG sparkline
function Sparkline({ positive }: { positive: boolean }) {
  const points = Array.from({ length: 20 }, (_, i) => {
    const y = 15 + Math.sin(i * 0.5 + (positive ? 0 : 3)) * 8 + (positive ? -i * 0.3 : i * 0.3);
    return `${i * 5},${Math.max(2, Math.min(28, y))}`;
  }).join(' ');

  return (
    <svg width="100" height="30" className="opacity-50">
      <polyline
        fill="none"
        stroke={positive ? '#34d399' : '#f87171'}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

export default function MarketsScreen() {
  const { go } = useStore();

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">Курсы криптовалют</h1>
        <TrendingUpIcon size={20} color="rgba(255,255,255,0.3)" />
      </div>

      {/* Market list */}
      <div className="px-5 mt-4 space-y-2">
        {MARKET_DATA.map((coin, i) => {
          const positive = coin.change >= 0;

          return (
            <div
              key={coin.sym}
              className="glass p-4 flex items-center gap-4 animate-slide-up"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              {/* Symbol circle */}
              <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-sm font-bold mono">
                {coin.sym.slice(0, 3)}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{coin.name}</p>
                <p className="text-[11px] text-white/30">{coin.sym}/USD</p>
              </div>

              {/* Sparkline */}
              <Sparkline positive={positive} />

              {/* Price + Change */}
              <div className="text-right ml-2">
                <p className="font-bold mono text-sm">
                  ${coin.price >= 1
                    ? coin.price.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : coin.price.toFixed(4)}
                </p>
                <p
                  className={`text-[11px] mono ${
                    positive ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {positive ? '+' : ''}
                  {coin.change}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
