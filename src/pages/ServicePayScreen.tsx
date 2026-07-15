import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { buildTransfer } from '../lib/ton';
import { formatCrypto, haptic } from '../lib/utils';
import { createBitrefillOrder } from '../lib/bitrefill';
import { ArrowLeftIcon, CheckIcon } from '../components/Icons';
import { toastSuccess, toastError } from '../lib/toast';

const PERIODS = [
  { id: '1m', label: '1 Month', multiplier: 1 },
  { id: '3m', label: '3 Months', multiplier: 3, discount: 0.05 },
  { id: '12m', label: '12 Months', multiplier: 12, discount: 0.15 },
];

export default function ServicePayScreen() {
  const { go, back, tonWallet, addPurchase } = useStore();
  const [tonConnectUI] = useTonConnectUI();
  const svc = (window as any).__luna_service as any;

  const [period, setPeriod] = useState('1m');
  const [payMethod, setPayMethod] = useState<'TON' | 'USDT'>('USDT');
  const [step, setStep] = useState<'select' | 'confirm' | 'paying' | 'success'>('select');
  const [txHash, setTxHash] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const periodData = PERIODS.find(p => p.id === period)!;
  const basePrice = svc?.min_amount || svc?.denominations?.[0] || 0;
  const totalUsd = basePrice * periodData.multiplier * (1 - (periodData.discount || 0));
  const tonPrice = 6.85;
  const totalTon = totalUsd / tonPrice;
  const totalUsdt = totalUsd;
  const commission = 0.05;
  const totalWithCommission = totalUsd * (1 + commission);

  const handlePay = async () => {
    if (!tonWallet || !svc) return;
    setStep('paying');
    setError('');
    setLoading(true);
    
    try {
      const bitrefillApiKey = import.meta.env.VITE_BITREFILL_API_KEY;
      if (bitrefillApiKey && svc.id) {
        const order = await createBitrefillOrder({
          product_id: svc.id,
          amount: totalWithCommission,
          currency: payMethod === 'TON' ? 'TON' : 'USDT',
          email: 'user@lunawallet.app',
          wallet_address: tonWallet,
          ref: `luna-${Date.now()}`,
        }, bitrefillApiKey);
        
        if (order) {
          setOrderId(order.id);
          setActivationCode(order.code || `LUNA-${svc.id.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
        }
      }
      
      const amount = payMethod === 'TON' ? totalTon : totalUsdt;
      const tx = buildTransfer(
        'UQA9IgVuB-8GUVRttmh4zjhg5yFYXBMhGHWyt7ASJF1VuZJD',
        amount,
        `Payment ${svc.name} ${period}`
      );
      
      const result = await tonConnectUI.sendTransaction(tx);
      if (result?.boc) {
        setTxHash(result.boc);
        if (!activationCode) {
          setActivationCode(`${svc.id.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
        }
        setStep('success');
        haptic('success');
        toastSuccess('Paid!', `${svc.name} — ${periodData.label}`);
        
        addPurchase({
          id: crypto.randomUUID(), user_id: 'user',
          service_name: svc.name, service_category: svc.category, period: periodData.label,
          price_usd: totalWithCommission, price_crypto: amount, crypto_currency: payMethod,
          activation_code: activationCode, status: 'active', tx_hash: result.boc,
          created_at: new Date().toISOString(), expires_at: new Date(Date.now() + (periodData.multiplier * 30 * 86400000)).toISOString(),
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Payment failed');
      setStep('confirm');
      haptic('error');
    }
    setLoading(false);
  };

  if (!svc) {
    return <div className="page safe-top flex flex-col items-center justify-center px-8">
      <p className="text-lg mb-4">No service selected</p>
      <button onClick={() => back()} className="btn btn-primary">Back</button>
    </div>;
  }

  if (step === 'success') {
    return (
      <div className="page safe-top flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-[var(--green)/10]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Paid!</h2>
        <p className="text-lg font-semibold mb-1">{svc.name}</p>
        <p className="text-sm text-[var(--text-tertiary)] mb-6">{periodData.label}</p>

        <div className="w-full card p-4 space-y-3">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Activation Code</p>
          <div className="bg-[var(--bg-surface)] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold mono tracking-wider">{activationCode}</p>
          </div>
          {orderId && (
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Order ID: {orderId}
            </p>
          )}
          <p className="text-[10px] text-[var(--text-tertiary)]">
            Copy the code and activate in the service.
          </p>
        </div>

        <div className="flex gap-3 w-full mt-6">
          <button onClick={() => { navigator.clipboard.writeText(activationCode); toastSuccess('Copied'); haptic('light'); }}
            className="btn btn-secondary flex-1">Copy Code</button>
          <button onClick={() => go('services')} className="btn btn-primary flex-1">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); step === 'confirm' ? setStep('select') : back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">{svc.name}</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-2xl text-[var(--text-secondary)]">
            {svc.image_url ? (
              <img src={svc.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-bold text-lg">{svc.name}</p>
            <p className="text-xs text-[var(--text-tertiary)]">{svc.description || svc.category}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="section-title">Period</p>
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => { setPeriod(p.id); haptic('light'); }}
                className={`flex-1 p-3 rounded-xl text-center transition-all active:scale-95 ${period === p.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
                <p className="text-sm font-semibold">{p.label}</p>
                <p className="text-[10px] mt-0.5 opacity-70">${(basePrice * p.multiplier * (1 - (p.discount || 0))).toFixed(2)}</p>
                {p.discount ? <p className="text-[9px] text-[var(--green)] mt-0.5">-{(p.discount * 100).toFixed(0)}%</p> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="section-title">Payment Method</p>
          <div className="flex gap-2">
            {(['USDT', 'TON'] as const).map(m => (
              <button key={m} onClick={() => { setPayMethod(m); haptic('light'); }}
                className={`flex-1 p-3 rounded-xl text-center transition-all active:scale-95 ${payMethod === m ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
                <p className="font-semibold">{m}</p>
                <p className="text-[10px] mt-0.5 opacity-70">
                  {m === 'USDT' ? `$${totalUsdt.toFixed(2)}` : `${totalTon.toFixed(4)} TON`}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Price</span><span>${basePrice.toFixed(2)} × {periodData.multiplier}</span></div>
          {periodData.discount ? (
            <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Discount</span><span className="text-[var(--green)]">-{(periodData.discount * 100).toFixed(0)}%</span></div>
          ) : null}
          <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Service Fee</span><span>{(commission * 100).toFixed(0)}%</span></div>
          <div className="divider" />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span>{payMethod === 'USDT' ? `$${totalWithCommission.toFixed(2)} USDT` : `${(totalWithCommission / tonPrice).toFixed(4)} TON`}</span>
          </div>
        </div>

        {step === 'confirm' ? (
          <div className="space-y-3">
            {error && <div className="p-3 rounded-xl text-xs bg-[var(--red)/10] text-[var(--red)]">{error}</div>}
            <div className="p-3 rounded-xl text-xs bg-[var(--orange)/10] text-[var(--orange)]">
              By confirming, you agree to the service terms. Activation code appears after payment.
            </div>
            <button onClick={handlePay} disabled={!tonWallet || loading}
              className="btn btn-primary w-full flex items-center justify-center gap-2">
              {loading ? 'Processing...' : payMethod === 'USDT' ? `Pay $${totalWithCommission.toFixed(2)} USDT` : `Pay ${(totalWithCommission / tonPrice).toFixed(4)} TON`}
            </button>
          </div>
        ) : (
          <button onClick={() => { setStep('confirm'); haptic('medium'); }} className="btn btn-primary w-full">
            Continue
          </button>
        )}
      </div>
    </div>
  );
}