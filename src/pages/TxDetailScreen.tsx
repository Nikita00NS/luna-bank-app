import React from 'react';
import { useStore } from '../lib/store';
import { haptic, shortAddress } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';

export default function TxDetailScreen() {
  const { go, back, txs, selTxHash, tonWallet } = useStore();
  const tx = txs.find(t => t.hash === selTxHash);

  if (!tx) return (
    <div className="page safe-top flex flex-col items-center justify-center px-8">
      <p className="text-sm text-[var(--text-tertiary)]">Transaction not found</p>
      <button onClick={() => back()} className="btn btn-secondary mt-4">Back</button>
    </div>
  );

  const isIn = tx.to === tonWallet;

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Transaction</p>
      </div>
      <div className="flex flex-col items-center px-4 mt-6">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isIn ? 'bg-[var(--green)]/10' : 'bg-[var(--red)]/10'}`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isIn ? 'var(--green)' : 'var(--red)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isIn ? <polyline points="7 13 12 18 17 13" /> : <polyline points="17 11 12 6 7 11" />}
            <line x1="12" y1="18" x2="12" y2="6" />
          </svg>
        </div>
        <p className="text-lg font-bold mb-1">{isIn ? 'Received' : 'Sent'}</p>
        <p className="text-2xl font-bold mono mt-1">{isIn ? '+' : '-'}{tx.value.toFixed(4)} <span className="text-base font-medium text-[var(--text-secondary)]">TON</span></p>
        <div className="w-full card p-4 mt-6 space-y-3">
          <div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">Status</span><span className="font-medium text-[var(--green)]">Completed</span></div>
          <div className="divider" />
          <div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">From</span><span className="font-mono text-xs max-w-[180px] truncate">{tx.from}</span></div>
          <div className="divider" />
          <div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">To</span><span className="font-mono text-xs max-w-[180px] truncate">{tx.to}</span></div>
          <div className="divider" />
          <div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">Fee</span><span className="font-mono text-sm">{tx.fee.toFixed(6)} TON</span></div>
          <div className="divider" />
          <div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">Date</span><span className="text-sm">{new Date(tx.timestamp * 1000).toLocaleString()}</span></div>
          {tx.comment && <><div className="divider" /><div className="flex justify-between text-sm"><span className="text-[var(--text-tertiary)]">Comment</span><span className="text-sm">{tx.comment}</span></div></>}
        </div>
        <button onClick={() => window.open(`https://tonviewer.com/transaction/${tx.hash}`, '_blank')} className="btn btn-secondary mt-4">View on Explorer</button>
      </div>
    </div>
  );
}