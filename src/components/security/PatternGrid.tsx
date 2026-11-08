import React, { useState, useRef, useEffect, useCallback } from 'react';

interface PatternGridProps {
  onComplete: (pattern: string) => void;
  disabled?: boolean;
  isError?: boolean;
  onClear?: () => void;
}

interface Point {
  x: number;
  y: number;
}

export const PatternGrid: React.FC<PatternGridProps> = ({
  onComplete,
  disabled = false,
  isError = false,
  onClear
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pointerPos, setPointerPos] = useState<Point | null>(null);
  const [dotCoordinates, setDotCoordinates] = useState<Point[]>([]);

  // Calculate coordinates of the 9 dots in a 3x3 grid relative to container
  const updateCoordinates = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const size = rect.width;
    const padding = size * 0.15;
    const step = (size - 2 * padding) / 2;

    const coords: Point[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        coords.push({
          x: padding + col * step,
          y: padding + row * step
        });
      }
    }
    setDotCoordinates(coords);
  }, []);

  useEffect(() => {
    updateCoordinates();
    window.addEventListener('resize', updateCoordinates);
    return () => window.removeEventListener('resize', updateCoordinates);
  }, [updateCoordinates]);

  // Find dot near client coordinate
  const getDotAtPoint = useCallback((clientX: number, clientY: number): number | null => {
    if (!containerRef.current || dotCoordinates.length !== 9) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const hitRadius = rect.width * 0.14; // generous hit zone

    for (let i = 0; i < dotCoordinates.length; i++) {
      const dot = dotCoordinates[i];
      const dist = Math.hypot(dot.x - x, dot.y - y);
      if (dist <= hitRadius) {
        return i;
      }
    }
    return null;
  }, [dotCoordinates]);

  // Pointer event handlers for unified Mouse + Touch support
  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const dot = getDotAtPoint(e.clientX, e.clientY);
    if (dot !== null) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
      setIsDrawing(true);
      setSelectedDots([dot]);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPointerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || disabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPointerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    const dot = getDotAtPoint(e.clientX, e.clientY);
    if (dot !== null && !selectedDots.includes(dot)) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
      setSelectedDots(prev => [...prev, dot]);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setPointerPos(null);

    if (selectedDots.length > 0) {
      const patternCode = selectedDots.join('-');
      onComplete(patternCode);
    }
  };

  // Clear when requested or error resets
  useEffect(() => {
    if (isError) {
      const timer = setTimeout(() => {
        setSelectedDots([]);
        if (onClear) onClear();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isError, onClear]);

  // Colors
  const beamColor = isError ? '#EF4444' : '#F59E0B'; // Red on error, ECHOX Gold on default
  const glowFilter = isError 
    ? 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.9))' 
    : 'drop-shadow(0 0 12px rgba(245, 158, 11, 0.9))';

  return (
    <div className="flex flex-col items-center justify-center select-none touch-none w-full">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-72 h-72 sm:w-80 sm:h-80 mx-auto rounded-3xl backdrop-blur-md bg-white/[0.03] border border-white/10 shadow-2xl p-4 flex items-center justify-center transition-all ${
          isError ? 'animate-shake border-red-500/50 bg-red-950/20' : ''
        } ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-crosshair'}`}
        style={{ touchAction: 'none' }}
      >
        {/* Glowing Trailing Lines SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ filter: glowFilter }}
        >
          {/* Connecting lines between selected dots */}
          {selectedDots.map((dotIdx, i) => {
            if (i === 0) return null;
            const prev = dotCoordinates[selectedDots[i - 1]];
            const curr = dotCoordinates[dotIdx];
            if (!prev || !curr) return null;
            return (
              <line
                key={`line-${i}`}
                x1={prev.x}
                y1={prev.y}
                x2={curr.x}
                y2={curr.y}
                stroke={beamColor}
                strokeWidth="6"
                strokeLinecap="round"
              />
            );
          })}

          {/* Dynamic line to pointer position while actively drawing */}
          {isDrawing && pointerPos && selectedDots.length > 0 && (
            (() => {
              const lastDot = dotCoordinates[selectedDots[selectedDots.length - 1]];
              if (!lastDot) return null;
              return (
                <line
                  x1={lastDot.x}
                  y1={lastDot.y}
                  x2={pointerPos.x}
                  y2={pointerPos.y}
                  stroke={beamColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="6 4"
                  opacity="0.85"
                />
              );
            })()
          )}
        </svg>

        {/* 3x3 Grid Dots */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-8 sm:p-10 pointer-events-none">
          {Array.from({ length: 9 }).map((_, idx) => {
            const isSelected = selectedDots.includes(idx);
            const isLatest = selectedDots[selectedDots.length - 1] === idx;

            return (
              <div
                key={idx}
                className="flex items-center justify-center"
              >
                <div
                  className={`relative flex items-center justify-center rounded-full transition-all duration-150 ${
                    isSelected
                      ? isError
                        ? 'w-12 h-12 bg-red-500/25 border-2 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.8)] scale-110'
                        : 'w-12 h-12 bg-amber-500/25 border-2 border-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.85)] scale-110'
                      : 'w-10 h-10 bg-white/[0.06] border border-white/20 hover:border-white/40'
                  }`}
                >
                  {/* Inner glowing center dot */}
                  <div
                    className={`rounded-full transition-all duration-150 ${
                      isSelected
                        ? isError
                          ? 'w-4 h-4 bg-red-400 shadow-[0_0_10px_#EF4444]'
                          : 'w-4 h-4 bg-amber-300 shadow-[0_0_12px_#F59E0B]'
                        : 'w-3 h-3 bg-white/70'
                    } ${isLatest && !isError ? 'animate-pulse' : ''}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Touch instruction hint */}
      <p className="text-[11px] text-zinc-400 mt-4 tracking-wider flex items-center gap-1.5 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        صل 4 نقاط على الأقل بدون رفع يدك
      </p>
    </div>
  );
};
