import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { CRYPTO_PRICES } from '../lib/constants';
import { dbUpdateBalance, dbCreateTransaction } from '../lib/db';
import { ArrowLeftIcon, ChartIcon, TrendingUpIcon, CheckCircleIcon, CoinsIcon, DiamondIcon } from '../components/Icons';

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
      <div className="px-5 pt-4 pb-2 flex items-center gap-4 border-b border-white/[0.04]">
        <button onClick={() => {
          if (tradeStep !== 'form') { setTradeStep('form'); return; }
          go('home');
        }} className="text-white/60 hover:text-white transition-colors p-1 -ml-1"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-extrabold text-[17px] flex-1 text-white tracking-tight">Биржа Pro</h1>
      </div>

      {tradeStep === 'form' && (
        <>
          <div className="px-5 mt-3 flex gap-1.5 p-1.5 glass rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            {(['market', 'trade', 'orders'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === t ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-white/40 hover:text-white/70'}`}>
                {t === 'market' ? 'Котировки' : t === 'trade' ? 'Торговля' : `Ордера (${orders.length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-24 mt-4">
            {tab === 'market' && (
              <div className="space-y-2.5 animate-fade-in">
                {COINS.map((coin, i) => {
                  const data = charts[coin.sym];
                  const pos = coin.change >= 0;
                  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
                  const pts = data.map((v, j) => `${(j / (data.length - 1)) * 100},${30 - ((v - min) / range) * 25}`).join(' ');
                  return (
                    <button key={coin.sym} onClick={() => { setSelCoin(coin); setTab('trade'); haptic('light'); }}
                      className="w-full glass p-4 flex items-center gap-4 animate-slide-up active:scale-[0.98] transition-all rounded-2xl border border-white/10 hover:border-white/20 bg-gradient-to-r from-white/[0.04] to-transparent"
                      style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-sm font-extrabold mono text-amber-400 shrink-0">{coin.sym.slice(0, 3)}</div>
                      <div className="flex-1 text-left"><p className="font-extrabold text-sm text-white">{coin.name}</p><p className="text-[11px] text-white/40 font-medium">{coin.sym}/LNC</p></div>
                      <svg width="100" height="30" className="opacity-70"><polyline fill="none" stroke={pos ? '#34d399' : '#f87171'} strokeWidth="2" points={pts} /></svg>
                      <div className="text-right ml-2">
                        <p className="font-extrabold mono text-sm text-white">${coin.price >= 1 ? coin.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : coin.price.toFixed(4)}</p>
                        <p className={`text-[11px] mono font-bold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>{pos ? '+' : ''}{coin.change}%</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {tab === 'trade' && (
              <div className="animate-fade-in">
                {!selCoin ? (
                  <div className="text-center py-16"><p className="text-white/35">Выберите монету на вкладке «Котировки»</p></div>
                ) : (
                  <>
                    <div className="glass p-5 mb-5 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent">
                      <div className="flex justify-between items-center">
                        <p className="font-extrabold text-lg text-white">{selCoin.name} <span className="text-white/40 text-sm mono">{selCoin.sym}/LNC</span></p>
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mono">Спот</span>
                      </div>
                      <p className="text-3xl font-extrabold mono mt-2 text-white">${selCoin.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="flex gap-2.5 mb-5 p-1.5 glass rounded-2xl border border-white/10">
                      <button onClick={() => setSide('buy')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${side === 'buy' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/50 hover:text-white'}`}>Купить {selCoin.sym}</button>
                      <button onClick={() => setSide('sell')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${side === 'sell' ? 'bg-red-500 text-black shadow-lg shadow-red-500/20' : 'text-white/50 hover:text-white'}`}>Продать {selCoin.sym}</button>
                    </div>

                    <div className="glass p-4 mb-4 rounded-2xl border border-white/10">
                      <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Количество {selCoin.sym}</p>
                      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                        className="w-full bg-transparent text-3xl font-extrabold mono outline-none text-white text-center" />
                    </div>

                    {val > 0 && (
                      <div className="glass p-4 mb-5 space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.02]">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/40 font-medium">Текущий курс</span>
                          <span className="mono font-semibold text-white">1 {selCoin.sym} = {(price / lncPrice).toFixed(2)} LNC</span>
                        </div>
                        <div className="h-px bg-white/[0.08]" />
                        <div className="flex justify-between text-sm font-extrabold text-white">
                          <span>{side === 'buy' ? 'К списанию' : 'Получите на баланс'}</span>
                          <span className="mono text-amber-400">{totalLNC.toFixed(2)} LNC</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={goToConfirm}
                      disabled={!canExecute}
                      className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.97] shadow-lg ${
                        side === 'buy' ? 'bg-emerald-500 text-black shadow-emerald-500/20' : 'bg-red-500 text-black shadow-red-500/20'
                      } disabled:opacity-30 disabled:shadow-none`}
                    >
                      Перейти к подтверждению ордера →
                    </button>
                  </>
                )}
              </div>
            )}

            {tab === 'orders' && (
              <div className="animate-fade-in">
                {orders.length === 0 ? (
                  <div className="text-center py-16"><p className="text-white/40 font-bold text-sm">История ордеров пуста</p></div>
                ) : (
                  <div className="space-y-2.5">{orders.map((o, i) => (
                    <div key={o.id} className="glass p-3.5 flex items-center gap-3.5 animate-slide-up rounded-2xl border border-white/10" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${o.side === 'buy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        <TrendingUpIcon size={18} />
                      </div>
                      <div className="flex-1 min-w-0"><p className="font-bold text-sm text-white">{o.side === 'buy' ? 'Покупка' : 'Продажа'} {o.coin}</p><p className="text-[11px] text-white/40 mt-0.5 font-medium">{new Date(o.time).toLocaleString('ru-RU')}</p></div>
                      <div className="text-right"><p className="font-extrabold mono text-sm text-white">{o.amount.toFixed(4)} {o.coin}</p><p className="text-[11px] text-amber-400 font-semibold mono">{o.total.toFixed(2)} LNC</p></div>
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
          <div className="glass p-6 space-y-4 rounded-3xl mb-6 border border-white/15 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
                <CoinsIcon size={32} />
              </div>
              <h3 className="font-extrabold text-lg text-white">Подтверждение биржевого ордера</h3>
            </div>

            {[
              ['Тип операции', side === 'buy' ? 'Покупка (Спот)' : 'Продажа (Спот)'],
              ['Торговая пара', `${selCoin.name} (${selCoin.sym})`],
              ['Курс исполнения', `$${selCoin.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
              ['Объём ордера', `${val.toFixed(4)} ${selCoin.sym}`],
              ['Оценочная стоимость в USD', `≈ $${(val * price).toFixed(2)}`],
              [side === 'buy' ? 'Списать с баланса' : 'Зачислить на баланс', `${totalLNC.toFixed(2)} LNC`],
            ].map(([label, value], idx) => (
              <div key={label} className={`flex justify-between py-2 border-b border-white/[0.06] last:border-0 ${idx === 5 ? 'font-extrabold text-white pt-3 text-base' : 'text-sm'}`}>
                <span className="text-white/40 font-medium shrink-0">{label}</span>
                <span className="mono text-right font-semibold text-white/90 truncate max-w-[55%]">{value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={execute}
            className={`w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-xl ${
              side === 'buy' ? 'bg-emerald-500 text-black shadow-emerald-500/25' : 'bg-red-500 text-black shadow-red-500/25'
            }`}
          >
            <CheckCircleIcon size={18} /> {side === 'buy' ? 'Разместить ордер на покупку' : 'Разместить ордер на продажу'}
          </button>
          <button onClick={() => setTradeStep('form')} className="btn-ghost w-full mt-3 py-3 rounded-2xl font-semibold text-white/60 hover:text-white">
            ← Вернуться и изменить параметры
          </button>
        </div>
      )}

      {/* ===== SUCCESS STEP ===== */}
      {tradeStep === 'success' && selCoin && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-fade-in text-center">
          <div className="w-24 h-24 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/20 mb-6">
            <CheckCircleIcon size={56} />
          </div>
          <h2 className="text-2xl font-extrabold mt-2 mb-2 text-white">Ордер успешно выполнен!</h2>
          <p className="text-emerald-400 font-bold text-lg mono mb-1">
            {side === 'buy' ? 'Куплено' : 'Продано'} {val.toFixed(4)} {selCoin.sym}
          </p>
          <p className="text-white/40 text-xs mb-1">
            Сумма сделки: {totalLNC.toFixed(2)} LNC
          </p>
          <p className="text-[10px] text-white/20 mono mb-8 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/5">ID ордера: {lastOrderId}</p>

          <button onClick={resetTrade} className="btn-primary w-full max-w-sm py-4 rounded-2xl font-bold mb-3">
            Новая торговая операция
          </button>
          <button onClick={() => go('home')} className="btn-ghost w-full max-w-sm py-3.5 rounded-2xl font-semibold border border-white/10 hover:border-white/20">
            Вернуться на главную
          </button>
        </div>
      )}
    </div>
  );
}
