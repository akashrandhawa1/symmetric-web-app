/**
 * Exercise threshold utilities for readiness drop mapping.
 */

export type MovementClass = 'single_joint_stable' | 'multi_joint_free';
export type LoadBucket = 'light' | 'moderate' | 'heavy';

export type Thresholds = {
  /**
   * Inclusive range (fraction) representing the productive window.
   */
  green: [number, number];
  /**
   * Range between green upper bound and red threshold (exclusive).
   */
  yellow: [number, number];
  /**
   * Drop percentages above this value are considered excessive.
   */
  red: number;
};

export type ExerciseProfile = {
  id: string;
  movement: MovementClass;
  customThresholds?: Partial<Record<LoadBucket, Thresholds>>;
};

export const EXERCISE_LIBRARY: Record<string, ExerciseProfile> = {
  back_squat: { id: 'back_squat', movement: 'multi_joint_free' },
  split_squat: { id: 'split_squat', movement: 'multi_joint_free' },
  knee_extension: { id: 'knee_extension', movement: 'single_joint_stable' },
};

export const DEFAULT_THRESHOLDS: Record<MovementClass, Record<LoadBucket, Thresholds>> = {
  single_joint_stable: {
    heavy:   { green: [0.08, 0.15], yellow: [0.15, 0.25], red: 0.25 },
    moderate:{ green: [0.10, 0.20], yellow: [0.20, 0.30], red: 0.30 },
    light:   { green: [0.12, 0.25], yellow: [0.25, 0.35], red: 0.35 },
  },
  multi_joint_free: {
    heavy:   { green: [0.10, 0.18], yellow: [0.18, 0.28], red: 0.28 },
    moderate:{ green: [0.12, 0.22], yellow: [0.22, 0.32], red: 0.32 },
    light:   { green: [0.15, 0.28], yellow: [0.28, 0.38], red: 0.38 },
  },
};

export function bucketLoad(loadPct?: number): LoadBucket {
  if (loadPct === undefined || Number.isNaN(loadPct)) return 'moderate';
  if (loadPct >= 0.80) return 'heavy';
  if (loadPct >= 0.60) return 'moderate';
  return 'light';
}

export function pickExerciseProfile(exerciseId?: string): ExerciseProfile {
  if (exerciseId && EXERCISE_LIBRARY[exerciseId]) return EXERCISE_LIBRARY[exerciseId];
  return { id: exerciseId ?? 'unknown', movement: 'multi_joint_free' };
}

export function pickThresholds(exerciseId?: string, loadPct?: number): Thresholds {
  const profile = pickExerciseProfile(exerciseId);
  const bucket = bucketLoad(loadPct);
  const base = DEFAULT_THRESHOLDS[profile.movement][bucket];
  const custom = profile.customThresholds?.[bucket];
  return custom ?? base;
}

export type Zone = 'green' | 'yellow' | 'red';

export function mapDropToZone(dropPct: number, th: Thresholds): Zone {
  if (dropPct <= th.green[1]) {
    return 'green';
  }
  if (dropPct <= th.yellow[1]) {
    return 'yellow';
  }
  return 'red';
}

export function zoneToScore(zone: Zone): number {
  if (zone === 'green') return 82;
  if (zone === 'yellow') return 62;
  return 37;
}
