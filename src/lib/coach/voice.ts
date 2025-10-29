/**
 * DEPRECATED: Legacy Coaching System
 *
 * ⚠️ This file contains the OLD decision-tree based coaching logic.
 *
 * New implementations should use the Live Coaching System instead:
 * - src/lib/coach/liveCoaching.ts - Real-time rep-by-rep guidance
 * - src/components/coach/LiveCoachingCue.tsx - Animated live cues
 * - src/components/coach/SetSummaryCard.tsx - End-of-set feedback
 *
 * Migration Plan:
 * - Phase 1 (Current): Both systems exist side-by-side
 * - Phase 2: A/B test old vs new coaching with users
 * - Phase 3: Migrate all users to new live coaching system
 * - Phase 4: Remove this file completely
 *
 * See docs/LIVE_COACHING_SYSTEM.md for details on the new system.
 *
 * @deprecated Use src/lib/coach/liveCoaching.ts instead
 * @module lib/coach/voice (LEGACY)
 */

import type {
  CoachMessage,
  NextSetPlan,
  CoachOutput,
  CoachPersona,
  CoachCue,
  UserCoachProfile,
  OutcomeSignal,
  CoachCta,
  CoachOfferType,
} from '../../types';

export type SetContext = {
  exerciseName: string;
  setNumber: number;
  readinessNow: number;
  readinessChangePct: number;
  symmetryNow?: number;
  lastQualityFlagRep?: number;
  rpe?: number;
  rir?: number;
  targetRestSec?: number;
  actualRestSec?: number;
  setVolume: { reps: number; loadKg?: number };
  historicalTrend?: 'up' | 'flat' | 'down';
  isLastSetOfExercise?: boolean;
  setsRemaining?: number;
  sessionStage?: 'warmup' | 'main' | 'finisher';
  lowReadinessFloor?: number;
  severeDropPct?: number;
  cumulativeDropPct?: number;
  cumulativeChangePct?: number;
  trainingGoal?: string;
  targetRIR?: number;
  expectedFatigueRepRange?: [number, number];
  acceptableDropPct?: { okUpTo?: number; cautionFrom?: number };
  fatigueFlag?: boolean;
};

export type FatigueJudgment = 'productive' | 'neutral' | 'protect';

const PERSONAS: CoachPersona[] = ['calm', 'direct', 'playful'];
const CUES: CoachCue[] = ['brace', 'path', 'tempo', 'breath', 'symmetry'];

const CoachConfig = {
  thresholds: {
    readiness: { high: 85, low: 65 },
    balance: { strong: 75, moderate: 85 },
  },
  restBumps: {
    recovery: [30, 60] as const,
    foundation: [15, 30] as const,
    efficiency: 15,
  },
  maxChars: 140,
};

const OfferOutcomes: Record<CoachOfferType, string> = {
  recovery: 'Protect your progress',
  efficiency: 'Unlock more power',
  progress: "It’s time to get stronger",
  foundation: 'Consistency is the key',
};

type CoachInputs = {
  readiness: number;
  readinessChange: number;
  fatigueFlag: boolean;
  symmetryPct: number;
  rorTrend: 'up' | 'flat' | 'down';
  restTargetSec: number;
  rir: number | null;
  isWarmup: boolean;
  isFirstSet: boolean;
  suppressProgress: boolean;
};

type OfferBuildResult = {
  message: CoachMessage;
  plan: NextSetPlan;
  judgement: FatigueJudgment;
  ctas: CoachCta[];
  timerSubLabel: string | null;
  offer: CoachOfferType;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const averageTuple = (range: readonly [number, number]): number =>
  Math.round((range[0] + range[1]) / 2);

const clampRest = (value: number): number => clamp(Math.round(value / 5) * 5, 45, 180);

const clampLine = (text: string, limit: number): string => {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  const breakpoints = ['. ', '; ', ', ', '—', '-', ' '];
  for (const breakpoint of breakpoints) {
    const idx = slice.lastIndexOf(breakpoint);
    if (idx > 0 && idx > limit - 35) {
      return `${slice.slice(0, idx).trimEnd()}…`;
    }
  }
  return `${slice.trimEnd()}…`;
};

const sanitizeReadiness = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return clamp(Math.round(value), 0, 100);
};

