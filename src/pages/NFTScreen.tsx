import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbUpdateBalance, dbCreateNotification } from '../lib/sync';

interface NFTItem {
  id: string;
  name: string;
  collection: string;
  image: string;
  price: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  owned: boolean;
}

const COLLECTIONS = [
  {
    name: 'Luna Cards',
    desc: 'Эксклюзивные банковские карты',
    items: [
      { id: 'nft1', name: 'Golden Moon', image: '🌕', price: 500, rarity: 'Epic' as const },
      { id: 'nft2', name: 'Dark Eclipse', image: '🌑', price: 200, rarity: 'Rare' as const },
      { id: 'nft3', name: 'Stellar Nova', image: '⭐', price: 1000, rarity: 'Legendary' as const },
      { id: 'nft4', name: 'Ocean Wave', image: '🌊', price: 100, rarity: 'Common' as const },
    ],
  },
  {
    name: 'Luna Avatars',
    desc: 'Уникальные аватарки для профиля',
    items: [
      { id: 'nft5', name: 'Crypto King', image: '👑', price: 300, rarity: 'Rare' as const },
      { id: 'nft6', name: 'Diamond Hand', image: '💎', price: 800, rarity: 'Epic' as const },
      { id: 'nft7', name: 'Moon Walker', image: '🧑‍🚀', price: 2000, rarity: 'Legendary' as const },
      { id: 'nft8', name: 'Pixel Trader', image: '🤖', price: 150, rarity: 'Common' as const },
    ],
  },
  {
    name: 'City Achievements',
    desc: 'Награды за достижения в Luna City',
    items: [
      { id: 'nft9', name: 'First Million', image: '🏆', price: 5000, rarity: 'Legendary' as const },
      { id: 'nft10', name: 'Business Tycoon', image: '🏢', price: 500, rarity: 'Epic' as const },
      { id: 'nft11', name: 'Speed Runner', image: '⚡', price: 250, rarity: 'Rare' as const },
      { id: 'nft12', name: 'Early Bird', image: '🐦', price: 100, rarity: 'Common' as const },
    ],
  },
];

const RARITY_COLORS: Record<string, string> = {
  Common: 'text-gray-400 bg-gray-400/10',
  Rare: 'text-blue-400 bg-blue-400/10',
  Epic: 'text-purple-400 bg-purple-400/10',
  Legendary: 'text-yellow-400 bg-yellow-400/10',
};

const RARITY_BORDER: Record<string, string> = {
  Common: 'border-gray-500/20',
  Rare: 'border-blue-500/20',
  Epic: 'border-purple-500/30',
  Legendary: 'border-yellow-500/30 animate-glow',
};

