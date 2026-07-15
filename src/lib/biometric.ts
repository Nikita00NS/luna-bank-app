import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Preferences } from '@capacitor/preferences';
import { haptic } from './utils';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_TYPE_KEY = 'biometric_type';

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export async function isBiometricAvailable(): Promise<{
  available: boolean;
  biometryType?: string;
  error?: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, error: 'Not on native platform' };
  }

  try {
    const result = await NativeBiometric.isAvailable();
    return {
      available: result.isAvailable,
      biometryType: String(result.biometryType || 'unknown'),
    };
  } catch (err) {
    return { available: false, error: (err as Error).message };
  }
}

export async function enableBiometric(): Promise<BiometricResult> {
  const { available, biometryType, error } = await isBiometricAvailable();
  if (!available) {
    return { success: false, error: error || 'Biometric not available' };
  }

  try {
    await NativeBiometric.verifyIdentity({
      reason: 'Enable biometric login for Luna Wallet',
      title: 'Luna Wallet',
      subtitle: 'Secure access with biometrics',
      description: 'Use Face ID / Touch ID / Fingerprint to unlock',
      negativeButtonText: 'Cancel',
      useFallback: false,
    });

    await Preferences.set({ key: BIOMETRIC_ENABLED_KEY, value: 'true' });
    await Preferences.set({ key: BIOMETRIC_TYPE_KEY, value: biometryType || 'unknown' });
    
    haptic('success');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function authenticateWithBiometric(reason: string = 'Unlock Luna Wallet'): Promise<BiometricResult> {
  const { available, error } = await isBiometricAvailable();
  if (!available) {
    return { success: false, error: error || 'Biometric not available' };
  }

  const enabled = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
  if (enabled.value !== 'true') {
    return { success: false, error: 'Biometric not enabled' };
  }

  try {
    await NativeBiometric.verifyIdentity({
      reason,
      title: 'Luna Wallet',
      subtitle: 'Authenticate to access your wallet',
      negativeButtonText: 'Cancel',
      useFallback: true,
      maxAttempts: 3,
    });

    haptic('success');
    return { success: true };
  } catch (err) {
    const error = (err as Error).message;
    if (error.includes('cancel') || error.includes('Cancel')) {
      haptic('light');
    } else {
      haptic('error');
    }
    return { success: false, error };
  }
}

export async function disableBiometric(): Promise<BiometricResult> {
  try {
    await NativeBiometric.deleteCredentials({ server: 'luna-wallet' });
    await Preferences.remove({ key: BIOMETRIC_ENABLED_KEY });
    await Preferences.remove({ key: BIOMETRIC_TYPE_KEY });
    haptic('success');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  const result = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
  return result.value === 'true';
}

export async function getBiometricType(): Promise<string | null> {
  const result = await Preferences.get({ key: BIOMETRIC_TYPE_KEY });
  return result.value || null;
}

export function getBiometricIcon(type?: string | null): string {
  if (!type) return '🔐';
  switch (type.toLowerCase()) {
    case 'faceid': return '👁️';
    case 'touchid': return '👆';
    case 'fingerprint': return '👆';
    case 'face': return '👁️';
    default: return '🔐';
  }
}