import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { formatMoney, balanceInUsd, haptic, shortAddr } from '../lib/utils';
import { CRYPTO_PRICES, PROJECT_WALLET } from '../lib/constants';
import { dbUpdateBalance, dbCreateTransaction, dbCreateNotification } from '../lib/db';
import { ArrowLeftIcon, DownloadIcon } from '../components/Icons';
import Logo from '../components/Logo';

type Step = 'select' | 'crypto' | 'waiting' | 'receive' | 'success';

export default function DepositScreen() {
  const { user, accounts, tonWallet, go, updateBalance, addTx, addNotif } = useStore();

  const [step, setStep] = useState<Step>('select');
  const [selectedAccId, setSelectedAccId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState('');

  if (!user) return null;

  const account = accounts.find((a) => a.id === selectedAccId);
  const val = parseFloat(amount) || 0;
  const tonPrice = CRYPTO_PRICES.TON;
  const tonAmount = val / tonPrice;

  const quickAmounts = [50, 100, 500, 1000, 5000];

  // ===== Simulate payment =====
  const handlePay = () => {
    if (!account) return;
    haptic('medium');
    setStep('waiting');

    setTimeout(() => {
      haptic('success');

      // Update balance
      updateBalance(selectedAccId, val);
      dbUpdateBalance(selectedAccId, val).catch(() => {});

      // Create transaction
      const txData = {
        id: uid(),
        from_user_id: 0,
        to_user_id: user.telegram_id,
        from_account_id: 'external',
        to_account_id: selectedAccId,
        amount: val,
        fee: 0,
        currency: account.currency,
        type: 'deposit' as const,
        status: 'completed' as const,
        note: 'Пополнение через TON',
        created_at: new Date().toISOString(),
      };
      addTx(txData);
      dbCreateTransaction(txData).catch(() => {});

      // Notification
      addNotif({
        id: uid(),
        title: '📥 Пополнение',
        message: `◎${val} зачислено на ${account.name}`,
        type: 'deposit',
        read: false,
        created_at: new Date().toISOString(),
      });

      setStep('success');
    }, 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    haptic('light');
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button
          onClick={() => (step === 'select' ? go('home') : setStep('select'))}
          className="text-white/50"
        >
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">Пополнение</h1>
      </div>

      {/* ===== SELECT ===== */}
      {step === 'select' && (
        <div className="flex-1 px-5 mt-4 overflow-y-auto animate-fade-in pb-8">
          {/* Account selection */}
          <p className="text-xs text-white/35 mb-2 font-medium">Счёт для пополнения</p>
          <div className="space-y-1.5 mb-5">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccId(acc.id)}
                className={`
                  w-full rounded-xl p-3 flex items-center gap-3 transition-all
                  ${selectedAccId === acc.id
                    ? 'bg-white/[0.08] ring-1 ring-white/15'
                    : 'bg-white/[0.03]'}
                `}
              >
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{acc.name}</p>
                  <p className="text-[11px] text-white/30">
                    {formatMoney(balanceInUsd(acc.balance, acc.currency), 'USD')}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-white/35 mb-4">Сначала откройте счёт</p>
              <button onClick={() => go('open-account')} className="btn-primary px-8">
                Открыть
              </button>
            </div>
          ) : (
            <>
              {/* Amount */}
              <p className="text-xs text-white/35 mb-2 font-medium">Сумма (LNC)</p>
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
              <div className="flex flex-wrap gap-2 mb-6">
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

              {/* Methods */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (!val) { haptic('error'); return; }
                    haptic('medium');
                    setStep('crypto');
                  }}
                  disabled={!val}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <DiamondIconInline /> Купить за крипту
                </button>
                <button
                  onClick={() => {
                    haptic('light');
                    setStep('receive');
                  }}
                  className="btn-secondary w-full"
                >
                  Получить перевод
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== CRYPTO CONFIRM ===== */}
      {step === 'crypto' && (
        <div className="flex-1 px-5 mt-4 animate-fade-in">
          <div className="glass p-5 space-y-3">
            <h3 className="text-center font-bold text-lg mb-2">Оплата</h3>
            {[
              ['Сумма', `◎${val}`],
              ['Курс TON', `$${tonPrice}`],
              ['К оплате', `💎 ${tonAmount.toFixed(4)} TON`],
              ['Кошелёк', tonWallet ? shortAddr(tonWallet) : 'Не подключён'],
              ['Зачисление', account?.name || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-white/35 text-sm">{label}</span>
                <span className="text-sm mono">{value}</span>
              </div>
            ))}
          </div>

          {!tonWallet && (
            <div className="glass p-4 mt-4 flex items-center gap-3 border border-amber-500/20">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-400">Подключите кошелёк</p>
              </div>
              <button onClick={() => go('ton-connect')} className="text-xs bg-white/[0.08] px-3 py-1.5 rounded-lg">
                →
              </button>
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={!tonWallet}
            className="btn-primary w-full mt-6"
          >
            Оплатить 💎 {tonAmount.toFixed(4)} TON
          </button>
        </div>
      )}

      {/* ===== WAITING ===== */}
      {step === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mb-6" />
          <h3 className="text-lg font-bold mb-2">Ожидание платежа...</h3>
          <p className="text-sm text-white/35 text-center">
            Подтвердите транзакцию в вашем кошельке
          </p>
        </div>
      )}

      {/* ===== RECEIVE ===== */}
      {step === 'receive' && (
        <div className="flex-1 px-5 mt-4 animate-fade-in overflow-y-auto pb-8">
          <div className="glass p-6 flex flex-col items-center">
            <div className="w-48 h-48 bg-white rounded-2xl p-4 mb-4 flex items-center justify-center">
              <div className="text-center">
                <Logo size={48} className="mx-auto mb-2" />
                <p className="text-black font-bold">Luna Bank</p>
                <p className="text-black/40 text-xs font-mono mt-1">{user.luna_id}</p>
              </div>
            </div>
            <p className="text-sm text-white/35">QR для отправителя</p>
          </div>

          <div className="glass p-4 mt-4 space-y-2">
            <h3 className="font-bold text-sm mb-2">Реквизиты</h3>
            {[
              ['IBAN', account?.iban || '—'],
              ['SWIFT', 'LUNABKXX'],
              ['Luna ID', user.luna_id],
              ['Username', `@${user.username}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-xs text-white/30">{label}</span>
                <button
                  onClick={() => copyToClipboard(value)}
                  className="text-xs mono flex items-center gap-1"
                >
                  {value} 📋
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== SUCCESS ===== */}
      {step === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center animate-check-pop mb-6">
            <DownloadIcon size={32} color="#34d399" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2">Зачислено!</h2>
          <p className="text-white/35 text-sm mb-8">
            ◎{val} → {account?.name}
          </p>
          <button onClick={() => go('home')} className="btn-primary w-full max-w-sm">
            На главную
          </button>
        </div>
      )}
    </div>
  );
}

// Inline diamond icon to avoid circular dependency
function DiamondIconInline() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9z" />
    </svg>
  );
}
