import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { isValidTonAddress } from '../lib/ton';
import { haptic } from '../lib/utils';
import { qrScanner, extractTonAddress } from '../lib/qrScanner';
import { ArrowLeftIcon, ScanIcon } from '../components/Icons';

export default function QRScanScreen() {
  const { go, back } = useStore();
  const [scanned, setScanned] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);

  const handleDetect = (data: string) => {
    if (!data || scanned) return;

    const address = extractTonAddress(data);
    if (address) {
      setScanned(address);
      haptic('success');
      go('send');
    } else {
      setError('No valid TON address found in QR code');
      haptic('error');
    }
  };

  const handleManualSubmit = () => {
    const addr = manualInput.trim();
    if (isValidTonAddress(addr)) {
      handleDetect(addr);
    } else {
      setError('Invalid TON address');
      haptic('error');
    }
  };

  const startScanner = async () => {
    if (!scannerRef.current) return;
    
    setScanning(true);
    setError('');
    setPermissionDenied(false);

    try {
      await qrScanner.startScanner(
        'qr-scanner-container',
        (result) => {
          if (result.success && result.data) {
            handleDetect(result.data);
          } else if (!result.success && result.error?.includes('permission')) {
            setPermissionDenied(true);
            setError('Camera permission denied. Please enable in settings.');
          }
        },
        { fps: 10, qrbox: { width: 250, height: 250 } }
      );
    } catch (err) {
      setError((err as Error).message);
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    await qrScanner.stopScanner();
    setScanning(false);
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (scanned) {
      stopScanner();
    }
  }, [scanned]);

  return (
    <div className="page safe-top flex flex-col">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Scan QR</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div 
          ref={scannerRef} 
          id="qr-scanner-container"
          className="relative w-64 h-64 rounded-xl overflow-hidden mb-6 bg-[var(--bg-card)]"
          style={{ display: scanning ? 'block' : 'none' }}
        >
          <div className="absolute inset-4 border-2 border-[var(--border)] rounded-xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <ScanIcon size={48} color="var(--text-tertiary)" />
          </div>
          <div className="absolute left-6 right-6 h-0.5 rounded-full"
            style={{
              background: 'var(--accent)',
              top: '20%',
              animation: 'scanLine 2s ease-in-out infinite',
            }} />
        </div>

        {!scanning && (
          <div className="w-64 h-64 rounded-xl bg-[var(--bg-card)] flex flex-col items-center justify-center mb-6 border border-[var(--border)]">
            <ScanIcon size={48} color="var(--text-tertiary)" />
            <p className="text-sm text-center text-[var(--text-tertiary)] mt-4 px-4">Camera off</p>
            <button onClick={startScanner} className="btn btn-primary mt-4 max-w-[200px]">Start Camera</button>
          </div>
        )}

        <p className="text-sm text-center text-[var(--text-tertiary)] mb-6">
          Point camera at QR code with TON address
        </p>

        <style>{`
          @keyframes scanLine {
            0%, 100% { top: 20%; }
            50% { top: 75%; }
          }
        `}</style>

        <div className="w-full max-w-[320px] mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => { setManualInput(e.target.value); setError(''); }}
                placeholder="Or enter address manually"
                className="input text-sm"
              />
            </div>
            <button onClick={handleManualSubmit}
              className="px-4 py-4 rounded-xl text-sm font-semibold bg-[var(--accent)] text-white">
              OK
            </button>
          </div>
          {error && (
            <p className="text-xs text-[var(--red)]">{error}</p>
          )}
          {permissionDenied && (
            <p className="text-xs text-[var(--orange)]">
              Camera access required. Enable in browser settings.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}