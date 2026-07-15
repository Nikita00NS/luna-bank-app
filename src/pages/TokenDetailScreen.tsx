import React from 'react';
import { useStore } from '../lib/store';
import { formatCrypto, haptic } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';

export default function TokenDetailScreen() {
  const { go, back, tokens, hiddenTokens, toggleHiddenToken } = useStore();

  const visibleTokens = tokens.filter(t => !hiddenTokens.includes(t.symbol));
  const hiddenTokensList = tokens.filter(t => hiddenTokens.includes(t.symbol));

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Token Manager</p>
      </div>

      <div className="px-4 mt-6 space-y-4">
        <div>
          <h3 className="text-xs font-medium text-[var(--text-tertiary)] mb-2">
            Visible ({visibleTokens.length})
          </h3>
          <div className="space-y-1">
            {visibleTokens.map((token) => (
              <div key={token.symbol} className="card p-3.5 flex items-center gap-3">
                {token.image ? (
                  <img src={token.image} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-[var(--bg-card)] text-[var(--text)]">
                    {token.symbol.slice(0, 2)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm">{token.symbol}</p>
                    {token.verified && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-lg bg-[var(--accent)/10] text-[var(--accent)]">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {formatCrypto(token.balance)} tokens
                  </p>
                </div>
                <button onClick={() => toggleHiddenToken(token.symbol)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[var(--red)/10] text-[var(--red)]">
                  Hide
                </button>
              </div>
            ))}
          </div>
        </div>

        {hiddenTokensList.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-[var(--text-tertiary)] mb-2">
              Hidden ({hiddenTokensList.length})
            </h3>
            <div className="space-y-1">
              {hiddenTokensList.map((token) => (
                <div key={token.symbol} className="card p-3.5 flex items-center gap-3 opacity-50">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-[var(--bg-card)]">
                    {token.symbol.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{token.symbol}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {formatCrypto(token.balance)} tokens
                    </p>
                  </div>
                  <button onClick={() => toggleHiddenToken(token.symbol)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[var(--accent)/10] text-[var(--accent)]">
                    Show
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tokens.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[var(--text-tertiary)]">No tokens</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Connect wallet to see assets</p>
          </div>
        )}
      </div>
    </div>
  );
}