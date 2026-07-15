import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { haptic, formatCrypto } from '../lib/utils';
import { ArrowLeftIcon, BluetoothIcon } from '../components/Icons';

export default function BLETransferScreen() {
  const { go, back, tonWallet, tokens } = useStore();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<string[]>([]);
  const [connected, setConnected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleScan = () => {
    setScanning(true);
    haptic('medium');

    setTimeout(() => {
      setDevices(['Luna Wallet (Anna)', 'TON Wallet (Ivan)', 'Crypto Pay (Maria)']);
      setScanning(false);
    }, 2000);
  };

  const handleConnect = (device: string) => {
    setConnected(device);
    haptic('success');
  };

  const handleSend = () => {
    if (!connected || !Number(amount)) return;
    setSending(true);
    haptic('medium');

    setTimeout(() => {
      setSending(false);
      setSent(true);
      haptic('success');
      setTimeout(() => {
        setSent(false);
        setConnected(null);
        setAmount('');
      }, 3000);
    }, 2000);
  };

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">BLE Transfer</p>
      </div>

      {sent ? (
        <div className="px-4 mt-20 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-[var(--green)/10]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Sent!</h2>
          <p className="text-lg font-semibold mono mt-1">{formatCrypto(Number(amount))} TON</p>
          <p className="text-sm text-[var(--text-tertiary)]">Via Bluetooth to {connected}</p>
        </div>
      ) : (
        <div className="px-4 mt-6 space-y-4">
          <div className="card p-6 flex flex-col items-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${scanning ? 'animate-pulse' : ''}`}
              style={{ background: scanning ? 'var(--accent)/10' : 'var(--bg-card)' }}>
              <BluetoothIcon size={40} color={scanning ? 'var(--accent)' : 'var(--text-tertiary)'} />
            </div>
            <h3 className="font-semibold mb-1">
              {connected ? `Connected: ${connected}` : scanning ? 'Scanning...' : 'Bluetooth Transfer'}
            </h3>
            <p className="text-xs text-center text-[var(--text-tertiary)]">
              Transfer crypto between phones offline
            </p>
          </div>

          {devices.length > 0 && !connected && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--text-tertiary)]">Nearby Devices</p>
              {devices.map((device, i) => (
                <button key={i}
                  onClick={() => handleConnect(device)}
                  className="w-full card p-3.5 flex items-center gap-3 active:scale-[0.98] transition-all">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--accent)/10]">
                    <BluetoothIcon size={16} color="var(--accent)" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{device}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">BLE · ~2.5m</p>
                  </div>
                  <span className="text-xs font-medium text-[var(--accent)]">Connect</span>
                </button>
              ))}
            </div>
          )}

          {connected && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-[var(--text-tertiary)]">Amount (TON)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="input text-2xl font-bold mono"
                />
              </div>
              <button onClick={handleSend}
                disabled={!Number(amount) || sending}
                className="btn btn-primary w-full">
                {sending ? 'Sending...' : `Send ${amount || '0'} TON`}
              </button>
            </>
          )}

          {!connected && devices.length === 0 && (
            <button onClick={handleScan}
              disabled={scanning}
              className="btn btn-primary w-full flex items-center justify-center gap-2">
              {scanning ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Scanning...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <BluetoothIcon size={20} color="white" />
                  Find Devices
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}