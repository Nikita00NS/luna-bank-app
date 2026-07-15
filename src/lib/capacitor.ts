/**
 * Luna Wallet v2 — Capacitor Native Plugins
 * Safe wrappers around native hardware. Uses dynamic imports
 * so the app still compiles without the optional plugins installed.
 */

export const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform;
export const platform = (typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform?.()) || 'web';

// ===== Haptics =====

export async function capHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  try {
    const mod = await import('@capacitor/haptics');
    if (type === 'success') await mod.Haptics.notification({ type: mod.NotificationType.Success });
    else if (type === 'error') await mod.Haptics.notification({ type: mod.NotificationType.Error });
    else await mod.Haptics.impact({ style: type as any });
  } catch {}
}

// ===== Status Bar =====

export async function setStatusBarStyle(dark: boolean = true) {
  try {
    const mod = await import('@capacitor/status-bar');
    await mod.StatusBar.setStyle({ style: dark ? 'DARK' : 'LIGHT' } as any);
  } catch {}
}

// ===== Keyboard =====

export async function setupKeyboard() {
  try {
    const mod = await import('@capacitor/keyboard');
    await mod.Keyboard.setResizeMode({ mode: 'body' } as any);
  } catch {}
}

// ===== Clipboard =====

export async function nativeCopy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const mod = await import('@capacitor/clipboard' as any);
      await mod.Clipboard.write({ string: text });
      return true;
    } catch {}
  }
  return false;
}