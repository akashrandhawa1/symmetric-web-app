import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Wifi, Sparkles, Activity, BarChart3 } from 'lucide-react';
import { NudgeModal } from '../components';
import { useHomeCoach } from '../coach/useHomeCoach';
import { useRecovery } from '../hooks/useRecovery';
import { fetchDailyWorkoutPlan, defaultWorkoutPlan, type WorkoutPlan } from '../services';
import PremiumPlanView from '../components/plan/PremiumPlanView';
import { PlanInlineSkeleton } from '../components/plan/PlanInlineSkeleton';
import { convertWorkoutPlanToPlanProps } from '../lib/plan/convertWorkoutPlan';
import type {
  Profile as RecoveryProfile,
  SessionFeatures as RecoverySession,
  EMG as RecoveryEMG,
  RecoveryEstimate,
} from '../lib/recovery';
import type {
  CoachHomeFeedback,
  CoachUserProfile,
  SensorStatus,
  SessionHistoryEntry,
} from '../types';

// Decision thresholds
const TRAIN_READINESS_THRESHOLD = 80;
const TRAIN_FATIGUE_MAX = 20;
const TRAIN_SYMMETRY_MIN = 85;
const computeHighReadinessNudge = (readiness: number | null): string | null => {
  if (typeof readiness !== 'number' || readiness <= 65) return null;
  if (readiness >= 85) {
    return "What if you add one more crisp set while you're still hot? You can squeeze extra strength without denting recovery.";
  }
  return "What if you nudge in one more focused block? Ride the momentum until you're closer to 50 readiness.";
};

type Decision = 'train' | 'recovery';
type RateOfRecovery = 'down' | 'stable' | 'up';

export type HomeDecisionMetrics = {
  rmsDropPct: number;
  ror: RateOfRecovery;
  symmetryPct: number;
};

export type HomeDecisionState = {
  readiness: number;
  deltaVsLast?: number;
  metrics: HomeDecisionMetrics;
  decision: Decision;
  recommendedLabel: string;
  nextOptimalWindow: string;
  lastSessionSummary: string;
  isLoading: boolean;
};

export interface HomeScreenProps {
  onStartCheck: () => void;
  onStartActiveRecovery?: () => void;
  onNavigateToConnect: () => void;
  onViewHistory: () => void;
  onViewProgress: () => void;
  onOpenCoachChat: () => void;
  sensorStatus: SensorStatus;
  coachFeedback: CoachHomeFeedback | null;
  weeklyTrend: number | null;
  recentSession: SessionHistoryEntry | null;
  timeSinceLastSessionMinutes: number | null;
  isCoachLoading: boolean;
  userProfile: CoachUserProfile | null;
  externalRefreshToken?: number;
  onLogAnalyticsEvent?: (event: string, data?: Record<string, unknown>) => void;
  mockState?: Partial<HomeDecisionState>;
}

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const formatNextOptimalWindow = (scheduleLine: string | null): string => {
  if (!scheduleLine) return 'Syncing next window';
  const [timing] = scheduleLine.split('—');
  if (!timing) return scheduleLine.trim();

  const tokens = timing.split('•').map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) return timing.trim();

  const rawDay = tokens[0] ?? '';
  const rawTime = tokens[1] ?? '';
  const rawApprox = tokens[2] ?? '';

  const dayShort = rawDay ? rawDay.slice(0, 3) : '';
  const timeMatch = rawTime.match(/(\d{1,2})(?::\d{2})?\s*(am|pm)/i);
  const meridiem = timeMatch ? timeMatch[2].toUpperCase() : '';
  const windowLabel = [dayShort, meridiem].filter(Boolean).join(' ').trim() || 'Soon';

  const approxCore = rawApprox.replace(/in\s*/i, '').replace(/\s+/g, ' ').trim();
  const approxFormatted =
    approxCore.length > 0
      ? approxCore.replace(/^~?/, '~').replace(/hours?/gi, 'h')
      : '';

  return approxFormatted ? `${windowLabel} (${approxFormatted})` : windowLabel;
};

