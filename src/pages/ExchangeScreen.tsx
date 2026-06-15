import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { CRYPTO_PRICES } from '../lib/constants';
import { dbUpdateBalance, dbCreateTransaction } from '../lib/db';
import { ArrowLeftIcon, ChartIcon, TrendingUpIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import LncIcon from '../components/LncIcon';

const COINS = [
  { sym: 'TON', name: 'Toncoin', price: CRYPTO_PRICES.TON, change: 5.2 },
  { sym: 'BTC', name: 'Bitcoin', price: CRYPTO_PRICES.BTC, change: 2.1 },
  { sym: 'ETH', name: 'Ethereum', price: CRYPTO_PRICES.ETH, change: -1.3 },
  { sym: 'LNC', name: 'Luna Coin', price: CRYPTO_PRICES.LNC, change: 0 },
];

function genChart(base: number, n = 40): number[] {
  const d: number[] = []; let p = base;
  for (let i = 0; i < n; i++) { p += p * (Math.random() - 0.48) * 0.03; d.push(p); }
  return d;
}

type TradeStep = 'form' | 'confirm' | 'success';

export default function ExchangeScreen() {
  const { user, accounts, go, updateBalance, addTx } = useStore();
  const [tab, setTab] = useState<'market' | 'trade' | 'orders'>('market');
  const [selCoin, setSelCoin] = useState<typeof COINS[0] | null>(null);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [tradeStep, setTradeStep] = useState<TradeStep>('form');
  const [lastOrderId, setLastOrderId] = useState('');
  const [charts] = useState(() => {
    const m: Record<string, number[]> = {};
    COINS.forEach(c => { m[c.sym] = genChart(c.price); });
    return m;
  });

  if (!user) return null;
  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const targetAcc = selCoin ? accounts.find(a => a.currency === selCoin.sym) : null;
  const val = parseFloat(amount) || 0;
  const price = selCoin?.price || 0;
  const lncPrice = CRYPTO_PRICES.LNC;
  const totalLNC = side === 'buy' ? (val * price / lncPrice) : val;

  const canExecute = selCoin && val > 0 && (
    side === 'buy'
      ? lncAcc && lncAcc.balance >= totalLNC
      : targetAcc && targetAcc.balance >= val
  );

  // Step 1: Go to confirm
  const goToConfirm = () => {
    if (!canExecute) { haptic('error'); return; }
    haptic('medium');
    setTradeStep('confirm');
  };

  // Step 2: Execute after confirmation
  const execute = () => {
    if (!selCoin || !lncAcc || val <= 0 || !canExecute) return;
    haptic('success');

    if (side === 'buy') {
      updateBalance(lncAcc.id, -totalLNC);
      if (targetAcc) updateBalance(targetAcc.id, val);
      dbUpdateBalance(lncAcc.id, -totalLNC).catch(() => {});
      if (targetAcc) dbUpdateBalance(targetAcc.id, val).catch(() => {});
    } else {
      if (!targetAcc) return;
      updateBalance(targetAcc.id, -val);
      updateBalance(lncAcc.id, totalLNC);
      dbUpdateBalance(targetAcc.id, -val).catch(() => {});
      dbUpdateBalance(lncAcc.id, totalLNC).catch(() => {});
    }

    const orderId = uid();
    const order = {
      id: orderId,
      coin: selCoin.sym,
      side,
      amount: val,
      price,
      total: totalLNC,
      time: new Date().toISOString(),
    };
    setOrders(prev => [order, ...prev]);
    setLastOrderId(orderId);

    addTx({
      id: orderId,
      from_user_id: user.telegram_id,
      to_user_id: user.telegram_id,
      from_account_id: side === 'buy' ? lncAcc.id : (targetAcc?.id || ''),
      to_account_id: side === 'buy' ? (targetAcc?.id || '') : lncAcc.id,
      amount: val,
      fee: 0,
      currency: selCoin.sym as any,
      type: 'transfer',
      status: 'completed',
      note: `${side.toUpperCase()} ${selCoin.sym}`,
      created_at: new Date().toISOString(),
    });

    setTradeStep('success');
  };

  const resetTrade = () => {
    setAmount('');
    setSelCoin(null);
    setTradeStep('form');
    setTab('market');
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => {
          if (tradeStep !== 'form') { setTradeStep('form'); return; }
          go('home');
        }} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Биржа Pro</h1>
      </div>

      {tradeStep === 'form' && (
        <>
          <div className="px-5 flex gap-2 mb-3">
            {(['market', 'trade', 'orders'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
                {t === 'market' ? '📈 Рынок' : t === 'trade' ? '💹 Торговля' : `📋 (${orders.length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-24">
            {tab === 'market' && (
              <div className="space-y-2.5 animate-fade-in">
                {COINS.map((coin, i) => {
                  const data = charts[coin.sym];
                  const pos = coin.change >= 0;
                  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
                  const pts = data.map((v, j) => `${(j / (data.length - 1)) * 100},${30 - ((v - min) / range) * 25}`).join(' ');
                  return (
                    <button key={coin.sym} onClick={() => { setSelCoin(coin); setTab('trade'); haptic('light'); }}
                      className="w-full glass p-4 flex items-center gap-4 animate-slide-up active:scale-[0.98] transition-all rounded-2xl"
                      style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-sm font-bold mono">{coin.sym.slice(0, 3)}</div>
                      <div className="flex-1 text-left"><p className="font-bold text-sm">{coin.name}</p><p className="text-[11px] text-white/30">{coin.sym}/LNC</p></div>
                      <svg width="100" height="30" className="opacity-50"><polyline fill="none" stroke={pos ? '#34d399' : '#f87171'} strokeWidth="1.5" points={pts} /></svg>
                      <div className="text-right ml-2">
                        <p className="font-bold mono text-sm">${coin.price >= 1 ? coin.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : coin.price.toFixed(4)}</p>
                        <p className={`text-[11px] mono ${pos ? 'text-emerald-400' : 'text-red-400'}`}>{pos ? '+' : ''}{coin.change}%</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {tab === 'trade' && (
              <div className="animate-fade-in">
                {!selCoin ? (
                  <div className="text-center py-16"><p className="text-white/35">Выберите монету на вкладке «Рынок»</p></div>
                ) : (
                  <>
                    <div className="glass-accent p-4 mb-4 rounded-2xl">
                      <p className="font-extrabold text-lg">{selCoin.name} <span className="text-white/30 text-sm">{selCoin.sym}/LNC</span></p>
                      <p className="text-3xl font-extrabold mono mt-1">${selCoin.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <button onClick={() => setSide('buy')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${side === 'buy' ? 'bg-emerald-500 text-white' : 'glass text-white/50'}`}>📈 Купить</button>
                      <button onClick={() => setSide('sell')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${side === 'sell' ? 'bg-red-500 text-white' : 'glass text-white/50'}`}>📉 Продать</button>
                    </div>

                    <div className="glass p-3 mb-3 rounded-xl">
                      <p className="text-xs text-white/35 mb-2">Количество {selCoin.sym}</p>
                      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                        className="w-full bg-transparent text-2xl font-extrabold mono outline-none text-white" />
                    </div>

                    {val > 0 && (
                      <div className="glass p-3 mb-4 space-y-2 rounded-xl">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/35">Курс</span>
                          <span className="mono">1 {selCoin.sym} = 🌙{(price / lncPrice).toFixed(2)} LNC</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-white/50">{side === 'buy' ? 'К оплате' : 'Получите'}</span>
                          <span className="mono">🌙{totalLNC.toFixed(2)} LNC</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={goToConfirm}
                      disabled={!canExecute}
                      className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.97] ${
                        side === 'buy' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                      } disabled:opacity-30`}
                    >
                      Продолжить →
                    </button>
                  </>
                )}
              </div>
            )}

            {tab === 'orders' && (
              <div className="animate-fade-in">
                {orders.length === 0 ? (
                  <div className="text-center py-16"><p className="text-white/35">Нет ордеров</p></div>
                ) : (
                  <div className="space-y-2">{orders.map((o, i) => (
                    <div key={o.id} className="glass p-3 flex items-center gap-3 animate-slide-up rounded-xl" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${o.side === 'buy' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {o.side === 'buy' ? '↑' : '↓'}
                      </div>
                      <div className="flex-1"><p className="font-bold text-sm">{o.side === 'buy' ? 'Покупка' : 'Продажа'} {o.coin}</p><p className="text-[11px] text-white/25">{new Date(o.time).toLocaleString('ru-RU')}</p></div>
                      <div className="text-right"><p className="font-bold mono text-sm">{o.amount.toFixed(4)} {o.coin}</p><p className="text-[11px] text-white/25 mono">🌙{o.total.toFixed(2)}</p></div>
                    </div>
                  ))}</div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== CONFIRM STEP ===== */}
      {tradeStep === 'confirm' && selCoin && (
        <div className="flex-1 px-5 mt-4 animate-fade-in overflow-y-auto pb-8">
          <div className="glass p-5 space-y-3 rounded-2xl mb-6">
            <div className="text-center mb-3">
              <AnimatedEmoji type="coin" size={48} />
              <h3 className="font-bold text-lg mt-2">Подтверждение ордера</h3>
            </div>

            {[
              ['📊 Операция', side === 'buy' ? 'Покупка' : 'Продажа'],
              ['💰 Монета', `${selCoin.name} (${selCoin.sym})`],
              ['📈 Курс', `$${selCoin.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
              ['🔢 Количество', `${val.toFixed(4)} ${selCoin.sym}`],
              ['💎 Стоимость', `≈ $${(val * price).toFixed(2)}`],
              [side === 'buy' ? '🔻 Списать' : '🔺 Получить', `🌙${totalLNC.toFixed(2)} LNC`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-white/[0.04] last:border-0 last:font-bold">
                <span className="text-white/35 text-sm">{label}</span>
                <span className="text-sm mono">{value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={execute}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.97] ${
              side === 'buy' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            ✅ {side === 'buy' ? 'Подтвердить покупку' : 'Подтвердить продажу'}
          </button>
          <button onClick={() => setTradeStep('form')} className="btn-ghost w-full mt-2">
            ← Изменить
          </button>
        </div>
      )}

      {/* ===== SUCCESS STEP ===== */}
      {tradeStep === 'success' && selCoin && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-fade-in">
          <AnimatedEmoji type="success" size={72} loop={false} />
          <h2 className="text-2xl font-extrabold mt-4 mb-2">Ордер выполнен!</h2>
          <p className="text-white/40 text-sm mb-1">
            {side === 'buy' ? 'Куплено' : 'Продано'} {val.toFixed(4)} {selCoin.sym}
          </p>
          <p className="text-white/25 text-xs mb-1">
            за 🌙{totalLNC.toFixed(2)} LNC
          </p>
          <p className="text-[10px] text-white/15 mono mb-8">ID: {lastOrderId}</p>

          <button onClick={resetTrade} className="btn-primary w-full max-w-sm">
            На биржу
          </button>
          <button onClick={() => go('home')} className="btn-ghost w-full max-w-sm mt-2">
            На главную
          </button>
        </div>
      )}
    </div>
  );
}
