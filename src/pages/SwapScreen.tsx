import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../lib/store';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { formatCrypto, haptic } from '../lib/utils';
import { getStonFiQuote, buildStonFiSwapTx, getJettonInfo, getAllJettons } from '../lib/stonfi';
import { toNano } from '../lib/ton';
import { ArrowLeftIcon } from '../components/Icons';

export default function SwapScreen() {
  const { go, back, tokens, tonWallet } = useStore();
  const [tonConnectUI] = useTonConnectUI();
  
  const [fromToken, setFromToken] = useState(tokens[0]?.symbol || 'TON');
  const [toToken, setToToken] = useState(tokens[1]?.symbol || 'USDT');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  const fetchQuote = useCallback(async () => {
    if (!fromAmount || Number(fromAmount) <= 0) { 
      setToAmount(''); 
      setQuote(null);
      return; 
    }
    
    setLoading(true);
    setError('');
    
    try {
      const fromAsset = getJettonInfo(fromToken)?.address || 'native';
      const toAsset = getJettonInfo(toToken)?.address || 'native';
      const amount = toNano(Number(fromAmount)).toString();
      
      const quoteData = await getStonFiQuote(fromAsset, toAsset, amount, 0.5);
      if (quoteData) {
        setToAmount(quoteData.toAmount);
        setQuote(quoteData);
      }
    } catch (err) {
      setError('Failed to fetch quote');
    }
    setLoading(false);
  }, [fromAmount, fromToken, toToken]);

  useEffect(() => {
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  const handleSwap = () => { 
    setFromToken(toToken); 
    setToToken(fromToken); 
    setFromAmount(''); 
    setToAmount(''); 
    setQuote(null);
    haptic('light'); 
  };

  const handleExecute = async () => {
    if (!tonWallet) return;
    setSwapping(true); 
    setError('');
    
    try {
      const fromAsset = getJettonInfo(fromToken)?.address || 'native';
      const toAsset = getJettonInfo(toToken)?.address || 'native';
      const amount = toNano(Number(fromAmount)).toString();
      const minReceived = quote?.minReceived || quote?.toAmount;
      
      const tx = await buildStonFiSwapTx({
        fromAsset,
        toAsset,
        amount,
        minReceived: minReceived || '0',
        userWallet: tonWallet,
        slippage: 0.5,
      });
      
      if (tx) {
        const result = await tonConnectUI.sendTransaction(tx);
        if (result?.boc) { 
          setSuccess(true); 
          haptic('success'); 
          setTimeout(() => go('home'), 2000); 
        }
      } else {
        throw new Error('Failed to build swap transaction');
      }
    } catch (err: any) { 
      setError(err?.message || 'Swap failed'); 
      haptic('error'); 
    }
    setSwapping(false);
  };

  if (success) return (
    <div className="page safe-top flex flex-col items-center justify-center px-8">
      <div className="w-16 h-16 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p className="text-lg font-bold mb-1">Swapped!</p>
      <p className="text-sm text-[var(--text-secondary)]">{formatCrypto(Number(fromAmount))} {fromToken} → {formatCrypto(Number(toAmount))} {toToken}</p>
    </div>
  );

  const baseTokens = [
    { symbol: 'TON', name: 'Toncoin' },
    { symbol: 'USDT', name: 'Tether USD' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'NOT', name: 'Notcoin' },
    { symbol: 'DOGS', name: 'DOGS' },
    { symbol: 'HMSTR', name: 'Hamster Kombat' },
  ];

  const availableTokens = baseTokens
    .map(t => ({ ...t, ...getJettonInfo(t.symbol) }))
    .filter(t => t.address);

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Swap</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[var(--text-tertiary)]">You pay</p>
            <button onClick={() => { 
              const token = tokens.find(t => t.symbol === fromToken);
              setFromAmount(token?.balance.toString() || ''); 
              haptic('light'); 
            }} className="text-xs text-[var(--accent)]">
              Balance: {formatCrypto(tokens.find(t => t.symbol === fromToken)?.balance || 0)}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={fromAmount} 
              onChange={e => setFromAmount(e.target.value)} 
              placeholder="0.00" 
              className="input text-2xl font-bold mono pr-16" 
            />
            <select value={fromToken} onChange={e => setFromToken(e.target.value)} className="input px-3 py-1.5 rounded-lg text-sm font-medium w-auto">
              {availableTokens.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-center">
          <button onClick={handleSwap} className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center active:bg-[var(--bg-card-hover)] border-4 border-[var(--bg)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        </div>

        <div className="card p-4">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">You receive</p>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={toAmount} 
              readOnly 
              placeholder="0.00" 
              className="input text-2xl font-bold mono" 
            />
            <select value={toToken} onChange={e => setToToken(e.target.value)} className="input px-3 py-1.5 rounded-lg text-sm font-medium w-auto">
              {availableTokens.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
            </select>
          </div>
        </div>

        {quote && (
          <div className="card p-3 bg-[var(--bg-surface)]">
            <div className="flex justify-between text-xs text-[var(--text-tertiary)] mb-1">
              <span>Rate</span>
              <span>1 {fromToken} ≈ {quote.toAmount ? (Number(quote.toAmount) / Number(fromAmount || 1)).toFixed(6) : '-'} {toToken}</span>
            </div>
            <div className="flex justify-between text-xs text-[var(--text-tertiary)] mb-1">
              <span>Price Impact</span>
              <span className={quote.priceImpact > 1 ? 'text-[var(--red)]' : 'text-[var(--green)]'}>{quote.priceImpact.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
              <span>Fee</span>
              <span>{formatCrypto(Number(quote.fee) / 1e9)} TON</span>
            </div>
          </div>
        )}

        {loading && <p className="text-xs text-[var(--text-tertiary)] text-center">Finding best rate...</p>}
        {error && <div className="p-3 rounded-xl text-xs bg-[var(--red)/10] text-[var(--red)]">{error}</div>}

        <button 
          onClick={handleExecute} 
          disabled={!fromAmount || Number(fromAmount) <= 0 || swapping || !tonWallet} 
          className="btn btn-primary mt-2"
        >
          {swapping ? 'Swapping...' : `Swap ${fromAmount ? `${formatCrypto(Number(fromAmount))} ${fromToken}` : ''}`}
        </button>
      </div>
    </div>
  );
}