const describeDaypart = (date: Date): string | null => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  if (hour >= 22 || hour < 2) return 'late night';
  if (hour >= 2 && hour < 5) return 'early morning';
  return null;
};

const formatUpcomingSessionTarget = (hoursAway: number): string | null => {
  if (!Number.isFinite(hoursAway)) {
    return null;
  }

  const clampedHours = Math.max(0, hoursAway);
  const now = new Date();
  const target = new Date(now.getTime() + clampedHours * 60 * 60 * 1000);

  const todayKey = now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = tomorrow.toDateString();
  const targetKey = target.toDateString();

  let dayPhrase: string;
  if (targetKey === todayKey) {
    dayPhrase = 'later today';
  } else if (targetKey === tomorrowKey) {
    dayPhrase = 'tomorrow';
  } else {
    const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
    dayPhrase = `on ${dayFormatter.format(target)}`;
  }

  const daypart = describeDaypart(target);
  const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  const timeLabel = timeFormatter.format(target).toLowerCase();

  let when: string;
  if (dayPhrase === 'later today') {
    when = daypart ? `later today (${daypart})` : `later today at ${timeLabel}`;
  } else if (dayPhrase === 'tomorrow') {
    when = daypart ? `tomorrow ${daypart}` : `tomorrow at ${timeLabel}`;
  } else {
    when = daypart ? `${dayPhrase} ${daypart}` : `${dayPhrase} at ${timeLabel}`;
  }

  const approxHours = Math.max(1, Math.round(clampedHours));
  return `Plan to train ${when} (~${approxHours}h away)`;
};


const summariseLastSession = (
  session: SessionHistoryEntry | null,
  timeSinceLastSessionMinutes: number | null,
): string => {
  if (!session) return 'No recent session logged';

  const minutes = Math.max(1, Math.round(session.durationSec / 60));
  const workload = Math.round(session.workload);
  const effectReps = session.effectReps;
  const when =
    typeof timeSinceLastSessionMinutes === 'number'
      ? timeSinceLastSessionMinutes <= 24 * 60
        ? 'Yesterday'
        : `${Math.round(timeSinceLastSessionMinutes / (24 * 60))}d ago`
      : 'Recent';

  return `${when} · ${effectReps} effect reps · ${workload} workload`;
};

const deriveMetrics = (
  recentSession: SessionHistoryEntry | null,
  weeklyTrend: number | null,
): HomeDecisionMetrics => {
  const rmsDropPct =
    recentSession?.effectRepRate != null
      ? Math.max(0, Math.round(recentSession.effectRepRate * 100))
      : 18;

  const symmetryPct =
    recentSession?.balanceScore != null ? Math.max(0, Math.round(recentSession.balanceScore)) : 90;

  const ror: RateOfRecovery =
    weeklyTrend == null
      ? 'stable'
      : weeklyTrend > 1
      ? 'up'
      : weeklyTrend < -1
      ? 'down'
      : 'stable';

  return { rmsDropPct, symmetryPct, ror };
};

const clampPercent = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, Math.round(value)));

const deriveRecoveryProfile = (
  userProfile: CoachUserProfile | null,
  recentSession: SessionHistoryEntry | null,
  timeSinceLastSessionMinutes: number | null,
): RecoveryProfile => {
  if (!recentSession) {
    return {
      trainingAgeMonths: 4,
      sessionsPerWeek8w: 1,
      exposuresByPattern: { squat: 6 },
    };
  }

  const age = userProfile?.age ?? null;
  const trainingAgeMonths = clampPercent(
    age != null ? Math.max(6, Math.round(age / 2)) : 18,
    3,
    120,
  );

  const sessionsPerWeek8w = (() => {
    if (timeSinceLastSessionMinutes == null || timeSinceLastSessionMinutes <= 0) return 2;
    const days = timeSinceLastSessionMinutes / (60 * 24);
    if (!Number.isFinite(days) || days <= 0) return 2;
    const freq = 7 / Math.min(days, 7);
    const clamped = Math.min(7, Math.max(0.5, freq));
    return parseFloat(clamped.toFixed(2));
  })();

  const exposures = Math.max(
    1,
    Math.round(trainingAgeMonths * sessionsPerWeek8w * 0.6),
  );

  return {
    trainingAgeMonths,
    sessionsPerWeek8w,
    exposuresByPattern: { squat: exposures },
    relativeSquatBW: null,
  };
};

