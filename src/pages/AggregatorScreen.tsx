import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { haptic, formatCrypto } from '../lib/utils';
import { EXCHANGES } from '../lib/constants';
import { ArrowLeftIcon, ExternalLinkIcon } from '../components/Icons';

export default function AggregatorScreen() {
  const { go, back, tokens } = useStore();

  const [fromCoin, setFromCoin] = useState('TON');
  const [toCoin, setToCoin] = useState('USDT');
  const [amount, setAmount] = useState('');

  const handleOpenExchange = (url: string) => {
    window.open(url, '_blank');
    haptic('light');
  };

  const coins = ['TON', 'USDT', 'BTC', 'ETH', 'USDC'];

  const getRate = (from: string, to: string) => {
    const rates: Record<string, Record<string, number>> = {
      TON: { USDT: 6.85, BTC: 0.000096, ETH: 0.0018, USDC: 6.85 },
      USDT: { TON: 0.146, BTC: 0.000014, ETH: 0.00026, USDC: 1.0 },
      BTC: { TON: 10416, USDT: 71350, ETH: 18.7, USDC: 71350 },
      ETH: { TON: 556, USDT: 3820, BTC: 0.0535, USDC: 3820 },
      USDC: { TON: 0.146, USDT: 1.0, BTC: 0.000014, ETH: 0.00026 },
    };
    return rates[from]?.[to] || 0;
  };

  const estimatedAmount = Number(amount) * getRate(fromCoin, toCoin);

  const handleSwapCoins = () => {
    setFromCoin(toCoin);
    setToCoin(fromCoin);
    haptic('light');
  };

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Aggregator</p>
      </div>

      <div className="px-4 mt-6 space-y-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-[var(--text-tertiary)]">From</label>
              <select value={fromCoin} onChange={(e) => setFromCoin(e.target.value)}
                className="w-full bg-transparent text-lg font-bold mt-1 outline-none text-white">
                {coins.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={handleSwapCoins}
              className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 bg-[var(--bg-card)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </button>
            <div className="flex-1">
              <label className="text-xs text-[var(--text-tertiary)]">To</label>
              <select value={toCoin} onChange={(e) => setToCoin(e.target.value)}
                className="w-full bg-transparent text-lg font-bold mt-1 outline-none text-right text-white">
                {coins.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-[var(--text-tertiary)]">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input text-2xl font-bold mono"
          />
        </div>

        {amount && Number(amount) > 0 && (
          <div className="card p-4 text-center">
            <p className="text-xs text-[var(--text-tertiary)]">Best rate</p>
            <p className="text-2xl font-bold mono mt-1">
              {formatCrypto(estimatedAmount)} {toCoin}
            </p>
            <p className="text-xs mt-1 text-[var(--text-tertiary)]">
              Rate: 1 {fromCoin} ≈ {getRate(fromCoin, toCoin)} {toCoin}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">
            Best rates on external services
          </p>
          {EXCHANGES.map((ex, i) => {
            const rate = getRate(fromCoin, toCoin) * (1 - (i * 0.005));
            return (
              <button key={ex.name}
                onClick={() => handleOpenExchange(ex.url)}
                className="w-full card p-3.5 flex items-center gap-3 active:scale-[0.98] transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-[var(--bg-surface)]">
                  {ex.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{ex.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-[var(--orange)/10] text-[var(--orange)]">
                      ★ {ex.rating}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    1 {fromCoin} → {rate.toFixed(6)} {toCoin}
                  </p>
                </div>
                <ExternalLinkIcon size={16} color="var(--text-tertiary)" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}