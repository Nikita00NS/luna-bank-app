import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, formatMoney, balanceInUsd, timeAgo } from '../lib/utils';
import { dbGetAllUsers, dbGetAdminStats, dbGetPendingKYC, dbApproveKYC, dbRejectKYC } from '../lib/sync';
import { supabase } from '../lib/supabase';

export default function AdminScreen() {
  const { user, go, accounts, txs } = useStore();
  const [tab, setTab] = useState<'dashboard' | 'users' | 'kyc' | 'transactions' | 'support' | 'security' | 'settings'>('dashboard');
  const [stats, setStats] = useState({ userCount: 0, totalVolume: 0, totalFees: 0, totalTxs: 0 });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [pendingKYC, setPendingKYC] = useState<any[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [selUser, setSelUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [allTxs, setAllTxs] = useState<any[]>([]);
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center"><p className="text-4xl mb-3">🚫</p><p className="text-white/35">Доступ запрещён</p></div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u, k] = await Promise.all([
        dbGetAdminStats(),
        dbGetAllUsers(),
        dbGetPendingKYC(),
      ]);
      setStats(s);
      setAllUsers(u);
      setPendingKYC(k);

      // Load transactions from supabase
      const { data: txData } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100);
      if (txData) setAllTxs(txData);

      // Load support chats
      const { data: chatData } = await supabase.from('support_chats').select('*, users(first_name, last_name, username)').eq('status', 'open');
      if (chatData) setSupportChats(chatData);

    } catch (e) { console.warn('Admin load failed:', e); }
    setLoading(false);
  };

  const handleApproveKYC = async (userId: number) => {
    haptic('success');
    await dbApproveKYC(userId);
    setPendingKYC(prev => prev.filter(k => k.user_id !== userId));
    loadData();
  };

  const handleRejectKYC = async (userId: number) => {
    haptic('error');
    await dbRejectKYC(userId);
    setPendingKYC(prev => prev.filter(k => k.user_id !== userId));
    loadData();
  };

  const handleBlockUser = async (userId: number) => {
    haptic('medium');
    await supabase.from('users').update({ role: 'blocked' }).eq('telegram_id', userId);
    loadData();
  };

  const handleUnblockUser = async (userId: number) => {
    haptic('medium');
    await supabase.from('users').update({ role: 'user' }).eq('telegram_id', userId);
    loadData();
  };

  const filteredUsers = searchQ
    ? allUsers.filter(u => u.username?.includes(searchQ) || u.first_name?.includes(searchQ) || u.luna_id?.includes(searchQ) || String(u.telegram_id).includes(searchQ))
    : allUsers;

  const tabs = [
    { id: 'dashboard' as const, icon: '📊', label: 'Обзор' },
    { id: 'users' as const, icon: '👥', label: 'Юзеры' },
    { id: 'kyc' as const, icon: '🔐', label: 'KYC' },
    { id: 'transactions' as const, icon: '💸', label: 'Транзакции' },
    { id: 'support' as const, icon: '💬', label: 'Тикеты' },
    { id: 'security' as const, icon: '🛡️', label: 'Безопасность' },
    { id: 'settings' as const, icon: '⚙️', label: 'Настройки' },
  ];

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">🛡️ Админ-панель</h1>
        <button onClick={loadData} className={`glass rounded-full w-8 h-8 flex items-center justify-center text-xs ${loading ? 'animate-spin' : ''}`}>🔄</button>
      </div>

      {/* Tabs scroll */}
      <div className="px-5 flex gap-1.5 overflow-x-auto pb-2 mb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { haptic('light'); setTab(t.id); }}
            className={`px-3 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              tab === t.id ? 'bg-white text-black' : 'bg-white/[0.04] text-white/40'
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div className="animate-fade-in">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {[
                { icon: '👥', label: 'Пользователи', value: String(stats.userCount), color: 'text-blue-400' },
                { icon: '💸', label: 'Транзакции', value: String(stats.totalTxs), color: 'text-emerald-400' },
                { icon: '📊', label: 'Объём (LNC)', value: `◎${stats.totalVolume.toFixed(0)}`, color: 'text-violet-400' },
                { icon: '💰', label: 'Комиссии', value: `◎${stats.totalFees.toFixed(2)}`, color: 'text-yellow-400' },
                { icon: '🔐', label: 'KYC в очереди', value: String(pendingKYC.length), color: pendingKYC.length > 0 ? 'text-red-400' : 'text-emerald-400' },
                { icon: '💬', label: 'Открытые тикеты', value: String(supportChats.length), color: supportChats.length > 0 ? 'text-amber-400' : 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{s.icon}</span>
                    <span className="text-[11px] text-white/30">{s.label}</span>
                  </div>
                  <p className={`text-2xl font-extrabold tabular-nums ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Quick KYC */}
            {pendingKYC.length > 0 && (
              <div className="mb-5">
                <p className="text-xs text-white/30 font-medium uppercase mb-2">⚠️ KYC ожидает ({pendingKYC.length})</p>
                {pendingKYC.slice(0, 3).map(k => (
                  <div key={k.user_id} className="glass rounded-xl p-3 flex items-center gap-3 mb-2 border border-amber-500/15">
                    <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center text-sm">⏳</div>
                    <div className="flex-1"><p className="text-sm font-medium">ID: {k.user_id}</p><p className="text-[11px] text-white/25">{k.phone || '—'}</p></div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleApproveKYC(k.user_id)} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-transform">✓</button>
                      <button onClick={() => handleRejectKYC(k.user_id)} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-transform">✗</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent transactions */}
            <p className="text-xs text-white/30 font-medium uppercase mb-2">Последние транзакции</p>
            <div className="space-y-1.5">
              {(allTxs.length > 0 ? allTxs : txs).slice(0, 8).map(tx => (
                <div key={tx.id} className="glass rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-sm">
                    {tx.type === 'transfer' ? '📤' : tx.type === 'deposit' ? '📥' : tx.type === 'subscription' ? '⭐' : '💼'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{tx.type} · {tx.note || tx.currency}</p>
                    <p className="text-[10px] text-white/20">{tx.created_at ? timeAgo(tx.created_at) : '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold tabular-nums">◎{Number(tx.amount).toFixed(2)}</p>
                    <p className="text-[10px] text-white/20">{tx.status}</p>
                  </div>
                </div>
              ))}
              {allTxs.length === 0 && txs.length === 0 && <p className="text-center text-white/20 py-6 text-sm">Нет транзакций</p>}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div className="animate-fade-in">
            <div className="glass rounded-xl flex items-center px-4 gap-3 mb-4">
              <span className="text-white/30">🔍</span>
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Поиск: username, Luna ID, Telegram ID..."
                className="flex-1 bg-transparent py-3 text-white outline-none text-sm" />
              {searchQ && <button onClick={() => setSearchQ('')} className="text-white/30 text-sm">✕</button>}
            </div>

            <p className="text-xs text-white/25 mb-2">{filteredUsers.length} пользователей</p>

            <div className="space-y-2">
              {filteredUsers.map((u, i) => (
                <div key={u.telegram_id} className="glass rounded-xl p-3 animate-slide-up" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                      {u.first_name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{u.first_name} {u.last_name}</p>
                      <p className="text-[11px] text-white/25">@{u.username} · {u.luna_id}</p>
                      <p className="text-[10px] text-white/15">TG: {u.telegram_id} · LVL {u.level} · {u.subscription?.toUpperCase()}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                        u.role === 'owner' ? 'bg-yellow-400/15 text-yellow-400' :
                        u.role === 'admin' ? 'bg-blue-400/15 text-blue-400' :
                        u.role === 'blocked' ? 'bg-red-400/15 text-red-400' :
                        'bg-emerald-400/10 text-emerald-400'
                      }`}>{u.role}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        u.kyc_status === 'approved' ? 'bg-emerald-400/10 text-emerald-400' :
                        u.kyc_status === 'pending' ? 'bg-amber-400/10 text-amber-400' :
                        'bg-white/5 text-white/20'
                      }`}>KYC: {u.kyc_status || 'none'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 mt-3 pt-2 border-t border-white/[0.04]">
                    <button onClick={() => setSelUser(u)}
                      className="flex-1 glass rounded-lg py-1.5 text-[10px] font-medium text-white/40 active:scale-95 transition-transform">
                      📋 Детали
                    </button>
                    {u.role !== 'blocked' ? (
                      <button onClick={() => handleBlockUser(u.telegram_id)}
                        className="flex-1 glass rounded-lg py-1.5 text-[10px] font-medium text-red-400/60 active:scale-95 transition-transform">
                        🚫 Блок
                      </button>
                    ) : (
                      <button onClick={() => handleUnblockUser(u.telegram_id)}
                        className="flex-1 glass rounded-lg py-1.5 text-[10px] font-medium text-emerald-400/60 active:scale-95 transition-transform">
                        ✅ Разблок
                      </button>
                    )}
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
              <div className="text-center py-16">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-white/35 mb-1">Очередь пуста</p>
                <p className="text-xs text-white/20">Все заявки обработаны</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-white/30 mb-3">⏳ {pendingKYC.length} заявок в очереди</p>
                <div className="space-y-3">
                  {pendingKYC.map((k, i) => (
                    <div key={k.user_id} className="glass rounded-2xl p-4 border border-amber-500/10 animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center text-xl">⏳</div>
                        <div className="flex-1">
                          <p className="font-bold">User ID: {k.user_id}</p>
                          <p className="text-xs text-white/25">{k.created_at ? timeAgo(k.created_at) : 'Недавно'}</p>
                        </div>
                      </div>

                      <div className="glass rounded-xl p-3 space-y-1.5 mb-3">
                        {[['📱 Телефон', k.phone || '—'], ['📧 Email', k.email || '—'], ['🎂 Дата рождения', k.birth_date || '—'],
                          ['📄 Паспорт', k.document_url ? '✅ Загружен' : '❌'], ['🤳 Селфи', k.selfie_url ? '✅ Загружено' : '❌']
                        ].map(([l, v]) => (
                          <div key={l} className="flex justify-between text-xs">
                            <span className="text-white/30">{l}</span>
                            <span>{v}</span>
                          </div>
                        ))}
                      </div>

                      {/* Risk scoring */}
                      <div className="glass rounded-xl p-3 mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-white/30">Risk Score</span>
                          <span className="text-xs font-bold text-emerald-400">Низкий</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: '25%' }} />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => handleApproveKYC(k.user_id)}
                          className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm active:scale-[0.97] transition-transform">
                          ✅ Одобрить
                        </button>
                        <button onClick={() => handleRejectKYC(k.user_id)}
                          className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold text-sm active:scale-[0.97] transition-transform">
                          ❌ Отклонить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* TRANSACTIONS */}
        {tab === 'transactions' && (
          <div className="animate-fade-in">
            <div className="flex gap-2 mb-3">
              {['Все', 'transfer', 'deposit', 'subscription'].map(f => (
                <button key={f} className="glass rounded-lg px-3 py-1.5 text-[11px] font-medium text-white/40">{f === 'Все' ? 'Все' : f}</button>
              ))}
            </div>
            <div className="space-y-1.5">
              {(allTxs.length > 0 ? allTxs : txs).slice(0, 30).map((tx, i) => (
                <div key={tx.id || i} className="glass rounded-xl p-3 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 0.02}s` }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    tx.type === 'transfer' ? 'bg-blue-500/15 text-blue-400' :
                    tx.type === 'deposit' ? 'bg-emerald-500/15 text-emerald-400' :
                    'bg-violet-500/15 text-violet-400'
                  }`}>
                    {tx.type === 'transfer' ? '↗' : tx.type === 'deposit' ? '↙' : '★'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{tx.type} {tx.note ? `· ${tx.note}` : ''}</p>
                    <p className="text-[10px] text-white/20">
                      {tx.from_user_id} → {tx.to_user_id} · {tx.created_at ? new Date(tx.created_at).toLocaleString('ru-RU') : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold tabular-nums">◎{Number(tx.amount).toFixed(2)}</p>
                    {Number(tx.fee) > 0 && <p className="text-[10px] text-yellow-400/50">fee: ◎{Number(tx.fee).toFixed(2)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUPPORT */}
        {tab === 'support' && (
          <div className="animate-fade-in">
            {supportChats.length === 0 ? (
              <div className="text-center py-16"><p className="text-4xl mb-3">💬</p><p className="text-white/35">Нет открытых тикетов</p></div>
            ) : (
              <div className="space-y-2">
                {supportChats.map(chat => (
                  <div key={chat.id} className="glass rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center text-lg">💬</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">User {chat.user_id}</p>
                      <p className="text-[11px] text-white/25">{chat.messages?.length || 0} сообщений · {chat.status}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${chat.status === 'open' ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'}`}>
                      {chat.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECURITY */}
        {tab === 'security' && (
          <div className="animate-fade-in space-y-4">
            <div className="glass rounded-2xl p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2"><span>🔐</span>Последние входы</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-white/30">Сегодня {new Date().toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'})}</span><span className="text-emerald-400">✓ Успешно</span></div>
                <div className="flex justify-between text-sm"><span className="text-white/30">Вчера 22:15</span><span className="text-emerald-400">✓ Успешно</span></div>
              </div>
            </div>
            <div className="glass rounded-2xl p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2"><span>⚠️</span>Подозрительная активность</h3>
              <p className="text-sm text-emerald-400">Не обнаружена ✓</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2"><span>📊</span>Статистика безопасности</h3>
              <div className="space-y-2">
                {[['Неудачные входы за 24ч', '0'], ['Заблокированные аккаунты', String(allUsers.filter(u => u.role === 'blocked').length)],
                  ['PIN-сброс запросы', '0'], ['2FA активировано', String(allUsers.filter(u => u.biometrics_enabled).length)]
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-sm"><span className="text-white/30">{l}</span><span className="tabular-nums">{v}</span></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div className="animate-fade-in space-y-3">
            {[
              { icon: '💰', title: 'Комиссии', desc: 'Free 0.5%, Plus 0.3%, Cosmic 0%' },
              { icon: '◎', title: 'Курс LNC', desc: '1 LNC = $0.05 (фиксированный)' },
              { icon: '📊', title: 'Лимиты', desc: 'Free $1K, Plus $10K, Cosmic ∞' },
              { icon: '🔐', title: 'KYC лимит', desc: 'До $50,000/мес после одобрения' },
              { icon: '🏦', title: 'Project Wallet', desc: 'UQA9IgVuB-8GUVRtt...F1VuZJD' },
              { icon: '🌐', title: 'Supabase', desc: 'lffdzsbqnrjmhdneolrh.supabase.co' },
            ].map(s => (
              <div key={s.title} className="glass rounded-xl p-3.5 flex items-center gap-3">
                <span className="text-xl w-8 text-center">{s.icon}</span>
                <div className="flex-1"><p className="font-semibold text-sm">{s.title}</p><p className="text-[11px] text-white/25">{s.desc}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selUser && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in" onClick={() => setSelUser(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-lg bg-[#0c0c0c] rounded-t-3xl animate-slide-up max-h-[85vh] overflow-y-auto border-t border-white/5">
            <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full bg-white/15" /></div>
            <div className="px-6 pb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl font-bold">{selUser.first_name?.[0]}</div>
                <div><p className="font-extrabold text-lg">{selUser.first_name} {selUser.last_name}</p><p className="text-sm text-white/30">@{selUser.username}</p></div>
              </div>
              <div className="glass rounded-xl divide-y divide-white/[0.04]">
                {[
                  ['Telegram ID', selUser.telegram_id], ['Luna ID', selUser.luna_id], ['Role', selUser.role],
                  ['Level', `LVL ${selUser.level}`], ['XP', selUser.xp], ['KYC', selUser.kyc_status],
                  ['Подписка', selUser.subscription], ['Биометрия', selUser.biometrics_enabled ? 'Да' : 'Нет'],
                  ['Регистрация', selUser.created_at ? new Date(selUser.created_at).toLocaleDateString('ru-RU') : '—'],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between p-3 text-sm">
                    <span className="text-white/30">{l}</span><span className="tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
