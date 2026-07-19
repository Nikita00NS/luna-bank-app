import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction, dbSearchUsers, dbSearchByPhone } from '../lib/db';
import { supabase } from '../lib/supabase';
import {
  ArrowLeftIcon, SearchIcon, PhoneIcon, GlobeIcon, CreditCardIcon,
  FileTextIcon, BuildingIcon, GamepadIcon, ZapIcon, SparklesIcon,
  DownloadIcon, QrCodeIcon, CheckCircleIcon, CheckIcon, SwapIcon, PlusIcon,
} from '../components/Icons';
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
  { id: 'between', Icon: SwapIcon, label: 'Между счетами', desc: 'Свои счета' },
  { id: 'card', Icon: CreditCardIcon, label: 'По номеру карты', desc: 'Карта Luna' },
  { id: 'country', Icon: GlobeIcon, label: 'Международный', desc: 'Трансграничные' },
  { id: 'requisites', Icon: FileTextIcon, label: 'По реквизитам', desc: 'IBAN / SWIFT' },
];

const PAYMENT_CATS = [
  { id: 'mobile', Icon: PhoneIcon, label: 'Мобильная связь',
    services: [{ n: 'МТС', i: 'MTS' }, { n: 'Билайн', i: 'BEE' }, { n: 'МегаФон', i: 'MEGA' }, { n: 'Tele2', i: 'T2' }, { n: 'Yota', i: 'YOTA' }] },
  { id: 'housing', Icon: BuildingIcon, label: 'ЖКХ и сервис',
    services: [{ n: 'Электроэнергия', i: 'ELECT' }, { n: 'Газоснабжение', i: 'GAS' }, { n: 'Водоснабжение', i: 'WATER' }, { n: 'Отопление', i: 'HEAT' }] },
  { id: 'gaming', Icon: GamepadIcon, label: 'Игры & Подписки',
    services: [{ n: 'Steam (Пополнение)', i: 'STM' }, { n: 'PlayStation Network', i: 'PSN' }, { n: 'Xbox Live', i: 'XBOX' }, { n: 'Roblox', i: 'RBLX' }, { n: 'Fortnite V-Bucks', i: 'FNT' }] },
  { id: 'internet', Icon: GlobeIcon, label: 'Интернет и ТВ',
    services: [{ n: 'Ростелеком', i: 'RTC' }, { n: 'Дом.ру', i: 'DOM' }, { n: 'Билайн Интернет', i: 'BEE-I' }] },
  { id: 'transport', Icon: ZapIcon, label: 'Транспорт и Парковки',
    services: [{ n: 'Карта Тройка', i: 'TRK' }, { n: 'Карта Стрелка', i: 'STR' }] },
  { id: 'education', Icon: SparklesIcon, label: 'Образование и Курсы',
    services: [{ n: 'Университет / Обучение', i: 'UNIV' }, { n: 'Онлайн-академии', i: 'EDU' }] },
];

