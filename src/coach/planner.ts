import {
  type StrengthContext,
  type StrengthPlan,
  type DecisionOption,
  type DecisionTrace,
  type PlanMode,
  type StrengthPlanResult,
} from './types';

export function decideStrengthPlan(context: StrengthContext): StrengthPlanResult {
  const severeFatigue = hasSevereFatigue(context);
  const inReadinessBand =
    context.recovery.readiness >= context.targetReadinessMin &&
    context.recovery.readiness <= context.targetReadinessMax;
  const symmetryNow =
    context.todaySession?.summaries?.avgSymmetryPct ?? context.history.sym7dAvg ?? Number.POSITIVE_INFINITY;
  const symmetryOK = symmetryNow >= context.symmetryIdeal;
  const within24hSameMuscle = (context.history.hoursSinceLastSameMuscle ?? Number.POSITIVE_INFINITY) < context.fullCooldownHrs;
  const weeklyRoom = context.history.weeklyStrengthSetsDone < context.history.weeklyStrengthTarget;

  const trainGain = inReadinessBand && symmetryOK ? 1.6 : 0.8;
  const trainCost = severeFatigue ? 9 : within24hSameMuscle ? 6 : 4;
  const trainRecoveryHrs = within24hSameMuscle ? 30 : 20;

  const activeRecoveryGain = within24hSameMuscle ? 0.4 : 0.2;
  const activeRecoveryDelta = within24hSameMuscle ? 4 : 2;
  const activeRecoveryHrs = within24hSameMuscle ? 5 : 6;

  const restGain = 0;
  const readinessSlope = context.recovery.readinessSlopePerHr ?? 0;
  const restDelta = Math.max(2, Math.min(5, 3.5 + readinessSlope / 3));
  const restRecoveryHrs = 12;

  const options: DecisionOption[] = [
    {
      id: 'TRAIN',
      strength_gain_pct: trainGain,
      readiness_delta: -trainCost,
      hours_to_recover: trainRecoveryHrs,
      utility: score(trainGain, -trainCost, trainRecoveryHrs),
    },
    {
      id: 'ACTIVE_RECOVERY',
      strength_gain_pct: activeRecoveryGain,
      readiness_delta: activeRecoveryDelta,
      hours_to_recover: activeRecoveryHrs,
      utility: score(activeRecoveryGain, activeRecoveryDelta, activeRecoveryHrs),
    },
    {
      id: 'FULL_REST',
      strength_gain_pct: restGain,
      readiness_delta: restDelta,
      hours_to_recover: restRecoveryHrs,
      utility: score(restGain, restDelta, restRecoveryHrs),
    },
  ].filter((option) => {
    if (severeFatigue) {
      return option.id === 'FULL_REST';
    }
    if (context.recovery.hrWarning) {
      return option.id !== 'TRAIN';
    }
    if (!weeklyRoom) {
      return option.id !== 'TRAIN';
    }
    return true;
  });

  const ranked = [...options].sort((a, b) => b.utility - a.utility);
  const chosenOption = ranked[0];
  const reasonCodes = deriveReasonCodes(chosenOption.id, {
    inReadinessBand,
    symmetryOK,
    weeklyRoom,
    severeFatigue,
    within24hSameMuscle,
    readiness: context.recovery.readiness,
  });

  const plan = buildPlan(chosenOption.id, context, chosenOption, reasonCodes);
  const trace: DecisionTrace = {
    options: ranked,
    chosenId: chosenOption.id,
    reasonCodes: reasonCodes.filter(Boolean),
  };

  return { plan, trace };
}

function hasSevereFatigue(context: StrengthContext): boolean {
  const fatigue = context.todaySession?.summaries?.fatigue;
  if (!fatigue) return false;
  const rmsHigh = fatigue.rmsDropPct > context.fatigueZones.rms[2];
  const rorHigh = fatigue.rorDropPct > context.fatigueZones.ror[2];
  return rmsHigh || rorHigh;
}

function score(gainPct: number, readinessDelta: number, hoursToRecover: number): number {
  const weightGain = 2.0;
  const weightReadiness = 0.3;
  const weightTime = 0.02;
  return weightGain * gainPct + weightReadiness * readinessDelta - weightTime * hoursToRecover;
}

