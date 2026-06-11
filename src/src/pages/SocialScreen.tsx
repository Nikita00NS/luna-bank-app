import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction, dbCreateNotification } from '../lib/sync';
import Modal from '../components/Modal';

const MOCK_FRIENDS = [
  { id: 1, name: 'Alex Smith', username: 'alex_smith', avatar: '🧑', level: 12, status: 'Level Up! → LVL 12 🎉' },
  { id: 2, name: 'Maria K.', username: 'maria_k', avatar: '👩', level: 8, status: 'Купила NFT Golden Moon 🌕' },
  { id: 3, name: 'CryptoKing', username: 'crypto_king', avatar: '👑', level: 25, status: 'Выиграл ◎2000 в Crash! 🚀' },
  { id: 4, name: 'Luna Pro', username: 'luna_pro', avatar: '🌙', level: 19, status: 'Открыл вклад на 90 дней 💎' },
  { id: 5, name: 'DeFi Lord', username: 'defi_lord', avatar: '🏆', level: 15, status: 'Обменял 500 TON → LNC 💱' },
];

const STORIES = [
  { id: 's1', user: 'alex_smith', avatar: '🧑', type: 'levelup', text: 'Достиг LVL 12!', time: new Date(Date.now()-3600000).toISOString(), color: 'from-violet-500 to-pink-500' },
  { id: 's2', user: 'maria_k', avatar: '👩', type: 'nft', text: 'Новый NFT: Golden Moon', time: new Date(Date.now()-7200000).toISOString(), color: 'from-yellow-500 to-amber-500' },
  { id: 's3', user: 'crypto_king', avatar: '👑', type: 'win', text: 'Выигрыш ◎2000!', time: new Date(Date.now()-10800000).toISOString(), color: 'from-emerald-500 to-cyan-500' },
  { id: 's4', user: '+', avatar: '➕', type: 'add', text: 'Ваша история', time: '', color: 'from-white/10 to-white/5' },
];

