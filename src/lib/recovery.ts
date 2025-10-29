/**
 * Recovery engine
 *
 * Pure heuristics for classifying lifter level, estimating recovery windows,
 * and sketching a readiness curve from simple session inputs. All functions
 * are deterministic, side-effect free, and safe to run on the client.
 */

export type LifterLevel = 'novice' | 'intermediate' | 'advanced';

export type Profile = {
  trainingAgeMonths: number;
  sessionsPerWeek8w: number;
  relativeSquatBW?: number | null;
  exposuresByPattern?: Record<string, number>;
};

export type SessionFeatures = {
  setsTotal: number;
  repsTotal: number;
  avgRIR?: number;
  avgRPE?: number;
  novelExercise: boolean;
  eccentricBias: boolean;
  durationMin?: number;
  tags?: Array<'heavySingles' | 'hypertrophy'>;
};

export type EMG = {
  rmsDropPct: number;
  rorDropPct: number;
  symmetryPct: number;
};

export type RecoveryEstimate = {
  level: LifterLevel;
  SSS: number;
  T80h: number;
  T85h: number;
  readinessCurve: Array<{ hours: number; readiness: number }>;
  notes: string[];
};

type BaseWindows = {
  T80: number;
  T85: number;
};

const BASE_WINDOWS: Record<LifterLevel, BaseWindows> = {
  novice: { T80: 48, T85: 60 },
  intermediate: { T80: 36, T85: 48 },
  advanced: { T80: 36, T85: 48 },
};

const TAG_HOURS: Record<'heavySingles' | 'hypertrophy', number> = {
  heavySingles: 12,
  hypertrophy: 8,
};

const MIN_T80 = 12;
const MAX_T80 = 120;
const MIN_T85_OFFSET = 4;

const STEP_HOURS = 4;

/**
 * Clamp a numeric value between a minimum and maximum.
 */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Map repetitions in reserve to a fatigue factor in [0, 1].
 */
function mapRir(rir: number): number {
  if (rir <= 1) return 1;
  if (rir === 2) return 0.8;
  if (rir === 3) return 0.6;
  if (rir === 4 || rir === 5) return 0.3;
  return 0.2;
}

/**
 * Map RPE (rate of perceived exertion) to a fatigue factor in [0, 1].
 */
function mapRpe(rpe: number): number {
  if (rpe >= 9.5) return 1;
  if (rpe >= 9.0) return 0.9;
  if (rpe >= 8.0) return 0.6;
  if (rpe >= 7.0) return 0.4;
  return 0.2;
}

/**
 * Resolve exposures for a given pattern, defaulting to 0 when unknown.
 */
function exposuresFor(profile: Profile, pattern: string): number {
  return profile.exposuresByPattern?.[pattern] ?? 0;
}

/**
 * Determine the dominant lifter level based on training age and exposures.
 */
export function classifyLevel(p: Profile): LifterLevel {
  if (
    p.trainingAgeMonths < 6 ||
    exposuresFor(p, 'squat') < 12 ||
    p.sessionsPerWeek8w < 1.5
  ) {
    return 'novice';
  }

  if (p.trainingAgeMonths >= 36 || (p.relativeSquatBW ?? 0) >= 1.6) {
    return 'advanced';
  }

  return 'intermediate';
}

/**
 * Compute Session Stress Score (SSS) from session and EMG inputs.
 */
function computeSSS(s: SessionFeatures, emg: EMG): number {
  const volumeDensity = clamp((s.setsTotal * s.repsTotal) / 60, 0, 1);
  const effort = s.avgRIR != null
    ? mapRir(s.avgRIR)
    : s.avgRPE != null
      ? mapRpe(s.avgRPE)
      : 0.4;
  const fRms = clamp(emg.rmsDropPct / 30, 0, 1);
  const fRor = clamp(emg.rorDropPct / 40, 0, 1);
  const novel = s.novelExercise ? 1 : 0;
  const eccentric = s.eccentricBias ? 1 : 0;

  const raw =
    0.30 * volumeDensity +
    0.20 * effort +
    0.20 * fRms +
    0.15 * fRor +
    0.10 * novel +
    0.05 * eccentric;

  return Number(raw.toFixed(4));
}

/**
 * Build human readable notes describing modifiers applied.
 */
