import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { isValidTonAddress, buildTransfer } from '../lib/ton';
import { formatCrypto, haptic, shortAddress } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';

export default function TxConfirmScreen() {
  const { go, back } = useStore();
  const [tonConnectUI] = useTonConnectUI();
  const [pin, setPin] = useState('');
  const [sending, setSending] = useState(false);

  const confirmData = (window as any).__luna_confirm as { amount: string; symbol: string; to: string; fee?: string; resolve?: (r: string) => void } | null;

  const handleConfirm = async () => {
    if (!confirmData) return;
    haptic('medium');
    setSending(true);
    try {
      const result = await tonConnectUI.sendTransaction(buildTransfer(confirmData.to, Number(confirmData.amount), ''));
      if (result?.boc) { confirmData.resolve?.('confirmed'); (window as any).__luna_confirm = null; back(); }
    } catch { confirmData.resolve?.('cancelled'); }
    setSending(false);
  };

  return (
    <div className="page safe-top flex flex-col items-center justify-center px-8">
      <p className="text-lg font-bold mb-4">Confirm Transaction</p>
      {confirmData && (
        <div className="w-full card p-4 space-y-3 mb-4">
          <div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">Amount</span><span className="font-medium mono">{confirmData.amount} {confirmData.symbol}</span></div>
          <div className="divider" />
          <div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">To</span><span className="text-xs font-mono max-w-[200px] truncate">{confirmData.to}</span></div>
        </div>
      )}
      <button onClick={handleConfirm} disabled={sending} className="btn btn-primary w-full max-w-[300px]">{sending ? 'Sending...' : 'Confirm'}</button>
      <button onClick={() => back()} className="btn btn-secondary w-full max-w-[300px] mt-2">Cancel</button>
    </div>
  );
}