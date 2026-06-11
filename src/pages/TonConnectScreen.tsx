import React, { useState } from 'react';
import { useStore, uid, genAccNum, genIBAN } from '../lib/store';
import { haptic, shortAddr } from '../lib/utils';
import { dbSaveWallet, dbCreateAccount, dbCreateNotification } from '../lib/db';
import { ArrowLeftIcon, LinkIcon, CheckIcon } from '../components/Icons';

const WALLETS = [
  { id: 'tonkeeper', name: 'Tonkeeper', color: '#0098EA' },
  { id: 'mytonwallet', name: 'MyTonWallet', color: '#3B82F6' },
  { id: 'wallet', name: 'Wallet', color: '#8B5CF6' },
  { id: 'tonhub', name: 'Tonhub', color: '#0EA5E9' },
];

export default function TonConnectScreen() {
  const { user, tonWallet, go, setTonWallet, addAccount, accounts, addNotif } = useStore();
  const [connecting, setConnecting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  if (!user) return null;

  const connect = (walletId: string) => {
    haptic('medium');
    setSelectedWallet(walletId);
    setConnecting(true);

    setTimeout(() => {
      const address = 'EQ' + Array.from({ length: 46 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
      ).join('');

      setTonWallet(address);
      dbSaveWallet(user.telegram_id, walletId, address).catch(() => {});

      // Auto-create crypto accounts
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
          dbCreateAccount(acc).catch(() => {});
        }
      }

      addNotif({
        id: uid(),
        title: '🔗 Кошелёк подключён',
        message: `${WALLETS.find((w) => w.id === walletId)?.name} — OK`,
        type: 'system',
        read: false,
        created_at: new Date().toISOString(),
      });

      setConnecting(false);
    }, 2000);
  };

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">TON Connect</h1>
      </div>

      <div className="px-5 mt-4">
        {tonWallet ? (
          /* Connected state */
          <div className="animate-fade-in">
            <div className="glass-accent p-5 text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                <CheckIcon size={32} color="#34d399" />
              </div>
              <h3 className="font-bold text-lg mb-1">Кошелёк подключён</h3>
              <p className="text-sm text-white/35 mono">{shortAddr(tonWallet)}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tonWallet);
                  haptic('light');
                }}
                className="text-xs text-white/25 mt-2"
              >
                Копировать адрес 📋
              </button>
            </div>

            <button
              onClick={() => {
                haptic('medium');
                setTonWallet(null);
              }}
              className="btn-secondary w-full text-red-400"
            >
              Отключить кошелёк
            </button>
          </div>
        ) : connecting ? (
          /* Connecting state */
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mb-6" />
            <h3 className="font-bold text-lg mb-2">Подключение...</h3>
            <p className="text-sm text-white/35">
              Подтвердите в {WALLETS.find((w) => w.id === selectedWallet)?.name}
            </p>
          </div>
        ) : (
          /* Wallet selection */
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4 animate-float">
                <LinkIcon size={28} color="rgba(255,255,255,0.5)" />
              </div>
              <h2 className="text-xl font-extrabold mb-2">Подключите кошелёк</h2>
              <p className="text-sm text-white/35">Выберите TON-кошелёк</p>
            </div>

            <div className="space-y-3">
              {WALLETS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => connect(wallet.id)}
                  className="w-full glass p-4 flex items-center gap-4 active:scale-[0.98] transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                    style={{ background: wallet.color + '20', color: wallet.color }}
                  >
                    {wallet.name[0]}
                  </div>
                  <p className="flex-1 text-left font-bold">{wallet.name}</p>
                  <span className="text-white/15">›</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
