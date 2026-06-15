import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { CRYPTO_PRICES } from '../lib/constants';
import { dbUpdateBalance, dbCreateTransaction } from '../lib/db';
import { ArrowLeftIcon, SwapIcon } from '../components/Icons';

function getRate(from: string, to: string): number {
  // Special handling for LNC to ensure $0.05 rate
  return (CRYPTO_PRICES[from] || 1) / (CRYPTO_PRICES[to] || 1);
}

export default function SwapScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [fromCur, setFromCur] = useState('LNC');
  const [toCur, setToCur] = useState('TON');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  const [swapping, setSwapping] = useState(false);
  const [txId, setTxId] = useState('');

  if (!user) return null;

  const fromAcc = accounts.find(a => a.currency === fromCur);
  const toAcc = accounts.find(a => a.currency === toCur);
  const val = parseFloat(amount) || 0;
  const rate = getRate(fromCur, toCur);
  const received = val * rate;
  const fee = val * 0.001;
  const netSend = val + fee;
  const canSwap = fromAcc && toAcc && val > 0 && fromAcc.balance >= netSend;

  const flipPair = () => {
    haptic('light');
    const tmp = fromCur;
    setFromCur(toCur);
    setToCur(tmp);
    setAmount('');
  };

  const handleSwap = () => {
    if (!canSwap || !fromAcc || !toAcc) return;
    haptic('medium');
    setSwapping(true);

    setTimeout(() => {
      haptic('success');
      const id = uid();
      setTxId(id);

      updateBalance(fromAcc.id, -netSend);
      updateBalance(toAcc.id, received);
      dbUpdateBalance(fromAcc.id, -netSend).catch(() => {});
      dbUpdateBalance(toAcc.id, received).catch(() => {});

      addTx({
        id, from_user_id: user.telegram_id, to_user_id: user.telegram_id,
        from_account_id: fromAcc.id, to_account_id: toAcc.id,
        amount: val, fee, currency: fromCur as any,
        type: 'transfer', status: 'completed',
        note: `Swap ${fromCur} → ${toCur}`,
        created_at: new Date().toISOString(),
      });

      dbCreateTransaction({
        from_user_id: user.telegram_id, to_user_id: user.telegram_id,
        from_account_id: fromAcc.id, to_account_id: toAcc.id,
        amount: val, fee, currency: fromCur as any,
        type: 'transfer', status: 'completed',
        note: `Swap ${fromCur} → ${toCur}`,
      }).catch(() => {});

      addNotif({
        id: uid(), title: '💱 Обмен выполнен',
        message: `${val} ${fromCur} → ${received.toFixed(6)} ${toCur}`,
        type: 'system', read: false, created_at: new Date().toISOString(),
      });

      setSwapping(false);
      setStep('success');
    }, 1500);
  };

  const currencies = ['LNC', 'TON', 'USDT', 'BTC', 'ETH'];

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Обмен</h1>
      </div>

      {step === 'input' && (
        <div className="flex-1 px-5 mt-2 overflow-y-auto animate-fade-in pb-8">
          {/* FROM */}
          <div className="glass-accent p-4 mb-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/35 font-medium uppercase">Отдаёте</span>
              <span className="text-xs text-white/25 mono">{fromAcc ? fromAcc.balance.toFixed(4) : '0'} {fromCur}</span>
            </div>
            <div className="flex items-center gap-3">
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="flex-1 bg-transparent text-3xl font-extrabold mono outline-none text-white" />
              <select value={fromCur} onChange={e => { setFromCur(e.target.value); setAmount(''); }}
                className="bg-white/10 rounded-xl px-3 py-2 text-sm font-bold outline-none text-white">
                {currencies.map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2 mt-3">
              {[25, 50, 75, 100].map(p => (
                <button key={p} onClick={() => { if (fromAcc) setAmount((fromAcc.balance * p / 100).toFixed(6)); }}
                  className="flex-1 glass rounded-lg py-1.5 text-[11px] font-semibold text-white/50 active:scale-95 transition-transform">
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* FLIP */}
          <div className="flex justify-center -my-1 relative z-10">
            <button onClick={flipPair}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-90 active:rotate-180 transition-all duration-300 border border-white/10">
              <SwapIcon size={18} color="rgba(255,255,255,0.6)" />
            </button>
          </div>

          {/* TO */}
          <div className="glass p-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/35 font-medium uppercase">Получаете</span>
              <span className="text-xs text-white/25 mono">{toAcc ? toAcc.balance.toFixed(4) : '0'} {toCur}</span>
            </div>
            <div className="flex items-center gap-3">
              <p className="flex-1 text-3xl font-extrabold mono text-emerald-400">
                {val > 0 ? received.toFixed(6) : '0.00'}
              </p>
              <select value={toCur} onChange={e => setToCur(e.target.value)}
                className="bg-white/10 rounded-xl px-3 py-2 text-sm font-bold outline-none text-white">
                {currencies.filter(c => c !== fromCur).map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
              </select>
            </div>
          </div>

          {/* Info */}
          <div className="glass p-3 mt-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-white/35">Курс</span>
              <span className="mono">1 {fromCur} = {rate.toFixed(6)} {toCur}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/35">Комиссия (0.1%)</span>
              <span className="mono">{fee.toFixed(6)} {fromCur}</span>
            </div>
          </div>

          {!fromAcc && (
            <div className="glass p-3 mt-3 border border-amber-500/20 flex items-center gap-2">
              <span>⚠️</span>
              <p className="text-xs text-amber-400">Нет счёта в {fromCur}.
                <button onClick={() => go('open-account')} className="underline ml-1">Открыть</button>
              </p>
            </div>
          )}

          <button onClick={() => { haptic('medium'); setStep('confirm'); }} disabled={!canSwap}
            className="btn-primary w-full mt-6 text-base">
            Обменять {fromCur} → {toCur}
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="flex-1 px-5 mt-4 animate-fade-in">
          <div className="glass p-5 space-y-3 mb-6">
            <h3 className="text-center font-bold text-lg mb-2">Подтверждение обмена</h3>
            {[['Отдаёте', `${val.toFixed(6)} ${fromCur}`],
              ['Получаете', `${received.toFixed(6)} ${toCur}`],
              ['Курс', `1 ${fromCur} = ${rate.toFixed(6)} ${toCur}`],
              ['Комиссия', `${fee.toFixed(6)} ${fromCur}`],
              ['Итого', `${netSend.toFixed(6)} ${fromCur}`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0 last:font-bold">
                <span className="text-white/35 text-sm">{l}</span>
                <span className="text-sm mono">{v}</span>
              </div>
            ))}
          </div>
          <button onClick={handleSwap} disabled={swapping} className="btn-primary w-full">
            {swapping ? <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />Обмен...
            </span> : 'Подтвердить'}
          </button>
          <button onClick={() => setStep('input')} className="btn-ghost w-full mt-2">Изменить</button>
        </div>
      )}

      {step === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-fade-in">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center animate-check-pop">
              <SwapIcon size={40} color="#34d399" />
            </div>
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-emerald-500/10 animate-pulse-ring" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2">Обмен выполнен!</h2>
          <p className="text-white/40 text-sm mb-1">{val.toFixed(4)} {fromCur} → {received.toFixed(6)} {toCur}</p>
          <p className="text-xs text-white/20 mono mb-8">TX: {txId}</p>
          <button onClick={() => go('home')} className="btn-primary w-full max-w-sm">На главную</button>
          <button onClick={() => { setStep('input'); setAmount(''); }} className="btn-ghost w-full max-w-sm mt-2">Ещё обмен</button>
        </div>
      )}
    </div>
  );
}
