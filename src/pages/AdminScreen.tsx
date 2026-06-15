import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, timeAgo, formatMoney, balanceInUsd } from '../lib/utils';
import { isOwner, OWNER_TELEGRAM_ID } from '../lib/admin';
import { LNC_RATE_USD, SUBSCRIPTION_PLANS } from '../lib/constants';
import {
  dbGetAllUsers, dbGetAdminStats, dbGetPendingKYC,
  dbApproveKYC, dbRejectKYC, dbUpdateUser,
  dbAdminSetBalance, dbAdminGetUserAccounts, dbAdminSendNotification,
} from '../lib/db';
import { supabase } from '../lib/supabase';
import { ArrowLeftIcon, LockIcon } from '../components/Icons';
import { notifyKycStatus, notifyCustom } from '../lib/bot';
import Modal from '../components/Modal';

type Tab = 'dash' | 'users' | 'kyc' | 'balance' | 'txs' | 'accounts' | 'notify' | 'security' | 'system';

export default function AdminScreen() {
  const { user, go, txs } = useStore();

  // State
  const [tab, setTab] = useState<Tab>('dash');
  const [stats, setStats] = useState({ userCount: 0, totalVolume: 0, totalFees: 0, totalTxs: 0 });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [pendingKYC, setPendingKYC] = useState<any[]>([]);
  const [allTxs, setAllTxs] = useState<any[]>([]);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [selUser, setSelUser] = useState<any>(null);

  // Balance management
  const [balUserId, setBalUserId] = useState('');
  const [balAccounts, setBalAccounts] = useState<any[]>([]);
  const [balSelAcc, setBalSelAcc] = useState('');
  const [balAmount, setBalAmount] = useState('');
  const [balAction, setBalAction] = useState<'add' | 'remove' | 'set'>('add');
  const [balNote, setBalNote] = useState('');
  const [balDone, setBalDone] = useState(false);

  // Mass notification
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [notifTarget, setNotifTarget] = useState<'all' | 'single'>('all');
  const [notifUserId, setNotifUserId] = useState('');
  const [notifSent, setNotifSent] = useState(false);

  // User edit
  const [editRole, setEditRole] = useState('');
  const [editSub, setEditSub] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editXp, setEditXp] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);

  // ===== ACCESS CHECK =====
  if (!user || !isOwner(user.telegram_id)) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 safe-top">
        <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center mb-5">
          <LockIcon size={40} color="rgba(255,255,255,0.2)" />
        </div>
        <h2 className="text-xl font-extrabold mb-2">Доступ закрыт</h2>
        <p className="text-sm text-white/30 text-center mb-6">Только владелец</p>
        <button onClick={() => go('home')} className="btn-primary px-8">На главную</button>
      </div>
    );
  }

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u, k] = await Promise.all([dbGetAdminStats(), dbGetAllUsers(), dbGetPendingKYC()]);
      setStats(s); setAllUsers(u); setPendingKYC(k);
      const { data: txData } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100);
      if (txData) setAllTxs(txData);
      const { data: accData } = await supabase.from('accounts').select('*, users(first_name, last_name, username)').order('created_at', { ascending: false });
      if (accData) setAllAccounts(accData);
    } catch {}
    setLoading(false);
  };

  // ===== User Actions =====
  const blockUser = async (id: number) => { if (id === OWNER_TELEGRAM_ID) return; haptic('medium'); await supabase.from('users').update({ role: 'blocked' }).eq('telegram_id', id); loadData(); };
  const unblockUser = async (id: number) => { haptic('medium'); await supabase.from('users').update({ role: 'user' }).eq('telegram_id', id); loadData(); };
  const makeAdmin = async (id: number) => { haptic('medium'); await supabase.from('users').update({ role: 'admin' }).eq('telegram_id', id); loadData(); };
  const removeAdmin = async (id: number) => { haptic('medium'); await supabase.from('users').update({ role: 'user' }).eq('telegram_id', id); loadData(); };
  const deleteUser = async (id: number) => {
    if (id === OWNER_TELEGRAM_ID) return;
    haptic('heavy');
    await supabase.from('notifications').delete().eq('user_id', id);
    await supabase.from('kyc_requests').delete().eq('user_id', id);
    await supabase.from('wallet_connections').delete().eq('user_id', id);
    await supabase.from('support_chats').delete().eq('user_id', id);
    // Delete cards for user's accounts
    const { data: userAccs } = await supabase.from('accounts').select('id').eq('user_id', id);
    if (userAccs) {
      for (const acc of userAccs) {
        await supabase.from('cards').delete().eq('account_id', acc.id);
      }
    }
    await supabase.from('accounts').delete().eq('user_id', id);
    await supabase.from('transactions').delete().or(`from_user_id.eq.${id},to_user_id.eq.${id}`);
    await supabase.from('users').delete().eq('telegram_id', id);
    setSelUser(null); setShowUserModal(false); loadData();
  };

  // ===== Save User Edit =====
  const saveUserEdit = async () => {
    if (!selUser) return;
    haptic('success');
    const updates: any = {};
    if (editRole) updates.role = editRole;
    if (editSub) updates.subscription = editSub;
    if (editLevel) updates.level = parseInt(editLevel);
    if (editXp) updates.xp = parseInt(editXp);
    if (Object.keys(updates).length > 0) {
      await dbUpdateUser(selUser.telegram_id, updates);
    }
    setShowUserModal(false); loadData();
  };

  // ===== Balance Operation =====
  const loadBalAccounts = async () => {
    const id = parseInt(balUserId);
    if (isNaN(id)) return;
    haptic('light');
    const accs = await dbAdminGetUserAccounts(id);
    setBalAccounts(accs);
    if (accs.length > 0) setBalSelAcc(accs[0].id);
  };

  const executeBalance = async () => {
    if (!balSelAcc || !balAmount) return;
    const amt = parseFloat(balAmount);
    if (isNaN(amt)) return;
    haptic('success');

    const acc = balAccounts.find((a: any) => a.id === balSelAcc);
    if (!acc) return;

    let newBal: number;
    if (balAction === 'add') newBal = Number(acc.balance) + amt;
    else if (balAction === 'remove') newBal = Math.max(0, Number(acc.balance) - amt);
    else newBal = amt;

    await dbAdminSetBalance(balSelAcc, newBal);

    const userId = parseInt(balUserId);
    const actionText = balAction === 'add' ? 'Начислено' : balAction === 'remove' ? 'Списано' : 'Установлено';
    await dbAdminSendNotification(
      userId,
      `💰 ${actionText}`,
      balNote || `◎${amt} ${acc.currency} · ${actionText} администратором`
    );
    // Push via Telegram bot
    notifyCustom(userId, `💰 *${actionText}*\n◎${amt} ${acc.currency}\n${balNote || ''}`).catch(() => {});

    // Create transaction record
    await supabase.from('transactions').insert({
      from_user_id: OWNER_TELEGRAM_ID,
      to_user_id: userId,
      from_account_id: 'admin',
      to_account_id: balSelAcc,
      amount: amt,
      fee: 0,
      currency: acc.currency,
      type: balAction === 'remove' ? 'withdrawal' : 'deposit',
      status: 'completed',
      note: `Admin: ${actionText} · ${balNote || ''}`,
    });

    setBalDone(true);
    setTimeout(() => setBalDone(false), 3000);
    setBalAmount(''); setBalNote('');
    loadBalAccounts();
    loadData();
  };

  // ===== Send Notification =====
  const sendNotification = async () => {
    if (!notifTitle || !notifMsg) return;
    haptic('success');

    if (notifTarget === 'all') {
      // Send to ALL users
      for (const u of allUsers) {
        await dbAdminSendNotification(u.telegram_id, notifTitle, notifMsg);
      }
    } else {
      const id = parseInt(notifUserId);
      if (!isNaN(id)) {
        await dbAdminSendNotification(id, notifTitle, notifMsg);
      }
    }

    setNotifSent(true);
    setTimeout(() => setNotifSent(false), 3000);
    setNotifTitle(''); setNotifMsg('');
  };

  // ===== KYC =====
  const approveKYC = async (id: number) => { haptic('success'); await dbApproveKYC(id); notifyKycStatus(id, 'approved').catch(() => {}); loadData(); };
  const rejectKYC = async (id: number) => { haptic('error'); await dbRejectKYC(id); notifyKycStatus(id, 'rejected').catch(() => {}); loadData(); };

  const filtered = searchQ ? allUsers.filter((u: any) =>
    u.username?.toLowerCase().includes(searchQ.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(searchQ.toLowerCase()) ||
    u.luna_id?.includes(searchQ) ||
    String(u.telegram_id).includes(searchQ)
  ) : allUsers;

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'dash', icon: '📊', label: 'Обзор' },
    { id: 'users', icon: '👥', label: 'Юзеры' },
    { id: 'balance', icon: '💰', label: 'Балансы' },
    { id: 'kyc', icon: '🔐', label: 'KYC' },
    { id: 'txs', icon: '💸', label: 'Транзакции' },
    { id: 'accounts', icon: '🏦', label: 'Счета' },
    { id: 'notify', icon: '📢', label: 'Рассылка' },
    { id: 'security', icon: '🛡️', label: 'Безопас.' },
    { id: 'system', icon: '⚙️', label: 'Система' },
  ];

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <div className="flex-1">
          <h1 className="font-bold">Админ-панель</h1>
          <p className="text-[10px] text-emerald-400/60">Owner: {user.telegram_id}</p>
        </div>
        <button onClick={loadData} className={`glass rounded-full w-8 h-8 flex items-center justify-center text-xs ${loading ? 'animate-spin' : ''}`}>🔄</button>
      </div>

      {/* Tabs */}
      <div className="px-5 flex gap-1 overflow-x-auto pb-2 mb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { haptic('light'); setTab(t.id); }}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all flex items-center gap-1
              ${tab === t.id ? 'bg-white text-black' : 'bg-white/[0.04] text-white/40'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">

        {/* ===== DASHBOARD ===== */}
        {tab === 'dash' && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {[
                { i: '👥', l: 'Юзеры', v: stats.userCount, c: 'text-blue-400' },
                { i: '💸', l: 'Транзакции', v: stats.totalTxs, c: 'text-emerald-400' },
                { i: '📊', l: 'Объём', v: `◎${stats.totalVolume.toFixed(0)}`, c: 'text-violet-400' },
                { i: '💰', l: 'Комиссии', v: `◎${stats.totalFees.toFixed(2)}`, c: 'text-yellow-400' },
                { i: '🔐', l: 'KYC очередь', v: pendingKYC.length, c: pendingKYC.length > 0 ? 'text-red-400' : 'text-emerald-400' },
                { i: '🏦', l: 'Счетов', v: allAccounts.length, c: 'text-cyan-400' },
              ].map(s => (
                <div key={s.l} className="glass p-4">
                  <div className="flex items-center gap-2 mb-2"><span>{s.i}</span><span className="text-[11px] text-white/30">{s.l}</span></div>
                  <p className={`text-2xl font-extrabold mono ${s.c}`}>{s.v}</p>
                </div>
              ))}
            </div>
            {pendingKYC.length > 0 && (
              <button onClick={() => setTab('kyc')} className="w-full glass-accent p-3 flex items-center gap-3 mb-4 active:scale-[0.98] transition-transform">
                <span className="text-xl">⚠️</span><p className="text-sm font-medium text-amber-400 flex-1">{pendingKYC.length} KYC ожидают</p><span className="text-white/30">→</span>
              </button>
            )}
            <p className="text-xs text-white/25 font-medium uppercase mb-2">Последняя активность</p>
            <div className="space-y-1.5">
              {(allTxs.length > 0 ? allTxs : txs).slice(0, 8).map((tx: any) => (
                <div key={tx.id} className="glass p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{tx.type} {tx.note ? `· ${tx.note}` : ''}</p>
                    <p className="text-[10px] text-white/20">{tx.from_user_id} → {tx.to_user_id}{tx.created_at ? ` · ${timeAgo(tx.created_at)}` : ''}</p>
                  </div>
                  <p className="text-xs font-bold mono">◎{Number(tx.amount).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== USERS ===== */}
        {tab === 'users' && (
          <div className="animate-fade-in">
            <div className="glass flex items-center px-4 gap-3 mb-4">
              <span className="text-white/30 text-sm">🔍</span>
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Имя, @username, Luna ID, TG ID..."
                className="flex-1 bg-transparent py-3 text-white outline-none text-sm" />
              {searchQ && <button onClick={() => setSearchQ('')} className="text-white/30 text-sm">✕</button>}
            </div>
            <p className="text-xs text-white/25 mb-2">{filtered.length} пользователей</p>
            <div className="space-y-2">
              {filtered.slice(0, 30).map((u: any, i: number) => {
                const isMe = u.telegram_id === OWNER_TELEGRAM_ID;
                return (
                  <div key={u.telegram_id} className={`glass p-3 animate-slide-up ${isMe ? 'ring-1 ring-yellow-500/20' : ''}`} style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-sm font-bold flex-shrink-0">{u.first_name?.[0] || '?'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{u.first_name} {u.last_name}{isMe ? ' (YOU)' : ''}</p>
                        <p className="text-[11px] text-white/25">@{u.username} · {u.luna_id}</p>
                        <p className="text-[10px] text-white/15">TG:{u.telegram_id} · LVL{u.level} · {u.subscription?.toUpperCase()} · KYC:{u.kyc_status}</p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                        u.telegram_id === OWNER_TELEGRAM_ID ? 'bg-yellow-400/15 text-yellow-400' :
                        u.role === 'admin' ? 'bg-blue-400/15 text-blue-400' :
                        u.role === 'blocked' ? 'bg-red-400/15 text-red-400' :
                        'bg-emerald-400/10 text-emerald-400'}`}>
                        {u.telegram_id === OWNER_TELEGRAM_ID ? 'OWNER' : u.role}
                      </span>
                    </div>
                    {!isMe && (
                      <div className="flex gap-1.5 mt-2 pt-2 border-t border-white/[0.04]">
                        <button onClick={() => { setSelUser(u); setEditRole(u.role); setEditSub(u.subscription); setEditLevel(String(u.level)); setEditXp(String(u.xp)); setShowUserModal(true); }}
                          className="flex-1 glass rounded-lg py-1.5 text-[10px] font-medium text-white/40 active:scale-95 transition-transform">✏️ Изменить</button>
                        {u.role === 'blocked'
                          ? <button onClick={() => unblockUser(u.telegram_id)} className="flex-1 glass rounded-lg py-1.5 text-[10px] font-medium text-emerald-400/60 active:scale-95 transition-transform">✅ Разблок</button>
                          : <button onClick={() => blockUser(u.telegram_id)} className="flex-1 glass rounded-lg py-1.5 text-[10px] font-medium text-red-400/60 active:scale-95 transition-transform">🚫 Блок</button>
                        }
                        {u.role !== 'admin' && u.role !== 'blocked'
                          ? <button onClick={() => makeAdmin(u.telegram_id)} className="flex-1 glass rounded-lg py-1.5 text-[10px] font-medium text-blue-400/60 active:scale-95 transition-transform">⬆️ Админ</button>
                          : u.role === 'admin'
                          ? <button onClick={() => removeAdmin(u.telegram_id)} className="flex-1 glass rounded-lg py-1.5 text-[10px] font-medium text-amber-400/60 active:scale-95 transition-transform">⬇️ Юзер</button>
                          : null
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== BALANCE MANAGEMENT ===== */}
        {tab === 'balance' && (
          <div className="animate-fade-in">
            <h3 className="font-bold mb-4">💰 Управление балансами</h3>

            {/* User ID input */}
            <div className="mb-4">
              <p className="text-xs text-white/35 mb-1.5 font-medium">Telegram ID пользователя</p>
              <div className="flex gap-2">
                <input type="text" value={balUserId} onChange={e => setBalUserId(e.target.value)} placeholder="Введите TG ID"
                  className="flex-1 glass px-4 py-3 bg-transparent text-white outline-none mono focus:ring-1 focus:ring-white/10" />
                <button onClick={loadBalAccounts} className="btn-primary px-4 py-3 text-sm">Найти</button>
              </div>
            </div>

            {/* User's accounts */}
            {balAccounts.length > 0 && (
              <>
                <p className="text-xs text-white/35 mb-2 font-medium">Счета пользователя</p>
                <div className="space-y-1.5 mb-4">
                  {balAccounts.map((acc: any) => (
                    <button key={acc.id} onClick={() => setBalSelAcc(acc.id)}
                      className={`w-full rounded-xl p-3 flex items-center gap-3 transition-all text-left
                        ${balSelAcc === acc.id ? 'bg-white/[0.08] ring-1 ring-white/15' : 'bg-white/[0.03]'}`}>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{acc.name} ({acc.currency})</p>
                        <p className="text-[11px] text-white/30 mono">Баланс: {Number(acc.balance).toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Action selector */}
                <p className="text-xs text-white/35 mb-2 font-medium">Действие</p>
                <div className="flex gap-2 mb-4">
                  {([
                    { id: 'add' as const, label: '➕ Начислить', color: 'bg-emerald-500' },
                    { id: 'remove' as const, label: '➖ Списать', color: 'bg-red-500' },
                    { id: 'set' as const, label: '🔧 Установить', color: 'bg-blue-500' },
                  ]).map(a => (
                    <button key={a.id} onClick={() => setBalAction(a.id)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${balAction === a.id ? `${a.color} text-white` : 'glass text-white/50'}`}>
                      {a.label}
                    </button>
                  ))}
                </div>

                {/* Amount */}
                <p className="text-xs text-white/35 mb-1.5 font-medium">Сумма</p>
                <input type="number" value={balAmount} onChange={e => setBalAmount(e.target.value)} placeholder="0.00"
                  className="w-full glass px-4 py-4 bg-transparent text-white text-2xl font-extrabold mono outline-none text-center mb-3" />
                <div className="flex gap-2 mb-4">
                  {[100, 500, 1000, 5000, 10000].map(v => (
                    <button key={v} onClick={() => setBalAmount(String(v))} className="flex-1 glass rounded-lg py-1.5 text-xs mono active:scale-95 transition-transform">
                      ◎{v >= 1000 ? `${v / 1000}K` : v}
                    </button>
                  ))}
                </div>

                {/* Note */}
                <input type="text" value={balNote} onChange={e => setBalNote(e.target.value)} placeholder="Причина (необязательно)"
                  className="w-full glass px-4 py-3 bg-transparent text-white text-sm outline-none mb-4 focus:ring-1 focus:ring-white/10" />

                {/* Execute */}
                <button onClick={executeBalance} disabled={!balAmount || !balSelAcc}
                  className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.97] disabled:opacity-30
                    ${balAction === 'add' ? 'bg-emerald-500 text-white' : balAction === 'remove' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                  {balAction === 'add' ? `➕ Начислить ◎${balAmount || 0}` : balAction === 'remove' ? `➖ Списать ◎${balAmount || 0}` : `🔧 Установить ◎${balAmount || 0}`}
                </button>

                {balDone && (
                  <div className="mt-3 glass p-3 text-center animate-scale-in">
                    <p className="text-emerald-400 font-bold">✅ Выполнено!</p>
                  </div>
                )}
              </>
            )}

            {balAccounts.length === 0 && balUserId && (
              <p className="text-center text-white/25 py-8">Введите TG ID и нажмите «Найти»</p>
            )}
          </div>
        )}

        {/* ===== KYC ===== */}
        {tab === 'kyc' && (
          <div className="animate-fade-in">
            {pendingKYC.length === 0 ? (
              <div className="text-center py-16"><div className="text-4xl mb-3">✅</div><p className="text-white/35">Очередь пуста</p></div>
            ) : (
              <div className="space-y-3">
                {pendingKYC.map((k: any, i: number) => (
                  <div key={k.user_id} className="glass p-4 border border-amber-500/10 animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                    <p className="font-bold mb-2">User: {k.user_id}</p>
                    <div className="glass p-3 space-y-1.5 mb-3 text-xs">
                      {[['📱', k.phone || '—'], ['📧', k.email || '—'], ['🎂', k.birth_date || '—'], ['📄', k.document_url ? '✅' : '❌'], ['🤳', k.selfie_url ? '✅' : '❌']].map(([ic, v]) => (
                        <div key={ic} className="flex justify-between"><span className="text-white/30">{ic}</span><span>{v}</span></div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveKYC(k.user_id)} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm active:scale-[0.97] transition-transform">✅ Одобрить</button>
                      <button onClick={() => rejectKYC(k.user_id)} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold text-sm active:scale-[0.97] transition-transform">❌ Отклонить</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== TRANSACTIONS ===== */}
        {tab === 'txs' && (
          <div className="space-y-1.5 animate-fade-in">
            <p className="text-xs text-white/25 mb-2">{allTxs.length || txs.length} транзакций</p>
            {(allTxs.length > 0 ? allTxs : txs).slice(0, 50).map((tx: any, i: number) => (
              <div key={tx.id || i} className="glass p-3 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 0.02}s` }}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  tx.type === 'transfer' ? 'bg-blue-500/15 text-blue-400' : tx.type === 'deposit' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-violet-500/15 text-violet-400'}`}>
                  {tx.type?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{tx.type} {tx.note ? `· ${tx.note}` : ''}</p>
                  <p className="text-[10px] text-white/20">{tx.from_user_id}→{tx.to_user_id} · {tx.created_at ? new Date(tx.created_at).toLocaleString('ru-RU') : '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold mono">◎{Number(tx.amount).toFixed(2)}</p>
                  {Number(tx.fee) > 0 && <p className="text-[10px] text-yellow-400/50">fee:◎{Number(tx.fee).toFixed(2)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== ACCOUNTS ===== */}
        {tab === 'accounts' && (
          <div className="animate-fade-in">
            <p className="text-xs text-white/25 mb-3">{allAccounts.length} счетов</p>
            <div className="space-y-2">
              {allAccounts.map((acc: any, i: number) => (
                <div key={acc.id} className="glass p-3 animate-slide-up" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{acc.name} ({acc.currency})</p>
                      <p className="text-[11px] text-white/25">{acc.users?.first_name} {acc.users?.last_name} · @{acc.users?.username}</p>
                      <p className="text-[10px] text-white/15 mono">{acc.account_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold mono text-sm">{Number(acc.balance).toFixed(2)}</p>
                      {acc.contract_signed && <span className="text-[9px] text-emerald-400/60">✓</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== MASS NOTIFICATION ===== */}
        {tab === 'notify' && (
          <div className="animate-fade-in">
            <h3 className="font-bold mb-4">📢 Рассылка уведомлений</h3>

            {/* Target */}
            <p className="text-xs text-white/35 mb-2 font-medium">Получатели</p>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setNotifTarget('all')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${notifTarget === 'all' ? 'bg-white text-black' : 'glass text-white/50'}`}>
                👥 Все ({allUsers.length})
              </button>
              <button onClick={() => setNotifTarget('single')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${notifTarget === 'single' ? 'bg-white text-black' : 'glass text-white/50'}`}>
                👤 Один
              </button>
            </div>

            {notifTarget === 'single' && (
              <div className="mb-4">
                <p className="text-xs text-white/35 mb-1.5 font-medium">Telegram ID</p>
                <input type="text" value={notifUserId} onChange={e => setNotifUserId(e.target.value)} placeholder="TG ID"
                  className="w-full glass px-4 py-3 bg-transparent text-white outline-none mono focus:ring-1 focus:ring-white/10" />
              </div>
            )}

            <p className="text-xs text-white/35 mb-1.5 font-medium">Заголовок</p>
            <input type="text" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="🌙 Luna Bank"
              className="w-full glass px-4 py-3 bg-transparent text-white outline-none mb-3 focus:ring-1 focus:ring-white/10" />

            <p className="text-xs text-white/35 mb-1.5 font-medium">Сообщение</p>
            <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} placeholder="Текст уведомления..."
              rows={3} className="w-full glass px-4 py-3 bg-transparent text-white outline-none resize-none mb-4 focus:ring-1 focus:ring-white/10" />

            <button onClick={sendNotification} disabled={!notifTitle || !notifMsg}
              className="btn-primary w-full">
              📢 Отправить {notifTarget === 'all' ? `всем (${allUsers.length})` : 'пользователю'}
            </button>

            {notifSent && (
              <div className="mt-3 glass p-3 text-center animate-scale-in">
                <p className="text-emerald-400 font-bold">✅ Отправлено!</p>
              </div>
            )}
          </div>
        )}

        {/* ===== SECURITY ===== */}
        {tab === 'security' && (
          <div className="space-y-4 animate-fade-in">
            <div className="glass p-4">
              <h3 className="font-bold mb-3">Доступ</h3>
              <div className="space-y-2 text-sm">
                {[['Owner', String(OWNER_TELEGRAM_ID)], ['Админы', String(allUsers.filter((u: any) => u.role === 'admin').length)],
                  ['Заблокированные', String(allUsers.filter((u: any) => u.role === 'blocked').length)],
                  ['С биометрией', String(allUsers.filter((u: any) => u.biometrics_enabled).length)],
                  ['KYC одобрено', String(allUsers.filter((u: any) => u.kyc_status === 'approved').length)],
                ].map(([l, v]) => <div key={l} className="flex justify-between"><span className="text-white/30">{l}</span><span className="mono">{v}</span></div>)}
              </div>
            </div>
            <div className="glass p-4">
              <h3 className="font-bold mb-3">Подозрительная активность</h3>
              <p className="text-sm text-emerald-400">✅ Не обнаружена</p>
            </div>
          </div>
        )}

        {/* ===== SYSTEM ===== */}
        {tab === 'system' && (
          <div className="space-y-3 animate-fade-in">
            {[
              { i: '◎', t: 'Курс LNC', d: `1 LNC = $${LNC_RATE_USD}` },
              { i: '💰', t: 'Комиссии', d: 'Free 0.5% | Plus 0.3% | Cosmic 0%' },
              { i: '📊', t: 'Лимиты', d: 'Free $1K | Plus $10K | Cosmic ∞' },
              { i: '🔐', t: 'KYC лимит', d: '$50,000/мес' },
              { i: '🏦', t: 'Project Wallet', d: 'UQA9IgVuB-8GUV...F1VuZJD' },
              { i: '🌐', t: 'Supabase', d: 'lffdzsbqnrjmhdneolrh' },
              { i: '📱', t: 'Версия', d: 'v1.2' },
              { i: '👤', t: 'Owner TG ID', d: String(OWNER_TELEGRAM_ID) },
            ].map(s => (
              <div key={s.t} className="glass p-3.5 flex items-center gap-3">
                <span className="text-xl w-8 text-center">{s.i}</span>
                <div className="flex-1"><p className="font-semibold text-sm">{s.t}</p><p className="text-[11px] text-white/25">{s.d}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== USER EDIT MODAL ===== */}
      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title={`✏️ ${selUser?.first_name || ''} ${selUser?.last_name || ''}`}>
        {selUser && (
          <div className="space-y-4">
            <div className="glass p-3 space-y-1.5 text-xs">
              {[['TG ID', selUser.telegram_id], ['Luna ID', selUser.luna_id], ['Username', `@${selUser.username}`]].map(([l, v]) => (
                <div key={l} className="flex justify-between"><span className="text-white/30">{l}</span><span className="mono">{v}</span></div>
              ))}
            </div>

            <div>
              <p className="text-xs text-white/35 mb-1.5">Роль</p>
              <select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full glass px-4 py-3 bg-transparent text-white outline-none">
                <option value="user" className="bg-black">user</option>
                <option value="admin" className="bg-black">admin</option>
                <option value="blocked" className="bg-black">blocked</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-white/35 mb-1.5">Подписка</p>
              <select value={editSub} onChange={e => setEditSub(e.target.value)} className="w-full glass px-4 py-3 bg-transparent text-white outline-none">
                {SUBSCRIPTION_PLANS.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name} (${p.price})</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="text-xs text-white/35 mb-1.5">Level</p>
                <input type="number" value={editLevel} onChange={e => setEditLevel(e.target.value)} className="w-full glass px-4 py-3 bg-transparent text-white outline-none mono" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/35 mb-1.5">XP</p>
                <input type="number" value={editXp} onChange={e => setEditXp(e.target.value)} className="w-full glass px-4 py-3 bg-transparent text-white outline-none mono" />
              </div>
            </div>

            <button onClick={saveUserEdit} className="btn-primary w-full">💾 Сохранить</button>

            <button onClick={() => deleteUser(selUser.telegram_id)}
              className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm active:scale-[0.97] transition-transform">
              🗑️ Удалить пользователя
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
