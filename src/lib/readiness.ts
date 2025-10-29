import { pickThresholds, mapDropToZone, zoneToScore, Zone } from './exerciseThresholds';

export type ReadinessConfig = {
  baselineMode: 'sessionTop3' | 'rollingTop3of5';
  earlyRepsForBaseline: number;
  noiseFloorPct: number;
  emaAlpha: number;
  lastRepsWeightCount: number;
  setImpact: number;
};

export const DEFAULT_READINESS_CFG: ReadinessConfig = {
  baselineMode: 'sessionTop3',
  earlyRepsForBaseline: 5,
  noiseFloorPct: 0.07,
  emaAlpha: 0.35,
  lastRepsWeightCount: 3,
  setImpact: 0.6,
};

export type ReadinessInputs = {
  repPeaksRms?: number[];
  rmsStream?: number[];
  repWindows?: Array<{ startIdx: number; endIdx: number }>;

  exerciseId?: string;
  weightKg?: number;
  est1RMKg?: number;

  historicalTopPeaks?: number[];
  prevReadiness: number;
};

export type ReadinessOutputs = {
  baselineRms: number;
  perRepDropPctRaw: number[];
  perRepDropPctSmoothed: number[];
  setReadinessDropPct: number;
  zone: Zone;
  setZoneScore: number;
  readinessAfter: number;
  loadPctUsed?: number;
};

function ema(previous: number | undefined, value: number, alpha: number) {
  if (previous === undefined) return value;
  return alpha * value + (1 - alpha) * previous;
}

function computeRepPeaksFromWindows(rmsStream: number[], windows: Array<{ startIdx: number; endIdx: number }>): number[] {
  return windows.map((window) => {
    let peak = 0;
    for (let i = window.startIdx; i <= window.endIdx && i < rmsStream.length; i += 1) {
      if (rmsStream[i] > peak) peak = rmsStream[i];
    }
    return peak;
  });
}

function pickSessionBaselineTop3(repPeaks: number[], earlyN: number) {
  const pool = repPeaks.slice(0, Math.min(earlyN, repPeaks.length)).filter(Number.isFinite);
  if (pool.length === 0) return 0;
  const top3 = [...pool].sort((a, b) => b - a).slice(0, 3);
  return top3.reduce((sum, value) => sum + value, 0) / top3.length;
}

function pickRollingBaselineTop3of5(historical: number[] = [], sessionEarly: number[] = []) {
  const pool = [...historical, ...sessionEarly].filter(Number.isFinite);
  if (pool.length === 0) return 0;
  const top5 = [...pool].sort((a, b) => b - a).slice(0, 5);
  const top3 = top5.slice(0, Math.min(3, top5.length));
  return top3.reduce((sum, value) => sum + value, 0) / top3.length;
}

function estimateLoadPct(weightKg?: number, est1RMKg?: number): number | undefined {
  if (!weightKg || !est1RMKg || est1RMKg <= 0) return undefined;
  const ratio = weightKg / est1RMKg;
  return Math.max(0, Math.min(1, ratio));
}

/**
 * Compute readiness drop from RMS rep peaks with load-aware zones.
 */
export function computeReadinessDropFromRMS(
  inputs: ReadinessInputs,
  cfg: ReadinessConfig = DEFAULT_READINESS_CFG
): ReadinessOutputs {
  let repPeaks: number[];
  if (inputs.repPeaksRms?.length) {
    repPeaks = inputs.repPeaksRms;
  } else if (inputs.rmsStream && inputs.repWindows?.length) {
    repPeaks = computeRepPeaksFromWindows(inputs.rmsStream, inputs.repWindows);
  } else {
    throw new Error('Provide repPeaksRms OR (rmsStream + repWindows).');
  }

  const earlyRepPeaks = repPeaks.slice(0, Math.min(cfg.earlyRepsForBaseline, repPeaks.length));
  let baselineRms =
    cfg.baselineMode === 'sessionTop3'
      ? pickSessionBaselineTop3(repPeaks, cfg.earlyRepsForBaseline)
      : pickRollingBaselineTop3of5(inputs.historicalTopPeaks, earlyRepPeaks);

  if (!Number.isFinite(baselineRms) || baselineRms <= 0) {
    const seed = Math.max(...repPeaks.slice(0, 2).filter(Number.isFinite));
    baselineRms = Number.isFinite(seed) && seed > 0 ? seed : 1;
  }

  const rawDrops = repPeaks.map((peak) => Math.max(0, (baselineRms - peak) / baselineRms));

  const smoothed: number[] = [];
  let previous: number | undefined;
  for (let i = 0; i < rawDrops.length; i += 1) {
    const floored = rawDrops[i] < cfg.noiseFloorPct ? 0 : rawDrops[i];
    const smoothedValue = ema(previous, floored, cfg.emaAlpha);
    smoothed.push(smoothedValue);
    previous = smoothedValue;
  }

  const tailCount = Math.min(cfg.lastRepsWeightCount, smoothed.length);
  const tail = tailCount > 0 ? smoothed.slice(smoothed.length - tailCount) : smoothed;
  const setDropPct =
    tail.length > 0
      ? tail.reduce((sum, value) => sum + value, 0) / tail.length
      : smoothed.reduce((sum, value) => sum + value, 0) / Math.max(1, smoothed.length);

  const loadPct = estimateLoadPct(inputs.weightKg, inputs.est1RMKg);
  const thresholds = pickThresholds(inputs.exerciseId, loadPct);
  const zone = mapDropToZone(setDropPct, thresholds);
  const setZoneScore = zoneToScore(zone);

  const blended = inputs.prevReadiness * (1 - cfg.setImpact) + setZoneScore * cfg.setImpact;
  const readinessAfter = Math.max(49, Math.max(0, Math.min(100, blended)));

  return {
    baselineRms,
    perRepDropPctRaw: rawDrops,
    perRepDropPctSmoothed: smoothed,
    setReadinessDropPct: setDropPct,
    zone,
    setZoneScore,
    readinessAfter,
    loadPctUsed: loadPct,
  };
}
