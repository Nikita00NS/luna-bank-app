export function formatCrypto(amount: number, decimals: number = 4): string {
  if (amount === 0) return '0';
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  if (Math.abs(amount) < 0.0001) return amount.toExponential(2);
  return amount.toFixed(decimals);
}

export function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00';
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

export function formatFiat(amount: number): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

export function shortAddress(addr: string, chars: number = 4): string {
  if (!addr || addr.length < 10) return addr || '';
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp * 1000;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  // Native haptic feedback via Capacitor (works on iOS/Android)
  try {
    const mod = (window as any).Capacitor?.Plugins?.Haptics;
    if (mod) {
      if (type === 'success') mod.notification({ type: 'SUCCESS' });
      else if (type === 'error') mod.notification({ type: 'ERROR' });
      else mod.impact({ style: type.toUpperCase() });
    }
    // Fallback: CSS vibration
    else if (navigator.vibrate) {
      if (type === 'success' || type === 'error') navigator.vibrate([50, 50, 50]);
      else navigator.vibrate(10);
    }
  } catch {}
}