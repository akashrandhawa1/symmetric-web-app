/**
 * Test fixtures for Rest Screen Coach.
 *
 * Provides 10+ golden fixtures covering various scenarios:
 * - Early fatigue (advice: reduce effort)
 * - No fatigue in window (advice: increase effort/reps)
 * - In-window performance (advice: maintain)
 * - Symmetry issues (advice: unilateral work)
 * - Pain flags (advice: safety checks)
 * - Low signal confidence (advice: check signal)
 * - Override history (advice: allow agency)
 * - Projection present/absent scenarios
 *
 * @module mocks/coachFixtures
 */

import type { CoachRequest, CoachAdvice } from '@/lib/coach/types';

// ============================================================================
// BASE PROFILE (reusable defaults)
// ============================================================================

const baseUserProfile: CoachRequest['user_profile'] = {
  training_age: 'intermediate',
  goal: 'quad_strength',
  equipment: ['db', 'barbell'],
  time_budget_min: 30,
};

const baseSessionContext: CoachRequest['session_context'] = {
  plan_step: 'quads_block_1',
  target_rep_range: '6-8',
  target_fatigue_window: '7-10',
  recent_swaps_this_week: 0,
};

const baseUiCapabilities: CoachRequest['ui_capabilities'] = {
  allow_override: true,
  allow_swap: true,
  projection_enabled: true,
};

// ============================================================================
// FIXTURE 1: EARLY FATIGUE (reduce effort)
// ============================================================================

export const earlyFatigueRequest: CoachRequest = {
  version: 'coach-v1',
  user_profile: baseUserProfile,
  session_context: baseSessionContext,
  set_telemetry: {
    set_index: 2,
    rep_count: 8,
    fatigue_rep: 4, // Fatigue at rep 4 (early!)
    symmetry_pct: 92,
    rms_drop_pct: 18,
    ror_ok: false,
    signal_confidence: 0.91,
    pain_flag: 0,
    user_prev_decision: 'none',
  },
  ui_capabilities: baseUiCapabilities,
};

export const earlyFatigueResponse: CoachAdvice = {
  advice_id: 'adv-001-early-fatigue',
  advice_type: 'effort_change',
  primary_text: "Fatigue crashed the party at rep 4—tomorrow's legs would riot.",
  secondary_text: 'Ease the load about 5% and rest 100s so recovery stays on your side.',
  rest_seconds: 100,
  effort_delta: -1,
  add_reps: null,
  offer_swap: false,
  swap_candidate: null,
  projection: {
    delta_hit_rate_pct: 12,
    ci: 0.82,
  },
  safety: {
    suppress_load_calls: false,
    end_exercise: false,
  },
  ask_reason_on_skip_or_override: true,
  confidence: 0.88,
  telemetry_tags: ['early_fatigue', 'effort_down'],
  internal_rationale: 'Fatigue rep 4 is well below target window 7-10; reduce load.',
};

// ============================================================================
// FIXTURE 2: NO FATIGUE (increase reps/effort)
// ============================================================================

export const noFatigueRequest: CoachRequest = {
  version: 'coach-v1',
  user_profile: baseUserProfile,
  session_context: baseSessionContext,
  set_telemetry: {
    set_index: 1,
    rep_count: 10,
    fatigue_rep: null, // No fatigue detected
    symmetry_pct: 94,
    rms_drop_pct: 8,
    ror_ok: true,
    signal_confidence: 0.95,
    pain_flag: 0,
    user_prev_decision: 'none',
  },
  ui_capabilities: baseUiCapabilities,
};

export const noFatigueResponse: CoachAdvice = {
  advice_id: 'adv-002-no-fatigue',
  advice_type: 'effort_change',
  primary_text: "You breezed past the fatigue window—readiness is screaming green.",
  secondary_text: 'Add two reps or bump effort +1, then rest 90s to turn that headroom into strength.',
  rest_seconds: 90,
  effort_delta: 1,
  add_reps: 2,
  offer_swap: false,
  swap_candidate: null,
  projection: {
    delta_hit_rate_pct: 18,
    ci: 0.89,
  },
  safety: {
    suppress_load_calls: false,
    end_exercise: false,
  },
  ask_reason_on_skip_or_override: false,
  confidence: 0.91,
  telemetry_tags: ['no_fatigue', 'effort_up'],
};

// ============================================================================
// FIXTURE 3: IN-WINDOW PERFORMANCE (maintain)
// ============================================================================

export const inWindowRequest: CoachRequest = {
  version: 'coach-v1',
  user_profile: baseUserProfile,
  session_context: baseSessionContext,
  set_telemetry: {
    set_index: 3,
    rep_count: 8,
    fatigue_rep: 8, // Right at the upper bound
    symmetry_pct: 91,
    rms_drop_pct: 14,
    ror_ok: true,
    signal_confidence: 0.93,
    pain_flag: 0,
    user_prev_decision: 'did',
  },
  ui_capabilities: baseUiCapabilities,
};

