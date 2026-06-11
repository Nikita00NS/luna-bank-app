import React, { useState } from 'react';import { useStore, uid } from '../lib/store';import { formatMoney, haptic, balanceInUsd } from '../lib/utils';import { SUBSCRIPTION_PLANS } from '../lib/constants';
import { notifyUser } from '../lib/telegram-bot';import Modal from '../components/Modal';
export default function SubscriptionScreen() { const {user,accounts,go,patchUser,updateBalance,addTx,addNotif}=useStore();const [show,setShow]=useState(false);const [sel,setSel]=useState<typeof SUBSCRIPTION_PLANS[number]|null>(null);if(!user)return null;const pa=accounts.find(a=>a.type==='personal');
const buy=()=>{if(!sel||!pa)return;if(pa.balance*0.05<sel.price){haptic('error');alert('Недостаточно средств');return;}haptic('success');const lncCost=sel.price/0.05;updateBalance(pa.id,-lncCost);patchUser({subscription:sel.id as any});addTx({id:uid(),from_user_id:user.telegram_id,to_user_id:0,from_account_id:pa.id,to_account_id:'platform',amount:lncCost,fee:0,currency:'LNC',type:'subscription',status:'completed',created_at:new Date().toISOString()});addNotif({id:uid(),title:'⭐ Подписка',message:`${sel.name} активирована`,type:'system',read:false,created_at:new Date().toISOString()});setShow(false);};
return(<div className="h-full overflow-y-auto pb-24 safe-top"><div className="px-5 pt-4 pb-2 flex items-center gap-4"><button onClick={()=>go('profile')} className="text-white/50 text-sm">← Назад</button><h1 className="font-bold flex-1">Подписка</h1></div>
<div className="px-5 mt-4 space-y-4">{SUBSCRIPTION_PLANS.map((p,i)=>{const cur=p.id===user.subscription;return(
<button key={p.id} onClick={()=>{if(cur)return;if(p.price===0){haptic('medium');patchUser({subscription:'free'});return;}haptic('medium');setSel(p);setShow(true);}}
  className={`w-full rounded-2xl p-5 text-left transition-all animate-slide-up ${cur?'bg-white text-black':'glass'}`} style={{animationDelay:`${i*0.1}s`}}>
<div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><span className="text-2xl">{p.icon}</span><h3 className="text-xl font-extrabold">{p.name}</h3></div>
<div className="text-right"><p className="text-lg font-extrabold">{p.price===0?'Бесплатно':`$${p.price}`}</p>{p.price>0&&<p className={`text-[11px] ${cur?'text-black/35':'text-white/30'}`}>/мес</p>}</div></div>
<div className="space-y-1.5">{[['Комиссия',`${p.commission}%`],['Кэшбэк',`${p.cashback}%`],['Лимит/день',p.dailyLimit===Infinity?'∞':`$${p.dailyLimit.toLocaleString()}`],['Поддержка',p.support]].map(([l,v])=>(
<div key={l} className="flex justify-between text-sm"><span className={cur?'text-black/50':'text-white/35'}>{l}</span><span className="font-semibold">{v}</span></div>))}</div>
{cur&&<div className="mt-3 text-center text-sm font-bold bg-black/10 rounded-xl py-2">Текущий план</div>}
</button>);})}</div>
<Modal open={show} onClose={()=>setShow(false)} title="Подтверждение">{sel&&<div className="space-y-4">
<div className="space-y-2">{[['Тариф',sel.name],['Цена',`$${sel.price}/мес`],['Баланс',pa?`◎${pa.balance.toFixed(2)} LNC`:'Нет счёта']].map(([l,v])=><div key={l} className="flex justify-between text-sm"><span className="text-white/35">{l}</span><span className="font-medium tabular-nums">{v}</span></div>)}</div>
{pa&&pa.balance*0.05<sel.price&&<div className="bg-red-500/10 border border-red-500/15 rounded-xl p-3 text-sm text-red-400">Недостаточно средств</div>}
<button onClick={buy} disabled={!pa||pa.balance*0.05<sel.price} className="btn-primary w-full">Оплатить ${sel.price}</button></div>}</Modal></div>);}
