/**
 * Luna Bank — TON Connect Integration
 * 
 * Real wallet connection via @tonconnect/ui-react.
 * Wallets open natively (Tonkeeper, MyTonWallet, etc.)
 * Addresses are real blockchain addresses.
 */

import { SEND_TRANSACTION_ERROR_CODES } from '@tonconnect/ui-react';

// Manifest URL — must be HTTPS on deployed site
export const TON_MANIFEST_URL = 'https://luna-bank-app.vercel.app/tonconnect-manifest.json';

// Project wallet for receiving payments
export const PROJECT_WALLET = 'UQA9IgVuB-8GUVRttmh4zjhg5yFYXBMhGHWyt7ASJF1VuZJD';

/**
 * Convert nanotons to TON
 */
export function fromNano(nanotons: string | bigint): number {
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
  // Already friendly format
  if (raw.startsWith('EQ') || raw.startsWith('UQ')) return raw;
  // Raw format — just show shortened
  return raw.slice(0, 6) + '…' + raw.slice(-4);
}
