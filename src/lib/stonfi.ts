import { toNano } from '../lib/ton';

const STONFI_API = 'https://api.ston.fi/v1';

export interface SwapQuote {
  fromAmount: string;
  toAmount: string;
  priceImpact: number;
  fee: string;
  route: string[];
  minReceived: string;
}

export interface SwapTxParams {
  fromAsset: string;
  toAsset: string;
  amount: string;
  minReceived: string;
  userWallet: string;
  slippage: number;
}

const KNOWN_JETTONS: Record<string, { address: string; symbol: string; decimals: number; name: string; image?: string }> = {
  TON: { address: 'native', symbol: 'TON', decimals: 9, name: 'Toncoin' },
  USDT: { address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', symbol: 'USDT', decimals: 6, name: 'Tether USD' },
  USDC: { address: 'EQB_MPwrd1G6WKNkLz_VuKfZsCiCD2K62j3o0OPjE3A9J5i_', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  NOT: { address: 'EQAvlWFDxGF2lXm67y4yzC17lYK4ZXAliWVeCKg8e5VBMF0e', symbol: 'NOT', decimals: 9, name: 'Notcoin' },
  DOGS: { address: 'EQD0vdSA_NedR9uv8N9fg8cY9-7WvR-9KVZ7JQ8aRMy6XO5m', symbol: 'DOGS', decimals: 9, name: 'DOGS' },
  HMSTR: { address: 'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoX4u-x', symbol: 'HMSTR', decimals: 9, name: 'Hamster Kombat' },
  STON: { address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', symbol: 'STON', decimals: 9, name: 'Ston.fi Token' },
};

export async function getStonFiQuote(
  fromAsset: string,
  toAsset: string,
  amount: string,
  slippage: number = 0.5
): Promise<SwapQuote | null> {
  try {
    const params = new URLSearchParams({
      offer_address: fromAsset,
      ask_address: toAsset,
      units: amount,
      slippage_tolerance: slippage.toString(),
    });

    const response = await fetch(`${STONFI_API}/swap/simulate?${params}`);
    if (!response.ok) throw new Error('Failed to fetch quote');

    const data = await response.json();
    if (!data || !data.swap) return null;

    return {
      fromAmount: data.swap.offer_amount,
      toAmount: data.swap.ask_amount,
      priceImpact: data.swap.price_impact || 0,
      fee: data.swap.fee_amount || '0',
      route: data.swap.route || [],
      minReceived: data.swap.min_ask_amount || data.swap.ask_amount,
    };
  } catch (err) {
    console.error('[StonFi] Quote error:', err);
    return null;
  }
}

export async function buildStonFiSwapTx(params: SwapTxParams): Promise<{
  validUntil: number;
  messages: Array<{ address: string; amount: string; payload?: string }>;
} | null> {
  try {
    const response = await fetch(`${STONFI_API}/swap/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offer_address: params.fromAsset,
        ask_address: params.toAsset,
        units: params.amount,
        min_ask_units: params.minReceived,
        user_address: params.userWallet,
        slippage_tolerance: params.slippage,
        referral_address: 'UQA9IgVuB-8GUVRttmh4zjhg5yFYXBMhGHWyt7ASJF1VuZJD',
      }),
    });

    if (!response.ok) throw new Error('Failed to build transaction');

    const data = await response.json();
    if (!data || !data.transactions) return null;

    return {
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: data.transactions.map((tx: any) => ({
        address: tx.address,
        amount: tx.amount,
        payload: tx.payload,
      })),
    };
  } catch (err) {
    console.error('[StonFi] Build TX error:', err);
    return null;
  }
}

export function getJettonInfo(symbol: string) {
  return KNOWN_JETTONS[symbol.toUpperCase()];
}

export function getAllJettons() {
  return Object.values(KNOWN_JETTONS);
}

export async function fetchUserJettonBalances(walletAddress: string): Promise<Array<{
  symbol: string;
  balance: string;
  address: string;
  decimals: number;
}>> {
  try {
    const response = await fetch(
      `https://tonapi.io/v2/accounts/${walletAddress}/jettons`
    );
    if (!response.ok) throw new Error('Failed to fetch balances');

    const data = await response.json();
    return (data.balances || []).map((jetton: any) => ({
      symbol: jetton.jetton.symbol || 'UNKNOWN',
      balance: jetton.balance,
      address: jetton.jetton.address,
      decimals: jetton.jetton.decimals,
    }));
  } catch (err) {
    console.error('[StonFi] Fetch balances error:', err);
    return [];
  }
}