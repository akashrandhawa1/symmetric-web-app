/**
 * High-realism surface EMG simulator geared toward strength sets.
 *
 * Models RMS amplitude trends with fatigue dynamics, asymmetric noise,
 * confidence drift, and optional custom shaping for demos or tests.
 */

export type ExerciseProfile = 'barbell_squat' | 'leg_press' | 'db_stepup' | 'generic';
export type Scenario = 'just_right' | 'early_heavy' | 'too_light' | 'low_signal' | 'custom';

export type RepFeature = {
  idx: number;
  rmsNorm: number; // normalized to session baseline (≈1.0)
  signalConfidence: number; // 0..1
  repVelocity?: number; // normalized 0..1 (lower when fatigued)
  repTempoOK?: boolean;
};

export type SetSimOptions = {
  repsTarget?: number;
  baselineRms?: number;
  scenario?: Scenario;
  exercise?: ExerciseProfile;
  targetRange?: { min: number; max: number };

  effort0?: number;
  effortStep?: number;
  fatigueGain?: number;
  fatigueCeil?: number;
  failureDropPct?: number;
  failureTriggerFatigue?: number;

  ar1Rho?: number;
  baseNoiseStd?: number;
  lateNoiseGain?: number;

  startConfidence?: number;
  confDriftPerRep?: number;
  confEventChance?: number;
  confEventDepth?: number;
  confFloor?: number;
  confCeil?: number;

  customCurve?: Array<{ atRep: number; rms: number }>;
  forceLowSignalWindows?: Array<{ from: number; to: number; confidence: number }>;
};

