/**
 * Compliance Engine
 *
 * Determines whether the user "listened" to the coach's ask on the next set.
 * Pure, deterministic scoring with no external dependencies.
 *
 * @module compliance
 */

/**
 * Represents a coach's ask for the next set.
 */
export type CoachAsk =
  | { kind: 'weight'; deltaPct: number }
  | { kind: 'rest'; seconds: number }
  | { kind: 'reps'; targetRange: [number, number] };

/**
 * Snapshot of a completed set with all relevant metrics.
 */
export type SetSnapshot = {
  /** Load in kilograms */
  loadKg: number;
  /** Number of reps completed */
  reps: number;
  /** Reps in reserve (optional) */
  rir?: number;
  /** Rest duration in seconds (optional) */
  restSec?: number;
  /** RMS signal drop percentage (optional) */
  rmsDropPct?: number;
  /** Rate of rise drop percentage (optional) */
  rorDropPct?: number;
  /** True if using fixed dumbbells with discrete sizes */
  implementIsFixedDumbbell?: boolean;
};

/**
 * Result of compliance scoring.
 */
export type ComplianceResult = {
  /** True if user listened to coach (score >= 70 or self-adjusted correctly) */
  listened: boolean;
  /** Overall compliance score 0-100 */
  score: number;
  /** Human-readable reasons explaining pass/fail per facet */
  reasons: string[];
  /** Individual facet scores (0-100 or -1 if N/A) */
  facets: Record<'weight' | 'target' | 'emg' | 'rest', number>;
};

/**
 * Default target window for reps and RIR.
 */
const DEFAULT_TARGET_RANGE: [number, number] = [5, 6];
const DEFAULT_RIR_THRESHOLD = 2;

/**
 * Tolerance thresholds
 */
const WEIGHT_TOLERANCE_PCT = 1.5;
const BARBELL_PLATE_STEP_KG = 0.5;
const DUMBBELL_SIZE_STEP_KG = 2.5;
const REST_TOLERANCE_PCT = 20;
const RMS_DROP_RANGE: [number, number] = [20, 30];
const ROR_DROP_RANGE: [number, number] = [25, 40];

/**
 * Facet weights for scoring (must sum to 1.0)
 */
const DEFAULT_WEIGHTS = {
  weight: 0.4,
  target: 0.4,
  emg: 0.1,
  rest: 0.1,
};

/**
 * Threshold for "listened" determination
 */
const LISTENED_THRESHOLD = 70;

/**
 * Scores compliance with coach's asks.
 *
 * @param asks - List of coach asks (weight, rest, reps)
 * @param before - Snapshot of the previous set
 * @param after - Snapshot of the completed set
 * @returns Compliance result with score, listened flag, reasons, and facet scores
 *
 * @example
 * ```ts
 * const result = scoreCompliance(
 *   [{ kind: 'weight', deltaPct: 2.5 }],
 *   { loadKg: 100, reps: 6, rir: 2 },
 *   { loadKg: 102.5, reps: 5, rir: 1 }
 * );
 * console.log(result.listened); // true
 * console.log(result.score); // 95
 * ```
 */
