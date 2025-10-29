/**
 * Telemetry event emitters for the Rest Screen Coach.
 *
 * Responsibilities:
 * - Emit structured events for coach interactions
 * - Support pluggable external telemetry systems via window.__telemetry
 * - Fall back to console.debug in development mode
 * - Type-safe event payloads
 *
 * Events emitted:
 * - coach_advice_shown: When advice is displayed to user
 * - coach_user_decision: When user takes action (Did it / Skip / Do anyway)
 * - coach_next_set_outcome: After next set completes (called by external code)
 *
 * @module lib/coach/telemetry
 */

import type { CoachAdvice } from './types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type UserDecision = 'did' | 'skip' | 'override';

export type CoachAdviceShownPayload = {
  advice_id: string;
  advice_type: CoachAdvice['advice_type'];
  projection_ci: number | null;
  confidence: number;
  telemetry_tags: string[];
  timestamp: number;
};

export type CoachUserDecisionPayload = {
  advice_id: string;
  decision: UserDecision;
  reason_code?: string;
  time_to_decision_ms: number;
  timestamp: number;
};

export type CoachNextSetOutcomePayload = {
  advice_id: string;
  actual_reps: number;
  actual_fatigue_rep: number | null;
  actual_symmetry_pct: number | null;
  advice_followed: boolean;
  timestamp: number;
};

// ============================================================================
// TELEMETRY INTERFACE
// ============================================================================

/**
 * Global telemetry interface that can be plugged in via window.__telemetry.
 * If not present, events are logged to console in dev mode.
 */
declare global {
  interface Window {
    __telemetry?: {
      emit: (eventName: string, payload: unknown) => void;
    };
  }
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Internal emit function that routes to window.__telemetry or console.
 *
 * @param eventName - Name of the event
 * @param payload - Event payload
 */
function emit(eventName: string, payload: unknown): void {
  // Try external telemetry system
  if (typeof window !== 'undefined' && window.__telemetry?.emit) {
    try {
      window.__telemetry.emit(eventName, payload);
    } catch (error) {
      console.error('Telemetry emit error:', error);
    }
  }

  // Always log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[Telemetry] ${eventName}`, payload);
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Emits coach_advice_shown event when advice is first displayed to user.
 *
 * @param advice - The advice object being shown
 */
export function emitAdviceShown(advice: CoachAdvice): void {
  const payload: CoachAdviceShownPayload = {
    advice_id: advice.advice_id,
    advice_type: advice.advice_type,
    projection_ci: advice.projection?.ci ?? null,
    confidence: advice.confidence,
    telemetry_tags: advice.telemetry_tags,
    timestamp: Date.now(),
  };

  emit('coach_advice_shown', payload);
}

/**
 * Emits coach_user_decision event when user clicks Did it / Skip / Do anyway.
 *
 * @param params - Decision parameters
 * @param params.advice_id - ID of the advice being responded to
 * @param params.decision - User's choice: 'did', 'skip', or 'override'
 * @param params.reason_code - Optional reason code (for skip/override)
 * @param params.time_to_decision_ms - Time from advice shown to decision (ms)
 */
export function emitUserDecision(params: {
  advice_id: string;
  decision: UserDecision;
  reason_code?: string;
  time_to_decision_ms: number;
}): void {
  const payload: CoachUserDecisionPayload = {
    advice_id: params.advice_id,
    decision: params.decision,
    reason_code: params.reason_code,
    time_to_decision_ms: params.time_to_decision_ms,
    timestamp: Date.now(),
  };

  emit('coach_user_decision', payload);
}

/**
 * Emits coach_next_set_outcome event after the next set completes.
 * This should be called by external code (e.g., set completion handler) with actual metrics.
 *
 * @param params - Next set outcome parameters
 * @param params.advice_id - ID of the advice that preceded this set
 * @param params.actual_reps - Actual reps performed
 * @param params.actual_fatigue_rep - Rep at which fatigue occurred (null if none)
 * @param params.actual_symmetry_pct - Symmetry percentage achieved
 * @param params.advice_followed - Whether user followed the advice
 */
export function emitNextSetOutcome(params: {
  advice_id: string;
  actual_reps: number;
  actual_fatigue_rep: number | null;
  actual_symmetry_pct: number | null;
  advice_followed: boolean;
}): void {
  const payload: CoachNextSetOutcomePayload = {
    advice_id: params.advice_id,
    actual_reps: params.actual_reps,
    actual_fatigue_rep: params.actual_fatigue_rep,
    actual_symmetry_pct: params.actual_symmetry_pct,
    advice_followed: params.advice_followed,
    timestamp: Date.now(),
  };

  emit('coach_next_set_outcome', payload);
}

/**
 * Utility to install a custom telemetry handler.
 * Useful for testing or integrating with external analytics systems.
 *
 * @param handler - Function to handle telemetry events
 */
export function installTelemetryHandler(
  handler: (eventName: string, payload: unknown) => void
): void {
  if (typeof window !== 'undefined') {
    window.__telemetry = { emit: handler };
  }
}

/**
 * Utility to remove custom telemetry handler (useful in tests).
 */
export function clearTelemetryHandler(): void {
  if (typeof window !== 'undefined') {
    delete window.__telemetry;
  }
}
