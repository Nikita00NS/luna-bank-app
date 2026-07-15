import React, { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [fade, setFade] = useState(false);
  useEffect(() => {
    setTimeout(() => setFade(true), 1000);
    setTimeout(() => { window.location.hash = '#/home'; }, 1400);
  }, []);
  return (
    <div className="h-full flex flex-col items-center justify-center" style={{ background: 'var(--bg)', opacity: fade ? 0 : 1, transition: 'opacity 0.4s' }}>
      <div className="w-16 h-16 rounded-xl bg-[var(--accent)] flex items-center justify-center mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <p className="text-xl font-bold mb-1">Luna Wallet</p>
      <p className="text-xs text-[var(--text-tertiary)]">Loading...</p>
    </div>
  );
}