export function scoreCompliance(
  asks: CoachAsk[],
  before: SetSnapshot,
  after: SetSnapshot
): ComplianceResult {
  const reasons: string[] = [];
  const facets: Record<'weight' | 'target' | 'emg' | 'rest', number> = {
    weight: -1,
    target: -1,
    emg: -1,
    rest: -1,
  };

  // Extract asks
  const weightAsk = asks.find((a): a is Extract<CoachAsk, { kind: 'weight' }> => a.kind === 'weight');
  const restAsk = asks.find((a): a is Extract<CoachAsk, { kind: 'rest' }> => a.kind === 'rest');
  const repsAsk = asks.find((a): a is Extract<CoachAsk, { kind: 'reps' }> => a.kind === 'reps');

  // Score weight adherence
  if (weightAsk) {
    facets.weight = scoreWeightAdherence(weightAsk, before, after, reasons);
  }

  // Score target window (always evaluated)
  const targetRange = repsAsk?.targetRange ?? DEFAULT_TARGET_RANGE;
  facets.target = scoreTargetWindow(after, targetRange, reasons);

  // Score EMG corroboration (bonus if available)
  if (after.rmsDropPct !== undefined || after.rorDropPct !== undefined) {
    facets.emg = scoreEMGCorroboration(after, reasons);
  }

  // Score rest adherence
  if (restAsk && after.restSec !== undefined) {
    facets.rest = scoreRestAdherence(restAsk, after, reasons);
  }

  // Calculate weighted score
  const { score, activeWeights } = calculateWeightedScore(facets);

  // Determine "listened"
  // listened = score >= 70 OR (target hit AND weight failed) = "self-adjust success"
  const targetHit = facets.target === 100;
  const weightFailed = facets.weight >= 0 && facets.weight < 70;
  const listened = score >= LISTENED_THRESHOLD || (targetHit && weightFailed);

  return {
    listened,
    score: Math.round(score),
    reasons,
    facets,
  };
}

/**
 * Scores weight adherence based on coach's ask.
 *
 * Considers equipment constraints (barbell vs fixed dumbbells) and allows
 * tolerance for plate step limitations.
 */
function scoreWeightAdherence(
  ask: Extract<CoachAsk, { kind: 'weight' }>,
  before: SetSnapshot,
  after: SetSnapshot,
  reasons: string[]
): number {
  const expectedKg = before.loadKg * (1 + ask.deltaPct / 100);
  const actualKg = after.loadKg;
  const deltaKg = Math.abs(actualKg - expectedKg);

  // Determine tolerance based on implement type
  const plateStep = after.implementIsFixedDumbbell ? DUMBBELL_SIZE_STEP_KG : BARBELL_PLATE_STEP_KG;
  const percentTolerance = (WEIGHT_TOLERANCE_PCT / 100) * expectedKg;
  const tolerance = Math.max(plateStep, percentTolerance);

  const withinTolerance = deltaKg <= tolerance;

  if (withinTolerance) {
    const changePct = ((actualKg - before.loadKg) / before.loadKg) * 100;
    reasons.push(
      `Weight: Applied ${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}% ` +
      `(${before.loadKg}→${actualKg}kg), asked ${ask.deltaPct > 0 ? '+' : ''}${ask.deltaPct}% — ✓`
    );
    return 100;
  } else {
    const changePct = ((actualKg - before.loadKg) / before.loadKg) * 100;
    reasons.push(
      `Weight: Applied ${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}% ` +
      `(${before.loadKg}→${actualKg}kg), asked ${ask.deltaPct > 0 ? '+' : ''}${ask.deltaPct}% — ✗ (off by ${deltaKg.toFixed(1)}kg)`
    );
    // Partial credit based on how close they got
    const score = Math.max(0, 100 - (deltaKg / tolerance) * 50);
    return Math.round(score);
  }
}

/**
 * Scores target window hit.
 *
 * Target hit = reps in [5,6] AND RIR <= 2
 * If RIR is missing, treat as 3 (not hit).
 */
function scoreTargetWindow(
  after: SetSnapshot,
  targetRange: [number, number],
  reasons: string[]
): number {
  const [minReps, maxReps] = targetRange;
  const rir = after.rir ?? 3; // Default to 3 if missing (not hit)

  const repsInRange = after.reps >= minReps && after.reps <= maxReps;
  const rirOk = rir <= DEFAULT_RIR_THRESHOLD;
  const hit = repsInRange && rirOk;

  if (hit) {
    reasons.push(
      `Target: Hit the pocket with ${after.reps} reps @ RIR ${rir} — ✓`
    );
    return 100;
  } else if (repsInRange && !rirOk) {
    reasons.push(
      `Target: ${after.reps} reps in range but RIR ${rir} > ${DEFAULT_RIR_THRESHOLD} — partial`
    );
    return 70;
  } else if (after.reps < minReps) {
    reasons.push(
      `Target: Only ${after.reps} reps, needed ${minReps}+ — ✗`
    );
    return 30;
  } else {
    reasons.push(
      `Target: ${after.reps} reps past ideal window (${minReps}-${maxReps}) — ✗`
    );
    return 50;
  }
}