function buildNotes(s: SessionFeatures, emg: EMG, lowFatigueBonusApplied: boolean): string[] {
  const notes: string[] = [];
  if (s.novelExercise) {
    notes.push('New movement—expect extra soreness before rebound.');
  }
  if (s.tags?.includes('heavySingles')) {
    notes.push('Heavy singles extend recovery window.');
  }
  if (s.tags?.includes('hypertrophy')) {
    notes.push('Hypertrophy work adds extra fatigue to clear.');
  }
  if (lowFatigueBonusApplied) {
    notes.push('Low fatigue markers detected—faster rebound applied (-8h).');
  }
  if (emg.symmetryPct < 90) {
    notes.push('Monitor symmetry—recovery curve assumes corrective work.');
  }
  return notes;
}

/**
 * Build readiness curve samples (hours vs readiness).
 */
function buildReadinessCurve(
  emg: EMG,
  novelExercise: boolean,
  T80h: number,
  T85h: number
): Array<{ hours: number; readiness: number }> {
  const rmsFactor = clamp(emg.rmsDropPct / 30, 0, 1);
  const rorFactor = clamp(emg.rorDropPct / 40, 0, 1);
  const novelPenalty = novelExercise ? 10 : 0;

  const fatigueScore = rmsFactor * 40 + rorFactor * 30 + novelPenalty;
  const R0 = Math.max(45, 100 - fatigueScore);
  const A = Math.max(0, 100 - R0);
  const Afast = 0.55 * A;
  const Aslow = 0.45 * A;
  const tauFast = 8;
  const tauSlow = Math.max(12, T80h / 1.2);

  const maxHours = Math.max(96, T85h + 24);
  const points: Array<{ hours: number; readiness: number }> = [];

  for (let t = 0; t <= maxHours; t += STEP_HOURS) {
    const readiness =
      100 -
      (Afast * Math.exp(-t / tauFast) + Aslow * Math.exp(-t / tauSlow));
    points.push({
      hours: t,
      readiness: Number(readiness.toFixed(2)),
    });
  }

  if (points[0]?.readiness !== Number(R0.toFixed(2))) {
    points[0] = { hours: 0, readiness: Number(R0.toFixed(2)) };
  }

  return points;
}

/**
 * Estimate recovery timeline from profile, session, and EMG inputs.
 */
export function estimateRecovery(
  p: Profile,
  s: SessionFeatures,
  emg: EMG
): RecoveryEstimate {
  const level = classifyLevel(p);
  const base = BASE_WINDOWS[level];
  const sssRaw = computeSSS(s, emg);
  const SSS = Number(sssRaw.toFixed(2));

  const mult = 1 + sssRaw;
  const tagHours = (s.tags ?? []).reduce(
    (sum, tag) => sum + (TAG_HOURS[tag] ?? 0),
    0,
  );
  const lowFatigue =
    emg.rmsDropPct < 10 &&
    emg.rorDropPct < 10 &&
    ((s.avgRIR ?? -Infinity) >= 3 || (s.avgRPE ?? Infinity) <= 6.5);
  const lowFatigueBonus = lowFatigue ? 8 : 0;

  let T80h = Math.floor(base.T80 * mult + tagHours - lowFatigueBonus);
  T80h = clamp(T80h, MIN_T80, MAX_T80);

  let T85h = Math.floor(base.T85 * mult + tagHours - lowFatigueBonus);
  T85h = Math.max(T85h, T80h + MIN_T85_OFFSET);

  const readinessCurve = buildReadinessCurve(
    emg,
    s.novelExercise,
    T80h,
    T85h,
  );
  const notes = buildNotes(s, emg, lowFatigue);

  return {
    level,
    SSS,
    T80h,
    T85h,
    readinessCurve,
    notes,
  };
}

/**
 * Run a what-if scenario by mutating session features and returning delta windows.
 */
export function whatIf(
  p: Profile,
  s: SessionFeatures,
  emg: EMG,
  mutate: Partial<SessionFeatures>,
): { deltaT80h: number; deltaT85h: number; est: RecoveryEstimate } {
  const base = estimateRecovery(p, s, emg);
  const nextSession: SessionFeatures = {
    ...s,
    ...mutate,
    tags: mutate.tags ?? s.tags,
  };
  const est = estimateRecovery(p, nextSession, emg);
  return {
    deltaT80h: est.T80h - base.T80h,
    deltaT85h: est.T85h - base.T85h,
    est,
  };
}
