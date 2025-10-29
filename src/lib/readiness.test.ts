import { describe, expect, it } from 'vitest';
import { computeReadinessDropFromRMS, DEFAULT_READINESS_CFG } from './readiness';

describe('readiness with context', () => {
  it('computes baseline, drop, and zone for back squat @ ~75% 1RM', () => {
    const repPeaks = [0.88, 0.92, 0.95, 0.91, 0.87, 0.83];
    const out = computeReadinessDropFromRMS(
      {
        repPeaksRms: repPeaks,
        prevReadiness: 78,
        exerciseId: 'back_squat',
        weightKg: 120,
        est1RMKg: 160,
      },
      DEFAULT_READINESS_CFG
    );

    expect(out.baselineRms).toBeGreaterThan(0.89);
    expect(out.setReadinessDropPct).toBeGreaterThanOrEqual(0);
    expect(['green', 'yellow', 'red']).toContain(out.zone);
    expect(out.setZoneScore).toBeGreaterThanOrEqual(0);
    expect(out.readinessAfter).toBeGreaterThanOrEqual(0);
    expect(out.loadPctUsed).toBeDefined();
    expect(out.loadPctUsed).toBeCloseTo(0.75, 2);
  });

  it('degrades gracefully when load/exercise not provided', () => {
    const repPeaks = [0.7, 0.74, 0.76, 0.72, 0.69, 0.65];
    const out = computeReadinessDropFromRMS(
      {
        repPeaksRms: repPeaks,
        prevReadiness: 60,
      },
      DEFAULT_READINESS_CFG
    );

    expect(out.zone).toBeDefined();
    expect(out.loadPctUsed).toBeUndefined();
    expect(out.setZoneScore).toBeGreaterThanOrEqual(0);
    expect(out.readinessAfter).toBeGreaterThanOrEqual(0);
  });
});
