import { Html5Qrcode } from 'html5-qrcode';

export interface QRScanResult {
  success: boolean;
  data?: string;
  error?: string;
}

class QRScanner {
  private scanner: Html5Qrcode | null = null;
  private isScanning = false;

  async startScanner(
    elementId: string,
    onScan: (result: QRScanResult) => void,
    options: {
      fps?: number;
      qrbox?: { width: number; height: number };
    } = {}
  ): Promise<void> {
    if (this.isScanning) return;

    this.scanner = new Html5Qrcode(elementId);
    this.isScanning = true;

    try {
      await this.scanner.start(
        { facingMode: 'environment' },
        {
          fps: options.fps || 10,
          qrbox: options.qrbox || { width: 250, height: 250 },
        },
        (decodedText: string) => {
          onScan({ success: true, data: decodedText });
          this.stopScanner();
        },
        (error: string) => {
          // Ignore scan errors (no QR code in frame)
        }
      );
    } catch (err) {
      this.isScanning = false;
      onScan({ success: false, error: (err as Error).message });
    }
  }

  async stopScanner(): Promise<void> {
    if (this.scanner && this.isScanning) {
      try {
        await this.scanner.stop();
      } catch {}
      this.isScanning = false;
    }
  }

  async scanFile(file: File): Promise<QRScanResult> {
    const tempScanner = new Html5Qrcode('temp-scanner');
    try {
      const result = await tempScanner.scanFile(file, true);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    } finally {
      try { await tempScanner.stop(); } catch {}
    }
  }

  getIsScanning(): boolean {
    return this.isScanning;
  }
}

export const qrScanner = new QRScanner();

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