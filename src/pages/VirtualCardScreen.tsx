import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { buildTransfer } from '../lib/ton';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon, PlusIcon, LockIcon } from '../components/Icons';
import { toastSuccess, toastError } from '../lib/toast';

export default function VirtualCardScreen() {
  const { go, back, virtualCards, setVirtualCards, tonWallet } = useStore();
  const [tonConnectUI] = useTonConnectUI();
  const [topUpCard, setTopUpCard] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');

  const generateCard = () => {
    const nums = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('')
    ).join(' ');
    const cvv = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join('');
    const exp = `${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}/${String(new Date().getFullYear() + 3).slice(2)}`;
    const card = {
      id: crypto.randomUUID(), user_id: "user",
      card_number: nums, cvv, expiry: exp, balance: 0, status: 'active' as const,
      created_at: new Date().toISOString(),
    };
    setVirtualCards([...virtualCards, card]);
    toastSuccess('Card issued', `${nums.slice(-4)}`);
    haptic('success');
  };

  const toggleFreeze = (id: string) => {
    setVirtualCards(virtualCards.map(c => c.id === id ? { ...c, status: c.status === 'frozen' ? 'active' : 'frozen' } : c));
    haptic('light');
  };

  const handleTopUp = async (cardId: string) => {
    if (!tonWallet || !topUpAmount) return;
    try {
      const tx = buildTransfer(
        'UQA9IgVuB-8GUVRttmh4zjhg5yFYXBMhGHWyt7ASJF1VuZJD',
        Number(topUpAmount),
        'Card top-up'
      );
      const result = await tonConnectUI.sendTransaction(tx);
      if (result?.boc) {
        setVirtualCards(virtualCards.map(c => c.id === cardId ? { ...c, balance: c.balance + Number(topUpAmount) } : c));
        toastSuccess('Card topped up', `+${topUpAmount} TON`);
        haptic('success');
        setTopUpCard(null);
        setTopUpAmount('');
      }
    } catch (err: any) {
      toastError('Error', err?.message);
    }
  };

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Virtual Cards</p>
        <button onClick={generateCard} disabled={!tonWallet}
          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 bg-[var(--accent)] text-white">
          <PlusIcon size={12} color="white" /> Issue
        </button>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {virtualCards.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] flex items-center justify-center mx-auto mb-3 border border-[var(--border)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <p className="font-semibold">No cards</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              Issue a virtual card to pay for foreign services
            </p>
            <button onClick={generateCard} disabled={!tonWallet} className="btn btn-primary mt-4 max-w-[200px]">
              Issue Card
            </button>
          </div>
        ) : (
          virtualCards.map((card) => (
            <div key={card.id} className="card overflow-hidden">
              <div className="p-5 bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium"
                    style={{ color: card.status === 'frozen' ? 'var(--orange)' : 'var(--green)' }}>
                    {card.status === 'frozen' ? 'Frozen' : 'Active'}
                  </span>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <p className="text-xl font-mono tracking-widest mb-4">{card.card_number}</p>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-[8px] text-[var(--text-tertiary)]">CVV</p>
                    <p className="text-sm font-mono">{card.cvv}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-[var(--text-tertiary)]">EXPIRY</p>
                    <p className="text-sm font-mono">{card.expiry}</p>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-lg font-bold">${card.balance.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 flex gap-2 bg-[var(--bg-surface)] border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => { setTopUpCard(topUpCard === card.id ? null : card.id); haptic('light'); }}
                  className="flex-1 py-2 rounded-lg text-xs font-medium bg-[var(--green)/10] text-[var(--green)]">
                  Top Up
                </button>
                <button onClick={() => toggleFreeze(card.id)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium bg-[var(--bg-card)] text-[var(--text-secondary)]">
                  {card.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                </button>
                <button onClick={() => { navigator.clipboard.writeText(card.card_number); toastSuccess('Copied'); haptic('light'); }}
                  className="py-2 px-3 rounded-lg text-xs font-medium bg-[var(--bg-card)] text-[var(--text-tertiary)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>

              {topUpCard === card.id && (
                <div className="p-3 border-t bg-[var(--bg-surface)]" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex gap-2">
                    <input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)}
                      placeholder="Amount in TON" className="input flex-1 text-sm" />
                    <button onClick={() => handleTopUp(card.id)} disabled={!topUpAmount}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--green)] text-black">
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}