import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateCoachJSON } from '../validator';
import { fallbackCoach } from '../fallback';
import { runHomeCoach } from '../gemini';
import type { CoachJSON } from '../types';

vi.mock('../tools', () => ({
  getContext: vi.fn(),
  projectAction: vi.fn(),
  verifyPlan: vi.fn(),
  commitAction: vi.fn(),
}));

import { getContext, projectAction, verifyPlan, commitAction } from '../tools';

type GeminiMockResponse = {
  functionCalls?: Array<{ name: string; arguments?: Record<string, unknown> | string | null }>;
  text?: string;
  message?: unknown;
};

function mockGeminiResponses(responses: GeminiMockResponse[]) {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  let index = 0;
  fetchMock.mockImplementation(async () => {
    if (index >= responses.length) {
      return {
        ok: false,
        status: 500,
        statusText: 'No mock response',
        json: async () => ({}),
      } as unknown as Response;
    }
    const payload = responses[index++];
    return {
      ok: true,
      json: async () => payload,
    } as unknown as Response;
  });
}

describe('Coach Validator', () => {
  it('accepts valid suggestion', () => {
    const suggestion: CoachJSON = {
      type: 'suggestion',
      mode: 'TRAIN',
      message: 'Hit a short strength block so power stays crisp.',
      cta: 'Start strength block',
    };
    expect(() => validateCoachJSON(suggestion)).not.toThrow();
  });

  it('rejects invalid mode', () => {
    const invalid = {
      type: 'suggestion',
      mode: 'INVALID',
      message: 'oops',
      cta: 'Go',
    };
    expect(() => validateCoachJSON(invalid)).toThrow();
  });

  it('accepts question payload', () => {
    const question: CoachJSON = {
      type: 'question',
      message: 'How fatigued do your quads feel right now?',
    };
    expect(() => validateCoachJSON(question)).not.toThrow();
  });
});

describe('Fallback Coach', () => {
  it('returns deterministic TRAIN copy', () => {
    const result = fallbackCoach('TRAIN');
    expect(result.type).toBe('suggestion');
    expect(result.mode).toBe('TRAIN');
    expect(result.message).toContain('strength');
    expect(result.cta).toBe('Start strength block');
  });

  it('returns deterministic ACTIVE_RECOVERY copy', () => {
    const result = fallbackCoach('ACTIVE_RECOVERY');
    expect(result.cta).toBe('Start recovery (20–30 min)');
  });

  it('returns deterministic FULL_REST copy', () => {
    const result = fallbackCoach('FULL_REST');
    expect(result.cta).toBe('Plan tomorrow');
  });
});