const sanitizeChange = (value: number | undefined): number =>
  Number.isFinite(value) ? Math.round(value as number) : 0;

const selectPersona = (profile: UserCoachProfile, fallback: CoachPersona): CoachPersona => {
  const epsilon = profile.explorationRate ?? 0.1;
  if (Math.random() < epsilon) {
    return PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
  }
  return profile.preferredPersona ?? fallback;
};

const selectCue = (profile: UserCoachProfile, defaultCue: CoachCue): CoachCue => {
  const epsilon = profile.explorationRate ?? 0.1;
  if (Math.random() < epsilon) {
    return CUES[Math.floor(Math.random() * CUES.length)];
  }
  return profile.preferredCue ?? defaultCue;
};

const determineDefaultCue = (plan: NextSetPlan['kind']): CoachCue => {
  switch (plan) {
    case 'drop5':
    case 'drop10':
      return 'brace';
    case 'cap1':
      return 'path';
    case 'rest60':
      return 'breath';
    case 'technique':
      return 'path';
    case 'tempo212':
      return 'tempo';
    case 'hold':
    case 'add12':
    default:
      return 'brace';
  }
};

const deriveInputs = (ctx: SetContext): CoachInputs => {
  const readiness = sanitizeReadiness(ctx.readinessNow);
  const readinessChange = sanitizeChange(ctx.readinessChangePct);
  const restTargetSec = clampRest(
    Number.isFinite(ctx.targetRestSec) && (ctx.targetRestSec ?? 0) > 0
      ? (ctx.targetRestSec as number)
      : 90,
  );
  const symmetryPct = clamp(Math.round(ctx.symmetryNow ?? 100), 0, 100);
  const rorTrend = ctx.historicalTrend ?? 'flat';
  const isWarmup = ctx.sessionStage === 'warmup';
  const isFirstSet = ctx.setNumber <= 1;

  return {
    readiness,
    readinessChange,
    fatigueFlag: Boolean(ctx.fatigueFlag),
    symmetryPct,
    rorTrend,
    restTargetSec,
    rir: ctx.rir ?? null,
    isWarmup,
    isFirstSet,
    suppressProgress: isFirstSet && !isWarmup,
  };
};

const pickOfferType = (inputs: CoachInputs): CoachOfferType => {
  if (inputs.isWarmup) {
    return 'foundation';
  }
  if (inputs.fatigueFlag || inputs.readiness < CoachConfig.thresholds.readiness.low) {
    return 'recovery';
  }
  if (inputs.symmetryPct < CoachConfig.thresholds.balance.moderate) {
    return 'efficiency';
  }
  const highReadiness = inputs.readiness >= CoachConfig.thresholds.readiness.high;
  if (
    !inputs.suppressProgress &&
    highReadiness &&
    inputs.rorTrend !== 'down' &&
    !inputs.fatigueFlag
  ) {
    return 'progress';
  }
  return 'foundation';
};

function pickPersuasiveProof(inputs: CoachInputs): string {
  if (inputs.fatigueFlag || inputs.readiness < CoachConfig.thresholds.readiness.low) {
    return 'fatigue is a signal to recover smart';
  }
  if (inputs.symmetryPct < CoachConfig.thresholds.balance.moderate) {
    return `balance is ${inputs.symmetryPct}%, let's fix this power leak`;
  }
  if (
    inputs.readiness >= CoachConfig.thresholds.readiness.high &&
    inputs.rorTrend !== 'down' &&
    !inputs.fatigueFlag
  ) {
    return 'all signals are green';
  }
  if (inputs.rorTrend === 'down') {
    return 'your trend is starting to fade';
  }
  return 'your trend is steady and strong';
}

const createPlan = (kind: NextSetPlan['kind'], params?: Record<string, any>): NextSetPlan => {
  if (params && Object.keys(params).length > 0) {
    return { kind, params };
  }
  return { kind };
};

