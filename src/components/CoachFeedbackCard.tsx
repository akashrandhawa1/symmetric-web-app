import React from 'react';
import type { CoachMessage } from '../types';

interface CoachFeedbackCardProps {
  message: CoachMessage;
}

export const CoachFeedbackCard: React.FC<CoachFeedbackCardProps> = ({ message }) => {
  const { primary, secondary, planLine, feelTarget } = message;

  const planText = planLine?.replace(/^Plan:\s*/i, '').trim();
  const cueText = feelTarget?.trim();
  const parts = [primary, secondary, planText, cueText].filter(
    (segment): segment is string => Boolean(segment && segment.length > 0),
  );
  const combinedText = parts.join(' ').replace(/\s+/g, ' ').trim();

  return (
    <div className="w-full max-w-[360px] rounded-3xl border border-white/10 bg-slate-900/95 px-5 py-4 text-left shadow-2xl backdrop-blur-lg transition-opacity duration-120">
      <p className="text-sm font-semibold text-white leading-relaxed">{combinedText}</p>
    </div>
  );
};

export default CoachFeedbackCard;
