import { describe, expect, test } from 'vitest';
import { decideStrengthPlan } from './planner';
import type { StrengthContext } from './types';

function baseCtx(overrides: Partial<StrengthContext> = {}): StrengthContext {
  const now = new Date();
  return {
    nowISO: now.toISOString(),
    muscleGroup: 'quads',
    todaySession: {
      startedAt: now.toISOString(),
      exerciseBlocks: [],
      summaries: {
        fatigue: { rmsDropPct: 8, rorDropPct: 12 },
        avgSymmetryPct: 92,
      },
    },
    history: {
      weeklyStrengthSetsDone: 6,
      weeklyStrengthTarget: 12,
      hoursSinceLastSameMuscle: 30,
    },
    recovery: { readiness: 78, readinessSlopePerHr: 1.2 },
    gates: { status: 'GO', reason: 'strength_window' },
    symmetryIdeal: 90,
    strengthWindowReps: [3, 6],
    fatigueZones: { rms: [10, 20, 30], ror: [10, 25, 40] },
    didExerciseToday: false,
    justExercised: false,
    inRestWindow: false,
    targetReadinessMin: 70,
    targetReadinessMax: 90,
    postSessionCooldownHrs: 3,
    fullCooldownHrs: 24,
    sessionState: 'READY_NOW',
    ...overrides,
  };
}

describe('decideStrengthPlan', () => {
  test('TRAIN when in window & low fatigue', () => {
    const result = decideStrengthPlan(baseCtx());
    expect(result.plan.mode).toBe('TRAIN');
    expect(result.trace.options[0].id).toBe('TRAIN');
  });

  test('ACTIVE_RECOVERY when within 24h same muscle', () => {
    const result = decideStrengthPlan(
      baseCtx({
        history: {
          weeklyStrengthSetsDone: 6,
          weeklyStrengthTarget: 12,
          hoursSinceLastSameMuscle: 6,
        },
      }),
    );
    expect(result.plan.mode).toBe('ACTIVE_RECOVERY');
  });

  test('FULL_REST when severe fatigue', () => {
    const result = decideStrengthPlan(
      baseCtx({
        todaySession: {
          startedAt: '',
          exerciseBlocks: [],
          summaries: { fatigue: { rmsDropPct: 35, rorDropPct: 45 }, avgSymmetryPct: 85 },
        },
        recovery: { readiness: 50 },
      }),
    );
    expect(result.plan.mode).toBe('FULL_REST');
  });
});