/**
 * Scores EMG corroboration (bonus facet).
 *
 * OK if RMS drop in [20,30]% OR RoR drop in [25,40]%.
 */
function scoreEMGCorroboration(
  after: SetSnapshot,
  reasons: string[]
): number {
  const rmsOk = after.rmsDropPct !== undefined &&
    after.rmsDropPct >= RMS_DROP_RANGE[0] &&
    after.rmsDropPct <= RMS_DROP_RANGE[1];

  const rorOk = after.rorDropPct !== undefined &&
    after.rorDropPct >= ROR_DROP_RANGE[0] &&
    after.rorDropPct <= ROR_DROP_RANGE[1];

  if (rmsOk || rorOk) {
    const metrics: string[] = [];
    if (rmsOk && after.rmsDropPct !== undefined) {
      metrics.push(`RMS ${after.rmsDropPct.toFixed(0)}%`);
    }
    if (rorOk && after.rorDropPct !== undefined) {
      metrics.push(`RoR ${after.rorDropPct.toFixed(0)}%`);
    }
    reasons.push(`EMG: ${metrics.join(', ')} in productive window — ✓`);
    return 100;
  } else {
    const metrics: string[] = [];
    if (after.rmsDropPct !== undefined) {
      metrics.push(`RMS ${after.rmsDropPct.toFixed(0)}%`);
    }
    if (after.rorDropPct !== undefined) {
      metrics.push(`RoR ${after.rorDropPct.toFixed(0)}%`);
    }
    reasons.push(`EMG: ${metrics.join(', ')} outside productive window — ✗`);
    return 40;
  }
}

/**
 * Scores rest adherence.
 *
 * OK if actual rest within ±20% of asked seconds.
 */
function scoreRestAdherence(
  ask: Extract<CoachAsk, { kind: 'rest' }>,
  after: SetSnapshot,
  reasons: string[]
): number {
  if (after.restSec === undefined) {
    return -1; // N/A
  }

  const tolerance = (REST_TOLERANCE_PCT / 100) * ask.seconds;
  const delta = Math.abs(after.restSec - ask.seconds);
  const withinTolerance = delta <= tolerance;

  if (withinTolerance) {
    reasons.push(
      `Rest: ${after.restSec}s vs asked ${ask.seconds}s — ✓`
    );
    return 100;
  } else {
    reasons.push(
      `Rest: ${after.restSec}s vs asked ${ask.seconds}s — ✗ (off by ${Math.round(delta)}s)`
    );
    const score = Math.max(0, 100 - (delta / tolerance) * 50);
    return Math.round(score);
  }
}

/**
 * Calculates weighted score, reweighting when facets are N/A.
 */
function calculateWeightedScore(
  facets: Record<'weight' | 'target' | 'emg' | 'rest', number>
): { score: number; activeWeights: Record<string, number> } {
  const activeWeights: Record<string, number> = {};
  let totalWeight = 0;

  // Collect active facets
  for (const [key, value] of Object.entries(facets)) {
    if (value >= 0) {
      const weight = DEFAULT_WEIGHTS[key as keyof typeof DEFAULT_WEIGHTS];
      activeWeights[key] = weight;
      totalWeight += weight;
    }
  }

  // Reweight to sum to 1.0
  if (totalWeight > 0) {
    for (const key of Object.keys(activeWeights)) {
      activeWeights[key] /= totalWeight;
    }
  }

  // Calculate weighted score
  let score = 0;
  for (const [key, value] of Object.entries(facets)) {
    if (value >= 0 && activeWeights[key] !== undefined) {
      score += value * activeWeights[key];
    }
  }

  return { score, activeWeights };
}
