import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { formatMoney, balanceInUsd, getCommission, haptic } from '../lib/utils';
import { SUBSCRIPTION_PLANS } from '../lib/constants';
import {
  dbSearchUsers,
  dbGetUserAccounts,
  dbCreateTransaction,
  dbUpdateBalance,
  dbCreateNotification,
} from '../lib/db';

type Step = 'search' | 'amount' | 'confirm' | 'success';

interface Recipient {
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  luna_id: string;
}

export default function TransferScreen() {
  const { user, accounts, go, addTx, updateBalance, addNotif } = useStore();

  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
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

  // ===== Search users in Supabase =====
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
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
  }, [searchQuery, user.telegram_id]);

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
      message: `◎${parsedAmount} → @${recipient.username}`,
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
      const recipientLncAcc = recipientAccounts.find(
        (a: any) => a.currency === fromAccount.currency
      );
      if (recipientLncAcc) {
        await dbUpdateBalance(recipientLncAcc.id, parsedAmount);
      }
    } catch {}

    setStep('success');
  };

  const quickAmounts = [50, 100, 500, 1000, 5000];

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button
          onClick={() =>
            step === 'search' ? go('home') : setStep('search')
          }
          className="text-white/50 text-sm"
        >
          ← Назад
        </button>
        <h1 className="font-bold flex-1">📤 Перевод</h1>
      </div>

      {/* ===== SEARCH ===== */}
      {step === 'search' && (
        <div className="flex-1 px-5 mt-4 animate-fade-in overflow-y-auto pb-8">
          {/* Search input */}
          <div className="glass flex items-center px-4 gap-3">
            <span className="text-white/30">🔍</span>
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

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((r) => (
                <button
                  key={r.telegram_id}
                  onClick={() => selectRecipient(r)}
                  className="
                    w-full glass-accent p-4 flex items-center gap-4
                    active:scale-[0.98] transition-all
                  "
                >
                  {r.photo_url ? (
                    <img
                      src={r.photo_url}
                      alt=""
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl font-bold">
                      {r.first_name[0]}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-bold">
                      {r.first_name} {r.last_name}
                    </p>
                    <p className="text-xs text-white/35">
                      @{r.username} · {r.luna_id}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {searchQuery.length >= 2 &&
            searchResults.length === 0 &&
            !searching && (
              <div className="text-center py-10">
                <p className="text-white/30 text-sm">
                  Пользователь не найден
                </p>
                <p className="text-white/20 text-xs mt-1">
                  Попробуйте другой @username или Luna ID
                </p>
              </div>
            )}

          {/* Hint */}
          {searchQuery.length < 2 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-white/30 text-sm">
                Введите @username или Luna ID получателя
              </p>
              <p className="text-white/20 text-xs mt-1">
                Минимум 2 символа для поиска
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===== AMOUNT ===== */}
      {step === 'amount' && recipient && (
        <div className="flex-1 px-5 mt-4 overflow-y-auto animate-fade-in pb-8">
          {/* Recipient card */}
          <div className="glass p-3 flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
              {recipient.first_name[0]}
            </div>
            <div>
              <p className="font-medium text-sm">
                {recipient.first_name} {recipient.last_name}
              </p>
              <p className="text-[11px] text-white/30">
                @{recipient.username}
              </p>
            </div>
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
                    )}
                  </p>
                </div>
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
            className="
              w-full glass px-4 py-4 bg-transparent text-white
              text-3xl font-extrabold mono outline-none text-center mb-3
            "
          />

          {/* Quick amounts */}
          <div className="flex flex-wrap gap-2 mb-5">
            {quickAmounts.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className="glass rounded-lg px-3 py-1.5 text-xs mono active:scale-95 transition-transform"
              >
                ◎{a}
              </button>
            ))}
          </div>

          {/* Note */}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Сообщение (необязательно)"
            className="w-full glass px-4 py-3 bg-transparent text-white text-sm outline-none mb-4"
          />

          {/* Commission info */}
          {parsedAmount > 0 && (
            <div className="glass p-3 mb-5 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-white/35">
                  Комиссия (
                  {
                    SUBSCRIPTION_PLANS.find((p) => p.id === user.subscription)
                      ?.commission
                  }
                  %)
                </span>
                <span className="mono">{formatMoney(commission, 'USD')}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-white/5">
                <span>Итого</span>
                <span className="mono">{formatMoney(total, 'USD')}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              haptic('medium');
              setStep('confirm');
            }}
            disabled={!canTransfer}
            className="btn-primary w-full"
          >
            Продолжить
          </button>
        </div>
      )}

      {/* ===== CONFIRM ===== */}
      {step === 'confirm' && recipient && (
        <div className="flex-1 px-5 mt-4 animate-fade-in">
          <div className="glass p-5 space-y-3 mb-6">
            <h3 className="text-center font-bold text-lg mb-2">
              Подтверждение перевода
            </h3>

            {[
              ['Отправитель', `${user.first_name} ${user.last_name}`],
              ['Получатель', `${recipient.first_name} ${recipient.last_name}`],
              ['Username', `@${recipient.username}`],
              ['Со счёта', fromAccount?.name || ''],
              ['Сумма', `◎${parsedAmount}`],
              ['Комиссия', `◎${commission}`],
              ...(note ? [['Сообщение', note]] : []),
              ['Итого', `◎${total}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="
                  flex justify-between py-1.5
                  border-b border-white/[0.04]
                  last:border-0 last:font-bold
                "
              >
                <span className="text-white/35 text-sm">{label}</span>
                <span className="text-sm mono">{value}</span>
              </div>
            ))}
          </div>

          <button onClick={executeTransfer} className="btn-primary w-full">
            Подтвердить перевод
          </button>
          <button
            onClick={() => setStep('amount')}
            className="btn-ghost w-full mt-2"
          >
            Изменить
          </button>
        </div>
      )}

      {/* ===== SUCCESS ===== */}
      {step === 'success' && recipient && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-fade-in">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center animate-check-pop">
              <span className="text-5xl">✅</span>
            </div>
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-emerald-500/10 animate-pulse-ring" />
          </div>

          <h2 className="text-2xl font-extrabold mb-2">Перевод выполнен!</h2>
          <p className="text-white/40 text-sm mb-2">
            ◎{parsedAmount} → @{recipient.username}
          </p>
          <p className="text-xs text-white/20 mono mb-8">TX: {txId}</p>

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
            }}
            className="btn-ghost w-full max-w-sm mt-2"
          >
            Ещё перевод
          </button>
        </div>
      )}
    </div>
  );
}
