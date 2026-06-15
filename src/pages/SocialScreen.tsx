import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { dbUpdateBalance } from '../lib/db';
import { supabase } from '../lib/supabase';
import { ArrowLeftIcon, UsersIcon, PhoneIcon, SearchIcon } from '../components/Icons';
import { requestContact, formatPhone, showAlert } from '../lib/telegram';
import { dbSavePhone } from '../lib/db';
import Modal from '../components/Modal';

export default function SocialScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif, txs, patchUser } = useStore();
  const [tab, setTab] = useState<'activity' | 'friends'>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [showTip, setShowTip] = useState(false);
  const [tipUser, setTipUser] = useState<any>(null);
  const [tipAmt, setTipAmt] = useState('10');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);

  if (!user) return null;
  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const balance = lncAcc?.balance || 0;

  // Load real users from Supabase
  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('telegram_id, username, first_name, last_name, level, xp, subscription, phone_number')
        .neq('telegram_id', user.telegram_id)
        .order('level', { ascending: false })
        .limit(20);
      setFriends(data || []);
    } catch {}
    setLoading(false);
  };

  // ===== Share contact to find friends =====
  const handleFindFriends = async () => {
    setInviting(true);
    haptic('medium');

    const contact = await requestContact();
    if (contact) {
      // Save user's own phone if not saved
      if (!user.phone_number) {
        await dbSavePhone(user.telegram_id, contact.phone_number);
        patchUser({ phone_number: contact.phone_number });
      }
      haptic('success');
      await showAlert('✅ Контакт привязан! Теперь друзья смогут найти вас по номеру телефона.');
      loadFriends();
    }
    setInviting(false);
  };

  // ===== Invite friend via Telegram =====
  const handleInvite = () => {
    haptic('light');
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink('https://t.me/share/url?url=https://t.me/LunaBankBot&text=Присоединяйся к Luna Bank! 🌙 Крипто-банк прямо в Telegram');
    } else {
      window.open('https://t.me/share/url?url=https://t.me/LunaBankBot&text=Присоединяйся к Luna Bank! 🌙', '_blank');
    }
  };

  const sendTip = () => {
    const amt = parseFloat(tipAmt) || 0;
    if (!lncAcc || amt <= 0 || amt > balance || !tipUser) { haptic('error'); return; }
    haptic('success');
    updateBalance(lncAcc.id, -amt);
    dbUpdateBalance(lncAcc.id, -amt).catch(() => {});
    addTx({ id: uid(), from_user_id: user.telegram_id, to_user_id: tipUser.telegram_id, from_account_id: lncAcc.id, to_account_id: 'tip', amount: amt, fee: 0, currency: 'LNC', type: 'transfer', status: 'completed', note: `Чаевые @${tipUser.username}`, created_at: new Date().toISOString() });
    addNotif({ id: uid(), title: '☕ Чаевые', message: `🌙${amt} → @${tipUser.username}`, type: 'transfer', read: false, created_at: new Date().toISOString() });
    setShowTip(false);
  };

  // Show real transactions as activity
  const recentTxs = txs.slice(0, 10);

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Сообщество</h1>
        <button onClick={loadFriends} className={`glass rounded-full w-8 h-8 flex items-center justify-center text-xs ${loading ? 'animate-spin' : ''}`}>🔄</button>
      </div>

      <div className="px-5 flex gap-2 mb-3">
        {(['friends', 'activity'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'activity' ? '📊 Активность' : `👥 Юзеры (${friends.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {tab === 'activity' && (
          <div className="space-y-3 animate-fade-in">
            {recentTxs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-white/35">Нет активности</p>
                <p className="text-xs text-white/20 mt-1">Здесь будут ваши операции</p>
              </div>
            ) : (
              recentTxs.map((tx, i) => (
                <div key={tx.id} className="glass p-3 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-lg">
                    {tx.type === 'transfer' ? '📤' : tx.type === 'deposit' ? '📥' : tx.type === 'job' ? '💼' : '💰'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.note || tx.type}</p>
                    <p className="text-[11px] text-white/25">{timeAgo(tx.created_at)}</p>
                  </div>
                  <p className={`font-bold mono text-sm ${tx.from_user_id === user.telegram_id ? 'text-red-400' : 'text-emerald-400'}`}>
                    {tx.from_user_id === user.telegram_id ? '-' : '+'}🌙{tx.amount}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'friends' && (
          <div className="animate-fade-in">
            {/* Find friends / Invite buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleFindFriends}
                disabled={inviting}
                className="flex-1 glass-accent p-3 flex items-center gap-2.5 rounded-2xl active:scale-[0.98] transition-transform"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <PhoneIcon size={16} color="#3b82f6" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold">Найти друзей</p>
                  <p className="text-[9px] text-white/25">По контакту</p>
                </div>
              </button>
              <button
                onClick={handleInvite}
                className="flex-1 glass-accent p-3 flex items-center gap-2.5 rounded-2xl active:scale-[0.98] transition-transform"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <span className="text-lg">📨</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold">Пригласить</p>
                  <p className="text-[9px] text-white/25">Отправить ссылку</p>
                </div>
              </button>
            </div>

            {friends.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" />
                <p className="text-white/35">Пока нет других пользователей</p>
                <p className="text-xs text-white/20 mt-1">Пригласите друзей в Luna Bank</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((f, i) => (
                  <div key={f.telegram_id} className="glass p-3 flex items-center gap-3 animate-slide-up rounded-2xl" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xl font-bold">
                      {f.first_name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{f.first_name} {f.last_name}</p>
                      <p className="text-[11px] text-white/25">@{f.username} · LVL {f.level}</p>
                      {f.phone_number && (
                        <p className="text-[9px] text-white/15 mono">📱 {formatPhone(f.phone_number)}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setTipUser(f); setShowTip(true); haptic('light'); }}
                        className="glass rounded-lg px-2.5 py-1.5 text-xs active:scale-95 transition-transform"
                      >
                        ☕
                      </button>
                      <button
                        onClick={() => {
                          haptic('light');
                          // Navigate to transfer with this user pre-selected
                          go('transfer');
                        }}
                        className="glass rounded-lg px-2.5 py-1.5 text-xs active:scale-95 transition-transform"
                      >
                        📤
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tip modal */}
      <Modal open={showTip} onClose={() => setShowTip(false)} title={`☕ @${tipUser?.username || ''}`}>
        <div className="space-y-4">
          <input type="number" value={tipAmt} onChange={e => setTipAmt(e.target.value)} placeholder="Сумма"
            className="w-full glass px-4 py-3.5 bg-transparent text-white text-xl font-bold mono outline-none text-center rounded-xl" />
          <div className="flex gap-2">
            {[5, 10, 50, 100].map(v => (
              <button key={v} onClick={() => setTipAmt(String(v))}
                className={`flex-1 glass rounded-lg py-2 text-xs mono active:scale-95 transition-transform ${
                  tipAmt === String(v) ? 'ring-1 ring-white/20' : ''
                }`}>🌙{v}</button>
            ))}
          </div>
          <button onClick={sendTip} disabled={(parseFloat(tipAmt) || 0) > balance}
            className="btn-primary w-full">
            Отправить ☕ 🌙{tipAmt}
          </button>
        </div>
      </Modal>
    </div>
  );
}
