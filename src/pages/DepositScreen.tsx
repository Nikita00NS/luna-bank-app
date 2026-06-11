import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { formatMoney, haptic, shortAddr, balanceInUsd } from '../lib/utils';
import { CRYPTO_PRICES, PROJECT_WALLET } from '../lib/constants';
export default function DepositScreen() {
  const { user, accounts, tonWallet, go, updateBalance, addTx, addNotif } = useStore();
  const [step, setStep] = useState<'sel'|'crypto'|'wait'|'recv'|'ok'>('sel');
  const [accId, setAccId] = useState(accounts[0]?.id||'');
  const [amt, setAmt] = useState('');
  if (!user) return null;
  const acc = accounts.find(a=>a.id===accId);
  const val = parseFloat(amt)||0;
  const tonAmt = val/CRYPTO_PRICES.TON;
  const pay = () => { haptic('medium'); setStep('wait'); setTimeout(()=>{haptic('success');updateBalance(accId,val);addTx({id:uid(),from_user_id:0,to_user_id:user.telegram_id,from_account_id:'ext',to_account_id:accId,amount:val,fee:0,currency:acc?.currency||'LNC',type:'deposit',status:'completed',created_at:new Date().toISOString()});addNotif({id:uid(),title:'📥 Пополнение',message:`${formatMoney(val,'USD')} зачислено`,type:'deposit',read:false,created_at:new Date().toISOString()});setStep('ok');},3000);};
  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={()=>step==='sel'?go('home'):setStep('sel')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">Пополнение</h1>
      </div>
      {step==='sel'&&<div className="flex-1 px-5 mt-4 overflow-y-auto animate-fade-in pb-8">
        <p className="text-xs text-white/35 mb-2 font-medium">Счёт</p>
        <div className="space-y-1.5 mb-4">{accounts.map(a=><button key={a.id} onClick={()=>setAccId(a.id)} className={`w-full rounded-xl p-3 flex items-center gap-3 transition-all ${accId===a.id?'bg-white/8 ring-1 ring-white/15':'bg-white/[0.03]'}`}><div className="flex-1 text-left"><p className="text-sm font-medium">{a.name}</p><p className="text-[11px] text-white/30">{formatMoney(balanceInUsd(a.balance,a.currency),'USD')}</p></div></button>)}</div>
        {accounts.length===0?<div className="text-center py-10"><p className="text-white/35 mb-4">Сначала откройте счёт</p><button onClick={()=>go('open-account')} className="btn-primary px-8">Открыть</button></div>:<>
        <p className="text-xs text-white/35 mb-2 font-medium">Сумма</p>
        <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="0.00" className="w-full glass rounded-xl px-4 py-4 bg-transparent text-white text-3xl font-extrabold tabular-nums outline-none text-center mb-3" />
        <div className="flex flex-wrap gap-2 mb-6">{[50,100,500,1000,5000,10000].map(a=><button key={a} onClick={()=>setAmt(String(a))} className="glass rounded-lg px-3 py-1.5 text-xs tabular-nums">${a.toLocaleString()}</button>)}</div>
        <div className="space-y-3"><button onClick={()=>{if(!val){haptic('error');return;}haptic('medium');setStep('crypto')}} disabled={!val} className="btn-primary w-full">💎 Купить за крипту</button>
        <button onClick={()=>{haptic('light');setStep('recv')}} className="btn-secondary w-full">📥 Получить перевод</button></div></>}
      </div>}
      {step==='crypto'&&<div className="flex-1 px-5 mt-4 animate-fade-in">
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="text-center font-bold text-lg mb-2">Оплата</h3>
          {[['Сумма',formatMoney(val,'USD')],['Курс TON',`$${CRYPTO_PRICES.TON}`],['К оплате',`💎 ${tonAmt.toFixed(4)} TON`],['Кошелёк',tonWallet?shortAddr(tonWallet):'Не подключён'],['Зачисление',acc?.name||'']].map(([l,v])=>(
            <div key={l} className="flex justify-between py-1.5 border-b border-white/[0.04]"><span className="text-white/35 text-sm">{l}</span><span className="text-sm tabular-nums">{v}</span></div>))}
        </div>
        {!tonWallet&&<div className="glass rounded-xl p-4 mt-4 flex items-center gap-3 border border-amber-500/20"><span className="text-xl">⚠️</span><div className="flex-1"><p className="text-sm font-medium text-amber-400">Подключите кошелёк</p></div><button onClick={()=>go('ton-connect')} className="text-xs bg-white/8 px-3 py-1.5 rounded-lg">→</button></div>}
        <button onClick={pay} disabled={!tonWallet} className="btn-primary w-full mt-6">Оплатить 💎 {tonAmt.toFixed(4)} TON</button>
      </div>}
      {step==='wait'&&<div className="flex-1 flex flex-col items-center justify-center px-5"><div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mb-6" /><h3 className="text-lg font-bold mb-2">Ожидание...</h3><p className="text-sm text-white/35 text-center">Подтвердите транзакцию</p></div>}
      {step==='recv'&&<div className="flex-1 px-5 mt-4 animate-fade-in">
        <div className="glass rounded-2xl p-6 flex flex-col items-center"><div className="w-48 h-48 bg-white rounded-2xl p-4 mb-4 flex items-center justify-center"><div className="text-center"><img src="/logo.png" alt="" className="w-16 h-16 mx-auto mb-2 object-contain" /><p className="text-black font-bold">Luna Bank</p><p className="text-black/40 text-xs font-mono mt-1">{user.luna_id}</p></div></div><p className="text-sm text-white/35">QR для отправителя</p></div>
        <div className="glass rounded-2xl p-4 mt-4 space-y-2">
          {[['IBAN',acc?.iban||'—'],['SWIFT','LUNABKXX'],['Luna ID',user.luna_id],['Username',`@${user.username}`]].map(([l,v])=>(
            <div key={l} className="flex justify-between items-center"><span className="text-xs text-white/30">{l}</span><button onClick={()=>{navigator.clipboard.writeText(v);haptic('light')}} className="text-xs tabular-nums flex items-center gap-1">{v} 📋</button></div>))}
        </div>
      </div>}
      {step==='ok'&&<div className="flex-1 flex flex-col items-center justify-center px-5 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center animate-check-pop mb-6"><span className="text-4xl">✅</span></div>
        <h2 className="text-2xl font-extrabold mb-2">Зачислено!</h2>
        <p className="text-white/35 text-sm mb-8">{formatMoney(val,'USD')} → {acc?.name}</p>
        <button onClick={()=>go('home')} className="btn-primary w-full max-w-sm">На главную</button>
      </div>}
    </div>
  );
}
