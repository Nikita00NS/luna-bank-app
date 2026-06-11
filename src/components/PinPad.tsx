import React, { useState, useEffect } from 'react';
import { haptic } from '../lib/utils';

interface PinPadProps {
  onComplete: (pin: string) => void;
  title?: string;
  subtitle?: string;
  error?: boolean;
  onCancel?: () => void;
}

export default function PinPad({
  onComplete,
  title = 'Введите PIN',
  subtitle,
  error = false,
  onCancel,
}: PinPadProps) {
  const [pin, setPin] = useState('');

  // Reset on error
  useEffect(() => {
    if (error) {
      setPin('');
      haptic('error');
    }
  }, [error]);

  // Submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) {
      setTimeout(() => onComplete(pin), 150);
    }
  }, [pin, onComplete]);

  const pressDigit = (digit: string) => {
    if (pin.length < 4) {
      haptic('light');
      setPin((prev) => prev + digit);
    }
  };

  const pressDelete = () => {
    haptic('light');
    setPin((prev) => prev.slice(0, -1));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl glass-accent flex items-center justify-center text-3xl mb-5 mx-auto animate-float">
          🔐
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-white/40 mt-1.5">{subtitle}</p>
        )}
      </div>

      {/* Dots */}
      <div className="flex gap-5 mb-10">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`pin-dot ${
              i < pin.length ? (error ? 'error' : 'filled') : ''
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-[260px]">
        {keys.map((key, i) => {
          if (key === '') {
            return <div key={i} />;
          }

          if (key === 'del') {
            return (
              <button
                key={i}
                onClick={pressDelete}
                className="
                  w-full aspect-square rounded-full
                  flex items-center justify-center
                  text-xl text-white/50
                  active:bg-white/5 transition-all duration-150
                "
              >
                ⌫
              </button>
            );
          }

          return (
            <button
              key={i}
              onClick={() => pressDigit(key)}
              className="
                w-full aspect-square rounded-full
                flex items-center justify-center
                text-2xl font-medium text-white
                active:bg-white/[0.08] active:scale-95
                transition-all duration-150
              "
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Cancel */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-8 text-white/30 text-sm hover:text-white/50 transition-colors"
        >
          Отмена
        </button>
      )}
    </div>
  );
}
