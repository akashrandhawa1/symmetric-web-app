

export type Screen = 
  | "splash" | "intro" | "onboarding" | "connect" | "placement-guide" | "mvc-setup"
  | "testing" | "ready" | "history" | "progress" | "setup" 
  | "result" | "training" | "impact" | "home" | "chat" | "minimal-next";

export interface SensorState {
  status: 'disconnected' | 'connecting' | 'connected';
  device: { name: string } | null;
  server: string | null;
  battery: number | null;
}

export interface SensorStatus {
  left: SensorState;
  right: SensorState;
}

export interface Rep {
  peak: number;
  duration: number;
  id: number;
  quality: string;
  avgIntensity?: number;
  color?: string;
}

export interface IntensityPill {
  state: 'unknown' | 'targetMet' | 'belowTarget';
  color: string;
  text: string;
}

export interface ZoneTimes {
  "Strength Training": number;
  "Hypertrophy": number;
  "Muscular Endurance": number;
  "Active Recovery": number;
}

export interface LoadSuggestion {
  action: 'none' | 'increase_now' | 'push_now' | 'maintain' | 'increase_next_session' | 'add_reps_next_session';
  delta?: string;
  text: string;
}

export type ReasonCode =
  | 'fatigue_high'
  | 'asymmetry_rising'
  | 'rep_speed_drop'
  | 'readiness_low'
  | 'signal_unstable';

export interface StopSuggestion {
  target: 'set' | 'exercise';
  confidence: number;   // 0–1
  reasons: { code: ReasonCode; value?: number; threshold?: number }[];
}

export interface CoachPrefs {
  allowStopSuggestions: boolean;               // default true
  requireDoubleTapEndSet: boolean;            // default false
  vibrateOnSuggestion: boolean;               // default false
  suppressStopsForSession: boolean;           // default false
}

export interface ReadinessPrediction {
  readiness: number;
  currentReadiness: number;
  totalReadinessDrop: number;
  sessionNmTrimp: number;
  normalizedActivation: number;
  reps: Rep[];
  totalReps: Rep[];
  tut: number;
  zoneTimes: ZoneTimes;
  intensityPill: IntensityPill;
  nextSetRestSeconds: number | null;
  nextSetRestMessage: string | null;
  nextOptimalSessionHours: number | null;
  nextSetRecommendation: LoadSuggestion;
  confidence: number;
  uncertainty: number;
  reliability: string;
  fatigueDetected?: boolean;
  fatigueDetectedAtRep?: number | null;
  forceEndSet?: boolean; // Will be deprecated
  stopSuggestion?: StopSuggestion | null;
  restAdjustmentSeconds?: number;
  nextSetWeightAdjustment?: number;
  weightAdjustmentMessage?: string;
  nextSetRepCap?: number | null;
  nextSetTempo?: string | null;
  nextSetTechniqueFocus?: 'technique' | null;
  coachPlan?: NextSetPlan;
}

export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface SessionHistoryEntry {
  date: FirebaseTimestamp | Date;
  pre: number;
  post: number;
  reps: Rep[];
  totalReps: Rep[];
  durationSec: number;
  workload: number;
  effectReps: number;
  effectRepRate: number;
  sessionEfficacy: number;
  balanceScore: number;
}

export interface TrendPoint {
  date: FirebaseTimestamp | Date;
  readiness: number;
}

export interface RawPeakHistoryEntry {
  date: FirebaseTimestamp | Date;
  maxPeak: number;
  leftPeak: number;
  rightPeak: number;
}

export interface HistoricalData {
  sessionsHistory?: SessionHistoryEntry[];
  trendPoints?: TrendPoint[];
  rawPeakHistory?: RawPeakHistoryEntry[];
  mvcBaseline?: number;
  realTests?: number;
}

export interface AppState {
  screen: Screen;
  sessionSummary: any;
  userProfile?: {
    name: string;
    age: number;
    weight: number;
    height: number;
  } | null;
}

export interface CompletedSet {
  reps: number;
  tut: number;
  avgPeak: number;
  volume?: number;
  fatigueAtRep?: number | null;
  status?: 'completed' | 'skipped';
  fatigueLimited?: boolean;
}

export interface RecoveryTask {
  id: number;
  text: string;
  benefit: string; // e.g., "-2h"
  completed: boolean;
}

export interface ChatMessage {
  id: number;
  sender: 'user' | 'coach';
  text: string;
}

