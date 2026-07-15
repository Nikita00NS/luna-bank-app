import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { getBitrefillProducts, getProductsByCategory, POPULAR_SERVICES, mapLunaCategoryToBitrefill } from '../lib/bitrefill';
import { SearchIcon, ChevronRightIcon } from '../components/Icons';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg> },
  { id: 'streaming', label: 'Streaming', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg> },
  { id: 'gaming', label: 'Gaming', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="2" x2="6.01" y2="2" /><line x1="10" y1="2" x2="10.01" y2="2" /><line x1="14" y1="2" x2="14.01" y2="2" /><line x1="18" y1="2" x2="18.01" y2="2" /><line x1="2" y1="6" x2="2.01" y2="6" /><line x1="18" y1="6" x2="18.01" y2="6" /><line x1="2" y1="10" x2="2.01" y2="10" /><line x1="6" y1="10" x2="6.01" y2="10" /><line x1="10" y1="10" x2="10.01" y2="10" /><line x1="14" y1="10" x2="14.01" y2="10" /><line x1="2" y1="14" x2="2.01" y2="14" /><line x1="6" y1="14" x2="6.01" y2="14" /><line x1="10" y1="14" x2="10.01" y2="14" /><line x1="14" y1="14" x2="14.01" y2="14" /><line x1="18" y1="14" x2="18.01" y2="14" /><line x1="2" y1="18" x2="2.01" y2="18" /><line x1="18" y1="18" x2="18.01" y2="18" /><line x1="2" y1="22" x2="2.01" y2="22" /><line x1="6" y1="22" x2="6.01" y2="22" /><line x1="10" y1="22" x2="10.01" y2="22" /><line x1="14" y1="22" x2="14.01" y2="22" /><line x1="18" y1="22" x2="18.01" y2="22" /></svg> },
  { id: 'software', label: 'Software', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg> },
  { id: 'social', label: 'Social', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg> },
  { id: 'cloud', label: 'Cloud', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg> },
  { id: 'vpn', label: 'VPN', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg> },
];

export default function ServicesScreen() {
  const { go, tonWallet, purchases } = useStore();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getBitrefillProducts('US');
      setProducts(data);
    } catch (err) {
      console.error('[Services] Load error:', err);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = products;
    if (category !== 'all') {
      list = list.filter(p => mapLunaCategoryToBitrefill(p.category) === category || p.category === category);
    }
    if (search) {
      list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  }, [products, category, search]);

  const activePurchases = purchases.filter(p => p.status === 'active');

  return (
    <div className="page safe-top">
      <div className="header">
        <p className="header-title">Services</p>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => { haptic('light'); go('service-history'); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center active:bg-[var(--bg-card)] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button onClick={() => { haptic('light'); go('virtual-cards'); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center active:bg-[var(--bg-card)] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </button>
        </div>
      </div>

      {activePurchases.length > 0 && (
        <div className="px-4 mb-3">
          <button onClick={() => go('service-history')}
            className="w-full p-3 rounded-xl flex items-center gap-3 active:scale-[0.98] transition-all bg-[var(--green)/10]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[var(--green)]">
                {activePurchases.length} active subscription{activePurchases.length > 1 ? 's' : ''}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">Tap to manage</p>
            </div>
            <ChevronRightIcon size={16} color="var(--green)" />
          </button>
        </div>
      )}

      <div className="px-4 mb-3">
        <div className="relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search services..." className="input pl-10 text-sm" />
          <SearchIcon size={16} color="var(--text-tertiary)" className="absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="px-4 mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => { setCategory(c.id); haptic('light'); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${category === c.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-2 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)]" />
              <div className="h-4 w-3/4 bg-[var(--bg-surface)] rounded" />
              <div className="h-3 w-1/2 bg-[var(--bg-surface)] rounded" />
              <div className="h-4 w-1/3 bg-[var(--bg-surface)] rounded" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-2 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] flex items-center justify-center mx-auto mb-3 border border-[var(--border)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <p className="font-semibold">No services found</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">Try a different category or search term</p>
          </div>
        ) : (
          filtered.map((product) => (
            <button key={product.id} onClick={() => {
              if (!tonWallet) { haptic('error'); return; }
              haptic('light');
              (window as any).__luna_service = {
                id: product.id,
                name: product.name,
                cat: product.category,
                price: product.denominations?.[0] || product.min_amount,
                desc: product.description,
                image: product.image_url,
                productData: product,
              };
              go('service-pay');
            }}
              className="card p-4 text-left active:scale-[0.97] transition-all">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center mb-2">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>
              <p className="font-semibold text-sm truncate">{product.name}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 truncate">{product.brand || product.category}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold mono text-sm">${product.min_amount?.toFixed(2) || product.denominations?.[0]?.toFixed(2) || '0.00'}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-lg bg-[var(--accent)/10] text-[var(--accent)]">
                  {product.currency || 'USD'}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {!tonWallet && (
        <div className="px-4 mt-6">
          <div className="p-6 rounded-xl text-center bg-[var(--bg-card)] border border-[var(--border)]">
            <p className="text-sm font-medium">Connect Wallet</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">TON wallet required to pay for services</p>
          </div>
        </div>
      )}
    </div>
  );
}