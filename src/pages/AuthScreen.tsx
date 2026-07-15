import React from 'react';
import { useStore } from '../lib/store';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { haptic } from '../lib/utils';

export default function AuthScreen() {
  const { go } = useStore();
  const [tonConnectUI] = useTonConnectUI();

  return (
    <div className="h-full flex flex-col items-center justify-center px-8" style={{ background: 'var(--bg)' }}>
      <div className="w-16 h-16 rounded-xl bg-[var(--accent)] flex items-center justify-center mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <p className="text-xl font-bold mb-2">Luna Wallet</p>
      <p className="text-sm text-[var(--text-tertiary)] text-center mb-10">Secure TON crypto wallet</p>
      
      <button onClick={() => { haptic('medium'); tonConnectUI.openModal(); }} className="btn btn-primary">
        Connect Wallet
      </button>
      <button onClick={() => go('seed-phrase')} className="text-xs text-[var(--accent)] mt-4 active:opacity-70">
        Import wallet with seed phrase
      </button>
      
      <p className="text-[10px] text-[var(--text-tertiary)] mt-12">Powered by TON Blockchain</p>
    </div>
  );
}