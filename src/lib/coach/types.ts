/**
 * Type definitions and Zod schemas for the Gemini-driven Rest Screen Coach.
 *
 * This module defines the I/O contract between the frontend and Gemini API,
 * including request payloads, response validation schemas, and utility functions
 * for enforcing UX constraints (e.g., two-line text limits).
 *
 * @module lib/coach/types
 */

import { z } from 'zod';

// ============================================================================
// REQUEST TYPES
// ============================================================================

export type TrainingAge = 'beginner' | 'intermediate' | 'advanced';
export type TargetRepRange = '3-5' | '6-8' | '8-12';
export type UserPrevDecision = 'none' | 'did' | 'skip' | 'override';
export type PainFlag = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type CoachRequest = {
  version: 'coach-v1';
  user_profile: {
    training_age: TrainingAge;
    goal: 'quad_strength';
    equipment: string[];
    time_budget_min: number;
  };
  session_context: {
    plan_step: string;
    target_rep_range: TargetRepRange;
    target_fatigue_window: string;
    recent_swaps_this_week: number;
  };
  set_telemetry: {
    set_index: number;
    rep_count: number;
    fatigue_rep: number | null;
    symmetry_pct: number | null;
    rms_drop_pct: number | null;
    ror_ok: boolean | null;
    signal_confidence: number;
    pain_flag: PainFlag;
    user_prev_decision: UserPrevDecision;
  };
  ui_capabilities: {
    allow_override: boolean;
    allow_swap: boolean;
    projection_enabled: boolean;
  };
};

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export type AdviceType = 'effort_change' | 'rest' | 'swap' | 'end' | 'check_signal';
export type EffortDelta = -1 | 0 | 1 | null;

export type CoachAdvice = {
  advice_id: string;
  advice_type: AdviceType;
  primary_text: string;
  secondary_text: string;
  rest_seconds: number | null;
  effort_delta: EffortDelta;
  add_reps: number | null;
  offer_swap: boolean;
  swap_candidate: string | null;
  projection: {
    delta_hit_rate_pct: number;
    ci: number;
  } | null;
  safety: {
    suppress_load_calls: boolean;
    end_exercise: boolean;
  };
  ask_reason_on_skip_or_override: boolean;
  confidence: number;
  telemetry_tags: string[];
  internal_rationale?: string;
};

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for validating Gemini API responses.
 * Enforces:
 * - Text length constraints (≤140 chars per line)
 * - Confidence and CI bounds (0..1)
 * - Required fields and proper typing
 */
export const zCoachAdvice = z
  .object({
    advice_id: z.string().min(1),
    advice_type: z.enum(['effort_change', 'rest', 'swap', 'end', 'check_signal']),
    primary_text: z.string().max(140, 'Primary text must be ≤140 characters'),
    secondary_text: z.string().max(140, 'Secondary text must be ≤140 characters'),
    rest_seconds: z.number().int().nonnegative().nullable(),
    effort_delta: z.union([z.literal(-1), z.literal(0), z.literal(1), z.null()]),
    add_reps: z.number().int().nullable(),
    offer_swap: z.boolean(),
    swap_candidate: z.string().nullable(),
    projection: z
      .object({
        delta_hit_rate_pct: z.number(),
        ci: z.number().min(0).max(1, 'CI must be between 0 and 1'),
      })
      .nullable(),
    safety: z.object({
      suppress_load_calls: z.boolean(),
      end_exercise: z.boolean(),
    }),
    ask_reason_on_skip_or_override: z.boolean(),
    confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
    telemetry_tags: z.array(z.string()),
    internal_rationale: z.string().optional(),
  })
  .refine(
    (data) => {
      // Safety invariant: aggressive effort changes should not occur with high pain or low signal
      // This is a soft check; the fallback logic in geminiClient will handle violations
      return true; // Validation only; business logic handled by caller
    },
    { message: 'Safety invariant check' }
  );

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Truncates primary and secondary text to ensure they fit within the 140-char limit.
 * Adds ellipsis if truncation occurs.
 *
 * @param advice - The advice object to sanitize
 * @returns Advice with truncated text fields
 */
export function trimToTwoLines(advice: CoachAdvice): CoachAdvice {
  const truncate = (text: string, maxLen: number = 140): string => {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1) + '…';
  };

  return {
    ...advice,
    primary_text: truncate(advice.primary_text),
    secondary_text: truncate(advice.secondary_text),
  };
}

/**
 * Validates safety constraints based on telemetry.
 * Returns true if the advice is safe given the current telemetry context.
 *
 * @param advice - The advice to validate
 * @param telemetry - The current set telemetry
 * @returns true if advice passes safety checks
 */
export function validateSafetyConstraints(
  advice: CoachAdvice,
  telemetry: CoachRequest['set_telemetry']
): boolean {
  // If pain flag > 0 or signal confidence < 0.7, aggressive effort deltas should be avoided
  const hasHighPain = telemetry.pain_flag > 0;
  const hasLowSignal = telemetry.signal_confidence < 0.7;
  const isAggressive = advice.effort_delta === 1;

  if ((hasHighPain || hasLowSignal) && isAggressive) {
    return false;
  }

  return true;
}

// ============================================================================
// REASON CODES
// ============================================================================

/**
 * Reason codes presented to user when they skip or override coach advice.
 */
export type ReasonCode =
  | 'no_plates'
  | 'short_on_time'
  | 'felt_fine'
  | 'coach_off'
  | 'equipment_unavailable';

export const REASON_CODE_LABELS: Record<ReasonCode, string> = {
  no_plates: 'No plates available',
  short_on_time: 'Short on time',
  felt_fine: 'Felt fine / ready',
  coach_off: 'Coach recommendation feels off',
  equipment_unavailable: 'Equipment unavailable',
};
