/**
 * Exercise Recommender - Deterministic Pipeline + LLM
 *
 * Expert system that combines rule-based guardrails with Gemini AI.
 * Validates all I/O with Zod to prevent hallucinations.
 *
 * Flow:
 * 1. Preselect candidate exercise based on history
 * 2. Extract feature hints from metrics
 * 3. Call Gemini with structured prompt
 * 4. Validate response with Zod
 * 5. Fallback to deterministic rec if validation fails
 *
 * @module lib/coach/exerciseRecommender
 */

import {
  SessionContextSchema,
  RecommendationSchema,
  type SessionContext,
  type Recommendation,
  type SetSummary,
  EXERCISE_IDS,
  MAIN_LIFTS,
  ACCESSORIES,
  THRESHOLDS,
} from './exerciseTypes';

// ============================================================================
// DETERMINISTIC LOGIC (Guardrails & Fallbacks)
// ============================================================================

/**
 * Preselect candidate exercise based on recent history.
 * Defaults to last main lift in session, or back squat if none.
 */
function preselectCandidate(history: SessionContext['history_window']): string {
  const lastMainLift = [...history]
    .reverse()
    .find(s =>
      MAIN_LIFTS.includes(s.exercise_id as any) ||
      s.exercise_id.includes('squat') ||
      s.exercise_id.includes('press')
    );

  return lastMainLift?.exercise_id ?? EXERCISE_IDS.BACK_SQUAT;
}

/**
 * Extract interpretable hints from numeric EMG/fatigue features.
 * These guide the LLM's reasoning.
 */
function featureHints(set: SetSummary): string[] {
  const hints: string[] = [];
  const { emg, fatigue_index, readiness_after } = set;

  // Activation quality
  if (emg.mvc_norm_pct >= THRESHOLDS.MVC_OPTIMAL && emg.symmetry_pct >= THRESHOLDS.SYMMETRY_GOOD) {
    hints.push('high_quality_activation');
  }
  if (emg.mvc_norm_pct < THRESHOLDS.MVC_LOW) {
    hints.push('activation_below_threshold');
  }

  // Fatigue signals
  if (fatigue_index > THRESHOLDS.FATIGUE_HIGH) {
    hints.push('fatigue_rising');
  }
  if (fatigue_index > THRESHOLDS.FATIGUE_MANAGEABLE && fatigue_index <= THRESHOLDS.FATIGUE_HIGH) {
    hints.push('fatigue_manageable');
  }

  // Readiness zones
  if (readiness_after < THRESHOLDS.READINESS_CAUTION) {
    hints.push('readiness_low');
  }
  if (readiness_after >= THRESHOLDS.READINESS_PRODUCTIVE_MIN) {
    hints.push('readiness_productive');
  }

  // Symmetry concerns
  if (emg.symmetry_pct < THRESHOLDS.SYMMETRY_CAUTION) {
    hints.push('symmetry_imbalance');
  }

  // Signal quality
  if (emg.signal_quality === 'poor') {
    hints.push('signal_quality_poor');
  }

  // User labels (if available)
  if (set.label === 'felt_strong') {
    hints.push('user_felt_strong');
  }
  if (set.label === 'fatiguing') {
    hints.push('user_fatiguing');
  }
  if (set.label === 'pain_flag') {
    hints.push('user_pain_flag');
  }

  return hints;
}

/**
 * Deterministic fallback recommendation using metric-based rules.
 * Used when LLM fails or returns invalid JSON.
 */
