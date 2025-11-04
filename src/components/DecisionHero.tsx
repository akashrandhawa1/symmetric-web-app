import React, { useMemo } from 'react';
import type { RecoveryEstimate } from '../lib/recovery';

type Props = {
  est: RecoveryEstimate;
  windowLabel?: string;
};

const SVG_WIDTH = 100;
const SVG_HEIGHT = 56;
const CHART_TOP = 8;
const CHART_BOTTOM = SVG_HEIGHT - 8;

/**
 * Minimal presentation of recovery windows and readiness curve.
 */
const DecisionHero: React.FC<Props> = ({ est, windowLabel }) => {
  const { path, ariaMin, ariaMax } = useMemo(() => {
    const points = est.readinessCurve;
    if (!points || points.length === 0) {
      return {
        path: `M0 ${SVG_HEIGHT} L${SVG_WIDTH} ${SVG_HEIGHT}`,
        ariaMin: 0,
        ariaMax: 0,
      };
    }

    const maxHours = points[points.length - 1].hours || 1;
    const minReady = Math.min(...points.map((p) => p.readiness));
    const maxReady = Math.max(...points.map((p) => p.readiness));
    const readyRange = Math.max(1, maxReady - minReady);
    const chartHeight = CHART_BOTTOM - CHART_TOP;

    const segments = points.map((point, index) => {
      const x =
        maxHours === 0 ? 0 : (point.hours / maxHours) * SVG_WIDTH;
      const normalized = (point.readiness - minReady) / readyRange;
      const y = CHART_BOTTOM - normalized * chartHeight;
      const command = index === 0 ? 'M' : 'L';
      return `${command}${x.toFixed(2)} ${y.toFixed(2)}`;
    });

    return {
      path: segments.join(' '),
      ariaMin: Math.round(minReady),
      ariaMax: Math.round(maxReady),
    };
  }, [est.readinessCurve]);

  const note = est.notes[0] ?? '';

  return (
    <section
      className="w-full max-w-md space-y-3 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-4 text-white backdrop-blur-xl"
      aria-label={`Recovery windows: T80 about ${est.T80h} hours, full readiness about ${est.T85h} hours.`}
    >
      <header className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/60">
          Recovery Outlook
        </p>
        <p className="text-base font-medium text-emerald-400">
          Next optimal: ~{est.T80h}h • Full pop: ~{est.T85h}h
        </p>
        {windowLabel && (
          <p className="text-xs text-white/60">{windowLabel}</p>
        )}
      </header>
      {note && (
        <p className="text-xs text-white/70" role="note">
          {note}
        </p>
      )}
      <svg
        role="img"
        aria-label={`Readiness curve from ${ariaMin} to ${ariaMax}`}
        width="100%"
        height={SVG_HEIGHT}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="text-white/70"
      >
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </section>
  );
};

export default DecisionHero;
