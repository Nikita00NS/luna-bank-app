import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { formatMoney, balanceInUsd, getCommission, haptic } from '../lib/utils';
import { SUBSCRIPTION_PLANS } from '../lib/constants';
import { dbSearchUsers, dbGetUserAccounts, dbCreateTransaction, dbUpdateBalance, dbCreateNotification } from '../lib/sync';
import { notifyUser } from '../lib/telegram-bot';

export default function TransferScreen() {
  const { user, accounts, go, addTx, updateBalance, addNotif } = useStore();
  const [step, setStep] = useState<'search'|'amount'|'confirm'|'success'>('search');
  const [q, setQ] = useState('');
  const [fromId, setFromId] = useState(accounts[0]?.id||'');
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [txId, setTxId] = useState('');
  const R = { telegram_id:999888777, username:'recipient_user', first_name:'Alex', last_name:'Smith', luna_id:'LN12345678' };
  if (!user) return null;
  const from = accounts.find(a=>a.id===fromId);
  const val = parseFloat(amt)||0;
  const fee = from?getCommission(user.subscription, val):0;
  const total = val+fee;
  const QA = [50,100,500,1000,5000,10000];

  const confirm = () => {
    haptic('success');
    const id=uid(); setTxId(id);
    addTx({id,from_user_id:user.telegram_id,to_user_id:R.telegram_id,from_account_id:fromId,to_account_id:'r',amount:val,fee,currency:from!.currency,type:'transfer',status:'completed',note,created_at:new Date().toISOString()});
    updateBalance(fromId,-total);
    addNotif({id:uid(),title:'✅ Перевод',message:`${formatMoney(val,'USD')} → @${R.username}`,type:'transfer',read:false,created_at:new Date().toISOString()});
    setStep('success');
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={()=>step==='search'?go('home'):setStep('search')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">Перевод</h1>
      </div>
      {step==='search'&&(
        <div className="flex-1 px-5 mt-4 animate-fade-in">
          <div className="glass rounded-xl flex items-center px-4 gap-3">
            <span className="text-white/30">🔍</span>
            <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="@username или Luna ID"
              className="flex-1 bg-transparent py-3.5 text-white outline-none text-sm" />
          </div>
          {q&&<button onClick={()=>{haptic('medium');setStep('amount')}}
            className="w-full glass-accent rounded-2xl p-4 flex items-center gap-4 mt-4 active:scale-[0.98] transition-all">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl font-bold">{R.first_name[0]}</div>
            <div className="text-left"><p className="font-bold">{R.first_name} {R.last_name}</p><p className="text-xs text-white/35">@{R.username} · {R.luna_id}</p></div>
          </button>}
        </div>
      )}
      {step==='amount'&&(
        <div className="flex-1 px-5 mt-4 overflow-y-auto animate-fade-in pb-8">
          <div className="glass rounded-2xl p-3 flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold">{R.first_name[0]}</div>
            <div><p className="font-medium text-sm">{R.first_name} {R.last_name}</p><p className="text-[11px] text-white/30">@{R.username}</p></div>
          </div>
          <p className="text-xs text-white/35 mb-2 font-medium">Со счёта</p>
          <div className="space-y-1.5 mb-4">
            {accounts.map(a=><button key={a.id} onClick={()=>setFromId(a.id)} className={`w-full rounded-xl p-3 flex items-center gap-3 transition-all ${fromId===a.id?'bg-white/8 ring-1 ring-white/15':'bg-white/[0.03]'}`}>
              <div className="flex-1 text-left"><p className="text-sm font-medium">{a.name}</p><p className="text-[11px] text-white/30">{formatMoney(balanceInUsd(a.balance,a.currency),'USD')}</p></div>
            </button>)}
          </div>
          <p className="text-xs text-white/35 mb-2 font-medium">Сумма</p>
          <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="0.00"
            className="w-full glass rounded-xl px-4 py-4 bg-transparent text-white text-3xl font-extrabold tabular-nums outline-none text-center mb-3" />
          <div className="flex flex-wrap gap-2 mb-4">{QA.map(a=><button key={a} onClick={()=>setAmt(String(a))} className="glass rounded-lg px-3 py-1.5 text-xs tabular-nums active:scale-95 transition-transform">${a.toLocaleString()}</button>)}</div>
          <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Сообщение (необязательно)"
            className="w-full glass rounded-xl px-4 py-3 bg-transparent text-white text-sm outline-none mb-4" />
          {val>0&&<div className="glass rounded-xl p-3 mb-4 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-white/35">Комиссия ({SUBSCRIPTION_PLANS.find(p=>p.id===user.subscription)?.commission}%)</span><span className="tabular-nums">{formatMoney(fee,'USD')}</span></div>
            <div className="flex justify-between text-sm font-bold"><span>Итого</span><span className="tabular-nums">{formatMoney(total,'USD')}</span></div>
          </div>}
          <button onClick={()=>{if(!val||!from||from.balance<total){haptic('error');return;}haptic('medium');setStep('confirm')}} disabled={!val||!from||from.balance<total} className="btn-primary w-full">Продолжить</button>
        </div>
      )}
      {step==='confirm'&&(
        <div className="flex-1 px-5 mt-4 animate-fade-in">
          <div className="glass rounded-2xl p-5 space-y-3 mb-6">
            <h3 className="text-center font-bold text-lg mb-2">Подтверждение</h3>
            {[['Отправитель',`${user.first_name} ${user.last_name}`],['Получатель',`${R.first_name} ${R.last_name}`],['Счёт',from?.name||''],['Сумма',formatMoney(val,'USD')],['Комиссия',formatMoney(fee,'USD')],['Итого',formatMoney(total,'USD')]].map(([l,v])=>(
              <div key={l} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0 last:font-bold">
                <span className="text-white/35 text-sm">{l}</span><span className="text-sm tabular-nums">{v}</span>
              </div>
            ))}
          </div>
          <button onClick={confirm} className="btn-primary w-full">Подтвердить</button>
        </div>
      )}
      {step==='success'&&(
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-fade-in">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center animate-check-pop"><span className="text-5xl">✅</span></div>
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-emerald-500/10 animate-pulse-ring" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2">Перевод выполнен!</h2>
          <p className="text-white/35 text-sm mb-2">{formatMoney(val,'USD')} → @{R.username}</p>
          <p className="text-xs text-white/20 tabular-nums mb-8">TX: {txId}</p>
          <button onClick={()=>go('home')} className="btn-primary w-full max-w-sm">На главную</button>
        </div>
      )}
    </div>
  );
}
