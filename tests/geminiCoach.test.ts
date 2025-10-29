import { getCoachSuggestions, fallbackRules, SUGGESTION_LABELS } from '../src/lib/geminiCoach';
import { ensurePayoffIfGeneric } from '../src/lib/coachGuardrails';

describe('geminiCoach', () => {
  it('maps fallback rules for symmetry', () => {
    const metrics = { fatigueFlag: false, symmetryGapPct: 7 };
    const resp = fallbackRules(metrics);
    expect(resp.primary).toBe('END_EARLY');
    expect(resp.secondary).toBe('HOLD_TEMPO');
    expect(resp.why).toMatch(/symmetry/i);
  });

  it('maps fallback rules for fatigue', () => {
    const metrics = { fatigueFlag: true, symmetryGapPct: 2 };
    const resp = fallbackRules(metrics);
    expect(resp.primary).toBe('END_EARLY');
    expect(resp.secondary).toBe('HOLD_TEMPO');
    expect(resp.why).toMatch(/quality/i);
  });

  it('maps fallback rules for fresh', () => {
    const metrics = { fatigueFlag: false, symmetryGapPct: 0 };
    const resp = fallbackRules(metrics);
    expect(resp.primary).toBe('ADD_REP');
    expect(resp.secondary).toBe('HOLD_TEMPO');
    expect(resp.why).toMatch(/fresh/i);
  });

  it('guardrails appends payoff for generic advice', () => {
    const why = 'Remember to drink water and rest.';
    const payoff = { magnitudePct: 4, hours: 3 };
    const result = ensurePayoffIfGeneric(why, payoff);
    expect(result).toMatch(/\+4% in ~3h/);
    expect(result.length).toBeLessThanOrEqual(90);
  });

  // Add more tests for Gemini API, validation, and error fallback as needed
});
