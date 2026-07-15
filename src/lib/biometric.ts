import { Capacitor } from '@capacitor/core';
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

  // Placeholder - in production use @capacitor-community/biometric or native biometric
  return { 
    available: true, 
    biometryType: 'faceid',
    error: 'Biometric requires @capacitor-community/biometric plugin' 
  };
}

export async function enableBiometric(): Promise<BiometricResult> {
  const { available, biometryType, error } = await isBiometricAvailable();
  if (!available) {
    return { success: false, error: error || 'Biometric not available' };
  }

  try {
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
    // In production: use NativeBiometric.verifyIdentity()
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
    await Preferences.remove({ key: BIOMETRIC_ENABLED_KEY });
    await Preferences.remove({ key: BIOMETRIC_TYPE_KEY });
    haptic('success');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  const result = await Preferences.get({ key: 'biometric_enabled' });
  return result.value === 'true';
}

export async function getBiometricType(): Promise<string | null> {
  const result = await Preferences.get({ key: 'biometric_type' });
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