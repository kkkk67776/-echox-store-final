import React, { useState, useEffect } from 'react';
import { Delete, X } from 'lucide-react';

interface PinKeypadProps {
  onComplete: (pin: string) => void;
  pinLength?: number;
  disabled?: boolean;
  isError?: boolean;
  onClear?: () => void;
}

const KEYPAD_BUTTONS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
];

export const PinKeypad: React.FC<PinKeypadProps> = ({
  onComplete,
  pinLength = 6,
  disabled = false,
  isError = false,
  onClear
}) => {
  const [pin, setPin] = useState<string>('');

  const handleDigit = (digit: string) => {
    if (disabled || pin.length >= pinLength) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === pinLength) {
      onComplete(newPin);
    }
  };

  const handleDelete = () => {
    if (disabled || pin.length === 0) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled) return;
    setPin('');
    if (onClear) onClear();
  };

  // Error shake and auto reset
  useEffect(() => {
    if (isError) {
      const timer = setTimeout(() => {
        setPin('');
        if (onClear) onClear();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isError, onClear]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs mx-auto select-none">
      {/* PIN Dots Indicator */}
      <div 
        className={`flex items-center justify-center gap-3.5 mb-8 py-2 px-6 rounded-full backdrop-blur-md bg-white/[0.03] border border-white/10 transition-all ${
          isError ? 'animate-shake border-red-500/60 bg-red-950/20' : ''
        }`}
      >
        {Array.from({ length: pinLength }).map((_, idx) => {
          const isFilled = idx < pin.length;
          return (
            <div
              key={idx}
              className={`rounded-full transition-all duration-200 ${
                isFilled
                  ? isError
                    ? 'w-3.5 h-3.5 bg-red-500 shadow-[0_0_12px_#EF4444] scale-110'
                    : 'w-3.5 h-3.5 bg-amber-400 shadow-[0_0_12px_#F59E0B] scale-110'
                  : 'w-3 h-3 bg-white/20 border border-white/20'
              }`}
            />
          );
        })}
      </div>

      {/* Keypad Grid (3 columns) */}
      <div className="grid grid-cols-3 gap-4 sm:gap-5 w-full">
        {KEYPAD_BUTTONS.map(({ digit, letters }) => (
          <button
            key={digit}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(digit)}
            className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full backdrop-blur-md bg-white/[0.07] hover:bg-white/[0.13] active:bg-amber-500/30 active:scale-90 active:border-amber-400/50 border border-white/10 shadow-lg flex flex-col items-center justify-center transition-all duration-100 ease-out cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="text-2xl sm:text-3xl font-light text-white font-mono leading-none">
              {digit}
            </span>
            {letters ? (
              <span className="text-[9px] font-semibold text-zinc-400 tracking-widest mt-0.5 uppercase">
                {letters}
              </span>
            ) : (
              <span className="h-[9px]" />
            )}
          </button>
        ))}

        {/* Clear Button */}
        <button
          type="button"
          disabled={disabled || pin.length === 0}
          onClick={handleClear}
          className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full backdrop-blur-md bg-transparent hover:bg-white/[0.06] active:scale-90 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer disabled:opacity-0"
          title="مسح الكل"
        >
          <span className="text-xs font-bold">مسح</span>
        </button>

        {/* 0 Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('0')}
          className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full backdrop-blur-md bg-white/[0.07] hover:bg-white/[0.13] active:bg-amber-500/30 active:scale-90 active:border-amber-400/50 border border-white/10 shadow-lg flex flex-col items-center justify-center transition-all duration-100 ease-out cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
        >
          <span className="text-2xl sm:text-3xl font-light text-white font-mono leading-none">
            0
          </span>
          <span className="text-[9px] font-semibold text-zinc-500 tracking-widest mt-0.5">
            +
          </span>
        </button>

        {/* Backspace Button */}
        <button
          type="button"
          disabled={disabled || pin.length === 0}
          onClick={handleDelete}
          className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full backdrop-blur-md bg-transparent hover:bg-white/[0.06] active:scale-90 flex items-center justify-center text-zinc-400 hover:text-amber-400 transition-all cursor-pointer disabled:opacity-0"
          title="حذف خانة"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
