import React from 'react';
import classNames from 'classnames';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { useCoachGate, type CoachGateContext } from '../../hooks/useCoachGate';

type CoachTriggerProps = {
  ctx: CoachGateContext;
  onOpen: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export const CoachTrigger: React.FC<CoachTriggerProps> = ({ ctx, onOpen, className, style }) => {
  const gate = useCoachGate(ctx);
  if (!gate.canOpen) return null;

  if (gate.trigger === 'dj') {
    return (
      <div
        className={classNames(
          'fixed bottom-[calc(env(safe-area-inset-bottom)+30px)] inset-x-0 z-[95] flex flex-col items-center gap-3',
          className,
        )}
        style={style}
      >
        <motion.button
          type="button"
          onClick={onOpen}
          className="group relative flex h-[72px] w-[180px] items-center justify-center rounded-full focus:outline-none"
          aria-label="Talk to your voice coach"
          whileTap={{ scale: 0.94 }}
        >
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(135deg,#00F5A0,#00D9F5)' }}
            animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1.03, 0.98] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          />
          <motion.span
            className="absolute inset-[4px] rounded-full bg-slate-950/80"
            animate={{ opacity: [0.8, 0.95, 0.8] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          />
          <span className="relative mx-3 flex w-full items-center justify-center gap-3 rounded-full bg-transparent text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white shadow-inner shadow-emerald-400/40">
              <Mic className="h-5 w-5" />
            </span>
            <div className="flex flex-col items-start text-left">
              <span className="text-[0.72rem] uppercase tracking-[0.42em] text-white/60">Coach Milo</span>
              <span className="text-sm font-semibold text-white">Tap to talk</span>
            </div>
          </span>
          <motion.span
            className="pointer-events-none absolute -inset-4 rounded-full border border-white/10"
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.button>
        <span className="text-xs font-semibold uppercase tracking-[0.38em] text-white/70">Coach Milo</span>
      </div>
    );
  }

  if (gate.trigger === 'mic') {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={classNames(
          'fixed bottom-[calc(env(safe-area-inset-bottom)+24px)] right-5 z-[80]',
          'flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/90 text-emerald-50',
          'shadow-[0_18px_40px_rgba(16,185,129,0.45)] backdrop-blur transition hover:scale-105 active:scale-[0.94]',
          className,
        )}
        style={style}
        aria-label="Open coach dock"
      >
        <Mic size={22} />
      </button>
    );
  }

  return (
    <div
      className={classNames(
        'pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-[60] flex justify-center px-4',
        className,
      )}
      style={style}
    >
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-50 shadow-[0_12px_30px_rgba(16,185,129,0.25)] backdrop-blur transition hover:bg-emerald-500/25 active:scale-[0.98]"
      >
        <Sparkles size={16} />
        Ask Coach
      </button>
    </div>
  );
};

export default CoachTrigger;
