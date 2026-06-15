import React, { memo } from 'react';

/**
 * LncIcon — Animated Luna Coin icon
 * Replaces 🌙 in UI elements with an animated moon crescent
 * Use inline where you'd normally put 🌙 or 🌙
 */

interface LncIconProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

const LncIcon = memo(({ size = 16, className = '', animate = true }: LncIconProps) => (
  <span
    className={`inline-flex items-center justify-center shrink-0 ${animate ? 'lnc-icon' : ''} ${className}`}
    style={{ width: size, height: size, verticalAlign: 'middle', lineHeight: 0 }}
  >
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`lncG${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {/* Moon crescent */}
      <path
        d="M15 3C10.5 3 7 6.5 7 11s3.5 8 8 8c2 0 3.8-.6 5.2-1.7C17.5 20 14 22 10 22 4.5 22 0 17.5 0 12S4.5 2 10 2c2 0 3.8.5 5 1z"
        fill={`url(#lncG${size})`}
        transform="translate(2, 0)"
      />
      {/* Star sparkle */}
      <circle cx="18" cy="6" r="1.2" fill="#fde68a" opacity="0.8">
        {animate && (
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        )}
      </circle>
      <circle cx="20" cy="10" r="0.8" fill="#fde68a" opacity="0.5">
        {animate && (
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="3s" repeatCount="indefinite" />
        )}
      </circle>
    </svg>
  </span>
));

LncIcon.displayName = 'LncIcon';
export default LncIcon;

/**
 * LncAmount — displays amount with animated Luna icon
 * Usage: <LncAmount value={100} /> renders as 🌙100.00
 */
export const LncAmount = memo(({ value, decimals = 2, size = 14, className = '' }: {
  value: number;
  decimals?: number;
  size?: number;
  className?: string;
}) => (
  <span className={`inline-flex items-center gap-0.5 ${className}`}>
    <LncIcon size={size} />
    <span className="mono">{typeof value === 'number' ? value.toFixed(decimals) : value}</span>
  </span>
));

(LncAmount as any).displayName = 'LncAmount';
