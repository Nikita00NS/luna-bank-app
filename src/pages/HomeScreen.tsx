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
  BellIcon, SearchIcon, StarIcon, CreditCardIcon, PlusIcon,
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
    { Icon: SendIcon, label: 'Перевести', page: 'transfer' as const },
    { Icon: DownloadIcon, label: 'Пополнить', page: 'deposit' as const },
    { Icon: SwapIcon, label: 'Обменять', page: 'swap' as const },
    { Icon: DiamondIcon, label: 'TON Connect', page: 'ton-connect' as const },
  ];

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* ===== Header ===== */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <button onClick={() => { haptic('light'); go('profile'); }} className="relative">
            {user.photo_url ? (
              <img src={user.photo_url} alt="" className="w-11 h-11 rounded-full ring-1 ring-white/15" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 border border-white/10 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-violet-500/20">
                {user.first_name[0]}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black" />
          </button>
          <div>
            <p className="text-[11px] text-white/40 font-medium tracking-wide uppercase">{greeting.text}</p>
            <p className="font-extrabold text-[16px] tracking-tight text-white">{user.first_name} {user.last_name || ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cycleCurrency}
            className="glass rounded-full px-3.5 py-1.5 text-xs font-bold mono flex items-center gap-1.5 active:scale-95 border border-white/10 hover:border-white/20 transition-all">
            <span className="text-amber-400 font-bold">{dispCurrency}</span>
          </button>
          <button onClick={() => { haptic('light'); go('notifications'); }}
            className="relative glass rounded-full w-10 h-10 flex items-center justify-center active:scale-95 border border-white/10 hover:border-white/20 transition-all text-white/80 hover:text-white">
            <BellIcon size={19} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white ring-2 ring-black shadow-md shadow-red-500/50">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ===== Balance Card ===== */}
      <section className="mx-5 mt-4 glass p-6 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-2xl animate-slide-up relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-white/50 uppercase font-semibold tracking-wider">Общий баланс активов</p>
          <span className="text-[10px] mono px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/70 font-medium">
            Некастодиально + Банк
          </span>
        </div>
        <p className="text-[40px] font-extrabold mono tracking-tight leading-none mt-2 text-white drop-shadow-sm">
          {formatMoney(totalUsd, dispCurrency)}
        </p>
        <p className="text-xs text-white/40 mt-2 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {accounts.length} {accounts.length === 1 ? 'счёт' : accounts.length < 5 ? 'счёта' : 'счетов'} · {walletJettons.length} токенов в сети TON
        </p>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 mt-6 gap-2.5">
          {quickActions.map((action) => (
            <button key={action.label} onClick={() => { haptic('light'); go(action.page); }}
              className="flex flex-col items-center gap-2.5 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all border border-white/[0.06] hover:border-white/15">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-amber-400 shadow-inner">
                <action.Icon size={19} color="currentColor" />
              </div>
              <span className="text-[11px] text-white/70 font-semibold tracking-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ===== Tokens (horizontal scrollable + editable) ===== */}
      <section className="mt-6">
        <div className="px-5 flex items-center justify-between mb-3">
          <h3 className="font-bold text-[15px] text-white">Активы и счета</h3>
          <div className="flex items-center gap-3">
            <button onClick={() => { setEditingTokens(!editingTokens); haptic('light'); }}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all active:scale-95 ${editingTokens ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-white/40 hover:text-white/70'}`}>
              {editingTokens ? 'Готово' : 'Настроить'}
            </button>
            {!tonWallet && (
              <button onClick={() => { haptic('light'); go('ton-connect'); }}
                className="text-xs text-amber-400 font-bold active:scale-95 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <PlusIcon size={12} /> Подключить
              </button>
            )}
          </div>
        </div>

        {allTokens.length === 0 ? (
          <div className="px-5">
            <button onClick={() => { haptic('medium'); go('ton-connect'); }}
              className="w-full glass p-8 flex flex-col items-center gap-3 rounded-2xl active:scale-[0.98] border border-white/10 hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400">
                <DiamondIcon size={24} />
              </div>
              <p className="text-sm font-semibold text-white/70">Подключите некастодиальный кошелёк</p>
              <p className="text-xs text-white/40">Для доступа к балансу в блокчейне TON / EVM</p>
            </button>
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto px-5 pb-2 -mx-0 no-scrollbar">
            {allTokens.map((token, i) => (
              <div key={token.id} className="glass p-3.5 rounded-2xl min-w-[140px] max-w-[160px] shrink-0 relative animate-slide-up border border-white/[0.08] hover:border-white/15 transition-all"
                style={{ animationDelay: `${i * 0.04}s` }}>
                {/* Edit mode — hide button */}
                {editingTokens && (
                  <button onClick={() => toggleHideToken(token.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white z-10 shadow-md">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}

                {/* Token icon */}
                <div className="flex items-center gap-2 mb-2.5">
                  {token.image ? (
                    <img src={token.image} alt="" className="w-7 h-7 rounded-full border border-white/10" />
                  ) : token.symbol === 'LNC' ? (
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <DiamondIcon size={14} />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-[10px] font-bold mono text-white/80">
                      {token.symbol.slice(0, 3)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-white">{token.symbol}</p>
                    {token.isAccount && <p className="text-[9px] text-white/35 font-medium">Счёт</p>}
                  </div>
                </div>

                {/* Balance */}
                <p className="font-extrabold mono text-sm truncate text-white">
                  {token.balance < 0.01 ? token.balance.toFixed(6)
                    : token.balance < 1000 ? token.balance.toFixed(2)
                    : token.balance >= 1e6 ? `${(token.balance / 1e6).toFixed(1)}M`
                    : token.balance.toFixed(0)}
                </p>
                {token.usdValue > 0 && (
                  <p className="text-[10px] text-white/35 mono font-medium mt-0.5">${token.usdValue.toFixed(2)}</p>
                )}
              </div>
            ))}

            {/* Add token */}
            <button onClick={() => { haptic('light'); go('ton-connect'); }}
              className="glass p-3.5 rounded-2xl min-w-[85px] shrink-0 flex flex-col items-center justify-center gap-2 active:scale-95 border border-white/[0.06] hover:border-white/15 transition-all text-white/40 hover:text-white">
              <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                <PlusIcon size={14} />
              </div>
              <span className="text-[10px] font-semibold">Добавить</span>
            </button>
          </div>
        )}
      </section>

      {/* ===== Services ===== */}
      <section className="px-5 mt-6">
        <h3 className="font-bold text-[15px] mb-3 text-white">Сервисы экосистемы</h3>
        <div className="grid grid-cols-4 gap-2.5">
          {([
            { Icon: ChartIcon, label: 'Биржа', page: 'exchange' as const },
            { Icon: ReceiptIcon, label: 'Платежи', page: 'payments' as const },
            { Icon: ShieldIcon, label: 'Гарант', page: 'escrow' as const },
            { Icon: TrendingUpIcon, label: 'P2P', page: 'p2p' as const },
            { Icon: SwapIcon, label: 'Стейкинг', page: 'earn' as const },
            { Icon: DiamondIcon, label: 'Маркет', page: 'markets' as const },
            { Icon: SendIcon, label: 'QR Сканер', page: 'qr' as const },
            { Icon: SearchIcon, label: 'Копилки', page: 'savings' as const },
          ]).map((item, i) => (
            <button key={item.label} onClick={() => { haptic('light'); go(item.page); }}
              className="glass p-3.5 flex flex-col items-center gap-2 active:scale-95 transition-all rounded-2xl border border-white/[0.06] hover:border-white/15 animate-scale-in group"
              style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] group-hover:bg-amber-500/10 flex items-center justify-center transition-all text-white/60 group-hover:text-amber-400">
                <item.Icon size={18} color="currentColor" />
              </div>
              <span className="text-[10px] text-white/60 font-semibold truncate max-w-full">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ===== Recent Transactions ===== */}
      {txs.length > 0 && (
        <section className="px-5 mt-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[15px] text-white">Последние операции</h3>
            <button onClick={() => { haptic('light'); go('history'); }}
              className="text-xs text-amber-400 font-semibold active:scale-95 flex items-center gap-1">Все операции →</button>
          </div>
          <div className="space-y-2">
            {txs.slice(0, 5).map((tx) => {
              const isOut = tx.from_user_id === user.telegram_id;
              return (
                <button key={tx.id} onClick={() => { haptic('light'); useStore.getState().selTx(tx.id); go('tx-detail'); }}
                  className="w-full glass p-3.5 flex items-center gap-3.5 active:scale-[0.98] transition-all text-left rounded-2xl border border-white/[0.06] hover:border-white/15">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${isOut ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    {tx.type === 'transfer' ? <SendIcon size={16} /> : tx.type === 'deposit' ? <DownloadIcon size={16} /> : tx.type === 'subscription' ? <StarIcon size={16} /> : <CreditCardIcon size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-white/90">{tx.note || (tx.type === 'transfer' ? 'Перевод' : tx.type === 'deposit' ? 'Пополнение' : 'Платёж')}</p>
                    <p className="text-[11px] text-white/40">{new Date(tx.created_at).toLocaleDateString('ru-RU')}</p>
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
