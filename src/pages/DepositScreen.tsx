import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { formatMoney, balanceInUsd, haptic, shortAddr } from '../lib/utils';
import { CRYPTO_PRICES, PROJECT_WALLET } from '../lib/constants';
import { dbUpdateBalance, dbCreateTransaction, dbCreateNotification } from '../lib/db';
import { ArrowLeftIcon, DownloadIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import LncIcon from '../components/LncIcon';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { buildTonTransferTx, toNano } from '../lib/ton';
import { notifyCustom } from '../lib/bot';
import Logo from '../components/Logo';

type Step = 'select' | 'confirm' | 'waiting' | 'receive' | 'success' | 'error';

export default function DepositScreen() {
  const { user, accounts, tonWallet, go, updateBalance, addTx, addNotif } = useStore();
  const [tonConnectUI] = useTonConnectUI();

  const [step, setStep] = useState<Step>('select');
  const [selectedAccId, setSelectedAccId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!user) return null;

  const account = accounts.find((a) => a.id === selectedAccId);
  const val = parseFloat(amount) || 0;
  const lncRate = CRYPTO_PRICES.LNC; // $0.05
  const tonPrice = CRYPTO_PRICES.TON; // $6.85
  const lncValueUsd = val * lncRate; // LNC → USD
  const tonAmount = lncValueUsd / tonPrice; // USD → TON

  const quickAmounts = [100, 500, 1000, 5000, 10000];

  // ===== REAL payment through TON Connect =====
  const handlePay = async () => {
    if (!account || !tonWallet) return;
    haptic('medium');
    setStep('waiting');

    try {
      // Build real transaction to project wallet
      const tx = buildTonTransferTx(
        PROJECT_WALLET,
        tonAmount,
        `Luna Bank Deposit: ${val} LNC for user ${user.telegram_id}`
      );

      // Opens wallet app for real confirmation
      const result = await tonConnectUI.sendTransaction(tx);

      haptic('success');

      // Credit LNC to user account
      updateBalance(selectedAccId, val);
      dbUpdateBalance(selectedAccId, val).catch(() => {});

      // Create transaction record
      const txData = {
        id: uid(),
        from_user_id: 0,
        to_user_id: user.telegram_id,
        from_account_id: 'ton_deposit',
        to_account_id: selectedAccId,
        amount: val,
        fee: 0,
        currency: account.currency,
        type: 'deposit' as const,
        status: 'completed' as const,
        note: `Депозит: ${tonAmount.toFixed(4)} TON → 🌙{val} LNC`,
        created_at: new Date().toISOString(),
      };
      addTx(txData);
      dbCreateTransaction(txData).catch(() => {});

      // Notification
      addNotif({
        id: uid(),
        title: '📥 Депозит зачислен',
        message: `🌙${val} LNC → ${account.name}`,
        type: 'deposit',
        read: false,
        created_at: new Date().toISOString(),
      });

      // Bot notification
      notifyCustom(user.telegram_id, `📥 *Депозит зачислен*\n🌙{val} LNC → ${account.name}\n💎 Оплачено: ${tonAmount.toFixed(4)} TON`).catch(() => {});

      setStep('success');
    } catch (err: any) {
      haptic('error');
      setErrorMsg(err?.message || 'Транзакция отклонена');
      setStep('error');
    }
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
                className={`w-full rounded-xl p-3 flex items-center gap-3 transition-all ${
                  selectedAccId === acc.id
                    ? 'bg-white/[0.08] ring-1 ring-white/15'
                    : 'bg-white/[0.03]'
                }`}
              >
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{acc.name}</p>
                  <p className="text-[11px] text-white/30">
                    🌙{acc.balance.toFixed(2)} {acc.currency} · {formatMoney(balanceInUsd(acc.balance, acc.currency), 'USD')}
                  </p>
                </div>
                {selectedAccId === acc.id && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-white/35 mb-4">Сначала откройте счёт</p>
              <button onClick={() => go('open-account')} className="btn-primary px-8">Открыть</button>
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
                className="w-full glass px-4 py-4 bg-transparent text-white text-3xl font-extrabold mono outline-none text-center mb-3 rounded-2xl"
              />
              <div className="flex flex-wrap gap-2 mb-5">
                {quickAmounts.map((a) => (
                  <button key={a} onClick={() => setAmount(String(a))}
                    className={`glass rounded-lg px-3 py-1.5 text-xs mono active:scale-95 transition-transform ${amount === String(a) ? 'ring-1 ring-white/20' : ''}`}>
                    🌙{a}
                  </button>
                ))}
              </div>

              {/* Conversion preview */}
              {val > 0 && (
                <div className="glass p-4 mb-5 space-y-2 rounded-2xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/35">Получите</span>
                    <span className="mono font-bold">🌙{val.toFixed(2)} LNC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/35">Стоимость</span>
                    <span className="mono">${lncValueUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/35">Курс</span>
                    <span className="mono text-white/50">1 LNC = ${lncRate}</span>
                  </div>
                  <div className="h-px bg-white/[0.06]" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>💎 К оплате</span>
                    <span className="mono">{tonAmount.toFixed(4)} TON</span>
                  </div>
                </div>
              )}

              {/* Methods */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (!val) { haptic('error'); return; }
                    haptic('medium');
                    setStep('confirm');
                  }}
                  disabled={!val || !tonWallet}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  💎 Купить за TON
                </button>

                {!tonWallet && (
                  <button onClick={() => go('ton-connect')} className="btn-secondary w-full">
                    🔗 Подключить кошелёк
                  </button>
                )}

                <button onClick={() => { haptic('light'); setStep('receive'); }}
                  className="btn-ghost w-full">
                  📥 Получить перевод
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== CONFIRM ===== */}
      {step === 'confirm' && (
        <div className="flex-1 px-5 mt-4 animate-fade-in overflow-y-auto pb-8">
          <div className="glass p-5 space-y-3 rounded-2xl mb-6">
            <div className="text-center mb-3">
              <AnimatedEmoji type="coin" size={48} />
              <h3 className="font-bold text-lg mt-2">Подтверждение депозита</h3>
            </div>

            {[
              ['🌙 Получите', `🌙${val.toFixed(2)} LNC`],
              ['💰 Стоимость', `$${lncValueUsd.toFixed(2)}`],
              ['💎 К оплате', `${tonAmount.toFixed(4)} TON`],
              ['📍 Кошелёк', tonWallet ? shortAddr(tonWallet) : '—'],
              ['📥 Счёт', account?.name || '—'],
              ['🏦 Куда', shortAddr(PROJECT_WALLET)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0 last:font-bold">
                <span className="text-white/35 text-sm">{label}</span>
                <span className="text-sm mono">{value}</span>
              </div>
            ))}
          </div>

          <div className="glass p-3 rounded-xl mb-4">
            <p className="text-[10px] text-yellow-400/60">
              ⚠️ Кошелёк откроется для подтверждения. TON будет отправлен на кошелёк Luna Bank.
            </p>
          </div>

          <button onClick={handlePay} className="btn-primary w-full">
            ✅ Подтвердить оплату {tonAmount.toFixed(4)} TON
          </button>
          <button onClick={() => setStep('select')} className="btn-ghost w-full mt-2">
            ← Назад
          </button>
        </div>
      )}

      {/* ===== WAITING ===== */}
      {step === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <AnimatedEmoji type="loading" size={48} />
          <h3 className="text-lg font-bold mt-4 mb-2">Ожидание оплаты...</h3>
          <p className="text-sm text-white/35 text-center">
            Подтвердите транзакцию в вашем кошельке
          </p>
        </div>
      )}

      {/* ===== RECEIVE ===== */}
      {step === 'receive' && (
        <div className="flex-1 px-5 mt-4 animate-fade-in overflow-y-auto pb-8">
          <div className="glass p-6 flex flex-col items-center rounded-2xl">
            <AnimatedEmoji type="wallet" size={48} className="mb-3" />
            <p className="font-bold text-lg mb-1">Реквизиты для перевода</p>
            <p className="text-xs text-white/30">Отправьте эти данные отправителю</p>
          </div>

          <div className="glass p-4 mt-4 space-y-3 rounded-2xl">
            {[
              ['Luna ID', user.luna_id],
              ['Username', `@${user.username}`],
              ['IBAN', account?.iban || '—'],
              ['SWIFT', 'LUNABKXX'],
              ...(tonWallet ? [['TON Wallet', shortAddr(tonWallet)]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-1">
                <span className="text-xs text-white/30">{label}</span>
                <button
                  onClick={() => copyToClipboard(value)}
                  className="text-xs mono flex items-center gap-1 active:scale-95"
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
          <AnimatedEmoji type="success" size={72} loop={false} />
          <h2 className="text-2xl font-extrabold mt-4 mb-2">Зачислено!</h2>
          <p className="text-white/35 text-sm mb-1">🌙{val} LNC → {account?.name}</p>
          <p className="text-white/20 text-xs mb-8">Оплачено: {tonAmount.toFixed(4)} TON</p>
          <button onClick={() => go('home')} className="btn-primary w-full max-w-sm">
            На главную
          </button>
        </div>
      )}

      {/* ===== ERROR ===== */}
      {step === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-fade-in">
          <p className="text-4xl mb-4">❌</p>
          <h2 className="text-xl font-bold mb-2">Ошибка оплаты</h2>
          <p className="text-red-400/70 text-sm text-center mb-6">{errorMsg}</p>
          <button onClick={() => setStep('select')} className="btn-primary w-full max-w-sm">
            Попробовать снова
          </button>
        </div>
      )}
    </div>
  );
}
