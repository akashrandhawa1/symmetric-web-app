import React from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { TypewriterText } from './TypewriterText';

interface CoachCardProps {
  line1: string;
  line2: string;
  isTyping: boolean;
}

const CoachAvatar: React.FC<{ isTyping: boolean }> = ({ isTyping }) => (
  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-300/70 via-amber-200/50 to-[#ffffff1f] shadow-inner ring-1 ring-amber-200/40">
    <span className="text-lg font-semibold text-slate-900">S</span>
    {isTyping && (
      <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-300 [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-300 [animation-delay:-0.05s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-300" />
      </span>
    )}
  </div>
);

import { motion } from 'framer-motion';

export const CoachCard: React.FC<CoachCardProps> = ({ line1, line2, isTyping }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.section
      whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(251,191,36,0.10)' }}
      whileTap={{ scale: 0.97, opacity: 0.85 }}
      className="w-full max-w-md rounded-2xl bg-slate-900/70 border border-slate-700/70 backdrop-blur-md px-6 py-6 shadow-[0_12px_32px_rgba(0,0,0,0.45)] space-y-4 transition-shadow duration-200 focus:outline-none"
      aria-live="polite"
      tabIndex={0}
    >
      <header className="flex items-center gap-3">
        <CoachAvatar isTyping={isTyping} />
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.32em] text-amber-100/70">Symmetric Coach</span>
          {isTyping && (
            <span className="text-[11px] text-slate-400" role="status">Crafting your guidance…</span>
          )}
        </div>
      </header>
      <div className="space-y-2 text-left">
        {line1 && (
          <TypewriterText
            text={line1}
            speed={prefersReducedMotion ? undefined : Math.max(12, Math.floor(1200 / Math.max(1, line1.length)))}
            className="text-base text-slate-100 leading-relaxed"
          />
        )}
        {line2 && (
          <TypewriterText
            text={line2}
            speed={prefersReducedMotion ? undefined : Math.max(12, Math.floor(1200 / Math.max(1, line2.length)))}
            delay={prefersReducedMotion ? 0 : 150}
            className="text-base font-semibold text-slate-50 leading-relaxed"
          />
        )}
      </div>
    </motion.section>
  );
};
