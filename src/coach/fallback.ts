/**
 * Fallback Coach
 *
 * Deterministic fallback when LLM fails or is unavailable.
 */

import type { CoachJSON, CoachMode } from './types';

/**
 * Generates safe fallback coaching based on mode
 */
export function fallbackCoach(mode: CoachMode): CoachJSON {
  if (mode === 'TRAIN') {
    return {
      type: 'suggestion',
      mode,
      message: "Build strength now—short, clean block; stop before power or balance slips.",
      cta: "Start strength block"
    };
  }

  if (mode === 'ACTIVE_RECOVERY') {
    return {
      type: 'suggestion',
      mode,
      message: "Bank the work with light cardio and mobility so tomorrow hits harder.",
      cta: "Start recovery (20–30 min)"
    };
  }

  return {
    type: 'suggestion',
    mode,
    message: "Call it for today—sleep, protein, and a short walk set up a better block.",
    cta: "Plan tomorrow"
  };
}

/**
 * Determines safe fallback mode based on basic signals
 */
export function determineFallbackMode(signals: {
  readiness: number;
  hrWarning?: boolean;
  fatigueHigh?: boolean;
  hoursSinceLastSameMuscle?: number;
}): CoachMode {
  // Safety first
  if (signals.hrWarning || signals.fatigueHigh) {
    return 'FULL_REST';
  }

  // Cooldown period
  if (signals.hoursSinceLastSameMuscle != null && signals.hoursSinceLastSameMuscle < 24) {
    return 'ACTIVE_RECOVERY';
  }

  // Readiness-based
  if (signals.readiness >= 70) {
    return 'TRAIN';
  }

  if (signals.readiness >= 55) {
    return 'ACTIVE_RECOVERY';
  }

  return 'FULL_REST';
}

/**
 * Full fallback with mode determination
 */
export function fullFallback(signals?: {
  readiness?: number;
  hrWarning?: boolean;
  fatigueHigh?: boolean;
  hoursSinceLastSameMuscle?: number;
}): CoachJSON {
  const mode = signals
    ? determineFallbackMode({
        readiness: signals.readiness ?? 70,
        hrWarning: signals.hrWarning,
        fatigueHigh: signals.fatigueHigh,
        hoursSinceLastSameMuscle: signals.hoursSinceLastSameMuscle,
      })
    : 'ACTIVE_RECOVERY'; // Conservative default

  return fallbackCoach(mode);
}
