import { describe, expect, it } from 'vitest';
import {
  classifyLevel,
  estimateRecovery,
  whatIf,
  type Profile,
  type SessionFeatures,
  type EMG,
} from './recovery';

const profileNovice: Profile = {
  trainingAgeMonths: 3,
  sessionsPerWeek8w: 1.0,
  exposuresByPattern: { squat: 6 },
};

const profileInter: Profile = {
  trainingAgeMonths: 14,
  sessionsPerWeek8w: 2.5,
  exposuresByPattern: { squat: 24 },
};

const profileAdv: Profile = {
  trainingAgeMonths: 48,
  sessionsPerWeek8w: 3.0,
  relativeSquatBW: 1.7,
  exposuresByPattern: { squat: 60 },
};

const baseSession: SessionFeatures = {
  setsTotal: 4,
  repsTotal: 24,
  avgRIR: 1,
  novelExercise: false,
  eccentricBias: false,
  tags: [],
};

const emgMedium: EMG = { rmsDropPct: 22, rorDropPct: 28, symmetryPct: 90 };

describe('classifyLevel', () => {
  it('identifies novices by beginner thresholds', () => {
    expect(classifyLevel(profileNovice)).toBe('novice');
  });

  it('identifies advanced lifters by strength', () => {
    expect(classifyLevel(profileAdv)).toBe('advanced');
  });

  it('otherwise falls back to intermediate', () => {
    expect(classifyLevel(profileInter)).toBe('intermediate');
  });
});

describe('estimateRecovery', () => {
  it('produces SSS that grows with volume', () => {
    const lowStress = estimateRecovery(profileInter, { ...baseSession, setsTotal: 2, repsTotal: 10 }, emgMedium);
    const highStress = estimateRecovery(profileInter, { ...baseSession, setsTotal: 6, repsTotal: 36 }, emgMedium);
    expect(lowStress.SSS).toBeLessThan(highStress.SSS);
  });

  it('applies tag adjustments for heavy singles and hypertrophy', () => {
    const base = estimateRecovery(profileInter, baseSession, emgMedium);
    const heavy = estimateRecovery(
      profileInter,
      { ...baseSession, tags: ['heavySingles'] },
      emgMedium,
    );
    const hypertrophy = estimateRecovery(
      profileInter,
      { ...baseSession, tags: ['hypertrophy'] },
      emgMedium,
    );
    expect(heavy.T80h - base.T80h).toBeGreaterThanOrEqual(10);
    expect(hypertrophy.T80h - base.T80h).toBeGreaterThanOrEqual(6);
  });

  it('respects low fatigue bonus without violating clamps', () => {
    const lowFatigueSession: SessionFeatures = {
      ...baseSession,
      avgRIR: 4,
      avgRPE: 6,
    };
    const lowFatigueEmg: EMG = { rmsDropPct: 5, rorDropPct: 6, symmetryPct: 92 };

    const fatigued = estimateRecovery(profileInter, baseSession, emgMedium);
    const lowFatigue = estimateRecovery(profileInter, lowFatigueSession, lowFatigueEmg);

    expect(lowFatigue.T80h).toBeLessThan(fatigued.T80h);
    expect(lowFatigue.T80h).toBeGreaterThanOrEqual(12);
    expect(lowFatigue.T85h).toBeGreaterThanOrEqual(lowFatigue.T80h + 4);
  });

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  it('readiness curve starts near R0 and ends near 100', () => {
    const est = estimateRecovery(profileInter, baseSession, emgMedium);
    const curve = est.readinessCurve;
    expect(curve.length).toBeGreaterThan(0);
    const first = curve[0];
    const last = curve[curve.length - 1];
    expect(first.hours).toBe(0);
    const expectedR0 = Math.max(
      45,
      100 -
        (clamp(emgMedium.rmsDropPct / 30, 0, 1) * 40 +
          clamp(emgMedium.rorDropPct / 40, 0, 1) * 30),
    );
    expect(Math.abs(first.readiness - Number(expectedR0.toFixed(2)))).toBeLessThan(1);
    expect(last.readiness).toBeGreaterThanOrEqual(95);
  });

  it('baseline windows fall in sane range', () => {
    const est = estimateRecovery(profileInter, baseSession, emgMedium);
    expect(est.T80h).toBeGreaterThanOrEqual(36);
    expect(est.T80h).toBeLessThanOrEqual(120);
    expect(est.T85h).toBeGreaterThan(est.T80h);
  });
});

describe('whatIf', () => {
  it('reports positive deltas when adding volume', () => {
    const result = whatIf(
      profileInter,
      baseSession,
      emgMedium,
      { setsTotal: baseSession.setsTotal + 1 },
    );
    expect(result.deltaT80h).toBeGreaterThan(0);
    expect(result.deltaT85h).toBeGreaterThan(0);
  });
});
