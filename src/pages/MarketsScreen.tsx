import React from 'react';import { useStore } from '../lib/store';import { CRYPTO_PRICES } from '../lib/constants';
const D=[{s:'TON',n:'Toncoin',p:CRYPTO_PRICES.TON,c:5.2,i:'💎'},{s:'BTC',n:'Bitcoin',p:CRYPTO_PRICES.BTC,c:2.1,i:'₿'},{s:'ETH',n:'Ethereum',p:CRYPTO_PRICES.ETH,c:-1.3,i:'Ξ'},{s:'USDT',n:'Tether',p:CRYPTO_PRICES.USDT,c:0.01,i:'💵'},{s:'LNC',n:'Luna Coin',p:CRYPTO_PRICES.LNC,c:0,i:'🌙'},{s:'SOL',n:'Solana',p:178.5,c:8.4,i:'☀️'},{s:'BNB',n:'BNB',p:605.2,c:-0.8,i:'🟡'},{s:'DOGE',n:'Dogecoin',p:0.082,c:12.3,i:'🐕'}];
export default function MarketsScreen() { const {go}=useStore();
return(<div className="h-full overflow-y-auto pb-24 safe-top"><div className="px-5 pt-4 pb-2 flex items-center gap-4"><button onClick={()=>go('home')} className="text-white/50 text-sm">← Назад</button><h1 className="font-bold flex-1">📊 Курсы</h1></div>
<div className="px-5 mt-4 space-y-2">{D.map((c,i)=><div key={c.s} className="glass rounded-xl p-4 flex items-center gap-4 animate-slide-up" style={{animationDelay:`${i*0.04}s`}}>
<div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-xl">{c.i}</div>
<div className="flex-1"><p className="font-semibold text-sm">{c.n}</p><p className="text-[11px] text-white/30">{c.s}</p></div>
<div className="text-right"><p className="font-bold tabular-nums text-sm">${c.p>=1?c.p.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):c.p.toFixed(4)}</p>
<p className={`text-[11px] tabular-nums ${c.c>=0?'text-emerald-400':'text-red-400'}`}>{c.c>=0?'+':''}{c.c}%</p></div></div>)}</div></div>);}
