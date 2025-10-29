/**
 * Mock Gemini Client for Development
 *
 * Simulates the LLM function calling flow for testing the Home Coach UI
 * without requiring a real Gemini API backend.
 *
 * @module coach/mockGemini
 */

import type { CoachJSON, ContextPayload, VerifyResult } from './types';

export type HomeCoachMockOverrides = {
  readiness?: number | null;
  hrWarning?: boolean | null;
  fatigueHigh?: boolean | null;
  hoursSinceLastSameMuscle?: number | null;
};

// Mock context data that simulates what the real API would return
const MOCK_CONTEXT: ContextPayload = {
  nowISO: new Date().toISOString(),
  sessionState: 'idle',
  readiness_local: 82,
  symmetryPct: 94,
  fatigue: { rmsDropPct: 12, rorDropPct: 15 },
  hoursSinceLastSameMuscle: 36,
  weekly: { done: 2, target: 4 },
  flags: { hrWarning: false, sorenessHigh: false },
  lastEndZone: 'GREEN',
  policy: {
    strengthWindowReps: [3, 6],
    symmetryIdeal: 95,
    fatigueZones: {
      rms: [15, 25, 40],
      ror: [20, 35, 50],
    },
  },
  allowed_actions: ['start_strength', 'start_cardio', 'plan_tomorrow'],
};

/**
 * Mock implementation that returns pre-crafted coaching suggestions
 *
 * This simulates the LLM decision-making process based on the mock context
 */
export async function runHomeCoachMock(overrides?: HomeCoachMockOverrides): Promise<CoachJSON> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const { readiness_local, hoursSinceLastSameMuscle, flags, fatigue } = MOCK_CONTEXT;

  const readinessOverride = overrides?.readiness;
  const readiness = typeof readinessOverride === 'number' && Number.isFinite(readinessOverride)
    ? readinessOverride
    : readiness_local;
  const readinessRounded = Math.round(readiness);

  const hrWarning = overrides?.hrWarning ?? flags.hrWarning;

  const hoursSinceOverride = overrides?.hoursSinceLastSameMuscle;
  const hoursSince = typeof hoursSinceOverride === 'number' && Number.isFinite(hoursSinceOverride)
    ? hoursSinceOverride
    : hoursSinceLastSameMuscle;

  const fatigueHighOverride = overrides?.fatigueHigh;
  const fatigueIsLow = fatigueHighOverride != null
    ? fatigueHighOverride === false
    : Boolean(fatigue.rmsDropPct && fatigue.rmsDropPct < 15);

  // Safety checks (same as real LLM would do)
  if (hrWarning) {
    return {
      type: 'suggestion',
      mode: 'FULL_REST',
      message: "Your heart rate is elevated, which means your nervous system needs recovery more than your muscles do. Rest is the smart choice today.",
      cta: "Plan tomorrow",
      secondary: "Prioritize 8+ hours of sleep, protein at meals, and a light walk if you feel up to it."
    };
  }

  // Cooldown period check
  if (hoursSince != null && hoursSince < 24) {
    return {
      type: 'suggestion',
      mode: 'ACTIVE_RECOVERY',
      message: "You trained the same muscles less than 24 hours ago. Active recovery will help lock in those gains without interfering with adaptation.",
      cta: "Start recovery (20-30 min)",
      secondary: "Light cardio or mobility work at an easy pace."
    };
  }

  // High readiness - recommend training
  if (readiness >= 80) {
    return {
      type: 'suggestion',
      mode: 'TRAIN',
      message: fatigueIsLow
        ? `Your readiness is at ${readinessRounded}, which means you're fresh and ready to build strength. This is a great time to add a focused block before you drift toward 50.`
        : `Your readiness is high at ${readinessRounded}. You can push hard today, but stay sharp and stop once you approach 50 to protect recovery.`,
      cta: "Start strength training",
      secondary: fatigueIsLow
        ? "Aim for 3-6 reps per set with 90-120s rest, and stop when power starts to fade."
        : "Keep it technical in the 3-6 rep range and rack when bar speed or form softens."
    };
  }

  // Mid readiness - encourage lean strength work until 50
  if (readiness >= 50) {
    return {
      type: 'suggestion',
      mode: 'TRAIN',
      message: `Your readiness is at ${readinessRounded}, which is solid for training. You can add a clean strength block now and wrap up as you approach 50.`,
      cta: "Add focused block",
      secondary: "Stay technical, keep rest periods tight, and stop when output starts to drop."
    };
  }

  // Low readiness - full rest
  return {
    type: 'suggestion',
    mode: 'FULL_REST',
    message: `Your readiness is at ${readinessRounded}, which means your body needs rest right now. Sleep and nutrition will set you up for a strong session tomorrow.`,
    cta: "Plan tomorrow",
    secondary: "Focus on recovery today with 8+ hours of sleep and protein at each meal."
  };
}
