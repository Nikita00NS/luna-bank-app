import React from 'react';import { useStore } from '../lib/store';import { timeAgo, haptic } from '../lib/utils';
export default function NotificationsScreen() { const {notifs,readNotif,go}=useStore();const ic:Record<string,string>={transfer:'📤',deposit:'📥',system:'🔔',promo:'🎁'};
return(<div className="h-full overflow-y-auto pb-24 safe-top"><div className="px-5 pt-4 pb-2 flex items-center gap-4"><button onClick={()=>go('home')} className="text-white/50 text-sm">← Назад</button><h1 className="font-bold flex-1">Уведомления</h1></div>
<div className="px-5 mt-4">{notifs.length===0?<div className="text-center py-20 animate-fade-in"><span className="text-5xl mb-4 block">🔔</span><p className="text-white/35">Нет уведомлений</p></div>:
<div className="space-y-2">{notifs.map((n,i)=><button key={n.id} onClick={()=>{haptic('light');readNotif(n.id)}} className={`w-full glass rounded-xl p-4 flex items-start gap-3 text-left animate-slide-up transition-all ${n.read?'opacity-50':''}`} style={{animationDelay:`${i*0.03}s`}}>
<span className="text-xl mt-0.5">{ic[n.type]||'🔔'}</span><div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{n.title}</p><p className="text-[11px] text-white/30 mt-0.5 truncate">{n.message}</p><p className="text-[10px] text-white/20 mt-1">{timeAgo(n.created_at)}</p></div>
{!n.read&&<div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />}
</button>)}</div>}</div></div>);}
