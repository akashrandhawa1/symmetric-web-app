/**
 * Exercise Recommendation Service
 *
 * Integrates with Gemini API to analyze EMG data and provide personalized
 * exercise recommendations for quad strength training.
 *
 * @module services/exerciseRecommendation
 */

import { getGeminiClient, normaliseGeminiError, extractText } from '../services';
import { Type } from '@google/genai';

// ============================================================================
// TYPES
// ============================================================================

export type ExerciseIntent = 'main' | 'accessory';

export type LoadAdjustment = 'increase' | 'hold' | 'decrease' | 'n/a';

export type EMGDataInput = {
  /** Peak RMS as percentage of MVC */
  peakRmsPctMvc: number;
  /** Rate of rise in milliseconds */
  rateOfRiseMs: number;
  /** Left-right symmetry percentage */
  symmetryPct: number;
  /** RMS drop percentage across set */
  rmsDropPct?: number;
  /** Rate of rise drop percentage */
  rorDropPct?: number;
};

export type UserContext = {
  /** Current readiness score 0-100 */
  readinessScore: number;
  /** Current exercise being performed */
  currentExercise: string;
  /** Current working weight in kg */
  currentWeightKg?: number;
  /** Total sets completed in session */
  setsCompleted: number;
  /** User's subjective labels for past exercises */
  historicalLabels?: Array<{ exercise: string; label: 'felt_strongest' | 'effective' | 'moderate' | 'ineffective' }>;
  /** Time since last session in hours */
  hoursSinceLastSession?: number;
};

export type ExerciseRecommendation = {
  next_exercise: {
    id: string;
    name: string;
    intent: ExerciseIntent;
    rationale: string;
  };
  prescription: {
    sets: number;
    reps: string;
    tempo: string;
    rest_s: number;
    notes: string;
  };
  adjustments: {
    load: LoadAdjustment;
    why: string;
  };
  alternatives: Array<{
    id: string;
    name: string;
    when_to_use: string;
  }>;
  fatigue_guardrail: {
    stop_if: string;
    retest_after_s: number;
  };
  confidence: number;
  telemetry_keys: string[];
};

// ============================================================================
// EXERCISE LIBRARY
// ============================================================================

const EXERCISE_LIBRARY = {
  main: [
    { id: 'back_squat', name: 'Back Squat', intensity: 'high', tags: ['compound', 'bilateral'] },
    { id: 'front_squat', name: 'Front Squat', intensity: 'high', tags: ['compound', 'bilateral', 'quad_emphasis'] },
    { id: 'split_squat', name: 'Bulgarian Split Squat', intensity: 'moderate', tags: ['unilateral', 'stability'] },
    { id: 'leg_press', name: 'Leg Press', intensity: 'high', tags: ['machine', 'bilateral'] },
    { id: 'hack_squat', name: 'Hack Squat', intensity: 'high', tags: ['machine', 'quad_emphasis'] },
  ],
  accessory: [
    { id: 'step_up', name: 'Step-Up', intensity: 'moderate', tags: ['unilateral', 'functional'] },
    { id: 'copenhagen', name: 'Copenhagen Adductor', intensity: 'low', tags: ['stability', 'unilateral'] },
    { id: 'wall_sit', name: 'Wall Sit Iso', intensity: 'low', tags: ['isometric', 'endurance'] },
    { id: 'sissy_squat', name: 'Sissy Squat', intensity: 'moderate', tags: ['quad_isolation', 'advanced'] },
    { id: 'leg_extension', name: 'Leg Extension', intensity: 'moderate', tags: ['isolation', 'machine'] },
    { id: 'walking_lunge', name: 'Walking Lunge', intensity: 'moderate', tags: ['unilateral', 'dynamic'] },
  ],
};

// ============================================================================
// GEMINI PROMPT SYSTEM
// ============================================================================

