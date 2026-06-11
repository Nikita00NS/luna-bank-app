import React, { useState, useEffect, useRef } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, formatMoney, balanceInUsd } from '../lib/utils';
import { CRYPTO_PRICES } from '../lib/constants';
import { dbUpdateBalance, dbCreateTransaction } from '../lib/sync';

const COINS = [
  { sym: 'TON', name: 'Toncoin', icon: '💎' },
  { sym: 'BTC', name: 'Bitcoin', icon: '₿' },
  { sym: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { sym: 'LNC', name: 'Luna Coin', icon: '◎' },
  { sym: 'USDT', name: 'Tether', icon: '💵' },
];

function genPriceHistory(base: number, points = 50): number[] {
  const data: number[] = [];
  let price = base;
  for (let i = 0; i < points; i++) {
    price += price * (Math.random() - 0.48) * 0.03;
    data.push(price);
  }
  return data;
}

function MiniChart({ data, positive }: { data: number[]; positive: boolean }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const h = 40;
  const w = 120;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline fill="none" stroke={positive ? '#34d399' : '#f87171'} strokeWidth="1.5" points={points} />
    </svg>
  );
}

export default function ExchangeScreen() {
  const { user, accounts, go, updateBalance, addTx } = useStore();
  const [tab, setTab] = useState<'market' | 'trade' | 'orders'>('market');
  const [selCoin, setSelCoin] = useState<typeof COINS[0] | null>(null);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [priceData] = useState(() => {
    const d: Record<string, number[]> = {};
    for (const c of COINS) d[c.sym] = genPriceHistory(CRYPTO_PRICES[c.sym]);
    return d;
  });
  const [orders, setOrders] = useState<any[]>([]);

  if (!user) return null;

  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const targetAcc = selCoin ? accounts.find(a => a.currency === selCoin.sym) : null;

  const val = parseFloat(amount) || 0;
  const price = selCoin ? CRYPTO_PRICES[selCoin.sym] : 0;
  const lncPrice = CRYPTO_PRICES.LNC;
  const totalLNC = side === 'buy' ? (val * price / lncPrice) : val;
  const totalCrypto = side === 'buy' ? val : (val * lncPrice / price);

  const executeTrade = () => {
    if (!selCoin || !lncAcc || val <= 0) return;
    haptic('success');

    if (side === 'buy') {
      if (lncAcc.balance < totalLNC) { haptic('error'); return; }
      updateBalance(lncAcc.id, -totalLNC);
      if (targetAcc) updateBalance(targetAcc.id, val);
      dbUpdateBalance(lncAcc.id, -totalLNC).catch(() => {});
      if (targetAcc) dbUpdateBalance(targetAcc.id, val).catch(() => {});
    } else {
      if (!targetAcc || targetAcc.balance < val) { haptic('error'); return; }
      updateBalance(targetAcc.id, -val);
      updateBalance(lncAcc.id, totalLNC);
      if (targetAcc) dbUpdateBalance(targetAcc.id, -val).catch(() => {});
      dbUpdateBalance(lncAcc.id, totalLNC).catch(() => {});
    }

    const order = {
      id: uid(), coin: selCoin.sym, side, amount: val, price,
      total: totalLNC, time: new Date().toISOString(), status: 'filled',
    };
    setOrders(prev => [order, ...prev]);

    addTx({
      id: order.id, from_user_id: user.telegram_id, to_user_id: user.telegram_id,
      from_account_id: side === 'buy' ? lncAcc.id : (targetAcc?.id || ''),
      to_account_id: side === 'buy' ? (targetAcc?.id || '') : lncAcc.id,
      amount: val, fee: 0, currency: selCoin.sym as any,
      type: 'transfer', status: 'completed',
      note: `${side.toUpperCase()} ${selCoin.sym}`,
      created_at: new Date().toISOString(),
    });

    setAmount('');
    setSelCoin(null);
    setTab('orders');
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">📊 Биржа Pro</h1>
      </div>

      <div className="px-5 flex gap-2 mb-3">
        {(['market', 'trade', 'orders'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'market' ? '📈 Рынок' : t === 'trade' ? '💹 Торговля' : '📋 Ордера'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {tab === 'market' && (
          <div className="space-y-2.5 animate-fade-in">
            {COINS.map((coin, i) => {
              const p = CRYPTO_PRICES[coin.sym];
              const data = priceData[coin.sym];
              const change = ((data[data.length - 1] - data[0]) / data[0] * 100);
              const pos = change >= 0;
              return (
                <button key={coin.sym} onClick={() => { setSelCoin(coin); setTab('trade'); haptic('light'); }}
                  className="w-full glass rounded-2xl p-4 flex items-center gap-4 animate-slide-up active:scale-[0.98] transition-all"
                  style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="w-11 h-11 rounded-xl bg-white/[0.04] flex items-center justify-center text-xl">{coin.icon}</div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm">{coin.name}</p>
                    <p className="text-[11px] text-white/30">{coin.sym}/USD</p>
                  </div>
                  <MiniChart data={data} positive={pos} />
                  <div className="text-right ml-2">
                    <p className="font-bold tabular-nums text-sm">${p >= 1 ? p.toLocaleString('en-US', { minimumFractionDigits: 2 }) : p.toFixed(4)}</p>
                    <p className={`text-[11px] tabular-nums ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pos ? '+' : ''}{change.toFixed(2)}%
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'trade' && (
          <div className="animate-fade-in">
            {!selCoin ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-white/35">Выберите монету на вкладке «Рынок»</p>
              </div>
            ) : (
              <>
                {/* Coin header */}
                <div className="glass-accent rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{selCoin.icon}</span>
                    <div>
                      <p className="font-extrabold text-lg">{selCoin.name}</p>
                      <p className="text-sm text-white/35">{selCoin.sym}/LNC</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="font-extrabold text-xl tabular-nums">${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  {/* Chart */}
                  <div className="bg-white/[0.03] rounded-xl p-3 mt-2">
                    <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">
                      {(() => {
                        const data = priceData[selCoin.sym];
                        const max = Math.max(...data), min = Math.min(...data);
                        const range = max - min || 1;
                        const pts = data.map((v, i) => `${(i / (data.length - 1)) * 300},${80 - ((v - min) / range) * 75}`).join(' ');
                        const pos = data[data.length - 1] >= data[0];
                        return (
                          <>
                            <defs>
                              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={pos ? '#34d399' : '#f87171'} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={pos ? '#34d399' : '#f87171'} stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <polygon fill="url(#cg)" points={`0,80 ${pts} 300,80`} />
                            <polyline fill="none" stroke={pos ? '#34d399' : '#f87171'} strokeWidth="2" points={pts} />
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* Buy/Sell toggle */}
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setSide('buy')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${side === 'buy' ? 'bg-emerald-500 text-white' : 'glass text-white/50'}`}>
                    📈 Купить
                  </button>
                  <button onClick={() => setSide('sell')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${side === 'sell' ? 'bg-red-500 text-white' : 'glass text-white/50'}`}>
                    📉 Продать
                  </button>
                </div>

                {/* Order type */}
                <div className="flex gap-2 mb-4">
                  {(['market', 'limit'] as const).map(t => (
                    <button key={t} onClick={() => setOrderType(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold ${orderType === t ? 'bg-white/10 text-white' : 'text-white/30'}`}>
                      {t === 'market' ? 'Рыночный' : 'Лимитный'}
                    </button>
                  ))}
                </div>

                {/* Amount */}
                <div className="glass rounded-xl p-3 mb-3">
                  <p className="text-xs text-white/35 mb-2">Количество {selCoin.sym}</p>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent text-2xl font-extrabold tabular-nums outline-none text-white" />
                </div>

                {orderType === 'limit' && (
                  <div className="glass rounded-xl p-3 mb-3">
                    <p className="text-xs text-white/35 mb-2">Цена (USD)</p>
                    <input type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)}
                      placeholder={price.toString()}
                      className="w-full bg-transparent text-xl font-bold tabular-nums outline-none text-white" />
                  </div>
                )}

                {/* Summary */}
                {val > 0 && (
                  <div className="glass rounded-xl p-3 mb-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/35">{side === 'buy' ? 'К оплате' : 'Получите'}</span>
                      <span className="tabular-nums font-bold">◎ {totalLNC.toFixed(2)} LNC</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/35">≈ USD</span>
                      <span className="tabular-nums">${(totalLNC * CRYPTO_PRICES.LNC).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button onClick={executeTrade} disabled={!val || (!lncAcc && side === 'buy')}
                  className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.97] ${
                    side === 'buy' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                  } disabled:opacity-30`}>
                  {side === 'buy' ? `Купить ${selCoin.sym}` : `Продать ${selCoin.sym}`}
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div className="animate-fade-in">
            {orders.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-white/35 mb-2">Нет ордеров</p>
                <p className="text-xs text-white/20">Совершите первую сделку</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((o, i) => (
                  <div key={o.id} className="glass rounded-xl p-3 flex items-center gap-3 animate-slide-up"
                    style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                      o.side === 'buy' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      {o.side === 'buy' ? '📈' : '📉'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{o.side === 'buy' ? 'Покупка' : 'Продажа'} {o.coin}</p>
                      <p className="text-[11px] text-white/25">{new Date(o.time).toLocaleString('ru-RU')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums text-sm">{o.amount.toFixed(4)} {o.coin}</p>
                      <p className="text-[11px] text-white/25">◎{o.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
