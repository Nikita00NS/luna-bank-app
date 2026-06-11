import React from 'react';
import { useStore } from '../lib/store';
import { formatMoney, balanceInUsd, haptic, getGreeting } from '../lib/utils';
import { CURRENCIES, LNC_RATE_USD } from '../lib/constants';

export default function HomeScreen() {
  const { user, accounts, go, notifs, dispCurrency, setDispCurrency, txs } = useStore();
  const g = getGreeting();
  const unread = notifs.filter(n => !n.read).length;
  if (!user) return null;

  const totalUsd = accounts.reduce((s, a) => s + balanceInUsd(a.balance, a.currency), 0);
  const cKeys = Object.keys(CURRENCIES);
  const cycleCur = () => { haptic('light'); setDispCurrency(cKeys[(cKeys.indexOf(dispCurrency) + 1) % cKeys.length]); };

  const actions = [
    { icon: '📤', label: 'Перевод', p: 'transfer' as const },
    { icon: '📥', label: 'Пополнить', p: 'deposit' as const },
    { icon: '💱', label: 'Обмен', p: 'swap' as const },
    { icon: '💎', label: 'Earn', p: 'earn' as const },
  ];

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { haptic('light'); go('profile'); }}>
            {user.photo_url ? <img src={user.photo_url} className="w-11 h-11 rounded-full ring-1 ring-white/10" alt="" /> :
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-lg font-bold">{user.first_name[0]}</div>}
          </button>
          <div>
            <p className="text-[11px] text-white/35 font-medium">{g.text} {g.emoji}</p>
            <p className="font-bold text-[15px] -mt-0.5">{user.first_name} {user.last_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cycleCur} className="glass rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform">
            {CURRENCIES[dispCurrency]?.flag} {dispCurrency}
          </button>
          <button onClick={() => { haptic('light'); go('notifications'); }} className="relative glass rounded-full w-10 h-10 flex items-center justify-center active:scale-95 transition-transform">
            🔔
            {unread > 0 && <div className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-black">{unread}</div>}
          </button>
        </div>
      </div>

      <div className="mx-5 mt-5 glass-accent rounded-3xl p-6 animate-slide-up">
        <p className="text-xs text-white/40 font-medium tracking-wide uppercase mb-1">Общий баланс</p>
        <p className="text-[42px] font-extrabold tabular-nums tracking-tighter leading-none">{formatMoney(totalUsd, dispCurrency)}</p>
        <p className="text-sm text-white/30 mt-2">{accounts.length} {accounts.length === 1 ? 'счёт' : accounts.length < 5 ? 'счёта' : 'счетов'} · 1 LNC = ${LNC_RATE_USD}</p>
        <div className="flex justify-between mt-6 gap-2">
          {actions.map(a => (
            <button key={a.label} onClick={() => { haptic('light'); go(a.p); }}
              className="flex flex-col items-center gap-2 flex-1 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all duration-200">
              <span className="text-[22px]">{a.icon}</span>
              <span className="text-[11px] text-white/50 font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[15px]">Мои счета</h3>
          <button onClick={() => { haptic('light'); go('open-account'); }} className="text-xs text-white/30 font-medium">+ Открыть</button>
        </div>
        {accounts.length === 0 ? (
          <button onClick={() => { haptic('medium'); go('open-account'); }} className="w-full glass rounded-2xl p-8 flex flex-col items-center gap-3 animate-fade-in active:scale-[0.98] transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center text-2xl">+</div>
            <p className="text-sm text-white/40">Откройте свой первый счёт</p>
          </button>
        ) : (
          <div className="space-y-2.5">
            {accounts.map((a, i) => (
              <button key={a.id} onClick={() => { haptic('light'); useStore.getState().selAccount(a.id); go('account-detail'); }}
                className="w-full glass rounded-2xl p-4 flex items-center gap-4 animate-slide-up active:scale-[0.98] transition-all duration-200"
                style={{animationDelay:`${i*0.06}s`}}>
                <div className="w-11 h-11 rounded-xl bg-white/[0.04] flex items-center justify-center text-xl">
                  {a.type==='personal'?'👤':a.type==='business'?'💼':a.type==='ton'?'💎':a.type==='usdt'?'💵':a.type==='bitcoin'?'₿':'Ξ'}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-[14px]">{a.name}</p>
                  <p className="text-[11px] text-white/30">{a.currency}</p>
                </div>
                <p className="font-bold tabular-nums text-[14px]">{formatMoney(balanceInUsd(a.balance, a.currency), dispCurrency)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {txs.length > 0 && (
        <div className="px-5 mt-7 mb-4">
          <h3 className="font-bold text-[15px] mb-3">Последние операции</h3>
          <div className="space-y-2">
            {txs.slice(0, 5).map(tx => (
              <div key={tx.id} className="glass rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-lg">
                  {tx.type==='transfer'?'📤':tx.type==='deposit'?'📥':tx.type==='subscription'?'⭐':tx.type==='job'?'💼':tx.type==='business'?'🏪':'💳'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.type==='transfer'?'Перевод':tx.type==='deposit'?'Пополнение':tx.type==='subscription'?'Подписка':tx.type==='job'?'Зарплата':tx.type==='business'?'Доход':'Карта'}</p>
                  <p className="text-[11px] text-white/30">{new Date(tx.created_at).toLocaleDateString('ru-RU')}</p>
                </div>
                <p className={`font-bold tabular-nums text-sm ${tx.from_user_id===user.telegram_id?'text-red-400':'text-emerald-400'}`}>
                  {tx.from_user_id===user.telegram_id?'-':'+'}{formatMoney(balanceInUsd(tx.amount, tx.currency), 'USD')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
