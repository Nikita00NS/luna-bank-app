/**
 * Luna Bank — WebAuthn Biometric Authentication
 *
 * Real biometrics via Web Authentication API.
 * Supports: Face ID, Touch ID, fingerprint, Windows Hello, etc.
 *
 * Flow:
 * 1. User enables biometrics in Settings → register()
 * 2. On login, if biometrics enabled → authenticate()
 * 3. Credential ID stored in localStorage (private key stays in OS secure enclave)
 */

// ===== Constants =====

const RP_NAME = 'Luna Bank';
const RP_ID_FALLBACK = 'luna-bank-app.vercel.app';

function getRpId(): string {
  try {
    // Use actual hostname in production
    const host = window.location.hostname;
    if (host && host !== 'localhost' && !host.includes('127.0.0.1')) {
      return host;
    }
  } catch {}
  return RP_ID_FALLBACK;
}

// ===== Feature Detection =====

export function isWebAuthnSupported(): boolean {
  return !!(
    window.PublicKeyCredential &&
    navigator.credentials &&
    typeof navigator.credentials.create === 'function' &&
    typeof navigator.credentials.get === 'function'
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ===== Telegram Biometric Manager (fallback for Telegram WebApp) =====

function getTgBiometricManager(): any {
  return (window as any).Telegram?.WebApp?.BiometricManager;
}

export function isTgBiometricsAvailable(): boolean {
  const bm = getTgBiometricManager();
  return !!(bm && bm.isInited && bm.isBiometricAvailable);
}

function initTgBiometrics(): Promise<boolean> {
  return new Promise((resolve) => {
    const bm = getTgBiometricManager();
    if (!bm) { resolve(false); return; }
    if (bm.isInited) { resolve(bm.isBiometricAvailable); return; }
    bm.init(() => {
      resolve(bm.isBiometricAvailable);
    });
  });
}

function tgBiometricAuthenticate(reason: string): Promise<boolean> {
  return new Promise((resolve) => {
    const bm = getTgBiometricManager();
    if (!bm) { resolve(false); return; }
    bm.authenticate({ reason }, (success: boolean) => {
      resolve(success);
    });
  });
}

// ===== Storage =====

const CREDENTIAL_KEY = 'luna-webauthn-credential';

interface StoredCredential {
  id: string; // base64url
  rawId: string; // base64url
  userId: number;
  createdAt: string;
}

function saveCredential(cred: StoredCredential) {
  localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(cred));
}

function loadCredential(): StoredCredential | null {
  try {
    const raw = localStorage.getItem(CREDENTIAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearCredential() {
  localStorage.removeItem(CREDENTIAL_KEY);
}

export function hasStoredCredential(): boolean {
  return !!loadCredential();
}

// ===== Helpers =====

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function randomChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

// ===== Register (Create Credential) =====

export async function registerBiometrics(
  userId: number,
  userName: string,
  displayName: string
): Promise<boolean> {
  // Try Telegram Biometric Manager first (native in TG app)
  const tgAvail = await initTgBiometrics();
  if (tgAvail) {
    // TG biometrics don't need registration — just mark as available
    saveCredential({
      id: 'tg-biometric',
      rawId: 'tg-biometric',
      userId,
      createdAt: new Date().toISOString(),
    });
    console.log('[WebAuthn] Using Telegram BiometricManager');
    return true;
  }

  // Fallback to WebAuthn
  if (!isWebAuthnSupported()) {
    console.warn('[WebAuthn] Not supported');
    return false;
  }

  const available = await isPlatformAuthenticatorAvailable();
  if (!available) {
    console.warn('[WebAuthn] No platform authenticator');
    return false;
  }

  try {
    const challenge = randomChallenge();
    const userIdBytes = new TextEncoder().encode(String(userId));

    const credential = await navigator.credentials.create({
      publicKey: {
        rp: {
          name: RP_NAME,
          id: getRpId(),
        },
        user: {
          id: userIdBytes,
          name: userName,
          displayName: displayName,
        },
        challenge: challenge,
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // built-in biometrics only
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none', // no attestation needed for this use case
      },
    }) as PublicKeyCredential | null;

    if (!credential) {
      console.warn('[WebAuthn] No credential returned');
      return false;
    }

    const credId = bufferToBase64Url(credential.rawId);

    saveCredential({
      id: credId,
      rawId: credId,
      userId,
      createdAt: new Date().toISOString(),
    });

    console.log('[WebAuthn] Registered successfully:', credId.slice(0, 20) + '...');
    return true;
  } catch (err: any) {
    console.error('[WebAuthn] Registration failed:', err.message || err);
    return false;
  }
}

// ===== Authenticate (Get Assertion) =====

export async function authenticateBiometrics(): Promise<boolean> {
  const stored = loadCredential();
  if (!stored) {
    console.warn('[WebAuthn] No stored credential');
    return false;
  }

  // Telegram Biometric Manager path
  if (stored.id === 'tg-biometric') {
    const tgAvail = await initTgBiometrics();
    if (tgAvail) {
      return await tgBiometricAuthenticate('Вход в Luna Bank');
    }
    return false;
  }

  // WebAuthn path
  if (!isWebAuthnSupported()) return false;

  try {
    const challenge = randomChallenge();

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        rpId: getRpId(),
        allowCredentials: [
          {
            id: base64UrlToBuffer(stored.rawId),
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;

    if (!assertion) {
      console.warn('[WebAuthn] No assertion returned');
      return false;
    }

    console.log('[WebAuthn] Authenticated successfully');
    return true;
  } catch (err: any) {
    console.error('[WebAuthn] Authentication failed:', err.message || err);
    return false;
  }
}

// ===== Check if biometrics are available at all =====

export async function checkBiometricsAvailability(): Promise<{
  available: boolean;
  type: 'webauthn' | 'telegram' | 'none';
  label: string;
}> {
  // Telegram first
  const tgAvail = await initTgBiometrics();
  if (tgAvail) {
    const bm = getTgBiometricManager();
    const type = bm?.biometricType || 'biometric';
    const labels: Record<string, string> = {
      finger: 'Отпечаток пальца',
      face: 'Face ID',
      unknown: 'Биометрия',
    };
    return {
      available: true,
      type: 'telegram',
      label: labels[type] || labels.unknown,
    };
  }

  // WebAuthn
  const webauthn = await isPlatformAuthenticatorAvailable();
  if (webauthn) {
    return {
      available: true,
      type: 'webauthn',
      label: 'Биометрия (Face ID / Touch ID)',
    };
  }

  return { available: false, type: 'none', label: 'Не поддерживается' };
}
