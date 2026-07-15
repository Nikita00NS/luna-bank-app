export interface QRScanResult {
  success: boolean;
  data?: string;
  error?: string;
}

export const qrScanner = {
  async startScanner(
    elementId: string,
    onScan: (result: QRScanResult) => void,
    options: { fps?: number; qrbox?: { width: number; height: number } } = {}
  ): Promise<void> {
    console.warn('[QR Scanner] html5-qrcode not installed. Camera scanning unavailable.');
    onScan({ success: false, error: 'QR scanner requires html5-qrcode package' });
  },

  async stopScanner(): Promise<void> {
    // No-op
  },

  async scanFile(file: File): Promise<QRScanResult> {
    return { success: false, error: 'QR scanner requires html5-qrcode package' };
  },

  getIsScanning(): boolean {
    return false;
  }
};

export interface QRScanResult {
  success: boolean;
  data?: string;
  error?: string;
}

export function extractTonAddress(data: string): string | null {
  let address = data.trim();
  
  if (address.startsWith('ton://transfer/')) {
    address = address.replace('ton://transfer/', '').split('?')[0];
  }
  if (address.startsWith('ton://')) {
    address = address.replace('ton://', '').split('?')[0];
  }
  
  if (isValidTonAddress(address)) {
    return address;
  }
  return null;
}

export function isValidTonAddress(address: string): boolean {
  if (!address) return false;
  if (address.length < 48 || address.length > 48) return false;
  if (!/^[A-Za-z0-9+/_-]{48}$/.test(address)) return false;
  return address.startsWith('EQ') || address.startsWith('UQ') || address.startsWith('kQ');
}

export function formatTonAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}