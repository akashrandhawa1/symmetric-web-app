import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runHomeCoach, __resetWhatIfHistoryForTests } from '../gemini';
import type { CoachJSON } from '../types';

vi.mock('../tools', () => ({
  getContext: vi.fn(),
  projectAction: vi.fn(),
  verifyPlan: vi.fn(),
  commitAction: vi.fn(),
}));

import { getContext, verifyPlan } from '../tools';

const buildResponse = (payload: any): Response =>
  ({
    ok: true,
    json: async () => payload,
  } as unknown as Response);

describe('What-If integration', () => {
  beforeEach(() => {
    __resetWhatIfHistoryForTests();
    vi.clearAllMocks();
    (getContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      nowISO: '2025-01-01T00:00:00Z',
      sessionState: 'READY_NOW',
      readiness_local: 82,
      symmetryPct: 90,
      fatigue: { rmsDropPct: 8, rorDropPct: 9 },
      hoursSinceLastSameMuscle: 48,
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

    (verifyPlan as ReturnType<typeof vi.fn>).mockImplementation(async (mode: string) => ({
      ok: true,
      safe_mode: mode,
    }));

    global.fetch = vi.fn();
  });

  const enqueueGeminiFlow = (finalPayload: any) => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(buildResponse({ functionCalls: [{ name: 'get_context', arguments: {} }] }))
      .mockResolvedValueOnce(buildResponse({ functionCalls: [{ name: 'verify_plan', arguments: { mode: 'ACTIVE_RECOVERY' } }] }))
      .mockResolvedValueOnce(buildResponse({ text: JSON.stringify(finalPayload) }));
  };

  it('adds numeric what-if secondary when gating passes', async () => {
    enqueueGeminiFlow({
      type: 'suggestion',
      mode: 'ACTIVE_RECOVERY',
      message: 'Active recovery keeps quality high.',
      cta: 'Start recovery',
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      buildResponse({
        action_id: 'active_recovery',
        confidence: 0.82,
        effects: {
          recovery_hours_saved: 4,
          readiness_delta_pts: 2,
          next_session_quality_prob: 0.15,
        },
      }),
    );

    const result = (await runHomeCoach()) as CoachJSON;
    expect(result.type).toBe('suggestion');
    if (result.type === 'suggestion') {
      expect(result.secondary).toContain('saving about 4h');
    }
  });

  it('suppresses numeric what-if when gating fails', async () => {
    enqueueGeminiFlow({
      type: 'suggestion',
      mode: 'ACTIVE_RECOVERY',
      message: 'Active recovery keeps quality high.',
      cta: 'Start recovery',
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      buildResponse({
        action_id: 'active_recovery',
        confidence: 0.49,
        effects: {
          recovery_hours_saved: 1,
          readiness_delta_pts: 1,
          next_session_quality_prob: 0.05,
        },
      }),
    );

    const result = (await runHomeCoach()) as CoachJSON;
    expect(result.type).toBe('suggestion');
    if (result.type === 'suggestion') {
      expect(result.secondary).toBeUndefined();
    }
  });

  it('uses qualitative clause when impact is high', async () => {
    enqueueGeminiFlow({
      type: 'suggestion',
      mode: 'ACTIVE_RECOVERY',
      message: 'Active recovery keeps quality high.',
      cta: 'Start recovery',
      what_if: {
        kind: 'zone2',
        impact: 'HIGH',
        confidence: 0.72,
        title: '20–30 min zone-2 loop',
        clause: '20–30 min zone-2 loop keeps legs fresh for tomorrow.',
      },
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    const result = (await runHomeCoach()) as CoachJSON;
    expect(result.type).toBe('suggestion');
    if (result.type === 'suggestion') {
      expect(result.secondary).toContain('zone-2');
    }
  });

  it('suppresses qualitative clause when impact is LOW', async () => {
    enqueueGeminiFlow({
      type: 'suggestion',
      mode: 'ACTIVE_RECOVERY',
      message: 'Active recovery keeps quality high.',
      cta: 'Start recovery',
      what_if: {
        kind: 'hydration',
        impact: 'LOW',
        confidence: 0.9,
        title: 'Sip water',
        clause: 'Sip water this afternoon for a tiny edge.',
      },
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    const result = (await runHomeCoach()) as CoachJSON;
    expect(result.type).toBe('suggestion');
    if (result.type === 'suggestion') {
      expect(result.secondary).toBeUndefined();
    }
  });
});