const deriveRecoverySession = (
  recentSession: SessionHistoryEntry | null,
): RecoverySession => {
  if (!recentSession) {
    return {
      setsTotal: 3,
      repsTotal: 18,
      avgRIR: 2,
      avgRPE: 8,
      novelExercise: false,
      eccentricBias: false,
      tags: [],
    };
  }

  const repsTotal =
    recentSession.totalReps?.length ??
    recentSession.reps?.length ??
    Math.max(1, recentSession.effectReps ?? 0);
  const setsTotal = Math.max(1, Math.round(repsTotal / 6));
  const effectRate = recentSession.effectRepRate ?? null;

  let avgRIR: number | undefined;
  if (effectRate != null) {
    if (effectRate >= 0.75) avgRIR = 1;
    else if (effectRate >= 0.6) avgRIR = 2;
    else if (effectRate >= 0.45) avgRIR = 3;
    else if (effectRate >= 0.3) avgRIR = 4;
    else avgRIR = 5;
  }

  const avgRPE = avgRIR != null ? 10 - avgRIR : undefined;
  const durationMin = recentSession.durationSec
    ? Math.round(recentSession.durationSec / 60)
    : undefined;

  const tags: SessionFeatures['tags'] = [];
  if (repsTotal <= 10) tags.push('heavySingles');
  if (repsTotal >= 60 || (durationMin ?? 0) >= 45) tags.push('hypertrophy');

  return {
    setsTotal,
    repsTotal,
    avgRIR: avgRIR ?? 3,
    avgRPE,
    novelExercise:
      (effectRate != null && effectRate < 0.35) ||
      (recentSession.sessionEfficacy ?? 100) < 65,
    eccentricBias: (durationMin ?? 0) > setsTotal * 8,
    durationMin,
    tags,
  };
};

const deriveRecoveryEmg = (
  metrics: HomeDecisionMetrics,
  recentSession: SessionHistoryEntry | null,
): RecoveryEMG => {
  const effectRate = recentSession?.effectRepRate ?? null;
  const rmsDropPct = clampPercent(metrics.rmsDropPct ?? 20);
  const rorDropPct = clampPercent(
    effectRate != null ? (1 - effectRate) * 40 : Math.round(rmsDropPct * 0.75),
  );
  const symmetryPct = clampPercent(
    recentSession?.balanceScore ?? metrics.symmetryPct ?? 90,
  );

  return {
    rmsDropPct,
    rorDropPct,
    symmetryPct,
  };
};

const deriveDecision = (readiness: number, metrics: HomeDecisionMetrics): Decision => {
  if (
    readiness >= TRAIN_READINESS_THRESHOLD &&
    metrics.rmsDropPct <= TRAIN_FATIGUE_MAX &&
    metrics.symmetryPct >= TRAIN_SYMMETRY_MIN
  ) {
    return 'train';
  }
  return 'recovery';
};

const recommendedLabelForDecision = (decision: Decision): string =>
  decision === 'train' ? 'Strength Session' : 'Active Recovery • 20–30 min';

export const buildHomeDecisionState = (params: {
  readiness: number | null;
  metrics: HomeDecisionMetrics;
  nextOptimalWindow: string;
  lastSessionSummary: string;
  isLoading: boolean;
  deltaVsLast?: number;
}): HomeDecisionState => {
  const readiness = params.readiness != null ? clampScore(params.readiness) : 0;
  const decision = params.isLoading ? 'recovery' : deriveDecision(readiness, params.metrics);

  return {
    readiness,
    deltaVsLast: params.deltaVsLast,
    metrics: params.metrics,
    decision,
    recommendedLabel: recommendedLabelForDecision(decision),
    nextOptimalWindow: params.nextOptimalWindow,
    lastSessionSummary: params.lastSessionSummary,
    isLoading: params.isLoading,
  };
};

