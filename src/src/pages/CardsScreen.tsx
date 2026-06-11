import React from 'react';
import { useStore } from '../lib/store';
import { formatMoney, balanceInUsd, haptic } from '../lib/utils';
const I:Record<string,string>={personal:'👤',business:'💼',ton:'💎',usdt:'💵',bitcoin:'₿',ethereum:'Ξ'};
export default function CardsScreen() {
  const { accounts, go, selAccount, dispCurrency } = useStore();
  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-6 flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">Счета</h1>
        <button onClick={()=>{haptic('light');go('open-account')}} className="glass rounded-full px-4 py-2 text-sm font-semibold active:scale-95 transition-transform">+ Открыть</button>
      </div>
      <div className="px-5">
        {accounts.length===0?(
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.03] flex items-center justify-center text-4xl mb-4 animate-float">🏦</div>
            <h3 className="text-lg font-bold mb-2">Нет открытых счетов</h3>
            <p className="text-white/35 text-sm text-center mb-6 max-w-[260px]">Откройте первый счёт с электронной подписью</p>
            <button onClick={()=>{haptic('medium');go('open-account')}} className="btn-primary px-8">Открыть счёт</button>
          </div>
        ):(
          <div className="space-y-3">
            {accounts.map((a,i)=>(
              <button key={a.id} onClick={()=>{haptic('light');selAccount(a.id);go('account-detail')}}
                className="w-full glass rounded-2xl p-5 text-left animate-slide-up active:scale-[0.98] transition-all duration-200"
                style={{animationDelay:`${i*0.06}s`}}>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center text-2xl">{I[a.type]||'💰'}</div>
                  <div className="flex-1">
                    <p className="font-bold">{a.name}</p>
                    <p className="text-xs text-white/30">{a.type==='personal'?'Личный':a.type==='business'?'Бизнес':a.currency} счёт</p>
                  </div>
                  {a.contract_signed && <span className="text-[10px] text-emerald-400/60 bg-emerald-400/10 px-2 py-0.5 rounded-lg">✓ Подписан</span>}
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] text-white/30">Баланс</p>
                    <p className="text-2xl font-extrabold tabular-nums">{formatMoney(balanceInUsd(a.balance,a.currency), dispCurrency)}</p>
                  </div>
                  <p className="text-xs text-white/20 tabular-nums">···{a.account_number.slice(-4)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
