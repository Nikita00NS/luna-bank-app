import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export default function Logo({ size = 40, className = '', glow = false }: LogoProps) {
  return (
    <div
      className={`relative flex-shrink-0 ${glow ? 'animate-glow' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo.png"
        alt="Luna Bank"
        className="w-full h-full object-contain rounded-xl"
        style={{ filter: 'drop-shadow(0 0 8px rgba(255,200,0,0.3))' }}
      />
    </div>
  );
}

export function LogoText({ size = 40, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={size} />
      {showText && (
        <span className="font-black text-lg tracking-tight">Luna Bank</span>
      )}
    </div>
  );
}
