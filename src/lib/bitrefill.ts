const BITREFILL_API = 'https://www.bitrefill.com/api/v1';
const BITREFILL_API_KEY = import.meta.env.VITE_BITREFILL_API_KEY || '';

export interface BitrefillProduct {
  id: string;
  name: string;
  description: string;
  image_url: string;
  country: string;
  currency: string;
  denomination_type: 'fixed' | 'range';
  denominations: number[];
  min_amount: number;
  max_amount: number;
  category: string;
  brand: string;
}

export interface BitrefillOrderRequest {
  product_id: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'USDT' | 'TON' | 'BTC';
  email: string;
  wallet_address?: string;
  ref: string;
}

export interface BitrefillOrderResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  product_id: string;
  amount: number;
  currency: string;
  code?: string;
  instructions?: string;
  expires_at?: string;
  created_at: string;
}

export async function getBitrefillProducts(country: string = 'US'): Promise<BitrefillProduct[]> {
  try {
    const response = await fetch(`${BITREFILL_API}/products?country=${country}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    const data = await response.json();
    return data.data || [];
  } catch (err) {
    console.error('[Bitrefill] Fetch products error:', err);
    return [];
  }
}

export async function getBitrefillCategories(): Promise<string[]> {
  try {
    const response = await fetch(`${BITREFILL_API}/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    const data = await response.json();
    return data.data || [];
  } catch (err) {
    console.error('[Bitrefill] Fetch categories error:', err);
    return [];
  }
}

export async function getProductsByCategory(category: string, country: string = 'US'): Promise<BitrefillProduct[]> {
  try {
    const response = await fetch(`${BITREFILL_API}/products?country=${country}&category=${category}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    const data = await response.json();
    return data.data || [];
  } catch (err) {
    console.error('[Bitrefill] Fetch category products error:', err);
    return [];
  }
}

export async function createBitrefillOrder(
  request: BitrefillOrderRequest,
  apiKey: string = BITREFILL_API_KEY
): Promise<BitrefillOrderResponse | null> {
  try {
    const response = await fetch(`${BITREFILL_API}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create order');
    }

    const data = await response.json();
    return data.data || null;
  } catch (err) {
    console.error('[Bitrefill] Create order error:', err);
    return null;
  }
}

export async function getBitrefillOrderStatus(orderId: string, apiKey: string = BITREFILL_API_KEY): Promise<BitrefillOrderResponse | null> {
  try {
    const response = await fetch(`${BITREFILL_API}/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error('Failed to fetch order');
    const data = await response.json();
    return data.data || null;
  } catch (err) {
    console.error('[Bitrefill] Fetch order error:', err);
    return null;
  }
}

export const SERVICE_CATEGORIES = {
  streaming: 'video',
  gaming: 'gaming',
  software: 'software',
  social: 'social',
  cloud: 'cloud',
  vpn: 'vpn',
  mobile: 'mobile',
  gift_cards: 'gift-cards',
};

export function mapLunaCategoryToBitrefill(lunaCategory: string): string {
  return SERVICE_CATEGORIES[lunaCategory as keyof typeof SERVICE_CATEGORIES] || 'gift-cards';
}

export const POPULAR_SERVICES = [
  { id: 'netflix', name: 'Netflix', category: 'streaming', bitrefillSlug: 'netflix' },
  { id: 'youtube-premium', name: 'YouTube Premium', category: 'streaming', bitrefillSlug: 'youtube-premium' },
  { id: 'spotify', name: 'Spotify', category: 'streaming', bitrefillSlug: 'spotify' },
  { id: 'apple-music', name: 'Apple Music', category: 'streaming', bitrefillSlug: 'apple-music' },
  { id: 'disney-plus', name: 'Disney+', category: 'streaming', bitrefillSlug: 'disney-plus' },
  { id: 'hbo-max', name: 'HBO Max', category: 'streaming', bitrefillSlug: 'hbo-max' },
  { id: 'steam', name: 'Steam Wallet', category: 'gaming', bitrefillSlug: 'steam' },
  { id: 'ps-plus', name: 'PlayStation Plus', category: 'gaming', bitrefillSlug: 'playstation-plus' },
  { id: 'xbox-gp', name: 'Xbox Game Pass', category: 'gaming', bitrefillSlug: 'xbox-game-pass' },
  { id: 'nintendo', name: 'Nintendo Online', category: 'gaming', bitrefillSlug: 'nintendo' },
  { id: 'roblox', name: 'Roblox Premium', category: 'gaming', bitrefillSlug: 'roblox' },
  { id: 'chatgpt', name: 'ChatGPT Plus', category: 'software', bitrefillSlug: 'openai' },
  { id: 'canva', name: 'Canva Pro', category: 'software', bitrefillSlug: 'canva' },
  { id: 'adobe', name: 'Adobe CC', category: 'software', bitrefillSlug: 'adobe' },
  { id: 'm365', name: 'Microsoft 365', category: 'software', bitrefillSlug: 'microsoft-365' },
  { id: 'tg-premium', name: 'Telegram Premium', category: 'social', bitrefillSlug: 'telegram-premium' },
  { id: 'x-premium', name: 'X Premium', category: 'social', bitrefillSlug: 'twitter-blue' },
  { id: 'discord', name: 'Discord Nitro', category: 'social', bitrefillSlug: 'discord-nitro' },
  { id: 'icloud', name: 'iCloud+', category: 'cloud', bitrefillSlug: 'icloud' },
  { id: 'google-one', name: 'Google One', category: 'cloud', bitrefillSlug: 'google-one' },
  { id: 'dropbox', name: 'Dropbox Plus', category: 'cloud', bitrefillSlug: 'dropbox' },
  { id: 'nordvpn', name: 'NordVPN', category: 'vpn', bitrefillSlug: 'nordvpn' },
  { id: 'expressvpn', name: 'ExpressVPN', category: 'vpn', bitrefillSlug: 'expressvpn' },
  { id: 'surfshark', name: 'Surfshark', category: 'vpn', bitrefillSlug: 'surfshark' },
  { id: 'google-play', name: 'Google Play', category: 'mobile', bitrefillSlug: 'google-play' },
  { id: 'apple-app-store', name: 'Apple App Store', category: 'mobile', bitrefillSlug: 'apple-app-store' },
];