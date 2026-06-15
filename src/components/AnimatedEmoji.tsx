import React, { useEffect, useRef, memo } from 'react';

/**
 * AnimatedEmoji — Animated emoji component inspired by Telegram
 * 
 * Uses CSS animations + SVG for smooth, lightweight emoji effects.
 * No external Lottie files needed — everything is inline.
 */

interface AnimatedEmojiProps {
  type: keyof typeof EMOJIS;
  size?: number;
  className?: string;
  loop?: boolean;
  onClick?: () => void;
}

// ===== Animated Emoji Definitions =====
const EMOJIS = {
  // ===== Success / Checkmark =====
  success: {
    render: (size: number) => (
      <div className="ae-success" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <circle cx="40" cy="40" r="36" fill="none" stroke="#10b981" strokeWidth="3" className="ae-circle" />
          <path d="M24 42 L34 52 L56 30" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="ae-check" />
        </svg>
      </div>
    ),
  },

  // ===== Moon / Luna =====
  moon: {
    render: (size: number) => (
      <div className="ae-float" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <defs>
            <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <path d="M50 12C35 12 22 25 22 40s13 28 28 28c6 0 11.5-1.8 16-5C58.5 68 49 72 40 72 22 72 8 58 8 40S22 8 40 8c5 0 9.5 1.3 13.5 3.5C52 11.2 51 12 50 12z" fill="url(#moonGrad)" className="ae-glow-pulse" />
          <circle cx="35" cy="30" r="2" fill="#fde68a" opacity="0.6" className="ae-twinkle" />
          <circle cx="30" cy="45" r="1.5" fill="#fde68a" opacity="0.4" className="ae-twinkle-delay" />
        </svg>
      </div>
    ),
  },

  // ===== Diamond / TON =====
  diamond: {
    render: (size: number) => (
      <div className="ae-bounce" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <defs>
            <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
          <path d="M20 30 L40 10 L60 30 L40 70 Z" fill="url(#diamondGrad)" className="ae-sparkle" />
          <path d="M20 30 L40 10 L60 30" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
          <path d="M20 30 L40 38 L60 30" fill="none" stroke="white" strokeWidth="1" opacity="0.2" />
          <path d="M40 38 L40 70" fill="none" stroke="white" strokeWidth="1" opacity="0.15" />
        </svg>
      </div>
    ),
  },

  // ===== Rocket =====
  rocket: {
    render: (size: number) => (
      <div className="ae-rocket" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <g className="ae-rocket-body">
            <path d="M40 10 C40 10 55 25 55 50 L45 60 L35 60 L25 50 C25 25 40 10 40 10Z" fill="#e2e8f0" />
            <path d="M40 10 C40 10 48 20 50 35 L40 15 L30 35 C32 20 40 10 40 10Z" fill="#94a3b8" opacity="0.3" />
            <circle cx="40" cy="35" r="5" fill="#3b82f6" />
            <circle cx="40" cy="35" r="3" fill="#60a5fa" />
            <path d="M25 50 L20 58 L30 55Z" fill="#ef4444" />
            <path d="M55 50 L60 58 L50 55Z" fill="#ef4444" />
          </g>
          {/* Flame */}
          <g className="ae-flame">
            <path d="M35 60 Q37 72 40 75 Q43 72 45 60" fill="#f97316" />
            <path d="M37 60 Q39 68 40 70 Q41 68 43 60" fill="#fbbf24" />
          </g>
        </svg>
      </div>
    ),
  },

  // ===== Coin / Money =====
  coin: {
    render: (size: number) => (
      <div className="ae-spin-y" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <defs>
            <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <circle cx="40" cy="40" r="30" fill="url(#coinGrad)" />
          <circle cx="40" cy="40" r="25" fill="none" stroke="#f59e0b" strokeWidth="2" />
          <text x="40" y="48" textAnchor="middle" fill="#92400e" fontSize="28" fontWeight="bold">🌙</text>
        </svg>
      </div>
    ),
  },

  // ===== Fire =====
  fire: {
    render: (size: number) => (
      <div className="ae-pulse" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <path d="M40 10 C45 25 60 30 55 50 C52 58 48 62 40 65 C32 62 28 58 25 50 C20 30 35 25 40 10Z" fill="#ef4444" className="ae-flame-flicker">
            <animate attributeName="d" dur="0.8s" repeatCount="indefinite" values="
              M40 10 C45 25 60 30 55 50 C52 58 48 62 40 65 C32 62 28 58 25 50 C20 30 35 25 40 10Z;
              M40 12 C47 23 58 32 54 48 C50 57 46 63 40 66 C34 63 30 57 26 48 C22 32 33 23 40 12Z;
              M40 10 C45 25 60 30 55 50 C52 58 48 62 40 65 C32 62 28 58 25 50 C20 30 35 25 40 10Z
            " />
          </path>
          <path d="M40 25 C43 33 50 35 48 48 C46 53 44 56 40 58 C36 56 34 53 32 48 C30 35 37 33 40 25Z" fill="#fbbf24">
            <animate attributeName="d" dur="0.6s" repeatCount="indefinite" values="
              M40 25 C43 33 50 35 48 48 C46 53 44 56 40 58 C36 56 34 53 32 48 C30 35 37 33 40 25Z;
              M40 27 C44 32 49 36 47 47 C45 52 43 57 40 59 C37 57 35 52 33 47 C31 36 36 32 40 27Z;
              M40 25 C43 33 50 35 48 48 C46 53 44 56 40 58 C36 56 34 53 32 48 C30 35 37 33 40 25Z
            " />
          </path>
        </svg>
      </div>
    ),
  },

  // ===== Star =====
  star: {
    render: (size: number) => (
      <div className="ae-pop" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <defs>
            <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <polygon points="40,8 48,30 72,30 52,46 60,68 40,54 20,68 28,46 8,30 32,30" fill="url(#starGrad)" className="ae-sparkle" />
        </svg>
      </div>
    ),
  },

  // ===== Wallet =====
  wallet: {
    render: (size: number) => (
      <div className="ae-bounce" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <rect x="12" y="22" width="56" height="40" rx="6" fill="#6366f1" />
          <rect x="12" y="22" width="56" height="12" rx="6" fill="#818cf8" />
          <rect x="48" y="38" width="20" height="14" rx="4" fill="#4f46e5" />
          <circle cx="58" cy="45" r="3" fill="#a5b4fc" />
        </svg>
      </div>
    ),
  },

  // ===== Send / Transfer =====
  send: {
    render: (size: number) => (
      <div className="ae-send" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <path d="M12 40 L68 12 L52 68 L38 44 Z" fill="#3b82f6" className="ae-send-arrow" />
          <path d="M38 44 L68 12" stroke="#60a5fa" strokeWidth="2" fill="none" />
        </svg>
      </div>
    ),
  },

  // ===== Lock / Security =====
  lock: {
    render: (size: number) => (
      <div className="ae-shake" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <rect x="22" y="35" width="36" height="30" rx="4" fill="#6366f1" />
          <path d="M30 35 V28 C30 20 50 20 50 28 V35" fill="none" stroke="#818cf8" strokeWidth="4" strokeLinecap="round" />
          <circle cx="40" cy="50" r="4" fill="#c7d2fe" />
          <path d="M40 54 V60" stroke="#c7d2fe" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    ),
  },

  // ===== Party / Celebration =====
  party: {
    render: (size: number) => (
      <div className="ae-pop" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <path d="M25 70 L35 30 L55 50 Z" fill="#8b5cf6" />
          <path d="M35 30 L45 20 L55 30 L55 50 Z" fill="#a78bfa" />
          {/* Confetti particles */}
          <circle cx="20" cy="20" r="3" fill="#f43f5e" className="ae-confetti-1" />
          <circle cx="60" cy="15" r="2.5" fill="#3b82f6" className="ae-confetti-2" />
          <rect x="50" y="25" width="5" height="5" rx="1" fill="#10b981" className="ae-confetti-3" transform="rotate(30 52.5 27.5)" />
          <circle cx="15" cy="40" r="2" fill="#f59e0b" className="ae-confetti-4" />
          <rect x="65" y="40" width="4" height="4" rx="1" fill="#ec4899" className="ae-confetti-5" transform="rotate(45 67 42)" />
        </svg>
      </div>
    ),
  },

  // ===== Loading / Hourglass =====
  loading: {
    render: (size: number) => (
      <div className="ae-rotate" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          <path d="M40 10 A30 30 0 0 1 70 40" fill="none" stroke="url(#loadGrad)" strokeWidth="4" strokeLinecap="round" />
          <defs>
            <linearGradient id="loadGrad">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
  },

  // ===== Bell / Notification =====
  bell: {
    render: (size: number) => (
      <div className="ae-ring" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <path d="M40 12 C40 12 22 18 22 38 C22 52 18 56 18 56 L62 56 C62 56 58 52 58 38 C58 18 40 12 40 12Z" fill="#fbbf24" />
          <circle cx="40" cy="64" r="6" fill="#f59e0b" />
          <circle cx="40" cy="12" r="3" fill="#f59e0b" />
        </svg>
      </div>
    ),
  },
} as const;

// ===== Component =====

const AnimatedEmoji = memo(({ type, size = 48, className = '', loop = true, onClick }: AnimatedEmojiProps) => {
  const emoji = EMOJIS[type];
  if (!emoji) return null;

  return (
    <div
      className={`inline-flex items-center justify-center select-none ${className} ${loop ? '' : 'ae-once'}`}
      onClick={onClick}
      style={{ lineHeight: 0 }}
    >
      {emoji.render(size)}
    </div>
  );
});

AnimatedEmoji.displayName = 'AnimatedEmoji';
export default AnimatedEmoji;
export type AnimatedEmojiType = keyof typeof EMOJIS;
