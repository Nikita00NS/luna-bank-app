import React from 'react';
import { useStore, type Page } from '../lib/store';
import { haptic, shortAddr } from '../lib/utils';
export default function ProfileScreen() {
  const { user, tonWallet, go, logout, accounts } = useStore();
  if (!user) return null;
  const xpMax = user.level*100;
  const items: {i:string;l:string;d:string;p:Page}[] = [
    {i:'⭐',l:'Подписка',d:user.subscription.toUpperCase(),p:'subscription'},
    {i:'🏦',l:'Счета',d:`${accounts.length}`,p:'cards'},
    {i:'📱',l:'Мой QR',d:user.luna_id,p:'qr'},
    {i:'🔗',l:'TON-кошелёк',d:tonWallet?shortAddr(tonWallet):'—',p:'ton-connect'},
    {i:'🔔',l:'Уведомления',d:'',p:'notifications'},
    {i:'🔐',l:'Безопасность',d:'',p:'settings'},
    {i:'💬',l:'Поддержка',d:'',p:'chat'},
    {i:'❓',l:'FAQ',d:'',p:'faq'},
  ];
  if (user.role==='owner'||user.role==='admin') items.push({i:'🛡️',l:'Админ',d:'',p:'admin'});
  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={()=>go('home')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">Профиль</h1>
      </div>
      <div className="px-5 mt-4 animate-slide-up">
        <div className="glass-accent rounded-2xl p-5 flex items-center gap-4">
          {user.photo_url?<img src={user.photo_url} className="w-16 h-16 rounded-full" alt="" />:
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl font-bold">{user.first_name[0]}</div>}
          <div className="flex-1"><p className="font-extrabold text-lg">{user.first_name} {user.last_name}</p><p className="text-sm text-white/35">@{user.username}</p><p className="text-xs text-white/20">{user.luna_id}</p></div>
        </div>
      </div>
      <div className="px-5 mt-4 flex gap-3">
        <div className="flex-1 glass rounded-xl p-3"><p className="text-[10px] text-white/35 uppercase">Level</p><p className="font-extrabold text-lg">LVL {user.level}</p>
          <div className="h-1.5 bg-white/[0.06] rounded-full mt-1.5 overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full" style={{width:`${Math.min(user.xp/xpMax*100,100)}%`}} /></div>
          <p className="text-[9px] text-white/20 mt-1">{user.xp}/{xpMax} XP</p>
        </div>
        <div className="flex-1 glass rounded-xl p-3"><p className="text-[10px] text-white/35 uppercase">Кэшбэк</p><p className="font-extrabold text-lg">{user.subscription==='free'?'0%':user.subscription==='plus'?'1%':'3%'}</p><p className="text-[9px] text-white/20 mt-1">{user.subscription.toUpperCase()}</p></div>
        <div className="flex-1 glass rounded-xl p-3"><p className="text-[10px] text-white/35 uppercase">KYC</p><p className="font-bold text-sm mt-1">{user.kyc_status==='none'?'❌':user.kyc_status==='pending'?'⏳':user.kyc_status==='approved'?'✅':'🚫'}</p>
          <button onClick={()=>go('kyc')} className="text-[9px] text-white/25 mt-1">{user.kyc_status==='none'?'Пройти →':user.kyc_status}</button>
        </div>
      </div>
      <div className="px-5 mt-6 space-y-0.5">
        {items.map((it,i)=><button key={i} onClick={()=>{haptic('light');go(it.p)}} className="w-full flex items-center gap-4 py-3.5 px-1 border-b border-white/[0.04] active:bg-white/[0.03] transition-colors">
          <span className="text-xl w-8 text-center">{it.i}</span><span className="flex-1 text-left text-[14px]">{it.l}</span>
          {it.d&&<span className="text-xs text-white/20">{it.d}</span>}<span className="text-white/15">›</span>
        </button>)}
      </div>
      <div className="px-5 mt-6 mb-8"><button onClick={()=>{haptic('medium');logout()}} className="w-full glass rounded-2xl py-4 text-red-400 font-semibold active:scale-[0.98] transition-transform">Выйти</button></div>
    </div>
  );
}