function getFallbackRecommendation(ctx: SessionContext): Recommendation {
  const lastSet = ctx.history_window.at(-1);
  const readiness = ctx.current_readiness;

  // Default to safe accessory work
  let exerciseId = EXERCISE_IDS.SPLIT_SQUAT;
  let exerciseName = 'Rear-Foot Elevated Split Squat';
  let intent: 'main' | 'accessory' = 'accessory';
  let rationale = 'Conservative unilateral work to maintain quality.';
  let loadAdjustment: 'increase' | 'hold' | 'decrease' | 'n/a' = 'hold';
  let loadWhy = 'Maintaining current intensity.';

  if (!lastSet) {
    // First set of session - start with main lift
    exerciseId = EXERCISE_IDS.BACK_SQUAT;
    exerciseName = 'Back Squat';
    intent = 'main';
    rationale = 'Starting session with primary quad strength builder.';
    loadAdjustment = 'n/a';
    loadWhy = 'Establish baseline for session.';
  } else {
    const { emg, fatigue_index } = lastSet;

    // High readiness + good activation → Continue main lift
    if (
      readiness >= THRESHOLDS.READINESS_PRODUCTIVE_MIN &&
      emg.mvc_norm_pct >= THRESHOLDS.MVC_LOW &&
      emg.symmetry_pct >= THRESHOLDS.SYMMETRY_CAUTION &&
      fatigue_index < THRESHOLDS.FATIGUE_MANAGEABLE
    ) {
      exerciseId = preselectCandidate(ctx.history_window);
      exerciseName = getExerciseName(exerciseId);
      intent = 'main';
      rationale = 'Metrics support continued main lift work with good activation and manageable fatigue.';

      // Load adjustment logic
      if (emg.mvc_norm_pct >= THRESHOLDS.MVC_OPTIMAL) {
        loadAdjustment = 'increase';
        loadWhy = `Peak activation ≥${THRESHOLDS.MVC_OPTIMAL}% MVC with stable form—ready for more load.`;
      } else if (emg.mvc_norm_pct < THRESHOLDS.MVC_LOW) {
        loadAdjustment = 'increase';
        loadWhy = `Activation below ${THRESHOLDS.MVC_LOW}% MVC suggests weight may be too light.`;
      } else {
        loadAdjustment = 'hold';
        loadWhy = 'Activation in productive range—maintain current load.';
      }
    }
    // Low readiness OR high fatigue → Switch to accessory
    else if (
      readiness < THRESHOLDS.READINESS_CAUTION ||
      fatigue_index >= THRESHOLDS.FATIGUE_HIGH
    ) {
      exerciseId = EXERCISE_IDS.LEG_EXTENSION;
      exerciseName = 'Leg Extension';
      intent = 'accessory';
      rationale = 'Readiness or fatigue suggests lower systemic stress. Using isolation work.';
      loadAdjustment = 'decrease';
      loadWhy = 'Reduce load to maintain movement quality under fatigue.';
    }
    // Symmetry issue → Unilateral work
    else if (emg.symmetry_pct < THRESHOLDS.SYMMETRY_CAUTION) {
      exerciseId = EXERCISE_IDS.SPLIT_SQUAT;
      exerciseName = 'Bulgarian Split Squat';
      intent = 'accessory';
      rationale = `Symmetry at ${emg.symmetry_pct.toFixed(0)}%—unilateral work to address imbalance.`;
      loadAdjustment = 'hold';
      loadWhy = 'Focus on balance before increasing load.';
    }
  }

  return {
    next_exercise: {
      id: exerciseId,
      name: exerciseName,
      intent,
      rationale,
    },
    prescription: {
      sets: intent === 'main' ? 1 : 2,
      reps: intent === 'main' ? '3–5' : '6–8',
      tempo: intent === 'main' ? '20X1' : '31X0',
      rest_s: intent === 'main' ? 150 : 90,
      notes:
        intent === 'main'
          ? 'Drive fast out of the hole; cut set if bar speed drops.'
          : 'Control eccentric; pause at bottom if balance allows.',
    },
    adjustments: {
      load: loadAdjustment,
      why: loadWhy,
    },
    alternatives: getAlternatives(exerciseId, readiness),
    fatigue_guardrail: {
      stop_if:
        readiness < THRESHOLDS.READINESS_CAUTION
          ? 'Readiness < 50 or any pain'
          : 'RoR collapse >30% vs first rep or readiness < 50',
      retest_after_s: 120,
    },
    confidence: 0.6, // Lower confidence for fallback
    telemetry_keys: ['%MVC_peak', 'RoR_ms', 'symmetry_pct', 'readiness', 'fatigue_index'],
  };
}

/**
 * Get human-readable exercise name from ID.
 */
