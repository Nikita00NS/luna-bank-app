import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction, dbCreateEscrow, dbGetEscrowDeals, dbUpdateEscrow } from '../lib/db';
import { ArrowLeftIcon, ShieldIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import { notifyCustom } from '../lib/bot';

interface Deal {
  id: string; buyer_id: number; seller_username: string;
  title: string; description: string; amount: number; fee: number;
  status: string; created_at: string;
}

interface ChatMsg { id: string; sender: 'buyer' | 'seller' | 'system'; text: string; time: string; }

const ST: Record<string, { label: string; color: string; icon: string }> = {
  funded: { label: 'Оплачено', color: 'text-blue-400 bg-blue-400/10', icon: '💰' },
  shipped: { label: 'Отправлено', color: 'text-amber-400 bg-amber-400/10', icon: '📦' },
  delivered: { label: 'Доставлено', color: 'text-orange-400 bg-orange-400/10', icon: '🚚' },
  completed: { label: 'Завершено', color: 'text-emerald-400 bg-emerald-400/10', icon: '✅' },
  disputed: { label: 'Спор', color: 'text-red-400 bg-red-400/10', icon: '⚠️' },
  appeal: { label: 'Апелляция', color: 'text-purple-400 bg-purple-400/10', icon: '⚖️' },
  refunded: { label: 'Возврат', color: 'text-gray-400 bg-gray-400/10', icon: '↩️' },
  cancelled: { label: 'Отменено', color: 'text-gray-400 bg-gray-400/10', icon: '✕' },
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
    { id: 'digital', icon: '💻', label: 'Цифровой товар' },
    { id: 'physical', icon: '📦', label: 'Физический товар' },
    { id: 'service', icon: '🛠', label: 'Услуга' },
    { id: 'crypto', icon: '💎', label: 'Крипто-сделка' },
    { id: 'other', icon: '📋', label: 'Другое' },
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

    addTx({ id: uid(), from_user_id: user.telegram_id, to_user_id: 0, from_account_id: lncAcc.id, to_account_id: 'escrow', amount: total, fee, currency: 'LNC', type: 'withdrawal', status: 'completed', note: `Гарант: ${title}`, created_at: new Date().toISOString() });
    addNotif({ id: uid(), title: '🛡️ Гарант-сделка', message: `🌙${val} → @${seller}`, type: 'system', read: false, created_at: new Date().toISOString() });
    notifyCustom(user.telegram_id, `🛡️ *Гарант-сделка*\n${title}: 🌙${val}\nПродавец: @${seller}`).catch(() => {});

    setPage('success');
    loadDeals();
  };

  const updateStatus = async (dealId: string, newStatus: string) => {
    haptic('medium');
    await dbUpdateEscrow(dealId, { status: newStatus });

    if (newStatus === 'completed' && selectedDeal && lncAcc) {
      // Сделка завершена — уведомляем
      notifyCustom(user.telegram_id, `✅ *Сделка завершена*\n${selectedDeal.title}\n🌙${selectedDeal.amount} переведено продавцу`).catch(() => {});
    }
    if (newStatus === 'refunded' && selectedDeal && lncAcc) {
      // Возврат средств
      updateBalance(lncAcc.id, selectedDeal.amount);
      dbUpdateBalance(lncAcc.id, selectedDeal.amount).catch(() => {});
      notifyCustom(user.telegram_id, `↩️ *Возврат средств*\n${selectedDeal.title}\n🌙${selectedDeal.amount} возвращено`).catch(() => {});
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
      { id: uid(), sender: 'system', text: `⚖️ Апелляция подана: ${appealReason}`, time: new Date().toISOString() },
    ]);
    setShowAppeal(false);
    setAppealReason('');
  };

  const openDeal = (deal: Deal) => {
    haptic('light');
    setSelectedDeal(deal);
    setChatMsgs([
      { id: '1', sender: 'system', text: `Сделка создана. 🌙${deal.amount} заморожено.`, time: deal.created_at },
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
            <div className="glass-accent p-4 rounded-2xl mt-2 mb-4 flex items-center gap-3">
              <AnimatedEmoji type="lock" size={36} />
              <div className="flex-1">
                <p className="font-bold text-sm">Безопасные сделки</p>
                <p className="text-[10px] text-white/30">Деньги замораживаются до подтверждения. Комиссия 2%.</p>
              </div>
            </div>

            {/* How it works */}
            <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 pb-2 no-scrollbar mb-4">
              {['💰 Оплата', '📦 Отправка', '🚚 Доставка', '✅ Подтверждение'].map((step, i) => (
                <div key={i} className="glass px-3 py-2 rounded-xl shrink-0 flex items-center gap-1.5">
                  <span className="text-xs">{step}</span>
                  {i < 3 && <span className="text-white/15 text-xs">→</span>}
                </div>
              ))}
            </div>

            {/* Deals */}
            {loading ? (
              <div className="text-center py-10"><AnimatedEmoji type="loading" size={32} /></div>
            ) : deals.length === 0 ? (
              <div className="text-center py-12">
                <AnimatedEmoji type="lock" size={56} />
                <p className="text-white/30 text-sm mt-3">Нет сделок</p>
                <button onClick={() => setPage('create')} className="btn-primary mt-4 px-8">Создать сделку</button>
              </div>
            ) : (
              <div className="space-y-2">
                {deals.map((d, i) => {
                  const st = ST[d.status] || ST.funded;
                  return (
                    <button key={d.id} onClick={() => openDeal(d)}
                      className="w-full glass p-4 rounded-2xl text-left active:scale-[0.98] transition-all animate-slide-up"
                      style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{st.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{d.title}</p>
                          <p className="text-[10px] text-white/25">@{d.seller_username} · {timeAgo(d.created_at)}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg ${st.color}`}>{st.label}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/30">
                        <span>🌙{d.amount} LNC</span>
                        <span>Комиссия: 🌙{d.fee}</span>
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
              <p className="text-xs text-white/35 mb-2">Тип сделки</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button key={c.id} onClick={() => { setCategory(c.id); haptic('light'); }}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 ${category === c.id ? 'bg-white/10 ring-1 ring-white/20' : 'glass'}`}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название товара / услуги"
              className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none rounded-xl" />
            <input type="text" value={seller} onChange={(e) => setSeller(e.target.value)} placeholder="@username продавца"
              className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none rounded-xl" />
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Подробное описание (что покупаете, условия)"
              className="w-full glass px-4 py-3 bg-transparent text-white outline-none rounded-xl resize-none h-24 text-sm" />
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Сумма (LNC)"
              className="w-full glass px-4 py-4 bg-transparent text-white mono outline-none rounded-xl text-center text-xl font-bold" />

            {val > 0 && (
              <div className="glass p-3 rounded-xl space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/35">Сумма</span><span className="mono">🌙{val}</span></div>
                <div className="flex justify-between"><span className="text-white/35">Комиссия 2%</span><span className="mono">🌙{fee}</span></div>
                <div className="flex justify-between font-bold border-t border-white/[0.04] pt-1.5"><span>Итого</span><span className="mono">🌙{total}</span></div>
              </div>
            )}
            <button onClick={goConfirm} disabled={!title || !seller || val <= 0 || !lncAcc || lncAcc.balance < total} className="btn-primary w-full">
              Продолжить →
            </button>
          </div>
        )}

        {/* ===== CREATE CONFIRM ===== */}
        {page === 'create-confirm' && (
          <div className="px-5 mt-4 animate-fade-in">
            <div className="glass p-5 space-y-3 rounded-2xl mb-6">
              <div className="text-center mb-3"><AnimatedEmoji type="lock" size={48} /><h3 className="font-bold text-lg mt-2">Подтверждение</h3></div>
              {[
                ['🏷 Товар/Услуга', title],
                ['📁 Категория', CATEGORIES.find(c => c.id === category)?.label || category],
                ['👤 Продавец', `@${seller}`],
                ['📝 Описание', desc || '—'],
                ['💰 Сумма', `🌙${val}`],
                ['📊 Комиссия 2%', `🌙${fee}`],
                ['📋 Итого', `🌙${total}`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0 last:font-bold">
                  <span className="text-white/35 text-sm shrink-0">{l}</span>
                  <span className="text-sm mono text-right truncate max-w-[55%]">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={createDeal} className="btn-primary w-full">🛡️ Создать сделку</button>
            <button onClick={() => setPage('create')} className="btn-ghost w-full mt-2">← Изменить</button>
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
            <div className="px-5 mt-2 animate-fade-in">
              {/* Status card */}
              <div className="glass-accent p-5 rounded-2xl text-center mb-4">
                <span className="text-4xl">{st.icon}</span>
                <h3 className="font-bold text-lg mt-2">{selectedDeal.title}</h3>
                <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
                <p className="text-2xl font-extrabold mono mt-3">🌙{selectedDeal.amount}</p>
                <p className="text-[10px] text-white/25 mt-1">Комиссия: 🌙{selectedDeal.fee} · @{selectedDeal.seller_username}</p>
              </div>

              {/* Progress tracker */}
              <div className="glass p-4 rounded-2xl mb-4">
                <p className="text-xs text-white/30 mb-3">Прогресс сделки</p>
                <div className="flex items-center gap-1">
                  {['funded', 'shipped', 'delivered', 'completed'].map((s, i) => {
                    const done = ['funded', 'shipped', 'delivered', 'completed'].indexOf(selectedDeal.status) >= i;
                    const current = selectedDeal.status === s;
                    return (
                      <React.Fragment key={s}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-white/[0.06] text-white/20'} ${current ? 'ring-2 ring-emerald-400/50' : ''}`}>
                          {done ? '✓' : i + 1}
                        </div>
                        {i < 3 && <div className={`flex-1 h-0.5 ${done ? 'bg-emerald-500/50' : 'bg-white/[0.06]'}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1.5 text-[8px] text-white/20">
                  <span>Оплата</span><span>Отправка</span><span>Доставка</span><span>Готово</span>
                </div>
              </div>

              {/* Description */}
              {selectedDeal.description && (
                <div className="glass p-4 rounded-2xl mb-4">
                  <p className="text-xs text-white/30 mb-1">Описание</p>
                  <p className="text-sm text-white/60">{selectedDeal.description}</p>
                </div>
              )}

              {/* Info */}
              <div className="glass p-4 rounded-2xl mb-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-white/35">Создана</span><span className="text-white/50">{new Date(selectedDeal.created_at).toLocaleString('ru-RU')}</span></div>
                <div className="flex justify-between"><span className="text-white/35">ID</span><span className="mono text-[10px] text-white/25">{selectedDeal.id.slice(0, 12)}…</span></div>
              </div>

              {/* Actions */}
              {isActive && (
                <div className="space-y-2 mb-4">
                  {/* Chat */}
                  <button onClick={() => { setPage('chat'); haptic('light'); }}
                    className="w-full glass py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98]">
                    💬 Чат сделки
                  </button>

                  {/* Status buttons */}
                  <div className="flex gap-2">
                    {canShip && (
                      <button onClick={() => updateStatus(selectedDeal.id, 'shipped')}
                        className="flex-1 glass py-3 rounded-xl text-xs text-blue-400 font-medium active:scale-95">📦 Отправлено</button>
                    )}
                    {canDeliver && (
                      <button onClick={() => updateStatus(selectedDeal.id, 'delivered')}
                        className="flex-1 glass py-3 rounded-xl text-xs text-orange-400 font-medium active:scale-95">🚚 Доставлено</button>
                    )}
                    {canComplete && (
                      <button onClick={() => updateStatus(selectedDeal.id, 'completed')}
                        className="flex-1 bg-emerald-500 py-3 rounded-xl text-xs text-white font-bold active:scale-95">✅ Подтвердить</button>
                    )}
                  </div>

                  {/* Dispute / Cancel */}
                  <div className="flex gap-2">
                    {canDispute && (
                      <button onClick={() => { setShowAppeal(true); haptic('medium'); }}
                        className="flex-1 glass py-3 rounded-xl text-xs text-red-400/70 font-medium active:scale-95">⚠️ Открыть спор</button>
                    )}
                    {canCancel && (
                      <button onClick={() => updateStatus(selectedDeal.id, 'refunded')}
                        className="flex-1 glass py-3 rounded-xl text-xs text-white/30 font-medium active:scale-95">✕ Отмена + возврат</button>
                    )}
                  </div>
                </div>
              )}

              {/* Appeal form */}
              {showAppeal && (
                <div className="glass p-4 rounded-2xl mb-4 animate-fade-in">
                  <p className="font-bold text-sm mb-2">⚖️ Подать апелляцию</p>
                  <textarea value={appealReason} onChange={(e) => setAppealReason(e.target.value)}
                    placeholder="Опишите проблему подробно: что пошло не так, что вы ожидали получить..."
                    className="w-full glass px-3 py-2 bg-transparent text-white text-sm outline-none rounded-lg resize-none h-20 mb-2" />
                  <div className="flex gap-2">
                    <button onClick={submitAppeal} disabled={!appealReason.trim()} className="flex-1 bg-red-500 py-2.5 rounded-xl text-xs text-white font-bold active:scale-95">Подать</button>
                    <button onClick={() => setShowAppeal(false)} className="flex-1 glass py-2.5 rounded-xl text-xs active:scale-95">Отмена</button>
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
            <div className="px-5 py-2 glass mx-5 mt-1 rounded-xl flex items-center gap-2">
              <ShieldIcon size={14} color="rgba(255,255,255,0.3)" />
              <span className="text-xs text-white/40 truncate">{selectedDeal.title} · 🌙{selectedDeal.amount}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {chatMsgs.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'buyer' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
                  {msg.sender === 'system' ? (
                    <div className="glass px-3 py-1.5 rounded-xl max-w-[85%]">
                      <p className="text-[10px] text-white/30 text-center">{msg.text}</p>
                    </div>
                  ) : (
                    <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl ${
                      msg.sender === 'buyer'
                        ? 'bg-blue-500/20 rounded-tr-sm'
                        : 'glass rounded-tl-sm'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-[8px] text-white/20 mt-1 text-right">{new Date(msg.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-5 pb-4 flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMsg()}
                placeholder="Сообщение..."
                className="flex-1 glass px-4 py-3 bg-transparent text-white text-sm outline-none rounded-xl" />
              <button onClick={sendChatMsg} disabled={!chatInput.trim()}
                className="glass w-11 h-11 rounded-xl flex items-center justify-center active:scale-95">
                📤
              </button>
            </div>
          </div>
        )}

        {/* ===== SUCCESS ===== */}
        {page === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 px-5 animate-fade-in">
            <AnimatedEmoji type="success" size={72} loop={false} />
            <h2 className="text-xl font-extrabold mt-4 mb-2">Сделка создана!</h2>
            <p className="text-white/35 text-sm mb-1">🌙{val} заморожено</p>
            <p className="text-white/20 text-xs mb-6">Ожидайте действий продавца @{seller}</p>
            <button onClick={() => { setPage('list'); setTitle(''); setDesc(''); setAmount(''); setSeller(''); }} className="btn-primary w-full max-w-sm">К сделкам</button>
          </div>
        )}
      </div>
    </div>
  );
}
