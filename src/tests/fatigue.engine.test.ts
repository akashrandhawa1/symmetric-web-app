import { describe, it, expect } from 'vitest';
import { determineZone, findFatigueRep } from '@/lib/fatigue/engine';
import type { RepFeature } from '@/lib/fatigue/types';

const makeRep = (idx: number, rmsNorm: number, signalConfidence = 1): RepFeature => ({
  idx,
  rmsNorm,
  signalConfidence,
});

describe('fatigue engine (RMS-only)', () => {
  it('flags too_heavy_early when early surge confirmed', () => {
    const reps = [
      makeRep(1, 1.0),
      makeRep(2, 1.22),
      makeRep(3, 1.28),
    ];
    expect(determineZone(reps)).toBe('too_heavy_early');
    expect(findFatigueRep(reps)).toBeNull();
  });

  it('identifies in_zone with confirmation and no failure drop', () => {
    const reps = [
      makeRep(1, 1.0),
      makeRep(2, 1.04),
      makeRep(3, 1.08),
      makeRep(4, 1.12),
      makeRep(5, 1.15),
      makeRep(6, 1.18),
      makeRep(7, 1.22),
      makeRep(8, 1.26),
      makeRep(9, 1.31),
    ];
    expect(determineZone(reps)).toBe('in_zone');
    expect(findFatigueRep(reps)).toBe(7);
  });

  it('guards against failure onset drop inside window', () => {
    const reps = [
      makeRep(1, 1.0),
      makeRep(2, 1.04),
      makeRep(3, 1.08),
      makeRep(4, 1.13),
      makeRep(5, 1.18),
      makeRep(6, 1.25),
      makeRep(7, 1.10), // 12% drop from peak
      makeRep(8, 1.09),
    ];
    expect(determineZone(reps)).toBe('building');
    expect(findFatigueRep(reps)).toBeNull();
  });

  it('flags too_light when rise insufficient by upper window', () => {
    const reps = Array.from({ length: 10 }, (_, i) =>
      makeRep(i + 1, 1 + i * 0.004),
    );
    expect(determineZone(reps)).toBe('too_light');
    expect(findFatigueRep(reps)).toBeNull();
  });

  it('returns low_signal when confidence dips below threshold', () => {
    const reps = [
      makeRep(1, 1.0),
      makeRep(2, 1.05),
      makeRep(3, 1.1, 0.65),
    ];
    expect(determineZone(reps)).toBe('low_signal');
  });
});