describe('runHomeCoach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis.fetch as unknown) = vi.fn();
    (getContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      nowISO: '2025-01-01T00:00:00Z',
      sessionState: 'READY_NOW',
      readiness_local: 82,
      symmetryPct: 91,
      fatigue: { rmsDropPct: 8, rorDropPct: 10 },
      hoursSinceLastSameMuscle: 36,
      weekly: { done: 2, target: 4 },
      flags: { hrWarning: false, sorenessHigh: false },
      lastEndZone: 'GREEN',
      policy: {
        strengthWindowReps: [3, 6],
        symmetryIdeal: 90,
        fatigueZones: { rms: [10, 20, 30], ror: [10, 25, 40] },
      },
      allowed_actions: ['start_strength_block', 'start_recovery_30m', 'plan_tomorrow'],
    });
    (projectAction as ReturnType<typeof vi.fn>).mockImplementation(async (action_id: string) => ({
      action_id,
      effects: { strength_gain_pct: 5, readiness_delta_pts: -3, recovery_hours: 30 },
      summary: action_id === 'start_strength_block' ? 'Keeps strength trending up' : 'Quicker bounce-back',
    }));
    (verifyPlan as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      safe_mode: 'TRAIN',
    });
    (commitAction as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns validated suggestion after get_context → verify_plan', async () => {
    mockGeminiResponses([
      { functionCalls: [{ name: 'get_context', arguments: {} }] },
      { functionCalls: [{ name: 'verify_plan', arguments: { mode: 'TRAIN' } }] },
      {
        text: JSON.stringify({
          type: 'suggestion',
          mode: 'TRAIN',
          message: 'Build strength now—keep the set sharp so tomorrow hits harder.',
          cta: 'Start strength block',
        }),
      },
    ]);

    const result = await runHomeCoach();

    expect(getContext).toHaveBeenCalledTimes(1);
    expect(verifyPlan).toHaveBeenCalledWith('TRAIN');
    expect(result.type).toBe('suggestion');
    if (result.type === 'suggestion') {
      expect(result.mode).toBe('TRAIN');
      expect(result.cta).toBe('Start strength block');
    }
  });

  it('returns ACTIVE_RECOVERY suggestion when approved', async () => {
    (verifyPlan as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      safe_mode: 'ACTIVE_RECOVERY',
    });

    mockGeminiResponses([
      { functionCalls: [{ name: 'get_context', arguments: {} }] },
      { functionCalls: [{ name: 'verify_plan', arguments: { mode: 'ACTIVE_RECOVERY' } }] },
      {
        text: JSON.stringify({
          type: 'suggestion',
          mode: 'ACTIVE_RECOVERY',
          message: 'Active recovery keeps quality high without digging a fatigue hole.',
          cta: 'Start recovery (20–30 min)',
        }),
      },
    ]);

    const result = await runHomeCoach();
    expect(result.type).toBe('suggestion');
    if (result.type === 'suggestion') {
      expect(result.mode).toBe('ACTIVE_RECOVERY');
      expect(result.cta).toBe('Start recovery (20–30 min)');
    }
  });

  it('returns FULL_REST suggestion when approved', async () => {
    (verifyPlan as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      safe_mode: 'FULL_REST',
    });

    mockGeminiResponses([
      { functionCalls: [{ name: 'get_context', arguments: {} }] },
      { functionCalls: [{ name: 'verify_plan', arguments: { mode: 'FULL_REST' } }] },
      {
        text: JSON.stringify({
          type: 'suggestion',
          mode: 'FULL_REST',
          message: 'Call it for today—sleep, protein, and a short walk set up a better block.',
          cta: 'Plan tomorrow',
        }),
      },
    ]);

    const result = await runHomeCoach();
    expect(result.type).toBe('suggestion');
    if (result.type === 'suggestion') {
      expect(result.mode).toBe('FULL_REST');
    }
  });

  it('falls back to safe_mode when verify_plan rejects', async () => {
    (verifyPlan as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      safe_mode: 'FULL_REST',
    });

    mockGeminiResponses([
      { functionCalls: [{ name: 'get_context', arguments: {} }] },
      { functionCalls: [{ name: 'verify_plan', arguments: { mode: 'TRAIN' } }] },
      {
        text: JSON.stringify({
          type: 'suggestion',
          mode: 'TRAIN',
          message: 'Go lift heavy right now.',
          cta: 'Start strength block',
        }),
      },
    ]);

    const result = await runHomeCoach();
    expect(result.type).toBe('suggestion');
    if (result.type === 'suggestion') {
      expect(result.mode).toBe('FULL_REST');
      expect(result.cta).toBe('Plan tomorrow');
    }
  });

  it('returns question without requiring verify_plan', async () => {
    mockGeminiResponses([
      { functionCalls: [{ name: 'get_context', arguments: {} }] },
      {
        text: JSON.stringify({
          type: 'question',
          message: 'Legs still feel heavy, or ready to push?',
        }),
      },
    ]);

    const result = await runHomeCoach();
    expect(result.type).toBe('question');
    if (result.type === 'question') {
      expect(result.message).toContain('Legs');
    }
  });

  it('falls back when suggestion arrives without verify_plan', async () => {
    mockGeminiResponses([
      { functionCalls: [{ name: 'get_context', arguments: {} }] },
      {
        text: JSON.stringify({
          type: 'suggestion',
          mode: 'TRAIN',
          message: 'Lift now.',
          cta: 'Start',
        }),
      },
    ]);

    const result = await runHomeCoach();
    expect(result.type).toBe('suggestion');
    if (result.type === 'suggestion') {
      expect(result.mode).toBe('ACTIVE_RECOVERY');
    }
  });

  it('invokes project_action when Gemini requests it', async () => {
    mockGeminiResponses([
      { functionCalls: [{ name: 'get_context', arguments: {} }] },
      { functionCalls: [{ name: 'project_action', arguments: { action_id: 'start_recovery_30m' } }] },
      { functionCalls: [{ name: 'verify_plan', arguments: { mode: 'ACTIVE_RECOVERY' } }] },
      {
        text: JSON.stringify({
          type: 'suggestion',
          mode: 'ACTIVE_RECOVERY',
          message: 'Bank the work with light cardio and mobility so tomorrow hits harder.',
          cta: 'Start recovery (20–30 min)',
        }),
      },
    ]);

    await runHomeCoach();
    expect(projectAction).toHaveBeenCalledWith('start_recovery_30m');
  });

  it('falls back on invalid final JSON', async () => {
    mockGeminiResponses([
      { functionCalls: [{ name: 'get_context', arguments: {} }] },
      { functionCalls: [{ name: 'verify_plan', arguments: { mode: 'TRAIN' } }] },
      { text: '{"type":"suggestion","mode":"INVALID","message":"Test","cta":"Go"}' },
    ]);

    const result = await runHomeCoach();
    expect(result.type).toBe('suggestion');
    if (result.type === 'suggestion') {
      expect(result.mode).toBe('ACTIVE_RECOVERY');
    }
  });

  it('falls back on Gemini transport error', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const result = await runHomeCoach();
    expect(result.type).toBe('suggestion');
    if (result.type === 'suggestion') {
      expect(result.mode).toBe('ACTIVE_RECOVERY');
    }
  });
});
