import React from 'react';
import { useStore } from '../lib/store';
import { haptic, shortAddress } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';

export default function ProfileScreen() {
  const { go, back, tonWallet } = useStore();

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Profile</p>
      </div>
      <div className="flex flex-col items-center px-4 mt-8">
        <div className="w-20 h-20 rounded-full bg-[var(--accent)] flex items-center justify-center text-3xl font-bold text-white mb-4">L</div>
        <p className="text-xl font-bold">Luna Wallet</p>
        {tonWallet && <p className="text-xs text-[var(--text-tertiary)] mt-2 font-mono">{shortAddress(tonWallet)}</p>}
        <div className="w-full mt-8 grid grid-cols-3 gap-3">
          <div className="card p-3 text-center"><p className="text-xs text-[var(--text-tertiary)]">Wallet</p><p className="font-semibold text-sm mt-1">{tonWallet ? 'Connected' : 'None'}</p></div>
          <div className="card p-3 text-center"><p className="text-xs text-[var(--text-tertiary)]">Network</p><p className="font-semibold text-sm mt-1">TON</p></div>
          <div className="card p-3 text-center"><p className="text-xs text-[var(--text-tertiary)]">Version</p><p className="font-semibold text-sm mt-1">v2.0</p></div>
        </div>
      </div>
    </div>
  );
}