type ReasonInputs = {
  inReadinessBand: boolean;
  symmetryOK: boolean;
  weeklyRoom: boolean;
  severeFatigue: boolean;
  within24hSameMuscle: boolean;
  readiness: number;
};

function deriveReasonCodes(mode: PlanMode, inputs: ReasonInputs): string[] {
  const reasons: string[] = [];
  if (mode === 'TRAIN') {
    if (inputs.inReadinessBand) reasons.push('IN_WINDOW');
    reasons.push(inputs.symmetryOK ? 'SYMMETRY_OK' : 'SYMMETRY_BORDERLINE');
    reasons.push(inputs.weeklyRoom ? 'WEEKLY_VOLUME_UNDER' : 'WEEKLY_VOLUME_MET');
  }
  if (mode === 'ACTIVE_RECOVERY') {
    if (!inputs.inReadinessBand) reasons.push('READINESS_OUT_OF_WINDOW');
    if (inputs.within24hSameMuscle) reasons.push('COOLDOWN_24H');
    if (!inputs.symmetryOK) reasons.push('SYMMETRY_LOW');
  }
  if (mode === 'FULL_REST') {
    if (inputs.severeFatigue) reasons.push('SEVERE_FATIGUE');
    if (!inputs.weeklyRoom) reasons.push('WEEKLY_VOLUME_MET');
    if (inputs.readiness < 55) reasons.push('LOW_READINESS');
  }
  return reasons.filter(Boolean);
}

function buildPlan(mode: PlanMode, context: StrengthContext, option: DecisionOption, reasonCodes: string[]): StrengthPlan {
  if (mode === 'FULL_REST') {
    return {
      mode,
      reasonCodes,
      primaryActions: ['No strength today', '8+ hrs sleep', 'Protein each meal', '10–20 min easy walk'],
      guardrails: ['Avoid heavy eccentrics or max effort work'],
      nextCheck: 'Tomorrow morning',
      projections: {
        fullRestTonight: { readinessDelta: option.readiness_delta },
      },
      confidence: estimateConfidence(context, mode),
    };
  }

  if (mode === 'ACTIVE_RECOVERY') {
    return {
      mode,
      reasonCodes,
      primaryActions: [
        '20–30 min zone-2 or brisk walk',
        'Mobility for target joint',
        '2×10 easy isos/tempo',
      ],
      guardrails: ['No grinding sets', 'Stop if effort spikes without power'],
      nextCheck: 'Recheck this evening',
      projections: {
        activeRecovery30m: { readinessDelta: option.readiness_delta },
      },
      confidence: estimateConfidence(context, mode),
    };
  }

  const remainingSets = Math.max(0, context.history.weeklyStrengthTarget - context.history.weeklyStrengthSetsDone);
  const expectedSets = Math.min(2, remainingSets) || 1;

  return {
    mode,
    reasonCodes,
    primaryActions: [
      `Do ${expectedSets} hard ${context.strengthWindowReps[0]}–${context.strengthWindowReps[1]}-rep set(s)`,
      'Add +1–2 reps only if RoR holds and RMS drop <10%',
    ],
    guardrails: ['End if RoR drop >25% or symmetry <90%'],
    nextCheck: 'After each set (rest screen)',
    projections: {
      trainBlock: {
        strengthGainPct: option.strength_gain_pct,
        readinessDelta: option.readiness_delta,
        expectedSets,
      },
    },
    confidence: estimateConfidence(context, mode),
  };
}

function estimateConfidence(context: StrengthContext, mode: PlanMode): number {
  let confidence = 0.7;
  if (!context.todaySession?.summaries?.fatigue) {
    confidence -= 0.1;
  }
  if ((context.history.hoursSinceLastSameMuscle ?? Number.POSITIVE_INFINITY) < context.fullCooldownHrs && mode === 'TRAIN') {
    confidence -= 0.2;
  }
  if (context.recovery.readiness < 55 && mode === 'TRAIN') {
    confidence -= 0.3;
  }
  return Math.max(0.2, Math.min(0.95, confidence));
}
