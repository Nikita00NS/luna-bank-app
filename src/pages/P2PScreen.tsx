import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction, dbCreateP2POffer, dbGetP2POffers, dbGetMyP2POffers, dbUpdateP2POffer } from '../lib/db';
import {
  ArrowLeftIcon, PlusIcon, TrendingUpIcon, CheckCircleIcon,
  CreditCardIcon, PhoneIcon, DiamondIcon, ShieldCheckIcon, CheckIcon,
} from '../components/Icons';
import Modal from '../components/Modal';

interface P2POffer {
  id: string;
  user_id: number;
  username: string;
  first_name: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number; // price per 1 LNC in RUB
  currency: string;
  min_limit: number;
  max_limit: number;
  payment_methods: string[];
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

const PAYMENT_METHODS = ['T-Bank (Тинькофф)', 'Сбербанк', 'Альфа-Банк', 'СБП (По номеру телефона)', 'Райффайзен', 'USDT TRC20 / TON'];

export default function P2PScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [tab, setTab] = useState<'buy' | 'sell' | 'my'>('buy');
  const [offers, setOffers] = useState<P2POffer[]>([]);
  const [myOffers, setMyOffers] = useState<P2POffer[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDeal, setShowDeal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<P2POffer | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form
  const [newType, setNewType] = useState<'buy' | 'sell'>('sell');
  const [newAmount, setNewAmount] = useState('');
  const [newPrice, setNewPrice] = useState('4.5'); // RUB per LNC
  const [newMethods, setNewMethods] = useState<string[]>(['T-Bank (Тинькофф)']);
  const [dealAmount, setDealAmount] = useState('');

  if (!user) return null;
  const lncAcc = accounts.find((a) => a.currency === 'LNC');

  useEffect(() => { loadOffers(); }, [tab]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const searchType = tab === 'buy' ? 'sell' : 'buy';
      const [offerData, myData] = await Promise.all([
        dbGetP2POffers(searchType as any, user.telegram_id),
        dbGetMyP2POffers(user.telegram_id),
      ]);
      setOffers(offerData as P2POffer[]);
      setMyOffers(myData as P2POffer[]);
    } catch {}
    setLoading(false);
  };

  const createOffer = async () => {
    const amount = parseFloat(newAmount) || 0;
    const price = parseFloat(newPrice) || 0;
    if (amount <= 0 || price <= 0) { haptic('error'); return; }
    if (newType === 'sell' && lncAcc && lncAcc.balance < amount) { haptic('error'); return; }

    haptic('success');
    await dbCreateP2POffer({
      user_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      type: newType,
      amount,
      price,
      currency: 'RUB',
      min_limit: 100,
      max_limit: amount * price,
      payment_methods: newMethods,
      status: 'active',
    });

    // If selling, freeze balance
    if (newType === 'sell' && lncAcc) {
      updateBalance(lncAcc.id, -amount);
      dbUpdateBalance(lncAcc.id, -amount).catch(() => {});
    }

    setShowCreate(false);
    setNewAmount('');
    loadOffers();
  };

