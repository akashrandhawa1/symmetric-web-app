import { describe, it, expect, beforeEach } from 'vitest';
import { shouldShowNumeric, shouldShowQual, createHistory } from '../whatif/gating';
import type { CoachMode } from '../types';
import type { WhatIfContext, WhatIfNumeric, WhatIfQual } from '../types.whatif';

const baseCtx: WhatIfContext = {
  safeMode: 'ACTIVE_RECOVERY',
  minutesAvailable: 30,
  hoursSinceLastSameMuscle: 12,
};

describe('What-If numeric gating', () => {
  let history = createHistory();

  beforeEach(() => {
    history = createHistory();
  });

  const numeric = (overrides: Partial<WhatIfNumeric> = {}): WhatIfNumeric => ({
    action_id: 'active_recovery',
    confidence: 0.82,
    effects: {
      recovery_hours_saved: 4,
      readiness_delta_pts: 3,
      next_session_quality_prob: 0.18,
    },
    ...overrides,
    effects: {
      recovery_hours_saved: overrides.effects?.recovery_hours_saved ?? 4,
      readiness_delta_pts: overrides.effects?.readiness_delta_pts ?? 3,
      next_session_quality_prob: overrides.effects?.next_session_quality_prob ?? 0.18,
    },
  });

  it('accepts 0.82 confidence with 4h saved', () => {
    expect(shouldShowNumeric(baseCtx, numeric(), history)).toBe(true);
  });

  it('rejects when confidence below 0.70', () => {
    expect(shouldShowNumeric(baseCtx, numeric({ confidence: 0.48 }), history)).toBe(false);
  });

  it('rejects when impact is small', () => {
    expect(
      shouldShowNumeric(
        baseCtx,
        numeric({ effects: { recovery_hours_saved: 2, readiness_delta_pts: 1, next_session_quality_prob: 0.05 } as WhatIfNumeric['effects'] }),
        history,
      ),
    ).toBe(false);
  });

  it('rejects conflicting actions in FULL_REST mode', () => {
    const ctx: WhatIfContext = { ...baseCtx, safeMode: 'FULL_REST' as CoachMode };
    expect(shouldShowNumeric(ctx, numeric({ action_id: 'walk_after_workout' }), history)).toBe(false);
  });

  it('rejects when recently shown', () => {
    history.shown.push({ action_or_kind: 'active_recovery', ts: Date.now() });
    expect(shouldShowNumeric(baseCtx, numeric(), history)).toBe(false);
  });
});

describe('What-If qualitative gating', () => {
  let history = createHistory();

  beforeEach(() => {
    history = createHistory();
  });

  const qual = (overrides: Partial<WhatIfQual> = {}): WhatIfQual => ({
    kind: 'zone2',
    impact: 'HIGH',
    confidence: 0.6,
    title: '20–30 min zone-2 loop',
    ...overrides,
  });

  it('allows HIGH impact, adequate confidence', () => {
    expect(shouldShowQual(baseCtx, qual(), history)).toBe(true);
  });

  it('rejects MEDIUM impact without high confidence', () => {
    expect(shouldShowQual(baseCtx, qual({ impact: 'MEDIUM', confidence: 0.48 }), history)).toBe(false);
  });

  it('rejects LOW impact', () => {
    expect(shouldShowQual(baseCtx, qual({ impact: 'LOW' }), history)).toBe(false);
  });

  it('rejects when not enough minutes available', () => {
    const ctx: WhatIfContext = { ...baseCtx, minutesAvailable: 10 };
    expect(shouldShowQual(ctx, qual(), history)).toBe(false);
  });

  it('rejects conflicting kind in FULL_REST mode', () => {
    const ctx: WhatIfContext = { ...baseCtx, safeMode: 'FULL_REST' as CoachMode };
    expect(shouldShowQual(ctx, qual({ kind: 'unilateral_control' }), history)).toBe(false);
  });
});
