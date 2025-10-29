/**
 * Exercise Recommendation Type System
 *
 * Strict Zod schemas for EMG-based exercise recommendations.
 * Prevents LLM from going off-rails with validated I/O.
 *
 * @module lib/coach/exerciseTypes
 */

import { z } from "zod";

// ============================================================================
// EMG FEATURE SCHEMA
// ============================================================================

export const EmgFeatureSchema = z.object({
  muscle: z.enum(["VL", "VMO", "RF"]).default("VL"),
  rms_peak: z.number(),                           // μV
  ror_ms_0_150: z.number(),                       // ΔRMS in first 150 ms
  symmetry_pct: z.number().min(0).max(100),
  mvc_norm_pct: z.number().min(0).max(150),       // % of user's MVC baseline (allow >100 transient)
  signal_quality: z.enum(["good", "ok", "poor"])
});

export type EmgFeature = z.infer<typeof EmgFeatureSchema>;

// ============================================================================
// SET SUMMARY SCHEMA
// ============================================================================

export const SetSummarySchema = z.object({
  exercise_id: z.string(),
  exercise_name: z.string(),
  rep_count: z.number(),
  rpe: z.number().min(1).max(10).nullable(),
  emg: EmgFeatureSchema,
  fatigue_index: z.number(),                      // your existing FI
  readiness_after: z.number().min(0).max(100),
  label: z.enum(["felt_strong", "neutral", "fatiguing", "pain_flag"]).nullable()
});

export type SetSummary = z.infer<typeof SetSummarySchema>;

// ============================================================================
// SESSION CONTEXT SCHEMA
// ============================================================================

export const SessionContextSchema = z.object({
  user_id: z.string(),
  history_window: z.array(SetSummarySchema).max(60),  // last N sets
  current_readiness: z.number().min(0).max(100),
  goals: z.array(z.enum(["quad_strength"])).default(["quad_strength"]),
  constraints: z.object({
    equipment: z.array(z.enum(["barbell", "dumbbell", "machine", "bodyweight"])),
    time_min: z.number().min(5).max(120).default(30),
  })
});

export type SessionContext = z.infer<typeof SessionContextSchema>;

// ============================================================================
// RECOMMENDATION SCHEMA
// ============================================================================

export const RecommendationSchema = z.object({
  next_exercise: z.object({
    id: z.string(),
    name: z.string(),
    intent: z.enum(["main", "accessory"]),
    rationale: z.string()
  }),
  prescription: z.object({
    sets: z.number().min(1).max(5),
    reps: z.string(),        // "3–5" or "6"
    tempo: z.string(),       // "31X0", "20X1"
    rest_s: z.number(),
    notes: z.string()
  }),
  adjustments: z.object({
    load: z.enum(["increase", "hold", "decrease", "n/a"]),
    why: z.string()
  }),
  alternatives: z.array(z.object({
    id: z.string(),
    name: z.string(),
    when_to_use: z.string()
  })).max(3),
  fatigue_guardrail: z.object({
    stop_if: z.string(),
    retest_after_s: z.number()
  }),
  confidence: z.number().min(0).max(1),
  telemetry_keys: z.array(z.string())
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

// ============================================================================
// EXERCISE LIBRARY (Exercise IDs)
// ============================================================================

export const EXERCISE_IDS = {
  // Main Lifts
  BACK_SQUAT: "back_squat",
  FRONT_SQUAT: "front_squat",
  SPLIT_SQUAT: "split_squat",
  LEG_PRESS: "leg_press",
  HACK_SQUAT: "hack_squat",

  // Accessories
  STEP_UP: "step_up",
  COPENHAGEN: "copenhagen",
  WALL_SIT: "wall_sit",
  SISSY_SQUAT: "sissy_squat",
  LEG_EXTENSION: "leg_extension",
  WALKING_LUNGE: "walking_lunge",
} as const;

export const MAIN_LIFTS = [
  EXERCISE_IDS.BACK_SQUAT,
  EXERCISE_IDS.FRONT_SQUAT,
  EXERCISE_IDS.SPLIT_SQUAT,
  EXERCISE_IDS.LEG_PRESS,
  EXERCISE_IDS.HACK_SQUAT,
] as const;

export const ACCESSORIES = [
  EXERCISE_IDS.STEP_UP,
  EXERCISE_IDS.COPENHAGEN,
  EXERCISE_IDS.WALL_SIT,
  EXERCISE_IDS.SISSY_SQUAT,
  EXERCISE_IDS.LEG_EXTENSION,
  EXERCISE_IDS.WALKING_LUNGE,
] as const;

// ============================================================================
// METRIC THRESHOLDS (for deterministic logic)
// ============================================================================

export const THRESHOLDS = {
  // Activation quality
  MVC_LOW: 70,
  MVC_OPTIMAL: 85,

  // Readiness zones
  READINESS_PRODUCTIVE_MIN: 65,
  READINESS_CAUTION: 50,

  // Fatigue index
  FATIGUE_MANAGEABLE: 0.5,
  FATIGUE_HIGH: 0.6,

  // Symmetry
  SYMMETRY_GOOD: 90,
  SYMMETRY_CAUTION: 85,

  // Rate of rise collapse (% drop from first rep)
  ROR_COLLAPSE_THRESHOLD: 30,
} as const;

// ============================================================================
// HELPER TYPES
// ============================================================================

export type ExerciseId = typeof EXERCISE_IDS[keyof typeof EXERCISE_IDS];
export type ExerciseIntent = "main" | "accessory";
export type LoadAdjustment = "increase" | "hold" | "decrease" | "n/a";
export type SetLabel = "felt_strong" | "neutral" | "fatiguing" | "pain_flag";
