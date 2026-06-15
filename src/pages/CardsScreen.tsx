import React from 'react';
import { useStore } from '../lib/store';
import { formatMoney, balanceInUsd, haptic } from '../lib/utils';

const ACCOUNT_ICONS: Record<string, string> = {
  personal: '👤',
  business: '💼',
  ton: '💎',
  usdt: '💵',
  bitcoin: '₿',
  ethereum: 'Ξ',
};

const ACCOUNT_LABELS: Record<string, string> = {
  personal: 'Личный',
  business: 'Бизнес',
  ton: 'TON',
  usdt: 'USDT',
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
};

export default function CardsScreen() {
  const { accounts, go, selAccount, dispCurrency } = useStore();

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* Header */}
      <div className="px-5 pt-6 flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">Счета</h1>
        <button
          onClick={() => {
            haptic('light');
            go('open-account');
          }}
          className="glass rounded-full px-4 py-2 text-sm font-semibold active:scale-95 transition-transform"
        >
          + Открыть
        </button>
      </div>

      <div className="px-5">
        {accounts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.03] flex items-center justify-center text-4xl mb-4 animate-float">
              🏦
            </div>
            <h3 className="text-lg font-bold mb-2">Нет открытых счетов</h3>
            <p className="text-white/35 text-sm text-center mb-6 max-w-[260px]">
              Откройте первый счёт с электронной подписью
            </p>
            <button
              onClick={() => {
                haptic('medium');
                go('open-account');
              }}
              className="btn-primary px-8"
            >
              Открыть счёт
            </button>
          </div>
        ) : (
          /* Account list */
          <div className="space-y-3">
            {accounts.map((account, i) => (
              <button
                key={account.id}
                onClick={() => {
                  haptic('light');
                  selAccount(account.id);
                  go('account-detail');
                }}
                className="
                  w-full glass p-5 text-left
                  animate-slide-up
                  active:scale-[0.98] transition-all duration-200
                "
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Top row: icon + name + badge */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center text-2xl">
                    {ACCOUNT_ICONS[account.type] || '💰'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{account.name}</p>
                    <p className="text-xs text-white/30">
                      {ACCOUNT_LABELS[account.type] || account.type} счёт
                    </p>
                  </div>
                  {account.contract_signed && (
                    <span className="text-[10px] text-emerald-400/60 bg-emerald-400/10 px-2 py-0.5 rounded-lg">
                      ✓ Подписан
                    </span>
                  )}
                </div>

                {/* Bottom row: balance + account number */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] text-white/30">Баланс</p>
                    <p className="text-2xl font-extrabold mono">
                      {formatMoney(
                        balanceInUsd(account.balance, account.currency),
                        dispCurrency
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-white/20 mono">
                    ···{account.account_number.slice(-4)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
