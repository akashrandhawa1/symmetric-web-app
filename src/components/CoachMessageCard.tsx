import React from 'react';
import type { CoachMessage } from '../types';

interface CoachMessageCardProps {
  message: CoachMessage;
}

export const CoachMessageCard: React.FC<CoachMessageCardProps> = ({ message }) => (
  <div className="w-full max-w-[360px] rounded-3xl border border-white/10 bg-slate-900/95 px-5 py-4 text-left shadow-2xl backdrop-blur-lg transition-opacity duration-150">
    <p className="text-sm font-semibold text-white">{message.primary}</p>
    <p className="mt-2 text-sm text-white/70">{message.secondary}</p>
    <p className="mt-3 text-xs font-medium text-white/70">{message.planLine}</p>
    <div className="mt-4 flex justify-end">
      <span className="text-xs font-semibold tracking-wide text-white/70">{message.feelTarget}</span>
    </div>
  </div>
);
