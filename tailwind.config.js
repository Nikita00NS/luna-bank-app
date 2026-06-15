/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      animation: {
        'slide-up': 'slideUp 0.5s cubic-bezier(.22,1,.36,1) forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(.22,1,.36,1) forwards',
        'check-pop': 'checkPop 0.6s cubic-bezier(.22,1,.36,1) forwards',
        'pulse-ring': 'pulseRing 1.5s ease-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        slideUp: { '0%': { transform: 'translateY(40px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        scaleIn: { '0%': { transform: 'scale(0.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        checkPop: { '0%': { transform: 'scale(0)' }, '50%': { transform: 'scale(1.15)' }, '100%': { transform: 'scale(1)' } },
        pulseRing: { '0%': { transform: 'scale(0.8)', opacity: '0.6' }, '100%': { transform: 'scale(2.5)', opacity: '0' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        glow: { '0%': { boxShadow: '0 0 20px rgba(139,92,246,0.1)' }, '100%': { boxShadow: '0 0 40px rgba(139,92,246,0.3)' } },
      },
    },
  },
  plugins: [],
}
