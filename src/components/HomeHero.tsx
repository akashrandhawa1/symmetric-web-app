import React, { useMemo } from 'react';

interface HomeHeroProps {
  recoveryScore: number | null;
  scheduleLine: string | null;
  trendLabel: string;
  trendHasData: boolean;
  onTrendInfo: () => void;
  readinessTone: 'green' | 'yellow' | 'red' | 'unknown';
}

const HERO_ACCENTS: Record<HomeHeroProps['readinessTone'], {
  pulseInner: string;
  pulseOuter: string;
  label: string;
  labelClass: string;
}> = {
  green: {
    pulseInner: 'rgba(16, 185, 129, 0.6)',
    pulseOuter: 'rgba(16, 185, 129, 0)',
    label: 'Primed · build smart',
    labelClass: 'text-emerald-100/85',
  },
  yellow: {
    pulseInner: 'rgba(250, 204, 21, 0.55)',
    pulseOuter: 'rgba(250, 204, 21, 0)',
    label: 'Steady · keep it smooth',
    labelClass: 'text-amber-100/85',
  },
  red: {
    pulseInner: 'rgba(248, 113, 113, 0.5)',
    pulseOuter: 'rgba(248, 113, 113, 0)',
    label: 'Rebuilding · prioritize recovery',
    labelClass: 'text-rose-100/85',
  },
  unknown: {
    pulseInner: 'rgba(148, 163, 184, 0.35)',
    pulseOuter: 'rgba(148, 163, 184, 0)',
    label: 'Readiness unavailable',
    labelClass: 'text-slate-300/90',
  },
};

export const HomeHero: React.FC<HomeHeroProps> = ({
  recoveryScore,
  scheduleLine,
  trendLabel,
  trendHasData,
  onTrendInfo,
  readinessTone,
}) => {
  const displayScore = recoveryScore != null ? Math.round(recoveryScore) : '--';
  const accent = HERO_ACCENTS[readinessTone] ?? HERO_ACCENTS.unknown;

  const pulseStyle = {
    background: `radial-gradient(circle, ${accent.pulseInner} 0%, ${accent.pulseOuter} 65%)`,
  };

  const normalizedSchedule = useMemo(() => {
    if (!scheduleLine) return null;
    const parts = scheduleLine.split('—').map((part) => part.trim());
    if (parts.length >= 2 && parts[1].toLowerCase().startsWith('next optimal session')) {
      const baseTiming = parts[0].replace(/\s*•\s*in\s*~?\d+h?$/i, '').split(/•\s*in\s*/i)[0]?.trim() ?? parts[0];
      if (!baseTiming) return scheduleLine;
      return `Next optimal session on ${baseTiming}`;
    }
    return scheduleLine;
  }, [scheduleLine]);

  return (
    <section className="flex flex-col items-center text-center gap-3 py-1" aria-live="polite">
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-[210px] w-[210px] items-center justify-center">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 blur-[70px] opacity-80 transition-all duration-700"
            style={pulseStyle}
            aria-hidden="true"
          />
          <span className="relative text-[92px] leading-none font-light text-slate-100 tracking-tight drop-shadow-[0_0_32px_rgba(241,245,249,0.35)]">
            {displayScore}
          </span>
        </div>
      </div>

      <p className={`text-sm md:text-base font-medium tracking-wide ${accent.labelClass}`}>{accent.label}</p>
      {normalizedSchedule && (
        <p className="text-base md:text-lg font-semibold text-slate-100 tracking-tight">
          {normalizedSchedule}
        </p>
      )}
      <button
        type="button"
        onClick={onTrendInfo}
        className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs font-medium text-slate-200 bg-slate-900/60 hover:border-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300/40"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-slate-400/70" aria-hidden="true" />
        <span>{trendLabel}</span>
        <span className="text-slate-500" aria-hidden="true">ℹ︎</span>
        {!trendHasData && <span className="sr-only">Trend not available yet</span>}
      </button>
    </section>
  );
};
