/**
 * Luna Wallet v2 — CoinGecko real-time prices
 */

const API = 'https://api.coingecko.com/api/v3';

interface CacheEntry { data: any; ts: number }
const cache: Record<string, CacheEntry> = {};
const TTL = 120_000; // 2 min

async function fetchCached(url: string): Promise<any> {
  const c = cache[url];
  if (c && Date.now() - c.ts < TTL) return c.data;
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) { if (c) return c.data; return null; }
    const d = await r.json();
    cache[url] = { data: d, ts: Date.now() };
    return d;
  } catch { return c?.data || null; }
}

export interface CoinData {
  id: string; symbol: string; name: string;
  current_price: number; price_change_24h: number;
  market_cap: number; total_volume: number;
  high_24h: number; low_24h: number; image: string;
}

export async function getPrices(ids: string[]): Promise<Record<string, CoinData>> {
  if (!ids.length) return {};
  const url = `${API}/coins/markets?vs_currency=usd&ids=${ids.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage_24h=true`;
  const data = await fetchCached(url);
  if (!Array.isArray(data)) return {};
  const r: Record<string, CoinData> = {};
  for (const c of data) r[c.id] = {
    id: c.id, symbol: c.symbol, name: c.name,
    current_price: c.current_price || 0, price_change_24h: c.price_change_percentage_24h || 0,
    market_cap: c.market_cap || 0, total_volume: c.total_volume || 0,
    high_24h: c.high_24h || 0, low_24h: c.low_24h || 0, image: c.image || '',
  };
  return r;
}

export async function getPrice(id: string): Promise<CoinData | null> {
  const p = await getPrices([id]);
  return p[id] || null;
}

export async function getTonPrice(): Promise<number> {
  const p = await getPrice('the-open-network');
  return p?.current_price || 0;
}

export async function getTop(limit: number = 30): Promise<CoinData[]> {
  const url = `${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage_24h=true`;
  const data = await fetchCached(url);
  if (!Array.isArray(data)) return [];
  return data.map((c: any) => ({
    id: c.id, symbol: c.symbol, name: c.name,
    current_price: c.current_price || 0, price_change_24h: c.price_change_percentage_24h || 0,
    market_cap: c.market_cap || 0, total_volume: c.total_volume || 0,
    high_24h: c.high_24h || 0, low_24h: c.low_24h || 0, image: c.image || '',
  }));
}

export async function getHistory(id: string, days: number = 7): Promise<{ prices: [number, number][] } | null> {
  const url = `${API}/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
  return await fetchCached(url);
}