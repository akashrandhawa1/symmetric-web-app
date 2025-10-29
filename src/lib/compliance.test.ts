import { describe, it, expect } from 'vitest';
import { scoreCompliance, type CoachAsk, type SetSnapshot } from './compliance';

describe('Compliance Engine', () => {
  describe('Weight Adherence', () => {
    it('should pass when weight change is within ±1.5% tolerance (barbell)', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: 2.5 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 102.5, reps: 5, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.weight).toBe(100);
      expect(result.reasons.some(r => r.includes('Weight') && r.includes('✓'))).toBe(true);
    });

    it('should pass when weight is within plate step tolerance (barbell ±0.5kg)', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: 2.5 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      // Expected: 102.5kg, actual: 102kg (within 0.5kg step)
      const after: SetSnapshot = { loadKg: 102, reps: 5, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.weight).toBeGreaterThanOrEqual(95);
    });

    it('should use ±2.5kg tolerance for fixed dumbbells', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: 5 }];
      const before: SetSnapshot = { loadKg: 20, reps: 6, rir: 2, implementIsFixedDumbbell: true };
      // Expected: 21kg, actual: 22.5kg (nearest dumbbell size)
      const after: SetSnapshot = { loadKg: 22.5, reps: 5, rir: 1, implementIsFixedDumbbell: true };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.weight).toBeGreaterThanOrEqual(90);
    });

    it('should fail when weight change is too far off', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: 2.5 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 110, reps: 5, rir: 1 }; // Way too heavy

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.weight).toBeLessThan(70);
      expect(result.reasons.some(r => r.includes('Weight') && r.includes('✗'))).toBe(true);
    });

    it('should handle negative weight adjustments', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: -5 }];
      const before: SetSnapshot = { loadKg: 100, reps: 3, rir: 0 };
      const after: SetSnapshot = { loadKg: 95, reps: 5, rir: 2 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.weight).toBe(100);
    });
  });

  describe('Target Window', () => {
    it('should hit when reps in [5,6] and RIR <= 2', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.target).toBe(100);
      expect(result.reasons.some(r => r.includes('Target') && r.includes('✓'))).toBe(true);
    });

    it('should hit at boundary (6 reps, RIR 2)', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.target).toBe(100);
    });

    it('should miss when reps in range but RIR > 2', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 4 }; // Too easy

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.target).toBe(70); // Partial credit
    });

    it('should miss when reps < 5', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 3, rir: 0 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.target).toBeLessThan(50);
    });

    it('should miss when reps > 6', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 8, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.target).toBe(50); // Past ideal window
    });

    it('should treat missing RIR as 3 (not hit)', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6 };
      const after: SetSnapshot = { loadKg: 100, reps: 5 }; // No RIR provided

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.target).toBe(70); // Partial - reps OK but RIR assumed 3
    });

    it('should respect custom target range', () => {
      const asks: CoachAsk[] = [{ kind: 'reps', targetRange: [3, 4] }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 4, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.target).toBe(100);
    });
  });

  describe('EMG Corroboration', () => {
    it('should pass when RMS drop in [20,30]%', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1, rmsDropPct: 25 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.emg).toBe(100);
      expect(result.reasons.some(r => r.includes('EMG') && r.includes('✓'))).toBe(true);
    });

    it('should pass when RoR drop in [25,40]%', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1, rorDropPct: 30 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.emg).toBe(100);
    });

    it('should pass when either RMS or RoR is in window', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1, rmsDropPct: 15, rorDropPct: 30 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.emg).toBe(100); // RoR in window
    });

    it('should fail when EMG outside window', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1, rmsDropPct: 10, rorDropPct: 15 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.emg).toBeLessThan(70);
    });

    it('should be N/A when EMG data missing', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.emg).toBe(-1);
    });
  });

  describe('Rest Adherence', () => {
    it('should pass when rest within ±20%', () => {
      const asks: CoachAsk[] = [{ kind: 'rest', seconds: 120 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1, restSec: 115 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.rest).toBe(100);
    });

    it('should pass at boundary (±20%)', () => {
      const asks: CoachAsk[] = [{ kind: 'rest', seconds: 100 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1, restSec: 120 }; // +20%

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.rest).toBe(100);
    });

    it('should fail when rest too far off', () => {
      const asks: CoachAsk[] = [{ kind: 'rest', seconds: 120 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1, restSec: 60 }; // -50%

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.rest).toBeLessThan(70);
    });

    it('should be N/A when rest data missing', () => {
      const asks: CoachAsk[] = [{ kind: 'rest', seconds: 120 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.rest).toBe(-1);
    });
  });

  describe('Reweighting', () => {
    it('should reweight when EMG is N/A', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: 2.5 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 102.5, reps: 5, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      // Weight 100, target 100, EMG N/A, rest N/A
      // Should reweight to weight:0.5, target:0.5
      expect(result.score).toBe(100);
    });

    it('should reweight when rest is N/A', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: 2.5 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 102.5, reps: 5, rir: 1, rmsDropPct: 25 };

      const result = scoreCompliance(asks, before, after);

      // Weight 100, target 100, EMG 100, rest N/A
      // Should reweight across weight, target, emg
      expect(result.score).toBe(100);
    });

    it('should handle only target being available', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      // Only target facet active
      expect(result.facets.weight).toBe(-1);
      expect(result.facets.target).toBe(100);
      expect(result.facets.emg).toBe(-1);
      expect(result.facets.rest).toBe(-1);
      expect(result.score).toBe(100);
    });
  });

  describe('Listened Determination', () => {
    it('should be listened when score >= 70', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: 2.5 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 102.5, reps: 5, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      expect(result.listened).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('should be listened when target hit even if weight failed (self-adjust success)', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: -5 }];
      const before: SetSnapshot = { loadKg: 100, reps: 3, rir: 0 };
      // User kept same weight but hit target
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.weight).toBeLessThan(70); // Weight failed
      expect(result.facets.target).toBe(100); // Target hit
      expect(result.listened).toBe(true); // Self-adjust success
    });

    it('should not be listened when score < 70 and target missed', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: 2.5 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 110, reps: 3, rir: 0 }; // Wrong weight, wrong target

      const result = scoreCompliance(asks, before, after);

      expect(result.listened).toBe(false);
      expect(result.score).toBeLessThan(70);
    });

    it('should be listened at exact threshold (score = 70)', () => {
      // Construct a scenario where score is exactly 70
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 3 }; // Partial target score

      const result = scoreCompliance(asks, before, after);

      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.listened).toBe(true);
    });
  });

  describe('Multiple Asks', () => {
    it('should handle multiple asks (weight + rest)', () => {
      const asks: CoachAsk[] = [
        { kind: 'weight', deltaPct: 2.5 },
        { kind: 'rest', seconds: 120 },
      ];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 102.5, reps: 5, rir: 1, restSec: 115 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.weight).toBe(100);
      expect(result.facets.target).toBe(100);
      expect(result.facets.rest).toBe(100);
      expect(result.listened).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(95);
    });

    it('should handle all facets with EMG', () => {
      const asks: CoachAsk[] = [
        { kind: 'weight', deltaPct: 2.5 },
        { kind: 'rest', seconds: 120 },
      ];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = {
        loadKg: 102.5,
        reps: 5,
        rir: 1,
        restSec: 115,
        rmsDropPct: 25,
        rorDropPct: 30,
      };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.weight).toBe(100);
      expect(result.facets.target).toBe(100);
      expect(result.facets.emg).toBe(100);
      expect(result.facets.rest).toBe(100);
      expect(result.score).toBe(100);
      expect(result.listened).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero weight change', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: 0 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.weight).toBe(100);
      expect(result.listened).toBe(true);
    });

    it('should handle very small loads (dumbbells)', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: 10 }];
      const before: SetSnapshot = { loadKg: 5, reps: 6, rir: 2, implementIsFixedDumbbell: true };
      const after: SetSnapshot = { loadKg: 7.5, reps: 5, rir: 1, implementIsFixedDumbbell: true };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.weight).toBeGreaterThanOrEqual(90);
    });

    it('should handle empty asks list', () => {
      const asks: CoachAsk[] = [];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 100, reps: 5, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      expect(result.facets.weight).toBe(-1);
      expect(result.facets.target).toBe(100);
      expect(result.listened).toBe(true);
    });

    it('should return all required fields', () => {
      const asks: CoachAsk[] = [{ kind: 'weight', deltaPct: 2.5 }];
      const before: SetSnapshot = { loadKg: 100, reps: 6, rir: 2 };
      const after: SetSnapshot = { loadKg: 102.5, reps: 5, rir: 1 };

      const result = scoreCompliance(asks, before, after);

      expect(result).toHaveProperty('listened');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('reasons');
      expect(result).toHaveProperty('facets');
      expect(typeof result.listened).toBe('boolean');
      expect(typeof result.score).toBe('number');
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(typeof result.facets).toBe('object');
    });
  });
});
