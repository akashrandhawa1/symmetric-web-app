import type { WhatIfQualPayload } from './types.whatif';
export type PlanMode = 'TRAIN' | 'ACTIVE_RECOVERY' | 'FULL_REST';

export type SessionState =
  | 'READY_NOW'
  | 'POST_SESSION'
  | 'COOLDOWN_24H'
  | 'RECOVERING'
  | 'PRE_SESSION'
  | 'IN_SESSION'
  | 'POST_SET'
  | 'IDLE'
  | string;

export type Gates = { status: 'GO' | 'CAUTION' | 'STOP'; reason: string };

export type SessionLog = {
  startedAt: string;
  endedAt?: string;
  exerciseBlocks: Array<{
    name: string;
    side?: 'L' | 'R';
    sets: Array<{
      setIndex: number;
      reps: number;
      repBars?: number[];
      emg?: { rms?: number[]; ror?: number[]; symmetryPct?: number[] };
      peakRMS?: number;
      peakRoR?: number;
      rpe?: number;
      restSec?: number;
      flags?: ('failed' | 'cut_early' | 'form_decline')[];
    }>;
  }>;
  summaries?: {
    bestSetRMS?: number;
    bestSetRoR?: number;
    avgSymmetryPct?: number;
    fatigue?: { rmsDropPct: number; rorDropPct: number };
    totalSets?: number;
    totalReps?: number;
  };
};

export type HistoryAgg = {
  mvcRMSBaseline?: number;
  bestRoRBaseline?: number;
  weeklyStrengthSetsDone: number;
  weeklyStrengthTarget: number;
  lastSessionEnd?: string;
  lastSameMuscleSessionEnd?: string;
  hoursSinceLastSessionEnd?: number;
  hoursSinceLastSameMuscle?: number;
  sym7dAvg?: number;
};

export type RecoveryState = {
  readiness: number;
  readinessSlopePerHr?: number;
  soreness?: number;
  sleepHrs?: number;
  hrWarning?: boolean;
};

export type StrengthContext = {
  nowISO: string;
  muscleGroup: string;
  todaySession?: SessionLog;
  history: HistoryAgg;
  recovery: RecoveryState;
  gates: Gates;
  symmetryIdeal: number;
  strengthWindowReps: [number, number];
  fatigueZones: { rms: [number, number, number]; ror: [number, number, number] };
  didExerciseToday: boolean;
  justExercised: boolean;
  inRestWindow: boolean;
  targetReadinessMin: number;
  targetReadinessMax: number;
  postSessionCooldownHrs: number;
  fullCooldownHrs: number;
  sessionState: SessionState;
};

export type StrengthPlan = {
  mode: PlanMode;
  reasonCodes: string[];
  primaryActions: string[];
  guardrails: string[];
  nextCheck: string;
  projections?: {
    trainBlock?: { strengthGainPct: number; readinessDelta: number; expectedSets: number };
    activeRecovery30m?: { readinessDelta: number; sorenessDelta?: number };
    fullRestTonight?: { readinessDelta: number };
  };
  confidence?: number;
};

export type DecisionOption = {
  id: PlanMode;
  strength_gain_pct: number;
  readiness_delta: number;
  hours_to_recover: number;
  utility: number;
};

export type DecisionTrace = {
  options: DecisionOption[];
  chosenId: PlanMode;
  reasonCodes: string[];
};

export type CoachSummary = {
  message: string;
  cta: string;
  secondary?: string;
  what_if?: WhatIfQualPayload | null;
};

export type StrengthPlanResult = {
  plan: StrengthPlan;
  trace: DecisionTrace;
};

export type NarratorInput = {
  plan: StrengthPlan;
  receipts: {
    readiness: number;
    fatigue: { rms?: number; ror?: number };
    symmetry?: number;
    sinceSameMuscleHrs?: number;
    roiLine?: string;
  };
  decisionTrace: DecisionTrace;
};

// ============================================================================
// HOME COACH (LLM-First + App-Verified) TYPES
// ============================================================================

export type CoachMode = "TRAIN" | "ACTIVE_RECOVERY" | "FULL_REST";

export type FatigueZone = "GREEN" | "YELLOW" | "ORANGE" | "RED";

export type ReadinessBand = "HIGH" | "MID" | "LOW";

/**
 * Context payload for LLM tool: get_context()
 */
export type ContextPayload = {
  nowISO: string;
  sessionState: SessionState;
  readiness_local: number;
  symmetryPct: number | null;
  fatigue: {
    rmsDropPct: number | null;
    rorDropPct: number | null;
  };
  hoursSinceLastSameMuscle: number | null;
  weekly: {
    done: number;
    target: number;
  };
  flags: {
    hrWarning: boolean;
    sorenessHigh: boolean;
  };
  lastEndZone: FatigueZone | null;
  policy: {
    strengthWindowReps: [number, number];
    symmetryIdeal: number;
    fatigueZones: {
      rms: [number, number, number];
      ror: [number, number, number];
    };
  };
  allowed_actions: (ActionId | string)[];
};

export type ActionId = "start_strength_block" | "start_recovery_30m" | "plan_tomorrow";

/**
 * Projection for LLM tool: project_action()
 */
export type Projection = {
  action_id: ActionId;
  effects: {
    strength_gain_pct: number | null;
    readiness_delta_pts: number | null;
    recovery_hours: number | null;
  };
  summary: string;
};

/**
 * Verification result from LLM tool: verify_plan()
 */
export type VerifyResult = {
  ok: boolean;
  safe_mode: CoachMode;
  reason?: string;
};

/**
 * LLM output: Suggestion
 */
export type SuggestionJSON = {
  type: "suggestion";
  mode: CoachMode;
  message: string;
  cta: string;
  secondary?: string;
  what_if?: WhatIfQualPayload | null;
};

/**
 * LLM output: Question (clarification needed)
 */
export type QuestionJSON = {
  type: "question";
  message: string;
};

/**
 * Combined LLM response type
 */
export type CoachJSON = SuggestionJSON | QuestionJSON;

/**
 * Function calling tool definition
 */
export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type ToolResponse = {
  name: string;
  content: unknown;
};
