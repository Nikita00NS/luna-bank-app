/**
 * Luna Bank — TON Blockchain Integration
 *
 * Real wallet connection via @tonconnect/ui-react.
 * Real balance via TON Center API (mainnet).
 * Real transactions via tonConnectUI.sendTransaction().
 */

// Manifest URL — must be HTTPS on deployed site
export const TON_MANIFEST_URL = 'https://luna-bank-app.vercel.app/tonconnect-manifest.json';

// Project wallet for receiving payments
export const PROJECT_WALLET = 'UQA9IgVuB-8GUVRttmh4zjhg5yFYXBMhGHWyt7ASJF1VuZJD';

// TON Center API (free tier — no key needed for basic calls)
const TON_API_BASE = 'https://toncenter.com/api/v2';

/**
 * Convert nanotons to TON
 */
export function fromNano(nanotons: string | bigint | number): number {
  return Number(nanotons) / 1e9;
}

/**
 * Convert TON to nanotons
 */
export function toNano(tons: number): string {
  return Math.floor(tons * 1e9).toString();
}

/**
 * Get friendly address from raw
 */
export function formatTonAddress(raw: string): string {
  if (!raw) return '';
  if (raw.startsWith('EQ') || raw.startsWith('UQ')) return raw;
  return raw.slice(0, 6) + '…' + raw.slice(-4);
}

/**
 * Short address for display
 */
export function shortTonAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

// ===== TON Center API =====

export interface TonBalance {
  balance: number; // in TON (not nanotons)
  rawBalance: string; // in nanotons
  ok: boolean;
}

/**
 * Fetch real TON balance from blockchain via TON Center API
 */
export async function fetchTonBalance(address: string): Promise<TonBalance> {
  try {
    const resp = await fetch(
      `${TON_API_BASE}/getAddressBalance?address=${encodeURIComponent(address)}`,
      {
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!resp.ok) {
      console.warn('[TON] Balance API error:', resp.status);
      return { balance: 0, rawBalance: '0', ok: false };
    }

    const data = await resp.json();

    if (data.ok && data.result) {
      const raw = String(data.result);
      return {
        balance: fromNano(raw),
        rawBalance: raw,
        ok: true,
      };
    }

    return { balance: 0, rawBalance: '0', ok: false };
  } catch (err) {
    console.warn('[TON] Balance fetch failed:', err);
    return { balance: 0, rawBalance: '0', ok: false };
  }
}

export interface TonAccountInfo {
  balance: number;
  state: 'active' | 'uninitialized' | 'frozen';
  lastTxHash?: string;
  lastTxLt?: string;
}

/**
 * Fetch detailed account info from TON Center
 */
export async function fetchTonAccountInfo(address: string): Promise<TonAccountInfo | null> {
  try {
    const resp = await fetch(
      `${TON_API_BASE}/getAddressInformation?address=${encodeURIComponent(address)}`,
      {
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!resp.ok) return null;
    const data = await resp.json();

    if (data.ok && data.result) {
      const r = data.result;
      return {
        balance: fromNano(r.balance || '0'),
        state: r.state || 'uninitialized',
        lastTxHash: r.last_transaction_id?.hash,
        lastTxLt: r.last_transaction_id?.lt,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export interface TonTransaction {
  hash: string;
  lt: string;
  timestamp: number;
  fee: number;
  inMsg?: {
    source: string;
    destination: string;
    value: number;
    message?: string;
  };
  outMsgs: {
    source: string;
    destination: string;
    value: number;
    message?: string;
  }[];
}

/**
 * Fetch recent transactions for an address
 */
export async function fetchTonTransactions(
  address: string,
  limit = 10
): Promise<TonTransaction[]> {
  try {
    const resp = await fetch(
      `${TON_API_BASE}/getTransactions?address=${encodeURIComponent(address)}&limit=${limit}`,
      {
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!resp.ok) return [];
    const data = await resp.json();

    if (data.ok && data.result) {
      return data.result.map((tx: any) => ({
        hash: tx.transaction_id?.hash || '',
        lt: tx.transaction_id?.lt || '',
        timestamp: tx.utime || 0,
        fee: fromNano(tx.fee || '0'),
        inMsg: tx.in_msg
          ? {
              source: tx.in_msg.source || '',
              destination: tx.in_msg.destination || '',
              value: fromNano(tx.in_msg.value || '0'),
              message: tx.in_msg.message || undefined,
            }
          : undefined,
        outMsgs: (tx.out_msgs || []).map((m: any) => ({
          source: m.source || '',
          destination: m.destination || '',
          value: fromNano(m.value || '0'),
          message: m.message || undefined,
        })),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Build a TON transfer transaction message for sendTransaction
 *
 * @param to - destination address (friendly or raw)
 * @param amountTon - amount in TON
 * @param comment - optional comment/memo
 * @returns transaction object for tonConnectUI.sendTransaction()
 */
export function buildTonTransferTx(
  to: string,
  amountTon: number,
  comment?: string
) {
  const nanotons = toNano(amountTon);

  const message: any = {
    address: to,
    amount: nanotons,
  };

  // Add comment as payload (BOC with text comment)
  if (comment) {
    // Simple text comment: 0x00000000 prefix + utf8
    const encoder = new TextEncoder();
    const commentBytes = encoder.encode(comment);
    const payload = new Uint8Array(4 + commentBytes.length);
    // First 4 bytes = 0x00000000 (text comment op code)
    payload.set(commentBytes, 4);
    message.payload = uint8ToBase64(payload);
  }

  return {
    validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    messages: [message],
  };
}

/**
 * Helper: Uint8Array to base64
 */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Estimate if address is valid TON address
 */
export function isValidTonAddress(address: string): boolean {
  if (!address) return false;
  // Friendly format: EQ... or UQ... (48 chars)
  if (/^[EU]Q[A-Za-z0-9_-]{46}$/.test(address)) return true;
  // Raw format: 0:hex (66 chars)
  if (/^-?[0-9]:[a-fA-F0-9]{64}$/.test(address)) return true;
  return false;
}
