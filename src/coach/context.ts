import { type StrengthContext, type Gates, type SessionState } from './types';

type ComputeContextRaw = {
  now: Date;
  muscleGroup: string;
  lastSessionStart?: Date;
  lastSessionEnd?: Date;
  lastSameMuscleEnd?: Date;
  minutesSinceLastSetEnd?: number;
  todaySession?: StrengthContext['todaySession'];
  recovery: StrengthContext['recovery'];
  gates: Gates;
  policy?: Partial<
    Pick<
      StrengthContext,
      | 'symmetryIdeal'
      | 'strengthWindowReps'
      | 'fatigueZones'
      | 'targetReadinessMin'
      | 'targetReadinessMax'
      | 'postSessionCooldownHrs'
      | 'fullCooldownHrs'
    >
  >;
  history: Omit<StrengthContext['history'], 'hoursSinceLastSessionEnd' | 'hoursSinceLastSameMuscle'>;
};

export function computeContext(raw: ComputeContextRaw): StrengthContext {
  const defaults = {
    symmetryIdeal: 90,
    strengthWindowReps: [3, 6] as [number, number],
    fatigueZones: { rms: [10, 20, 30] as [number, number, number], ror: [10, 25, 40] as [number, number, number] },
    targetReadinessMin: 70,
    targetReadinessMax: 90,
    postSessionCooldownHrs: 3,
    fullCooldownHrs: 24,
  };
  const policy = { ...defaults, ...(raw.policy ?? {}) };

  const hoursSinceLastSessionEnd =
    raw.lastSessionEnd != null ? (raw.now.getTime() - raw.lastSessionEnd.getTime()) / 36e5 : undefined;
  const hoursSinceLastSameMuscle =
    raw.lastSameMuscleEnd != null ? (raw.now.getTime() - raw.lastSameMuscleEnd.getTime()) / 36e5 : undefined;

  const didExerciseToday =
    raw.lastSessionEnd != null && raw.now.toDateString() === raw.lastSessionEnd.toDateString();
  const justExercised =
    hoursSinceLastSessionEnd != null ? hoursSinceLastSessionEnd < policy.postSessionCooldownHrs : false;
  const inRestWindow = (raw.minutesSinceLastSetEnd ?? Number.POSITIVE_INFINITY) < 5;

  const base: StrengthContext = {
    nowISO: raw.now.toISOString(),
    muscleGroup: raw.muscleGroup,
    todaySession: raw.todaySession,
    history: {
      ...raw.history,
      lastSessionEnd: raw.lastSessionEnd?.toISOString(),
      lastSameMuscleSessionEnd: raw.lastSameMuscleEnd?.toISOString(),
      hoursSinceLastSessionEnd,
      hoursSinceLastSameMuscle,
    },
    recovery: raw.recovery,
    gates: raw.gates,
    symmetryIdeal: policy.symmetryIdeal,
    strengthWindowReps: policy.strengthWindowReps,
    fatigueZones: policy.fatigueZones,
    didExerciseToday,
    justExercised,
    inRestWindow,
    targetReadinessMin: policy.targetReadinessMin,
    targetReadinessMax: policy.targetReadinessMax,
    postSessionCooldownHrs: policy.postSessionCooldownHrs,
    fullCooldownHrs: policy.fullCooldownHrs,
    sessionState: 'PRE_SESSION',
  };

  return { ...base, sessionState: classifyState(base) };
}

function classifyState(context: StrengthContext): SessionState {
  if (context.inRestWindow) return 'POST_SET';

  const hoursSinceLastSessionEnd = context.history.hoursSinceLastSessionEnd ?? Number.POSITIVE_INFINITY;
  const hoursSinceLastSameMuscle = context.history.hoursSinceLastSameMuscle ?? Number.POSITIVE_INFINITY;

  if (
    context.gates.status === 'STOP' &&
    context.didExerciseToday &&
    hoursSinceLastSessionEnd < context.postSessionCooldownHrs
  ) {
    return 'POST_SESSION';
  }

  if (hoursSinceLastSameMuscle < context.fullCooldownHrs) {
    return 'COOLDOWN_24H';
  }

  const symmetrySource =
    context.todaySession?.summaries?.avgSymmetryPct ?? context.history.sym7dAvg ?? Number.POSITIVE_INFINITY;
  const readinessInWindow =
    context.recovery.readiness >= context.targetReadinessMin &&
    context.recovery.readiness <= context.targetReadinessMax;
  const symmetryOK = symmetrySource >= context.symmetryIdeal;

  if (!context.didExerciseToday && readinessInWindow && symmetryOK) {
    return 'READY_NOW';
  }

  if (!context.didExerciseToday && !readinessInWindow) {
    return 'RECOVERING';
  }

  return 'IN_SESSION';
}
