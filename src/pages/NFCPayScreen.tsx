import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { haptic, formatCrypto } from '../lib/utils';
import { ArrowLeftIcon, NfcIcon } from '../components/Icons';

export default function NFCPayScreen() {
  const { go, back, tonWallet, tokens } = useStore();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleStartScan = async () => {
    if (!tonWallet) {
      haptic('error');
      return;
    }
    setScanning(true);
    haptic('medium');

    setTimeout(() => {
      setScanning(false);
      setResult('NFC tag read: 0.5 TON → Payment');
      haptic('success');

      setTimeout(() => {
        setResult(null);
      }, 3000);
    }, 2000);
  };

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">NFC Pay</p>
      </div>

      <div className="px-4 mt-12 flex flex-col items-center">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all ${scanning ? 'animate-pulse' : ''}`} style={{ background: 'var(--bg-card)' }}>
          <NfcIcon size={56} color={scanning ? 'var(--accent)' : 'var(--text-tertiary)'} />
        </div>

        <h2 className="text-xl font-bold mb-2">
          {scanning ? 'Scanning...' : 'Tap to pay'}
        </h2>
        <p className="text-sm text-center text-[var(--text-tertiary)]">
          {scanning ? 'Hold phone near NFC terminal or tag' : 'Tap back of phone to NFC tag for payment'}
        </p>

        {result && (
          <div className="mt-6 card p-4 w-full max-w-[300px]">
            <p className="text-sm font-medium text-center text-[var(--green)]">
              ✓ {result}
            </p>
          </div>
        )}

        <button onClick={handleStartScan}
          disabled={scanning || !tonWallet}
          className="btn btn-primary w-full max-w-[300px] mt-8 flex items-center justify-center gap-2">
          <NfcIcon size={20} color="white" />
          {scanning ? 'Scanning...' : 'Start Scan'}
        </button>
      </div>
    </div>
  );
}