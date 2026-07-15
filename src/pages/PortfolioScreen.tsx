import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { getTop, CoinData } from '../lib/coingecko';
import { formatUsd, haptic } from '../lib/utils';
import { RefreshIcon, SearchIcon } from '../components/Icons';
import PriceChart from '../components/PriceChart';

export default function PortfolioScreen() {
  const { go, tokens } = useStore();
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);

  const fetchCoins = async () => {
    setLoading(true);
    const data = await getTop(30);
    setCoins(data);
    setLoading(false);
  };

  useEffect(() => { fetchCoins(); }, []);

  const filteredCoins = useMemo(() =>
    coins.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase())
    ), [coins, search]
  );

  const userPortfolio = useMemo(() =>
    tokens.map(t => {
      const marketCoin = coins.find(c => c.symbol.toLowerCase() === t.symbol.toLowerCase());
      return {
        ...t,
        priceUsd: marketCoin?.current_price || t.priceUsd || 0,
        priceChange24h: marketCoin?.price_change_24h || t.priceChange24h || 0,
        marketCap: marketCoin?.market_cap || 0,
        image: marketCoin?.image || '',
      };
    }), [tokens, coins]
  );

  const totalPortfolioValue = useMemo(() =>
    userPortfolio.reduce((s, t) => s + t.balance * t.priceUsd, 0), [userPortfolio]
  );

  return (
    <div className="page safe-top">
      <div className="header">
        <p className="header-title">Portfolio</p>
        <button onClick={fetchCoins}
          className="w-9 h-9 rounded-lg flex items-center justify-center active:bg-[var(--bg-card)] transition-all">
          <RefreshIcon size={16} color={loading ? 'var(--accent)' : 'var(--text-tertiary)'} />
        </button>
      </div>

      <div className="px-4 mt-2">
        <div className="relative">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coins..." className="input pl-10 text-sm" />
          <SearchIcon size={16} color="var(--text-tertiary)" className="absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {userPortfolio.length > 0 && (
        <section className="px-4 mt-5">
          <h3 className="text-xs font-medium text-[var(--text-tertiary)] mb-2">My Portfolio</h3>
          <div className="card p-4">
            <p className="text-2xl font-bold mono">{formatUsd(totalPortfolioValue)}</p>
            <div className="mt-3 space-y-2">
              {userPortfolio.map((t) => (
                <div key={t.symbol} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    {t.image ? (
                      <img src={t.image} alt="" className="w-5 h-5 rounded-full" />
                    ) : null}
                    <span className="text-sm font-medium">{t.symbol}</span>
                    <span className="text-xs text-[var(--text-tertiary)]">{t.balance.toFixed(4)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${(t.balance * t.priceUsd).toFixed(2)}</p>
                    {t.priceChange24h !== 0 && (
                      <p className={`text-[10px] ${t.priceChange24h >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                        {t.priceChange24h >= 0 ? '+' : ''}{t.priceChange24h.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 mt-5">
        <h3 className="text-xs font-medium text-[var(--text-tertiary)] mb-3">Market <span className="text-[10px]">CoinGecko</span></h3>

        {loading && coins.length === 0 ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-14 w-full" />)}</div>
        ) : (
          <div className="space-y-1">
            {filteredCoins.map((coin) => {
              const isSelected = selectedCoin === coin.id;
              return (
                <div key={coin.id}>
                  <button onClick={() => { setSelectedCoin(isSelected ? null : coin.id); haptic('light'); }}
                    className="w-full card p-3 flex items-center gap-3 active:scale-[0.98] transition-all">
                    {coin.image ? (
                      <img src={coin.image} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[var(--bg-card)]">
                        {coin.symbol.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-sm">{coin.symbol.toUpperCase()}</p>
                      <p className="text-[11px] truncate text-[var(--text-tertiary)]">{coin.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">${coin.current_price.toLocaleString()}</p>
                      <p className={`text-[11px] ${coin.price_change_24h >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                        {coin.price_change_24h >= 0 ? '+' : ''}{coin.price_change_24h.toFixed(2)}%
                      </p>
                    </div>
                  </button>
                  {isSelected && (
                    <div className="card p-3 mt-1 mb-1 flex justify-center">
                      <PriceChart coinId={coin.id} days={7} width={280} height={80} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}