const buildOfferContent = (inputs: CoachInputs, offer: CoachOfferType): OfferBuildResult => {
  const restTarget = inputs.restTargetSec;
  const result: OfferBuildResult = {
    message: { primary: '', secondary: '', planLine: '', feelTarget: '', variations: [] },
    plan: { kind: 'hold' },
    judgement: 'neutral',
    ctas: [],
    timerSubLabel: null,
    offer,
  };

  switch (offer) {
    case 'recovery': {
      const bump = averageTuple(CoachConfig.restBumps.recovery);
      const restSec = clampRest(restTarget + bump);
      const restDelta = restSec - restTarget;
      const useCap = inputs.rir != null && inputs.rir <= 1;
      const actionPlan = useCap
        ? `Cap one rep and rest ${restSec}s`
        : `Ease the load about 5% and rest ${restSec}s`;
      const variations = [
        clampLine(
          `Fatigue crashed the party before the money reps—tomorrow's legs would riot. ${actionPlan} so you reload instead of limping into the day.`,
          CoachConfig.maxChars,
        ),
        clampLine(
          `Your speed tailed off early, which screams recovery debt. ${actionPlan} and roll into the next set with pop.`,
          CoachConfig.maxChars,
        ),
        clampLine(
          `Energy dipped faster than planned, so this load is grind not growth. ${actionPlan} to let the muscle rebuild instead of digging deeper.`,
          CoachConfig.maxChars,
        ),
      ];
      const params: Record<string, any> = {};
      if (restDelta !== 0) params.restBumpSec = restDelta;

      result.message = {
        primary: variations[0],
        secondary: '',
        planLine: '',
        feelTarget: '',
        variations,
      };
      result.plan = createPlan(useCap ? 'cap1' : 'drop5', params);
      result.judgement = 'protect';
      result.timerSubLabel = 'Lock in gains';
      result.ctas = [
        {
          id: useCap ? 'cap_reps_and_rest' : 'drop_5_and_rest',
          label: useCap ? 'Lock in Gains (Cap Reps)' : 'Lock in Gains (Drop 5%)',
          action: 'resume',
          emphasis: 'primary',
        },
        {
          id: 'continue_anyway',
          label: 'Continue anyway',
          action: 'resume_override',
          emphasis: 'secondary',
        },
        {
          id: 'end_after_next',
          label: 'End After This Set',
          action: 'end_session',
          emphasis: 'secondary',
        },
      ];
      break;
    }
    case 'efficiency': {
      const restSec = clampRest(restTarget + CoachConfig.restBumps.efficiency);
      const restDelta = restSec - restTarget;
      const severe = inputs.symmetryPct < CoachConfig.thresholds.balance.strong;
      const repCue = severe ? 'Trim one rep' : 'Keep the reps steady';
      const variations = [
        clampLine(
          `Symmetry dipped to ${inputs.symmetryPct}%—one leg is freeloading. ${repCue}, slow the tempo, and rest ${restSec}s so both sides reload evenly.`,
          CoachConfig.maxChars,
        ),
        clampLine(
          `Left-right power split is off, leaking force you could use for PRs. ${repCue}, dial in the groove, and use ${restSec}s of rest to let both sides catch up.`,
          CoachConfig.maxChars,
        ),
        clampLine(
          `Uneven work now turns into cranky knees later. ${repCue} and take ${restSec}s so joints stay happy while strength climbs evenly.`,
          CoachConfig.maxChars,
        ),
      ];
      const params: Record<string, any> = {};
      if (restDelta !== 0) params.restBumpSec = restDelta;
      if (severe) params.repDelta = -1;

      result.message = {
        primary: variations[0],
        secondary: '',
        planLine: '',
        feelTarget: '',
        variations,
      };
      result.plan = createPlan('tempo212', params);
      result.judgement = 'neutral';
      result.timerSubLabel = 'Fix power leaks';
      result.ctas = [
        {
          id: 'control_tempo_and_rest',
          label: 'Fix Form & Continue',
          action: 'resume',
          emphasis: 'primary',
        },
      ];
      break;
    }
    case 'progress': {
      const restSec = clampRest(restTarget);
      const restDelta = restSec - restTarget;
      const variations = [
        clampLine(
          `You breezed past the fatigue window—readiness is still screaming green. Add one or two reps next set and keep rest at ${restSec}s to turn that headroom into strength.`,
          CoachConfig.maxChars,
        ),
        clampLine(
          `Gas tank is still full and recovery's untouched. Chase an extra rep and stick with ${restSec}s so the muscle actually upgrades.`,
          CoachConfig.maxChars,
        ),
        clampLine(
          `No fatigue yet means the stimulus is undersized. Nudge the volume up by a rep and hold ${restSec}s of rest to stack gains without burnout.`,
          CoachConfig.maxChars,
        ),
      ];
      const params: Record<string, any> = {};
      if (restDelta !== 0) params.restBumpSec = restDelta;

      result.message = {
        primary: variations[0],
        secondary: '',
        planLine: '',
        feelTarget: '',
        variations,
      };
      result.plan = createPlan('add12', params);
      result.judgement = 'productive';
      result.timerSubLabel = 'Chase the window';
      result.ctas = [
        {
          id: 'start_next_set',
          label: 'Add 1 Rep & Go',
          action: 'resume',
          emphasis: 'primary',
        },
      ];
      break;
    }
    case 'foundation':
    default: {
      const isWarmup = inputs.isWarmup;
      const bump = averageTuple(CoachConfig.restBumps.foundation);
      const preferredRest = isWarmup ? Math.max(restTarget, 60) : restTarget + bump;
      const restSec = clampRest(preferredRest);
      const restDelta = restSec - restTarget;
      const variations = isWarmup
        ? [
            clampLine(
              `Warm-up looked smooth—your nervous system is clocking in on time. Match the reps after ${restSec}s so the heavy work feels light.`,
              CoachConfig.maxChars,
            ),
            clampLine(
              `Movement stayed clean, exactly what a priming set should feel like. Keep the load, repeat the reps, and rest ${restSec}s to groove the pattern.`,
              CoachConfig.maxChars,
            ),
            clampLine(
              `Everything felt controlled—that’s the whole point of warm-up. Stay here after ${restSec}s and your first working set will pop.`,
              CoachConfig.maxChars,
            ),
          ]
        : [
            clampLine(
              `That set was solid and repeatable—the ideal foundation builder. Stay at this load, match the reps, and rest ${restSec}s so your body memorizes the pattern.`,
              CoachConfig.maxChars,
            ),
            clampLine(
              `Good work with plenty of control—hello free strength. Repeat the same plan after ${restSec}s to stack adaptation without extra fatigue.`,
              CoachConfig.maxChars,
            ),
            clampLine(
              `Stay right here another set—you’re teaching your muscles to own this load. Take ${restSec}s so the next round stays just as crisp.`,
              CoachConfig.maxChars,
            ),
          ];
      const params: Record<string, any> = {};
      if (restDelta !== 0) params.restBumpSec = restDelta;

      result.message = {
        primary: variations[0],
        secondary: '',
        planLine: '',
        feelTarget: '',
        variations,
      };
      result.plan = createPlan('hold', params);
      result.judgement = 'neutral';
      result.timerSubLabel = isWarmup ? 'Prime the engine' : 'Bank this work';
      result.ctas = [
        {
          id: 'start_next_set',
          label: 'Bank Next Set',
          action: 'resume',
          emphasis: 'primary',
        },
      ];
      break;
    }
  }

  return result;
};