export type CoachContextState = 'postWorkout' | 'cooldown' | 'midRecovery' | 'preSession' | 'idle';

export interface CoachData {
    recoveryScore: number | null;
    strengthTrendWoW: number | null;
    nextOptimalDatetime: Date | null;
    timeToNextOptimalHours: number | null;
    timeSinceLastSessionMinutes: number | null;
    daypartLabel: string | null;
    recentPR: boolean;
    streakDays: number;
    dataSyncOK: boolean;
    context: CoachContextState;
    userProfile?: CoachUserProfile | null;
    latestSessionSummary?: {
        readinessStart: number | null;
        readinessEnd: number | null;
        readinessDrop: number | null;
        durationMinutes: number | null;
        totalSets?: number | null;
        primaryExercises?: string[];
    } | null;
    upcomingPlanSummary?: {
        intent?: string | null;
        readinessStart?: number | null;
        readinessEnd?: number | null;
        projectedDrop?: number | null;
        totalSets?: number | null;
        primaryExercises?: string[];
        mobilitySuggestion?: string | null;
    } | null;
}

export interface CoachUserProfile {
    name: string;
    age: number;
    weight: number;
    height: number;
}

export interface CoachHomeFeedback {
  hero: {
    recoveryScore: number | null;
    scheduleLine: string | null;
    trendText: string;
    trendHasData: boolean;
  };
  coach: {
    line1: string;
    line2: string;
    isTyping: boolean;
  };
  cta: {
    text: string;
    caption?: string;
    action: 'start_strength' | 'start_recovery' | 'plan_session' | 'connect';
  };
  quickReplies: string[];
  dataSyncOK: boolean;
  context: CoachContextState;
}

export type CoachPersona = 'calm' | 'direct' | 'playful';
export type CoachCue = 'brace' | 'path' | 'tempo' | 'breath' | 'symmetry';

export type CoachMessage = {
  primary: string;
  secondary: string;
  planLine: string;
  feelTarget: string;
  variations?: string[];
};

export type CoachOfferType = 'recovery' | 'efficiency' | 'progress' | 'foundation';

export type CoachCtaAction = 'resume' | 'resume_override' | 'end_session';

export type CoachCta = {
  id: string;
  label: string;
  action: CoachCtaAction;
  emphasis: 'primary' | 'secondary';
};

export interface PlannedWorkoutSet {
  id: string;
  exerciseName: string;
  blockLabel: string | null;
  blockIndex: number;
  setIndex: number;
  totalSets: number;
  reps: string | null;
  tempo: string | null;
  restSeconds: number | null;
  loadAdjustment: 'increase' | 'hold' | 'decrease' | 'n/a' | string | null;
}

export type NextSetPlan = {
  kind: 'drop5' | 'drop10' | 'cap1' | 'rest60' | 'add12' | 'technique' | 'tempo212' | 'hold';
  params?: Record<string, any>;
  rationale?: string;
};

export type CoachOutput = {
  judgment: 'productive' | 'neutral' | 'protect';
  message: CoachMessage;
  plan: NextSetPlan['kind'];
  appliedPlan: NextSetPlan;
  personalization?: { persona: CoachPersona; cue: CoachCue };
  timerSubLabel?: string | null;
  offerType: CoachOfferType;
  ctas: CoachCta[];
};

export type UserCoachProfile = {
  userId: string;
  preferredPersona?: CoachPersona;
  preferredCue?: CoachCue;
  explorationRate?: number;
};

export type CTAKind = NextSetPlan['kind'];

export type ScenarioBucket =
  | 'low_readiness'
  | 'cumulative_fatigue'
  | 'symmetry'
  | 'small_drop'
  | 'big_drop'
  | 'push'
  | 'quality_flag'
  | 'rest_short'
  | 'default';

export type TrainingGoal = 'max_strength' | 'hypertrophy' | 'power' | 'technique' | 'endurance';

export type OutcomeSignal = {
  userId: string;
  scenario: ScenarioBucket;
  variant: { persona: CoachPersona; cue: CoachCue; cta: CTAKind };
  planFollowed?: boolean;
  qualityImproved?: boolean;
  readinessRebounded?: boolean;
  thumbsUp?: boolean;
  dwellMs?: number;
};

export type CoachIntent =
  | 'when_to_train'
  | 'recovery_action'
  | 'session_focus'
  | 'rest_interval'
  | 'trend_explanation'
  | 'post_session_analysis'
  | 'plan_next'
  | 'strength_improvement';
