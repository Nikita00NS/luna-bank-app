import React, { useState } from 'react';
import { useStore, uid, genCardNum, genCVV, genExpiry } from '../lib/store';
import { formatMoney, formatCrypto, balanceInUsd, haptic, hashPin } from '../lib/utils';
import { CARD_DESIGNS, CRYPTO_PRICES } from '../lib/constants';
import { generateStatement, generateRequisites } from '../lib/pdf';
import Modal from '../components/Modal';
import PinPad from '../components/PinPad';
import type { CardDesign, CardType } from '../lib/store';

export default function AccountDetailScreen() {
  const { selAccountId: sid, accounts, cards, user, txs, go, addCard, addNotif, dispCurrency } = useStore();
  const [flipped, setFlipped] = useState(false);
  const [showData, setShowData] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinErr, setPinErr] = useState(false);
  const [showNewCard, setShowNewCard] = useState(false);
  const [design, setDesign] = useState<CardDesign>('classic');
  const [cardType, setCardType] = useState<CardType>('virtual');

  const a = accounts.find(x => x.id === sid);
  const card = cards.find(c => c.account_id === sid);
  const aTxs = txs.filter(t => t.from_account_id === sid || t.to_account_id === sid);
  if (!a || !user) return null;

  const dObj = card ? CARD_DESIGNS.find(d => d.id === card.design) || CARD_DESIGNS[0] : CARD_DESIGNS[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const mTxs = aTxs.filter(t => t.created_at >= monthStart);
  const mOut = mTxs.filter(t => t.from_account_id === sid).reduce((s,t) => s+t.amount, 0);
  const mIn = mTxs.filter(t => t.to_account_id === sid).reduce((s,t) => s+t.amount, 0);

  const handleFlip = () => {
    if (!card) return;
    haptic('light');
    if (!flipped) setFlipped(true);
    else if (!showData) setShowPinModal(true);
    else { setFlipped(false); setShowData(false); }
  };

  const handleCardPin = async (pin: string) => {
    const h = await hashPin(pin, String(user.telegram_id));
    if (h === user.pin_hash) { haptic('success'); setShowPinModal(false); setShowData(true); }
    else { setPinErr(true); setTimeout(() => setPinErr(false), 600); }
  };

  const orderCard = () => {
    haptic('success');
    addCard({ id: uid(), account_id: a.id, type: cardType, design, number: genCardNum(), cvv: genCVV(), expiry: genExpiry(), holder: `${user.first_name} ${user.last_name}`.toUpperCase(), created_at: new Date().toISOString() });
    addNotif({ id: uid(), title: '💳 Карта выпущена', message: `${cardType==='virtual'?'Виртуальная':cardType==='premium'?'Премиум':'Пластиковая'} карта готова`, type: 'system', read: false, created_at: new Date().toISOString() });
    setShowNewCard(false);
  };

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('cards')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">{a.name}</h1>
        <span className="text-xs text-white/30 tabular-nums">{a.currency}</span>
      </div>

      <div className="px-5 mt-4 animate-slide-up">
        <p className="text-xs text-white/35 font-medium uppercase tracking-wide">Баланс</p>
        <p className="text-[42px] font-extrabold tabular-nums tracking-tighter leading-none mt-1">
          {a.currency==='LNC'||a.currency==='USDT'?formatMoney(balanceInUsd(a.balance,a.currency),dispCurrency):formatCrypto(a.balance,a.currency)}
        </p>
        {a.currency!=='LNC'&&a.currency!=='USDT'&&(
          <p className="text-sm text-white/30 mt-1">≈ {formatMoney(a.balance*(CRYPTO_PRICES[a.currency]||1),'USD')}</p>
        )}
      </div>

      <div className="px-5 mt-5 flex gap-3">
        <div className="flex-1 glass rounded-xl p-3">
          <p className="text-[10px] text-white/35 uppercase tracking-wide">Расходы/мес</p>
          <p className="font-bold tabular-nums text-red-400 text-[15px] mt-0.5">{formatMoney(balanceInUsd(mOut,a.currency),'USD')}</p>
        </div>
        <div className="flex-1 glass rounded-xl p-3">
          <p className="text-[10px] text-white/35 uppercase tracking-wide">Доход/мес</p>
          <p className="font-bold tabular-nums text-emerald-400 text-[15px] mt-0.5">{formatMoney(balanceInUsd(mIn,a.currency),'USD')}</p>
        </div>
      </div>

      {/* Card */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white/50">Карта</h3>
          {!card && <button onClick={()=>setShowNewCard(true)} className="text-xs text-white/30">+ Оформить</button>}
        </div>
        {card ? (
          <div className="perspective" style={{height:195}}>
            <div className={`card-inner ${flipped?'flipped':''}`} onClick={handleFlip} style={{height:195}}>
              <div className="card-face p-5 flex flex-col justify-between cursor-pointer shadow-2xl" style={{background:dObj.bg,color:dObj.color,height:195}}>
                <div className="flex justify-between items-start">
                  <span className="text-lg font-black tracking-tight">Luna</span>
                  <span className="text-[10px] opacity-50 uppercase tracking-wider">{card.type}</span>
                </div>
                <div>
                  <p className="text-[17px] tabular-nums tracking-[0.2em] opacity-75">•••• •••• •••• {card.number.split(' ')[3]}</p>
                  <div className="flex justify-between mt-2.5">
                    <p className="text-[11px] opacity-50">{card.holder}</p>
                    <p className="text-[10px] opacity-30 animate-pulse">TAP TO FLIP →</p>
                  </div>
                </div>
              </div>
              <div className="card-face card-back p-5 flex flex-col justify-center items-center cursor-pointer shadow-2xl" style={{background:dObj.bg,color:dObj.color,height:195}}>
                {showData ? (
                  <div className="w-full space-y-3 text-left">
                    <div><p className="text-[10px] opacity-40">Номер карты</p><p className="tabular-nums text-[17px] tracking-wider">{card.number}</p></div>
                    <div className="flex gap-8">
                      <div><p className="text-[10px] opacity-40">CVV</p><p className="tabular-nums font-bold text-lg">{card.cvv}</p></div>
                      <div><p className="text-[10px] opacity-40">Срок</p><p className="tabular-nums">{card.expiry}</p></div>
                    </div>
                    <div><p className="text-[10px] opacity-40">Держатель</p><p className="text-sm">{card.holder}</p></div>
                  </div>
                ) : (
                  <div className="text-center"><p className="text-4xl mb-3">🔐</p><p className="text-sm opacity-50">Нажмите для ввода PIN</p></div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <button onClick={()=>setShowNewCard(true)} className="w-full glass rounded-2xl p-10 flex flex-col items-center gap-3 active:scale-[0.98] transition-transform">
            <span className="text-4xl">💳</span><p className="text-sm text-white/40">Оформить карту</p>
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 mt-6">
        <h3 className="text-sm font-bold text-white/50 mb-3">Быстрые действия</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            {i:'📤',l:'Перевод',p:'transfer'},{i:'📥',l:'Пополнить',p:'deposit'},
            {i:'📋',l:'Реквизиты',p:'receive'},{i:'📱',l:'QR',p:'qr'},
          ].map((x,i)=>(
            <button key={i} onClick={()=>{haptic('light');go(x.p as any)}}
              className="glass rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-all">
              <span className="text-xl">{x.i}</span>
              <span className="text-[10px] text-white/40">{x.l}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="px-5 mt-6">
        <h3 className="text-sm font-bold text-white/50 mb-3">Документы PDF</h3>
        <div className="space-y-2">
          {[
            {i:'📄',l:'Выписка по счёту',fn:()=>generateStatement(user,a,aTxs)},
            {i:'🏦',l:'Реквизиты счёта',fn:()=>generateRequisites(user,a)},
          ].map((d,i)=>(
            <button key={i} onClick={()=>{haptic('light');d.fn()}}
              className="w-full glass rounded-xl p-3.5 flex items-center gap-3 active:scale-[0.98] transition-all">
              <span className="text-xl">{d.i}</span>
              <span className="text-sm flex-1 text-left">{d.l}</span>
              <span className="text-xs text-white/25">Скачать ↓</span>
            </button>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="px-5 mt-6 mb-6">
        <h3 className="text-sm font-bold text-white/50 mb-3">Детали</h3>
        <div className="glass rounded-2xl divide-y divide-white/[0.04]">
          {[
            {l:'Номер',v:a.account_number},{l:'IBAN',v:a.iban},{l:'Валюта',v:a.currency},{l:'Тип',v:a.type},
            {l:'Договор',v:a.contract_signed?'✅ Подписан':'—'},{l:'Открыт',v:new Date(a.created_at).toLocaleDateString('ru-RU')},
          ].map(r=>(
            <div key={r.l} className="flex justify-between p-3">
              <span className="text-sm text-white/35">{r.l}</span>
              <span className="text-sm tabular-nums text-right max-w-[60%] truncate">{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      {showPinModal && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
          <PinPad title="PIN для карты" subtitle="Просмотр данных" onComplete={handleCardPin} error={pinErr} onCancel={()=>{setShowPinModal(false);setFlipped(false)}} />
        </div>
      )}

      <Modal open={showNewCard} onClose={()=>setShowNewCard(false)} title="Оформить карту">
        <div className="space-y-5">
          <div>
            <p className="text-xs text-white/35 mb-2 font-medium">Тип карты</p>
            <div className="space-y-2">
              {([{t:'virtual'as CardType,n:'Виртуальная',p:'$0',d:'Мгновенно, Apple Pay'},{t:'premium'as CardType,n:'Премиум',p:'$4.99',d:'Повышенные лимиты'},{t:'plastic'as CardType,n:'Пластиковая',p:'$19.99',d:'Доставка 3-7 дней'}]).map(c=>(
                <button key={c.t} onClick={()=>setCardType(c.t)}
                  className={`w-full rounded-xl p-3 flex items-center gap-3 text-left transition-all ${cardType===c.t?'bg-white/8 ring-1 ring-white/15':'bg-white/[0.03]'}`}>
                  <div className="flex-1"><p className="font-medium text-sm">{c.n}</p><p className="text-[11px] text-white/30">{c.d}</p></div>
                  <span className="text-sm font-bold">{c.p}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-white/35 mb-2 font-medium">Дизайн</p>
            <div className="grid grid-cols-3 gap-2">
              {CARD_DESIGNS.map(d=>(
                <button key={d.id} onClick={()=>setDesign(d.id as CardDesign)}
                  className={`rounded-xl p-3 h-16 transition-all ${design===d.id?'ring-2 ring-white shadow-lg':''}`}
                  style={{background:d.bg}}>
                  <p className="text-[11px] font-semibold" style={{color:d.color}}>{d.name}</p>
                </button>
              ))}
            </div>
          </div>
          <button onClick={orderCard} className="btn-primary w-full">Оформить</button>
        </div>
      </Modal>
    </div>
  );
}
