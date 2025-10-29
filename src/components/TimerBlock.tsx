import React, { useState, useEffect } from 'react';
import type { NextSetPlan } from '../types';
import { PlanCapsule } from './PlanCapsule';

const judgmentColorMap: Record<'productive' | 'neutral' | 'protect', string> = {
  productive: '#3b82f6',
  neutral: '#94a3b8',
  protect: '#f97316',
};

interface TimerBlockProps {
  timeLeftSec: number;
  setsCompleted: number;
  setsPlanned: number;
  judgment: 'productive' | 'neutral' | 'protect';
  subLabel?: string | null;
  planCapsule?: NextSetPlan['kind'] | null;
}

export const TimerBlock: React.FC<TimerBlockProps> = ({
  timeLeftSec,
  setsCompleted,
  setsPlanned,
  judgment,
  subLabel,
  planCapsule,
}) => {
  const [showHighlight, setShowHighlight] = useState(false);
  const [lastPlan, setLastPlan] = useState<NextSetPlan['kind'] | null>(null);

  useEffect(() => {
    if (!planCapsule) return;
    setLastPlan(planCapsule);
    setShowHighlight(true);
    const timeout = window.setTimeout(() => setShowHighlight(false), 600);
    return () => window.clearTimeout(timeout);
  }, [planCapsule]);

  const total = Math.max(setsPlanned, 1);
  const completed = Math.min(setsCompleted, total);
  const progress = Math.min(1, completed / total);
  const minutes = Math.floor(Math.max(timeLeftSec, 0) / 60);
  const seconds = Math.floor(Math.max(timeLeftSec, 0) % 60);
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const size = 164;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const ringColor = judgmentColorMap[judgment];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(148, 163, 184, 0.25)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-4xl font-black tracking-tight text-white">{display}</span>
          <span className="text-xs font-medium text-white/60">Set {completed}/{total}</span>
        </div>
      </div>
      {subLabel && (
        <span className="text-xs font-medium text-white/60 text-center transition-opacity duration-300">
          {subLabel}
        </span>
      )}
      {lastPlan && (
        <PlanCapsule planKind={lastPlan} highlight={showHighlight} />
      )}
    </div>
  );
};