const DecisionHero: React.FC<{
  state: HomeDecisionState;
  onWhy: () => void;
  coachLines: { line1?: string | null; line2?: string | null };
  nextOptimalLabel?: string | null;
}> = ({ state, onWhy, coachLines, nextOptimalLabel }) => {
  const scoreSpring = useSpring(0, {
    stiffness: 140,
    damping: 18,
    mass: 0.9,
  });
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (state.isLoading) {
      scoreSpring.set(0);
      setDisplayScore(0);
    } else {
      scoreSpring.set(state.readiness / 100);
    }
  }, [scoreSpring, state.isLoading, state.readiness]);

  useEffect(() => {
    const unsubscribe = scoreSpring.on('change', (value) => {
      setDisplayScore(Math.round(value * 100));
    });
    return () => {
      unsubscribe();
    };
  }, [scoreSpring]);

  const size = 148;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = useTransform(scoreSpring, (value) => circumference * (1 - value));
  const decisionCopy =
    state.decision === 'train' ? 'Train today' : 'Active recovery today';
  const helperLine = nextOptimalLabel && nextOptimalLabel.trim().length
    ? nextOptimalLabel.trim()
    : 'Next optimal session syncing...';

  if (state.isLoading) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/85 via-slate-900/60 to-slate-950/80 px-6 py-6 backdrop-blur-2xl shadow-[0_24px_48px_rgba(15,23,42,0.45)] animate-pulse">
        <div className="flex items-center gap-6">
          <div className="h-28 w-28 rounded-full bg-white/12" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-28 rounded bg-white/14" />
            <div className="h-4 w-40 rounded bg-white/12" />
            <div className="h-3 w-24 rounded bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  const { line1, line2 } = coachLines;
  const coachLine1 = line1 && line1.trim().length > 0 ? line1.trim() : null;
  const coachLine2 = line2 && line2.trim().length > 0 ? line2.trim() : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/70 px-7 py-8 backdrop-blur-2xl shadow-[0_32px_60px_rgba(15,23,42,0.55)]"
    >
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),rgba(15,23,42,0)_70%)]" />
      <div className="relative flex flex-col items-center gap-6">
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="absolute inset-0"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              className="text-white/15"
              fill="none"
              stroke="currentColor"
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                color: state.decision === 'train' ? '#38bdf8' : '#f59e0b',
              }}
            />
          </svg>
          <span className="pointer-events-none select-none text-5xl font-bold leading-none tracking-tight text-white">
            {displayScore}
          </span>
        </div>
        <div className="w-full space-y-6 text-left">
          <div className="space-y-3">
            <p className="text-[1.45rem] font-semibold leading-tight text-white sm:text-[1.55rem]">
              {decisionCopy}
            </p>
            <p className="text-sm text-white/65">{helperLine}</p>
          </div>
          {(coachLine1 || coachLine2) && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                Coach feedback
              </span>
              <div className="space-y-1.5 text-white/80">
                {coachLine1 && (
                  <p className="text-sm leading-relaxed text-white/80">{coachLine1}</p>
                )}
                {coachLine2 && (
                  <p className="text-sm leading-relaxed text-white/65">{coachLine2}</p>
                )}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onWhy}
            className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-full border border-white/15 px-4 text-sm font-semibold text-white/80 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            Chat with Coach
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const InfoRow: React.FC<{
  progressLabel: string;
  fatigueSummary: string;
  lastSessionSummary: string;
  onViewProgress: () => void;
  onViewHistory: () => void;
}> = ({ progressLabel, fatigueSummary, lastSessionSummary, onViewProgress, onViewHistory }) => (
  <div className="mt-6 grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
    <button
      type="button"
      onClick={onViewProgress}
      className="group flex min-h-[94px] flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left transition hover:border-white/25 hover:bg-white/[0.08]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-200">
        <BarChart3 size={18} />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.26em] text-white/55">Progress</span>
        <span className="text-sm font-medium text-white/85 leading-tight">{progressLabel}</span>
        <span className="text-[11px] text-white/60 leading-tight">{fatigueSummary}</span>
      </span>
    </button>
    <button
      type="button"
      onClick={onViewHistory}
      className="group flex min-h-[94px] flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left transition hover:border-white/25 hover:bg-white/[0.08]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-200">
        <Activity size={18} />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.26em] text-white/55">Last Session</span>
        <span className="text-sm font-medium text-white/85 leading-tight">{lastSessionSummary}</span>
        <span className="text-[11px] text-white/60 leading-tight">Tap to view history</span>
      </span>
    </button>
  </div>
);

