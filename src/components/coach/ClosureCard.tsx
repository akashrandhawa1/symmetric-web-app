/**
 * Closure Card Component
 *
 * Shows final summary after user follows a weight adjustment ask.
 * Displays the applied change and whether they locked in a new working weight.
 *
 * @module components/coach/ClosureCard
 */

import React from 'react';
import { motion } from 'framer-motion';

export type ClosureCardProps = {
  /** Change percentage that was applied */
  changePct: number;
  /** Outcome of the set */
  outcome: 'hit' | 'early' | 'late' | 'under';
  /** Weight locked in for next session (if target hit) */
  lockedInKg?: number;
  /** Exercise name */
  exercise?: string;
};

/**
 * Closure card showing session summary after weight adjustment.
 *
 * Rendered only when a weight ask occurred and we have results.
 * Shows primary line (what happened) and secondary line (locked weight if applicable).
 */
export function ClosureCard({ changePct, outcome, lockedInKg, exercise }: ClosureCardProps) {
  const changeStr = changePct > 0 ? `+${changePct.toFixed(1)}%` : `${changePct.toFixed(1)}%`;

  const primaryLine = (() => {
    if (outcome === 'hit') {
      return `Applied ${changeStr} and hit the strength pocket${exercise ? ` on ${exercise}` : ''}.`;
    } else if (outcome === 'early') {
      return `Applied ${changeStr}, managed solid reps despite early fatigue${exercise ? ` on ${exercise}` : ''}.`;
    } else if (outcome === 'late') {
      return `Applied ${changeStr}, had more in the tank${exercise ? ` on ${exercise}` : ''}.`;
    } else {
      return `Applied ${changeStr}, stayed focused${exercise ? ` on ${exercise}` : ''}.`;
    }
  })();

  const secondaryLine = lockedInKg
    ? `Locked for next time: ${lockedInKg}kg`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-xl p-4 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl" aria-hidden="true">
          📊
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wide mb-1">
            Session Summary
          </h3>
          <p className="text-white text-base leading-relaxed mb-1">{primaryLine}</p>
          {secondaryLine && (
            <p className="text-emerald-300 text-sm font-medium">{secondaryLine}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
