import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { dbGetAllUsers, dbGetAdminStats, dbGetPendingKYC, dbApproveKYC, dbRejectKYC } from '../lib/db';
import { supabase } from '../lib/supabase';
import { ArrowLeftIcon, ShieldIcon } from '../components/Icons';

type Tab = 'dashboard' | 'users' | 'kyc' | 'transactions' | 'security';

export default function AdminScreen() {
  const { user, go, txs } = useStore();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState({ userCount: 0, totalVolume: 0, totalFees: 0, totalTxs: 0 });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [pendingKYC, setPendingKYC] = useState<any[]>([]);
  const [allTxs, setAllTxs] = useState<any[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ShieldIcon size={48} color="rgba(255,255,255,0.2)" className="mx-auto mb-4" />
          <p className="text-white/35 font-medium">Доступ запрещён</p>
        </div>
      </div>
    );
  }

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u, k] = await Promise.all([dbGetAdminStats(), dbGetAllUsers(), dbGetPendingKYC()]);
      setStats(s);
      setAllUsers(u);
      setPendingKYC(k);
      const { data: txData } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
      if (txData) setAllTxs(txData);
    } catch {}
    setLoading(false);
  };

  const handleApprove = async (userId: number) => { haptic('success'); await dbApproveKYC(userId); loadData(); };
  const handleReject = async (userId: number) => { haptic('error'); await dbRejectKYC(userId); loadData(); };
  const handleBlock = async (userId: number) => { haptic('medium'); await supabase.from('users').update({ role: 'blocked' }).eq('telegram_id', userId); loadData(); };

  const filtered = searchQ ? allUsers.filter((u: any) => u.username?.includes(searchQ) || u.luna_id?.includes(searchQ) || String(u.telegram_id).includes(searchQ)) : allUsers;
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '📊', label: 'Обзор' },
    { id: 'users', icon: '👥', label: 'Юзеры' },
    { id: 'kyc', icon: '🔐', label: 'KYC' },
    { id: 'transactions', icon: '💸', label: 'Операции' },
    { id: 'security', icon: '🛡️', label: 'Безопас.' },
  ];

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Админ-панель</h1>
        <button onClick={loadData} className={`glass rounded-full w-8 h-8 flex items-center justify-center text-xs ${loading ? 'animate-spin' : ''}`}>🔄</button>
      </div>

      <div className="px-5 flex gap-1.5 overflow-x-auto pb-2 mb-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => { haptic('light'); setTab(t.id); }}
            className={`px-3 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${tab === t.id ? 'bg-white text-black' : 'bg-white/[0.04] text-white/40'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {[
                { icon: '👥', label: 'Юзеры', value: String(stats.userCount), color: 'text-blue-400' },
                { icon: '💸', label: 'Транзакции', value: String(stats.totalTxs), color: 'text-emerald-400' },
                { icon: '📊', label: 'Объём', value: `◎${stats.totalVolume.toFixed(0)}`, color: 'text-violet-400' },
                { icon: '💰', label: 'Комиссии', value: `◎${stats.totalFees.toFixed(2)}`, color: 'text-yellow-400' },
              ].map((s) => (
                <div key={s.label} className="glass p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{s.icon}</span><span className="text-[11px] text-white/30">{s.label}</span>
                  </div>
                  <p className={`text-2xl font-extrabold mono ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            {pendingKYC.length > 0 && (
              <div className="glass-accent p-3 rounded-xl flex items-center gap-3 mb-4">
                <span className="text-xl">⚠️</span>
                <p className="text-sm font-medium text-amber-400">{pendingKYC.length} KYC заявок ожидают</p>
                <button onClick={() => setTab('kyc')} className="ml-auto text-xs text-white/40">→</button>
              </div>
            )}
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div className="animate-fade-in">
            <div className="glass flex items-center px-4 gap-3 mb-4">
              <span className="text-white/30 text-sm">🔍</span>
              <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Поиск: username, Luna ID, TG ID..."
                className="flex-1 bg-transparent py-3 text-white outline-none text-sm" />
            </div>
            <p className="text-xs text-white/25 mb-2">{filtered.length} пользователей</p>
            <div className="space-y-2">
              {filtered.slice(0, 20).map((u: any, i: number) => (
                <div key={u.telegram_id} className="glass p-3 animate-slide-up" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                      {u.first_name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{u.first_name} {u.last_name}</p>
                      <p className="text-[11px] text-white/25">@{u.username} · {u.luna_id}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                        u.role === 'owner' ? 'bg-yellow-400/15 text-yellow-400' :
                        u.role === 'admin' ? 'bg-blue-400/15 text-blue-400' :
                        u.role === 'blocked' ? 'bg-red-400/15 text-red-400' :
                        'bg-emerald-400/10 text-emerald-400'}`}>{u.role}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-2 pt-2 border-t border-white/[0.04]">
                    <button onClick={() => handleBlock(u.telegram_id)} className="flex-1 glass rounded-lg py-1.5 text-[10px] text-red-400/60 active:scale-95 transition-transform">🚫 Блок</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KYC */}
        {tab === 'kyc' && (
          <div className="animate-fade-in">
            {pendingKYC.length === 0 ? (
              <div className="text-center py-16"><div className="text-4xl mb-3">✅</div><p className="text-white/35">Очередь пуста</p></div>
            ) : (
              <div className="space-y-3">
                {pendingKYC.map((k: any, i: number) => (
                  <div key={k.user_id} className="glass p-4 border border-amber-500/10 animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                    <p className="font-bold mb-2">User ID: {k.user_id}</p>
                    <div className="glass p-3 space-y-1 mb-3 text-xs">
                      {[['📱', k.phone || '—'], ['📧', k.email || '—'], ['🎂', k.birth_date || '—'],
                        ['📄', k.document_url ? '✅' : '❌'], ['🤳', k.selfie_url ? '✅' : '❌']
                      ].map(([i, v]) => (
                        <div key={i} className="flex justify-between"><span className="text-white/30">{i}</span><span>{v}</span></div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(k.user_id)} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm active:scale-[0.97] transition-transform">✅ Одобрить</button>
                      <button onClick={() => handleReject(k.user_id)} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold text-sm active:scale-[0.97] transition-transform">❌ Отклонить</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TRANSACTIONS */}
        {tab === 'transactions' && (
          <div className="space-y-1.5 animate-fade-in">
            {(allTxs.length > 0 ? allTxs : txs).slice(0, 30).map((tx: any, i: number) => (
              <div key={tx.id || i} className="glass p-3 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 0.02}s` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{tx.type} {tx.note ? `· ${tx.note}` : ''}</p>
                  <p className="text-[10px] text-white/20">{tx.from_user_id} → {tx.to_user_id} · {tx.created_at ? timeAgo(tx.created_at) : '—'}</p>
                </div>
                <p className="text-xs font-bold mono">◎{Number(tx.amount).toFixed(2)}</p>
              </div>
            ))}
            {allTxs.length === 0 && txs.length === 0 && <p className="text-center text-white/20 py-8">Нет транзакций</p>}
          </div>
        )}

        {/* SECURITY */}
        {tab === 'security' && (
          <div className="space-y-4 animate-fade-in">
            <div className="glass p-4">
              <h3 className="font-bold mb-3">Последние входы</h3>
              <div className="flex justify-between text-sm"><span className="text-white/30">Сегодня {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span><span className="text-emerald-400">✓ OK</span></div>
            </div>
            <div className="glass p-4">
              <h3 className="font-bold mb-3">Безопасность</h3>
              {[['Заблокированные', String(allUsers.filter((u: any) => u.role === 'blocked').length)],
                ['Биометрия вкл.', String(allUsers.filter((u: any) => u.biometrics_enabled).length)],
                ['Подозрительная активность', '✅ Не обнаружена']
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm py-1"><span className="text-white/30">{l}</span><span>{v}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
