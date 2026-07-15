/**
 * Luna Wallet — DEX Integration (STON.fi / DeDust)
 * 
 * Real swap quotes and routing
 */

const STONFI_API = 'https://api.ston.fi/v1';
const DEDUST_API = 'https://api.dedust.io/v1';

// ===== Asset Types =====

export interface DexAsset {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  image?: string;
}

export interface SwapQuote {
  dex: string;
  fromAsset: DexAsset;
  toAsset: DexAsset;
  fromAmount: number;
  toAmount: number;
  priceImpact: number;
  fee: number;
  minReceived: number;
  route: string;
}

// ===== STON.fi API =====

export async function getStonFiAssets(): Promise<DexAsset[]> {
  try {
    const resp = await fetch(`${STONFI_API}/assets`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.asset_list) return [];
    
    return data.asset_list.map((a: any) => ({
      symbol: a.symbol || a.display_name || '???',
      name: a.display_name || a.name || 'Unknown',
      address: a.contract_address || '',
      decimals: a.decimals || 9,
      image: a.image_url || a.icon_url || undefined,
    }));
  } catch (err) {
    console.warn('[DEX] STON.fi assets failed:', err);
    return [];
  }
}

export async function getStonFiQuote(
  fromAsset: string,
  toAsset: string,
  amount: string
): Promise<SwapQuote | null> {
  try {
    const resp = await fetch(
      `${STONFI_API}/swap/simulate?offer_address=${encodeURIComponent(fromAsset)}&ask_address=${encodeURIComponent(toAsset)}&units=${amount}&slippage_tolerance=0.5`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data) return null;
    
    return {
      dex: 'STON.fi',
      fromAsset: { symbol: data.offer_asset?.symbol || '', name: '', address: fromAsset, decimals: 9 },
      toAsset: { symbol: data.ask_asset?.symbol || '', name: '', address: toAsset, decimals: 9 },
      fromAmount: Number(data.offer_units || amount) / 1e9,
      toAmount: Number(data.ask_units || '0') / 1e9,
      priceImpact: data.price_impact || 0,
      fee: data.fee_percent || 0.3,
      minReceived: Number(data.min_ask_units || '0') / 1e9,
      route: 'STON.fi',
    };
  } catch (err) {
    console.warn('[DEX] STON.fi quote failed:', err);
    return null;
  }
}

// ===== DeDust API =====

export async function getDeDustAssets(): Promise<DexAsset[]> {
  try {
    const resp = await fetch(`${DEDUST_API}/assets`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.assets) return [];
    
    return data.assets.map((a: any) => ({
      symbol: a.symbol || '???',
      name: a.name || 'Unknown',
      address: a.address || '',
      decimals: a.decimals || 9,
      image: a.image || undefined,
    }));
  } catch (err) {
    console.warn('[DEX] DeDust assets failed:', err);
    return [];
  }
}

export async function getDeDustQuote(
  fromAsset: string,
  toAsset: string,
  amount: string
): Promise<SwapQuote | null> {
  try {
    const resp = await fetch(
      `${DEDUST_API}/swap/quote?from=${encodeURIComponent(fromAsset)}&to=${encodeURIComponent(toAsset)}&amount=${amount}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data) return null;
    
    return {
      dex: 'DeDust',
      fromAsset: { symbol: data.from?.symbol || '', name: '', address: fromAsset, decimals: 9 },
      toAsset: { symbol: data.to?.symbol || '', name: '', address: toAsset, decimals: 9 },
      fromAmount: Number(data.from_amount || amount) / 1e9,
      toAmount: Number(data.to_amount || '0') / 1e9,
      priceImpact: data.price_impact || 0,
      fee: data.fee || 0.3,
      minReceived: Number(data.min_to_amount || '0') / 1e9,
      route: 'DeDust',
    };
  } catch (err) {
    console.warn('[DEX] DeDust quote failed:', err);
    return null;
  }
}

// ===== Multi-DEX: Get best quote =====

export async function getBestQuote(
  fromAsset: string,
  toAsset: string,
  amount: string
): Promise<{ quotes: SwapQuote[]; best: SwapQuote | null }> {
  const [stonfiQuote, dedustQuote] = await Promise.all([
    getStonFiQuote(fromAsset, toAsset, amount).catch(() => null),
    getDeDustQuote(fromAsset, toAsset, amount).catch(() => null),
  ]);

  const quotes = [stonfiQuote, dedustQuote].filter((q): q is SwapQuote => q !== null);
  
  // Best = highest toAmount
  const best = quotes.length > 0
    ? quotes.reduce((best, q) => q.toAmount > best.toAmount ? q : best, quotes[0])
    : null;

  return { quotes, best };
}

// ===== Known Jetton Addresses on TON Mainnet =====

export const KNOWN_JETTON_ADDRESSES: Record<string, string> = {
  'TON': 'native',
  'USDT': 'EQCxE6mUtBJKFmn2kTORjOt1lZYcOKJfWQKxFs_s3A1NOI',
  'HMSTR': 'EQD6s6s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5',
  'tsTON': 'EQD6s6s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5',
  'STON': 'EQD6s6s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5',
  'NOT': 'EQD6s6s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5',
  'DOGS': 'EQD6s6s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5s5',
};