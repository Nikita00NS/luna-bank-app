import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { formatMoney, balanceInUsd, getCommission, haptic } from '../lib/utils';
import { SUBSCRIPTION_PLANS } from '../lib/constants';
import {
  dbSearchUsers,
  dbSearchByPhone,
  dbGetUserAccounts,
  dbCreateTransaction,
  dbUpdateBalance,
  dbCreateNotification,
} from '../lib/db';
import { ArrowLeftIcon, SearchIcon, PhoneIcon, GlobeIcon, UserIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import LncIcon from '../components/LncIcon';
import { requestContact, formatPhone, normalizePhone, showAlert } from '../lib/telegram';
import { notifyTransferReceived, notifyTransferSent } from '../lib/bot';

type Step = 'search' | 'amount' | 'confirm' | 'success';
type SearchTab = 'username' | 'phone' | 'ton';

interface Recipient {
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  luna_id: string;
  phone_number?: string;
}

export default function TransferScreen() {
  const { user, accounts, go, addTx, updateBalance, addNotif } = useStore();

  const [step, setStep] = useState<Step>('search');
  const [searchTab, setSearchTab] = useState<SearchTab>('username');
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [tonQuery, setTonQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Recipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [txId, setTxId] = useState('');

  if (!user) return null;

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const parsedAmount = parseFloat(amount) || 0;
  const commission = fromAccount
    ? getCommission(user.subscription, parsedAmount)
    : 0;
  const total = parsedAmount + commission;

  const canTransfer =
    fromAccount && parsedAmount > 0 && fromAccount.balance >= total;

  // ===== Search by username/Luna ID =====
  useEffect(() => {
    if (searchTab !== 'username' || searchQuery.length < 2) {
      if (searchTab === 'username') setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await dbSearchUsers(searchQuery, user.telegram_id);
        setSearchResults(results as Recipient[]);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user.telegram_id, searchTab]);

  // ===== Search by phone =====
  useEffect(() => {
    if (searchTab !== 'phone' || phoneQuery.length < 4) {
      if (searchTab === 'phone') setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await dbSearchByPhone(phoneQuery, user.telegram_id);
        setSearchResults(results as Recipient[]);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [phoneQuery, user.telegram_id, searchTab]);

  // ===== Clear results on tab change =====
  useEffect(() => {
    setSearchResults([]);
    setSearchQuery('');
    setPhoneQuery('');
    setTonQuery('');
  }, [searchTab]);

  // ===== Request contact from Telegram =====
  const handleRequestContact = async () => {
    haptic('medium');
    const contact = await requestContact();
    if (contact) {
      const normalized = normalizePhone(contact.phone_number);
      setPhoneQuery(normalized);
      haptic('success');
    } else {
      await showAlert('Контакт не был предоставлен');
    }
  };

  // ===== Select recipient =====
  const selectRecipient = (r: Recipient) => {
    haptic('medium');
    setRecipient(r);
    setStep('amount');
  };

  // ===== Execute transfer =====
  const executeTransfer = async () => {
    if (!canTransfer || !recipient || !fromAccount) return;
    haptic('success');

    const id = uid();
    setTxId(id);

    // Local update
    updateBalance(fromAccountId, -total);

    const txData = {
      id,
      from_user_id: user.telegram_id,
      to_user_id: recipient.telegram_id,
      from_account_id: fromAccountId,
      to_account_id: 'recipient',
      amount: parsedAmount,
      fee: commission,
      currency: fromAccount.currency,
      type: 'transfer' as const,
      status: 'completed' as const,
      note: note || undefined,
      created_at: new Date().toISOString(),
    };

    addTx(txData);

    // Notification
    const notifData = {
      id: uid(),
      title: '✅ Перевод выполнен',
      message: `🌙${parsedAmount} → @${recipient.username}`,
      type: 'transfer' as const,
      read: false,
      created_at: new Date().toISOString(),
    };
    addNotif(notifData);

    // Save to Supabase (async)
    dbUpdateBalance(fromAccountId, -total).catch(() => {});
    dbCreateTransaction(txData).catch(() => {});
    dbCreateNotification({
      user_id: user.telegram_id,
      title: notifData.title,
      message: notifData.message,
      type: notifData.type,
    }).catch(() => {});

    // Try to credit recipient's account
    try {
      const recipientAccounts = await dbGetUserAccounts(recipient.telegram_id);
      const recipientAcc = recipientAccounts.find(
        (a: any) => a.currency === fromAccount.currency
      );
      if (recipientAcc) {
        await dbUpdateBalance(recipientAcc.id, parsedAmount);
      }
    } catch {}

    // Send Telegram bot notifications (async, don't block)
    notifyTransferReceived(
      recipient.telegram_id,
      parsedAmount,
      fromAccount.currency,
      `${user.first_name} ${user.last_name}`,
      note || undefined
    ).catch(() => {});

    notifyTransferSent(
      user.telegram_id,
      parsedAmount,
      fromAccount.currency,
      `${recipient.first_name} ${recipient.last_name}`
    ).catch(() => {});

    setStep('success');
  };

  const quickAmounts = [50, 100, 500, 1000, 5000];

  const tabs: { id: SearchTab; icon: React.ComponentType<any>; label: string }[] = [
    { id: 'username', icon: UserIcon, label: 'Имя / ID' },
    { id: 'phone', icon: PhoneIcon, label: 'Телефон' },
    { id: 'ton', icon: GlobeIcon, label: 'TON' },
  ];

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button
          onClick={() => step === 'search' ? go('home') : setStep('search')}
          className="text-white/50"
        >
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">Перевод</h1>
      </div>

      {/* ===== SEARCH ===== */}
      {step === 'search' && (
        <div className="flex-1 px-5 mt-2 animate-fade-in overflow-y-auto pb-8">
          {/* Tabs */}
          <div className="flex gap-1.5 mb-4 p-1 glass rounded-2xl">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = searchTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSearchTab(t.id); haptic('light'); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-white text-black shadow-lg'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  <Icon size={14} color={active ? '#000' : 'rgba(255,255,255,0.4)'} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* USERNAME / LUNA ID TAB */}
          {searchTab === 'username' && (
            <>
              <div className="glass flex items-center px-4 gap-3 rounded-2xl">
                <SearchIcon size={16} color="rgba(255,255,255,0.3)" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="@username или Luna ID"
                  className="flex-1 bg-transparent py-3.5 text-white outline-none text-sm"
                  autoFocus
                />
                {searching && (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                )}
              </div>

              {searchQuery.length < 2 && (
                <div className="text-center py-14">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                    <UserIcon size={28} color="rgba(255,255,255,0.15)" />
                  </div>
                  <p className="text-white/30 text-sm">
                    Введите @username или Luna ID
                  </p>
                  <p className="text-white/15 text-xs mt-1">
                    Минимум 2 символа
                  </p>
                </div>
              )}
            </>
          )}

          {/* PHONE TAB */}
          {searchTab === 'phone' && (
            <>
              <div className="glass flex items-center px-4 gap-3 rounded-2xl">
                <PhoneIcon size={16} color="rgba(255,255,255,0.3)" />
                <input
                  type="tel"
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                  className="flex-1 bg-transparent py-3.5 text-white outline-none text-sm mono"
                  autoFocus
                />
                {searching && (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                )}
              </div>

              {/* Request Contact button */}
              <button
                onClick={handleRequestContact}
                className="w-full mt-3 glass-accent flex items-center justify-center gap-2.5 py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <PhoneIcon size={16} color="#3b82f6" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Поделиться контактом</p>
                  <p className="text-[10px] text-white/30">Telegram запросит разрешение</p>
                </div>
              </button>

              {phoneQuery.length < 4 && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                    <PhoneIcon size={28} color="rgba(255,255,255,0.15)" />
                  </div>
                  <p className="text-white/30 text-sm">
                    Введите номер телефона
                  </p>
                  <p className="text-white/15 text-xs mt-1">
                    Или нажмите «Поделиться контактом»
                  </p>
                </div>
              )}
            </>
          )}

          {/* TON ADDRESS TAB */}
          {searchTab === 'ton' && (
            <>
              <div className="glass flex items-center px-4 gap-3 rounded-2xl">
                <span className="text-lg">💎</span>
                <input
                  type="text"
                  value={tonQuery}
                  onChange={(e) => setTonQuery(e.target.value)}
                  placeholder="UQ... или EQ... (TON адрес)"
                  className="flex-1 bg-transparent py-3.5 text-white outline-none text-xs mono"
                  autoFocus
                />
              </div>

              {tonQuery.length > 0 && (tonQuery.startsWith('UQ') || tonQuery.startsWith('EQ') || tonQuery.startsWith('0:')) && tonQuery.length >= 48 && (
                <div className="mt-4">
                  <div className="glass-accent p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg">
                        💎
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">TON Кошелёк</p>
                        <p className="text-[10px] text-white/25 mono truncate">{tonQuery}</p>
                      </div>
                    </div>
                    <div className="glass p-3 rounded-xl mb-3">
                      <p className="text-[10px] text-white/40 mb-1">⚠️ Внимание</p>
                      <p className="text-[11px] text-white/50">
                        Перевод на TON-адрес требует подключённый кошелёк и реальные TON. 
                        Функция в разработке.
                      </p>
                    </div>
                    <button
                      disabled
                      className="btn-primary w-full opacity-50"
                    >
                      Скоро доступно
                    </button>
                  </div>
                </div>
              )}

              {tonQuery.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                    <GlobeIcon size={28} color="rgba(255,255,255,0.15)" />
                  </div>
                  <p className="text-white/30 text-sm">
                    Введите TON-адрес получателя
                  </p>
                  <p className="text-white/15 text-xs mt-1">
                    Формат UQ... или EQ...
                  </p>
                </div>
              )}
            </>
          )}

          {/* Search results (shared for username & phone tabs) */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((r, i) => (
                <button
                  key={r.telegram_id}
                  onClick={() => selectRecipient(r)}
                  className="w-full glass-accent p-4 flex items-center gap-4 active:scale-[0.98] transition-all rounded-2xl animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {r.photo_url ? (
                    <img
                      src={r.photo_url}
                      alt=""
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl font-bold">
                      {r.first_name?.[0] || '?'}
                    </div>
                  )}
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-bold truncate">
                      {r.first_name} {r.last_name}
                    </p>
                    <p className="text-xs text-white/35">
                      @{r.username} · {r.luna_id}
                    </p>
                    {searchTab === 'phone' && r.phone_number && (
                      <p className="text-[10px] text-white/20 mono mt-0.5">
                        📱 {formatPhone(r.phone_number)}
                      </p>
                    )}
                  </div>
                  <div className="text-white/15">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {(
            (searchTab === 'username' && searchQuery.length >= 2) ||
            (searchTab === 'phone' && phoneQuery.length >= 4)
          ) && searchResults.length === 0 && !searching && (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-white/30 text-sm">
                Пользователь не найден
              </p>
              <p className="text-white/20 text-xs mt-1">
                {searchTab === 'phone'
                  ? 'Номер не привязан к аккаунту Luna Bank'
                  : 'Попробуйте другой @username или Luna ID'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===== AMOUNT ===== */}
      {step === 'amount' && recipient && (
        <div className="flex-1 px-5 mt-4 overflow-y-auto animate-fade-in pb-8">
          {/* Recipient card */}
          <div className="glass p-4 flex items-center gap-3 mb-5 rounded-2xl">
            {recipient.photo_url ? (
              <img src={recipient.photo_url} alt="" className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg font-bold">
                {recipient.first_name?.[0] || '?'}
              </div>
            )}
            <div className="flex-1">
              <p className="font-bold">
                {recipient.first_name} {recipient.last_name}
              </p>
              <p className="text-xs text-white/30">
                @{recipient.username}
              </p>
            </div>
            <button
              onClick={() => { setStep('search'); setRecipient(null); }}
              className="text-[11px] text-white/25 underline"
            >
              Изменить
            </button>
          </div>

          {/* From account */}
          <p className="text-xs text-white/35 mb-2 font-medium">Со счёта</p>
          <div className="space-y-1.5 mb-5">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setFromAccountId(acc.id)}
                className={`
                  w-full rounded-xl p-3 flex items-center gap-3 transition-all
                  ${
                    fromAccountId === acc.id
                      ? 'bg-white/[0.08] ring-1 ring-white/15'
                      : 'bg-white/[0.03]'
                  }
                `}
              >
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{acc.name}</p>
                  <p className="text-[11px] text-white/30">
                    {formatMoney(
                      balanceInUsd(acc.balance, acc.currency),
                      'USD'
                    )}{' '}
                    · 🌙{acc.balance.toFixed(2)}
                  </p>
                </div>
                {fromAccountId === acc.id && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Amount input */}
          <p className="text-xs text-white/35 mb-2 font-medium">Сумма</p>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full glass px-4 py-4 bg-transparent text-white text-3xl font-extrabold mono outline-none text-center mb-3 rounded-2xl"
            autoFocus
          />

          {/* Quick amounts */}
          <div className="flex flex-wrap gap-2 mb-5">
            {quickAmounts.map((a) => (
              <button
                key={a}
                onClick={() => { setAmount(String(a)); haptic('light'); }}
                className={`glass rounded-lg px-3 py-1.5 text-xs mono active:scale-95 transition-transform ${
                  amount === String(a) ? 'ring-1 ring-white/20 bg-white/[0.06]' : ''
                }`}
              >
                <LncIcon size={12} />{a}
              </button>
            ))}
          </div>

          {/* Note */}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="💬 Сообщение (необязательно)"
            className="w-full glass px-4 py-3 bg-transparent text-white text-sm outline-none mb-4 rounded-xl"
          />

          {/* Commission info */}
          {parsedAmount > 0 && (
            <div className="glass p-4 mb-5 space-y-2 rounded-2xl">
              <div className="flex justify-between text-sm">
                <span className="text-white/35">Сумма</span>
                <span className="mono">🌙{parsedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/35">
                  Комиссия (
                  {SUBSCRIPTION_PLANS.find((p) => p.id === user.subscription)?.commission}%)
                </span>
                <span className="mono text-white/50">🌙{commission.toFixed(2)}</span>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between text-sm font-bold">
                <span>Итого к списанию</span>
                <span className="mono">🌙{total.toFixed(2)}</span>
              </div>
              {fromAccount && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/20">Остаток после перевода</span>
                  <span className="mono text-white/25">
                    🌙{Math.max(0, fromAccount.balance - total).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => { haptic('medium'); setStep('confirm'); }}
            disabled={!canTransfer}
            className="btn-primary w-full"
          >
            Продолжить →
          </button>
        </div>
      )}

      {/* ===== CONFIRM ===== */}
      {step === 'confirm' && recipient && fromAccount && (
        <div className="flex-1 px-5 mt-4 animate-fade-in overflow-y-auto pb-8">
          <div className="glass p-5 space-y-3 mb-6 rounded-2xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                {recipient.first_name?.[0] || '?'}
              </div>
              <h3 className="font-bold text-lg">Подтверждение перевода</h3>
            </div>

            {[
              ['👤 Получатель', `${recipient.first_name} ${recipient.last_name}`],
              ['📎 Username', `@${recipient.username}`],
              ['💳 Со счёта', fromAccount.name],
              ['💰 Сумма', `🌙${parsedAmount.toFixed(2)}`],
              ['📊 Комиссия', `🌙${commission.toFixed(2)}`],
              ...(note ? [['💬 Сообщение', note]] : []),
              ['📋 Итого', `🌙${total.toFixed(2)}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between py-2 border-b border-white/[0.04] last:border-0 last:font-bold"
              >
                <span className="text-white/35 text-sm">{label}</span>
                <span className="text-sm mono text-right max-w-[55%] truncate">{value}</span>
              </div>
            ))}
          </div>

          <button onClick={executeTransfer} className="btn-primary w-full">
            ✅ Подтвердить перевод
          </button>
          <button
            onClick={() => setStep('amount')}
            className="btn-ghost w-full mt-2"
          >
            ← Изменить
          </button>
        </div>
      )}

      {/* ===== SUCCESS ===== */}
      {step === 'success' && recipient && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-fade-in">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <AnimatedEmoji type="success" size={72} loop={false} />
            </div>
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-emerald-500/10 animate-pulse-ring" />
          </div>

          <h2 className="text-2xl font-extrabold mb-2">Перевод выполнен!</h2>
          <p className="text-white/40 text-sm mb-1">
            🌙{parsedAmount.toFixed(2)} → @{recipient.username}
          </p>
          <p className="text-white/25 text-xs mb-1">
            {recipient.first_name} {recipient.last_name}
          </p>
          <p className="text-[10px] text-white/15 mono mb-8">TX: {txId}</p>

          <button onClick={() => go('home')} className="btn-primary w-full max-w-sm">
            На главную
          </button>
          <button
            onClick={() => {
              setStep('search');
              setRecipient(null);
              setAmount('');
              setNote('');
              setSearchQuery('');
              setPhoneQuery('');
              setTonQuery('');
              setSearchResults([]);
            }}
            className="btn-ghost w-full max-w-sm mt-2"
          >
            📤 Ещё перевод
          </button>
        </div>
      )}
    </div>
  );
}
