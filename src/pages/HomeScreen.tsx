import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { formatMoney, balanceInUsd, haptic, getGreeting } from '../lib/utils';
import { CURRENCIES, LNC_RATE_USD, CRYPTO_PRICES } from '../lib/constants';
import Logo from '../components/Logo';
import LncIcon from '../components/LncIcon';
import AnimatedEmoji from '../components/AnimatedEmoji';
import {
  SendIcon, DownloadIcon, SwapIcon, DiamondIcon,
  ChartIcon, ShieldIcon, ReceiptIcon, TrendingUpIcon,
  BellIcon, SearchIcon,
} from '../components/Icons';

export default function HomeScreen() {
  const {
    user, accounts, go, notifs, txs,
    dispCurrency, setDispCurrency,
    walletJettons, tonWallet,
  } = useStore();
  const [hiddenTokens, setHiddenTokens] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('luna-hidden-tokens') || '[]')); } catch { return new Set(); }
  });
  const [editingTokens, setEditingTokens] = useState(false);

  const greeting = getGreeting();
  const unreadCount = notifs.filter((n) => !n.read).length;

  if (!user) return null;

  // Total portfolio value in USD
  const accountsUsd = accounts.reduce((sum, acc) => sum + balanceInUsd(acc.balance, acc.currency), 0);
  const jettonsUsd = walletJettons.reduce((sum, j) => {
    if (j.symbol === 'USD₮' || j.symbol === 'USDT') return sum + j.balance;
    return sum; // other jettons — no reliable USD price
  }, 0);
  const totalUsd = accountsUsd + jettonsUsd;

  // Merge accounts + jettons into one token list
  const allTokens = [
    ...accounts.map((a) => ({
      id: `acc-${a.id}`,
      symbol: a.currency,
      name: a.name,
      balance: a.balance,
      usdValue: balanceInUsd(a.balance, a.currency),
      image: undefined as string | undefined,
      isAccount: true,
    })),
    ...walletJettons
      .filter((j) => !accounts.some((a) => (a.currency === 'USDT' && (j.symbol === 'USD₮' || j.symbol === 'USDT')) || (a.currency === 'TON' && j.symbol === 'TON')))
      .map((j) => ({
        id: `jet-${j.symbol}`,
        symbol: j.symbol,
        name: j.name,
        balance: j.balance,
        usdValue: j.symbol === 'USD₮' || j.symbol === 'USDT' ? j.balance : 0,
        image: j.image,
        isAccount: false,
      })),
  ].filter((t) => !hiddenTokens.has(t.id));

  const toggleHideToken = (id: string) => {
    const next = new Set(hiddenTokens);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHiddenTokens(next);
    localStorage.setItem('luna-hidden-tokens', JSON.stringify([...next]));
  };

  // Currency cycling
  const currencyKeys = Object.keys(CURRENCIES);
  const cycleCurrency = () => {
    haptic('light');
    const idx = currencyKeys.indexOf(dispCurrency);
    setDispCurrency(currencyKeys[(idx + 1) % currencyKeys.length]);
  };

  const quickActions = [
    { Icon: SendIcon, label: 'Перевод', page: 'transfer' as const },
    { Icon: DownloadIcon, label: 'Пополнить', page: 'deposit' as const },
    { Icon: SwapIcon, label: 'Обмен', page: 'swap' as const },
    { Icon: DiamondIcon, label: 'TON', page: 'ton-connect' as const },
  ];

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* ===== Header ===== */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { haptic('light'); go('profile'); }}>
            {user.photo_url ? (
              <img src={user.photo_url} alt="" className="w-11 h-11 rounded-full ring-1 ring-white/10" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-lg font-bold">
                {user.first_name[0]}
              </div>
            )}
          </button>
          <div>
            <p className="text-[11px] text-white/35">{greeting.text} {greeting.emoji}</p>
            <p className="font-bold text-[15px] -mt-0.5">{user.first_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cycleCurrency}
            className="glass rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 active:scale-95">
            {CURRENCIES[dispCurrency]?.flag} {dispCurrency}
          </button>
          <button onClick={() => { haptic('light'); go('notifications'); }}
            className="relative glass rounded-full w-10 h-10 flex items-center justify-center active:scale-95">
            <AnimatedEmoji type="bell" size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-black">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ===== Balance Card ===== */}
      <section className="mx-5 mt-5 glass-accent p-6 rounded-2xl animate-slide-up">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Общий баланс</p>
        <p className="text-[42px] font-extrabold mono tracking-tighter leading-none">
          {formatMoney(totalUsd, dispCurrency)}
        </p>
        <p className="text-sm text-white/30 mt-2">
          {accounts.length} {accounts.length === 1 ? 'счёт' : accounts.length < 5 ? 'счёта' : 'счетов'}
          {walletJettons.length > 0 && ` · ${walletJettons.length} токенов`}
        </p>

        {/* Quick Actions */}
        <div className="flex justify-between mt-6 gap-2">
          {quickActions.map((action) => (
            <button key={action.label} onClick={() => { haptic('light'); go(action.page); }}
              className="flex flex-col items-center gap-2 flex-1 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all">
              <action.Icon size={22} color="rgba(255,255,255,0.7)" />
              <span className="text-[11px] text-white/50 font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ===== Tokens (horizontal scrollable + editable) ===== */}
      <section className="mt-6">
        <div className="px-5 flex items-center justify-between mb-3">
          <h3 className="font-bold text-[15px]">Активы</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditingTokens(!editingTokens); haptic('light'); }}
              className={`text-xs font-medium active:scale-95 ${editingTokens ? 'text-blue-400' : 'text-white/30'}`}>
              {editingTokens ? 'Готово' : '✏️ Ред.'}
            </button>
            {!tonWallet && (
              <button onClick={() => { haptic('light'); go('ton-connect'); }}
                className="text-xs text-blue-400 font-medium active:scale-95">
                + Кошелёк
              </button>
            )}
          </div>
        </div>

        {allTokens.length === 0 ? (
          <div className="px-5">
            <button onClick={() => { haptic('medium'); go('ton-connect'); }}
              className="w-full glass p-8 flex flex-col items-center gap-3 rounded-2xl active:scale-[0.98]">
              <AnimatedEmoji type="diamond" size={40} />
              <p className="text-sm text-white/40">Подключите кошелёк</p>
            </button>
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto px-5 pb-2 -mx-0 no-scrollbar">
            {allTokens.map((token, i) => (
              <div key={token.id} className="glass p-3.5 rounded-2xl min-w-[140px] max-w-[160px] shrink-0 relative animate-slide-up"
                style={{ animationDelay: `${i * 0.04}s` }}>
                {/* Edit mode — hide button */}
                {editingTokens && (
                  <button onClick={() => toggleHideToken(token.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white z-10">✕</button>
                )}

                {/* Token icon */}
                <div className="flex items-center gap-2 mb-2">
                  {token.image ? (
                    <img src={token.image} alt="" className="w-7 h-7 rounded-full" />
                  ) : token.symbol === 'LNC' ? (
                    <LncIcon size={20} />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold mono">
                      {token.symbol.slice(0, 3)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{token.symbol}</p>
                  </div>
                </div>

                {/* Balance */}
                <p className="font-extrabold mono text-sm truncate">
                  {token.balance < 0.01 ? token.balance.toFixed(6)
                    : token.balance < 1000 ? token.balance.toFixed(2)
                    : token.balance >= 1e6 ? `${(token.balance / 1e6).toFixed(1)}M`
                    : token.balance.toFixed(0)}
                </p>
                {token.usdValue > 0 && (
                  <p className="text-[10px] text-white/25 mono">${token.usdValue.toFixed(2)}</p>
                )}
              </div>
            ))}

            {/* Add token */}
            <button onClick={() => { haptic('light'); go('ton-connect'); }}
              className="glass p-3.5 rounded-2xl min-w-[80px] shrink-0 flex flex-col items-center justify-center gap-1.5 active:scale-95">
              <span className="text-xl text-white/20">+</span>
              <span className="text-[9px] text-white/20">Ещё</span>
            </button>
          </div>
        )}
      </section>

      {/* ===== Services ===== */}
      <section className="px-5 mt-6">
        <h3 className="font-bold text-[15px] mb-3">Сервисы</h3>
        <div className="grid grid-cols-4 gap-2">
          {([
            { Icon: ChartIcon, label: 'Биржа', page: 'exchange' as const },
            { Icon: ReceiptIcon, label: 'Платежи', page: 'payments' as const },
            { Icon: ShieldIcon, label: 'Гарант', page: 'escrow' as const },
            { Icon: TrendingUpIcon, label: 'P2P', page: 'p2p' as const },
            { Icon: SwapIcon, label: 'Earn', page: 'earn' as const },
            { Icon: DiamondIcon, label: 'Маркет', page: 'markets' as const },
            { Icon: SendIcon, label: 'QR', page: 'qr' as const },
            { Icon: SearchIcon, label: 'Копилки', page: 'savings' as const },
          ]).map((item, i) => (
            <button key={item.label} onClick={() => { haptic('light'); go(item.page); }}
              className="glass p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-all rounded-2xl animate-scale-in"
              style={{ animationDelay: `${i * 0.04}s` }}>
              <item.Icon size={20} color="rgba(255,255,255,0.5)" />
              <span className="text-[10px] text-white/40 font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ===== Recent Transactions ===== */}
      {txs.length > 0 && (
        <section className="px-5 mt-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[15px]">Последние операции</h3>
            <button onClick={() => { haptic('light'); go('history'); }}
              className="text-xs text-white/30 font-medium active:scale-95">Все →</button>
          </div>
          <div className="space-y-2">
            {txs.slice(0, 5).map((tx) => {
              const isOut = tx.from_user_id === user.telegram_id;
              return (
                <button key={tx.id} onClick={() => { haptic('light'); useStore.getState().selTx(tx.id); go('tx-detail'); }}
                  className="w-full glass p-3 flex items-center gap-3 active:scale-[0.98] transition-all text-left rounded-xl">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${isOut ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                    {tx.type === 'transfer' ? '📤' : tx.type === 'deposit' ? '📥' : tx.type === 'subscription' ? '⭐' : '💳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.note || tx.type}</p>
                    <p className="text-[11px] text-white/30">{new Date(tx.created_at).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <p className={`font-bold mono text-sm ${isOut ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isOut ? '-' : '+'}{formatMoney(balanceInUsd(tx.amount, tx.currency), 'USD')}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
