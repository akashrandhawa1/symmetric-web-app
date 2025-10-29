/**
 * Contract tests for Rest Screen Coach.
 *
 * Tests verify:
 * 1. Schema validation (passes on valid, rejects on malformed)
 * 2. Two-line text constraint enforcement (truncation)
 * 3. Safety invariants (pain/low-signal → no aggressive effort)
 * 4. Projection gating (CI < 0.7 → hidden)
 * 5. Telemetry emission (correct payloads)
 *
 * @module tests/coach.contract.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CoachAdvice, CoachRequest } from '@/lib/coach/types';
import { zCoachAdvice, trimToTwoLines, validateSafetyConstraints } from '@/lib/coach/types';
import { createMockAdvice, FALLBACK_ADVICE } from '@/lib/coach/geminiClient';
import {
  emitAdviceShown,
  emitUserDecision,
  emitNextSetOutcome,
  installTelemetryHandler,
  clearTelemetryHandler,
} from '@/lib/coach/telemetry';
import {
  earlyFatigueResponse,
  noFatigueResponse,
  inWindowResponse,
  painFlagResponse,
  lowSignalResponse,
  projectionAbsentResponse,
  allFixtures,
} from '@/mocks/coachFixtures';

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe('Schema Validation', () => {
  it('should accept valid advice from fixtures', () => {
    allFixtures.forEach(({ name, response }) => {
      const result = zCoachAdvice.safeParse(response);
      expect(result.success, `Fixture "${name}" should pass validation`).toBe(true);
    });
  });

  it('should reject advice with missing required fields', () => {
    const invalid = {
      advice_id: 'test-001',
      // Missing advice_type
      primary_text: 'Test',
      secondary_text: 'Test',
    };

    const result = zCoachAdvice.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject advice with text exceeding 140 characters', () => {
    const invalid = createMockAdvice({
      primary_text: 'A'.repeat(141), // Too long
    });

    const result = zCoachAdvice.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject advice with confidence out of bounds', () => {
    const invalid = {
      ...createMockAdvice(),
      confidence: 1.5, // > 1
    };

    const result = zCoachAdvice.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject advice with projection CI out of bounds', () => {
    const invalid = {
      ...createMockAdvice(),
      projection: {
        delta_hit_rate_pct: 10,
        ci: 1.2, // > 1
      },
    };

    const result = zCoachAdvice.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should accept advice with null optional fields', () => {
    const valid = createMockAdvice({
      rest_seconds: null,
      effort_delta: null,
      add_reps: null,
      swap_candidate: null,
      projection: null,
    });

    const result = zCoachAdvice.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// TWO-LINE CONSTRAINT TESTS
// ============================================================================

describe('Two-Line Text Constraint', () => {
  it('should not modify text that is within limit', () => {
    const advice = createMockAdvice({
      primary_text: 'Short text.',
      secondary_text: 'Also short.',
    });

    const trimmed = trimToTwoLines(advice);
    expect(trimmed.primary_text).toBe(advice.primary_text);
    expect(trimmed.secondary_text).toBe(advice.secondary_text);
  });

  it('should truncate primary text exceeding 140 chars with ellipsis', () => {
    const longText = 'A'.repeat(150);
    const advice = createMockAdvice({ primary_text: longText });

    const trimmed = trimToTwoLines(advice);
    expect(trimmed.primary_text.length).toBe(140);
    expect(trimmed.primary_text.endsWith('…')).toBe(true);
  });

  it('should truncate secondary text exceeding 140 chars with ellipsis', () => {
    const longText = 'B'.repeat(200);
    const advice = createMockAdvice({ secondary_text: longText });

    const trimmed = trimToTwoLines(advice);
    expect(trimmed.secondary_text.length).toBe(140);
    expect(trimmed.secondary_text.endsWith('…')).toBe(true);
  });

  it('should truncate both lines if both exceed limit', () => {
    const advice = createMockAdvice({
      primary_text: 'P'.repeat(160),
      secondary_text: 'S'.repeat(180),
    });

    const trimmed = trimToTwoLines(advice);
    expect(trimmed.primary_text.length).toBe(140);
    expect(trimmed.secondary_text.length).toBe(140);
  });

  it('should handle text at exactly 140 chars without truncation', () => {
    const exactText = 'X'.repeat(140);
    const advice = createMockAdvice({ primary_text: exactText });

    const trimmed = trimToTwoLines(advice);
    expect(trimmed.primary_text).toBe(exactText);
    expect(trimmed.primary_text.endsWith('…')).toBe(false);
  });
});

// ============================================================================
// SAFETY INVARIANT TESTS
// ============================================================================

describe('Safety Constraints', () => {
  it('should reject aggressive effort when pain_flag > 0', () => {
    const advice = createMockAdvice({ effort_delta: 1 });
    const telemetry: CoachRequest['set_telemetry'] = {
      set_index: 1,
      rep_count: 8,
      fatigue_rep: 7,
      symmetry_pct: 90,
      rms_drop_pct: 12,
      ror_ok: true,
      signal_confidence: 0.9,
      pain_flag: 3, // Pain present
      user_prev_decision: 'none',
    };

    const isValid = validateSafetyConstraints(advice, telemetry);
    expect(isValid).toBe(false);
  });

  it('should reject aggressive effort when signal_confidence < 0.7', () => {
    const advice = createMockAdvice({ effort_delta: 1 });
    const telemetry: CoachRequest['set_telemetry'] = {
      set_index: 1,
      rep_count: 8,
      fatigue_rep: 7,
      symmetry_pct: 90,
      rms_drop_pct: 12,
      ror_ok: true,
      signal_confidence: 0.65, // Low signal
      pain_flag: 0,
      user_prev_decision: 'none',
    };

    const isValid = validateSafetyConstraints(advice, telemetry);
    expect(isValid).toBe(false);
  });

  it('should allow aggressive effort when pain=0 and signal_confidence >= 0.7', () => {
    const advice = createMockAdvice({ effort_delta: 1 });
    const telemetry: CoachRequest['set_telemetry'] = {
      set_index: 1,
      rep_count: 8,
      fatigue_rep: 7,
      symmetry_pct: 90,
      rms_drop_pct: 12,
      ror_ok: true,
      signal_confidence: 0.92,
      pain_flag: 0,
      user_prev_decision: 'none',
    };

    const isValid = validateSafetyConstraints(advice, telemetry);
    expect(isValid).toBe(true);
  });

  it('should allow non-aggressive advice even with pain', () => {
    const advice = createMockAdvice({ effort_delta: 0 });
    const telemetry: CoachRequest['set_telemetry'] = {
      set_index: 1,
      rep_count: 8,
      fatigue_rep: 7,
      symmetry_pct: 90,
      rms_drop_pct: 12,
      ror_ok: true,
      signal_confidence: 0.9,
      pain_flag: 5,
      user_prev_decision: 'none',
    };

    const isValid = validateSafetyConstraints(advice, telemetry);
    expect(isValid).toBe(true);
  });

  it('should allow effort reduction with pain or low signal', () => {
    const advice = createMockAdvice({ effort_delta: -1 });
    const telemetry: CoachRequest['set_telemetry'] = {
      set_index: 1,
      rep_count: 8,
      fatigue_rep: 7,
      symmetry_pct: 90,
      rms_drop_pct: 12,
      ror_ok: true,
      signal_confidence: 0.6,
      pain_flag: 2,
      user_prev_decision: 'none',
    };

    const isValid = validateSafetyConstraints(advice, telemetry);
    expect(isValid).toBe(true);
  });
});

// ============================================================================
// PROJECTION GATING TESTS
// ============================================================================

describe('Projection Gating', () => {
  it('should show projection when CI >= 0.7', () => {
    const advice = createMockAdvice({
      projection: {
        delta_hit_rate_pct: 15,
        ci: 0.85,
      },
    });

    expect(advice.projection).not.toBeNull();
    expect(advice.projection!.ci).toBeGreaterThanOrEqual(0.7);
  });

  it('should hide projection in UI when CI < 0.7', () => {
    const advice = projectionAbsentResponse;

    expect(advice.projection).not.toBeNull();
    expect(advice.projection!.ci).toBeLessThan(0.7);

    // UI logic: should not display
    const shouldDisplay = advice.projection && advice.projection.ci >= 0.7;
    expect(shouldDisplay).toBe(false);
  });

  it('should handle null projection gracefully', () => {
    const advice = createMockAdvice({ projection: null });

    const shouldDisplay = !!(advice.projection && advice.projection.ci >= 0.7);
    expect(shouldDisplay).toBe(false);
  });
});

// ============================================================================
// TELEMETRY TESTS
// ============================================================================

describe('Telemetry Events', () => {
  const mockEmit = vi.fn();

  beforeEach(() => {
    mockEmit.mockClear();
    installTelemetryHandler(mockEmit);
  });

  afterEach(() => {
    clearTelemetryHandler();
  });

  it('should emit coach_advice_shown with correct payload', () => {
    const advice = createMockAdvice({
      advice_id: 'test-advice-001',
      advice_type: 'rest',
      confidence: 0.88,
      projection: { delta_hit_rate_pct: 10, ci: 0.75 },
      telemetry_tags: ['test', 'rest'],
    });

    emitAdviceShown(advice);

    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith('coach_advice_shown', {
      advice_id: 'test-advice-001',
      advice_type: 'rest',
      projection_ci: 0.75,
      confidence: 0.88,
      telemetry_tags: ['test', 'rest'],
      timestamp: expect.any(Number),
    });
  });

  it('should emit coach_user_decision with correct payload', () => {
    emitUserDecision({
      advice_id: 'test-advice-002',
      decision: 'skip',
      reason_code: 'short_on_time',
      time_to_decision_ms: 5432,
    });

    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith('coach_user_decision', {
      advice_id: 'test-advice-002',
      decision: 'skip',
      reason_code: 'short_on_time',
      time_to_decision_ms: 5432,
      timestamp: expect.any(Number),
    });
  });

  it('should emit coach_next_set_outcome with correct payload', () => {
    emitNextSetOutcome({
      advice_id: 'test-advice-003',
      actual_reps: 9,
      actual_fatigue_rep: 8,
      actual_symmetry_pct: 93,
      advice_followed: true,
    });

    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith('coach_next_set_outcome', {
      advice_id: 'test-advice-003',
      actual_reps: 9,
      actual_fatigue_rep: 8,
      actual_symmetry_pct: 93,
      advice_followed: true,
      timestamp: expect.any(Number),
    });
  });

  it('should handle missing telemetry handler gracefully', () => {
    clearTelemetryHandler();

    expect(() => {
      emitAdviceShown(createMockAdvice());
    }).not.toThrow();
  });
});

// ============================================================================
// FALLBACK ADVICE TESTS
// ============================================================================

describe('Fallback Advice', () => {
  it('should have valid fallback advice structure', () => {
    const result = zCoachAdvice.safeParse(FALLBACK_ADVICE);
    expect(result.success).toBe(true);
  });

  it('should prioritize safety in fallback', () => {
    expect(FALLBACK_ADVICE.advice_type).toBe('check_signal');
    expect(FALLBACK_ADVICE.safety.suppress_load_calls).toBe(true);
    expect(FALLBACK_ADVICE.effort_delta).toBe(0);
  });

  it('should provide conservative rest period in fallback', () => {
    expect(FALLBACK_ADVICE.rest_seconds).toBe(90);
  });
});

// ============================================================================
// FIXTURE SNAPSHOT TESTS
// ============================================================================

describe('Fixture Snapshots', () => {
  it('should match snapshot for early fatigue scenario', () => {
    expect(earlyFatigueResponse).toMatchSnapshot();
  });

  it('should match snapshot for no fatigue scenario', () => {
    expect(noFatigueResponse).toMatchSnapshot();
  });

  it('should match snapshot for in-window scenario', () => {
    expect(inWindowResponse).toMatchSnapshot();
  });

  it('should match snapshot for pain flag scenario', () => {
    expect(painFlagResponse).toMatchSnapshot();
  });

  it('should match snapshot for low signal scenario', () => {
    expect(lowSignalResponse).toMatchSnapshot();
  });

  it('all fixtures should be valid', () => {
    allFixtures.forEach(({ name, request, response }) => {
      // Validate request structure
      expect(request.version).toBe('coach-v1');
      expect(request.user_profile).toBeDefined();
      expect(request.session_context).toBeDefined();
      expect(request.set_telemetry).toBeDefined();
      expect(request.ui_capabilities).toBeDefined();

      // Validate response schema
      const result = zCoachAdvice.safeParse(response);
      expect(result.success, `Fixture "${name}" response should be valid`).toBe(true);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Scenarios', () => {
  it('should enforce safety when both pain and low signal present', () => {
    const dangerousAdvice = createMockAdvice({
      effort_delta: 1,
      add_reps: 3,
    });

    const dangerousTelemetry: CoachRequest['set_telemetry'] = {
      set_index: 2,
      rep_count: 7,
      fatigue_rep: null,
      symmetry_pct: 88,
      rms_drop_pct: 10,
      ror_ok: true,
      signal_confidence: 0.58,
      pain_flag: 4,
      user_prev_decision: 'none',
    };

    const isValid = validateSafetyConstraints(dangerousAdvice, dangerousTelemetry);
    expect(isValid).toBe(false);
  });

  it('should allow progressive overload in safe conditions', () => {
    const progressiveAdvice = createMockAdvice({
      effort_delta: 1,
      add_reps: 2,
    });

    const safeTelemetry: CoachRequest['set_telemetry'] = {
      set_index: 3,
      rep_count: 10,
      fatigue_rep: null,
      symmetry_pct: 94,
      rms_drop_pct: 8,
      ror_ok: true,
      signal_confidence: 0.96,
      pain_flag: 0,
      user_prev_decision: 'did',
    };

    const isValid = validateSafetyConstraints(progressiveAdvice, safeTelemetry);
    expect(isValid).toBe(true);
  });

  it('should handle edge case: exactly 140 chars after model response', () => {
    const advice = createMockAdvice({
      primary_text: 'X'.repeat(140),
      secondary_text: 'Y'.repeat(140),
    });

    const parseResult = zCoachAdvice.safeParse(advice);
    expect(parseResult.success).toBe(true);

    const trimmed = trimToTwoLines(advice);
    expect(trimmed.primary_text.length).toBe(140);
    expect(trimmed.secondary_text.length).toBe(140);
  });
});
