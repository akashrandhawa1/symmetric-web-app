import { THRESH, TARGET_RANGE } from './thresholds';
import type { RepFeature, Zone } from './types';

const pct = (a: number, b: number): number => (b - a) / Math.max(1e-6, a);
const slope2 = (a: number, b: number): number => pct(a, b);
const localPeak = (values: number[]): number => values.reduce((max, value) => Math.max(max, value), -Infinity);

export function determineZone(reps: RepFeature[], target = TARGET_RANGE): Zone {
  const n = reps.length;
  if (!n) return 'building';

  const last = reps[n - 1];
  if (last.signalConfidence < THRESH.LOW_SIGNAL) return 'low_signal';

  const baseline = reps[0]?.rmsNorm ?? last.rmsNorm;

  if (last.idx <= THRESH.EARLY_WINDOW_MAX_REP && n >= THRESH.CONFIRM_REPS) {
    const prev = reps[n - 2];
    const rise = pct(baseline, last.rmsNorm);
    const s = slope2(prev.rmsNorm, last.rmsNorm);
    if (rise >= THRESH.IN_ZONE_DRMS_MIN + 0.08 && s >= THRESH.IN_ZONE_SLOPE_MIN + 0.01) {
      return 'too_heavy_early';
    }
  }

  const within = last.idx >= target.min && last.idx <= target.max;
  if (within && n >= THRESH.CONFIRM_REPS) {
    const a = reps[n - 2];
    const b = reps[n - 1];
    const riseA = pct(baseline, a.rmsNorm);
    const riseB = pct(baseline, b.rmsNorm);
    const s = slope2(a.rmsNorm, b.rmsNorm);
    const peak = localPeak(reps.map((r) => r.rmsNorm));
    const dropAfterPeak = pct(peak, b.rmsNorm) <= -THRESH.DROP_AFTER_PEAK;
    if (riseA >= THRESH.IN_ZONE_DRMS_MIN && riseB >= THRESH.IN_ZONE_DRMS_MIN && s >= THRESH.IN_ZONE_SLOPE_MIN && !dropAfterPeak) {
      return 'in_zone';
    }
  }

  const atUpper = last.idx >= target.max;
  if (atUpper) {
    const totalRise = pct(baseline, last.rmsNorm);
    if (totalRise < THRESH.TOO_LIGHT_DRMS_MAX) return 'too_light';
    if (last.idx >= 9) return 'fall';
  }

  if (last.idx >= 9) return 'fall';

  return 'building';
}

export function findFatigueRep(reps: RepFeature[], target = TARGET_RANGE): number | null {
  if (reps.length < THRESH.CONFIRM_REPS) return null;
  const baseline = reps[0]?.rmsNorm ?? 1;
  for (let i = target.min; i <= Math.min(target.max, reps.length); i += 1) {
    const a = reps[i - 2];
    const b = reps[i - 1];
    if (!a || !b) continue;
    const riseA = pct(baseline, a.rmsNorm);
    const riseB = pct(baseline, b.rmsNorm);
    const s = slope2(a.rmsNorm, b.rmsNorm);
    const peak = localPeak(reps.slice(0, b.idx).map((r) => r.rmsNorm));
    const dropAfterPeak = pct(peak, b.rmsNorm) <= -THRESH.DROP_AFTER_PEAK;
    if (riseA >= THRESH.IN_ZONE_DRMS_MIN && riseB >= THRESH.IN_ZONE_DRMS_MIN && s >= THRESH.IN_ZONE_SLOPE_MIN && !dropAfterPeak) {
      return b.idx;
    }
  }
  if (reps.length >= 9) {
    return reps[reps.length - 1]?.idx ?? null;
  }
  return null;
}
