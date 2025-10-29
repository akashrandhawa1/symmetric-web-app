import React, { useState, useEffect } from 'react';
import { Confetti } from './Confetti';

interface StrengthAchievementPopupProps {
  onDismiss: () => void;
  prValues: { old: number; new: number } | null;
}

const TrophyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L12 5" />
    <path d="M6 8L6 11" />
    <path d="M18 8L18 11" />
    <path d="M12 18L12 22" />
    <path d="M12 5C14.7614 5 17 7.23858 17 10C17 11.8356 16.0536 13.4356 14.6893 14.3642" />
    <path d="M12 5C9.23858 5 7 7.23858 7 10C7 11.8356 7.94643 13.4356 9.31071 14.3642" />
    <path d="M12 14.8214C10.7441 14.8214 9.56455 14.618 8.5 14.25" />
    <path d="M15.5 14.25C14.4355 14.618 13.2559 14.8214 12 14.8214" />
    <path d="M8.5 14.25C7.5 13.9 7 13.25 7 12.5C7 11.5 8 11 9 11C10.5 11 11.5 12 11.5 13.5" />
    <path d="M15.5 14.25C16.5 13.9 17 13.25 17 12.5C17 11.5 16 11 15 11C13.5 11 12.5 12 12.5 13.5" />
    <path d="M12 14.8214V18" />
    <path d="M9 18H15" />
  </svg>
);

export const StrengthAchievementPopup: React.FC<StrengthAchievementPopupProps> = ({ onDismiss, prValues }) => {
  const [animatedValue, setAnimatedValue] = useState(prValues?.old || 0);

  useEffect(() => {
    if (!prValues) return;
    const oldValue = prValues.old || 0;
    const newValue = prValues.new || 0;
    setAnimatedValue(oldValue);

    const diff = newValue - oldValue;
    if (diff <= 0) {
      setAnimatedValue(newValue);
      return;
    }

    const duration = 1200; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      if (elapsedTime >= duration) {
        setAnimatedValue(newValue);
        return;
      }
      const progress = elapsedTime / duration;
      const easedProgress = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      const currentValue = oldValue + diff * easedProgress;
      setAnimatedValue(Math.round(currentValue));
      requestAnimationFrame(animate);
    };

    const rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [prValues]);


  return (
    <div className="achievement-popup-overlay" onClick={onDismiss} role="dialog" aria-modal="true" aria-labelledby="achievement-title">
      <div className="achievement-card" onClick={(e) => e.stopPropagation()}>
        <Confetti />
        <div className="achievement-glow"></div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <TrophyIcon className="w-20 h-20 text-amber-400 achievement-icon" />
          <div className="flex flex-col gap-2 text-center">
            <h2 id="achievement-title" className="text-3xl font-black tracking-tight text-white achievement-text" style={{ animationDelay: '0.7s' }}>
              New Personal Best!
            </h2>
            <p className="text-base text-gray-300 achievement-text" style={{ animationDelay: '0.8s' }}>
                You're officially stronger.
            </p>
          </div>

          {prValues && (
              <div className="flex flex-col items-center gap-2 text-white achievement-text w-full" style={{ animationDelay: '0.9s' }}>
                  <div className="text-center p-4 rounded-2xl bg-amber-400/20 border-2 border-amber-400/80 w-full">
                      <p className="text-sm font-medium text-amber-200/90">New Peak Strength</p>
                      <p className="text-6xl font-bold text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.6)]">{animatedValue}</p>
                  </div>
                  <div className="text-center mt-2">
                      <p className="text-sm text-gray-400">Previous Best: {prValues.old}</p>
                  </div>
              </div>
          )}

          <button
            onClick={onDismiss}
            className="mt-4 bg-white/20 text-white py-3 px-8 rounded-full font-semibold button-press transition-all hover:bg-white/30 hover:scale-105"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
};
