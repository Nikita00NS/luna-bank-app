import React, { useEffect, useState, useCallback } from 'react';
import { useStore, uid, genAccNum, genIBAN } from '../lib/store';
import { haptic, shortAddr, timeAgo } from '../lib/utils';
import {
  formatTonAddress,
  shortTonAddress,
  fetchTonBalance,
  fetchTonTransactions,
  fetchTonAccountInfo,
  fetchJettonBalances,
  buildTonTransferTx,
  isValidTonAddress,
  fromNano,
  type TonBalance,
  type TonTransaction,
  type TonAccountInfo,
  type JettonBalance,
} from '../lib/ton';
import { dbSaveWallet, dbCreateAccount, dbCreateNotification, dbUpdateBalance } from '../lib/db';
import { useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react';
import { ArrowLeftIcon, LinkIcon, CheckIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import Modal from '../components/Modal';

type Tab = 'wallet' | 'txs' | 'send';

export default function TonConnectScreen() {
  const { user, tonWallet, go, setTonWallet, addAccount, accounts, addNotif } = useStore();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const address = useTonAddress(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // TON Blockchain state
  const [tab, setTab] = useState<Tab>('wallet');
  const [tonBalance, setTonBalance] = useState<TonBalance | null>(null);
  const [accountInfo, setAccountInfo] = useState<TonAccountInfo | null>(null);
  const [jettons, setJettons] = useState<JettonBalance[]>([]);
  const [tonTxs, setTonTxs] = useState<TonTransaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingTxs, setLoadingTxs] = useState(false);

  // Send state
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendComment, setSendComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStep, setSendStep] = useState<'form' | 'confirm' | 'success' | 'error'>('form');
  const [sendTxHash, setSendTxHash] = useState('');
  const [sendError, setSendError] = useState('');

  if (!user) return null;

  // ===== Fetch real balance from blockchain =====
  const refreshBalance = useCallback(async () => {
    if (!address) return;
    setLoadingBalance(true);
    try {
      const [bal, info, jettonData] = await Promise.all([
        fetchTonBalance(address),
        fetchTonAccountInfo(address),
        fetchJettonBalances(address),
      ]);
      setTonBalance(bal);
      setAccountInfo(info);
      setJettons(jettonData);

      const store = useStore.getState();

      // Sync real TON balance
      if (bal.ok) {
        const tonAcc = store.accounts.find((a) => a.currency === 'TON');
        if (tonAcc) {
          const newBal = bal.balance;
          if (Math.abs(tonAcc.balance - newBal) > 0.0001) {
            // Set absolute balance (not delta)
            store.updateBalance(tonAcc.id, newBal - tonAcc.balance);
            dbUpdateBalance(tonAcc.id, newBal - tonAcc.balance).catch(() => {});
          }
        }
      }

      // Sync USDT balance from jettons
      const usdtJetton = jettonData.find((j) => j.symbol === 'USD₮' || j.symbol === 'USDT');
      if (usdtJetton) {
        const usdtAcc = store.accounts.find((a) => a.currency === 'USDT');
        if (usdtAcc && Math.abs(usdtAcc.balance - usdtJetton.balance) > 0.001) {
          store.updateBalance(usdtAcc.id, usdtJetton.balance - usdtAcc.balance);
          dbUpdateBalance(usdtAcc.id, usdtJetton.balance - usdtAcc.balance).catch(() => {});
        }
      }
    } catch {}
    setLoadingBalance(false);
  }, [address]);

  // ===== Fetch real transactions from blockchain =====
  const refreshTxs = useCallback(async () => {
    if (!address) return;
    setLoadingTxs(true);
    try {
      const txs = await fetchTonTransactions(address, 20);
      setTonTxs(txs);
    } catch {}
    setLoadingTxs(false);
  }, [address]);

  // Auto-refresh on wallet connect
  useEffect(() => {
    if (address) {
      refreshBalance();
      refreshTxs();
    }
  }, [address]);

  // Sync wallet state (existing logic)
  useEffect(() => {
    if (wallet && address) {
      if (!tonWallet || tonWallet !== address) {
        haptic('success');
        setTonWallet(address);
        setConnecting(false);

        dbSaveWallet(
          user.telegram_id,
          wallet.device?.appName || 'unknown',
          address
        ).catch(() => {});

        const cryptoTypes = [
          { type: 'ton' as const, name: 'TON', currency: 'TON' as const },
          { type: 'usdt' as const, name: 'USDT', currency: 'USDT' as const },
          { type: 'bitcoin' as const, name: 'Bitcoin', currency: 'BTC' as const },
          { type: 'ethereum' as const, name: 'Ethereum', currency: 'ETH' as const },
        ];

        for (const ct of cryptoTypes) {
          if (!accounts.find((a) => a.type === ct.type)) {
            const acc = {
              id: uid(),
              user_id: user.telegram_id,
              type: ct.type,
              name: ct.name,
              currency: ct.currency,
              balance: 0,
              account_number: genAccNum(),
              iban: genIBAN(),
              created_at: new Date().toISOString(),
              wallet_address: address,
            };
            addAccount(acc);
            dbCreateAccount(acc).catch((err) => console.error('[TON] Account save failed:', acc.type, err));
          }
        }

        addNotif({
          id: uid(),
          title: '🔗 Кошелёк подключён',
          message: `${wallet.device?.appName || 'TON Wallet'} — ${formatTonAddress(address)}`,
          type: 'system',
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    } else if (!wallet && tonWallet) {
      setTonWallet(null);
      setTonBalance(null);
      setAccountInfo(null);
      setTonTxs([]);
    }
  }, [wallet, address]);

  // ===== Connect =====
  const handleConnect = async () => {
    haptic('medium');
    setError(null);
    setConnecting(true);
    try {
      await tonConnectUI.openModal();
    } catch (err: any) {
      setConnecting(false);
      setError(err?.message || 'Connection error');
    }
  };

  // ===== Disconnect =====
  const handleDisconnect = async () => {
    haptic('medium');
    try {
      await tonConnectUI.disconnect();
      setTonWallet(null);
    } catch (err: any) {
      setError(err?.message || 'Disconnect error');
    }
  };

  // ===== Send real TON =====
  const handleSend = async () => {
    if (!isValidTonAddress(sendTo)) {
      setSendError('Некорректный TON-адрес');
      return;
    }
    const amt = parseFloat(sendAmount) || 0;
    if (amt <= 0) {
      setSendError('Введите сумму');
      return;
    }
    if (tonBalance && amt > tonBalance.balance) {
      setSendError('Недостаточно средств');
      return;
    }
    setSendError('');
    setSendStep('confirm');
  };

  const confirmSend = async () => {
    setSending(true);
    setSendError('');

    try {
      const amt = parseFloat(sendAmount) || 0;
      const tx = buildTonTransferTx(sendTo, amt, sendComment || undefined);

      // This opens the wallet app for user to confirm
      const result = await tonConnectUI.sendTransaction(tx);

      haptic('success');
      setSendTxHash(result?.boc || 'tx_sent');
      setSendStep('success');

      // Refresh balance after a delay
      setTimeout(() => refreshBalance(), 3000);

      // Notification
      addNotif({
        id: uid(),
        title: '💎 TON отправлен',
        message: `${amt} TON → ${shortTonAddress(sendTo)}`,
        type: 'transfer',
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      const msg = err?.message || 'Transaction rejected';
      setSendError(msg);
      setSendStep('error');
      haptic('error');
    }
    setSending(false);
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      haptic('light');
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'wallet', label: '💎 Кошелёк' },
    { id: 'txs', label: '📜 История' },
    { id: 'send', label: '📤 Отправить' },
  ];

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">TON Connect</h1>
        {wallet && (
          <button
            onClick={() => { refreshBalance(); refreshTxs(); }}
            className={`glass rounded-full w-8 h-8 flex items-center justify-center text-xs ${loadingBalance ? 'animate-spin' : ''}`}
          >
            🔄
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 glass p-3 mb-2 border border-red-500/20">
          <p className="text-red-400 text-xs">{error}</p>
          <button onClick={() => setError(null)} className="text-[10px] text-white/20 mt-1">Закрыть</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5">
        {wallet && address ? (
          /* ===== CONNECTED ===== */
          <div className="animate-fade-in">
            {/* Balance Card */}
            <div className="glass-accent p-5 mt-2 rounded-2xl mb-4">
              <div className="flex items-center gap-3 mb-3">
                <AnimatedEmoji type="diamond" size={40} />
                <div className="flex-1">
                  <p className="text-xs text-white/35">TON Баланс</p>
                  {loadingBalance ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
                      <span className="text-white/30 text-sm">Загрузка...</span>
                    </div>
                  ) : (
                    <p className="text-3xl font-extrabold mono">
                      {tonBalance?.ok ? tonBalance.balance.toFixed(4) : '—'} TON
                    </p>
                  )}
                </div>
              </div>

              {/* Account state */}
              {accountInfo && (
                <div className="flex gap-3 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full ${
                    accountInfo.state === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                    accountInfo.state === 'uninitialized' ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>
                    {accountInfo.state === 'active' ? '● Active' :
                     accountInfo.state === 'uninitialized' ? '○ New' : '⊘ Frozen'}
                  </span>
                  <span className="text-white/20">
                    ≈ ${tonBalance?.ok ? (tonBalance.balance * 6.85).toFixed(2) : '0.00'}
                  </span>
                </div>
              )}

              {/* Address */}
              <div className="mt-3 flex items-center gap-2">
                <p className="text-[10px] text-white/20 mono flex-1 truncate">{address}</p>
                <button onClick={copyAddress} className="text-[10px] text-white/30 active:scale-95">📋</button>
              </div>

              {/* Wallet info */}
              <p className="text-[10px] text-white/15 mt-1">
                {wallet.device?.appName || 'TON Wallet'} · {wallet.device?.platform || ''}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 mb-4 p-1 glass rounded-2xl">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); haptic('light'); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                    tab === t.id ? 'bg-white text-black' : 'text-white/40'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ===== WALLET TAB ===== */}
            {tab === 'wallet' && (
              <div className="space-y-3 pb-24 animate-fade-in">
                {/* Quick actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setTab('send')}
                    className="flex-1 glass p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform rounded-xl"
                  >
                    <AnimatedEmoji type="send" size={24} />
                    <span className="text-xs text-white/50">Отправить</span>
                  </button>
                  <button
                    onClick={copyAddress}
                    className="flex-1 glass p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform rounded-xl"
                  >
                    <span className="text-xl">📋</span>
                    <span className="text-xs text-white/50">Копировать</span>
                  </button>
                  <button
                    onClick={() => go('qr')}
                    className="flex-1 glass p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform rounded-xl"
                  >
                    <span className="text-xl">📱</span>
                    <span className="text-xs text-white/50">QR</span>
                  </button>
                </div>

                {/* Jetton tokens */}
                {jettons.length > 0 && (
                  <div>
                    <p className="text-xs text-white/30 font-medium mb-2">Токены на кошельке</p>
                    <div className="space-y-1.5">
                      {jettons.map((j, i) => (
                        <div key={j.address || i} className="glass p-3 flex items-center gap-3 rounded-xl">
                          {j.image ? (
                            <img src={j.image} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold">
                              {j.symbol.slice(0, 2)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{j.name}</p>
                            <p className="text-[10px] text-white/20">{j.symbol}{j.verified ? ' ✓' : ''}</p>
                          </div>
                          <p className="font-bold mono text-sm">{j.balance < 0.01 ? j.balance.toFixed(6) : j.balance < 1000 ? j.balance.toFixed(2) : j.balance.toFixed(0)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disconnect */}
                <button
                  onClick={handleDisconnect}
                  className="w-full glass py-3 text-red-400/70 text-sm font-medium active:scale-[0.98] transition-transform rounded-xl"
                >
                  Отключить кошелёк
                </button>
              </div>
            )}

            {/* ===== TRANSACTIONS TAB ===== */}
            {tab === 'txs' && (
              <div className="pb-24 animate-fade-in">
                {loadingTxs ? (
                  <div className="text-center py-10">
                    <AnimatedEmoji type="loading" size={32} />
                    <p className="text-white/30 text-sm mt-3">Загрузка из блокчейна...</p>
                  </div>
                ) : tonTxs.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-white/20 text-sm">Нет транзакций</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tonTxs.map((tx, i) => {
                      const isIncoming = !!tx.inMsg?.value && tx.inMsg.value > 0;
                      const outValue = tx.outMsgs.reduce((s, m) => s + m.value, 0);
                      const value = isIncoming ? tx.inMsg!.value : outValue;
                      const peer = isIncoming
                        ? tx.inMsg?.source
                        : tx.outMsgs[0]?.destination;

                      return (
                        <div
                          key={tx.hash + tx.lt}
                          className="glass p-3 flex items-center gap-3 rounded-xl animate-slide-up"
                          style={{ animationDelay: `${i * 0.03}s` }}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                            isIncoming ? 'bg-emerald-500/10' : 'bg-red-500/10'
                          }`}>
                            {isIncoming ? '📥' : '📤'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {isIncoming ? 'Получено' : 'Отправлено'}
                            </p>
                            <p className="text-[10px] text-white/20 mono truncate">
                              {peer ? shortTonAddress(peer) : '—'}
                            </p>
                            <p className="text-[9px] text-white/15">
                              {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString('ru-RU') : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold mono text-sm ${
                              isIncoming ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {isIncoming ? '+' : '-'}{value.toFixed(4)}
                            </p>
                            <p className="text-[9px] text-white/20">TON</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={refreshTxs}
                  disabled={loadingTxs}
                  className="w-full glass py-3 text-xs text-white/30 mt-4 rounded-xl active:scale-[0.98]"
                >
                  {loadingTxs ? 'Загрузка...' : '🔄 Обновить'}
                </button>
              </div>
            )}

            {/* ===== SEND TAB ===== */}
            {tab === 'send' && (
              <div className="pb-24 animate-fade-in">
                {sendStep === 'form' && (
                  <div className="space-y-4">
                    {/* To address */}
                    <div>
                      <p className="text-xs text-white/35 mb-1.5 font-medium">Адрес получателя</p>
                      <input
                        type="text"
                        value={sendTo}
                        onChange={(e) => setSendTo(e.target.value)}
                        placeholder="UQ... или EQ..."
                        className="w-full glass px-4 py-3 bg-transparent text-white text-sm mono outline-none rounded-xl"
                      />
                      {sendTo && !isValidTonAddress(sendTo) && sendTo.length > 5 && (
                        <p className="text-[10px] text-red-400/60 mt-1">Некорректный адрес</p>
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      <p className="text-xs text-white/35 mb-1.5 font-medium">Сумма TON</p>
                      <input
                        type="number"
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        placeholder="0.0000"
                        className="w-full glass px-4 py-4 bg-transparent text-white text-2xl font-bold mono outline-none text-center rounded-xl"
                      />
                      {tonBalance?.ok && (
                        <div className="flex justify-between mt-1.5 text-[10px] text-white/20">
                          <span>Доступно: {tonBalance.balance.toFixed(4)} TON</span>
                          <button
                            onClick={() => setSendAmount(String(Math.max(0, tonBalance.balance - 0.05).toFixed(4)))}
                            className="text-blue-400/60 active:scale-95"
                          >
                            Макс
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Comment */}
                    <div>
                      <p className="text-xs text-white/35 mb-1.5 font-medium">Комментарий</p>
                      <input
                        type="text"
                        value={sendComment}
                        onChange={(e) => setSendComment(e.target.value)}
                        placeholder="Необязательно"
                        className="w-full glass px-4 py-3 bg-transparent text-white text-sm outline-none rounded-xl"
                      />
                    </div>

                    {sendError && (
                      <p className="text-red-400 text-xs">{sendError}</p>
                    )}

                    <button
                      onClick={handleSend}
                      disabled={!sendTo || !sendAmount}
                      className="btn-primary w-full"
                    >
                      Продолжить →
                    </button>
                  </div>
                )}

                {sendStep === 'confirm' && (
                  <div className="space-y-4">
                    <div className="glass p-5 space-y-3 rounded-2xl">
                      <div className="text-center mb-3">
                        <AnimatedEmoji type="diamond" size={48} />
                        <h3 className="font-bold text-lg mt-2">Подтверждение</h3>
                      </div>
                      {[
                        ['Кому', shortTonAddress(sendTo)],
                        ['Сумма', `${sendAmount} TON`],
                        ['≈ USD', `$${((parseFloat(sendAmount) || 0) * 6.85).toFixed(2)}`],
                        ...(sendComment ? [['Комментарий', sendComment]] : []),
                        ['Сеть', 'TON Mainnet'],
                      ].map(([l, v]) => (
                        <div key={l} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                          <span className="text-white/35 text-sm">{l}</span>
                          <span className="text-sm mono">{v}</span>
                        </div>
                      ))}
                    </div>

                    <div className="glass p-3 rounded-xl">
                      <p className="text-[10px] text-yellow-400/60">
                        ⚠️ Кошелёк откроется для подтверждения. Проверьте адрес и сумму.
                      </p>
                    </div>

                    <button
                      onClick={confirmSend}
                      disabled={sending}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {sending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          Ожидание кошелька...
                        </>
                      ) : (
                        '💎 Подтвердить отправку'
                      )}
                    </button>
                    <button
                      onClick={() => setSendStep('form')}
                      className="btn-ghost w-full"
                    >
                      ← Назад
                    </button>
                  </div>
                )}

                {sendStep === 'success' && (
                  <div className="text-center py-8">
                    <AnimatedEmoji type="success" size={72} loop={false} />
                    <h3 className="font-bold text-xl mt-4 mb-2">TON отправлен!</h3>
                    <p className="text-white/35 text-sm">
                      {sendAmount} TON → {shortTonAddress(sendTo)}
                    </p>
                    <p className="text-[9px] text-white/15 mono mt-2 break-all px-4">
                      {sendTxHash.slice(0, 40)}...
                    </p>
                    <button
                      onClick={() => {
                        setSendStep('form');
                        setSendTo('');
                        setSendAmount('');
                        setSendComment('');
                        refreshBalance();
                      }}
                      className="btn-primary w-full mt-6"
                    >
                      Готово
                    </button>
                  </div>
                )}

                {sendStep === 'error' && (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-3">❌</p>
                    <h3 className="font-bold text-xl mb-2">Ошибка</h3>
                    <p className="text-red-400/70 text-sm mb-4">{sendError}</p>
                    <button
                      onClick={() => setSendStep('form')}
                      className="btn-primary w-full"
                    >
                      Попробовать снова
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ===== NOT CONNECTED ===== */
          <div className="animate-fade-in mt-4">
            <div className="text-center mb-8">
              <AnimatedEmoji type="diamond" size={64} className="mb-4" />
              <h2 className="text-xl font-extrabold mb-2">Подключите кошелёк</h2>
              <p className="text-sm text-white/35 max-w-[280px] mx-auto">
                Подключите TON-кошелёк для работы с криптовалютами.
                Реальный баланс, реальные транзакции.
              </p>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="btn-primary w-full text-base py-[18px] flex items-center justify-center gap-2"
            >
              {connecting ? (
                <>
                  <AnimatedEmoji type="loading" size={20} />
                  Подключение...
                </>
              ) : (
                <>
                  <LinkIcon size={20} />
                  Подключить кошелёк
                </>
              )}
            </button>

            <div className="mt-6 space-y-3 pb-24">
              {[
                { title: '🔐 Безопасно', desc: 'Мы не получаем доступ к вашим средствам' },
                { title: '💎 Реальный баланс', desc: 'Данные прямо из блокчейна TON' },
                { title: '📤 Отправка TON', desc: 'Реальные транзакции через кошелёк' },
                { title: '📜 История', desc: 'Все транзакции из блокчейна' },
              ].map((item) => (
                <div key={item.title} className="glass p-3 flex items-start gap-3 rounded-xl">
                  <span className="text-lg">{item.title.slice(0, 2)}</span>
                  <div>
                    <p className="font-semibold text-sm">{item.title.slice(2).trim()}</p>
                    <p className="text-xs text-white/30 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