  const executeDeal = async () => {
    if (!selectedOffer || !lncAcc) return;
    const amt = parseFloat(dealAmount) || 0;
    if (amt <= 0 || amt > selectedOffer.amount) { haptic('error'); return; }

    haptic('success');

    // Update buyer's balance
    if (selectedOffer.type === 'sell') {
      updateBalance(lncAcc.id, amt);
      dbUpdateBalance(lncAcc.id, amt).catch(() => {});
    } else {
      if (lncAcc.balance < amt) { haptic('error'); return; }
      updateBalance(lncAcc.id, -amt);
      dbUpdateBalance(lncAcc.id, -amt).catch(() => {});
    }

    // Record transaction
    addTx({
      id: uid(), from_user_id: user.telegram_id, to_user_id: selectedOffer.user_id,
      from_account_id: lncAcc.id, to_account_id: 'p2p', amount: amt, fee: 0, currency: 'LNC',
      type: 'transfer', status: 'completed',
      note: `P2P ${selectedOffer.type === 'sell' ? 'Покупка' : 'Продажа'} ${amt} LNC @ ${selectedOffer.price} ₽`,
      created_at: new Date().toISOString(),
    });

    addNotif({ id: uid(), title: 'P2P Сделка завершена', message: `${amt} LNC по курсу ${selectedOffer.price} ₽/LNC`, type: 'transfer', read: false, created_at: new Date().toISOString() });

    // Update offer in DB
    const remaining = selectedOffer.amount - amt;
    await dbUpdateP2POffer(selectedOffer.id, {
      amount: remaining,
      status: remaining <= 0 ? 'completed' : 'active',
    });

    setShowDeal(false);
    setDealAmount('');
    loadOffers();
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4 border-b border-white/[0.04]">
        <button onClick={() => go('home')} className="text-white/60 hover:text-white transition-colors p-1 -ml-1"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-extrabold text-[17px] flex-1 text-white tracking-tight">P2P Обмен валют</h1>
        <button onClick={() => { setShowCreate(true); haptic('light'); }} className="glass rounded-2xl px-3.5 py-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 active:scale-95 transition-all">
          <PlusIcon size={14} /> <span className="hidden sm:inline">Новый</span> оффер
        </button>
      </div>

      {/* Tabs */}
      <div className="px-5 mt-3">
        <div className="flex gap-1.5 p-1.5 glass rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          {(['buy', 'sell', 'my'] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); haptic('light'); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === t ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-white/40 hover:text-white/70'}`}>
              {t === 'buy' ? 'Купить крипту' : t === 'sell' ? 'Продать крипту' : `Мои офферы (${myOffers.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Security notice */}
      <div className="mx-5 mt-4 glass p-3.5 rounded-2xl border border-white/10 flex items-center gap-3 bg-white/[0.02]">
        <div className="text-emerald-400 shrink-0">
          <ShieldCheckIcon size={18} />
        </div>
        <p className="text-xs text-white/60 leading-relaxed font-medium">Все P2P-сделки защищены автоматической заморозкой средств продавца на смарт-гаранте.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 mt-4">
        {(tab === 'buy' || tab === 'sell') && (
          <div className="space-y-3 animate-fade-in">
            {offers.length === 0 ? (
              <div className="text-center py-14 glass rounded-3xl border border-white/10 bg-white/[0.02]">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-white/20">
                  <TrendingUpIcon size={32} />
                </div>
                <p className="text-white font-extrabold text-base">Активных офферов не найдено</p>
                <p className="text-white/40 text-xs mt-1 max-w-[240px] mx-auto">Станьте первым, кто создаст предложение по покупке или продаже валюты</p>
                <button onClick={() => setShowCreate(true)} className="btn-primary mt-6 px-8 py-3.5 rounded-2xl font-bold">Создать объявление</button>
              </div>
            ) : (
              offers.map((offer, i) => (
                <button key={offer.id} onClick={() => { setSelectedOffer(offer); setShowDeal(true); haptic('light'); }}
                  className="w-full glass p-4 rounded-2xl text-left active:scale-[0.98] transition-all animate-slide-up border border-white/10 hover:border-white/20 bg-gradient-to-r from-white/[0.04] to-transparent" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 border border-white/10 flex items-center justify-center text-sm font-extrabold text-white shrink-0">
                      {offer.first_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-extrabold text-sm text-white truncate">{offer.first_name}</p>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                      <p className="text-xs text-white/40 font-medium">@{offer.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-lg mono text-amber-400">{offer.price} ₽</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">за 1 LNC</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2.5 border-t border-white/[0.06]">
                    <span className="mono font-bold text-white/80">Доступно: {offer.amount} LNC</span>
                    <div className="flex gap-1">
                      {offer.payment_methods.map((pm, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-[10px] text-white/70 font-semibold">
                          {pm.replace(/[^\w\sа-яА-ЯёЁ\-/()]/g, '').trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {tab === 'my' && (
          <div className="space-y-3 animate-fade-in">
            {myOffers.length === 0 ? (
              <div className="text-center py-14 glass rounded-3xl border border-white/10 bg-white/[0.02]">
                <p className="text-white/60 font-bold text-sm">У вас пока нет активных объявлений</p>
              </div>
            ) : (
              myOffers.map((o) => (
                <div key={o.id} className="glass p-4 rounded-2xl flex items-center gap-3.5 border border-white/10">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${o.type === 'sell' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                    <TrendingUpIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{o.type === 'sell' ? 'Продажа' : 'Покупка'} {o.amount} LNC</p>
                    <p className="text-xs text-white/40 mono mt-0.5">{o.price} ₽/LNC · Статус: <span className="text-amber-400">{o.status}</span></p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новое объявление на P2P">
        <div className="space-y-4">
          <div className="flex gap-2 p-1 glass rounded-2xl border border-white/10">
            <button onClick={() => setNewType('sell')} className={`flex-1 py-3 rounded-xl font-extrabold text-sm transition-all ${newType === 'sell' ? 'bg-red-500 text-black shadow-md' : 'text-white/50 hover:text-white'}`}>Продать LNC</button>
            <button onClick={() => setNewType('buy')} className={`flex-1 py-3 rounded-xl font-extrabold text-sm transition-all ${newType === 'buy' ? 'bg-emerald-500 text-black shadow-md' : 'text-white/50 hover:text-white'}`}>Купить LNC</button>
          </div>
          <div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1.5">Объём (LNC)</p>
            <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Количество LNC для обмена" className="w-full glass px-4 py-3.5 bg-transparent text-white mono outline-none rounded-2xl border border-white/10 focus:border-amber-500/50 text-sm font-semibold" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1.5">Курс (Цена за 1 LNC)</p>
            <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Цена за 1 LNC (в рублях)" className="w-full glass px-4 py-3.5 bg-transparent text-white mono outline-none rounded-2xl border border-white/10 focus:border-amber-500/50 text-sm font-semibold" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Способы приёма / отправки оплаты</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button key={m} onClick={() => setNewMethods((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${newMethods.includes(m) ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-sm' : 'glass border-white/10 text-white/60 hover:text-white'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          {newAmount && newPrice && (
            <div className="glass p-4 rounded-2xl border border-white/10 flex justify-between items-center">
              <span className="text-xs text-white/40 font-medium">Итоговая сумма сделки:</span>
              <span className="text-base font-extrabold mono text-amber-400">{((parseFloat(newAmount) || 0) * (parseFloat(newPrice) || 0)).toLocaleString('ru-RU')} ₽</span>
            </div>
          )}
          <button onClick={createOffer} disabled={!newAmount || !newPrice} className="btn-primary w-full py-4 rounded-2xl font-bold text-[15px] shadow-lg shadow-amber-500/20">Опубликовать объявление</button>
        </div>
      </Modal>

      {/* Deal Modal */}
      <Modal open={showDeal} onClose={() => setShowDeal(false)} title={selectedOffer ? `${selectedOffer.type === 'sell' ? 'Покупка' : 'Продажа'} LNC на P2P` : ''}>
        {selectedOffer && (
          <div className="space-y-4">
            <div className="glass p-4 rounded-2xl space-y-2 border border-white/10 bg-white/[0.02]">
              <div className="flex justify-between text-sm"><span className="text-white/40 font-medium">Продавец</span><span className="font-semibold text-white">@{selectedOffer.username}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/40 font-medium">Курс обмена</span><span className="font-extrabold text-amber-400 mono">{selectedOffer.price} ₽ / LNC</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/40 font-medium">Лимит в оффере</span><span className="mono font-semibold">{selectedOffer.amount} LNC</span></div>
              <div className="flex justify-between items-center text-sm pt-1 border-t border-white/[0.06]"><span className="text-white/40 font-medium">Оплата</span><span className="text-xs text-white/80 font-semibold">{selectedOffer.payment_methods.map(pm => pm.replace(/[^\w\sа-яА-ЯёЁ\-/()]/g, '').trim()).join(', ')}</span></div>
            </div>
            <div>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1.5">Количество для обмена</p>
              <input type="number" value={dealAmount} onChange={(e) => setDealAmount(e.target.value)} placeholder="0.00 LNC"
                className="w-full glass px-4 py-4 bg-transparent text-white text-3xl font-extrabold mono outline-none text-center rounded-2xl border border-white/10 focus:border-amber-500/50" />
            </div>
            {dealAmount && (
              <div className="glass p-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] text-center">
                <p className="text-xs text-white/40 font-semibold">К переводу по реквизитам второй стороны:</p>
                <p className="text-2xl font-extrabold mono text-amber-400 mt-1">{((parseFloat(dealAmount) || 0) * selectedOffer.price).toLocaleString('ru-RU')} ₽</p>
              </div>
            )}
            <button onClick={executeDeal} disabled={!dealAmount} className="btn-primary w-full py-4 rounded-2xl font-bold text-[15px] shadow-lg shadow-amber-500/20">
              {selectedOffer.type === 'sell' ? 'Подтвердить покупку' : 'Подтвердить продажу'} {dealAmount || 0} LNC
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
