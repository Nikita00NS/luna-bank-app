import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction, dbCreateEscrow, dbGetEscrowDeals, dbUpdateEscrow } from '../lib/db';
import {
  ArrowLeftIcon, ShieldIcon, CheckCircleIcon, AlertCircleIcon, LockIcon,
  CoinsIcon, BriefcaseIcon, FileTextIcon, SendIcon, ShieldCheckIcon,
  MessageIcon, DiamondIcon, PlusIcon, SparklesIcon, CheckIcon,
} from '../components/Icons';
import { notifyCustom } from '../lib/bot';

interface Deal {
  id: string; buyer_id: number; seller_username: string;
  title: string; description: string; amount: number; fee: number;
  status: string; created_at: string;
}

interface ChatMsg { id: string; sender: 'buyer' | 'seller' | 'system'; text: string; time: string; }

const ST: Record<string, { label: string; color: string; Icon: React.ComponentType<any> }> = {
  funded: { label: 'Резерв на гаранте', color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20', Icon: LockIcon },
  shipped: { label: 'Товар / Услуга переданы', color: 'text-blue-400 bg-blue-500/10 border border-blue-500/20', Icon: BriefcaseIcon },
  delivered: { label: 'На проверке у покупателя', color: 'text-purple-400 bg-purple-500/10 border border-purple-500/20', Icon: FileTextIcon },
  completed: { label: 'Сделка завершена', color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20', Icon: CheckCircleIcon },
  disputed: { label: 'Арбитраж / Спор', color: 'text-red-400 bg-red-500/10 border border-red-500/20', Icon: AlertCircleIcon },
  appeal: { label: 'Рассмотрение апелляции', color: 'text-pink-400 bg-pink-500/10 border border-pink-500/20', Icon: ShieldCheckIcon },
  refunded: { label: 'Возврат средств выполнен', color: 'text-white/70 bg-white/[0.06] border border-white/10', Icon: CoinsIcon },
  cancelled: { label: 'Отменена', color: 'text-white/40 bg-white/[0.03] border border-white/10', Icon: AlertCircleIcon },
};

type Page = 'list' | 'create' | 'create-confirm' | 'detail' | 'chat' | 'success';

export default function EscrowScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [page, setPage] = useState<Page>('list');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Create form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [seller, setSeller] = useState('');
  const [category, setCategory] = useState('digital');

  // Chat
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Appeal
  const [appealReason, setAppealReason] = useState('');
  const [showAppeal, setShowAppeal] = useState(false);

  if (!user) return null;
  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const val = parseFloat(amount) || 0;
  const fee = Math.round(val * 0.02 * 100) / 100;
  const total = val + fee;

  useEffect(() => { loadDeals(); }, []);

  const loadDeals = async () => {
    setLoading(true);
    const data = await dbGetEscrowDeals(user.telegram_id);
    setDeals(data as Deal[]);
    setLoading(false);
  };

  const CATEGORIES = [
    { id: 'digital', Icon: FileTextIcon, label: 'Цифровой товар / Аккаунт' },
    { id: 'physical', Icon: BriefcaseIcon, label: 'Физический товар / Доставка' },
    { id: 'service', Icon: SparklesIcon, label: 'Услуга / Фриланс' },
    { id: 'crypto', Icon: DiamondIcon, label: 'Крипто-актив / NFT' },
    { id: 'other', Icon: ShieldCheckIcon, label: 'Договор / Другое' },
  ];

  const goConfirm = () => {
    if (!title || !seller || val <= 0 || !lncAcc || lncAcc.balance < total) { haptic('error'); return; }
    haptic('medium');
    setPage('create-confirm');
  };

  const createDeal = async () => {
    if (!lncAcc) return;
    haptic('success');
    updateBalance(lncAcc.id, -total);
    dbUpdateBalance(lncAcc.id, -total).catch(() => {});

    const deal = { buyer_id: user.telegram_id, seller_username: seller, title, description: `[${category}] ${desc}`, amount: val, fee, status: 'funded' };
    await dbCreateEscrow(deal);

    addTx({ id: uid(), from_user_id: user.telegram_id, to_user_id: 0, from_account_id: lncAcc.id, to_account_id: 'escrow', amount: total, fee, currency: 'LNC', type: 'withdrawal', status: 'completed', note: `Защищённая сделка: ${title}`, created_at: new Date().toISOString() });
    addNotif({ id: uid(), title: 'Защищённая сделка создана', message: `Резерв ${val} LNC для продавца @${seller}`, type: 'system', read: false, created_at: new Date().toISOString() });
    notifyCustom(user.telegram_id, `*Защищённая сделка открыта*\nПредмет: ${title}\nСумма: ${val} LNC\nПродавец: @${seller}`).catch(() => {});

    setPage('success');
    loadDeals();
  };

  const updateStatus = async (dealId: string, newStatus: string) => {
    haptic('medium');
    await dbUpdateEscrow(dealId, { status: newStatus });

    if (newStatus === 'completed' && selectedDeal && lncAcc) {
      notifyCustom(user.telegram_id, `*Сделка завершена*\n${selectedDeal.title}\n${selectedDeal.amount} LNC переведено продавцу`).catch(() => {});
    }
    if (newStatus === 'refunded' && selectedDeal && lncAcc) {
      updateBalance(lncAcc.id, selectedDeal.amount);
      dbUpdateBalance(lncAcc.id, selectedDeal.amount).catch(() => {});
      notifyCustom(user.telegram_id, `*Возврат средств*\n${selectedDeal.title}\n${selectedDeal.amount} LNC возвращено на баланс`).catch(() => {});
    }

    loadDeals();
    if (selectedDeal) setSelectedDeal({ ...selectedDeal, status: newStatus });
  };

  const sendChatMsg = () => {
    if (!chatInput.trim()) return;
    haptic('light');
    setChatMsgs(prev => [...prev, { id: uid(), sender: 'buyer', text: chatInput, time: new Date().toISOString() }]);
    setChatInput('');
  };

  const submitAppeal = () => {
    if (!appealReason.trim() || !selectedDeal) return;
    haptic('medium');
    updateStatus(selectedDeal.id, 'appeal');
    setChatMsgs(prev => [
      ...prev,
      { id: uid(), sender: 'system', text: `Апелляция подана арбитражному гаранту: ${appealReason}`, time: new Date().toISOString() },
    ]);
    setShowAppeal(false);
    setAppealReason('');
  };

  const openDeal = (deal: Deal) => {
    haptic('light');
    setSelectedDeal(deal);
    setChatMsgs([
      { id: '1', sender: 'system', text: `Сделка создана и защищена смарт-гарантом. ${deal.amount} LNC зарезервировано.`, time: deal.created_at },
    ]);
    setPage('detail');
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => {
          if (page === 'list') go('home');
          else if (page === 'detail' || page === 'success') { setPage('list'); setSelectedDeal(null); }
          else if (page === 'chat') setPage('detail');
          else if (page === 'create-confirm') setPage('create');
          else setPage('list');
        }} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">
          {page === 'chat' ? 'Чат сделки' : page === 'detail' ? 'Детали' : 'Гарант-сервис'}
        </h1>
        {page === 'list' && (
          <button onClick={() => { setPage('create'); haptic('light'); }} className="glass rounded-full px-4 py-1.5 text-xs font-semibold active:scale-95">+ Создать</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* ===== DEAL LIST ===== */}
        {page === 'list' && (
          <div className="px-5 animate-fade-in">
            {/* Info banner */}
            <div className="glass p-5 rounded-3xl mt-3 mb-5 flex items-center gap-4 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <LockIcon size={24} />
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-sm text-white">Смарт-гарант (Escrow 2.0)</p>
                <p className="text-xs text-white/60 leading-relaxed mt-0.5">Активы замораживаются до полного подтверждения сторон. Безопасность 100%.</p>
              </div>
            </div>

            {/* How it works */}
            <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-2 no-scrollbar mb-5">
              {[
                { label: '1. Резерв активов', Icon: LockIcon },
                { label: '2. Передача товара', Icon: BriefcaseIcon },
                { label: '3. Проверка', Icon: FileTextIcon },
                { label: '4. Выплата продавцу', Icon: CheckCircleIcon },
              ].map((step, i) => (
                <div key={i} className="glass px-3.5 py-2.5 rounded-2xl shrink-0 flex items-center gap-2 border border-white/10 bg-white/[0.03]">
                  <div className="text-amber-400"><step.Icon size={14} /></div>
                  <span className="text-xs font-semibold text-white/90">{step.label}</span>
                  {i < 3 && <span className="text-white/20 text-xs ml-1 font-bold">→</span>}
                </div>
              ))}
            </div>

            {/* Deals */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-14">
                <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
              </div>
            ) : deals.length === 0 ? (
              <div className="text-center py-14 glass rounded-3xl border border-white/10 bg-white/[0.02]">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-white/20">
                  <ShieldCheckIcon size={32} />
                </div>
                <p className="text-white font-extrabold text-base">Активных сделок нет</p>
                <p className="text-white/40 text-xs mt-1 max-w-[250px] mx-auto">Создайте безопасную сделку при покупке или продаже любых товаров и услуг</p>
                <button onClick={() => setPage('create')} className="btn-primary mt-6 px-8 py-3.5 rounded-2xl font-bold">Создать безопасную сделку</button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {deals.map((d, i) => {
                  const st = ST[d.status] || ST.funded;
                  return (
                    <button key={d.id} onClick={() => openDeal(d)}
                      className="w-full glass p-4 rounded-2xl text-left active:scale-[0.98] transition-all animate-slide-up border border-white/10 hover:border-white/20 bg-gradient-to-r from-white/[0.04] to-transparent"
                      style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="flex items-center gap-3.5 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400 shrink-0">
                          <st.Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-sm text-white truncate">{d.title}</p>
                          <p className="text-[11px] text-white/40 font-medium mt-0.5">@{d.seller_username} · {timeAgo(d.created_at)}</p>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-xl font-bold ${st.color}`}>{st.label}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-2 border-t border-white/[0.06]">
                        <span className="mono font-bold text-amber-400">{d.amount} LNC</span>
                        <span className="text-white/40">Комиссия сервиса: {d.fee} LNC</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== CREATE ===== */}
        {page === 'create' && (
          <div className="px-5 mt-4 animate-fade-in space-y-4">
            {/* Category */}
            <div>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2.5">Категория сделки</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.id} onClick={() => { setCategory(c.id); haptic('light'); }}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 border ${category === c.id ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-md shadow-amber-500/10' : 'glass border-white/10 text-white/70 hover:text-white'}`}>
                    <c.Icon size={14} color="currentColor" /> {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1.5">Предмет сделки</p>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название товара, услуги или аккаунта"
                className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none rounded-2xl border border-white/10 focus:border-amber-500/50 text-sm font-medium placeholder:text-white/25" />
            </div>

            <div>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1.5">Вторая сторона (Продавец)</p>
              <input type="text" value={seller} onChange={(e) => setSeller(e.target.value)} placeholder="Luna ID или @username продавца"
                className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none rounded-2xl border border-white/10 focus:border-amber-500/50 text-sm font-medium placeholder:text-white/25" />
            </div>

            <div>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1.5">Условия сделки</p>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Подробное описание условий, сроки передачи, гарантии..."
                className="w-full glass px-4 py-3 bg-transparent text-white outline-none rounded-2xl border border-white/10 focus:border-amber-500/50 resize-none h-24 text-sm font-medium placeholder:text-white/25" />
            </div>

            <div>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1.5">Сумма к заморозке</p>
              <div className="glass p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                  className="w-full bg-transparent text-white mono outline-none text-center text-3xl font-extrabold placeholder:text-white/15" />
                <p className="text-center text-xs text-amber-400 font-semibold mt-1">LNC (Luna Coin)</p>
              </div>
            </div>

            {val > 0 && (
              <div className="glass p-4 rounded-2xl space-y-2 text-sm border border-white/10 bg-white/[0.02]">
                <div className="flex justify-between"><span className="text-white/40 font-medium">Сумма сделки</span><span className="mono font-semibold text-white">{val.toFixed(2)} LNC</span></div>
                <div className="flex justify-between"><span className="text-white/40 font-medium">Комиссия Гарант-сервиса (2%)</span><span className="mono text-emerald-400 font-semibold">{fee.toFixed(2)} LNC</span></div>
                <div className="flex justify-between font-extrabold border-t border-white/[0.08] pt-2 text-base text-white"><span>Итого к резервированию</span><span className="mono text-amber-400">{total.toFixed(2)} LNC</span></div>
              </div>
            )}
            <button onClick={goConfirm} disabled={!title || !seller || val <= 0 || !lncAcc || lncAcc.balance < total} className="btn-primary w-full py-4 rounded-2xl font-bold text-[15px] shadow-lg shadow-amber-500/20 disabled:opacity-30">
              Перейти к подтверждению →
            </button>
          </div>
        )}

        {/* ===== CREATE CONFIRM ===== */}
        {page === 'create-confirm' && (
          <div className="px-5 mt-4 animate-fade-in">
            <div className="glass p-6 space-y-3.5 rounded-3xl mb-6 border border-white/15 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-2xl">
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
                  <LockIcon size={32} />
                </div>
                <h3 className="font-extrabold text-lg text-white">Подтверждение Гарант-сделки</h3>
                <p className="text-xs text-white/40 mt-0.5">Средства будут зарезервированы до получения подтверждения</p>
              </div>
              {[
                ['Предмет сделки', title],
                ['Категория', CATEGORIES.find(c => c.id === category)?.label || category],
                ['Продавец', seller.startsWith('@') || seller.startsWith('LUN-') ? seller : `@${seller}`],
                ['Описание условий', desc || 'Стандартные условия'],
                ['Заморозка', `${val.toFixed(2)} LNC`],
                ['Сбор гаранта (2%)', `${fee.toFixed(2)} LNC`],
                ['Итого списано', `${total.toFixed(2)} LNC`],
              ].map(([l, v], idx) => (
                <div key={l} className={`flex justify-between py-2 border-b border-white/[0.06] last:border-0 ${idx === 6 ? 'font-extrabold text-white pt-3 text-base' : 'text-sm'}`}>
                  <span className="text-white/40 font-medium shrink-0">{l}</span>
                  <span className="mono text-right truncate max-w-[55%] font-semibold text-white/90">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={createDeal} className="btn-primary w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25">
              <LockIcon size={18} /> Создать и зарезервировать активы
            </button>
            <button onClick={() => setPage('create')} className="btn-ghost w-full mt-3 py-3 rounded-2xl font-semibold text-white/60 hover:text-white">← Вернуться и изменить</button>
          </div>
        )}

        {/* ===== DEAL DETAIL ===== */}
        {page === 'detail' && selectedDeal && (() => {
          const st = ST[selectedDeal.status] || ST.funded;
          const canShip = selectedDeal.status === 'funded';
          const canDeliver = selectedDeal.status === 'shipped';
          const canComplete = selectedDeal.status === 'delivered';
          const canDispute = ['funded', 'shipped', 'delivered'].includes(selectedDeal.status);
          const canCancel = selectedDeal.status === 'funded';
          const isActive = !['completed', 'refunded', 'cancelled'].includes(selectedDeal.status);
          return (
            <div className="px-5 mt-3 animate-fade-in">
              {/* Status card */}
              <div className="glass p-6 rounded-3xl text-center mb-5 border border-white/15 bg-gradient-to-b from-white/[0.07] to-transparent shadow-2xl relative overflow-hidden">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400 mx-auto mb-3">
                  <st.Icon size={28} />
                </div>
                <h3 className="font-extrabold text-lg text-white">{selectedDeal.title}</h3>
                <span className={`inline-block mt-2.5 text-xs px-3.5 py-1 rounded-xl font-bold ${st.color}`}>{st.label}</span>
                <p className="text-3xl font-extrabold mono mt-4 text-white">{selectedDeal.amount.toFixed(2)} LNC</p>
                <p className="text-xs text-white/40 font-medium mt-1">Сбор гаранта: {selectedDeal.fee.toFixed(2)} LNC · Продавец: @{selectedDeal.seller_username}</p>
              </div>

              {/* Progress tracker */}
              <div className="glass p-5 rounded-3xl mb-5 border border-white/10 bg-white/[0.02]">
                <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Этапы исполнения сделки</p>
                <div className="flex items-center gap-1.5">
                  {['funded', 'shipped', 'delivered', 'completed'].map((s, i) => {
                    const done = ['funded', 'shipped', 'delivered', 'completed'].indexOf(selectedDeal.status) >= i;
                    const current = selectedDeal.status === s;
                    return (
                      <React.Fragment key={s}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${done ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'bg-white/[0.06] border border-white/10 text-white/30'} ${current ? 'ring-2 ring-amber-400/50' : ''}`}>
                          {done ? <CheckIcon size={14} color="#000" /> : i + 1}
                        </div>
                        {i < 3 && <div className={`flex-1 h-0.5 rounded-full transition-all ${done ? 'bg-amber-500' : 'bg-white/10'}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2.5 text-[10px] font-semibold text-white/40">
                  <span>Резерв</span><span>Передача</span><span>Проверка</span><span>Выплата</span>
                </div>
              </div>

              {/* Description */}
              {selectedDeal.description && (
                <div className="glass p-4 rounded-2xl mb-4 border border-white/10">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Условия договора</p>
                  <p className="text-sm text-white/80 leading-relaxed font-medium">{selectedDeal.description}</p>
                </div>
              )}

              {/* Info */}
              <div className="glass p-4 rounded-2xl mb-5 space-y-2 text-sm border border-white/10">
                <div className="flex justify-between"><span className="text-white/40 font-medium">Дата создания</span><span className="text-white/80 font-medium">{new Date(selectedDeal.created_at).toLocaleString('ru-RU')}</span></div>
                <div className="flex justify-between"><span className="text-white/40 font-medium">Контракт ID</span><span className="mono text-xs text-white/50">{selectedDeal.id}</span></div>
              </div>

              {/* Actions */}
              {isActive && (
                <div className="space-y-3 mb-6">
                  {/* Chat */}
                  <button onClick={() => { setPage('chat'); haptic('light'); }}
                    className="w-full glass py-3.5 px-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 active:scale-[0.98] border border-white/15 hover:border-white/30 text-white transition-all shadow-md">
                    <MessageIcon size={18} /> Открытый зашифрованный чат сторон
                  </button>

                  {/* Status buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {canShip && (
                      <button onClick={() => updateStatus(selectedDeal.id, 'shipped')}
                        className="w-full glass py-3.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-all active:scale-95">
                        <SendIcon size={15} /> Отметить товар как отправленный
                      </button>
                    )}
                    {canDeliver && (
                      <button onClick={() => updateStatus(selectedDeal.id, 'delivered')}
                        className="w-full glass py-3.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-all active:scale-95">
                        <FileTextIcon size={15} /> Передано на финальную проверку
                      </button>
                    )}
                    {canComplete && (
                      <button onClick={() => updateStatus(selectedDeal.id, 'completed')}
                        className="w-full bg-emerald-500 py-3.5 px-4 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 text-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                        <CheckCircleIcon size={16} /> Подтвердить получение (Выплата)
                      </button>
                    )}
                  </div>

                  {/* Dispute / Cancel */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {canDispute && (
                      <button onClick={() => { setShowAppeal(true); haptic('medium'); }}
                        className="glass py-3 px-3 rounded-xl text-xs text-red-400 font-semibold flex items-center justify-center gap-1.5 border border-red-500/20 hover:bg-red-500/10 transition-all active:scale-95">
                        <AlertCircleIcon size={15} /> Вызвать арбитраж
                      </button>
                    )}
                    {canCancel && (
                      <button onClick={() => updateStatus(selectedDeal.id, 'refunded')}
                        className="glass py-3 px-3 rounded-xl text-xs text-white/50 font-semibold flex items-center justify-center gap-1.5 border border-white/10 hover:text-white transition-all active:scale-95">
                        <CoinsIcon size={15} /> Отменить с возвратом
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Appeal form */}
              {showAppeal && (
                <div className="glass p-5 rounded-3xl mb-6 border border-red-500/30 bg-red-500/[0.04] animate-fade-in">
                  <div className="flex items-center gap-2 mb-3 text-red-400 font-extrabold text-sm">
                    <AlertCircleIcon size={18} /> Вызов арбитража (Оспаривание сделки)
                  </div>
                  <textarea value={appealReason} onChange={(e) => setAppealReason(e.target.value)}
                    placeholder="Опишите причину спора: приложите детали доказательства или нарушения условий второй стороной..."
                    className="w-full glass px-4 py-3 bg-transparent text-white text-sm outline-none rounded-2xl resize-none h-24 mb-3 border border-white/10 focus:border-red-500/50" />
                  <div className="flex gap-2.5">
                    <button onClick={submitAppeal} disabled={!appealReason.trim()} className="flex-1 bg-red-500 py-3.5 rounded-2xl text-xs text-black font-extrabold active:scale-95 shadow-lg shadow-red-500/20 disabled:opacity-30">Передать в арбитраж</button>
                    <button onClick={() => setShowAppeal(false)} className="flex-1 glass py-3.5 rounded-2xl text-xs font-semibold active:scale-95 text-white/70 hover:text-white">Отмена</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ===== CHAT ===== */}
        {page === 'chat' && selectedDeal && (
          <div className="flex flex-col h-[calc(100%-60px)]">
            {/* Deal header */}
            <div className="px-5 py-3 glass mx-5 mt-2 rounded-2xl flex items-center gap-3 border border-white/10 bg-white/[0.03]">
              <div className="text-amber-400 shrink-0">
                <ShieldIcon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{selectedDeal.title}</p>
                <p className="text-[10px] text-amber-400 mono font-semibold">Резерв: {selectedDeal.amount.toFixed(2)} LNC</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {chatMsgs.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'buyer' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
                  {msg.sender === 'system' ? (
                    <div className="glass px-4 py-2 rounded-2xl max-w-[88%] border border-amber-500/20 bg-amber-500/[0.05]">
                      <p className="text-[11px] text-amber-400/90 text-center font-medium leading-relaxed">{msg.text}</p>
                    </div>
                  ) : (
                    <div className={`max-w-[78%] px-4 py-3 rounded-2xl border ${
                      msg.sender === 'buyer'
                        ? 'bg-amber-500/15 border-amber-500/30 text-white rounded-tr-sm'
                        : 'glass border-white/10 text-white/90 rounded-tl-sm'
                    }`}>
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                      <p className="text-[9px] text-white/30 mt-1.5 text-right font-mono">{new Date(msg.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-5 pb-5 flex gap-2.5">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMsg()}
                placeholder="Сообщение или доказательство..."
                className="flex-1 glass px-4.5 py-3.5 bg-transparent text-white text-sm outline-none rounded-2xl border border-white/10 focus:border-amber-500/50" />
              <button onClick={sendChatMsg} disabled={!chatInput.trim()}
                className="bg-amber-500 w-12 h-12 rounded-2xl flex items-center justify-center active:scale-95 text-black font-extrabold shadow-lg shadow-amber-500/20 disabled:opacity-30">
                <SendIcon size={18} color="#000" />
              </button>
            </div>
          </div>
        )}

        {/* ===== SUCCESS ===== */}
        {page === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 px-5 animate-fade-in text-center">
            <div className="w-24 h-24 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/20 mb-6">
              <LockIcon size={56} />
            </div>
            <h2 className="text-2xl font-extrabold mt-2 mb-2 text-white">Активы зарезервированы!</h2>
            <p className="text-amber-400 font-bold text-base mono mb-1">{val.toFixed(2)} LNC под защитой смарт-гаранта</p>
            <p className="text-white/40 text-xs mb-8 max-w-[280px] leading-relaxed">Сделка открыта. Продавец @{seller} получит уведомление для начала исполнения условий.</p>
            <button onClick={() => { setPage('list'); setTitle(''); setDesc(''); setAmount(''); setSeller(''); }} className="btn-primary w-full max-w-sm py-4 rounded-2xl font-bold">К списку безопасных сделок</button>
          </div>
        )}
      </div>
    </div>
  );
}