export default function NFTScreen() {
  const { user, accounts, go, updateBalance, addNotif } = useStore();
  const [tab, setTab] = useState<'market' | 'my'>('market');
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [selNFT, setSelNFT] = useState<any>(null);

  if (!user) return null;
  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const balance = lncAcc?.balance || 0;

  const buyNFT = (nft: any) => {
    if (!lncAcc || balance < nft.price) { haptic('error'); return; }
    haptic('success');
    updateBalance(lncAcc.id, -nft.price);
    dbUpdateBalance(lncAcc.id, -nft.price).catch(() => {});
    setOwnedIds(prev => new Set([...prev, nft.id]));
    setSelNFT(null);

    addNotif({
      id: uid(), title: '🎨 NFT куплен!',
      message: `${nft.name} (${nft.rarity}) за ◎${nft.price}`,
      type: 'system', read: false, created_at: new Date().toISOString(),
    });
  };

  const allNFTs = COLLECTIONS.flatMap(c => c.items.map(i => ({ ...i, collection: c.name })));
  const myNFTs = allNFTs.filter(n => ownedIds.has(n.id));

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">🎨 NFT</h1>
        <div className="glass rounded-full px-3 py-1 text-xs font-bold tabular-nums">◎{balance.toFixed(0)}</div>
      </div>

      <div className="px-5 flex gap-2 mb-3">
        {(['market', 'my'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'market' ? `🏪 Маркет (${allNFTs.length})` : `💎 Мои (${myNFTs.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {tab === 'market' && (
          <div className="animate-fade-in">
            {COLLECTIONS.map((col, ci) => (
              <div key={col.name} className="mb-6">
                <div className="mb-3">
                  <h3 className="font-extrabold text-base">{col.name}</h3>
                  <p className="text-xs text-white/30">{col.desc}</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {col.items.map((nft, i) => {
                    const owned = ownedIds.has(nft.id);
                    return (
                      <button key={nft.id} onClick={() => { haptic('light'); setSelNFT({ ...nft, collection: col.name }); }}
                        className={`rounded-2xl p-3 text-center border ${RARITY_BORDER[nft.rarity]} bg-white/[0.02] active:scale-95 transition-all animate-slide-up ${owned ? 'opacity-50' : ''}`}
                        style={{ animationDelay: `${(ci * 4 + i) * 0.05}s` }}>
                        <div className="text-5xl mb-2 py-2">{nft.image}</div>
                        <p className="font-bold text-xs truncate">{nft.name}</p>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full mt-1 font-semibold ${RARITY_COLORS[nft.rarity]}`}>
                          {nft.rarity}
                        </span>
                        <p className="text-sm font-extrabold tabular-nums mt-1.5">
                          {owned ? '✓ Куплен' : `◎${nft.price}`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'my' && (
          <div className="animate-fade-in">
            {myNFTs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-5xl mb-3">🎨</p>
                <p className="text-white/35 mb-2">Нет NFT</p>
                <button onClick={() => setTab('market')} className="text-sm text-white/40 underline">Перейти в маркет</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {myNFTs.map((nft, i) => (
                  <div key={nft.id} className={`rounded-2xl p-4 text-center border ${RARITY_BORDER[nft.rarity]} bg-white/[0.03] animate-scale-in`}
                    style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="text-5xl mb-2 py-2">{nft.image}</div>
                    <p className="font-bold text-sm">{nft.name}</p>
                    <p className="text-[10px] text-white/25">{nft.collection}</p>
                    <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full mt-1 font-semibold ${RARITY_COLORS[nft.rarity]}`}>
                      {nft.rarity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* NFT Detail Modal */}
      {selNFT && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in" onClick={() => setSelNFT(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-lg bg-[#0c0c0c] rounded-t-3xl animate-slide-up border-t border-white/5">
            <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full bg-white/15" /></div>
            <div className="px-6 pb-8">
              <div className={`rounded-2xl p-8 text-center border ${RARITY_BORDER[selNFT.rarity]} bg-white/[0.02] mb-4`}>
                <p className="text-7xl mb-3">{selNFT.image}</p>
                <h3 className="font-extrabold text-xl">{selNFT.name}</h3>
                <p className="text-xs text-white/30 mt-1">{selNFT.collection}</p>
                <span className={`inline-block text-xs px-2 py-1 rounded-full mt-2 font-semibold ${RARITY_COLORS[selNFT.rarity]}`}>
                  {selNFT.rarity}
                </span>
              </div>

              <div className="glass rounded-xl p-3 mb-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-white/35">Цена</span>
                  <span className="font-bold tabular-nums">◎{selNFT.price} LNC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/35">≈ USD</span>
                  <span className="tabular-nums">${(selNFT.price * 0.05).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/35">Ваш баланс</span>
                  <span className={`tabular-nums ${balance >= selNFT.price ? 'text-emerald-400' : 'text-red-400'}`}>
                    ◎{balance.toFixed(2)}
                  </span>
                </div>
              </div>

              {ownedIds.has(selNFT.id) ? (
                <div className="btn-secondary w-full text-center text-emerald-400">✓ Уже куплен</div>
              ) : (
                <button onClick={() => buyNFT(selNFT)} disabled={balance < selNFT.price}
                  className="btn-primary w-full text-base">
                  {balance >= selNFT.price ? `Купить за ◎${selNFT.price}` : 'Недостаточно средств'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