export default function SocialScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [tab, setTab] = useState<'feed' | 'friends' | 'gifts'>('feed');
  const [showTip, setShowTip] = useState(false);
  const [tipUser, setTipUser] = useState<typeof MOCK_FRIENDS[0] | null>(null);
  const [tipAmount, setTipAmount] = useState('10');
  const [showStory, setShowStory] = useState<typeof STORIES[0] | null>(null);
  const [showGift, setShowGift] = useState(false);
  const [giftUser, setGiftUser] = useState('');
  const [giftAmount, setGiftAmount] = useState('');
  const [giftMsg, setGiftMsg] = useState('');
  const [giftSent, setGiftSent] = useState(false);

  if (!user) return null;
  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const balance = lncAcc?.balance || 0;

  const sendTip = () => {
    const amt = parseFloat(tipAmount) || 0;
    if (!lncAcc || amt <= 0 || amt > balance) { haptic('error'); return; }
    haptic('success');
    updateBalance(lncAcc.id, -amt);
    dbUpdateBalance(lncAcc.id, -amt).catch(() => {});
    addTx({ id: uid(), from_user_id: user.telegram_id, to_user_id: tipUser?.id || 0, from_account_id: lncAcc.id, to_account_id: 'tip', amount: amt, fee: 0, currency: 'LNC', type: 'transfer', status: 'completed', note: `Чаевые @${tipUser?.username}`, created_at: new Date().toISOString() });
    addNotif({ id: uid(), title: '☕ Чаевые отправлены', message: `◎${amt} → @${tipUser?.username}`, type: 'transfer', read: false, created_at: new Date().toISOString() });
    setShowTip(false);
  };

  const sendGift = () => {
    const amt = parseFloat(giftAmount) || 0;
    if (!lncAcc || amt <= 0 || amt > balance || !giftUser) { haptic('error'); return; }
    haptic('success');
    updateBalance(lncAcc.id, -amt);
    dbUpdateBalance(lncAcc.id, -amt).catch(() => {});
    addTx({ id: uid(), from_user_id: user.telegram_id, to_user_id: 0, from_account_id: lncAcc.id, to_account_id: 'gift', amount: amt, fee: 0, currency: 'LNC', type: 'transfer', status: 'completed', note: `🎁 Подарок @${giftUser}: ${giftMsg}`, created_at: new Date().toISOString() });
    addNotif({ id: uid(), title: '🎁 Подарок отправлен!', message: `◎${amt} → @${giftUser}`, type: 'transfer', read: false, created_at: new Date().toISOString() });
    setGiftSent(true);
    setTimeout(() => { setShowGift(false); setGiftSent(false); setGiftAmount(''); setGiftMsg(''); }, 2000);
  };

  const FEED = [
    { id: 'f1', user: MOCK_FRIENDS[0], action: 'перевёл ◎500 пользователю @maria_k', icon: '📤', time: new Date(Date.now()-1800000).toISOString() },
    { id: 'f2', user: MOCK_FRIENDS[2], action: 'выиграл ◎2000 в Crash 🚀', icon: '🎰', time: new Date(Date.now()-5400000).toISOString() },
    { id: 'f3', user: MOCK_FRIENDS[1], action: 'купила NFT "Golden Moon" 🌕', icon: '🎨', time: new Date(Date.now()-9000000).toISOString() },
    { id: 'f4', user: MOCK_FRIENDS[3], action: 'открыл вклад ◎5000 на 90 дней', icon: '💎', time: new Date(Date.now()-14400000).toISOString() },
    { id: 'f5', user: MOCK_FRIENDS[4], action: 'обменял 500 TON → ◎14,600 LNC', icon: '💱', time: new Date(Date.now()-21600000).toISOString() },
    { id: 'f6', user: MOCK_FRIENDS[0], action: 'достиг LVL 12 в Luna City! 🏆', icon: '⬆️', time: new Date(Date.now()-28800000).toISOString() },
  ];

  const GIFT_WRAPS = ['🎁', '🎀', '💝', '🎊', '🌟', '🎉'];

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">👥 Социальное</h1>
      </div>

      {/* Stories row */}
      <div className="px-5 mb-3">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STORIES.map(s => (
            <button key={s.id} onClick={() => { if (s.type !== 'add') { haptic('light'); setShowStory(s); } }}
              className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl ring-2 ring-offset-2 ring-offset-black ${s.type === 'add' ? 'ring-white/20' : 'ring-violet-500/50'}`}>
                {s.avatar}
              </div>
              <p className="text-[10px] text-white/40 w-16 text-center truncate">{s.user}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 flex gap-2 mb-3">
        {(['feed', 'friends', 'gifts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'feed' ? '📰 Лента' : t === 'friends' ? '👥 Друзья' : '🎁 Подарки'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {tab === 'feed' && (
          <div className="space-y-3 animate-fade-in">
            {FEED.map((item, i) => (
              <div key={item.id} className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-lg">
                    {item.user.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm"><span className="font-bold">{item.user.name}</span> <span className="text-white/40">{item.action}</span></p>
                    <p className="text-[11px] text-white/25 mt-0.5">{timeAgo(item.time)}</p>
                  </div>
                  <span className="text-xl">{item.icon}</span>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                  <button className="flex-1 glass rounded-lg py-1.5 text-xs text-white/40 active:scale-95 transition-transform">❤️ Нравится</button>
                  <button onClick={() => { setTipUser(item.user); setShowTip(true); haptic('light'); }}
                    className="flex-1 glass rounded-lg py-1.5 text-xs text-white/40 active:scale-95 transition-transform">☕ Чаевые</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'friends' && (
          <div className="space-y-2 animate-fade-in">
            {MOCK_FRIENDS.map((f, i) => (
              <div key={f.id} className="glass rounded-xl p-3 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xl">{f.avatar}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{f.name}</p>
                  <p className="text-[11px] text-white/25 truncate">{f.status}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => { setTipUser(f); setShowTip(true); haptic('light'); }}
                    className="glass rounded-lg px-2.5 py-1.5 text-xs active:scale-95 transition-transform">☕</button>
                  <button onClick={() => { setGiftUser(f.username); setShowGift(true); haptic('light'); }}
                    className="glass rounded-lg px-2.5 py-1.5 text-xs active:scale-95 transition-transform">🎁</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'gifts' && (
          <div className="animate-fade-in">
            <div className="text-center py-6">
              <p className="text-5xl mb-3 animate-float">🎁</p>
              <h3 className="font-extrabold text-lg mb-2">Подарки Luna Bank</h3>
              <p className="text-sm text-white/35 mb-6">Отправьте LNC в красивой обёртке</p>
              <button onClick={() => setShowGift(true)} className="btn-primary px-8">Отправить подарок</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-6">
              {GIFT_WRAPS.map((w, i) => (
                <div key={i} className="glass rounded-2xl p-6 text-center animate-scale-in" style={{ animationDelay: `${i * 0.08}s` }}>
                  <p className="text-4xl mb-1">{w}</p>
                  <p className="text-[10px] text-white/25">Обёртка {i + 1}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Story viewer */}
      {showStory && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in" onClick={() => setShowStory(null)}>
          <div className={`flex-1 bg-gradient-to-b ${showStory.color} to-black flex flex-col items-center justify-center px-8`}>
            <p className="text-6xl mb-4">{showStory.avatar}</p>
            <p className="text-2xl font-extrabold text-center mb-2">{showStory.text}</p>
            <p className="text-sm text-white/40">@{showStory.user} · {timeAgo(showStory.time)}</p>
          </div>
          <div className="px-5 py-4 safe-bottom"><p className="text-center text-white/25 text-xs">Нажмите для закрытия</p></div>
        </div>
      )}

      {/* Tip modal */}
      <Modal open={showTip} onClose={() => setShowTip(false)} title={`☕ Чаевые @${tipUser?.username}`}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 glass rounded-xl p-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-lg">{tipUser?.avatar}</div>
            <div><p className="font-bold">{tipUser?.name}</p><p className="text-xs text-white/30">LVL {tipUser?.level}</p></div>
          </div>
          <input type="number" value={tipAmount} onChange={e => setTipAmount(e.target.value)} placeholder="Сумма"
            className="w-full glass rounded-xl px-4 py-3.5 bg-transparent text-white text-xl font-bold tabular-nums outline-none text-center" />
          <div className="flex gap-2">{[5, 10, 50, 100].map(v => <button key={v} onClick={() => setTipAmount(String(v))} className="flex-1 glass rounded-lg py-2 text-xs tabular-nums active:scale-95 transition-transform">◎{v}</button>)}</div>
          <button onClick={sendTip} disabled={(parseFloat(tipAmount)||0) > balance} className="btn-primary w-full">Отправить ☕ ◎{tipAmount}</button>
        </div>
      </Modal>

      {/* Gift modal */}
      <Modal open={showGift} onClose={() => { setShowGift(false); setGiftSent(false); }} title="🎁 Отправить подарок">
        {giftSent ? (
          <div className="text-center py-6 animate-scale-in">
            <p className="text-6xl mb-3">🎉</p>
            <p className="text-xl font-extrabold text-emerald-400">Подарок отправлен!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <input type="text" value={giftUser} onChange={e => setGiftUser(e.target.value)} placeholder="@username получателя"
              className="w-full glass rounded-xl px-4 py-3 bg-transparent text-white text-sm outline-none" />
            <input type="number" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} placeholder="Сумма LNC"
              className="w-full glass rounded-xl px-4 py-3.5 bg-transparent text-white text-xl font-bold tabular-nums outline-none text-center" />
            <input type="text" value={giftMsg} onChange={e => setGiftMsg(e.target.value)} placeholder="Сообщение (необязательно)"
              className="w-full glass rounded-xl px-4 py-3 bg-transparent text-white text-sm outline-none" />
            <div className="flex gap-2">{[50, 100, 500, 1000].map(v => <button key={v} onClick={() => setGiftAmount(String(v))} className="flex-1 glass rounded-lg py-2 text-xs tabular-nums active:scale-95 transition-transform">◎{v}</button>)}</div>
            <button onClick={sendGift} disabled={!giftUser || (parseFloat(giftAmount)||0) <= 0} className="btn-primary w-full">🎁 Отправить подарок</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
