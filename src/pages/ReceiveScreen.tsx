import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { QRCodeSVG } from 'qrcode.react';
import { shortAddress } from '../lib/ton';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';

export default function ReceiveScreen() {
  const { go, back, tonWallet, tokens } = useStore();
  const [selectedToken, setSelectedToken] = useState(tokens[0]?.symbol || 'TON');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!tonWallet) return;
    try { await navigator.clipboard.writeText(tonWallet); setCopied(true); haptic('success'); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  if (!tonWallet) return (
    <div className="page safe-top flex flex-col items-center justify-center px-8">
      <p className="text-base font-semibold mb-2">Connect Wallet</p>
      <p className="text-sm text-[var(--text-tertiary)]">Connect your wallet to receive funds</p>
    </div>
  );

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Receive</p>
      </div>

      <div className="flex flex-col items-center px-4 mt-6">
        <div className="p-4 rounded-xl mb-4 bg-white" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.1)' }}>
          <QRCodeSVG value={tonWallet} size={200} level="M" />
        </div>

        <div className="w-full bg-[var(--bg-card)] rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[var(--text-tertiary)]">Address</p>
            <button onClick={handleCopy} className="text-xs text-[var(--accent)] active:opacity-70">{copied ? 'Copied!' : 'Copy'}</button>
          </div>
          <p className="text-xs font-mono break-all text-[var(--text-secondary)]">{tonWallet}</p>
        </div>

        <div className="flex gap-1.5">
          {tokens.map(t => (
            <button key={t.symbol} onClick={() => setSelectedToken(t.symbol)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedToken === t.symbol ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
              {t.symbol}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}