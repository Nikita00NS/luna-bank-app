import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon, RefreshIcon } from '../components/Icons';

export interface NFTItem {
  address: string;
  name: string;
  image: string;
  collection: string;
  description?: string;
  collectionAddress: string;
}

export default function NFTGalleryScreen() {
  const { go, back, tonWallet, nfts, setNfts } = useStore();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadNFTs = async () => {
    if (!tonWallet) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`https://tonapi.io/v2/accounts/${tonWallet}/nfts?limit=50&offset=0`);
      if (!response.ok) throw new Error('Failed to fetch NFTs');
      const data = await response.json();
      
      const nftItems: NFTItem[] = (data.nft_items || []).map((item: any) => ({
        address: item.address,
        name: item.metadata?.name || `NFT ${item.address.slice(0, 8)}`,
        image: item.metadata?.image || item.previews?.[0]?.url || '',
        collection: item.collection?.metadata?.name || 'Unknown Collection',
        description: item.metadata?.description,
        collectionAddress: item.collection?.address || '',
      }));
      
      setNfts(nftItems);
    } catch (err) {
      setError((err as Error).message);
      console.error('[NFT Gallery] Error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadNFTs(); }, [tonWallet]);

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">NFT Gallery</p>
        <button onClick={loadNFTs}
          className="w-9 h-9 rounded-lg flex items-center justify-center active:bg-[var(--bg-card)] transition-all"
          disabled={loading}>
          <RefreshIcon size={16} color={loading ? 'var(--accent)' : 'var(--text-tertiary)'} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="px-4 mt-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-48 w-full rounded-xl" />)}
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] flex items-center justify-center mx-auto mb-3 border border-[var(--border)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="font-semibold">Failed to load NFTs</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">{error}</p>
            <button onClick={loadNFTs} className="btn btn-primary mt-4 max-w-[200px]">Retry</button>
          </div>
        ) : nfts.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] flex items-center justify-center mx-auto mb-3 border border-[var(--border)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="font-semibold">No NFTs found</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              {tonWallet ? 'No NFTs on this address' : 'Connect wallet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {nfts.map((nft) => (
              <button key={nft.address}
                onClick={() => { setSelected(selected === nft.address ? null : nft.address); haptic('light'); }}
                className="card overflow-hidden active:scale-[0.97] transition-all text-left">
                <div className="aspect-square bg-[var(--bg-surface)] relative">
                  {nft.image ? (
                    <img src={nft.image} alt={nft.name} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : null}
                  {!nft.image && (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-[var(--text-tertiary)]">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{nft.name}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{nft.collection}</p>
                </div>
                {selected === nft.address && (
                  <div className="p-3 pt-0 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{nft.address}</p>
                    {nft.description && <p className="text-[11px] mt-1">{nft.description}</p>}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