export const inWindowResponse: CoachAdvice = {
  advice_id: 'adv-003-in-window',
  advice_type: 'rest',
  primary_text: 'Fatigue landed right at rep 8—money time.',
  secondary_text: 'Hold this plan and rest 90s to keep stacking reliable strength.',
  rest_seconds: 90,
  effort_delta: 0,
  add_reps: null,
  offer_swap: false,
  swap_candidate: null,
  projection: null,
  safety: {
    suppress_load_calls: false,
    end_exercise: false,
  },
  ask_reason_on_skip_or_override: false,
  confidence: 0.94,
  telemetry_tags: ['in_window', 'maintain'],
};

// ============================================================================
// FIXTURE 4: SYMMETRY ISSUE (suggest unilateral)
// ============================================================================

export const symmetryIssueRequest: CoachRequest = {
  version: 'coach-v1',
  user_profile: baseUserProfile,
  session_context: baseSessionContext,
  set_telemetry: {
    set_index: 2,
    rep_count: 7,
    fatigue_rep: 7,
    symmetry_pct: 78, // Low symmetry
    rms_drop_pct: 16,
    ror_ok: true,
    signal_confidence: 0.89,
    pain_flag: 0,
    user_prev_decision: 'none',
  },
  ui_capabilities: baseUiCapabilities,
};

export const symmetryIssueResponse: CoachAdvice = {
  advice_id: 'adv-004-symmetry',
  advice_type: 'swap',
  primary_text: 'Symmetry dipped to 78%—one leg is freeloading.',
  secondary_text: 'Slow the tempo, add a single-leg finisher after 90s, and even out the strength.',
  rest_seconds: 90,
  effort_delta: 0,
  add_reps: null,
  offer_swap: true,
  swap_candidate: 'Bulgarian split squat',
  projection: null,
  safety: {
    suppress_load_calls: false,
    end_exercise: false,
  },
  ask_reason_on_skip_or_override: false,
  confidence: 0.81,
  telemetry_tags: ['symmetry_low', 'swap_suggested'],
};

// ============================================================================
// FIXTURE 5: PAIN FLAG (safety check)
// ============================================================================

export const painFlagRequest: CoachRequest = {
  version: 'coach-v1',
  user_profile: baseUserProfile,
  session_context: baseSessionContext,
  set_telemetry: {
    set_index: 1,
    rep_count: 5,
    fatigue_rep: null,
    symmetry_pct: 88,
    rms_drop_pct: 10,
    ror_ok: true,
    signal_confidence: 0.92,
    pain_flag: 3, // Moderate pain
    user_prev_decision: 'none',
  },
  ui_capabilities: baseUiCapabilities,
};

export const painFlagResponse: CoachAdvice = {
  advice_id: 'adv-005-pain',
  advice_type: 'check_signal',
  primary_text: 'Pain signal lit up—no PR is worth grinding through that.',
  secondary_text: 'Take 90s, then stop or swap to leg press if it still bites so the joint can calm down.',
  rest_seconds: 90,
  effort_delta: 0,
  add_reps: null,
  offer_swap: true,
  swap_candidate: 'Leg press',
  projection: null,
  safety: {
    suppress_load_calls: true,
    end_exercise: false,
  },
  ask_reason_on_skip_or_override: false,
  confidence: 0.76,
  telemetry_tags: ['pain_flag', 'safety_check'],
};

// ============================================================================
// FIXTURE 6: LOW SIGNAL CONFIDENCE (check signal)
// ============================================================================

export const lowSignalRequest: CoachRequest = {
  version: 'coach-v1',
  user_profile: baseUserProfile,
  session_context: baseSessionContext,
  set_telemetry: {
    set_index: 2,
    rep_count: 8,
    fatigue_rep: 7,
    symmetry_pct: 90,
    rms_drop_pct: 13,
    ror_ok: true,
    signal_confidence: 0.62, // Low signal
    pain_flag: 0,
    user_prev_decision: 'none',
  },
  ui_capabilities: baseUiCapabilities,
};

export const lowSignalResponse: CoachAdvice = {
  advice_id: 'adv-006-low-signal',
  advice_type: 'check_signal',
  primary_text: "Signal quality slipped to 62%, so the data's sketchy.",
  secondary_text: 'Reset the electrode, rest 90s, and retry at the same effort for clean guidance.',
  rest_seconds: 90,
  effort_delta: 0,
  add_reps: null,
  offer_swap: false,
  swap_candidate: null,
  projection: null,
  safety: {
    suppress_load_calls: true,
    end_exercise: false,
  },
  ask_reason_on_skip_or_override: false,
  confidence: 0.68,
  telemetry_tags: ['low_signal', 'check_signal'],
};

