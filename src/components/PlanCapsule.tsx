import React from 'react';
import type { NextSetPlan } from '../types';

const planCapsuleLabel: Record<NextSetPlan['kind'], string> = {
  hold: 'Hold',
  drop5: '-5% Load',
  drop10: '-10% Load',
  tempo212: 'Tempo 2-1-2',
  cap1: 'Cap -1',
  rest60: '+60s Rest',
  technique: 'Technique',
  add12: '+1–2 Reps',
};

interface PlanCapsuleProps {
  planKind: NextSetPlan['kind'];
  highlight: boolean;
}

export const PlanCapsule: React.FC<PlanCapsuleProps> = ({ planKind, highlight }) => (
  <div
    className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white/90 transition-all duration-500 ${
      highlight ? 'bg-white/25 shadow-[0_0_0_2px_rgba(148,163,184,0.35)]' : 'bg-white/10'
    }`}
  >
    {planCapsuleLabel[planKind] ?? 'Plan'}
  </div>
);