const SYSTEM_INSTRUCTION = `You are Symmetric's Strength Coach—an expert in surface EMG for QUAD strength (VL/VMO), exercise selection, and set-to-set decisioning.

Core principles:
- Goal: maximize QUAD strength efficiently (3–6 hard reps "goldilocks"), avoid junk fatigue.
- Data-first: interpret sEMG (RMS, rate-of-rise, %MVC normalization), symmetry, readiness, accumulated fatigue, and set labels to personalize suggestions.
- Safety: never recommend loads if unknown; use relative cues (RPE, tempo, rest).
- Specificity: Recommend the next *exact* exercise + set recipe (pattern, rep target, tempo, rest).
- Output strictly JSON per the schema. Keep language human and concise.

Interpretation rules:
- **Activation quality**: Prefer sets/exercises with high normalized RMS (%MVC) and robust RoR early in rep, stable symmetry (≥ 90% unless unilateral work), and minimal form drift indicators (proxy via RoR decay + RMS drift).
- **Fatigue logic**: If Readiness ∈ [65,85) → productive zone; [50,65) → proceed but bias toward lower-junk alternatives; <50 → switch to recovery / accessories.
- **Progression**: If %MVC_peak < 70% on main lift and user not fatigued → suggest more load or a mechanically-similar variant with better leverage. If %MVC_peak ≥ 85% with good RoR and controlled symmetry → continue or add a back-off with technique focus.
- **Exercise library constraints**: Quads focus first; pick from library with tags: {main: back_squat, front_squat, split_squat, leg_press, hack_squat}, {accessory: step_up, copenhagen, wall_sit, sissy_squat, leg_extension, walking_lunge}, intensity levels {high, moderate, low}.
- **Label learning**: Prefer exercises historically labeled "felt_strongest", "effective" by this user when data quality is high.

Return JSON matching the ExerciseRecommendation schema exactly. Only JSON. No extra text.`;

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetches exercise recommendation from Gemini API based on EMG data and user context.
 *
 * @param emgData - EMG metrics from the completed set
 * @param userContext - User state and session context
 * @param options - Request options (abort signal)
 * @returns Exercise recommendation with prescription and adjustments
 *
 * @example
 * ```typescript
 * const recommendation = await fetchExerciseRecommendation(
 *   {
 *     peakRmsPctMvc: 82,
 *     rateOfRiseMs: 450,
 *     symmetryPct: 92,
 *     rmsDropPct: 24,
 *   },
 *   {
 *     readinessScore: 75,
 *     currentExercise: 'back_squat',
 *     currentWeightKg: 100,
 *     setsCompleted: 3,
 *   },
 *   { signal: abortController.signal }
 * );
 * ```
 */
export async function fetchExerciseRecommendation(
  emgData: EMGDataInput,
  userContext: UserContext,
  { signal }: { signal: AbortSignal }
): Promise<ExerciseRecommendation> {
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini client not available');
  }

  // Build user prompt
  const userPrompt = buildUserPrompt(emgData, userContext);

  // Define response schema
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      next_exercise: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          intent: { type: Type.STRING, enum: ['main', 'accessory'] },
          rationale: { type: Type.STRING },
        },
        required: ['id', 'name', 'intent', 'rationale'],
      },
      prescription: {
        type: Type.OBJECT,
        properties: {
          sets: { type: Type.NUMBER },
          reps: { type: Type.STRING },
          tempo: { type: Type.STRING },
          rest_s: { type: Type.NUMBER },
          notes: { type: Type.STRING },
        },
        required: ['sets', 'reps', 'tempo', 'rest_s', 'notes'],
      },
      adjustments: {
        type: Type.OBJECT,
        properties: {
          load: { type: Type.STRING, enum: ['increase', 'hold', 'decrease', 'n/a'] },
          why: { type: Type.STRING },
        },
        required: ['load', 'why'],
      },
      alternatives: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            when_to_use: { type: Type.STRING },
          },
          required: ['id', 'name', 'when_to_use'],
        },
      },
      fatigue_guardrail: {
        type: Type.OBJECT,
        properties: {
          stop_if: { type: Type.STRING },
          retest_after_s: { type: Type.NUMBER },
        },
        required: ['stop_if', 'retest_after_s'],
      },
      confidence: { type: Type.NUMBER },
      telemetry_keys: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: [
      'next_exercise',
      'prescription',
      'adjustments',
      'alternatives',
      'fatigue_guardrail',
      'confidence',
      'telemetry_keys',
    ],
  };

  try {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      config: {
        abortSignal: signal,
        temperature: 0.3, // Low temperature for consistent recommendations
        responseMimeType: 'application/json',
        responseSchema,
        maxOutputTokens: 1000,
      },
    });

    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const rawText = response.text ?? (await extractText(response));
    if (!rawText) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(rawText.trim()) as ExerciseRecommendation;

    console.info('[Symmetric][ExerciseRecommendation]', {
      input: { emgData, userContext },
      output: parsed,
    });

    return parsed;
  } catch (error: any) {
    if (error && error.name === 'AbortError') {
      throw error;
    }
    console.error('[Symmetric][ExerciseRecommendation] Error:', normaliseGeminiError('exerciseRec', error));
    throw error;
  }
}

/**
 * Builds the user prompt with EMG data and context.
 */
