import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbUpdateBalance } from '../lib/db';
import { ArrowLeftIcon, ImageIcon } from '../components/Icons';

const NFTS = [
  { id: 'n1', name: 'Golden Moon', img: '🌕', price: 500, rarity: 'Epic', col: 'Cards' },
  { id: 'n2', name: 'Dark Eclipse', img: '🌑', price: 200, rarity: 'Rare', col: 'Cards' },
  { id: 'n3', name: 'Stellar Nova', img: '⭐', price: 1000, rarity: 'Legendary', col: 'Cards' },
  { id: 'n4', name: 'Ocean Wave', img: '🌊', price: 100, rarity: 'Common', col: 'Cards' },
  { id: 'n5', name: 'Crypto King', img: '👑', price: 300, rarity: 'Rare', col: 'Avatars' },
  { id: 'n6', name: 'Diamond Hand', img: '💎', price: 800, rarity: 'Epic', col: 'Avatars' },
  { id: 'n7', name: 'Moon Walker', img: '🧑‍🚀', price: 2000, rarity: 'Legendary', col: 'Avatars' },
  { id: 'n8', name: 'Pixel Trader', img: '🤖', price: 150, rarity: 'Common', col: 'Avatars' },
];

const RC: Record<string, string> = { Common: 'text-gray-400 bg-gray-400/10', Rare: 'text-blue-400 bg-blue-400/10', Epic: 'text-purple-400 bg-purple-400/10', Legendary: 'text-yellow-400 bg-yellow-400/10' };
const RB: Record<string, string> = { Common: 'border-gray-500/20', Rare: 'border-blue-500/20', Epic: 'border-purple-500/30', Legendary: 'border-yellow-500/30 animate-glow' };

export default function NFTScreen() {
  const { user, accounts, go, updateBalance, addNotif } = useStore();
  const [tab, setTab] = useState<'market' | 'my'>('market');
  const [owned, setOwned] = useState<Set<string>>(new Set());
  if (!user) return null;
  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const balance = lncAcc?.balance || 0;

  const buy = (nft: typeof NFTS[0]) => {
    if (!lncAcc || balance < nft.price) { haptic('error'); return; }
    haptic('success');
    updateBalance(lncAcc.id, -nft.price);
    dbUpdateBalance(lncAcc.id, -nft.price).catch(() => {});
    setOwned(prev => new Set([...prev, nft.id]));
    addNotif({ id: uid(), title: '🎨 NFT куплен!', message: `${nft.name} (${nft.rarity})`, type: 'system', read: false, created_at: new Date().toISOString() });
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">NFT</h1>
        <div className="glass rounded-full px-3 py-1 text-xs font-bold mono">🌙{balance.toFixed(0)}</div>
      </div>
      <div className="px-5 flex gap-2 mb-3">
        {(['market', 'my'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'market' ? `🏪 Маркет (${NFTS.length})` : `💎 Мои (${owned.size})`}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {tab === 'market' && <div className="grid grid-cols-2 gap-2.5 animate-fade-in">
          {NFTS.map((nft, i) => {
            const isOwned = owned.has(nft.id);
            return (
              <button key={nft.id} onClick={() => { if (!isOwned) buy(nft); }}
                className={`rounded-2xl p-3 text-center border ${RB[nft.rarity]} bg-white/[0.02] active:scale-95 transition-all animate-slide-up ${isOwned ? 'opacity-50' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="text-5xl mb-2 py-2">{nft.img}</div>
                <p className="font-bold text-xs truncate">{nft.name}</p>
                <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full mt-1 font-semibold ${RC[nft.rarity]}`}>{nft.rarity}</span>
                <p className="text-sm font-extrabold mono mt-1.5">{isOwned ? '✓' : `🌙${nft.price}`}</p>
              </button>
            );
          })}
        </div>}
        {tab === 'my' && <div className="animate-fade-in">
          {owned.size === 0 ? <div className="text-center py-16"><ImageIcon size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" /><p className="text-white/35">Нет NFT</p></div>
          : <div className="grid grid-cols-2 gap-2.5">{NFTS.filter(n => owned.has(n.id)).map((nft, i) => (
            <div key={nft.id} className={`rounded-2xl p-4 text-center border ${RB[nft.rarity]} bg-white/[0.03] animate-scale-in`} style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="text-5xl mb-2 py-2">{nft.img}</div>
              <p className="font-bold text-sm">{nft.name}</p>
              <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full mt-1 font-semibold ${RC[nft.rarity]}`}>{nft.rarity}</span>
            </div>
          ))}</div>}
        </div>}
      </div>
    </div>
  );
}
