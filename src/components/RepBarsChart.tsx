import React, { useState, useEffect, useRef } from 'react';
import type { Rep } from '../types';

interface RepBarsChartProps {
  reps: Rep[];
  fatigueAtRep: number | null;
  targetRep: number;
}
export const RepBarsChart: React.FC<RepBarsChartProps> = ({ reps, fatigueAtRep, targetRep }) => {
  const yAxisMax = 120; // Peak percentage baseline
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const [displayHeights, setDisplayHeights] = useState<number[]>([]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const nearEnd = scrollLeft + clientWidth >= scrollWidth - 24;
      shouldAutoScrollRef.current = nearEnd;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (reps.length < 2) return;
    const lastIndex = reps.length - 1;
    const lastTwo = reps.slice(-2);
    const [prev, current] = lastTwo;
    if (!prev || !current) return;

    const prevPeak = prev.peak;
    const currPeak = current.peak;

    const realisticPeak =
      currPeak >= prevPeak
        ? Math.min(yAxisMax, currPeak * (0.94 + Math.random() * 0.08))
        : Math.max(currPeak, prevPeak * (0.88 + Math.random() * 0.07));

    setDisplayHeights((prevHeights) => {
      const next = [...prevHeights];
      next[lastIndex] = Math.min(100, (realisticPeak / yAxisMax) * 100);
      if (next[lastIndex - 1] == null) {
        next[lastIndex - 1] = Math.min(100, (prevPeak / yAxisMax) * 100);
      }
      return next;
    });
  }, [reps]);

  useEffect(() => {
    setDisplayHeights((prev) => {
      if (prev.length === reps.length) return prev;
      const next = Array(reps.length).fill(2);
      reps.forEach((rep, idx) => {
        next[idx] = prev[idx] != null ? prev[idx] : Math.min(100, (rep.peak / yAxisMax) * 100);
      });
      return next;
    });
  }, [reps.length, reps]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (!shouldAutoScrollRef.current) return;

    container.scrollTo({
      left: container.scrollWidth,
      behavior: 'smooth',
    });
  }, [reps.length]);

  return (
    <div className="flex h-full w-full flex-col pb-6 min-h-[420px] sm:min-h-[480px]" role="img" aria-label="Rep intensity visualization">
      <div className="mb-4 px-6">
        <p className="text-sm font-semibold text-white/85">Rep peak signal (%)</p>
        <p className="text-xs text-white/50">Higher percent means stronger effort on that rep.</p>
      </div>

      <div
        className="relative flex-1 overflow-x-auto px-6"
        ref={scrollContainerRef}
      >
        <div className="flex min-w-max items-end gap-5">
          {reps.map((rep, index) => {
            const repNum = index + 1;
            const isFatigueRep = repNum === fatigueAtRep;
            const heightPercentage = displayHeights[index] ?? Math.min(100, (rep.peak / yAxisMax) * 100);

            const baseGradient = isFatigueRep
              ? 'from-rose-400 via-rose-500 to-rose-600'
              : 'from-sky-400 via-sky-500 to-sky-600';

            const shadowColor = isFatigueRep
              ? 'shadow-[0_18px_42px_-18px_rgba(244,63,94,0.55)]'
              : 'shadow-[0_18px_42px_-18px_rgba(59,130,246,0.4)]';

            return (
              <div
                key={rep.id}
                className="flex h-full min-w-[80px] flex-col items-center gap-3"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-semibold text-white">
                    {Math.round(rep.peak)}%
                  </span>
                  {isFatigueRep && (
                    <span className="rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300 shadow-lg">
                      Fatigue hit
                    </span>
                  )}
                </div>

                <div className="relative flex h-[320px] w-full flex-col justify-end">
                  <div
                    className={`relative h-full w-full overflow-hidden rounded-3xl bg-white/6 ${shadowColor}`}
                  >
                    <div
                      className={`absolute inset-x-0 bottom-0 bg-gradient-to-t ${baseGradient} transition-all duration-500 ease-out`}
                      style={{ height: `${Math.max(6, heightPercentage)}%` }}
                    />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-white/10 blur-2xl" />
                  </div>
                </div>

                <span className="text-xs font-semibold text-white/70">Rep {repNum}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
