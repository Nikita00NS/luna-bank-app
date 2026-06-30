import React from 'react';
import { useStore } from '../lib/store';
import { formatMoney, balanceInUsd, haptic, getGreeting } from '../lib/utils';
import { CURRENCIES, LNC_RATE_USD } from '../lib/constants';
import Logo from '../components/Logo';
import AnimatedEmoji from '../components/AnimatedEmoji';
import LncIcon from '../components/LncIcon';
import {
  SendIcon, DownloadIcon, SwapIcon, DiamondIcon,
  ChartIcon, GamepadIcon, ImageIcon, ShieldIcon,
  ReceiptIcon, UsersIcon, TrendingUpIcon, LinkIcon,
  BellIcon, PlusIcon,
} from '../components/Icons';

// Account type icons
const ACCOUNT_ICONS: Record<string, string> = {
  personal: '🌙',
  business: '💼',
  ton: '💎',
  usdt: '💵',
  bitcoin: '₿',
  ethereum: 'Ξ',
};

export default function HomeScreen() {
  const {
    user,
    accounts,
    go,
    notifs,
    txs,
    dispCurrency,
    setDispCurrency,
    walletJettons,
    tonWallet,
  } = useStore();

  const greeting = getGreeting();
  const unreadCount = notifs.filter((n) => !n.read).length;

  if (!user) return null;

  // Calculate total balance in USD
  const totalUsd = accounts.reduce(
    (sum, acc) => sum + balanceInUsd(acc.balance, acc.currency),
    0
  );

  // Currency cycling
  const currencyKeys = Object.keys(CURRENCIES);
  const cycleCurrency = () => {
    haptic('light');
    const idx = currencyKeys.indexOf(dispCurrency);
    setDispCurrency(currencyKeys[(idx + 1) % currencyKeys.length]);
  };

  // Quick actions with SVG icons
  const quickActions = [
    { Icon: SendIcon, label: 'Перевод', page: 'transfer' as const },
    { Icon: DownloadIcon, label: 'Пополнить', page: 'deposit' as const },
    { Icon: SwapIcon, label: 'Обмен', page: 'swap' as const },
    { Icon: DiamondIcon, label: 'Earn', page: 'earn' as const },
  ];

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* ===== Header ===== */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        {/* Left: Avatar + Name */}
        <div className="flex items-center gap-3">
          <button onClick={() => { haptic('light'); go('profile'); }}>
            {user.photo_url ? (
              <img
                src={user.photo_url}
                alt=""
                className="w-11 h-11 rounded-full ring-1 ring-white/10"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-lg font-bold">
                {user.first_name[0]}
              </div>
            )}
          </button>
          <div>
            <p className="text-[11px] text-white/35 font-medium">
              {greeting.text} {greeting.emoji}
            </p>
            <p className="font-bold text-[15px] -mt-0.5">
              {user.first_name} {user.last_name}
            </p>
          </div>
        </div>

        {/* Right: Currency + Notifications */}
        <div className="flex items-center gap-2">
          <button
            onClick={cycleCurrency}
            className="glass rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            {CURRENCIES[dispCurrency]?.flag} {dispCurrency}
          </button>
          <button
            onClick={() => { haptic('light'); go('notifications'); }}
            className="relative glass rounded-full w-10 h-10 flex items-center justify-center active:scale-95 transition-transform"
          >
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
      <section className="mx-5 mt-5 glass-accent p-6 animate-slide-up">
        <p className="text-xs text-white/40 font-medium tracking-widest uppercase mb-1">
          Общий баланс
        </p>
        <p className="text-[42px] font-extrabold mono tracking-tighter leading-none">
          {formatMoney(totalUsd, dispCurrency)}
        </p>
        <p className="text-sm text-white/30 mt-2">
          {accounts.length}{' '}
          {accounts.length === 1 ? 'счёт' : accounts.length < 5 ? 'счёта' : 'счетов'}
          {' · '}1 <LncIcon size={12} /> = ${LNC_RATE_USD}
        </p>

        {/* Quick Actions */}
        <div className="flex justify-between mt-6 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => { haptic('light'); go(action.page); }}
              className="
                flex flex-col items-center gap-2 flex-1
                py-3 rounded-2xl bg-white/[0.04]
                hover:bg-white/[0.08]
                active:scale-95 transition-all duration-200
              "
            >
              <action.Icon size={22} color="rgba(255,255,255,0.7)" />
              <span className="text-[11px] text-white/50 font-medium">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ===== Accounts ===== */}
      <section className="px-5 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[15px]">Мои счета</h3>
          <button
            onClick={() => { haptic('light'); go('open-account'); }}
            className="text-xs text-white/30 font-medium"
          >
            + Открыть
          </button>
        </div>

        {accounts.length === 0 ? (
          /* Empty state */
          <button
            onClick={() => { haptic('medium'); go('open-account'); }}
            className="
              w-full glass p-8
              flex flex-col items-center gap-3
              animate-fade-in
              active:scale-[0.98] transition-transform
            "
          >
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center text-2xl">
              +
            </div>
            <p className="text-sm text-white/40">Откройте свой первый счёт</p>
          </button>
        ) : (
          /* Account list */
          <div className="space-y-2.5">
            {accounts.map((account, index) => (
              <button
                key={account.id}
                onClick={() => {
                  haptic('light');
                  useStore.getState().selAccount(account.id);
                  go('account-detail');
                }}
                className="
                  w-full glass p-4
                  flex items-center gap-4
                  animate-slide-up
                  active:scale-[0.98] transition-all duration-200
                "
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-white/[0.04] flex items-center justify-center text-xl">
                  {ACCOUNT_ICONS[account.type] || '💰'}
                </div>

                {/* Name + Currency */}
                <div className="flex-1 text-left">
                  <p className="font-semibold text-[14px]">{account.name}</p>
                  <p className="text-[11px] text-white/30">{account.currency}</p>
                </div>

                {/* Balance */}
                <p className="font-bold mono text-[14px]">
                  {formatMoney(
                    balanceInUsd(account.balance, account.currency),
                    dispCurrency
                  )}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ===== Wallet Tokens ===== */}
      {tonWallet && walletJettons.length > 0 && (
        <section className="px-5 mt-7">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[15px]">Токены кошелька</h3>
            <button
              onClick={() => { haptic('light'); go('ton-connect'); }}
              className="text-xs text-white/30 font-medium"
            >
              Все →
            </button>
          </div>
          <div className="space-y-2">
            {walletJettons.map((token, i) => (
              <div
                key={token.symbol + i}
                className="glass p-3 flex items-center gap-3 animate-slide-up active:scale-[0.98] transition-all"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                {token.image ? (
                  <img src={token.image} alt="" className="w-9 h-9 rounded-full" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold mono">
                    {token.symbol.slice(0, 3)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{token.name}</p>
                  <p className="text-[10px] text-white/25">
                    {token.symbol}
                    {token.verified && ' ✓'}
                  </p>
                </div>
                <p className="font-bold mono text-sm">
                  {token.balance < 0.01
                    ? token.balance.toFixed(6)
                    : token.balance < 1000
                      ? token.balance.toFixed(2)
                      : token.balance >= 1e6
                        ? `${(token.balance / 1e6).toFixed(1)}M`
                        : token.balance.toFixed(0)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== More Actions ===== */}
      <section className="px-5 mt-7">
        <h3 className="font-bold text-[15px] mb-3">Сервисы</h3>
        <div className="grid grid-cols-4 gap-2">
          {([
            { Icon: ChartIcon, label: 'Биржа', page: 'exchange' as const },
            { Icon: ShieldIcon, label: 'Гарант', page: 'escrow' as const },
            { Icon: ReceiptIcon, label: 'Платежи', page: 'payments' as const },
            { Icon: UsersIcon, label: 'Друзья', page: 'social' as const },
            { Icon: TrendingUpIcon, label: 'Портфель', page: 'portfolio' as const },
            { Icon: LinkIcon, label: 'P2P', page: 'p2p' as const },
            { Icon: ChartIcon, label: 'Маркет', page: 'marketplace' as const },
            { Icon: ImageIcon, label: 'Stories', page: 'stories' as const },
            { Icon: GamepadIcon, label: 'Ачивки', page: 'achievements' as const },
          ]).map((item, i) => (
            <button
              key={item.label}
              onClick={() => { haptic('light'); go(item.page); }}
              className="
                glass p-3
                flex flex-col items-center gap-1.5
                active:scale-95 transition-all
                animate-scale-in
              "
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <item.Icon size={20} color="rgba(255,255,255,0.5)" />
              <span className="text-[10px] text-white/40 font-medium">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ===== Recent Transactions ===== */}
      {txs.length > 0 && (
        <section className="px-5 mt-7 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[15px]">Последние операции</h3>
            <button
              onClick={() => { haptic('light'); go('history'); }}
              className="text-xs text-white/30 font-medium active:scale-95"
            >
              Все →
            </button>
          </div>
          <div className="space-y-2">
            {txs.slice(0, 5).map((tx) => {
              const isOutgoing = tx.from_user_id === user.telegram_id;
              return (
                <button
                  key={tx.id}
                  onClick={() => {
                    haptic('light');
                    useStore.getState().selTx(tx.id);
                    go('tx-detail');
                  }}
                  className="w-full glass p-3 flex items-center gap-3 active:scale-[0.98] transition-all text-left rounded-xl"
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                    isOutgoing ? 'bg-red-500/10' : 'bg-emerald-500/10'
                  }`}>
                    {tx.type === 'transfer' ? '📤' :
                     tx.type === 'deposit' ? '📥' :
                     tx.type === 'subscription' ? '⭐' :
                     tx.type === 'job' ? '💼' :
                     tx.type === 'business' ? '🏪' : '💳'}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.note || tx.type}
                    </p>
                    <p className="text-[11px] text-white/30">
                      {new Date(tx.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>

                  {/* Amount */}
                  <p
                    className={`font-bold mono text-sm ${
                      isOutgoing ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {isOutgoing ? '-' : '+'}
                    {formatMoney(
                      balanceInUsd(tx.amount, tx.currency),
                      'USD'
                    )}
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
