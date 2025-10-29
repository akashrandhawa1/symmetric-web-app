/**
 * Set Summary Card Component
 *
 * Displays end-of-set feedback with performance analysis and next-set guidance.
 * Shows whether user stayed in productive 3-6 rep range.
 *
 * @module components/coach/SetSummaryCard
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { SetSummary } from '@/lib/coach/liveCoaching';

// ============================================================================
// TYPES
// ============================================================================

export type SetSummaryCardProps = {
  summary: SetSummary;
  onContinue: () => void;
  onAdjustWeight?: () => void;
  onEndSession?: () => void;
  /** Whether user listened to coach's ask (shows badge) */
  listened?: boolean;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function SetSummaryCard({
  summary,
  onContinue,
  onAdjustWeight,
  onEndSession,
  listened,
}: SetSummaryCardProps) {
  const { total_reps, zone_achieved, productive_reps, feedback, next_set_guidance, scientific_insight } =
    summary;

  // Visual styling based on performance
  const zoneConfig = {
    goldilocks: {
      icon: '🎯',
      title: 'Perfect Range!',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      textColor: 'text-green-900',
      accentColor: 'bg-green-600',
    },
    warmup: {
      icon: '⬆️',
      title: 'Room for More',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-900',
      accentColor: 'bg-blue-600',
    },
    approaching_limit: {
      icon: '⚠️',
      title: 'Slightly Over',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-900',
      accentColor: 'bg-yellow-600',
    },
    unproductive: {
      icon: '🛑',
      title: 'Too Many Reps',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-900',
      accentColor: 'bg-red-600',
    },
  };

  const config = zoneConfig[zone_achieved];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-2xl mx-auto"
    >
      <div
        className={`${config.bgColor} ${config.borderColor} border-2 rounded-2xl shadow-xl p-6 ${config.textColor}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-4xl" aria-hidden="true">
            {config.icon}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{config.title}</h2>
            <p className="text-sm opacity-75">
              {total_reps} total reps • {productive_reps} in strength zone
            </p>
          </div>
          {listened && (
            <span
              className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-700 opacity-90"
              aria-label="Followed coach adjustment"
            >
              Listened ✓
            </span>
          )}
        </div>

        {/* Rep Range Visualization */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide opacity-75">
              Rep Breakdown
            </span>
          </div>
          <div className="flex gap-1 h-3">
            {Array.from({ length: Math.min(total_reps, 12) }).map((_, i) => {
              const rep = i + 1;
              let color = 'bg-gray-300';
              if (rep <= 2) color = 'bg-blue-300';
              else if (rep >= 3 && rep <= 6) color = 'bg-green-500';
              else if (rep <= 8) color = 'bg-yellow-400';
              else color = 'bg-red-400';

              return (
                <div
                  key={i}
                  className={`flex-1 ${color} rounded-sm transition-all duration-300`}
                  title={`Rep ${rep}`}
                />
              );
            })}
            {total_reps > 12 && (
              <div className="flex-1 bg-red-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">
                +
              </div>
            )}
          </div>
          <div className="flex justify-between text-xs mt-1 opacity-60">
            <span>Warmup (0-2)</span>
            <span className="font-semibold">Strength (3-6)</span>
            <span>Fatigue (8+)</span>
          </div>
        </div>

        {/* Feedback */}
        <div className="space-y-4 mb-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide opacity-75 mb-2">
              How You Did
            </h3>
            <p className="text-base leading-relaxed">{feedback}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide opacity-75 mb-2">
              Next Set Guidance
            </h3>
            <p className="text-base leading-relaxed">{next_set_guidance}</p>
          </div>

          {scientific_insight && (
            <div className={`${config.accentColor} bg-opacity-10 rounded-lg p-3`}>
              <div className="flex items-start gap-2">
                <span className="text-lg" aria-hidden="true">
                  💡
                </span>
                <div className="flex-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide opacity-75 mb-1">
                    Science Tip
                  </h3>
                  <p className="text-sm italic">{scientific_insight}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onContinue}
            className={`flex-1 px-6 py-3 ${config.accentColor} text-white font-semibold rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${config.accentColor}`}
          >
            Continue Next Set
          </button>
          {onAdjustWeight && (
            <button
              onClick={onAdjustWeight}
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Adjust Weight
            </button>
          )}
          {onEndSession && (
            <button
              onClick={onEndSession}
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              End Session
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
