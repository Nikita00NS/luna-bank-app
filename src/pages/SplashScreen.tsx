import React, { useEffect } from 'react';
import { useStore } from '../lib/store';
import Logo from '../components/Logo';

export default function SplashScreen() {
  const { go, user } = useStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      go(user ? 'welcome' : 'onboarding');
    }, 2200);
    return () => clearTimeout(timer);
  }, [go, user]);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-black relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-80 h-80 rounded-full bg-yellow-500/5 blur-[120px] animate-glow" />
      </div>

      {/* Logo + Title */}
      <div className="relative z-10 flex flex-col items-center animate-scale-in">
        <div className="animate-float mb-8">
          <Logo size={96} glow />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight">
          Luna Bank
        </h1>

        <p className="text-white/30 text-sm mt-3 tracking-widest uppercase">
          Crypto Financial Ecosystem
        </p>
      </div>

      {/* Loading spinner */}
      <div className="absolute bottom-16">
        <div className="w-7 h-7 border-2 border-white/15 border-t-yellow-400/80 rounded-full animate-spin" />
      </div>
    </div>
  );
}