function getExerciseName(id: string): string {
  const names: Record<string, string> = {
    [EXERCISE_IDS.BACK_SQUAT]: 'Back Squat',
    [EXERCISE_IDS.FRONT_SQUAT]: 'Front Squat',
    [EXERCISE_IDS.SPLIT_SQUAT]: 'Bulgarian Split Squat',
    [EXERCISE_IDS.LEG_PRESS]: 'Leg Press',
    [EXERCISE_IDS.HACK_SQUAT]: 'Hack Squat',
    [EXERCISE_IDS.STEP_UP]: 'High Step-Up',
    [EXERCISE_IDS.COPENHAGEN]: 'Copenhagen Adductor',
    [EXERCISE_IDS.WALL_SIT]: 'Wall Sit',
    [EXERCISE_IDS.SISSY_SQUAT]: 'Sissy Squat',
    [EXERCISE_IDS.LEG_EXTENSION]: 'Leg Extension',
    [EXERCISE_IDS.WALKING_LUNGE]: 'Walking Lunge',
  };
  return names[id] || id;
}

/**
 * Get contextually appropriate alternative exercises.
 */
function getAlternatives(
  currentId: string,
  readiness: number
): Array<{ id: string; name: string; when_to_use: string }> {
  const alternatives: Array<{ id: string; name: string; when_to_use: string }> = [];

  // Always include split squat as unilateral option
  if (currentId !== EXERCISE_IDS.SPLIT_SQUAT) {
    alternatives.push({
      id: EXERCISE_IDS.SPLIT_SQUAT,
      name: 'Bulgarian Split Squat',
      when_to_use: 'If symmetry < 90% or knee stress is a concern.',
    });
  }

  // Include front squat as upright variant
  if (currentId !== EXERCISE_IDS.FRONT_SQUAT && MAIN_LIFTS.includes(currentId as any)) {
    alternatives.push({
      id: EXERCISE_IDS.FRONT_SQUAT,
      name: 'Front Squat',
      when_to_use: 'If trunk stability is preferable today.',
    });
  }

  // Include leg extension for low-fatigue option
  if (readiness < THRESHOLDS.READINESS_PRODUCTIVE_MIN && currentId !== EXERCISE_IDS.LEG_EXTENSION) {
    alternatives.push({
      id: EXERCISE_IDS.LEG_EXTENSION,
      name: 'Leg Extension',
      when_to_use: 'If systemic fatigue is high—use isolation work.',
    });
  }

  return alternatives.slice(0, 3); // Max 3 alternatives
}

// ============================================================================
// GEMINI INTEGRATION (Placeholder - integrate with your LlmOrchestrator)
// ============================================================================

/**
 * Call Gemini API for exercise recommendation.
 * This is a placeholder - integrate with your existing callGeminiJson from LlmOrchestrator.
 *
 * @example
 * const raw = await callGeminiJson<unknown>("expert_exercise_selector", prompt);
 */
async function callGeminiForRecommendation(
  ctx: SessionContext,
  candidate: string,
  hints: string[]
): Promise<unknown> {
  // TODO: Integrate with your existing Gemini API setup
  // For now, throw to trigger fallback
  throw new Error('Gemini integration pending - using fallback');

  // Example integration (uncomment when ready):
  // const prompt = buildExpertPrompt(ctx, candidate, hints);
  // const raw = await callGeminiJson<unknown>("expert_exercise_selector", prompt);
  // return raw;
}

/**
 * Build expert system prompt for Gemini.
 */
