import React, { useState } from 'react';import { useStore } from '../lib/store';import { FAQ_ITEMS } from '../lib/constants';import { haptic } from '../lib/utils';
export default function FAQScreen() { const {go}=useStore();const [o,setO]=useState<number|null>(null);
return(<div className="h-full overflow-y-auto pb-24 safe-top"><div className="px-5 pt-4 pb-2 flex items-center gap-4"><button onClick={()=>go('profile')} className="text-white/50 text-sm">← Назад</button><h1 className="font-bold flex-1">FAQ</h1></div>
<div className="px-5 mt-4 space-y-2">{FAQ_ITEMS.map((it,i)=><div key={i} className="glass rounded-xl overflow-hidden animate-slide-up" style={{animationDelay:`${i*0.03}s`}}>
<button onClick={()=>{haptic('light');setO(o===i?null:i)}} className="w-full p-4 flex items-center gap-3 text-left"><span className="text-white/30">❓</span><span className="flex-1 text-[13px] font-medium">{it.q}</span><span className={`text-white/20 transition-transform text-xs ${o===i?'rotate-180':''}`}>▼</span></button>
{o===i&&<div className="px-4 pb-4 pt-0 animate-fade-in"><p className="text-[13px] text-white/50 leading-relaxed pl-7">{it.a}</p></div>}</div>)}</div></div>);}
