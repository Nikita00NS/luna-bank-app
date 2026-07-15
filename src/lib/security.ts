/**
 * Luna Wallet v2 — Security Layer
 * PIN code, biometrics, session management
 */

import { useStore } from './store';

// ===== PIN Storage =====

const PIN_KEY = 'luna-wallet-pin-v2';
const BIOMETRICS_KEY = 'luna-wallet-biometrics-v2';

export function hasPin(): boolean {
  return !!localStorage.getItem(PIN_KEY);
}

export function setPin(pin: string): void {
  // In production, hash with salt
  localStorage.setItem(PIN_KEY, btoa(pin));
}

export function verifyPin(pin: string): boolean {
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return true; // no PIN set = always valid
  return btoa(pin) === stored;
}

export function clearPin(): void {
  localStorage.removeItem(PIN_KEY);
}

// ===== Biometrics =====

export function isBiometricsEnabled(): boolean {
  return localStorage.getItem(BIOMETRICS_KEY) === 'true';
}

export function setBiometricsEnabled(v: boolean): void {
  localStorage.setItem(BIOMETRICS_KEY, v ? 'true' : 'false');
}

// ===== Transaction Confirmation =====

export type ConfirmResult = 'confirmed' | 'cancelled' | 'timeout';

export function requestTransactionConfirm(
  amount: string,
  symbol: string,
  to: string,
  fee?: string
): Promise<ConfirmResult> {
  return new Promise((resolve) => {
    // Store confirmation data for the ConfirmScreen/modal
    const confirmData = { amount, symbol, to, fee, resolve };
    (window as any).__luna_confirm = confirmData;
    
    // Navigate to the confirmation modal
    // The modal will call resolve with 'confirmed' or 'cancelled'
    const { go } = useStore.getState();
    go('tx-confirm' as any);
    
    // Timeout after 5 minutes
    setTimeout(() => {
      if ((window as any).__luna_confirm) {
        (window as any).__luna_confirm = null;
        resolve('timeout');
      }
    }, 300_000);
  });
}

// ===== Session Lock =====

const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function shouldLock(): boolean {
  const lastActivity = localStorage.getItem('luna-last-activity');
  if (!lastActivity) return false;
  return Date.now() - Number(lastActivity) > LOCK_TIMEOUT;
}

export function updateActivity(): void {
  localStorage.setItem('luna-last-activity', Date.now().toString());
}

// ===== Rate Limiter =====

const rateLimits: Record<string, number[]> = {};

export function checkRateLimit(action: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  if (!rateLimits[action]) rateLimits[action] = [];
  
  rateLimits[action] = rateLimits[action].filter(t => now - t < windowMs);
  
  if (rateLimits[action].length >= maxAttempts) {
    return false; // rate limited
  }
  
  rateLimits[action].push(now);
  return true;
}

// ===== Address Validation =====

export function validateAddress(address: string): { valid: boolean; reason?: string } {
  if (!address) return { valid: false, reason: 'Адрес пуст' };
  if (address.length < 10) return { valid: false, reason: 'Слишком короткий адрес' };
  
  // Check for TON address format
  if (/^[EU]Q[A-Za-z0-9_-]{46,48}$/.test(address)) {
    return { valid: true };
  }
  
  // Check for raw format
  if (/^-?[0-9]:[a-fA-F0-9]{64}$/.test(address)) {
    return { valid: true };
  }
  
  // Check for .ton domain
  if (/^[a-zA-Z0-9_-]+\.ton$/.test(address)) {
    return { valid: true };
  }
  
  return { valid: false, reason: 'Неверный формат адреса TON' };
}

// ===== Amount Validation =====

export function validateAmount(
  amount: string,
  balance: number,
  minAmount: number = 0.0001
): { valid: boolean; reason?: string } {
  const num = Number(amount);
  
  if (!amount || isNaN(num)) return { valid: false, reason: 'Введите сумму' };
  if (num <= 0) return { valid: false, reason: 'Сумма должна быть больше 0' };
  if (num < minAmount) return { valid: false, reason: `Минимальная сумма ${minAmount}` };
  if (num > balance) return { valid: false, reason: 'Недостаточно средств' };
  
  return { valid: true };
}