import React from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';

export default function QRPayScreen() {
  const { go, back, tonWallet } = useStore();

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">QR Pay</p>
      </div>

      <div className="px-4 mt-8 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-[var(--accent)/10]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="3" height="3" />
            <path d="M21 14h-3v3h3M21 17v4h-4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">QR Pay with Crypto</h2>
        <p className="text-sm text-center text-[var(--text-tertiary)]">
          Scan merchant QR code for instant payment in TON or USDT
        </p>

        <div className="w-full max-w-[300px] mt-8 space-y-3">
          <button onClick={() => go('qr-scan')}
            className="btn btn-primary w-full flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <line x1="7" y1="12" x2="17" y2="12" />
            </svg>
            Scan QR
          </button>
          <button onClick={() => go('receive')}
            className="btn btn-secondary w-full">
            Show My QR
          </button>
        </div>
      </div>
    </div>
  );
}