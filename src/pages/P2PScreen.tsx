import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { dbUpdateBalance, dbCreateTransaction } from '../lib/db';
import { ArrowLeftIcon, PlusIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
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

const PAYMENT_METHODS = ['💳 Тинькофф', '💳 Сбер', '💳 Альфа', '📱 СБП', '💎 USDT TRC20', '💎 TON'];

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
  const [newMethods, setNewMethods] = useState<string[]>(['💳 Тинькофф']);
  const [dealAmount, setDealAmount] = useState('');

  if (!user) return null;
  const lncAcc = accounts.find((a) => a.currency === 'LNC');

  useEffect(() => { loadOffers(); }, [tab]);

  const loadOffers = async () => {
    setLoading(true);
    // Load from localStorage (production: Supabase table)
    try {
      const all: P2POffer[] = JSON.parse(localStorage.getItem('luna-p2p-offers') || '[]');
      setOffers(all.filter((o) => o.status === 'active' && o.user_id !== user.telegram_id && o.type === (tab === 'buy' ? 'sell' : 'buy')));
      setMyOffers(all.filter((o) => o.user_id === user.telegram_id));
    } catch {}
    setLoading(false);
  };

  const createOffer = () => {
    const amount = parseFloat(newAmount) || 0;
    const price = parseFloat(newPrice) || 0;
    if (amount <= 0 || price <= 0) { haptic('error'); return; }
    if (newType === 'sell' && lncAcc && lncAcc.balance < amount) { haptic('error'); return; }

    haptic('success');
    const offer: P2POffer = {
      id: uid(),
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
      created_at: new Date().toISOString(),
    };

    const all: P2POffer[] = JSON.parse(localStorage.getItem('luna-p2p-offers') || '[]');
    all.push(offer);
    localStorage.setItem('luna-p2p-offers', JSON.stringify(all));

    // If selling, freeze balance
    if (newType === 'sell' && lncAcc) {
      updateBalance(lncAcc.id, -amount);
      dbUpdateBalance(lncAcc.id, -amount).catch(() => {});
    }

    setShowCreate(false);
    setNewAmount('');
    loadOffers();
  };

  const executeDeal = () => {
    if (!selectedOffer || !lncAcc) return;
    const amt = parseFloat(dealAmount) || 0;
    if (amt <= 0 || amt > selectedOffer.amount) { haptic('error'); return; }

    haptic('success');

    // Update buyer's balance
    if (selectedOffer.type === 'sell') {
      // We're buying → we get LNC
      updateBalance(lncAcc.id, amt);
      dbUpdateBalance(lncAcc.id, amt).catch(() => {});
    } else {
      // We're selling → we lose LNC
      if (lncAcc.balance < amt) { haptic('error'); return; }
      updateBalance(lncAcc.id, -amt);
      dbUpdateBalance(lncAcc.id, -amt).catch(() => {});
    }

    // Record transaction
    addTx({
      id: uid(), from_user_id: user.telegram_id, to_user_id: selectedOffer.user_id,
      from_account_id: lncAcc.id, to_account_id: 'p2p', amount: amt, fee: 0, currency: 'LNC',
      type: 'transfer', status: 'completed',
      note: `P2P ${selectedOffer.type === 'sell' ? 'Покупка' : 'Продажа'} ◎${amt} @ ₽${selectedOffer.price}`,
      created_at: new Date().toISOString(),
    });

    addNotif({ id: uid(), title: '🔄 P2P Сделка', message: `◎${amt} LNC по ₽${selectedOffer.price}/LNC`, type: 'transfer', read: false, created_at: new Date().toISOString() });

    // Update offer
    const all: P2POffer[] = JSON.parse(localStorage.getItem('luna-p2p-offers') || '[]');
    const updated = all.map((o) => o.id === selectedOffer.id ? { ...o, amount: o.amount - amt, status: o.amount - amt <= 0 ? 'completed' as const : 'active' as const } : o);
    localStorage.setItem('luna-p2p-offers', JSON.stringify(updated));

    setShowDeal(false);
    setDealAmount('');
    loadOffers();
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">P2P Биржа</h1>
        <button onClick={() => { setShowCreate(true); haptic('light'); }} className="glass rounded-full w-8 h-8 flex items-center justify-center">
          <PlusIcon size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-5 mt-1 flex gap-1.5 p-1 glass rounded-2xl">
        {(['buy', 'sell', 'my'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); haptic('light'); }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'text-white/40'}`}>
            {t === 'buy' ? '📈 Купить' : t === 'sell' ? '📉 Продать' : `📋 Мои (${myOffers.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 mt-3">
        {(tab === 'buy' || tab === 'sell') && (
          <div className="space-y-2 animate-fade-in">
            {offers.length === 0 ? (
              <div className="text-center py-14">
                <AnimatedEmoji type="wallet" size={48} />
                <p className="text-white/30 text-sm mt-3">Нет объявлений</p>
                <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 px-6">+ Создать</button>
              </div>
            ) : (
              offers.map((offer, i) => (
                <button key={offer.id} onClick={() => { setSelectedOffer(offer); setShowDeal(true); haptic('light'); }}
                  className="w-full glass p-4 rounded-2xl text-left active:scale-[0.98] transition-all animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                      {offer.first_name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{offer.first_name}</p>
                      <p className="text-[10px] text-white/25">@{offer.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-lg">₽{offer.price}</p>
                      <p className="text-[9px] text-white/25">за 1 LNC</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-white/30">
                    <span>◎{offer.amount} LNC</span>
                    <span>{offer.payment_methods.join(' ')}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {tab === 'my' && (
          <div className="space-y-2 animate-fade-in">
            {myOffers.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-white/30 text-sm">У вас нет объявлений</p>
              </div>
            ) : (
              myOffers.map((o) => (
                <div key={o.id} className="glass p-3 rounded-xl flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${o.type === 'sell' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {o.type === 'sell' ? '↓' : '↑'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{o.type === 'sell' ? 'Продажа' : 'Покупка'} ◎{o.amount}</p>
                    <p className="text-[10px] text-white/25">₽{o.price}/LNC · {o.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новое объявление">
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setNewType('sell')} className={`flex-1 py-3 rounded-xl font-bold text-sm ${newType === 'sell' ? 'bg-red-500 text-white' : 'glass text-white/50'}`}>Продать LNC</button>
            <button onClick={() => setNewType('buy')} className={`flex-1 py-3 rounded-xl font-bold text-sm ${newType === 'buy' ? 'bg-emerald-500 text-white' : 'glass text-white/50'}`}>Купить LNC</button>
          </div>
          <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Количество LNC" className="w-full glass px-4 py-3 bg-transparent text-white mono outline-none rounded-xl" />
          <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Цена за 1 LNC (₽)" className="w-full glass px-4 py-3 bg-transparent text-white mono outline-none rounded-xl" />
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button key={m} onClick={() => setNewMethods((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] ${newMethods.includes(m) ? 'bg-white/10 ring-1 ring-white/20' : 'glass'}`}>
                {m}
              </button>
            ))}
          </div>
          {newAmount && newPrice && (
            <p className="text-xs text-white/30 text-center">Итого: ₽{((parseFloat(newAmount) || 0) * (parseFloat(newPrice) || 0)).toFixed(0)}</p>
          )}
          <button onClick={createOffer} disabled={!newAmount || !newPrice} className="btn-primary w-full">Создать объявление</button>
        </div>
      </Modal>

      {/* Deal Modal */}
      <Modal open={showDeal} onClose={() => setShowDeal(false)} title={selectedOffer ? `${selectedOffer.type === 'sell' ? '📈 Купить' : '📉 Продать'} LNC` : ''}>
        {selectedOffer && (
          <div className="space-y-4">
            <div className="glass p-3 rounded-xl space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-white/35">Продавец</span><span>@{selectedOffer.username}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/35">Цена</span><span className="font-bold">₽{selectedOffer.price}/LNC</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/35">Доступно</span><span>◎{selectedOffer.amount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/35">Оплата</span><span className="text-xs">{selectedOffer.payment_methods.join(', ')}</span></div>
            </div>
            <input type="number" value={dealAmount} onChange={(e) => setDealAmount(e.target.value)} placeholder="Количество LNC"
              className="w-full glass px-4 py-3.5 bg-transparent text-white text-xl mono outline-none text-center rounded-xl" />
            {dealAmount && (
              <p className="text-center text-sm text-white/40">= ₽{((parseFloat(dealAmount) || 0) * selectedOffer.price).toFixed(0)}</p>
            )}
            <button onClick={executeDeal} disabled={!dealAmount} className="btn-primary w-full">
              {selectedOffer.type === 'sell' ? 'Купить' : 'Продать'} ◎{dealAmount || 0}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