function buildExpertPrompt(ctx: SessionContext, candidate: string, hints: string[]): string {
  const lastSet = ctx.history_window.at(-1);

  return `You are Symmetric's expert strength coach specializing in quad development through EMG-guided training.

## Current Context
- Readiness: ${ctx.current_readiness}/100
- Last Exercise: ${lastSet?.exercise_name || 'None'}
- Candidate Next: ${getExerciseName(candidate)}
- Feature Hints: ${hints.join(', ') || 'None'}

## Recent History
${ctx.history_window
  .slice(-3)
  .map(
    (s, i) =>
      `Set ${i + 1}: ${s.exercise_name} x${s.rep_count} | %MVC: ${s.emg.mvc_norm_pct.toFixed(0)}% | Symmetry: ${s.emg.symmetry_pct.toFixed(0)}% | FI: ${s.fatigue_index.toFixed(2)} | Label: ${s.label || 'none'}`
  )
  .join('\n')}

## Your Task
Recommend the next exercise with full prescription. Use these principles:

**Progressive Strength (Main Lifts):**
- %MVC < 70 + readiness ≥65 + FI < 0.5 → Increase load or switch to better leverage variant
- %MVC 70-85 + FI 0.3-0.6 → Hold load, one more hard set (3-5 reps), rest 120-180s
- %MVC ≥ 85 + sustained RoR + symmetry ≥90 → One more set OR back-off (2-3×3 snap reps)

**Pivot to Accessory:**
- Readiness < 50 OR FI ≥ 0.6 OR symmetry < 85 → Split squats, step-ups with shorter rests

**Stop Guardrails:**
- "Stop if RoR collapse >30% vs first rep" OR "readiness < 50"

**User Learning:**
- Prefer exercises labeled "felt_strong" when metrics support it
- Avoid exercises with "pain_flag" labels

Return JSON matching the Recommendation schema with confidence score 0.7-0.95.`;
}

// ============================================================================
// MAIN RECOMMENDER FUNCTION
// ============================================================================

/**
 * Generate next exercise recommendation using deterministic + LLM pipeline.
 *
 * Flow:
 * 1. Validate input with Zod
 * 2. Preselect candidate exercise
 * 3. Extract feature hints
 * 4. Call Gemini (if available)
 * 5. Validate output with Zod
 * 6. Fallback to deterministic if anything fails
 *
 * @param ctx - Session context with history, readiness, constraints
 * @returns Validated exercise recommendation
 */
export async function recommendNext(ctx: SessionContext): Promise<Recommendation> {
  // Validate input
  const parsed = SessionContextSchema.parse(ctx);

  // Preselect candidate and extract hints
  const candidate = preselectCandidate(parsed.history_window);
  const lastSet = parsed.history_window.at(-1);
  const hints = lastSet ? featureHints(lastSet) : [];

  try {
    // Attempt Gemini call
    const raw = await callGeminiForRecommendation(parsed, candidate, hints);

    // Validate response
    const validated = RecommendationSchema.parse(raw);

    // Success - return validated recommendation
    return validated;
  } catch (error) {
    // Validation failed or Gemini unavailable - use deterministic fallback
    console.warn('[ExerciseRecommender] Falling back to deterministic logic:', error);
    return getFallbackRecommendation(parsed);
  }
}

// ============================================================================
// UTILITY: Convert existing EMG data to SessionContext format
// ============================================================================

/**
 * Helper to convert your app's existing EMG data structure to SessionContext.
 * Adapt this to match your actual Rep/SetSummary types.
 */
export function buildSessionContext(params: {
  userId: string;
  recentSets: Array<{
    exerciseId: string;
    exerciseName: string;
    repCount: number;
    rpe?: number;
    emgPeakRms: number;
    emgRateOfRise: number;
    symmetryPct: number;
    mvcNormPct: number;
    signalQuality: 'good' | 'ok' | 'poor';
    fatigueIndex: number;
    readinessAfter: number;
    userLabel?: 'felt_strong' | 'neutral' | 'fatiguing' | 'pain_flag';
  }>;
  currentReadiness: number;
  availableEquipment: Array<'barbell' | 'dumbbell' | 'machine' | 'bodyweight'>;
  sessionTimeMin?: number;
}): SessionContext {
  return {
    user_id: params.userId,
    history_window: params.recentSets.map(s => ({
      exercise_id: s.exerciseId,
      exercise_name: s.exerciseName,
      rep_count: s.repCount,
      rpe: s.rpe ?? null,
      emg: {
        muscle: 'VL' as const,
        rms_peak: s.emgPeakRms,
        ror_ms_0_150: s.emgRateOfRise,
        symmetry_pct: s.symmetryPct,
        mvc_norm_pct: s.mvcNormPct,
        signal_quality: s.signalQuality,
      },
      fatigue_index: s.fatigueIndex,
      readiness_after: s.readinessAfter,
      label: s.userLabel ?? null,
    })),
    current_readiness: params.currentReadiness,
    goals: ['quad_strength'],
    constraints: {
      equipment: params.availableEquipment,
      time_min: params.sessionTimeMin ?? 30,
    },
  };
}
