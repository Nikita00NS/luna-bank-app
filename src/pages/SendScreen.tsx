import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { isValidTonAddress, buildTransfer, shortAddress } from '../lib/ton';
import { formatCrypto, haptic } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';

export default function SendScreen() {
  const { go, back, tokens, tonWallet } = useStore();
  const [tonConnectUI] = useTonConnectUI();
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [selectedToken, setSelectedToken] = useState(tokens[0]?.symbol || 'TON');
  const [step, setStep] = useState<'input' | 'confirm' | 'sending' | 'done'>('input');
  const [error, setError] = useState('');

  const token = tokens.find(t => t.symbol === selectedToken);
  const maxBalance = token?.balance || 0;
  const isValid = isValidTonAddress(address.trim()) && Number(amount) > 0 && Number(amount) <= maxBalance;

  const handleSend = async () => {
    if (!tonWallet) return;
    setStep('sending'); setError('');
    try {
      const result = await tonConnectUI.sendTransaction(buildTransfer(address.trim(), Number(amount), comment || undefined));
      if (result?.boc) { setStep('done'); haptic('success'); }
    } catch (err: any) { setError(err?.message || 'Transaction rejected'); haptic('error'); setStep('confirm'); }
  };

  if (step === 'done') return (
    <div className="page safe-top flex flex-col items-center justify-center px-8">
      <div className="w-16 h-16 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <p className="text-lg font-bold mb-1">Sent successfully</p>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{formatCrypto(Number(amount))} {selectedToken} → {shortAddress(address.trim())}</p>
      {comment && <p className="text-xs text-[var(--text-tertiary)] mb-4">"{comment}"</p>}
      <button onClick={() => go('home')} className="btn btn-primary max-w-[200px]">Done</button>
    </div>
  );

  if (step === 'confirm') return (
    <div className="page safe-top px-4">
      <div className="header">
        <button onClick={() => setStep('input')} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Confirm</p>
      </div>
      <div className="mt-6 space-y-4">
        <div className="card p-4 space-y-3">
          <div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">Asset</span><span className="font-medium">{selectedToken}</span></div>
          <div className="divider" />
          <div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">Amount</span><span className="font-medium mono">{formatCrypto(Number(amount))} {selectedToken}</span></div>
          <div className="divider" />
          <div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">To</span><span className="font-medium text-xs font-mono max-w-[200px] truncate">{address.trim()}</span></div>
          <div className="divider" />
          <div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">Network fee</span><span className="font-medium">~0.005 TON</span></div>
          {comment && <><div className="divider" /><div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">Comment</span><span className="font-medium">{comment}</span></div></>}
        </div>
        {error && <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--red)/10', color: 'var(--red)' }}>{error}</div>}
        <button onClick={handleSend} className="btn btn-primary">Confirm</button>
        <button onClick={() => setStep('input')} className="btn btn-secondary">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => back()} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Send</p>
      </div>

      <div className="px-4 mt-4 space-y-5">
        {/* Token selector */}
        <div>
          <p className="section-title">Asset</p>
          <div className="flex gap-1.5">
            {tokens.map(t => (
              <button key={t.symbol} onClick={() => { setSelectedToken(t.symbol); haptic('light'); }}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${selectedToken === t.symbol ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
                {t.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <p className="section-title">Recipient</p>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter address or .ton domain" className="input" style={{ background: 'var(--bg-card)' }} />
          {address && !isValidTonAddress(address.trim()) && <p className="text-xs text-[var(--red)] mt-1">Invalid address</p>}
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="section-title mb-0">Amount</p>
            <button onClick={() => { setAmount(maxBalance.toString()); haptic('light'); }} className="text-xs text-[var(--accent)] active:opacity-70">Max: {formatCrypto(maxBalance)}</button>
          </div>
          <div className="relative">
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="input text-2xl font-bold mono pr-16" style={{ background: 'var(--bg-card)' }} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)] font-medium">{selectedToken}</span>
          </div>
          {Number(amount) > maxBalance && <p className="text-xs text-[var(--red)] mt-1">Insufficient balance</p>}
          {token?.priceUsd && Number(amount) > 0 && <p className="text-xs text-[var(--text-tertiary)] mt-1">≈ ${(Number(amount) * token.priceUsd).toFixed(2)}</p>}
        </div>

        {/* Comment */}
        <div>
          <p className="section-title">Comment (optional)</p>
          <input type="text" value={comment} onChange={e => setComment(e.target.value)} placeholder="What's this for?" maxLength={128} className="input" style={{ background: 'var(--bg-card)' }} />
        </div>

        <button onClick={() => { if (isValid && tonWallet) { setStep('confirm'); haptic('light'); } }} disabled={!isValid || !tonWallet} className="btn btn-primary mt-2">
          Review
        </button>
      </div>
    </div>
  );
}