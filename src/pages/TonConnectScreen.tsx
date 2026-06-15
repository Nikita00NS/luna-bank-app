import React, { useEffect, useState } from 'react';
import { useStore, uid, genAccNum, genIBAN } from '../lib/store';
import { haptic } from '../lib/utils';
import { formatTonAddress } from '../lib/ton';
import { dbSaveWallet, dbCreateAccount, dbCreateNotification } from '../lib/db';
import { useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react';
import { ArrowLeftIcon, LinkIcon, CheckIcon } from '../components/Icons';

export default function TonConnectScreen() {
  const { user, tonWallet, go, setTonWallet, addAccount, accounts, addNotif } = useStore();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const address = useTonAddress(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string>('');
  const [connecting, setConnecting] = useState(false);

  if (!user) return null;

  // Debug info
  useEffect(() => {
    const info = [
      `SDK loaded: ${!!tonConnectUI}`,
      `Wallet: ${wallet ? wallet.device?.appName || 'connected' : 'null'}`,
      `Address: ${address ? address.slice(0, 10) + '...' : 'null'}`,
      `Local wallet: ${tonWallet ? 'yes' : 'no'}`,
      `Platform: ${(window as any).Telegram?.WebApp ? 'TG WebApp' : 'Browser'}`,
    ];
    setDebug(info.join('\n'));
  }, [tonConnectUI, wallet, address, tonWallet]);

  // Sync wallet state
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
            dbCreateAccount(acc).catch(() => {});
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
    }
  }, [wallet, address]);

  // Connect handler with error catching
  const handleConnect = async () => {
    haptic('medium');
    setError(null);
    setConnecting(true);

    try {
      setDebug((prev) => prev + '\nOpening modal...');
      await tonConnectUI.openModal();
      setDebug((prev) => prev + '\nModal opened ✓');
    } catch (err: any) {
      setConnecting(false);
      const errMsg = err?.message || err?.toString() || 'Unknown error';
      setError(errMsg);
      setDebug((prev) => prev + '\nError: ' + errMsg);
      console.error('[TON] Connect error:', err);
    }
  };

  // Disconnect handler
  const handleDisconnect = async () => {
    haptic('medium');
    try {
      await tonConnectUI.disconnect();
      setTonWallet(null);
    } catch (err: any) {
      setError(err?.message || 'Disconnect error');
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      haptic('light');
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">TON Connect</h1>
      </div>

      <div className="px-5 mt-4">
        {/* ERROR DISPLAY */}
        {error && (
          <div className="glass p-3 mb-4 border border-red-500/20 animate-fade-in">
            <p className="text-red-400 text-xs font-bold mb-1">❌ Ошибка:</p>
            <p className="text-red-400/70 text-[11px] break-all">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-[10px] text-white/30 mt-2"
            >
              Закрыть
            </button>
          </div>
        )}

        {wallet && address ? (
          /* ===== CONNECTED ===== */
          <div className="animate-fade-in">
            <div className="glass-accent p-5 text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                <CheckIcon size={32} color="#34d399" />
              </div>
              <h3 className="font-bold text-lg mb-1">Кошелёк подключён</h3>
              <p className="text-xs text-white/40 mb-2">
                {wallet.device?.appName || 'TON Wallet'}
              </p>
              <p className="text-sm text-white/35 mono break-all px-4">
                {address}
              </p>
              <button
                onClick={copyAddress}
                className="text-xs text-white/25 mt-3 active:scale-95 transition-transform"
              >
                Копировать 📋
              </button>
            </div>

            <div className="glass p-4 mb-4 space-y-2">
              {[
                ['Приложение', wallet.device?.appName || '—'],
                ['Платформа', wallet.device?.platform || '—'],
                ['Адрес', formatTonAddress(address)],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-white/30">{l}</span>
                  <span className="mono">{v}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleDisconnect}
              className="btn-secondary w-full text-red-400"
            >
              Отключить кошелёк
            </button>
          </div>
        ) : (
          /* ===== NOT CONNECTED ===== */
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4 animate-float">
                <LinkIcon size={28} color="rgba(255,255,255,0.5)" />
              </div>
              <h2 className="text-xl font-extrabold mb-2">Подключите кошелёк</h2>
              <p className="text-sm text-white/35 max-w-[280px] mx-auto">
                Подключите TON-кошелёк для работы с криптовалютами.
                Поддерживаются Tonkeeper, MyTonWallet и другие.
              </p>
            </div>

            {/* CONNECT BUTTON */}
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="btn-primary w-full text-base py-[18px] flex items-center justify-center gap-2"
            >
              {connecting ? (
                <>
                  <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Подключение...
                </>
              ) : (
                <>
                  <LinkIcon size={20} />
                  Подключить кошелёк
                </>
              )}
            </button>

            {/* Info cards */}
            <div className="mt-6 space-y-3">
              {[
                {
                  title: 'Безопасно',
                  desc: 'Мы не получаем доступ к вашим средствам.',
                  icon: '🔐',
                },
                {
                  title: 'Мгновенно',
                  desc: 'Подключение через QR-код или deep link.',
                  icon: '⚡',
                },
                {
                  title: 'Авто-создание счетов',
                  desc: 'TON, USDT, BTC, ETH — автоматически.',
                  icon: '🏦',
                },
              ].map((item) => (
                <div key={item.title} className="glass p-3 flex items-start gap-3">
                  <span className="text-xl mt-0.5">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-white/30 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* DEBUG INFO (tap to show) */}
            <details className="mt-6">
              <summary className="text-[10px] text-white/15 cursor-pointer">
                Debug info
              </summary>
              <pre className="text-[9px] text-white/20 mt-2 glass p-2 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                {debug}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