function buildUserPrompt(emgData: EMGDataInput, userContext: UserContext): string {
  const lines: string[] = [
    '# Session Context',
    `Current exercise: ${userContext.currentExercise}`,
    `Readiness score: ${userContext.readinessScore}/100`,
    `Sets completed this session: ${userContext.setsCompleted}`,
  ];

  if (userContext.currentWeightKg) {
    lines.push(`Current working weight: ${userContext.currentWeightKg}kg`);
  }

  if (userContext.hoursSinceLastSession !== undefined) {
    lines.push(`Hours since last session: ${userContext.hoursSinceLastSession.toFixed(1)}`);
  }

  lines.push('');
  lines.push('# EMG Metrics (Most Recent Set)');
  lines.push(`Peak RMS (%MVC): ${emgData.peakRmsPctMvc.toFixed(1)}%`);
  lines.push(`Rate of Rise: ${emgData.rateOfRiseMs.toFixed(0)}ms`);
  lines.push(`L/R Symmetry: ${emgData.symmetryPct.toFixed(1)}%`);

  if (emgData.rmsDropPct !== undefined) {
    lines.push(`RMS drop across set: ${emgData.rmsDropPct.toFixed(1)}%`);
  }

  if (emgData.rorDropPct !== undefined) {
    lines.push(`RoR drop across set: ${emgData.rorDropPct.toFixed(1)}%`);
  }

  if (userContext.historicalLabels && userContext.historicalLabels.length > 0) {
    lines.push('');
    lines.push('# Historical User Labels');
    userContext.historicalLabels.forEach(({ exercise, label }) => {
      lines.push(`- ${exercise}: ${label.replace(/_/g, ' ')}`);
    });
  }

  lines.push('');
  lines.push('# Available Exercises');
  lines.push('Main lifts: back_squat, front_squat, split_squat, leg_press, hack_squat');
  lines.push('Accessories: step_up, copenhagen, wall_sit, sissy_squat, leg_extension, walking_lunge');

  lines.push('');
  lines.push('# Task');
  lines.push(
    'Analyze the EMG data and context. Recommend the next exercise with complete prescription (sets, reps, tempo, rest). Include load adjustment rationale, alternatives, and fatigue guardrails. Return only JSON.'
  );

  return lines.join('\n');
}

/**
 * Fallback recommendation when Gemini API is unavailable.
 */
export function getFallbackRecommendation(
  emgData: EMGDataInput,
  userContext: UserContext
): ExerciseRecommendation {
  const { readinessScore, currentExercise, setsCompleted } = userContext;
  const { peakRmsPctMvc, symmetryPct } = emgData;

  // Simple rule-based fallback
  const shouldContinue = readinessScore >= 65 && peakRmsPctMvc >= 70 && symmetryPct >= 85;
  const isMainLift = ['back_squat', 'front_squat', 'leg_press', 'hack_squat'].includes(currentExercise);

  let nextExercise: ExerciseRecommendation['next_exercise'];
  let prescription: ExerciseRecommendation['prescription'];
  let loadAdjustment: LoadAdjustment = 'hold';

  if (shouldContinue && setsCompleted < 4) {
    // Continue current exercise
    nextExercise = {
      id: currentExercise,
      name: currentExercise.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      intent: isMainLift ? 'main' : 'accessory',
      rationale: 'Quality metrics support continuation. EMG activation and symmetry within productive range.',
    };
    prescription = {
      sets: 1,
      reps: '3-6',
      tempo: '2-0-1-0',
      rest_s: 180,
      notes: 'Maintain form, stop at RIR 1-2',
    };
    loadAdjustment = peakRmsPctMvc >= 85 ? 'increase' : 'hold';
  } else if (readinessScore < 50) {
    // Switch to accessory
    nextExercise = {
      id: 'leg_extension',
      name: 'Leg Extension',
      intent: 'accessory',
      rationale: 'Readiness below 50. Switching to lower-fatigue isolation work.',
    };
    prescription = {
      sets: 2,
      reps: '8-12',
      tempo: '2-1-1-0',
      rest_s: 90,
      notes: 'Focus on controlled tempo, lighter load',
    };
    loadAdjustment = 'n/a';
  } else {
    // Moderate readiness - suggest accessory
    nextExercise = {
      id: 'split_squat',
      name: 'Bulgarian Split Squat',
      intent: 'main',
      rationale: 'Moderate readiness. Unilateral work for continued strength with lower system stress.',
    };
    prescription = {
      sets: 2,
      reps: '5-8 per leg',
      tempo: '2-0-1-0',
      rest_s: 120,
      notes: 'Match depth side-to-side',
    };
    loadAdjustment = 'hold';
  }

  return {
    next_exercise: nextExercise,
    prescription,
    adjustments: {
      load: loadAdjustment,
      why:
        loadAdjustment === 'increase'
          ? 'Peak activation >85% MVC with good control'
          : loadAdjustment === 'decrease'
          ? 'Form drift detected or low activation'
          : 'Maintain current load',
    },
    alternatives: [
      { id: 'front_squat', name: 'Front Squat', when_to_use: 'If back squat feels stale or lower back fatigue' },
      { id: 'leg_press', name: 'Leg Press', when_to_use: 'If readiness drops below 60 mid-session' },
    ],
    fatigue_guardrail: {
      stop_if: 'RMS drops >30% within set or symmetry <80%',
      retest_after_s: 300,
    },
    confidence: 0.6,
    telemetry_keys: ['%MVC_peak', 'RoR_ms', 'symmetry_pct', 'readiness'],
  };
}