// ============================================================================
// FIXTURE 7: OVERRIDE HISTORY (allow agency)
// ============================================================================

export const overrideHistoryRequest: CoachRequest = {
  version: 'coach-v1',
  user_profile: baseUserProfile,
  session_context: {
    ...baseSessionContext,
    recent_swaps_this_week: 2, // User has been swapping frequently
  },
  set_telemetry: {
    set_index: 3,
    rep_count: 9,
    fatigue_rep: 9,
    symmetry_pct: 92,
    rms_drop_pct: 15,
    ror_ok: true,
    signal_confidence: 0.91,
    pain_flag: 0,
    user_prev_decision: 'override',
  },
  ui_capabilities: baseUiCapabilities,
};

export const overrideHistoryResponse: CoachAdvice = {
  advice_id: 'adv-007-override-history',
  advice_type: 'rest',
  primary_text: 'Great set—you clearly know how your body wants to move today.',
  secondary_text: 'Rest 90s and stay with the effort that feels right so confidence stays high.',
  rest_seconds: 90,
  effort_delta: 0,
  add_reps: null,
  offer_swap: false,
  swap_candidate: null,
  projection: null,
  safety: {
    suppress_load_calls: false,
    end_exercise: false,
  },
  ask_reason_on_skip_or_override: false,
  confidence: 0.83,
  telemetry_tags: ['override_history', 'user_agency'],
};

// ============================================================================
// FIXTURE 8: END EXERCISE (session complete)
// ============================================================================

export const endExerciseRequest: CoachRequest = {
  version: 'coach-v1',
  user_profile: baseUserProfile,
  session_context: baseSessionContext,
  set_telemetry: {
    set_index: 5, // Final set
    rep_count: 6,
    fatigue_rep: 5,
    symmetry_pct: 85,
    rms_drop_pct: 22, // High fatigue
    ror_ok: false,
    signal_confidence: 0.88,
    pain_flag: 0,
    user_prev_decision: 'did',
  },
  ui_capabilities: baseUiCapabilities,
};

export const endExerciseResponse: CoachAdvice = {
  advice_id: 'adv-008-end',
  advice_type: 'end',
  primary_text: 'Fatigue spiked hard—those reps emptied the tank in the best way.',
  secondary_text: 'Call it the last effective set and move on while form is still sharp.',
  rest_seconds: null,
  effort_delta: null,
  add_reps: null,
  offer_swap: false,
  swap_candidate: null,
  projection: null,
  safety: {
    suppress_load_calls: true,
    end_exercise: true,
  },
  ask_reason_on_skip_or_override: false,
  confidence: 0.92,
  telemetry_tags: ['end_exercise', 'high_fatigue'],
};

// ============================================================================
// FIXTURE 9: PROJECTION ABSENT (low CI)
// ============================================================================

export const projectionAbsentRequest: CoachRequest = {
  version: 'coach-v1',
  user_profile: { ...baseUserProfile, training_age: 'beginner' },
  session_context: baseSessionContext,
  set_telemetry: {
    set_index: 1,
    rep_count: 8,
    fatigue_rep: 7,
    symmetry_pct: 89,
    rms_drop_pct: 12,
    ror_ok: true,
    signal_confidence: 0.87,
    pain_flag: 0,
    user_prev_decision: 'none',
  },
  ui_capabilities: baseUiCapabilities,
};

export const projectionAbsentResponse: CoachAdvice = {
  advice_id: 'adv-009-no-projection',
  advice_type: 'rest',
  primary_text: 'Baseline locked in—fatigue at 7 puts you in the growth lane.',
  secondary_text: 'Projection is fuzzy, so rest 90s and repeat to cement the pattern.',
  rest_seconds: 90,
  effort_delta: 0,
  add_reps: null,
  offer_swap: false,
  swap_candidate: null,
  projection: {
    delta_hit_rate_pct: 5,
    ci: 0.58, // Below 0.7 threshold
  },
  safety: {
    suppress_load_calls: false,
    end_exercise: false,
  },
  ask_reason_on_skip_or_override: false,
  confidence: 0.79,
  telemetry_tags: ['beginner', 'baseline'],
};

// ============================================================================
// FIXTURE 10: SWAP SUGGESTED (equipment constraint)
// ============================================================================

export const swapSuggestedRequest: CoachRequest = {
  version: 'coach-v1',
  user_profile: baseUserProfile,
  session_context: {
    ...baseSessionContext,
    recent_swaps_this_week: 0,
  },
  set_telemetry: {
    set_index: 2,
    rep_count: 5,
    fatigue_rep: 4,
    symmetry_pct: 91,
    rms_drop_pct: 19,
    ror_ok: false,
    signal_confidence: 0.91,
    pain_flag: 0,
    user_prev_decision: 'skip',
  },
  ui_capabilities: baseUiCapabilities,
};

