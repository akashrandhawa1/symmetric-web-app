/**
 * Exercise Recommendation Card
 *
 * Displays Gemini-powered exercise recommendations with prescription details,
 * load adjustments, alternatives, and fatigue guardrails.
 *
 * @module components/ExerciseRecommendationCard
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { ExerciseRecommendation } from '../services/exerciseRecommendation';

export type ExerciseRecommendationCardProps = {
  recommendation: ExerciseRecommendation;
  onAccept: () => void;
  onViewAlternatives?: () => void;
  isLoading?: boolean;
  isFallback?: boolean;
};

/**
 * Card displaying AI-powered exercise recommendation with full prescription.
 */
export const ExerciseRecommendationCard: React.FC<ExerciseRecommendationCardProps> = ({
  recommendation,
  onAccept,
  onViewAlternatives,
  isLoading = false,
  isFallback = false,
}) => {
  const { next_exercise, prescription, adjustments, alternatives, fatigue_guardrail, confidence } = recommendation;

  const isMainLift = next_exercise.intent === 'main';
  const confidenceColor = confidence >= 0.8 ? 'text-emerald-400' : confidence >= 0.6 ? 'text-yellow-400' : 'text-orange-400';

  const loadIcon = {
    increase: '⬆️',
    decrease: '⬇️',
    hold: '➡️',
    'n/a': '—',
  }[adjustments.load];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-2 border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 px-6 py-4 border-b border-purple-500/30">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl" aria-hidden="true">
                {isMainLift ? '🎯' : '💪'}
              </span>
              <div>
                <h2 className="text-2xl font-bold text-white">{next_exercise.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs uppercase font-semibold text-purple-300">
                    {next_exercise.intent}
                  </span>
                  {isFallback && (
                    <span className="text-xs bg-yellow-900/40 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/30">
                      Local Mode
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase">Confidence</div>
            <div className={`text-2xl font-bold ${confidenceColor}`}>
              {Math.round(confidence * 100)}%
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-300 mt-3 italic">{next_exercise.rationale}</p>
      </div>

      {/* Prescription */}
      <div className="p-6 space-y-6">
        {/* Set Details */}
        <div>
          <h3 className="text-sm font-semibold uppercase text-gray-400 mb-3">Prescription</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 uppercase mb-1">Sets × Reps</div>
              <div className="text-xl font-bold text-white">
                {prescription.sets} × {prescription.reps}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 uppercase mb-1">Rest</div>
              <div className="text-xl font-bold text-white">{prescription.rest_s}s</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 col-span-2">
              <div className="text-xs text-gray-400 uppercase mb-1">Tempo</div>
              <div className="text-lg font-mono text-white">{prescription.tempo}</div>
              <div className="text-xs text-gray-500 mt-1">eccentric-pause-concentric-pause</div>
            </div>
          </div>
          {prescription.notes && (
            <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="text-xs text-blue-300 uppercase font-semibold mb-1">Notes</div>
              <p className="text-sm text-gray-200">{prescription.notes}</p>
            </div>
          )}
        </div>

        {/* Load Adjustment */}
        {adjustments.load !== 'n/a' && (
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-400 mb-3">Load Adjustment</h3>
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-900/20 to-green-900/20 border border-emerald-500/30 rounded-lg">
              <div className="text-4xl">{loadIcon}</div>
              <div className="flex-1">
                <div className="text-lg font-bold text-white capitalize">{adjustments.load} Load</div>
                <p className="text-sm text-gray-300">{adjustments.why}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fatigue Guardrail */}
        <div>
          <h3 className="text-sm font-semibold uppercase text-gray-400 mb-3">Safety Guardrail</h3>
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div className="flex-1">
                <div className="text-xs text-red-300 uppercase font-semibold mb-1">Stop If</div>
                <p className="text-sm text-gray-200">{fatigue_guardrail.stop_if}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>⏱️</span>
              <span>Retest readiness after {fatigue_guardrail.retest_after_s}s</span>
            </div>
          </div>
        </div>

        {/* Alternatives */}
        {alternatives && alternatives.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase text-gray-400">Alternatives</h3>
              {onViewAlternatives && (
                <button
                  onClick={onViewAlternatives}
                  className="text-xs text-purple-400 hover:text-purple-300 underline"
                >
                  View All
                </button>
              )}
            </div>
            <div className="space-y-2">
              {alternatives.slice(0, 2).map((alt, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-gray-800/30 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                >
                  <div className="font-semibold text-white text-sm">{alt.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{alt.when_to_use}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onAccept}
          disabled={isLoading}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all transform active:scale-95 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : `Start ${next_exercise.name}`}
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Loading skeleton for recommendation card.
 */
export const ExerciseRecommendationSkeleton: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-2 border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden animate-pulse">
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 px-6 py-4 border-b border-purple-500/30">
        <div className="h-8 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
      <div className="p-6 space-y-6">
        <div className="h-32 bg-gray-700 rounded"></div>
        <div className="h-24 bg-gray-700 rounded"></div>
        <div className="h-16 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
};