const ACTIONS = [
  { id: 'request', Icon: DownloadIcon, label: 'Запросить средства' },
  { id: 'qr', Icon: QrCodeIcon, label: 'QR-оплата' },
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
    addNotif({ id: uid(), title: 'Перевод между счетами выполнен', message: `${amt} ${fromAcc.currency} переведено: ${fromAcc.name} → ${toAcc.name}`, type: 'transfer', read: false, created_at: new Date().toISOString() });
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
    addNotif({ id: uid(), title: 'Оплата услуги выполнена', message: `${selSvc.n}: ${val} LNC`, type: 'system', read: false, created_at: new Date().toISOString() });
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
      <div className="px-5 pt-4 pb-2 flex items-center gap-4 border-b border-white/[0.04]">
        <button onClick={goBack} className="text-white/60 hover:text-white p-1 -ml-1 transition-colors"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-extrabold flex-1 text-[17px] text-white tracking-tight">Платежи и переводы</h1>
        <button onClick={() => go('qr')} className="glass rounded-2xl w-9 h-9 flex items-center justify-center text-amber-400 border border-white/10 hover:border-amber-500/30 active:scale-95 transition-all">
          <QrCodeIcon size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* ===== MAIN PAGE (like T-Bank) ===== */}
        {page === 'main' && (
          <div className="animate-fade-in">
            {/* Search */}
            <div className="px-5 mt-3">
              <div className="glass flex items-center px-4 gap-3 rounded-2xl border border-white/[0.08] focus-within:border-amber-500/50 transition-all">
                <SearchIcon size={16} color="rgba(255,255,255,0.4)" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по услугам, провайдерам или контактам" className="flex-1 bg-transparent py-3.5 text-white outline-none text-sm font-medium placeholder:text-white/25" />
              </div>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="px-5 mt-3 space-y-1.5">
                {searchResults.map((r: any) => (
                  <button key={r.telegram_id} onClick={() => { haptic('light'); useStore.getState().selTx(null); go('transfer'); }}
                    className="w-full glass p-3.5 flex items-center gap-3.5 rounded-2xl active:scale-[0.98] transition-all border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center font-extrabold text-white">{r.first_name?.[0]}</div>
                    <div className="text-left"><p className="font-extrabold text-sm text-white">{r.first_name} {r.last_name || ''}</p><p className="text-xs text-white/40 font-medium">@{r.username || 'Участник'}</p></div>
                  </button>
                ))}
              </div>
            )}

            {/* Favorites */}
            {favorites.length > 0 && (
              <div className="px-5 mt-5">
                <div className="flex justify-between mb-3"><h3 className="font-extrabold text-base text-white">Избранные шаблоны</h3><span className="text-xs text-white/40 font-semibold">Все ({favorites.length})</span></div>
                <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar">
                  {favorites.map((f) => (
                    <div key={f.id} className="glass p-3.5 rounded-2xl min-w-[130px] shrink-0 relative border border-white/10">
                      <button className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center text-white/40 hover:text-white text-[10px]">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center font-mono font-bold text-xs text-amber-400 mb-2.5">{f.icon.slice(0, 4)}</div>
                      <p className="text-xs font-bold truncate text-white">{f.name}</p>
                      <p className="text-[10px] text-white/40 truncate font-mono mt-0.5">{f.target}</p>
                    </div>
                  ))}
                  <button className="glass p-3.5 rounded-2xl min-w-[100px] shrink-0 flex flex-col items-center justify-center gap-2 active:scale-95 border border-white/[0.06] hover:border-white/15 transition-all text-white/50 hover:text-white"
                    onClick={() => haptic('light')}>
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center"><PlusIcon size={16} /></div>
                    <span className="text-[11px] font-bold">Шаблон</span>
                  </button>
                </div>
              </div>
            )}

            {/* On payment + Regular */}
            <div className="px-5 mt-5 flex gap-2.5">
              <button className="flex-1 glass p-4 rounded-2xl flex items-center gap-3 active:scale-[0.98] border border-white/10 hover:border-white/20 transition-all"
                onClick={() => { haptic('light'); setPage('pay-service'); setSelCat(PAYMENT_CATS[0]); }}>
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400"><FileTextIcon size={18} /></div>
                <div className="text-left"><p className="text-sm font-extrabold text-white">К оплате</p><p className="text-[10px] text-white/40 font-medium">Счета и квитанции</p></div>
              </button>
              <button className="flex-1 glass p-4 rounded-2xl flex items-center gap-3 active:scale-[0.98] border border-white/10 hover:border-white/20 transition-all"
                onClick={() => haptic('light')}>
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400"><SwapIcon size={18} /></div>
                <div className="text-left"><p className="text-sm font-extrabold text-white">Автоплатежи</p><p className="text-[10px] text-white/40 font-medium">По расписанию</p></div>
              </button>
            </div>

            {/* Transfer by phone */}
            <div className="px-5 mt-5">
              <div className="glass p-5 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-extrabold text-base text-white">Система быстрых переводов (СБП)</h3>
                  <span className="text-[10px] mono bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-bold px-2 py-0.5 rounded-lg">0% комиссия</span>
                </div>
                <div className="glass flex items-center px-4 gap-3 rounded-2xl mb-4 border border-white/[0.08] focus-within:border-amber-500/50 transition-all">
                  <PhoneIcon size={16} color="rgba(255,255,255,0.4)" />
                  <input type="text" placeholder="Введите телефон или Luna ID"
                    className="flex-1 bg-transparent py-3 text-white outline-none text-sm font-medium placeholder:text-white/25"
                    onFocus={() => { setPage('phone-transfer'); }} />
                </div>
                {/* Recent contacts */}
                <div className="flex gap-4 overflow-x-auto -mx-1 px-1 pb-1 no-scrollbar">
                  {recentContacts.slice(0, 6).map((c) => (
                    <button key={c.telegram_id} onClick={() => { haptic('light'); go('transfer'); }}
                      className="flex flex-col items-center gap-2 shrink-0 w-16 active:scale-95 transition-all group">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="" className="w-13 h-13 rounded-2xl ring-1 ring-white/15 group-hover:ring-amber-400/50 transition-all" />
                      ) : (
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 border border-white/10 flex items-center justify-center text-lg font-extrabold text-white shadow-md">
                          {c.first_name?.[0] || '?'}
                        </div>
                      )}
                      <p className="text-[11px] text-white/60 font-semibold text-center truncate w-full group-hover:text-white transition-all">{c.first_name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Transfers */}
            <div className="px-5 mt-5">
              <div className="glass p-5 rounded-3xl border border-white/10">
                <div className="flex justify-between mb-3.5"><h3 className="font-extrabold text-base text-white">Каналы переводов</h3><button onClick={() => go('transfer')} className="text-xs text-amber-400 font-bold hover:underline">Все способы →</button></div>
                <div className="flex gap-2.5 overflow-x-auto -mx-1 px-1 no-scrollbar">
                  {TRANSFER_METHODS.map((m) => (
                    <button key={m.id} onClick={() => {
                      haptic('light');
                      if (m.id === 'between') setPage('between');
                      else go('transfer');
                    }} className="glass p-3.5 rounded-2xl min-w-[125px] shrink-0 flex flex-col gap-2.5 active:scale-95 border border-white/[0.06] hover:border-white/15 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] group-hover:bg-amber-500/10 flex items-center justify-center text-white/60 group-hover:text-amber-400 transition-all"><m.Icon size={19} color="currentColor" /></div>
                      <div>
                        <p className="text-xs font-extrabold text-white truncate">{m.label}</p>
                        <p className="text-[10px] text-white/40 font-medium mt-0.5">{m.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Payments (services) */}
            <div className="px-5 mt-5">
              <div className="glass p-5 rounded-3xl border border-white/10">
                <div className="flex justify-between mb-3.5"><h3 className="font-extrabold text-base text-white">Услуги и сервисы</h3><button className="text-xs text-amber-400 font-bold hover:underline" onClick={() => setPage('pay-service')}>Весь каталог →</button></div>
                <div className="flex gap-2.5 overflow-x-auto -mx-1 px-1 no-scrollbar">
                  {PAYMENT_CATS.slice(0, 4).map((cat) => (
                    <button key={cat.id} onClick={() => { haptic('light'); setSelCat(cat); setPage('pay-service'); }}
                      className="glass p-3.5 rounded-2xl min-w-[125px] shrink-0 flex flex-col gap-2.5 active:scale-95 border border-white/[0.06] hover:border-white/15 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] group-hover:bg-amber-500/10 flex items-center justify-center text-white/60 group-hover:text-amber-400 transition-all"><cat.Icon size={19} color="currentColor" /></div>
                      <div>
                        <p className="text-xs font-extrabold text-white truncate">{cat.label}</p>
                        <p className="text-[10px] text-white/40 font-medium mt-0.5">{cat.services.length} провайдеров</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 mt-5 mb-6">
              <div className="glass p-5 rounded-3xl border border-white/10">
                <h3 className="font-extrabold text-base text-white mb-3.5">Быстрые действия</h3>
                <div className="flex gap-2.5">
                  {ACTIONS.map((a) => (
                    <button key={a.id} onClick={() => { haptic('light'); if (a.id === 'qr') go('qr'); else go('receive'); }}
                      className="glass p-4 rounded-2xl flex-1 flex flex-col items-center gap-2.5 active:scale-95 border border-white/[0.06] hover:border-white/15 transition-all group">
                      <div className="w-11 h-11 rounded-2xl bg-white/[0.04] group-hover:bg-amber-500/10 flex items-center justify-center text-white/60 group-hover:text-amber-400 transition-all"><a.Icon size={20} color="currentColor" /></div>
                      <p className="text-xs font-bold text-white text-center">{a.label}</p>
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
            <h3 className="font-extrabold text-base text-white">Конвертация и перевод между счетами</h3>
            <div>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Списать со счёта</p>
              <div className="space-y-2">
                {accounts.map((a) => (
                  <button key={a.id} onClick={() => setFromAccId(a.id)}
                    className={`w-full p-3.5 rounded-2xl flex items-center gap-3 transition-all border ${fromAccId === a.id ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5' : 'glass border-white/10 hover:border-white/20'}`}>
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400">
                      <CreditCardIcon size={16} />
                    </div>
                    <div className="flex-1 text-left"><p className="text-sm font-bold text-white">{a.name}</p><p className="text-[11px] text-white/40 mono mt-0.5">{a.balance.toFixed(2)} {a.currency}</p></div>
                    {fromAccId === a.id && <div className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center"><CheckIcon size={12} color="#000" /></div>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Зачислить на счёт</p>
              <div className="space-y-2">
                {accounts.filter(a => a.id !== fromAccId).map((a) => (
                  <button key={a.id} onClick={() => setToAccId(a.id)}
                    className={`w-full p-3.5 rounded-2xl flex items-center gap-3 transition-all border ${toAccId === a.id ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5' : 'glass border-white/10 hover:border-white/20'}`}>
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-emerald-400">
                      <CreditCardIcon size={16} />
                    </div>
                    <div className="flex-1 text-left"><p className="text-sm font-bold text-white">{a.name}</p><p className="text-[11px] text-white/40 mono mt-0.5">{a.balance.toFixed(2)} {a.currency}</p></div>
                    {toAccId === a.id && <div className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center"><CheckIcon size={12} color="#000" /></div>}
                  </button>
                ))}
              </div>
            </div>
            <div className="glass p-5 rounded-3xl border border-white/10 mt-2 bg-gradient-to-b from-white/[0.05] to-transparent">
              <input type="number" value={betweenAmt} onChange={(e) => setBetweenAmt(e.target.value)} placeholder="0.00"
                className="w-full bg-transparent text-white text-3xl font-extrabold mono outline-none text-center placeholder:text-white/15" />
              <p className="text-center text-xs text-amber-400/80 font-semibold mt-1">Сумма перевода (0% комиссия внутри ваших счетов)</p>
            </div>
            <button onClick={executeBetween} disabled={!fromAccId || !toAccId || !(parseFloat(betweenAmt) || 0)} className="btn-primary w-full py-4 rounded-2xl font-bold shadow-lg shadow-amber-500/20 disabled:opacity-30">
              Выполнить внутренний перевод →
            </button>
          </div>
        )}

        {/* ===== PAY SERVICE LIST ===== */}
        {page === 'pay-service' && (
          <div className="px-5 mt-4 animate-fade-in">
            <h3 className="font-extrabold text-base mb-3 text-white">Каталог категорий</h3>
            <div className="space-y-2.5 mb-6">
              {PAYMENT_CATS.map((cat, i) => (
                <button key={cat.id} onClick={() => { haptic('light'); setSelCat(cat); }}
                  className={`w-full glass p-4 flex items-center gap-4 rounded-2xl active:scale-[0.98] transition-all border ${selCat?.id === cat.id ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10 hover:border-white/20'}`}>
                  <div className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400"><cat.Icon size={20} color="currentColor" /></div>
                  <div className="flex-1 text-left"><p className="font-extrabold text-sm text-white">{cat.label}</p><p className="text-[11px] text-white/40 font-medium mt-0.5">{cat.services.length} доступных провайдеров</p></div>
                  <div className="w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-white/40 font-bold">›</div>
                </button>
              ))}
            </div>
            {selCat && (
              <>
                <h3 className="font-extrabold text-base mb-3 text-white">{selCat.label} — Выберите оператора</h3>
                <div className="space-y-2">
                  {selCat.services.map((svc) => (
                    <button key={svc.n} onClick={() => { haptic('light'); setSelSvc(svc); setPage('pay-form'); }}
                      className="w-full glass p-3.5 flex items-center gap-3.5 rounded-2xl active:scale-[0.98] transition-all border border-white/10 hover:border-white/20 bg-gradient-to-r from-white/[0.04] to-transparent">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center font-mono text-xs font-extrabold text-amber-400">{svc.i}</div>
                      <p className="text-sm font-bold text-white">{svc.n}</p>
                      <div className="ml-auto w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-white/40 font-bold">›</div>
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
            <div className="glass p-5 flex items-center gap-4 rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.07] to-transparent">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-mono text-sm font-extrabold text-amber-400">{selSvc.i}</div>
              <div><p className="font-extrabold text-base text-white">{selSvc.n}</p><p className="text-xs text-amber-400 font-semibold mt-0.5">{selCat?.label}</p></div>
            </div>
            <div>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Номер лицевого счёта / договор / телефон</p>
              <input type="text" value={payAccount} onChange={(e) => setPayAccount(e.target.value)} placeholder="Введите реквизиты платежа"
                className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none rounded-2xl border border-white/10 focus:border-amber-500/50 text-sm font-medium" />
            </div>
            <div>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Сумма пополнения (LNC)</p>
              <div className="glass p-5 rounded-3xl border border-white/10 bg-white/[0.02]">
                <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00"
                  className="w-full bg-transparent text-white text-4xl font-extrabold mono outline-none text-center placeholder:text-white/15" />
              </div>
              <div className="flex gap-2 mt-2.5">
                {[100, 200, 500, 1000].map(v => (
                  <button key={v} onClick={() => setPayAmount(String(v))}
                    className={`flex-1 glass rounded-xl py-2 text-xs mono font-bold active:scale-95 transition-all border ${payAmount === String(v) ? 'border-amber-500/50 bg-amber-500/20 text-amber-400' : 'border-white/10 text-white/70 hover:text-white'}`}>
                    {v} LNC
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => { if (val > 0 && payAccount) { haptic('medium'); setPage('pay-confirm'); } else haptic('error'); }}
              disabled={val <= 0 || !payAccount} className="btn-primary w-full py-4 rounded-2xl font-bold text-[15px] shadow-lg shadow-amber-500/20 disabled:opacity-30 mt-3">
              Перейти к подтверждению →
            </button>
          </div>
        )}

        {/* ===== PAY CONFIRM ===== */}
        {page === 'pay-confirm' && selSvc && (
          <div className="px-5 mt-4 animate-fade-in">
            <div className="glass p-6 space-y-3.5 rounded-3xl mb-6 border border-white/15 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-2xl">
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-mono text-lg font-extrabold text-amber-400 mx-auto mb-3 shadow-lg shadow-amber-500/20">
                  {selSvc.i}
                </div>
                <h3 className="font-extrabold text-lg text-white">Подтверждение оплаты услуги</h3>
                <p className="text-xs text-white/40 mt-0.5">Средства поступят на лицевой счёт моментально</p>
              </div>
              {[
                ['Оператор / Услуга', selSvc.n],
                ['Категория', selCat?.label || ''],
                ['Реквизиты платежа', payAccount],
                ['К списанию', `${val.toFixed(2)} LNC`],
                ['Доступный баланс', `${lncAcc?.balance.toFixed(2) || 0} LNC`],
              ].map(([l, v], idx) => (
                <div key={l} className={`flex justify-between py-2.5 border-b border-white/[0.06] last:border-0 ${idx === 3 ? 'font-extrabold text-amber-400 pt-3 text-base' : 'text-sm'}`}>
                  <span className="text-white/40 font-medium shrink-0">{l}</span>
                  <span className="mono text-right font-semibold text-white/90 truncate max-w-[55%]">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={executePayment} className="btn-primary w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25">
              <CheckCircleIcon size={18} /> Подтвердить и оплатить {val.toFixed(2)} LNC
            </button>
            <button onClick={() => setPage('pay-form')} className="btn-ghost w-full mt-3 py-3 rounded-2xl font-semibold text-white/60 hover:text-white">← Изменить данные счёта</button>
          </div>
        )}

        {/* ===== SUCCESS ===== */}
        {page === 'pay-success' && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in px-5 text-center">
            <div className="w-24 h-24 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/20 mb-6">
              <CheckCircleIcon size={56} />
            </div>
            <h2 className="text-2xl font-extrabold mt-2 mb-2 text-white">Платёж успешно выполнен!</h2>
            <p className="text-emerald-400 font-bold text-lg mono mb-1">{selSvc?.n || 'Перевод'} · {payAmount || betweenAmt} LNC</p>
            <p className="text-white/40 text-xs mb-8">Оплата зачислена получателю по указанным реквизитам</p>
            <button onClick={() => { setPage('main'); setPayAmount(''); setPayAccount(''); setBetweenAmt(''); }} className="btn-primary w-full max-w-sm py-4 rounded-2xl font-bold mb-3">Совершить ещё один платёж</button>
            <button onClick={() => go('home')} className="btn-ghost w-full max-w-sm py-3.5 rounded-2xl font-semibold border border-white/10 hover:border-white/20">На главную</button>
          </div>
        )}

        {/* ===== PHONE TRANSFER ===== */}
        {page === 'phone-transfer' && (
          <div className="px-5 mt-4 animate-fade-in space-y-4">
            <div className="glass flex items-center px-4 gap-3 rounded-2xl border border-white/10 focus-within:border-amber-500/50 transition-all">
              <PhoneIcon size={16} color="rgba(255,255,255,0.4)" />
              <input type="text" placeholder="Укажите номер телефона или имя пользователя" autoFocus
                className="flex-1 bg-transparent py-3.5 text-white outline-none text-sm font-medium placeholder:text-white/25"
                onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={async () => {
              haptic('medium');
              const contact = await requestContact();
              if (contact) go('transfer');
            }} className="w-full glass py-3.5 px-4 rounded-2xl active:scale-[0.98] transition-all border border-white/10 hover:border-white/20 flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400"><PhoneIcon size={16} color="currentColor" /></div>
              <span className="text-sm font-bold text-white/90">Выбрать из адресной книги устройства</span>
            </button>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider px-1">Недавние контакты</p>
              {recentContacts.map((c) => (
                <button key={c.telegram_id} onClick={() => { haptic('light'); go('transfer'); }}
                  className="w-full glass p-3.5 flex items-center gap-3.5 rounded-2xl active:scale-[0.98] transition-all border border-white/[0.08] hover:border-white/20">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 border border-white/10 flex items-center justify-center font-extrabold text-white">
                    {c.first_name?.[0]}
                  </div>
                  <div className="text-left"><p className="font-extrabold text-sm text-white">{c.first_name} {c.last_name || ''}</p><p className="text-xs text-white/40 font-medium">@{c.username || 'Участник'}</p></div>
                  <div className="ml-auto w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-white/40 font-bold">›</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