export const swapSuggestedResponse: CoachAdvice = {
  advice_id: 'adv-010-swap',
  advice_type: 'swap',
  primary_text: "Skipped set logged—this move just isn't clicking right now.",
  secondary_text: 'After 90s, swap to leg press or goblet squat to keep the quads winning.',
  rest_seconds: 90,
  effort_delta: 0,
  add_reps: null,
  offer_swap: true,
  swap_candidate: 'Leg press',
  projection: null,
  safety: {
    suppress_load_calls: false,
    end_exercise: false,
  },
  ask_reason_on_skip_or_override: true,
  confidence: 0.81,
  telemetry_tags: ['swap', 'user_skip'],
};

// ============================================================================
// FIXTURE 11: HIGH CONFIDENCE SCENARIO
// ============================================================================

export const highConfidenceRequest: CoachRequest = {
  version: 'coach-v1',
  user_profile: { ...baseUserProfile, training_age: 'advanced' },
  session_context: baseSessionContext,
  set_telemetry: {
    set_index: 4,
    rep_count: 8,
    fatigue_rep: 7,
    symmetry_pct: 95,
    rms_drop_pct: 11,
    ror_ok: true,
    signal_confidence: 0.97,
    pain_flag: 0,
    user_prev_decision: 'did',
  },
  ui_capabilities: baseUiCapabilities,
};

export const highConfidenceResponse: CoachAdvice = {
  advice_id: 'adv-011-high-confidence',
  advice_type: 'rest',
  primary_text: "Rep 7 fatigue with high signal—chef's kiss execution.",
  secondary_text: 'Rest 90s and hit one more at this load while the groove stays hot.',
  rest_seconds: 90,
  effort_delta: 0,
  add_reps: null,
  offer_swap: false,
  swap_candidate: null,
  projection: {
    delta_hit_rate_pct: 22,
    ci: 0.94,
  },
  safety: {
    suppress_load_calls: false,
    end_exercise: false,
  },
  ask_reason_on_skip_or_override: false,
  confidence: 0.96,
  telemetry_tags: ['advanced', 'optimal_execution'],
};

// ============================================================================
// FIXTURE 12: TIME BUDGET CONSTRAINT
// ============================================================================

export const timeBudgetRequest: CoachRequest = {
  version: 'coach-v1',
  user_profile: { ...baseUserProfile, time_budget_min: 20 },
  session_context: baseSessionContext,
  set_telemetry: {
    set_index: 3,
    rep_count: 7,
    fatigue_rep: 7,
    symmetry_pct: 90,
    rms_drop_pct: 14,
    ror_ok: true,
    signal_confidence: 0.90,
    pain_flag: 0,
    user_prev_decision: 'did',
  },
  ui_capabilities: baseUiCapabilities,
};

export const timeBudgetResponse: CoachAdvice = {
  advice_id: 'adv-012-time-budget',
  advice_type: 'rest',
  primary_text: 'Clock is tight, but that set hit the quality target.',
  secondary_text: 'Rest 75s and finish with one more crisp set so you leave fresh.',
  rest_seconds: 75,
  effort_delta: 0,
  add_reps: null,
  offer_swap: false,
  swap_candidate: null,
  projection: null,
  safety: {
    suppress_load_calls: false,
    end_exercise: false,
  },
  ask_reason_on_skip_or_override: false,
  confidence: 0.86,
  telemetry_tags: ['time_budget', 'short_session'],
};

// ============================================================================
// EXPORT ALL FIXTURES
// ============================================================================

export const allFixtures = [
  { name: 'Early Fatigue', request: earlyFatigueRequest, response: earlyFatigueResponse },
  { name: 'No Fatigue', request: noFatigueRequest, response: noFatigueResponse },
  { name: 'In Window', request: inWindowRequest, response: inWindowResponse },
  { name: 'Symmetry Issue', request: symmetryIssueRequest, response: symmetryIssueResponse },
  { name: 'Pain Flag', request: painFlagRequest, response: painFlagResponse },
  { name: 'Low Signal', request: lowSignalRequest, response: lowSignalResponse },
  { name: 'Override History', request: overrideHistoryRequest, response: overrideHistoryResponse },
  { name: 'End Exercise', request: endExerciseRequest, response: endExerciseResponse },
  { name: 'Projection Absent', request: projectionAbsentRequest, response: projectionAbsentResponse },
  { name: 'Swap Suggested', request: swapSuggestedRequest, response: swapSuggestedResponse },
  { name: 'High Confidence', request: highConfidenceRequest, response: highConfidenceResponse },
  { name: 'Time Budget', request: timeBudgetRequest, response: timeBudgetResponse },
];