export function judgeFatigue(ctx: SetContext): FatigueJudgment {
  const inputs = deriveInputs(ctx);
  const offer = pickOfferType(inputs);
  switch (offer) {
    case 'recovery':
      return 'protect';
    case 'progress':
      return 'productive';
    default:
      return 'neutral';
  }
}

export function generatePersonalizedFeedback(
  rawCtx: SetContext,
  userProfile: UserCoachProfile,
): CoachOutput {
  const inputs = deriveInputs(rawCtx);
  const offer = pickOfferType(inputs);
  const built = buildOfferContent(inputs, offer);
  const defaultCue = determineDefaultCue(built.plan.kind);
  const persona = selectPersona(userProfile, 'calm');
  const cue = selectCue(userProfile, defaultCue);

  return {
    message: built.message,
    plan: built.plan.kind,
    appliedPlan: built.plan,
    personalization: { persona, cue },
    judgment: built.judgement,
    timerSubLabel: built.timerSubLabel,
    offerType: built.offer,
    ctas: built.ctas,
  };
}

export function computeReward(signal: OutcomeSignal): number {
  let reward = 0;
  if (signal.planFollowed) reward += 1.0;
  if (signal.qualityImproved) reward += 0.8;
  if (signal.readinessRebounded) reward += 0.5;
  if (signal.thumbsUp) reward += 0.5;
  if ((signal.dwellMs ?? 0) > 2500) reward += 0.2;
  return reward;
}
