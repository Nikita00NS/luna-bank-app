import React, { useState } from 'react';
import { useStore, uid, genCardNum, genCVV, genExpiry } from '../lib/store';
import { formatMoney, formatCrypto, balanceInUsd, haptic, hashPin } from '../lib/utils';
import { CARD_DESIGNS, CRYPTO_PRICES } from '../lib/constants';
import { dbCreateCard, dbCreateNotification } from '../lib/db';
import {
  generateStatement,
  generateRequisites,
  generateBalanceCertificate,
  generateContractCertificate,
} from '../lib/pdf';
import { ArrowLeftIcon, SendIcon, DownloadIcon, CreditCardIcon, QrCodeIcon } from '../components/Icons';
import Modal from '../components/Modal';
import PinPad from '../components/PinPad';
import type { CardDesign, CardType } from '../lib/store';

export default function AccountDetailScreen() {
  const { selAccountId, accounts, cards, user, txs, go, addCard, addNotif, dispCurrency } = useStore();

  const [flipped, setFlipped] = useState(false);
  const [showCardData, setShowCardData] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [showNewCard, setShowNewCard] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<CardDesign>('classic');
  const [selectedCardType, setSelectedCardType] = useState<CardType>('virtual');

  const account = accounts.find((a) => a.id === selAccountId);
  const card = cards.find((c) => c.account_id === selAccountId);
  const accountTxs = txs.filter(
    (t) => t.from_account_id === selAccountId || t.to_account_id === selAccountId
  );

  if (!account || !user) return null;

  const designObj = card
    ? CARD_DESIGNS.find((d) => d.id === card.design) || CARD_DESIGNS[0]
    : CARD_DESIGNS[0];

  // Monthly stats
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const monthTxs = accountTxs.filter((t) => t.created_at >= monthStart);
  const monthOut = monthTxs
    .filter((t) => t.from_account_id === selAccountId)
    .reduce((s, t) => s + t.amount, 0);
  const monthIn = monthTxs
    .filter((t) => t.to_account_id === selAccountId)
    .reduce((s, t) => s + t.amount, 0);

  // Card flip logic
  const handleFlip = () => {
    if (!card) return;
    haptic('light');
    if (!flipped) {
      setFlipped(true);
    } else if (!showCardData) {
      setShowPinModal(true);
    } else {
      setFlipped(false);
      setShowCardData(false);
    }
  };

  const handleCardPin = async (pin: string) => {
    const hash = await hashPin(pin, String(user.telegram_id));
    if (hash === user.pin_hash) {
      haptic('success');
      setShowPinModal(false);
      setShowCardData(true);
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 600);
    }
  };

  const orderCard = () => {
    haptic('success');
    const newCard = {
      id: uid(),
      account_id: account.id,
      type: selectedCardType,
      design: selectedDesign,
      number: genCardNum(),
      cvv: genCVV(),
      expiry: genExpiry(),
      holder: `${user.first_name} ${user.last_name}`.toUpperCase(),
      created_at: new Date().toISOString(),
    };

    addCard(newCard);
    dbCreateCard(newCard).catch(() => {});

    addNotif({
      id: uid(),
      title: '💳 Карта выпущена',
      message: `${selectedCardType === 'virtual' ? 'Виртуальная' : selectedCardType === 'premium' ? 'Премиум' : 'Пластиковая'} карта готова`,
      type: 'system',
      read: false,
      created_at: new Date().toISOString(),
    });

    setShowNewCard(false);
  };

  // Quick actions
  const actions = [
    { Icon: SendIcon, label: 'Перевод', page: 'transfer' as const },
    { Icon: DownloadIcon, label: 'Пополнить', page: 'deposit' as const },
    { Icon: CreditCardIcon, label: 'Реквизиты', page: 'receive' as const },
    { Icon: QrCodeIcon, label: 'QR', page: 'qr' as const },
  ];

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('cards')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">{account.name}</h1>
        <span className="text-xs text-white/30 mono">{account.currency}</span>
      </div>

      {/* Balance */}
      <div className="px-5 mt-4 animate-slide-up">
        <p className="text-xs text-white/35 font-medium uppercase tracking-wide">Баланс</p>
        <p className="text-[42px] font-extrabold mono tracking-tighter leading-none mt-1">
          {account.currency === 'LNC' || account.currency === 'USDT'
            ? formatMoney(balanceInUsd(account.balance, account.currency), dispCurrency)
            : formatCrypto(account.balance, account.currency)}
        </p>
        {account.currency !== 'LNC' && account.currency !== 'USDT' && (
          <p className="text-sm text-white/30 mt-1 mono">
            ≈ {formatMoney(account.balance * (CRYPTO_PRICES[account.currency] || 1), 'USD')}
          </p>
        )}
      </div>

      {/* Monthly Stats */}
      <div className="px-5 mt-5 flex gap-3">
        <div className="flex-1 glass p-3">
          <p className="text-[10px] text-white/35 uppercase tracking-wide">Расходы/мес</p>
          <p className="font-bold mono text-red-400 text-[15px] mt-0.5">
            {formatMoney(balanceInUsd(monthOut, account.currency), 'USD')}
          </p>
        </div>
        <div className="flex-1 glass p-3">
          <p className="text-[10px] text-white/35 uppercase tracking-wide">Доход/мес</p>
          <p className="font-bold mono text-emerald-400 text-[15px] mt-0.5">
            {formatMoney(balanceInUsd(monthIn, account.currency), 'USD')}
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white/50">Карта</h3>
          {!card && (
            <button onClick={() => setShowNewCard(true)} className="text-xs text-white/30">
              + Оформить
            </button>
          )}
        </div>

        {card ? (
          <div className="perspective" style={{ height: 195 }}>
            <div
              className={`card-inner ${flipped ? 'flipped' : ''}`}
              onClick={handleFlip}
              style={{ height: 195 }}
            >
              {/* Front */}
              <div
                className="card-face p-5 flex flex-col justify-between cursor-pointer shadow-2xl"
                style={{ background: designObj.bg, color: designObj.color, height: 195 }}
              >
                <div className="flex justify-between items-start">
                  <span className="text-lg font-black tracking-tight">Luna</span>
                  <span className="text-[10px] opacity-50 uppercase tracking-wider">
                    {card.type}
                  </span>
                </div>
                <div>
                  <p className="text-[17px] mono tracking-[0.2em] opacity-75">
                    •••• •••• •••• {card.number.split(' ')[3]}
                  </p>
                  <div className="flex justify-between mt-2.5">
                    <p className="text-[11px] opacity-50">{card.holder}</p>
                    <p className="text-[10px] opacity-30 animate-pulse">TAP TO FLIP →</p>
                  </div>
                </div>
              </div>

              {/* Back */}
              <div
                className="card-face card-back p-5 flex flex-col justify-center items-center cursor-pointer shadow-2xl"
                style={{ background: designObj.bg, color: designObj.color, height: 195 }}
              >
                {showCardData ? (
                  <div className="w-full space-y-3 text-left">
                    <div>
                      <p className="text-[10px] opacity-40">Номер карты</p>
                      <p className="mono text-[17px] tracking-wider">{card.number}</p>
                    </div>
                    <div className="flex gap-8">
                      <div>
                        <p className="text-[10px] opacity-40">CVV</p>
                        <p className="mono font-bold text-lg">{card.cvv}</p>
                      </div>
                      <div>
                        <p className="text-[10px] opacity-40">Срок</p>
                        <p className="mono">{card.expiry}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] opacity-40">Держатель</p>
                      <p className="text-sm">{card.holder}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <LockIconInline size={40} />
                    <p className="text-sm opacity-50 mt-2">Нажмите для ввода PIN</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewCard(true)}
            className="w-full glass p-10 flex flex-col items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <CreditCardIcon size={32} color="rgba(255,255,255,0.3)" />
            <p className="text-sm text-white/40">Оформить карту</p>
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-5 mt-6">
        <h3 className="text-sm font-bold text-white/50 mb-3">Быстрые действия</h3>
        <div className="grid grid-cols-4 gap-2">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={() => { haptic('light'); go(a.page); }}
              className="glass p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-all"
            >
              <a.Icon size={20} color="rgba(255,255,255,0.5)" />
              <span className="text-[10px] text-white/40">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* PDF Documents */}
      <div className="px-5 mt-6">
        <h3 className="text-sm font-bold text-white/50 mb-3">Dokumenty PDF</h3>
        <div className="space-y-2">
          {[
            {
              icon: '📄',
              label: 'Vypiska po schyotu',
              action: () => generateStatement(user, account, accountTxs),
            },
            {
              icon: '🏦',
              label: 'Rekvizity schyota',
              action: () => generateRequisites(user, account),
            },
            {
              icon: '💰',
              label: 'Spravka ob ostatke',
              action: () => generateBalanceCertificate(user, account),
            },
            {
              icon: '📋',
              label: 'Spravka o dogovore',
              action: () => generateContractCertificate(user, account),
            },
          ].map((doc, i) => (
            <button
              key={i}
              onClick={() => {
                haptic('light');
                doc.action();
              }}
              className="w-full glass p-3.5 flex items-center gap-3 active:scale-[0.98] transition-all"
            >
              <span className="text-xl">{doc.icon}</span>
              <span className="text-sm flex-1 text-left">{doc.label}</span>
              <DownloadIcon size={16} color="rgba(255,255,255,0.25)" />
            </button>
          ))}
        </div>
      </div>

      {/* Account Details */}
      <div className="px-5 mt-6 mb-6">
        <h3 className="text-sm font-bold text-white/50 mb-3">Детали счёта</h3>
        <div className="glass divide-y divide-white/[0.04]">
          {[
            ['Номер', account.account_number],
            ['IBAN', account.iban],
            ['Валюта', account.currency],
            ['Тип', account.type],
            ['Договор', account.contract_signed ? '✅ Подписан' : '—'],
            ['Открыт', new Date(account.created_at).toLocaleDateString('ru-RU')],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between p-3">
              <span className="text-sm text-white/35">{label}</span>
              <span className="text-sm mono text-right max-w-[60%] truncate">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
          <PinPad
            title="PIN для карты"
            subtitle="Просмотр данных"
            onComplete={handleCardPin}
            error={pinError}
            onCancel={() => { setShowPinModal(false); setFlipped(false); }}
          />
        </div>
      )}

      {/* New Card Modal */}
      <Modal open={showNewCard} onClose={() => setShowNewCard(false)} title="Оформить карту">
        <div className="space-y-5">
          {/* Card type */}
          <div>
            <p className="text-xs text-white/35 mb-2 font-medium">Тип карты</p>
            <div className="space-y-2">
              {([
                { type: 'virtual' as CardType, name: 'Виртуальная', price: '$0', desc: 'Мгновенно, Apple Pay' },
                { type: 'premium' as CardType, name: 'Премиум', price: '$4.99', desc: 'Повышенные лимиты' },
                { type: 'plastic' as CardType, name: 'Пластиковая', price: '$19.99', desc: 'Доставка 3-7 дней' },
              ]).map((ct) => (
                <button
                  key={ct.type}
                  onClick={() => setSelectedCardType(ct.type)}
                  className={`
                    w-full rounded-xl p-3 flex items-center gap-3 text-left transition-all
                    ${selectedCardType === ct.type
                      ? 'bg-white/[0.08] ring-1 ring-white/15'
                      : 'bg-white/[0.03]'}
                  `}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{ct.name}</p>
                    <p className="text-[11px] text-white/30">{ct.desc}</p>
                  </div>
                  <span className="text-sm font-bold">{ct.price}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Design */}
          <div>
            <p className="text-xs text-white/35 mb-2 font-medium">Дизайн</p>
            <div className="grid grid-cols-3 gap-2">
              {CARD_DESIGNS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDesign(d.id as CardDesign)}
                  className={`
                    rounded-xl p-3 h-16 transition-all
                    ${selectedDesign === d.id ? 'ring-2 ring-white shadow-lg' : ''}
                  `}
                  style={{ background: d.bg }}
                >
                  <p className="text-[11px] font-semibold" style={{ color: d.color }}>
                    {d.name}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={orderCard} className="btn-primary w-full">
            Оформить
          </button>
        </div>
      </Modal>
    </div>
  );
}

// Inline lock icon
function LockIconInline({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto opacity-40">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