const StickyPrimaryCTA: React.FC<{
  state: HomeDecisionState;
  disabled: boolean;
  onPress: () => void;
}> = ({ state, disabled, onPress }) => {
  const label = state.decision === 'train' ? 'Start Strength Session' : 'Start Active Recovery';

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 pb-4 pt-3 backdrop-blur-2xl"
      style={{
        paddingBottom: `calc(env(safe-area-inset-bottom, 16px))`,
        paddingLeft: `calc(env(safe-area-inset-left, 0px) + 16px)`,
        paddingRight: `calc(env(safe-area-inset-right, 0px) + 16px)`,
      }}
    >
      <button
        type="button"
        onClick={onPress}
        disabled={disabled}
        className="w-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-emerald-400 px-6 text-base font-semibold text-slate-950 shadow-[0_24px_45px_rgba(56,189,248,0.45)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ minHeight: 56 }}
      >
        {label}
      </button>
    </div>
  );
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartCheck,
  onStartActiveRecovery,
  onNavigateToConnect,
  onViewProgress,
  onViewHistory,
  onOpenCoachChat,
  sensorStatus,
  coachFeedback,
  weeklyTrend,
  recentSession,
  timeSinceLastSessionMinutes,
  isCoachLoading,
  userProfile,
  onLogAnalyticsEvent,
  externalRefreshToken = 0,
  mockState,
}) => {
  const isAnyConnected =
    sensorStatus.left.status === 'connected' || sensorStatus.right.status === 'connected';

  const scheduleLine = coachFeedback?.hero.scheduleLine ?? null;
  const readinessRaw = coachFeedback?.hero.recoveryScore ?? null;
  const metrics = useMemo(
    () => deriveMetrics(recentSession, weeklyTrend),
    [recentSession, weeklyTrend],
  );
  const fatigueSummary = useMemo(() => {
    const rms = metrics.rmsDropPct;
    const ror = metrics.rorDropPct;
    const symmetry = metrics.symmetryPct;

    const zone = (() => {
      if (
        (typeof rms === 'number' && rms > 30) ||
        (typeof ror === 'number' && ror > 40) ||
        (typeof symmetry === 'number' && symmetry < 85)
      ) {
        return 'Red';
      }
      if (
        (typeof rms === 'number' && rms >= 20) ||
        (typeof ror === 'number' && ror >= 25) ||
        (typeof symmetry === 'number' && symmetry >= 85 && symmetry < 88)
      ) {
        return 'Orange';
      }
      if (
        (typeof rms === 'number' && rms >= 10) ||
        (typeof ror === 'number' && ror >= 15) ||
        (typeof symmetry === 'number' && symmetry >= 88 && symmetry < 90)
      ) {
        return 'Yellow';
      }
      return 'Green';
    })();

    const formatPercent = (value: number | null) =>
      typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : '—';

    const symmetryText =
      typeof symmetry === 'number' && Number.isFinite(symmetry) ? `${Math.round(symmetry)}%` : '—';

    return `${zone} · RMS Δ ${formatPercent(rms)} · Sym ${symmetryText}`;
  }, [metrics]);
  const progressLabel = useMemo(() => {
    const trend = coachFeedback?.hero.trendText ?? 'Strength trend: —';
    const cleaned = trend.replace(/^Strength trend:\s*/i, '').trim();
    return cleaned.length > 0 ? cleaned : 'Trend unavailable';
  }, [coachFeedback]);

  const baseState = useMemo(
    () =>
      buildHomeDecisionState({
        readiness: readinessRaw,
        metrics,
        nextOptimalWindow: formatNextOptimalWindow(scheduleLine),
        lastSessionSummary: summariseLastSession(recentSession, timeSinceLastSessionMinutes),
        isLoading: isCoachLoading || !coachFeedback,
      }),
    [
      coachFeedback,
      isCoachLoading,
      metrics,
      readinessRaw,
      recentSession,
      scheduleLine,
      timeSinceLastSessionMinutes,
    ],
  );

  const homeState: HomeDecisionState = useMemo(() => {
    if (!mockState) return baseState;
    return {
      ...baseState,
      ...mockState,
      metrics: {
        ...baseState.metrics,
        ...(mockState.metrics ?? {}),
      },
    };
  }, [baseState, mockState]);

  const readinessScore = homeState.readiness;
  const recoveryProfile = useMemo(
    () => deriveRecoveryProfile(userProfile, recentSession, timeSinceLastSessionMinutes),
    [userProfile, recentSession, timeSinceLastSessionMinutes],
  );
  const recoverySession = useMemo(
    () => deriveRecoverySession(recentSession),
    [recentSession],
  );
  const recoveryEmg = useMemo(
    () => deriveRecoveryEmg(metrics, recentSession),
    [metrics, recentSession],
  );
  const { est: recoveryEstimate } = useRecovery(
    recoveryProfile,
    recoverySession,
    recoveryEmg,
  );
  const recoveryNextOptimalLabel = useMemo(() => {
    if (!recoveryEstimate) return null;
    return formatUpcomingSessionTarget(recoveryEstimate.T80h);
  }, [recoveryEstimate]);
  const {
    coach: geminiCoach,
    isLoading: isGeminiCoachLoading,
    refresh: refreshGeminiCoach,
    isFallback: isGeminiCoachFallback,
  } = useHomeCoach({ autoFetch: readinessScore > 50 });
  const lastRefreshTokenRef = useRef<number>(externalRefreshToken);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [isWorkoutLoading, setIsWorkoutLoading] = useState(false);
  const [workoutError, setWorkoutError] = useState<string | null>(null);
  const workoutAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (readinessScore <= 50) return;
    if (isGeminiCoachLoading) return;

    const tokenChanged = lastRefreshTokenRef.current !== externalRefreshToken;
    if (!tokenChanged && isGeminiCoachFallback) return;
    const shouldRefresh =
      tokenChanged || !geminiCoach || (geminiCoach.type !== 'suggestion');
    if (!shouldRefresh) return;

    lastRefreshTokenRef.current = externalRefreshToken;
    void refreshGeminiCoach();
  }, [
    externalRefreshToken,
    geminiCoach,
    isGeminiCoachFallback,
    isGeminiCoachLoading,
    readinessScore,
    refreshGeminiCoach,
  ]);

  useEffect(() => {
    return () => {
      workoutAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    setWorkoutPlan(null);
    setWorkoutError(null);
    workoutAbortRef.current?.abort();
  }, [homeState.decision, readinessScore]);

  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [whatIfMessage, setWhatIfMessage] = useState<string | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const shownNudgeKeyRef = useRef<string | null>(null);

  const geminiPrimaryLine = useMemo(() => {
    if (!geminiCoach || geminiCoach.type !== 'suggestion') {
      return coachFeedback?.coach.line1 ?? null;
    }
    return geminiCoach.message?.trim().length ? geminiCoach.message.trim() : coachFeedback?.coach.line1 ?? null;
  }, [coachFeedback?.coach.line1, geminiCoach]);

  const geminiSecondaryLine = useMemo(() => {
    if (geminiCoach && geminiCoach.type === 'suggestion') {
      if (geminiCoach.secondary && geminiCoach.secondary.trim().length) {
        return geminiCoach.secondary.trim();
      }
      if (geminiCoach.cta && geminiCoach.cta.trim().length) {
        return geminiCoach.cta.trim();
      }
    }
    return coachFeedback?.coach.line2 ?? null;
  }, [coachFeedback?.coach.line2, geminiCoach]);

  const geminiNudgeMessage = useMemo(() => {
    if (readinessScore <= 50) return null;
    if (!geminiCoach || geminiCoach.type !== 'suggestion') return null;
    if (geminiCoach.mode !== 'TRAIN') return null;
    const parts = [geminiCoach.message?.trim(), geminiCoach.secondary?.trim()].filter(
      (part): part is string => Boolean(part && part.length),
    );
    if (parts.length === 0) return null;
    return parts.join(' ');
  }, [geminiCoach, readinessScore]);

  const fallbackNudgeMessage = useMemo(
    () => (readinessScore >= 85 ? computeHighReadinessNudge(readinessScore) : null),
    [readinessScore],
  );

  const activeNudgeMessage = geminiNudgeMessage ?? fallbackNudgeMessage;

  const nudgeKey = useMemo(() => {
    if (!activeNudgeMessage) return null;
    return `${Math.round(readinessScore)}::${activeNudgeMessage}::${externalRefreshToken ?? 0}`;
  }, [activeNudgeMessage, externalRefreshToken, readinessScore]);

  useEffect(() => {
    if (!nudgeKey) {
      shownNudgeKeyRef.current = null;
      setNudgeDismissed(false);
      setIsWhatIfOpen(false);
      setWhatIfMessage(null);
      return;
    }
    if (shownNudgeKeyRef.current !== nudgeKey) {
      setNudgeDismissed(false);
      setIsWhatIfOpen(false);
      setWhatIfMessage(null);
    }
  }, [nudgeKey]);

  useEffect(() => {
    if (!nudgeKey) return;
    if (nudgeDismissed || isWhatIfOpen) return;
    if (shownNudgeKeyRef.current === nudgeKey) return;
    if (!activeNudgeMessage) return;
    if (isGeminiCoachLoading && !geminiNudgeMessage) return;

    setWhatIfMessage(activeNudgeMessage);
    setIsWhatIfOpen(true);
    shownNudgeKeyRef.current = nudgeKey;
  }, [
    activeNudgeMessage,
    geminiNudgeMessage,
    isGeminiCoachLoading,
    isWhatIfOpen,
    nudgeDismissed,
    nudgeKey,
  ]);

  const impressionLoggedRef = useRef(false);
  useEffect(() => {
    if (homeState.isLoading || impressionLoggedRef.current) return;
    onLogAnalyticsEvent?.('home_impression', { decision: homeState.decision });
    impressionLoggedRef.current = true;
  }, [homeState.decision, homeState.isLoading, onLogAnalyticsEvent]);

  const handlePrimaryAction = () => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(15);
    }
    onLogAnalyticsEvent?.('tap_start_session', { decision: homeState.decision });
    if (homeState.decision === 'train') {
      onStartCheck();
    } else {
      (onStartActiveRecovery ?? onStartCheck)();
    }
  };

  const handleCloseNudge = useCallback(() => {
    setIsWhatIfOpen(false);
    setNudgeDismissed(true);
    setWhatIfMessage(null);
    if (nudgeKey) {
      shownNudgeKeyRef.current = nudgeKey;
    }
  }, [nudgeKey]);

  const handleShowWorkout = useCallback(async () => {
    if (isWorkoutLoading) return;
    workoutAbortRef.current?.abort();
    const controller = new AbortController();
    workoutAbortRef.current = controller;
    setIsWorkoutLoading(true);
    setWorkoutError(null);

    const ctaAction = coachFeedback?.cta?.action ?? (homeState.decision === 'train' ? 'start_strength' : 'start_recovery');
    const firstName = userProfile?.name ? userProfile.name.trim().split(/\s+/)[0] ?? null : null;

    try {
      const plan = await fetchDailyWorkoutPlan(
        {
          readiness: readinessScore,
          metrics: {
            rmsDropPct: homeState.metrics.rmsDropPct,
            ror: homeState.metrics.ror,
            symmetryPct: homeState.metrics.symmetryPct,
          },
          ctaAction,
          recoveryHours: recoveryEstimate?.T80h ?? null,
          minutesSinceLastSession: timeSinceLastSessionMinutes ?? null,
          justFinished: Boolean(
            timeSinceLastSessionMinutes != null && timeSinceLastSessionMinutes <= 20,
          ),
          firstName,
        },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) {
        setWorkoutPlan(plan);
        setIsWorkoutLoading(false);
        workoutAbortRef.current = null;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      if (!controller.signal.aborted) {
        setWorkoutPlan(defaultWorkoutPlan);
        setWorkoutError('Using fallback workout while we reconnect.');
        setIsWorkoutLoading(false);
        workoutAbortRef.current = null;
      }
    }
  }, [
    coachFeedback?.cta?.action,
    homeState.decision,
    homeState.metrics,
    isWorkoutLoading,
    readinessScore,
    recoveryEstimate,
    timeSinceLastSessionMinutes,
    recentSession,
    userProfile?.name,
  ]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden pb-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.25),transparent_60%),radial-gradient(circle_at_80%_0%,rgba(250,204,21,0.18),transparent_55%),linear-gradient(160deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))]" />
        <div className="absolute inset-x-6 inset-y-10 rounded-3xl border border-white/5 bg-slate-950/40 opacity-50 blur-3xl" />
      </div>

      <header className="relative z-10 px-6 pt-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.32em] text-white/50">
              <Sparkles size={14} className="text-amber-300" />
              Daily Snapshot
            </span>
            <h1 className="mt-2 text-3xl font-semibold text-white">Today</h1>
          </div>
          <button
            type="button"
            onClick={onNavigateToConnect}
            className="inline-flex h-11 min-w-[44px] items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 text-sm font-semibold text-white/75 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${isAnyConnected ? 'bg-emerald-400' : 'bg-slate-500'}`}
            />
            <span>{isAnyConnected ? 'Sensors connected' : 'Sensors offline'}</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mt-6 flex flex-1 flex-col items-center gap-6 overflow-y-auto px-6 pb-40">
        <DecisionHero
          state={homeState}
          onWhy={onOpenCoachChat}
          coachLines={{
            line1: geminiPrimaryLine ?? coachFeedback?.coach.line1 ?? null,
            line2: geminiSecondaryLine ?? coachFeedback?.coach.line2 ?? null,
          }}
          nextOptimalLabel={recoveryNextOptimalLabel}
        />
        <InfoRow
          progressLabel={progressLabel}
          fatigueSummary={fatigueSummary}
          lastSessionSummary={homeState.lastSessionSummary}
          onViewProgress={onViewProgress}
          onViewHistory={onViewHistory}
        />
        <div className="w-full max-w-md space-y-2.5">
          {!workoutPlan && (
            <button
              type="button"
              onClick={handleShowWorkout}
              disabled={isWorkoutLoading}
              className="w-full rounded-xl border border-zinc-700/60 bg-zinc-900/40 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isWorkoutLoading ? 'Designing workout…' : "Show today's workout"}
            </button>
          )}
          {workoutError && (
            <p className="text-[10px] text-rose-300/80 px-1">{workoutError}</p>
          )}
          {isWorkoutLoading && <PlanInlineSkeleton />}
          {!isWorkoutLoading && workoutPlan && (
            <PremiumPlanView {...convertWorkoutPlanToPlanProps(workoutPlan)} />
          )}
        </div>
      </main>

      <StickyPrimaryCTA state={homeState} disabled={homeState.isLoading} onPress={handlePrimaryAction} />
      <NudgeModal
        isOpen={isWhatIfOpen && Boolean(whatIfMessage)}
        readiness={readinessScore}
        message={whatIfMessage ?? ''}
        onClose={handleCloseNudge}
      />
    </div>
  );
};

export default HomeScreen;
