import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction, dbSearchUsers, dbSearchByPhone } from '../lib/db';
import { supabase } from '../lib/supabase';
import { ArrowLeftIcon, SearchIcon, PhoneIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import LncIcon from '../components/LncIcon';
import { notifyTransferReceived } from '../lib/bot';
import { requestContact, formatPhone } from '../lib/telegram';
import Modal from '../components/Modal';

// ===== DATA =====
interface Favorite {
  id: string;
  name: string;
  icon: string;
  type: string;
  target: string;
}

const TRANSFER_METHODS = [
  { id: 'between', icon: '🔄', label: 'Между счетами', desc: 'Ваши счета' },
  { id: 'card', icon: '💳', label: 'По номеру карты', desc: 'На карту Luna' },
  { id: 'country', icon: '🌍', label: 'В другую страну', desc: 'Международный' },
  { id: 'requisites', icon: '📋', label: 'По реквизитам', desc: 'IBAN / SWIFT' },
];

const PAYMENT_CATS = [
  { id: 'mobile', icon: '📱', label: 'Мобильная связь',
    services: [{ n: 'МТС', i: '📶' }, { n: 'Билайн', i: '📡' }, { n: 'МегаФон', i: '📞' }, { n: 'Tele2', i: '📲' }, { n: 'Yota', i: '🔵' }] },
  { id: 'housing', icon: '🏠', label: 'ЖКХ',
    services: [{ n: 'Электричество', i: '⚡' }, { n: 'Газ', i: '🔥' }, { n: 'Вода', i: '💧' }, { n: 'Отопление', i: '🌡️' }] },
  { id: 'gaming', icon: '🎮', label: 'Игры',
    services: [{ n: 'Steam', i: '🎯' }, { n: 'PlayStation', i: '🎮' }, { n: 'Xbox', i: '🟢' }, { n: 'Roblox', i: '🧱' }, { n: 'Fortnite', i: '🔫' }] },
  { id: 'internet', icon: '🌐', label: 'Интернет',
    services: [{ n: 'Ростелеком', i: '🏢' }, { n: 'Дом.ру', i: '🏠' }, { n: 'Билайн', i: '📡' }] },
  { id: 'transport', icon: '🚌', label: 'Транспорт',
    services: [{ n: 'Тройка', i: '🚇' }, { n: 'Стрелка', i: '🚌' }] },
  { id: 'education', icon: '🎓', label: 'Образование',
    services: [{ n: 'Университет', i: '🏛️' }, { n: 'Курсы', i: '📚' }] },
];

const ACTIONS = [
  { id: 'request', icon: '📥', label: 'Запросить деньги' },
  { id: 'qr', icon: '📱', label: 'QR-перевод' },
];

type Page = 'main' | 'phone-transfer' | 'between' | 'pay-service' | 'pay-form' | 'pay-confirm' | 'pay-success';

export default function PaymentsScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [page, setPage] = useState<Page>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentContacts, setRecentContacts] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    try { return JSON.parse(localStorage.getItem('luna-favorites') || '[]'); } catch { return []; }
  });

  // Pay state
  const [selCat, setSelCat] = useState<typeof PAYMENT_CATS[0] | null>(null);
  const [selSvc, setSelSvc] = useState<any>(null);
  const [payAccount, setPayAccount] = useState('');
  const [payAmount, setPayAmount] = useState('');

  // Between accounts state
  const [fromAccId, setFromAccId] = useState('');
  const [toAccId, setToAccId] = useState('');
  const [betweenAmt, setBetweenAmt] = useState('');

  if (!user) return null;
  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const val = parseFloat(payAmount) || 0;

  // Load recent contacts
  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('telegram_id, username, first_name, last_name, photo_url')
        .neq('telegram_id', user.telegram_id)
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentContacts(data || []);
    } catch {}
  };

  // Search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await dbSearchUsers(searchQuery, user.telegram_id);
        setSearchResults(r);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute between accounts transfer
  const executeBetween = () => {
    const amt = parseFloat(betweenAmt) || 0;
    const fromAcc = accounts.find(a => a.id === fromAccId);
    const toAcc = accounts.find(a => a.id === toAccId);
    if (!fromAcc || !toAcc || amt <= 0 || fromAcc.balance < amt || fromAccId === toAccId) { haptic('error'); return; }

    haptic('success');
    updateBalance(fromAccId, -amt);
    updateBalance(toAccId, amt);
    dbUpdateBalance(fromAccId, -amt).catch(() => {});
    dbUpdateBalance(toAccId, amt).catch(() => {});
    addTx({ id: uid(), from_user_id: user.telegram_id, to_user_id: user.telegram_id, from_account_id: fromAccId, to_account_id: toAccId, amount: amt, fee: 0, currency: fromAcc.currency, type: 'transfer', status: 'completed', note: `Перевод: ${fromAcc.name} → ${toAcc.name}`, created_at: new Date().toISOString() });
    addNotif({ id: uid(), title: '🔄 Перевод между счетами', message: `🌙${amt} ${fromAcc.name} → ${toAcc.name}`, type: 'transfer', read: false, created_at: new Date().toISOString() });
    setPage('pay-success');
  };

  // Execute service payment
  const executePayment = () => {
    if (!lncAcc || val <= 0 || val > lncAcc.balance || !payAccount || !selSvc) { haptic('error'); return; }
    haptic('success');
    updateBalance(lncAcc.id, -val);
    dbUpdateBalance(lncAcc.id, -val).catch(() => {});
    const txData = { id: uid(), from_user_id: user.telegram_id, to_user_id: 0, from_account_id: lncAcc.id, to_account_id: 'payment', amount: val, fee: 0, currency: 'LNC' as const, type: 'withdrawal' as const, status: 'completed' as const, note: `Оплата: ${selSvc.n} (${payAccount})`, created_at: new Date().toISOString() };
    addTx(txData);
    dbCreateTransaction(txData).catch(() => {});
    addNotif({ id: uid(), title: '✅ Оплачено', message: `${selSvc.n}: 🌙${val}`, type: 'system', read: false, created_at: new Date().toISOString() });
    setPage('pay-success');
  };

  const goBack = () => {
    if (page === 'main') go('home');
    else if (page === 'pay-form') setPage('pay-service');
    else if (page === 'pay-confirm') setPage('pay-form');
    else setPage('main');
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={goBack} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1 text-lg">Платежи</h1>
        <button onClick={() => go('qr')} className="glass rounded-full w-9 h-9 flex items-center justify-center text-sm">📷</button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* ===== MAIN PAGE (like T-Bank) ===== */}
        {page === 'main' && (
          <div className="animate-fade-in">
            {/* Search */}
            <div className="px-5 mt-2">
              <div className="glass flex items-center px-4 gap-3 rounded-2xl">
                <SearchIcon size={16} color="rgba(255,255,255,0.3)" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск" className="flex-1 bg-transparent py-3 text-white outline-none text-sm" />
              </div>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="px-5 mt-3 space-y-1.5">
                {searchResults.map((r: any) => (
                  <button key={r.telegram_id} onClick={() => { haptic('light'); useStore.getState().selTx(null); go('transfer'); }}
                    className="w-full glass p-3 flex items-center gap-3 rounded-xl active:scale-[0.98]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold">{r.first_name?.[0]}</div>
                    <div className="text-left"><p className="font-bold text-sm">{r.first_name} {r.last_name}</p><p className="text-[10px] text-white/25">@{r.username}</p></div>
                  </button>
                ))}
              </div>
            )}

            {/* Favorites */}
            {favorites.length > 0 && (
              <div className="px-5 mt-5">
                <div className="flex justify-between mb-3"><h3 className="font-bold">Избранное</h3><span className="text-xs text-white/30">Все</span></div>
                <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar">
                  {favorites.map((f) => (
                    <div key={f.id} className="glass p-3 rounded-2xl min-w-[120px] shrink-0 relative">
                      <button className="absolute top-2 right-2 text-white/20 text-xs">✕</button>
                      <div className="text-2xl mb-2">{f.icon}</div>
                      <p className="text-xs font-medium truncate">{f.name}</p>
                      <p className="text-[9px] text-white/25 truncate">{f.target}</p>
                    </div>
                  ))}
                  <button className="glass p-3 rounded-2xl min-w-[100px] shrink-0 flex flex-col items-center justify-center gap-1.5"
                    onClick={() => haptic('light')}>
                    <span className="text-2xl">➕</span>
                    <span className="text-[10px] text-white/40">Добавить</span>
                  </button>
                </div>
              </div>
            )}

            {/* On payment + Regular */}
            <div className="px-5 mt-5 flex gap-2">
              <button className="flex-1 glass p-3.5 rounded-2xl flex items-center gap-3 active:scale-[0.98]"
                onClick={() => { haptic('light'); setPage('pay-service'); setSelCat(PAYMENT_CATS[0]); }}>
                <span className="text-lg">📋</span>
                <span className="text-sm font-medium">На оплату</span>
              </button>
              <button className="flex-1 glass p-3.5 rounded-2xl flex items-center gap-3 active:scale-[0.98] relative"
                onClick={() => haptic('light')}>
                <span className="text-lg">🔁</span>
                <span className="text-sm font-medium">Регулярные</span>
              </button>
            </div>

            {/* Transfer by phone */}
            <div className="px-5 mt-5">
              <div className="glass p-4 rounded-2xl">
                <h3 className="font-bold mb-3">Перевод по телефону 📲</h3>
                <div className="glass flex items-center px-3 gap-2 rounded-xl mb-3">
                  <PhoneIcon size={14} color="rgba(255,255,255,0.3)" />
                  <input type="text" placeholder="Введите номер или имя"
                    className="flex-1 bg-transparent py-2.5 text-white outline-none text-sm"
                    onFocus={() => { setPage('phone-transfer'); }} />
                </div>
                {/* Recent contacts */}
                <div className="flex gap-4 overflow-x-auto -mx-1 px-1 pb-1 no-scrollbar">
                  {recentContacts.slice(0, 6).map((c) => (
                    <button key={c.telegram_id} onClick={() => { haptic('light'); go('transfer'); }}
                      className="flex flex-col items-center gap-1.5 shrink-0 w-16 active:scale-95">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="" className="w-14 h-14 rounded-full ring-1 ring-white/10" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-lg font-bold">
                          {c.first_name?.[0] || '?'}
                        </div>
                      )}
                      <p className="text-[10px] text-white/50 text-center truncate w-full">{c.first_name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Transfers */}
            <div className="px-5 mt-5">
              <div className="glass p-4 rounded-2xl">
                <div className="flex justify-between mb-3"><h3 className="font-bold">Переводы</h3><button onClick={() => go('transfer')} className="text-xs text-blue-400">Все</button></div>
                <div className="flex gap-2 overflow-x-auto -mx-1 px-1 no-scrollbar">
                  {TRANSFER_METHODS.map((m) => (
                    <button key={m.id} onClick={() => {
                      haptic('light');
                      if (m.id === 'between') setPage('between');
                      else go('transfer');
                    }} className="glass p-3 rounded-2xl min-w-[110px] shrink-0 flex flex-col gap-2 active:scale-95">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-xl">{m.icon}</div>
                      <p className="text-xs font-medium">{m.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Payments (services) */}
            <div className="px-5 mt-5">
              <div className="glass p-4 rounded-2xl">
                <div className="flex justify-between mb-3"><h3 className="font-bold">Платежи</h3><button className="text-xs text-blue-400" onClick={() => setPage('pay-service')}>Все</button></div>
                <div className="flex gap-2 overflow-x-auto -mx-1 px-1 no-scrollbar">
                  {PAYMENT_CATS.slice(0, 4).map((cat) => (
                    <button key={cat.id} onClick={() => { haptic('light'); setSelCat(cat); setPage('pay-service'); }}
                      className="glass p-3 rounded-2xl min-w-[110px] shrink-0 flex flex-col gap-2 active:scale-95">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-xl">{cat.icon}</div>
                      <p className="text-xs font-medium">{cat.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 mt-5 mb-6">
              <div className="glass p-4 rounded-2xl">
                <h3 className="font-bold mb-3">Действия</h3>
                <div className="flex gap-2">
                  {ACTIONS.map((a) => (
                    <button key={a.id} onClick={() => { haptic('light'); if (a.id === 'qr') go('qr'); else go('receive'); }}
                      className="glass p-3 rounded-2xl flex-1 flex flex-col items-center gap-2 active:scale-95">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-xl">{a.icon}</div>
                      <p className="text-xs font-medium text-center">{a.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== BETWEEN ACCOUNTS ===== */}
        {page === 'between' && (
          <div className="px-5 mt-4 animate-fade-in space-y-4">
            <h3 className="font-bold">Между своими счетами</h3>
            <div>
              <p className="text-xs text-white/35 mb-1.5">Откуда</p>
              <div className="space-y-1.5">
                {accounts.map((a) => (
                  <button key={a.id} onClick={() => setFromAccId(a.id)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${fromAccId === a.id ? 'bg-white/[0.08] ring-1 ring-white/15' : 'glass'}`}>
                    <div className="flex-1 text-left"><p className="text-sm font-medium">{a.name}</p><p className="text-[10px] text-white/25">🌙{a.balance.toFixed(2)} {a.currency}</p></div>
                    {fromAccId === a.id && <span className="text-emerald-400 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-white/35 mb-1.5">Куда</p>
              <div className="space-y-1.5">
                {accounts.filter(a => a.id !== fromAccId).map((a) => (
                  <button key={a.id} onClick={() => setToAccId(a.id)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${toAccId === a.id ? 'bg-white/[0.08] ring-1 ring-white/15' : 'glass'}`}>
                    <div className="flex-1 text-left"><p className="text-sm font-medium">{a.name}</p><p className="text-[10px] text-white/25">🌙{a.balance.toFixed(2)} {a.currency}</p></div>
                    {toAccId === a.id && <span className="text-emerald-400 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <input type="number" value={betweenAmt} onChange={(e) => setBetweenAmt(e.target.value)} placeholder="Сумма"
              className="w-full glass px-4 py-4 bg-transparent text-white text-2xl font-bold mono outline-none text-center rounded-xl" />
            <button onClick={executeBetween} disabled={!fromAccId || !toAccId || !(parseFloat(betweenAmt) || 0)} className="btn-primary w-full">
              Перевести
            </button>
          </div>
        )}

        {/* ===== PAY SERVICE LIST ===== */}
        {page === 'pay-service' && (
          <div className="px-5 mt-4 animate-fade-in">
            <h3 className="font-bold mb-3">Категории</h3>
            <div className="space-y-2 mb-4">
              {PAYMENT_CATS.map((cat, i) => (
                <button key={cat.id} onClick={() => { haptic('light'); setSelCat(cat); }}
                  className={`w-full glass p-3.5 flex items-center gap-4 rounded-2xl active:scale-[0.98] transition-all ${selCat?.id === cat.id ? 'ring-1 ring-white/15' : ''}`}>
                  <div className="w-11 h-11 rounded-xl bg-white/[0.04] flex items-center justify-center text-xl">{cat.icon}</div>
                  <div className="flex-1 text-left"><p className="font-semibold text-sm">{cat.label}</p><p className="text-[10px] text-white/20">{cat.services.length} сервисов</p></div>
                  <span className="text-white/15">›</span>
                </button>
              ))}
            </div>
            {selCat && (
              <>
                <h3 className="font-bold mb-2">{selCat.label}</h3>
                <div className="space-y-1.5">
                  {selCat.services.map((svc) => (
                    <button key={svc.n} onClick={() => { haptic('light'); setSelSvc(svc); setPage('pay-form'); }}
                      className="w-full glass p-3 flex items-center gap-3 rounded-xl active:scale-[0.98]">
                      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-lg">{svc.i}</div>
                      <p className="text-sm font-medium">{svc.n}</p>
                      <span className="ml-auto text-white/15">›</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== PAY FORM ===== */}
        {page === 'pay-form' && selSvc && (
          <div className="px-5 mt-4 animate-fade-in space-y-4">
            <div className="glass-accent p-4 flex items-center gap-3 rounded-2xl">
              <div className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center text-xl">{selSvc.i}</div>
              <div><p className="font-bold">{selSvc.n}</p><p className="text-xs text-white/30">{selCat?.label}</p></div>
            </div>
            <div>
              <p className="text-xs text-white/35 mb-1.5">Номер / лицевой счёт</p>
              <input type="text" value={payAccount} onChange={(e) => setPayAccount(e.target.value)} placeholder="Введите номер"
                className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none rounded-xl" />
            </div>
            <div>
              <p className="text-xs text-white/35 mb-1.5">Сумма (LNC)</p>
              <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00"
                className="w-full glass px-4 py-4 bg-transparent text-white text-2xl font-extrabold mono outline-none text-center rounded-xl" />
              <div className="flex gap-2 mt-2">
                {[100, 200, 500, 1000].map(v => (
                  <button key={v} onClick={() => setPayAmount(String(v))}
                    className={`flex-1 glass rounded-lg py-1.5 text-xs mono active:scale-95 ${payAmount === String(v) ? 'ring-1 ring-white/20' : ''}`}>
                    🌙{v}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => { if (val > 0 && payAccount) { haptic('medium'); setPage('pay-confirm'); } else haptic('error'); }}
              disabled={val <= 0 || !payAccount} className="btn-primary w-full">
              Продолжить →
            </button>
          </div>
        )}

        {/* ===== PAY CONFIRM ===== */}
        {page === 'pay-confirm' && selSvc && (
          <div className="px-5 mt-4 animate-fade-in">
            <div className="glass p-5 space-y-3 rounded-2xl mb-6">
              <div className="text-center mb-3">
                <AnimatedEmoji type="coin" size={48} />
                <h3 className="font-bold text-lg mt-2">Подтверждение</h3>
              </div>
              {[
                [`${selSvc.i} Услуга`, selSvc.n],
                ['📁 Категория', selCat?.label || ''],
                ['📝 Счёт', payAccount],
                ['💰 Сумма', `🌙${val.toFixed(2)} LNC`],
                ['💳 Баланс', `🌙${lncAcc?.balance.toFixed(2) || 0}`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0 last:font-bold">
                  <span className="text-white/35 text-sm">{l}</span>
                  <span className="text-sm mono">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={executePayment} className="btn-primary w-full">✅ Оплатить 🌙{val.toFixed(2)}</button>
            <button onClick={() => setPage('pay-form')} className="btn-ghost w-full mt-2">← Изменить</button>
          </div>
        )}

        {/* ===== SUCCESS ===== */}
        {page === 'pay-success' && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in px-5">
            <AnimatedEmoji type="success" size={72} loop={false} />
            <h2 className="text-xl font-extrabold mt-4 mb-2">Выполнено!</h2>
            <p className="text-white/35 text-sm mb-6">{selSvc?.n || 'Перевод'} · 🌙{payAmount || betweenAmt}</p>
            <button onClick={() => { setPage('main'); setPayAmount(''); setPayAccount(''); setBetweenAmt(''); }} className="btn-primary w-full max-w-sm">Новый платёж</button>
            <button onClick={() => go('home')} className="btn-ghost w-full max-w-sm mt-2">На главную</button>
          </div>
        )}

        {/* ===== PHONE TRANSFER ===== */}
        {page === 'phone-transfer' && (
          <div className="px-5 mt-4 animate-fade-in">
            <div className="glass flex items-center px-4 gap-3 rounded-2xl">
              <PhoneIcon size={16} color="rgba(255,255,255,0.3)" />
              <input type="text" placeholder="Номер телефона или имя" autoFocus
                className="flex-1 bg-transparent py-3.5 text-white outline-none text-sm"
                onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={async () => {
              haptic('medium');
              const contact = await requestContact();
              if (contact) go('transfer');
            }} className="w-full mt-3 glass-accent flex items-center justify-center gap-2.5 py-3.5 rounded-2xl active:scale-[0.98]">
              <PhoneIcon size={16} color="#3b82f6" />
              <span className="text-sm font-semibold">Поделиться контактом</span>
            </button>
            <div className="mt-4 space-y-1.5">
              {recentContacts.map((c) => (
                <button key={c.telegram_id} onClick={() => { haptic('light'); go('transfer'); }}
                  className="w-full glass p-3 flex items-center gap-3 rounded-xl active:scale-[0.98]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center font-bold">
                    {c.first_name?.[0]}
                  </div>
                  <div className="text-left"><p className="font-bold text-sm">{c.first_name} {c.last_name}</p><p className="text-[10px] text-white/25">@{c.username}</p></div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
