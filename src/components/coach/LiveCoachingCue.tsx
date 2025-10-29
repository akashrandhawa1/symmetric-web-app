/**
 * Live Coaching Cue Component
 *
 * Displays real-time drop-down cues during set execution.
 * Shows different messages as user progresses through rep zones.
 *
 * @module components/coach/LiveCoachingCue
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LiveCue, LiveCoachingContext } from '@/lib/coach/liveCoaching';
import { getLiveCue, getRepZone } from '@/lib/coach/liveCoaching';

// ============================================================================
// TYPES
// ============================================================================

export type LiveCoachingCueProps = {
  context: LiveCoachingContext;
  onRepComplete?: (rep: number) => void;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function LiveCoachingCue({ context, onRepComplete }: LiveCoachingCueProps) {
  const [currentCue, setCurrentCue] = useState<LiveCue | null>(null);
  const [showCue, setShowCue] = useState(false);
  const [variationIndex, setVariationIndex] = useState(0);

  // Generate new cue when rep changes
  useEffect(() => {
    const cue = getLiveCue(context, variationIndex);
    setCurrentCue(cue);
    setShowCue(true);

    // Auto-hide after 3 seconds for warmup/goldilocks, keep visible for warnings
    const hideTimeout =
      cue.tone === 'warning'
        ? null
        : setTimeout(() => {
            setShowCue(false);
          }, 3000);

    // Increment variation for next cue
    setVariationIndex((prev) => prev + 1);

    if (onRepComplete) {
      onRepComplete(context.current_rep);
    }

    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [context.current_rep]);

  if (!currentCue) return null;

  const zone = getRepZone(context.current_rep);

  // Color scheme based on zone
  const colorScheme = {
    warmup: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: '🔵',
    },
    goldilocks: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'text-green-900',
      icon: '✨',
    },
    approaching_limit: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      text: 'text-yellow-900',
      icon: '⚠️',
    },
    unproductive: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-900',
      icon: '🛑',
    },
  };

  const colors = colorScheme[zone];

  return (
    <AnimatePresence>
      {showCue && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4"
        >
          <div
            className={`${colors.bg} ${colors.border} border-2 rounded-xl shadow-lg p-4 ${colors.text}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0" aria-hidden="true">
                {colors.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-75">
                    Rep {context.current_rep}
                  </span>
                  <span className="text-xs font-medium opacity-60">
                    {zone === 'goldilocks' && 'Strength Zone'}
                    {zone === 'warmup' && 'Building Up'}
                    {zone === 'approaching_limit' && 'Near Limit'}
                    {zone === 'unproductive' && 'Fatigue Zone'}
                  </span>
                </div>
                <p className="text-base font-medium leading-snug">{currentCue.message}</p>
                {currentCue.scientific_tip && (
                  <p className="text-sm mt-2 opacity-80 italic">{currentCue.scientific_tip}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// REP COUNTER DISPLAY
// ============================================================================

export type RepCounterProps = {
  currentRep: number;
  targetRange: [number, number];
  zone: 'warmup' | 'goldilocks' | 'approaching_limit' | 'unproductive';
};

export function RepCounter({ currentRep, targetRange, zone }: RepCounterProps) {
  const zoneColors = {
    warmup: 'text-blue-600',
    goldilocks: 'text-green-600',
    approaching_limit: 'text-yellow-600',
    unproductive: 'text-red-600',
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`text-8xl font-bold font-mono ${zoneColors[zone]} transition-colors duration-300`}>
        {currentRep}
      </div>
      <div className="text-sm text-gray-600 mt-2">
        Target: {targetRange[0]}-{targetRange[1]} reps
      </div>
      {zone === 'goldilocks' && (
        <div className="text-xs text-green-600 font-medium mt-1 animate-pulse">
          ⭐ In Strength Zone
        </div>
      )}
    </div>
  );
}