export const DEFAULTS = {
  repsTarget: 12,
  baselineRms: 1.0,
  scenario: 'just_right' as Scenario,
  exercise: 'generic' as ExerciseProfile,
  targetRange: { min: 7, max: 10 },

  effort0: 0.65,
  effortStep: 0.035,
  fatigueGain: 0.85,
  fatigueCeil: 1.0,
  failureDropPct: 0.12,
  failureTriggerFatigue: 0.78,

  ar1Rho: 0.65,
  baseNoiseStd: 0.015,
  lateNoiseGain: 0.025,

  startConfidence: 0.9,
  confDriftPerRep: 0.015,
  confEventChance: 0.12,
  confEventDepth: 0.25,
  confFloor: 0.35,
  confCeil: 0.98,
} as const;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const randn = (): number => {
  // Box-Muller transform
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const exerciseCeiling = (exercise: ExerciseProfile): number => {
  switch (exercise) {
    case 'barbell_squat':
      return 1.75;
    case 'leg_press':
      return 1.6;
    case 'db_stepup':
      return 1.55;
    default:
      return 1.65;
  }
};

const scenarioEffortBoost = (scenario: Scenario, rep: number): number => {
  if (scenario === 'early_heavy') return rep <= 3 ? 0.12 : 0.02;
  if (scenario === 'too_light') return -0.1;
  return 0;
};

const scenarioConfidenceEvent = (scenario: Scenario): boolean => scenario === 'low_signal';

const shapedBaselineRms = (
  repIndex: number,
  curve: NonNullable<SetSimOptions['customCurve']>,
  base: number,
): number => {
  if (curve.length === 0) return base;
  const sorted = [...curve].sort((a, b) => a.atRep - b.atRep);
  const prev = sorted.filter((p) => p.atRep <= repIndex).pop() ?? { atRep: 1, rms: base };
  const next = sorted.find((p) => p.atRep > repIndex) ?? { atRep: repIndex, rms: prev.rms };
  const span = Math.max(1, next.atRep - prev.atRep);
  const t = clamp((repIndex - prev.atRep) / span, 0, 1);
  return lerp(prev.rms, next.rms, t);
};

export function makeRmsSetV2(options: SetSimOptions = {}): RepFeature[] {
  const repsTarget = options.repsTarget ?? DEFAULTS.repsTarget;
  const baselineRms = options.baselineRms ?? DEFAULTS.baselineRms;
  const scenario = options.scenario ?? DEFAULTS.scenario;
  const exercise = options.exercise ?? DEFAULTS.exercise;
  const targetRange = options.targetRange ?? DEFAULTS.targetRange;

  const effort0 = options.effort0 ?? DEFAULTS.effort0;
  const effortStep = options.effortStep ?? DEFAULTS.effortStep;
  const fatigueGain = options.fatigueGain ?? DEFAULTS.fatigueGain;
  const fatigueCeil = options.fatigueCeil ?? DEFAULTS.fatigueCeil;
  const failureDropPct = options.failureDropPct ?? DEFAULTS.failureDropPct;
  const failureTriggerFatigue = options.failureTriggerFatigue ?? DEFAULTS.failureTriggerFatigue;

  const ar1Rho = options.ar1Rho ?? DEFAULTS.ar1Rho;
  const baseNoiseStd = options.baseNoiseStd ?? DEFAULTS.baseNoiseStd;
  const lateNoiseGain = options.lateNoiseGain ?? DEFAULTS.lateNoiseGain;

  const startConfidence = options.startConfidence ?? DEFAULTS.startConfidence;
  const confDriftPerRep = options.confDriftPerRep ?? DEFAULTS.confDriftPerRep;
  const confEventChance = options.confEventChance ?? DEFAULTS.confEventChance;
  const confEventDepth = options.confEventDepth ?? DEFAULTS.confEventDepth;
  const confFloor = options.confFloor ?? DEFAULTS.confFloor;
  const confCeil = options.confCeil ?? DEFAULTS.confCeil;

  const customCurve = options.customCurve;
  const forceLowSignalWindows = options.forceLowSignalWindows;

  const ceiling = exerciseCeiling(exercise);
  const reps: RepFeature[] = [];

  let fatigue = 0;
  let effort = effort0;
  let arNoise = 0;
  let confidence = startConfidence;
  let peakRms = baselineRms;

  for (let i = 1; i <= repsTarget; i += 1) {
    const scenarioBoost = scenarioEffortBoost(scenario, i);
    effort = clamp(effort + effortStep + scenarioBoost, 0.4, 1.0);

    const fatigueDelta = fatigueGain * effort * (1 - fatigue);
    fatigue = clamp(fatigue + fatigueDelta, 0, fatigueCeil);

    const velocity = clamp(1 - fatigue * 0.6 - Math.max(0, i - targetRange.min) * 0.02, 0.25, 1);

    const strengthRise = 0.12 + 0.55 * fatigue + 0.18 * (1 - velocity);
    let rmsDeterministic = baselineRms * clamp(1 + strengthRise, 0.9, ceiling);

    if (fatigue >= failureTriggerFatigue && i >= targetRange.min) {
      const dropEvent = scenario === 'early_heavy' ? i >= 6 : randn() > 2.0;
      if (dropEvent) {
        rmsDeterministic = peakRms * (1 - failureDropPct);
      }
    }

    peakRms = Math.max(peakRms, rmsDeterministic);

    const noiseStd = baseNoiseStd + lateNoiseGain * fatigue;
    arNoise = ar1Rho * arNoise + noiseStd * randn();
    const rmsWithNoise = clamp(rmsDeterministic * (1 + arNoise), baselineRms * 0.85, ceiling * 1.02);

    confidence = clamp(confidence - confDriftPerRep * (0.6 + 0.8 * fatigue), confFloor, confCeil);
    if (scenarioConfidenceEvent(scenario) && Math.random() < confEventChance) {
      confidence = clamp(confidence - confEventDepth * (0.7 + 0.6 * Math.random()), confFloor, confCeil);
    }

    if (forceLowSignalWindows) {
      const window = forceLowSignalWindows.find((w) => i >= w.from && i <= w.to);
      if (window) {
        confidence = clamp(window.confidence, 0, 1);
      }
    }

    let rmsNorm = rmsWithNoise;
    if (customCurve && customCurve.length > 0) {
      rmsNorm = shapedBaselineRms(i, customCurve, baselineRms);
    }

    reps.push({
      idx: i,
      rmsNorm,
      signalConfidence: confidence,
      repVelocity: velocity,
      repTempoOK: velocity >= 0.35,
    });
  }

  return reps;
}

export async function* streamRmsSetV2(
  options: SetSimOptions = {},
  msPerRep = 800,
): AsyncGenerator<RepFeature> {
  const reps = makeRmsSetV2(options);
  for (const rep of reps) {
    yield rep;
    if (msPerRep > 0) {
      await new Promise((resolve) => setTimeout(resolve, msPerRep));
    }
  }
}

export function makeSymmetricPair(
  options: SetSimOptions = {},
  leftBias = 1.0,
  rightBias = 1.0,
): { left: RepFeature[]; right: RepFeature[] } {
  const base = makeRmsSetV2(options);
  const left = base.map((rep) => ({ ...rep, rmsNorm: rep.rmsNorm * leftBias }));
  const right = base.map((rep) => ({ ...rep, rmsNorm: rep.rmsNorm * rightBias }));
  return { left, right };
}

