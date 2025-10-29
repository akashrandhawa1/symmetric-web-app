import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, SensorStatus, Rep, TrendPoint, SessionHistoryEntry, RawPeakHistoryEntry, ReadinessPrediction, CompletedSet, Screen, ChatMessage, RecoveryTask, CoachHomeFeedback, CoachContextState, CoachIntent, CoachPrefs, StopSuggestion, CoachOutput, UserCoachProfile, CoachMessage, NextSetPlan, CoachPersona, CoachCue, ScenarioBucket, OutcomeSignal, CoachUserProfile, PlannedWorkoutSet } from './types';
import { STORAGE_KEY, LIVE_TUTORIAL_KEY, onboardingTutorialSteps, FEATURE_FATIGUE_DETECTOR, FEATURE_COACH_LLM_GUARDED } from './constants';
import { LegacyPredictorAdapter, generateSimulatedHistory, loadHistory, saveHistory, clampStrengthGain, getRecoveryDate, getRecoveryDirective, getSymmetricHomePageData, getCoachContext, fetchPostWorkoutAnalysis, fetchCoachAnswer, fetchHomeHeroCopy, fetchSessionContinuationAdvice, fetchDailyWorkoutPlan, toDate, ComposeCoachPromptArgs, CoachPromptContextInput, GEMINI_COACH_FALLBACK_MESSAGE, type WorkoutPlan } from './services';
import { convertWorkoutPlanToPlanProps } from './lib/plan/convertWorkoutPlan';
import {
    SplashScreen,
    IntroScreen,
    OnboardingConversationScreen,
    ConnectScreen,
    PlacementGuideScreen,
    MVCScreen,
    SetupScreen,
    TestingScreen,
    PreTrainingScreen,
    TrainingScreen,
    ImpactScreen,
    HomeScreen,
    HistoryScreen,
    ChatScreen,
    ProgressScreen,
} from './appScreens';
import CoachDock from './components/coach/CoachDock';
import { GeminiLiveCoach } from './components/coach/GeminiLiveCoach';
import { CoachContextBus } from './coach/CoachContextBus';
import type { CoachGateContext } from './hooks/useCoachGate';
import { useCoachGate } from './hooks/useCoachGate';

import { StrengthAchievementPopup } from './components';
import { useFatigueDetector } from './hooks/useFatigueDetector';
import type { FatigueState, FatigueStateEvent, FatigueDebugEvent } from './lib/fatigue/FatigueDetector';
import { CoachInsightOrchestrator, CoachInsightContext, CoachInsight } from './lib/coach/LlmOrchestrator';
import { useCoachInsightPipeline } from './hooks/useCoachInsightPipeline';
import type { CoachMessageEnvelope } from './lib/coach/CoachMessageComposer';
import { generatePersonalizedFeedback, type SetContext as VoiceSetContext, computeReward } from './lib/coach/voice';
import {
    generateStrengthScenarios,
    formatStrengthScenarios,
    type CoachSetSummaryRecord,
} from './lib/coach/setSummary';
import { computeContext } from './coach/context';
import type { StrengthContext, PlanMode, CoachSummary } from './coach/types';
import { decideStrengthPlan } from './coach/planner';
import { fallbackNarration } from './coach/narrator';
import { buildCoachUserPrompt, containsVocalDrift } from './lib/coach/buildCoachPrompt';
import { sendCoachText } from './lib/coach/sendCoachText';
import { COACH_PERSONA } from './lib/coach/constants';

const stripFormatting = (value: string) => value.replace(/\*\*/g, '').trim();
const normaliseLine = (value: string) => stripFormatting(value).replace(/’/g, "'").toLowerCase();
const USER_PROFILE_STORAGE_KEY = 'symmetric_user_profile';
const ANALYTICS_DEBUG = false;
const GEMINI_DEBUG =
    typeof window !== 'undefined' && Boolean((window as any).__GEMINI_DEBUG__);
const labelPlanMode = (mode: PlanMode): string => {
    if (mode === 'TRAIN') return '+1 set';
    if (mode === 'ACTIVE_RECOVERY') return 'active recovery';
    return 'rest';
};

type SessionPlanState = {
    plan: WorkoutPlan;
    accepted: boolean;
    sets: PlannedWorkoutSet[];
    nextIndex: number;
    lastCompleted: PlannedWorkoutSet | null;
};

const flattenWorkoutPlanToSets = (plan: WorkoutPlan): PlannedWorkoutSet[] => {
    const sets: PlannedWorkoutSet[] = [];
    plan.blocks.forEach((block, blockIndex) => {
        const totalSetsRaw = block.prescription?.sets;
        const totalSets =
            typeof totalSetsRaw === 'number' && Number.isFinite(totalSetsRaw) && totalSetsRaw > 0
                ? Math.round(totalSetsRaw)
                : 1;
        for (let setIndex = 0; setIndex < totalSets; setIndex += 1) {
            const idBase =
                block.exercise?.id ??
                `${block.label ?? block.exercise?.name ?? 'block'}-${blockIndex}`;
            sets.push({
                id: `${idBase}-set-${setIndex + 1}`,
                exerciseName: block.exercise?.name ?? block.label ?? `Block ${blockIndex + 1}`,
                blockLabel: block.label ?? null,
                blockIndex,
                setIndex,
                totalSets,
                reps:
                    block.prescription?.reps != null
                        ? String(block.prescription.reps)
                        : null,
                tempo: block.prescription?.tempo ?? null,
                restSeconds:
                    typeof block.prescription?.rest_s === 'number'
                        ? Math.max(0, Math.round(block.prescription.rest_s))
                        : null,
                loadAdjustment: block.prescription?.load_adjustment ?? 'n/a',
            });
        }
    });
    return sets;
};

const isCoachResponseAligned = (message: string, context: CoachPromptContextInput): boolean => {
    const lines = message
        .split('\n')
        .map((line) => stripFormatting(line))
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (lines.length === 0) return false;

    const normalised = lines.map((line) => normaliseLine(line));

    if (!context.dataSyncOK) {
        const line1 = normalised[0] ?? '';
        const line2 = normalised[1] ?? '';
        return line1 === "data's still syncing." && line2.startsWith("recovery today;");
    }

    const line2 = normalised[1] ?? '';
    const cta = context.ui.ctaCandidate ? context.ui.ctaCandidate.toLowerCase() : '';
    const ctaWords = cta ? cta.split(/\s+/).filter(Boolean) : [];
    const ctaAligned = ctaWords.length === 0 || ctaWords.every((word) => line2.includes(word));
    const requiresTiming = context.timeToNextOptimalHours != null && context.nextOptimalLabel;
    const timingAligned = !requiresTiming || line2.includes("next optimal session:");

    return ctaAligned && timingAligned;
};

type PredictorSnapshot = {
    sessionActive: boolean;
    reps: Rep[];
    totalReps: Rep[];
    currentReadiness: number;
    preMVCpct: number;
    lastPeakPct: number | null;
    tut: number;
    zoneTimes: Record<string, number>;
    maxPeakInSet: number;
    fatigueDetectedInSet: boolean;
    fatigueDetectedAtRep: number | null;
    isCalibrationSet: boolean;
};

const cloneRep = (rep: Rep): Rep => ({ ...rep });

const snapshotPredictor = (adapter: LegacyPredictorAdapter | null): PredictorSnapshot | null => {
    if (!adapter) return null;
    return {
        sessionActive: adapter.sessionActive,
        reps: adapter.reps.map(cloneRep),
        totalReps: adapter.totalReps.map(cloneRep),
        currentReadiness: adapter.currentReadiness,
        preMVCpct: adapter.preMVCpct,
        lastPeakPct: adapter.lastPeakPct,
        tut: adapter.tut,
        zoneTimes: { ...adapter.zoneTimes },
        maxPeakInSet: adapter.maxPeakInSet,
        fatigueDetectedInSet: adapter.fatigueDetectedInSet,
        fatigueDetectedAtRep: adapter.fatigueDetectedAtRep,
        isCalibrationSet: adapter.isCalibrationSet,
    };
};

const restorePredictor = (adapter: LegacyPredictorAdapter | null, snapshot: PredictorSnapshot | null) => {
    if (!adapter || !snapshot) return;
    adapter.sessionActive = snapshot.sessionActive;
    adapter.reps = snapshot.reps.map(cloneRep);
    adapter.totalReps = snapshot.totalReps.map(cloneRep);
    adapter.currentReadiness = snapshot.currentReadiness;
    adapter.preMVCpct = snapshot.preMVCpct;
    adapter.lastPeakPct = snapshot.lastPeakPct;
    adapter.tut = snapshot.tut;
    adapter.zoneTimes = { ...snapshot.zoneTimes };
    adapter.maxPeakInSet = snapshot.maxPeakInSet;
    adapter.fatigueDetectedInSet = snapshot.fatigueDetectedInSet;
    adapter.fatigueDetectedAtRep = snapshot.fatigueDetectedAtRep;
    adapter.isCalibrationSet = snapshot.isCalibrationSet;
};

const buildSuggestionKey = (suggestion: StopSuggestion | null): string => {
    if (!suggestion) return 'none';
    const reasonsKey = suggestion.reasons
        .map((reason) => `${reason.code}:${reason.value ?? ''}:${reason.threshold ?? ''}`)
        .join('|');
    return `${suggestion.target}:${Math.round(suggestion.confidence * 100)}:${reasonsKey}`;
};

type UndoActionType = 'skip_set' | 'skip_exercise' | 'end_set';

type UndoState = {
    type: UndoActionType;
    label: string;
    sessionSnapshot: {
        sessionData: ReadinessPrediction | null;
        sessionPhase: 'active' | 'set-summary' | 'end';
        preSetReadiness: number | null;
        completedSets: CompletedSet[];
        predictor: PredictorSnapshot | null;
    };
    expiresAt: number;
};

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>({ screen: "splash", sessionSummary: null, userProfile: null });
    const [isCoachOpen, setCoachOpen] = useState(false);
    const [sensorStatus, setSensorStatus] = useState<SensorStatus>({
        left: { status: 'disconnected', device: null, server: null, battery: null },
        right: { status: 'disconnected', device: null, server: null, battery: null }
    });
    const [sensorError, setSensorError] = useState<string | null>(null);
    const predictor = useRef<LegacyPredictorAdapter | null>(null);
    
    const [justAchievedPR, setJustAchievedPR] = useState(false);
    const [prValues, setPrValues] = useState<{ old: number; new: number } | null>(null);
    
    // Data State
    const [readinessScore, setReadinessScore] = useState<number | null>(null);
    const [initialReadinessScore, setInitialReadinessScore] = useState<number | null>(null);
    const [postScore, setPostScore] = useState<number | null>(null);
    const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
    const [sessionsHistory, setSessionsHistory] = useState<SessionHistoryEntry[]>([]);
    const [rawPeakHistory, setRawPeakHistory] = useState<RawPeakHistoryEntry[]>([]);
    const [maxMvcEver, setMaxMvcEver] = useState(200);
    const [nextOptimalDate, setNextOptimalDate] = useState<Date | null>(null);
    const [sessionJustCompleted, setSessionJustCompleted] = useState(false);
    const [sessionSummaryForCoach, setSessionSummaryForCoach] = useState<any>(null);
    const [sessionContinuationAdvice, setSessionContinuationAdvice] = useState<string>("");
    const [isLoadingContinuationAdvice, setIsLoadingContinuationAdvice] = useState(false);
    const [readinessTestCount, setReadinessTestCount] = useState(0);
    const [isCalculatingReadiness, setIsCalculatingReadiness] = useState(false);
    const [userProfile, setUserProfile] = useState<CoachUserProfile | null>(null);
    const [homeRecommendationToken, setHomeRecommendationToken] = useState(0);
    const lastPlanReplyRef = useRef<{ text: string; summary: CoachSummary; mode: PlanMode } | null>(null);
    const [recordedReps, setRecordedReps] = useState<{ left: number[]; right: number[] }>({ left: [], right: [] });
    const [isTestingComplete, setIsTestingComplete] = useState(false);
    const [isRetestFlow, setIsRetestFlow] = useState(false);


    // Session State
    const [sessionData, setSessionData] = useState<ReadinessPrediction | null>(null);
    const [sessionPhase, setSessionPhase] = useState<'active' | 'set-summary' | 'end'>('active');
    const [preSetReadiness, setPreSetReadiness] = useState<number | null>(null);
    const [completedSets, setCompletedSets] = useState<CompletedSet[]>([]);
    const [coachPrefs, setCoachPrefs] = useState<CoachPrefs>(() => ({
        allowStopSuggestions: true,
        vibrateOnSuggestion: false,
        suppressStopsForSession: false,
    }));
    const [dismissedSuggestionKeys, setDismissedSuggestionKeys] = useState<string[]>([]);
    const [activeUndo, setActiveUndo] = useState<UndoState | null>(null);
    const [awaitingEndSetConfirm, setAwaitingEndSetConfirm] = useState(false);
    const undoTimerRef = useRef<number | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const sessionStartedAtRef = useRef<Date | null>(null);
    const lastSuggestionKeyRef = useRef<string | null>(null);
    const [lastRestSummary, setLastRestSummary] = useState<{ preReadiness: number | null; postReadiness: number | null; weightAdjustmentMessage: string | null; nextWeightAdjustment: number | null; fatigueLimited: boolean } | null>(null);
    const [lastSetCoachSummary, setLastSetCoachSummary] = useState<CoachSetSummaryRecord | null>(null);
    const [lastSetReps, setLastSetReps] = useState<Rep[]>([]);
    const [postSetCoachOutput, setPostSetCoachOutput] = useState<CoachOutput | null>(null);
    const [latestWorkoutPlan, setLatestWorkoutPlan] = useState<WorkoutPlan | null>(null);
const [sessionPlanState, setSessionPlanState] = useState<SessionPlanState | null>(null);
const [isGeneratingSessionPlan, setIsGeneratingSessionPlan] = useState(false);
const [sessionPlanError, setSessionPlanError] = useState<string | null>(null);
const sessionPlanAbortRef = useRef<AbortController | null>(null);
const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
const [coachFeedback, setCoachFeedback] = useState<CoachHomeFeedback | null>(null);
const [isCoachLoading, setIsCoachLoading] = useState(true);
const chatHistoryForAPI = useRef<ChatMessage[]>([]);
const coachRequestQueueRef = useRef<{ question: string; intent?: CoachIntent }[]>([]);
const coachRequestActiveRef = useRef(false);
const coachAnswerCacheRef = useRef<Map<string, Map<string, string>>>(new Map());
useEffect(() => {
    return () => {
        sessionPlanAbortRef.current?.abort();
    };
}, []);
    const planSummaryForCoach = useMemo<CoachPromptContextInput['currentPlan']>(() => {
        if (!latestWorkoutPlan) return null;
        try {
            const planProps = convertWorkoutPlanToPlanProps(latestWorkoutPlan);
            return {
                intent: latestWorkoutPlan?.plan_meta?.intent ?? null,
                readinessBefore: planProps?.startReadiness ?? latestWorkoutPlan?.plan_meta?.readiness ?? null,
                readinessAfter: planProps?.finalReadiness ?? null,
                blocks: planProps.blocks.map((block) => ({
                    displayName: block.name,
                    loadStrategy: block.load ?? null,
                    sets: block.sets,
                    reps: block.reps,
                    focus: block.label,
                })),
            };
        } catch (error) {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                console.warn('[coach] failed to summarise workout plan', error);
            }
            return {
                intent: latestWorkoutPlan?.plan_meta?.intent ?? null,
                readinessBefore: latestWorkoutPlan?.plan_meta?.readiness ?? null,
                readinessAfter: null,
                blocks: latestWorkoutPlan.blocks.map((block) => ({
                    displayName: block.exercise?.name ?? block.label ?? 'Block',
                    loadStrategy: block.prescription?.load_adjustment ?? null,
                    sets: typeof block.prescription?.sets === 'number' ? block.prescription?.sets : null,
                    reps: block.prescription?.reps ?? null,
                    focus: block.label ?? null,
                })),
            };
        }
    }, [latestWorkoutPlan]);
    const weeklyTrend = useMemo(() => {
        if (!rawPeakHistory || rawPeakHistory.length < 2) return 0;
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const currentWeekPeaks = rawPeakHistory
            .filter((p) => toDate(p.date) >= oneWeekAgo)
            .map((p) => p.maxPeak);
        const prevWeekPeaks = rawPeakHistory
            .filter((p) => toDate(p.date) >= twoWeeksAgo && toDate(p.date) < oneWeekAgo)
            .map((p) => p.maxPeak);

        if (prevWeekPeaks.length === 0 || currentWeekPeaks.length === 0) return 0;
        const avgCurrent = currentWeekPeaks.reduce((a, b) => a + b, 0) / currentWeekPeaks.length;
        const avgPrev = prevWeekPeaks.reduce((a, b) => a + b, 0) / prevWeekPeaks.length;
        if (avgPrev === 0) return 0;
        return ((avgCurrent - avgPrev) / avgPrev) * 100;
    }, [rawPeakHistory]);
const sessionPlanView = useMemo(() => {
    if (!sessionPlanState?.plan) return null;
    try {
        return convertWorkoutPlanToPlanProps(sessionPlanState.plan);
    } catch (error) {
        console.warn('[session-plan] failed to convert workout plan for view', error);
        return null;
    }
}, [sessionPlanState?.plan]);
const derivedCoachPhase = useMemo(() => {
    if (appState.screen === 'training') {
        if (sessionPhase === 'active') return 'work';
        if (sessionPhase === 'set-summary') return 'rest';
        return 'summary';
    }
    if (appState.screen === 'impact') return 'summary';
    if (appState.screen === 'result') return 'intro';
    if (appState.screen === 'ready') return 'intro';
    return 'intro';
}, [appState.screen, sessionPhase]);
const lastCompletedSet = useMemo(() => {
    if (lastSetCoachSummary) {
        const reps = lastSetCoachSummary.metrics?.repCount ?? lastSetCoachSummary.metrics?.totalReps ?? completedSets.slice(-1)[0]?.reps ?? 0;
        return {
            exercise: lastSetCoachSummary.exerciseName ?? 'set',
            reps,
            rpe: lastSetCoachSummary.metrics?.rpe ?? undefined,
            seconds: lastSetCoachSummary.metrics?.timeUnderTension ?? undefined,
        };
    }
    if (completedSets.length > 0) {
        const entry = completedSets[completedSets.length - 1];
        return {
            exercise: 'set',
            reps: entry.reps,
            seconds: entry.tut ?? undefined,
        };
    }
    return undefined;
}, [completedSets, lastSetCoachSummary]);
const lastCoachPhaseRef = useRef(derivedCoachPhase);
const plannedSetCurrent = useMemo(() => {
    if (!sessionPlanState?.accepted) return null;
    return sessionPlanState.lastCompleted;
}, [sessionPlanState]);
const plannedSetNext = useMemo(() => {
    if (!sessionPlanState?.accepted) return null;
    if (!sessionPlanState.sets.length) return null;
    if (sessionPlanState.nextIndex >= sessionPlanState.sets.length) {
        return null;
    }
    return sessionPlanState.sets[sessionPlanState.nextIndex] ?? null;
}, [sessionPlanState]);
const plannedSetProgress = useMemo(() => {
    if (!sessionPlanState?.accepted) return null;
    const total = sessionPlanState.sets.length;
    const completed = Math.min(sessionPlanState.nextIndex, total);
    return { completed, total };
}, [sessionPlanState]);
const generateSessionWorkoutPlan = useCallback(async () => {
        if (isGeneratingSessionPlan) return;
        sessionPlanAbortRef.current?.abort();
        const controller = new AbortController();
        sessionPlanAbortRef.current = controller;
        setIsGeneratingSessionPlan(true);
        setSessionPlanError(null);

        const readinessForPlan = (isRetestFlow ? postScore : readinessScore) ?? readinessScore ?? postScore ?? initialReadinessScore ?? null;
        const lastSession = sessionsHistory.length > 0 ? sessionsHistory[sessionsHistory.length - 1] : null;
        const minutesSinceLastSession =
            lastSession != null
                ? (Date.now() - toDate(lastSession.date).getTime()) / (1000 * 60)
                : null;
        const rmsDropPct =
            lastSession?.effectRepRate != null
                ? Math.max(0, Math.round(lastSession.effectRepRate * 100))
                : 18;
        const symmetryPct =
            lastSession?.balanceScore != null
                ? Math.max(0, Math.round(lastSession.balanceScore))
                : 90;
        const trendValue = Number.isFinite(weeklyTrend) ? Number(weeklyTrend) : 0;
        const ror: 'down' | 'stable' | 'up' =
            trendValue > 1 ? 'up' : trendValue < -1 ? 'down' : 'stable';
        const firstName =
            userProfile?.name && userProfile.name.trim().length
                ? userProfile.name.trim().split(/\s+/)[0] ?? null
                : null;

        try {
            const plan = await fetchDailyWorkoutPlan(
                {
                    readiness: readinessForPlan ?? null,
                    metrics: {
                        rmsDropPct,
                        ror,
                        symmetryPct,
                    },
                    ctaAction: 'start_strength',
                    recoveryHours: null,
                    minutesSinceLastSession,
                    justFinished: false,
                    firstName,
                },
                { signal: controller.signal },
            );
            if (controller.signal.aborted) {
                return;
            }
            setSessionPlanState({
                plan,
                accepted: false,
                sets: flattenWorkoutPlanToSets(plan),
                nextIndex: 0,
                lastCompleted: null,
            });
        } catch (error: any) {
            if (controller.signal.aborted) {
                return;
            }
            console.warn('[session-plan] failed to generate workout plan', error);
            setSessionPlanError('Unable to generate the workout right now. Try again in a moment.');
        } finally {
            setIsGeneratingSessionPlan(false);
            if (sessionPlanAbortRef.current === controller) {
                sessionPlanAbortRef.current = null;
            }
        }
    }, [
        isGeneratingSessionPlan,
        isRetestFlow,
        postScore,
        readinessScore,
        sessionsHistory,
        weeklyTrend,
        userProfile?.name,
    ]);
const coordinatorFatigueRef = useRef<FatigueState | null>(null);
const coachContextPayload = useMemo(() => {
    const readinessValue = Math.max(
        0,
        Math.min(
            100,
            Math.round(
                sessionData?.currentReadiness ?? postScore ?? readinessScore ?? initialReadinessScore ?? 0,
            ),
        ),
    );
    const latestSession = sessionsHistory.length > 0 ? sessionsHistory[sessionsHistory.length - 1] : null;

    // Convert session history to coach-friendly format (last 3 sessions)
    const sessionHistory = sessionsHistory.slice(-3).map((s) => ({
        date: s.date,
        readinessPre: s.pre ?? 0,
        readinessPost: s.post ?? 0,
        effectiveReps: s.effectReps ?? 0,
        balanceScore: s.balanceScore ?? 0,
        exercises: [], // TODO: Extract exercise names from reps if needed
    }));

    return {
        readiness: readinessValue,
        sessionPhase: derivedCoachPhase,
        metrics: {
            ror: weeklyTrend > 1 ? 'up' : weeklyTrend < -1 ? 'down' : 'stable',
            symmetryPct: latestSession?.balanceScore ?? undefined,
            rmsDropPct:
                latestSession?.effectRepRate != null
                    ? Math.round(Math.max(0, latestSession.effectRepRate > 1 ? latestSession.effectRepRate : latestSession.effectRepRate * 100))
                    : undefined,
        },
        lastSet: lastCompletedSet,
        goal: coachFeedback?.cta?.action === 'start_recovery' ? 'recovery' : 'build_strength',
        userFlags: {
            tired: coordinatorFatigueRef.current === 'fall',
        },
        sessionHistory,
    };
}, [coachFeedback?.cta?.action, derivedCoachPhase, initialReadinessScore, lastCompletedSet, postScore, readinessScore, sessionData?.currentReadiness, sessionsHistory, weeklyTrend]);
const coachContextKeyRef = useRef<string>('');

const coachGateContext = useMemo<CoachGateContext>(() => {
    let route: CoachGateContext['route'] = 'other';
    let phase: 'idle' | 'rest' | 'active' = 'idle';

    if (appState.screen === 'home' || appState.screen === 'ready') {
        route = 'home-live';
        phase = 'idle';
    } else if (appState.screen === 'training') {
        if (sessionPhase === 'set-summary') {
            route = 'rest';
            phase = 'rest';
        } else if (sessionPhase === 'active') {
            route = 'active';
            phase = 'active';
        } else {
            route = 'active';
            phase = 'idle';
        }
    } else if (appState.screen === 'history') {
        route = 'history';
        phase = 'idle';
    } else if (appState.screen === 'impact' || appState.screen === 'result') {
        route = 'other';
        phase = 'idle';
    } else {
        route = 'other';
        phase = 'idle';
    }

    return { route, phase };
}, [appState.screen, sessionPhase]);

const coachGate = useCoachGate(coachGateContext);

useEffect(() => {
    if (!coachGate.canOpen && isCoachOpen) {
        setCoachOpen(false);
    }
}, [coachGate.canOpen, isCoachOpen]);

const coachPromptBase = useMemo(() => {
    const metrics = coachContextPayload.metrics ?? {};
    const parts: string[] = [];
    if (metrics.ror) {
        parts.push(`Rate of recovery trend: ${metrics.ror}.`);
    }
    if (metrics.symmetryPct != null) {
        parts.push(`Symmetry: ${Math.round(metrics.symmetryPct)}%.`);
    }
    if (metrics.rmsDropPct != null) {
        parts.push(`Fatigue (RMS drop): ${Math.round(metrics.rmsDropPct)}%.`);
    }
    if (coachContextPayload.lastSet?.exercise) {
        parts.push(
            `Last set: ${coachContextPayload.lastSet.exercise} x${coachContextPayload.lastSet.reps}${
                coachContextPayload.lastSet.rpe != null ? ` @ RPE ${coachContextPayload.lastSet.rpe}` : ''
            }`,
        );
    }
    if (coachContextPayload.userFlags?.tired) {
        parts.push('Athlete flagged as tired.');
    }
    if (coachContextPayload.userFlags?.pain) {
        parts.push('Athlete flagged pain/discomfort.');
    }

    // Add recent session history
    const recentSessions = sessionsHistory.slice(-3).reverse();
    let recentEvents = '';
    if (recentSessions.length > 0) {
        console.log('[App] Raw session data for coach:', recentSessions);
        const sessionSummaries = recentSessions.map((s, idx) => {
            // Handle timestamp - it might be in ms or seconds or a date string
            let timestampMs = Date.now();
            if (typeof s.timestamp === 'number') {
                timestampMs = s.timestamp > 10000000000 ? s.timestamp : s.timestamp * 1000;
            } else if (typeof s.timestamp === 'string') {
                timestampMs = new Date(s.timestamp).getTime();
            }

            const daysAgo = Math.floor((Date.now() - timestampMs) / (1000 * 60 * 60 * 24));
            const timeLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`;
            const setsInfo = s.effectiveReps > 0 ? ` ${s.effectiveReps} effective reps` : '';
            const balanceInfo = s.balanceScore != null ? ` balance=${Math.round(s.balanceScore)}%` : '';
            const readinessInfo = s.readinessPre != null ? ` readiness=${Math.round(s.readinessPre)}` : '';
            return `Session ${timeLabel}:${readinessInfo}${setsInfo}${balanceInfo}`;
        });
        recentEvents = sessionSummaries.join('\n');
    }

    const goal = coachContextPayload.goal === 'recovery' ? 'recovery' : 'strength';
    return {
        readiness: coachContextPayload.readiness,
        phase: coachGateContext.phase,
        goal,
        symmetryPct: metrics.symmetryPct ?? undefined,
        fatiguePct: metrics.rmsDropPct ?? undefined,
        nextExercise: coachContextPayload.lastSet?.exercise ?? undefined,
        parts,
        recentEvents,
    };
}, [coachContextPayload, coachGateContext.phase, sessionsHistory]);

const handleCoachSend = useCallback(
    async (text: string) => {
        const ctx = { ...coachPromptBase, userUtterance: text };
        const prompt = buildCoachUserPrompt(ctx);
        console.log('[App] Coach prompt context:', ctx);
        console.log('[App] Coach full prompt:', prompt);
        try {
            let reply = (
                await sendCoachText(prompt, {
                    speaker_style: COACH_PERSONA.speaker_style,
                    phase: ctx.phase,
                    readiness: ctx.readiness,
                })
            ).trim();
            if (!reply) {
                throw new Error('empty_coach_reply');
            }
            if (containsVocalDrift(reply)) {
                const reminderPrompt = `${prompt}\nReminder: Stay on muscles, sets, load, symmetry, or recovery.`;
                const retry = (
                    await sendCoachText(reminderPrompt, {
                        speaker_style: COACH_PERSONA.speaker_style,
                        phase: ctx.phase,
                        readiness: ctx.readiness,
                        reminder: true,
                    })
                ).trim();
                if (retry && !containsVocalDrift(retry)) {
                    return retry;
                }
                return 'Let’s stay on training—ask me about sets, load, symmetry, or recovery.';
            }
            return reply;
        } catch (error) {
            console.error('[App] coach send failed', error);
            throw error;
        }
    },
    [coachPromptBase],
);

useEffect(() => {
    const key = JSON.stringify(coachContextPayload);
    if (coachContextKeyRef.current === key) return;
    coachContextKeyRef.current = key;
    CoachContextBus.publishContext(coachContextPayload);
}, [coachContextPayload]);

    useEffect(() => {
        if (lastCoachPhaseRef.current !== derivedCoachPhase) {
            CoachContextBus.publish({
                type: 'phase_changed',
                at: Date.now(),
                payload: { from: lastCoachPhaseRef.current, to: derivedCoachPhase },
            });
            lastCoachPhaseRef.current = derivedCoachPhase;
        }
    }, [derivedCoachPhase]);
    const acceptSessionWorkoutPlan = useCallback(() => {
        if (!sessionPlanState?.plan) {
            return;
        }
        if (!sessionPlanState.accepted) {
            setSessionPlanError(null);
            setLatestWorkoutPlan(sessionPlanState.plan);
        }
        setSessionPlanState((prev) => {
            if (!prev) return prev;
            if (prev.accepted) {
                return prev;
            }
            return {
                ...prev,
                accepted: true,
                nextIndex: 0,
                lastCompleted: null,
            };
        });
    }, [sessionPlanState?.plan, sessionPlanState?.accepted, setLatestWorkoutPlan, setSessionPlanError]);
    const lastPostSetMetaRef = useRef<{
        readinessNow: number;
        readinessChangePct: number;
        cumulativeChangePct: number;
        planKind: NextSetPlan['kind'];
        persona: CoachPersona | null;
        cue: CoachCue | null;
        judgment: 'productive' | 'neutral' | 'protect';
    }>({
        readinessNow: 0,
        readinessChangePct: 0,
        cumulativeChangePct: 0,
        planKind: 'hold',
        persona: null,
        cue: null,
        judgment: 'neutral',
    });
    const lastCoachOutputRef = useRef<CoachOutput | null>(null);
    const userCoachProfileRef = useRef<UserCoachProfile>({
        userId: 'anon',
        preferredPersona: 'calm',
        preferredCue: 'brace',
        explorationRate: 0.15,
    });
    const fatigueHistoryRef = useRef<Array<{ t: number; rmsNorm: number; mdfNorm?: number | null }>>([]);
    const lastDebugEventRef = useRef<FatigueDebugEvent | null>(null);
    const coachLlmEnabled = FEATURE_COACH_LLM_GUARDED;
    const orchestratorRef = useRef<CoachInsightOrchestrator | null>(coachLlmEnabled ? new CoachInsightOrchestrator() : null);
    const {
        state: coachInsightState,
        requestInsight: requestCoachInsight,
        clear: clearCoachInsight,
    } = useCoachInsightPipeline({ orchestratorRef, enabled: coachLlmEnabled });
    const coachInsightEnvelope: CoachMessageEnvelope | null = coachInsightState.envelope;
    const coachInsightMessage = coachInsightEnvelope?.message ?? null;
    const coachInsightMeta = coachInsightEnvelope?.meta ?? null;
    const lastLoggedCoachInsightIdRef = useRef<string | null>(null);
    const logAnalyticsEvent = useCallback((event: string, data: Record<string, unknown>) => {
        const payload = {
            event,
            sessionId: sessionIdRef.current,
            timestamp: new Date().toISOString(),
            ...data,
        };
        if (ANALYTICS_DEBUG) {
            console.log('[analytics]', payload);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as CoachUserProfile;
                setUserProfile(parsed);
                setAppState(prev => ({ ...prev, userProfile: parsed }));
            }
        } catch (error) {
            console.warn('[profile] failed to load stored profile', error);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            if (userProfile) {
                window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
            } else {
                window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
            }
        } catch (error) {
            console.warn('[profile] failed to persist profile', error);
        }
    }, [userProfile]);

    const applyPlanToPrediction = useCallback((prediction: ReadinessPrediction | null, plan: NextSetPlan): ReadinessPrediction | null => {
        if (!prediction) return prediction;
        const updated: ReadinessPrediction = {
            ...prediction,
            coachPlan: plan,
        };

        switch (plan.kind) {
            case 'drop5':
                updated.nextSetWeightAdjustment = -0.05;
                updated.weightAdjustmentMessage = 'Suggested: reduce load ~5% next set.';
                break;
            case 'drop10':
                updated.nextSetWeightAdjustment = -0.10;
                updated.weightAdjustmentMessage = 'Suggested: reduce load ~10% next set.';
                break;
            case 'add12':
                updated.nextSetWeightAdjustment = (updated.nextSetWeightAdjustment ?? 0) + 0.05;
                updated.weightAdjustmentMessage = 'Suggested: add 1–2 reps or +5% if crisp.';
                break;
            case 'cap1':
                updated.nextSetRepCap = Math.max(1, (updated.reps?.length ?? 1)) - 1;
                break;
            case 'rest60':
                updated.restAdjustmentSeconds = (updated.restAdjustmentSeconds ?? 0) + 60;
                updated.nextSetRestSeconds = (updated.nextSetRestSeconds ?? 60) + 60;
                break;
            case 'technique':
                updated.nextSetTechniqueFocus = 'technique';
                break;
            case 'tempo212':
                updated.nextSetTempo = '2-1-2';
                break;
            case 'hold':
            default:
                break;
        }

        const restBump = typeof plan.params?.restBumpSec === 'number' ? Math.round(plan.params.restBumpSec) : 0;
        if (restBump !== 0) {
            const baseRest = Number.isFinite(updated.nextSetRestSeconds) ? (updated.nextSetRestSeconds ?? 90) : 90;
            updated.restAdjustmentSeconds = (updated.restAdjustmentSeconds ?? 0) + restBump;
            updated.nextSetRestSeconds = Math.max(30, baseRest + restBump);
        }

        const repDelta = typeof plan.params?.repDelta === 'number' ? Math.round(plan.params.repDelta) : 0;
        if (repDelta !== 0) {
            const currentReps = updated.reps?.length ?? updated.totalReps.length ?? 0;
            const proposed = currentReps + repDelta;
            updated.nextSetRepCap = Math.max(1, proposed);
        }

        return updated;
    }, []);

    const planToScenario = useCallback((kind: NextSetPlan['kind']): ScenarioBucket => {
        switch (kind) {
            case 'drop5':
                return 'small_drop';
            case 'drop10':
                return 'big_drop';
            case 'add12':
                return 'push';
            case 'cap1':
                return 'quality_flag';
            case 'rest60':
                return 'rest_short';
            case 'technique':
                return 'low_readiness';
            case 'tempo212':
                return 'symmetry';
            case 'hold':
            default:
                return 'default';
        }
    }, []);

    const recordCoachOutcome = useCallback((signal: OutcomeSignal) => {
        const reward = computeReward(signal);
        logAnalyticsEvent('coach_feedback_outcome', { ...signal, reward });
    }, [logAnalyticsEvent]);

    useEffect(() => {
        if (coachInsightState.status !== 'ready' || !coachInsightEnvelope) return;
        const messageId = coachInsightEnvelope.message.id;
        if (lastLoggedCoachInsightIdRef.current === messageId) return;
        lastLoggedCoachInsightIdRef.current = messageId;
        const meta = coachInsightEnvelope.meta;
        logAnalyticsEvent('coach_insight_shown', {
            type: meta.type,
            state: meta.state,
            confidence: meta.confidence,
            metric: null,
            source: meta.source,
        });
    }, [coachInsightState.status, coachInsightEnvelope, logAnalyticsEvent]);
    
    // Tutorial State
    const [onboardStep, setOnboardStep] = useState(1);

    // Coach / Chat State

    const localeInfo = useMemo(() => {
        let locale: string | null = null;
        let timezone: string | null = null;
        try {
            if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
                const opts = Intl.DateTimeFormat().resolvedOptions();
                locale = opts.locale ?? null;
                timezone = opts.timeZone ?? null;
            }
        } catch {
            // ignore resolution errors
        }
        if (!locale && typeof navigator !== 'undefined' && navigator.language) {
            locale = navigator.language;
        }
        return { locale: locale ?? 'en-US', timezone };
    }, []);

    useEffect(() => {
        if (undoTimerRef.current) {
            window.clearTimeout(undoTimerRef.current);
            undoTimerRef.current = null;
        }
        if (!activeUndo) return;
        const remaining = Math.max(0, activeUndo.expiresAt - Date.now());
        const timeoutId = window.setTimeout(() => {
            setActiveUndo(null);
        }, remaining);
        undoTimerRef.current = timeoutId;
        return () => {
            if (undoTimerRef.current) {
                window.clearTimeout(undoTimerRef.current);
                undoTimerRef.current = null;
            }
        };
    }, [activeUndo]);

    const registerUndo = useCallback((type: UndoActionType, label: string, snapshot: UndoState['sessionSnapshot']) => {
        setActiveUndo({
            type,
            label,
            sessionSnapshot: snapshot,
            expiresAt: Date.now() + 5000,
        });
    }, []);

    const fatigueEnabled = FEATURE_FATIGUE_DETECTOR;
    const latestFatigueTimeRef = useRef<number>(0);
    const fatigueBaselineRef = useRef<{ baseline: number | null; sum: number; count: number }>({ baseline: null, sum: 0, count: 0 });
    const fatigueFallStartRef = useRef<number | null>(null);
    const fatigueFallRepCountRef = useRef(0);
    const fatigueFallDismissedRef = useRef(false);
    const [fatigueFallDismissed, setFatigueFallDismissed] = useState(false);
    const fatigueConfidenceRef = useRef(0);
    const maybeGenerateInsightRef = useRef<(reason: 'state' | 'checkpoint' | 'prefailure', state?: FatigueState, confidence?: number) => void>(() => {});

    const handleFatigueStateEvent = useCallback(
        (event: FatigueStateEvent) => {
            if (!fatigueEnabled) return;
            coordinatorFatigueRef.current = event.state;
            logAnalyticsEvent('fatigue.state_change', {
                from: event.previousState,
                to: event.state,
                confidence: event.confidence,
                tInPrevState: Number.isFinite(event.tInPrevState) ? Number(event.tInPrevState.toFixed(2)) : event.tInPrevState,
            });

            if (event.state === 'fall') {
                if (event.previousState !== 'fall') {
                    fatigueFallStartRef.current = latestFatigueTimeRef.current;
                    fatigueFallRepCountRef.current = Math.max(fatigueFallRepCountRef.current, 0);
                    fatigueFallDismissedRef.current = false;
                    setFatigueFallDismissed(false);
                    logAnalyticsEvent('fatigue.cta_shown', {});
                }
            } else {
                fatigueFallStartRef.current = null;
                fatigueFallRepCountRef.current = 0;
                fatigueFallDismissedRef.current = false;
                if (fatigueFallDismissed) {
                    setFatigueFallDismissed(false);
                }
            }

            maybeGenerateInsightRef.current('state', event.state, event.confidence);
        },
        [fatigueEnabled, logAnalyticsEvent, fatigueFallDismissed],
    );

    const {
        state: fatigueState,
        confidence: fatigueConfidence,
        update: updateFatigue,
        reset: resetFatigue,
    } = useFatigueDetector({
        config: fatigueEnabled ? {} : { requireMdfConfirmation: false },
        onStateEvent: handleFatigueStateEvent,
        onDebugEvent: (event: FatigueDebugEvent) => {
            lastDebugEventRef.current = event;
        },
    });

    useEffect(() => {
        if (!fatigueEnabled) return;
        coordinatorFatigueRef.current = fatigueState;
        if (fatigueState !== 'fall' && fatigueFallDismissed) {
            fatigueFallDismissedRef.current = false;
            setFatigueFallDismissed(false);
        }
    }, [fatigueState, fatigueEnabled, fatigueFallDismissed]);

    useEffect(() => {
        fatigueConfidenceRef.current = fatigueConfidence ?? 0;
    }, [fatigueConfidence]);

    const restCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearRestCountdown = useCallback(() => {
        if (restCountdownIntervalRef.current) {
            clearInterval(restCountdownIntervalRef.current);
            restCountdownIntervalRef.current = null;
        }
    }, []);

    const processFatigueSample = useCallback(
        (rawPeak: number) => {
            if (!fatigueEnabled) return;
            const predictorAdapter = predictor.current;
            const repCount = predictorAdapter?.reps.length ?? 0;
            const maxPeak = predictorAdapter?.maxPeakInSet ?? rawPeak;
            const baselinePeak = predictorAdapter?.preMVCpct ?? null;
            const currentReadinessValue = predictorAdapter?.currentReadiness ?? baselinePeak ?? null;

            const dropRatio = maxPeak > 0 ? Math.max(0, (maxPeak - rawPeak) / maxPeak) : 0;
            const readinessDrop = baselinePeak && currentReadinessValue != null && baselinePeak > 0
                ? Math.max(0, (baselinePeak - currentReadinessValue) / baselinePeak)
                : 0;
            const fatigueRamp = Math.min(1, repCount / 8);

            const baseAmplitude = Math.max(0.35, Math.max(0, rawPeak) / 120);
            const amplitudeBoost = dropRatio * 0.6 + readinessDrop * 0.45 + fatigueRamp * 0.25;
            const noise = (Math.random() - 0.5) * 0.06;
            const effectiveAmplitude = Math.min(3, Math.max(0.2, baseAmplitude + amplitudeBoost + noise));

            const baselineTracker = fatigueBaselineRef.current;
            const nowSec = performance.now() / 1000;
            latestFatigueTimeRef.current = nowSec;
            const history = fatigueHistoryRef.current;

            if (baselineTracker.baseline == null) {
                baselineTracker.sum += effectiveAmplitude;
                baselineTracker.count += 1;
                history.push({ t: nowSec, rmsNorm: effectiveAmplitude });
                while (history.length && nowSec - history[0].t > 15) {
                    history.shift();
                }
                if (baselineTracker.count >= 5) {
                    baselineTracker.baseline = baselineTracker.sum / baselineTracker.count;
                }
                return;
            }

            const baseline = baselineTracker.baseline;
            const normalized = (effectiveAmplitude - baseline) / Math.max(1e-6, baseline);
            const clipped = Math.max(-2, Math.min(3, normalized));
            updateFatigue({ nowSec, rmsNorm: clipped });
            history.push({ t: nowSec, rmsNorm: clipped });
            while (history.length && nowSec - history[0].t > 15) {
                history.shift();
            }

            if (fatigueStateRef.current === 'fall') {
                fatigueFallRepCountRef.current += 1;
            }
        },
        [fatigueEnabled, updateFatigue],
    );

    useEffect(() => {
        if (!fatigueEnabled) return;
        if (sessionPhase === 'active') {
            fatigueBaselineRef.current = { baseline: null, sum: 0, count: 0 };
            fatigueFallStartRef.current = null;
            fatigueFallRepCountRef.current = 0;
            fatigueFallDismissedRef.current = false;
            setFatigueFallDismissed(false);
            resetFatigue();
            fatigueHistoryRef.current = [];
        }
    }, [sessionPhase, fatigueEnabled, resetFatigue]);

    const buildCoachInsightContext = useCallback((state: FatigueState, confidenceValue: number): CoachInsightContext | null => {
        if (!coachLlmEnabled || !fatigueEnabled) return null;
        const history = fatigueHistoryRef.current;
        if (history.length === 0) return null;
        const latest = history[history.length - 1];
        const nowSec = latest.t;
        const windowSec = 8;
        let reference = history[0];
        for (let i = history.length - 1; i >= 0; i -= 1) {
            if (nowSec - history[i].t >= windowSec) {
                reference = history[i];
                break;
            }
        }

        const rmsChange = (latest.rmsNorm - reference.rmsNorm) * 100;
        const mdfChange = reference.mdfNorm != null && latest.mdfNorm != null ? (latest.mdfNorm - reference.mdfNorm) * 100 : null;
        const debug = lastDebugEventRef.current;
        const slope = debug?.slope ?? 0;
        const rorTrend: 'down' | 'flat' | 'up' = slope >= 0.5 ? 'up' : slope <= -0.5 ? 'down' : 'flat';
        const repIndex = sessionData?.reps?.length ?? 0;
        const exerciseName = sessionData?.intensityPill?.text ?? 'Working set';
        const readinessNow = Number.isFinite(sessionData?.currentReadiness) ? sessionData?.currentReadiness ?? null : null;
        const baselineReadinessValue = Number.isFinite(preSetReadiness) ? preSetReadiness : Number.isFinite(sessionData?.readiness) ? sessionData?.readiness ?? null : null;
        const fatigueDetected = sessionData?.fatigueDetected ?? false;
        const restSeconds = Number.isFinite(sessionData?.nextSetRestSeconds) ? sessionData?.nextSetRestSeconds ?? 0 : 0;
        const strain = Number.isFinite(sessionData?.sessionNmTrimp) ? Math.min(100, Math.max(0, Math.round(sessionData?.sessionNmTrimp ?? 0))) : null;

        return {
            user: { id: 'anon', experience: 'intermediate' },
            exercise: { name: exerciseName, phase: 'set', rep: repIndex },
            state,
            confidence: Math.max(0, Math.min(1, confidenceValue)),
            readiness: readinessNow,
            baselineReadiness: baselineReadinessValue,
            fatigueDetected,
            rir: null,
            symmetryPct: null,
            rorTrend,
            strain,
            restSeconds,
            notes: null,
            metrics: {
                rms_change_pct_last_8s: rmsChange,
                mdf_change_pct_last_8s: mdfChange,
                ror_trend: rorTrend,
                symmetry_pct_diff: null,
                motion_artifact: 0,
            },
            limits: {
                speak_min_gap_sec: 6,
                max_messages_per_set: 3,
                artifact_threshold: 0.3,
            },
        };
    }, [coachLlmEnabled, fatigueEnabled, sessionData, preSetReadiness]);

    const buildFallbackCoachInsight = useCallback((state: FatigueState, confidenceValue: number): CoachInsight => {
        const safeConfidence = Number.isFinite(confidenceValue) ? Math.max(0, Math.min(1, confidenceValue)) : 0;
        let headlineText = 'Good work—catch your breath and stay sharp.';
        let type: CoachInsight['type'] = 'suggestion';
        let actions: CoachInsight['actions'] = [];

        if (state === 'rise') {
            headlineText = 'Plenty in the tank—breathe and keep it smooth next set.';
            type = 'suggestion';
        } else if (state === 'plateau') {
            headlineText = 'Steady output—stay precise and repeat that rhythm.';
            type = 'suggestion';
        } else if (state === 'fall') {
            headlineText = "Quality slipped—let's rack there and protect the pattern.";
            type = 'caution';
            actions = ['end_set'];
        }

        const tag = state === 'rise' ? 'Rise' : state === 'plateau' ? 'Plateau' : 'Fall';

        return {
            source: 'fallback',
            state,
            type,
            headline: headlineText,
            subline: undefined,
            tip: undefined,
            tags: [tag],
            actions,
            rest_seconds: 0,
            confidence: safeConfidence,
            metric_cited: null,
        };
    }, []);

    const maybeGenerateInsight = useCallback((reason: 'state' | 'checkpoint' | 'prefailure', stateOverride?: FatigueState, confidenceOverride?: number) => {
        if (!fatigueEnabled) return;
        const currentState = stateOverride ?? coordinatorFatigueRef.current ?? fatigueState;
        if (!currentState) return;
        const confidenceValue = confidenceOverride ?? fatigueConfidenceRef.current ?? 0;
        const context = buildCoachInsightContext(currentState, confidenceValue);
        const fallback = buildFallbackCoachInsight(currentState, confidenceValue);
        requestCoachInsight({
            context,
            reason,
            tier: 'in_set',
            fallback,
        });
    }, [fatigueEnabled, buildCoachInsightContext, buildFallbackCoachInsight, requestCoachInsight, fatigueState]);

    useEffect(() => {
        maybeGenerateInsightRef.current = maybeGenerateInsight;
    }, [maybeGenerateInsight]);

    useEffect(() => {
        if (!coachLlmEnabled || !fatigueEnabled) return;
        if (sessionPhase !== 'active') return;
        const interval = window.setInterval(() => {
            const orchestrator = orchestratorRef.current;
            if (!orchestrator) return;
            const lastTs = orchestrator.getLastInsightTimestamp();
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            if (now - lastTs < 10000) return;
            maybeGenerateInsightRef.current('checkpoint');
        }, 2000);
        return () => window.clearInterval(interval);
    }, [coachLlmEnabled, fatigueEnabled, sessionPhase]);

    const classifyCoachIntent = useCallback((raw: string): CoachIntent => {
        const text = raw.toLowerCase();
        const has = (pattern: RegExp) => pattern.test(text);
        if (has(/what[- ]?if/) || has(/strong(er|est)?|strength|gain strength|build strength|power/)) {
            return 'strength_improvement';
        }
        if (text.includes('%') || has(/\btrend\b|week over week|w\/o\b|wow\b/)) {
            return 'trend_explanation';
        }
        if (has(/\bfatigue\b|\banalysis\b|\brecap\b|\breview\b/)) {
            return 'post_session_analysis';
        }
        if (has(/\brest\b|\binterval\b|\bbreak\b/)) {
            return 'rest_interval';
        }
        if (has(/\brecover\b|\brecovery\b|\bcool[- ]?down\b|\bwarm[- ]?up\b|\brefuel\b|\bhydrate\b|\bsleep\b/)) {
            return 'recovery_action';
        }
        if (has(/\bfocus\b|\bwork on\b|\bmobility\b|\blight work\b|\btoday'?s focus\b/)) {
            return 'session_focus';
        }
        if (has(/\bplan\b|\bschedule\b|\bcalendar\b|\bweek\b|\bnext heavy\b/)) {
            return 'plan_next';
        }
        if (has(/\bwhen\b|\bready\b|\btrain\b|\bwork ?out\b|\bnext session\b|\bstart\b/)) {
            return 'when_to_train';
        }
        return 'when_to_train';
    }, []);

    const recoverySlopePerHr = useMemo(() => {
        if (!trendPoints || trendPoints.length < 2) return null;
        const recentPoints = trendPoints.slice(-2);
        const [prev, last] = recentPoints;
        const prevDate = toDate(prev.date);
        const lastDate = toDate(last.date);
        const diffHours = (lastDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60);
        if (!Number.isFinite(diffHours) || diffHours <= 0) return null;
        const slope = (last.readiness - prev.readiness) / diffHours;
        return Number.isFinite(slope) ? Number(slope.toFixed(2)) : null;
    }, [trendPoints]);

    const buildStrengthPlannerContext = useCallback((): StrengthContext | null => {
        const fallbackReadiness =
            readinessScore ??
            lastRestSummary?.postReadiness ??
            lastRestSummary?.preReadiness ??
            (sessionData?.currentReadiness ?? null);

        if (fallbackReadiness == null) return null;
        try {
            const now = new Date();
            const lastSession = sessionsHistory.length > 0 ? sessionsHistory[sessionsHistory.length - 1] : null;
            const lastSessionDate = lastSession ? toDate(lastSession.date) : undefined;
            const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

            let weeklySets = 0;
            let symmetrySum = 0;
            let symmetryCount = 0;

            sessionsHistory.forEach((session) => {
                const sessionDate = toDate(session.date);
                if (sessionDate.getTime() >= sevenDaysAgo) {
                    const repsCount = Array.isArray(session.reps) ? session.reps.length : 0;
                    const estimatedSets = Math.max(1, Math.round(repsCount / 5));
                    weeklySets += estimatedSets;
                    if (typeof session.balanceScore === 'number') {
                        symmetrySum += session.balanceScore;
                        symmetryCount += 1;
                    }
                }
            });

            const history = {
                weeklyStrengthSetsDone: weeklySets,
                weeklyStrengthTarget: 12,
                lastSessionEnd: lastSessionDate?.toISOString(),
                lastSameMuscleSessionEnd: lastSessionDate?.toISOString(),
                sym7dAvg: symmetryCount > 0 ? symmetrySum / symmetryCount : undefined,
            };

            let gateStatus: 'GO' | 'CAUTION' | 'STOP' = 'GO';
            let gateReason = 'ready';
            if (readinessScore < 45) {
                gateStatus = 'STOP';
                gateReason = 'low_readiness';
            } else if (readinessScore < 55) {
                gateStatus = 'CAUTION';
                gateReason = 'moderate_readiness';
            }

            const minutesSinceLastSetEnd =
                sessionPhase === 'set-summary' && lastSetCoachSummary
                    ? (now.getTime() - lastSetCoachSummary.timestamp) / 60000
                    : undefined;

            return computeContext({
                now,
                muscleGroup: lastSetCoachSummary?.exerciseName ?? 'main lift',
                lastSessionStart: lastSessionDate,
                lastSessionEnd: lastSessionDate,
                lastSameMuscleEnd: lastSessionDate,
                minutesSinceLastSetEnd,
                todaySession: undefined,
                recovery: {
                    readiness: fallbackReadiness,
                    readinessSlopePerHr: recoverySlopePerHr ?? undefined,
                },
                gates: { status: gateStatus, reason: gateReason },
                history,
            });
        } catch (error) {
            console.warn('[coach] computeContext failed', error);
            return null;
        }
    }, [readinessScore, lastRestSummary, sessionData?.currentReadiness, sessionsHistory, lastSetCoachSummary, recoverySlopePerHr, sessionPhase]);

    const buildPlanReceipts = useCallback(
        (context: StrengthContext, trace: ReturnType<typeof decideStrengthPlan>['trace']) => {
            const fatigue = context.todaySession?.summaries?.fatigue;
            const bestOption = trace.options[0];
            const roiLine =
                bestOption != null
                    ? `Best ROI: ${labelPlanMode(bestOption.id)} ~${bestOption.strength_gain_pct.toFixed(1)}% at cost ${bestOption.readiness_delta}`
                    : undefined;

            return {
                readiness: context.recovery.readiness,
                fatigue: {
                    rms: fatigue?.rmsDropPct,
                    ror: fatigue?.rorDropPct,
                },
                symmetry: context.todaySession?.summaries?.avgSymmetryPct ?? context.history.sym7dAvg,
                sinceSameMuscleHrs: context.history.hoursSinceLastSameMuscle,
                roiLine,
            };
        },
        [],
    );

    const formatPlannerReply = useCallback(
        ({
            summary,
            receipts,
        }: {
            summary: CoachSummary;
            receipts: ReturnType<typeof buildPlanReceipts>;
        }) => {
            const lines = [summary.message];
            if (summary.secondary) lines.push(summary.secondary);
            lines.push(summary.cta);
            const metrics = [
                `Readiness ${Math.round(receipts.readiness)}`,
                typeof receipts.fatigue.rms === 'number' ? `RMS Δ ${Math.round(receipts.fatigue.rms)}%` : null,
                typeof receipts.fatigue.ror === 'number' ? `RoR Δ ${Math.round(receipts.fatigue.ror)}%` : null,
                typeof receipts.symmetry === 'number' ? `Sym ${Math.round(receipts.symmetry)}%` : null,
                typeof receipts.sinceSameMuscleHrs === 'number'
                    ? `${Math.round(receipts.sinceSameMuscleHrs)}h since same muscle`
                    : null,
            ]
                .filter(Boolean)
                .join(' · ');
            if (metrics) lines.push(metrics);
            if (receipts.roiLine) lines.push(receipts.roiLine);
            return lines.join('\n\n');
        },
        [buildPlanReceipts],
    );

    const shouldAnswerWithPlanner = useCallback(
        (question: string, questionIntent?: CoachIntent) => {
            if (!question) return false;
            if (questionIntent && ['plan_next', 'session_focus', 'when_to_train'].includes(questionIntent)) {
                return true;
            }
            const keywords = [
                'should i train',
                'train today',
                'do i train',
                'workout today',
                'active recovery',
                'rest day',
                'strength plan',
                'what should i do',
                'should i rest',
                'rest or train',
            ];
            return keywords.some((keyword) => question.includes(keyword));
        },
        [],
    );

    const activeStopSuggestion = useMemo(() => {
        if (!coachPrefs.allowStopSuggestions || coachPrefs.suppressStopsForSession) return null;
        const suggestion = sessionData?.stopSuggestion ?? null;
        if (!suggestion) return null;
        const key = buildSuggestionKey(suggestion);
        if (dismissedSuggestionKeys.includes(key)) return null;
        return { key, suggestion };
    }, [coachPrefs.allowStopSuggestions, coachPrefs.suppressStopsForSession, sessionData?.stopSuggestion, dismissedSuggestionKeys]);

    const buildStrengthScenarioMessage = useCallback((): string | null => {
        if (!lastSetCoachSummary) return null;
        const scenarios = generateStrengthScenarios(lastSetCoachSummary.metrics);
        let responseText = formatStrengthScenarios(
            lastSetCoachSummary.metrics,
            scenarios,
            lastSetCoachSummary.exerciseName ?? null,
        );
        const restAdvice = lastSetCoachSummary.restAdvice;
        if (restAdvice) {
            responseText += `\n\nRest guidance: ${restAdvice.primary} (${restAdvice.secondary}) — Rest ${restAdvice.restSeconds}s, effort delta ${restAdvice.effortDelta}.`;
        }
        return responseText;
    }, [lastSetCoachSummary]);

    useEffect(() => {
        if (!activeStopSuggestion) return;
        if (lastSuggestionKeyRef.current === activeStopSuggestion.key) return;
        lastSuggestionKeyRef.current = activeStopSuggestion.key;
        logAnalyticsEvent('coach_stop_suggested', {
            target: activeStopSuggestion.suggestion.target,
            reasons: activeStopSuggestion.suggestion.reasons,
            confidence: activeStopSuggestion.suggestion.confidence,
            stage: sessionPhase,
            repIndex: sessionData?.reps?.length ?? 0,
        });
    }, [activeStopSuggestion, logAnalyticsEvent, sessionPhase, sessionData]);

    useEffect(() => {
        if (!activeStopSuggestion || !coachPrefs.vibrateOnSuggestion) return;
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
                navigator.vibrate(160);
            } catch {
                // ignore vibration errors
            }
        }
    }, [activeStopSuggestion?.key, coachPrefs.vibrateOnSuggestion]);

    const buildCoachPromptArgs = useCallback(
        (question: string, intentOverride?: CoachIntent): ComposeCoachPromptArgs => {
            const trimmed = question.trim();
            const lowerQuestion = trimmed.toLowerCase();
            const intent = intentOverride ?? classifyCoachIntent(trimmed);
            const lastSession = sessionsHistory?.[sessionsHistory.length - 1] ?? null;
            const lastSessionDate = lastSession ? toDate(lastSession.date) : null;
            const nextDate = nextOptimalDate ?? null;
            const now = Date.now();
            const timeToNextHoursRaw = nextDate ? (nextDate.getTime() - now) / (1000 * 60 * 60) : null;
            const roundedTimeToNext = timeToNextHoursRaw != null ? Math.max(0, Math.round(timeToNextHoursRaw)) : null;
            const timeSinceMinutes = lastSessionDate ? (now - lastSessionDate.getTime()) / (1000 * 60) : null;
            const timeSinceHours = timeSinceMinutes != null ? Math.max(0, Math.round(timeSinceMinutes / 60)) : null;
            const derivedContext = coachFeedback?.context ?? getCoachContext({ lastSessionDate, nextOptimalDate: nextDate });
            const nextOptimalLabel = nextDate
                ? `${nextDate.toLocaleDateString([], { weekday: 'long' })} • ${nextDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()}`
                : null;
            const ctaCandidate = coachFeedback?.cta.text ?? 'Plan Next Session';
            const dataSyncOK = coachFeedback?.dataSyncOK ?? Boolean(readinessScore != null);
            const reduceMotion = (() => {
                if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
                try {
                    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                } catch {
                    return false;
                }
            })();

            const lastRawPeak = rawPeakHistory.length > 0 ? rawPeakHistory[rawPeakHistory.length - 1] : null;
            let symmetryNote: "high" | "low" | null = null;
            let symmetryIndex: number | null = null;
            if (lastRawPeak) {
                const left = typeof lastRawPeak.leftPeak === 'number' ? lastRawPeak.leftPeak : null;
                const right = typeof lastRawPeak.rightPeak === 'number' ? lastRawPeak.rightPeak : null;
                if (left !== null && right !== null) {
                    const average = (left + right) / 2 || 1;
                    const diffRatio = Math.abs(left - right) / average;
                    const computedIndex = Math.max(0, Math.min(100, Math.round((1 - diffRatio) * 100)));
                    symmetryIndex = computedIndex;
                    if (diffRatio <= 0.08) {
                        symmetryNote = "high";
                    } else if (diffRatio >= 0.15) {
                        symmetryNote = "low";
                    }
                }
            }

            const lastThreeSessions = sessionsHistory.slice(-3).map(s => ({
                date: toDate(s.date).toLocaleDateString(),
                totalReps: s.totalReps.length,
                postWorkoutReadiness: s.post,
            }));

    const lastSessionContext = {
                exercise: null,
                fatigueRep: null,
                peakedRep: null,
                symmetryNote,
                recentPR: justAchievedPR ? true : null,
                recentSessions: lastThreeSessions,
            };

            const contextBundle: CoachPromptContextInput = {
                recoveryScore: readinessScore ?? null,
                recoverySlopePerHr,
                strengthTrendWoW: Number.isFinite(weeklyTrend) ? Math.round(weeklyTrend) : null,
                timeToNextOptimalHours: roundedTimeToNext,
                nextOptimalLabel,
                timeSinceLastSessionHours: timeSinceHours,
                symmetryIndex,
                lastSession: lastSessionContext,
                user: {
                    goal: null,
                    timezone: localeInfo.timezone,
                    locale: localeInfo.locale,
                    userPrefs: {
                        preferredDayparts: null,
                        sessionLengthMin: null,
                    },
                    profile: userProfile,
                },
                constraints: {
                    todayBusyUntil: null,
                    travel: null,
                },
                subjectives: {
                    fatigueSelfReport: null,
                    sleepHrs: null,
                    soreness: null,
                    stress: null,
                    mood: null,
                    timeAvailableMin: null,
                },
                ui: {
                    ctaCandidate,
                    reduceMotion,
                },
                dataSyncOK,
                coachState: derivedContext,
                currentPlan: planSummaryForCoach,
            };

            const timingMissing = contextBundle.timeToNextOptimalHours == null || !contextBundle.nextOptimalLabel;
            const timingKeywords = ['when', 'ready', 'time', 'next', 'schedule', 'plan'];
            const needsTiming =
                timingMissing &&
                (intent === 'when_to_train' ||
                    intent === 'plan_next' ||
                    timingKeywords.some((keyword) => lowerQuestion.includes(keyword)));

            const summaryKey = lastSetCoachSummary
                ? [
                      lastSetCoachSummary.metrics.zone,
                      lastSetCoachSummary.metrics.fatigueRep ?? 'null',
                      lastSetCoachSummary.metrics.totalRisePct.toFixed(3),
                      lastSetCoachSummary.metrics.slopePctPerRep.toFixed(3),
                      lastSetCoachSummary.metrics.signalConfidenceAvg.toFixed(3),
                  ].join('|')
                : 'none';

            return {
                question: trimmed,
                history: [...chatHistoryForAPI.current],
                sessionSummary: sessionSummaryForCoach ?? {},
                context: contextBundle,
                intent,
                needsTiming,
                mode: 'qa',
                lastSetSummary: lastSetCoachSummary?.metrics ?? null,
                lastSetMeta: lastSetCoachSummary
                    ? {
                          exerciseName: lastSetCoachSummary.exerciseName ?? null,
                          restAdvice: lastSetCoachSummary.restAdvice,
                      }
                    : null,
                cacheKeyExtras: { setSummary: summaryKey },
            };
        },
        [
            sessionsHistory,
            nextOptimalDate,
            coachFeedback,
            sessionSummaryForCoach,
            readinessScore,
            weeklyTrend,
            justAchievedPR,
            classifyCoachIntent,
            getCoachContext,
            rawPeakHistory,
            recoverySlopePerHr,
            localeInfo,
            userProfile,
            lastSetCoachSummary,
            planSummaryForCoach,
        ]
    );

    const processCoachQuestion = useCallback(async ({ question, intent }: { question: string; intent?: CoachIntent }) => {
        coachRequestActiveRef.current = true;
        setIsCoachLoading(true);

        const pushCoachReply = (text: string) => {
            const coachResponse: ChatMessage = {
                id: Date.now() + Math.random(),
                sender: 'coach',
                text,
            };
            chatHistoryForAPI.current.push(coachResponse);
            setChatMessages((prev) => [...prev, coachResponse]);
            setCoachFeedback((prev) =>
                prev
                    ? {
                          ...prev,
                          coach: {
                              ...prev.coach,
                              isTyping: false,
                          },
                      }
                    : prev,
            );

            coachRequestActiveRef.current = false;
            const nextRequestLocal = coachRequestQueueRef.current.shift();
            if (nextRequestLocal) {
                processCoachQuestion(nextRequestLocal);
            } else {
                setIsCoachLoading(false);
            }
        };

        const normalisedQuestion = question.trim().toLowerCase();
        const plannerEligible = shouldAnswerWithPlanner(normalisedQuestion, intent);
        let plannerReply = plannerEligible ? lastPlanReplyRef.current : null;
        if (plannerEligible) {
            const plannerContext = buildStrengthPlannerContext();
            if (plannerContext) {
                const { plan, trace } = decideStrengthPlan(plannerContext);
                const receipts = buildPlanReceipts(plannerContext, trace);
                const summary = fallbackNarration({
                    plan,
                    receipts,
                    decisionTrace: trace,
                });
                const replyText = formatPlannerReply({ summary, receipts });
                plannerReply = { text: replyText, summary, mode: plan.mode };
                lastPlanReplyRef.current = plannerReply;
                if (import.meta.env.DEV) {
                    console.debug('[coach-plan]', { context: plannerContext, plan, trace, summary, receipts });
                }
            }
        }

        if (!lastSetCoachSummary && !plannerReply) {
            const cachedSummary = lastPlanReplyRef.current;
            if (cachedSummary) {
                plannerReply = cachedSummary;
            }
        }

        const request = buildCoachPromptArgs(question, intent);
        const contextKey = JSON.stringify({
            coachState: request.context.coachState,
            cta: request.context.ui.ctaCandidate,
            intent: request.intent,
            needsTiming: request.needsTiming,
            setSummary: request.cacheKeyExtras?.setSummary ?? 'none',
        });
        const questionKey = request.question.toLowerCase();

        let bucket = coachAnswerCacheRef.current.get(contextKey);
        if (!bucket) {
            bucket = new Map<string, string>();
            coachAnswerCacheRef.current.set(contextKey, bucket);
        }

        let answer: string | null = null;

        if (bucket.has(questionKey)) {
            answer = bucket.get(questionKey) ?? null;
            console.info("[Symmetric][CoachAnswer][cache]", {
                question: request.question,
                response: answer,
                state: request.context.coachState,
                intent: request.intent,
                ctaCandidate: request.context.ui.ctaCandidate,
            });
        } else {
            try {
                const controller = new AbortController();
                let response = await fetchCoachAnswer(request, { signal: controller.signal });
                if (!isCoachResponseAligned(response, request.context)) {
                    const retryArgs: ComposeCoachPromptArgs = {
                        ...request,
                        ctaAlignmentHint: `CTA is ${request.context.ui.ctaCandidate ?? 'Plan Next Session'}; align advice.`,
                    };
                    response = await fetchCoachAnswer(retryArgs, { signal: new AbortController().signal });
                }
                answer = response;
                if (answer && !bucket.has(questionKey)) {
                    if (bucket.size >= 3) {
                        const oldestKey = bucket.keys().next().value;
                        if (oldestKey) bucket.delete(oldestKey);
                    }
                    bucket.set(questionKey, answer);
                }
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    console.error("Failed to get coach answer:", error);
                }
                const fallback = buildStrengthScenarioMessage();
                if (fallback) {
                    answer = fallback;
                    if (!bucket.has(questionKey)) {
                        bucket.set(questionKey, fallback);
                    }
                } else {
                    answer = "Let's run another set so I can give you session-specific tweaks.";
                }
            }
        }

        if (!answer || !answer.trim() || answer === GEMINI_COACH_FALLBACK_MESSAGE) {
            if (plannerReply) {
                answer = plannerReply.text;
            } else {
                answer = "I don't have fresh session data yet, so let's keep recovery easy and check back after your next set.";
            }
        }

        if (plannerReply && answer === plannerReply.text) {
            lastPlanReplyRef.current = plannerReply;
        }

        if (answer) {
            const coachResponse: ChatMessage = { id: Date.now() + Math.random(), sender: 'coach', text: answer };
            chatHistoryForAPI.current.push(coachResponse);
            setChatMessages(prev => [...prev, coachResponse]);
        }

        setCoachFeedback(prev => prev ? {
            ...prev,
            coach: {
                ...prev.coach,
                isTyping: false,
            },
        } : prev);

        coachRequestActiveRef.current = false;
        const nextRequest = coachRequestQueueRef.current.shift();
        if (nextRequest) {
            processCoachQuestion(nextRequest);
            return;
        }
        setIsCoachLoading(false);
    }, [
        buildCoachPromptArgs,
        fetchCoachAnswer,
        buildStrengthScenarioMessage,
        lastSetCoachSummary,
        buildStrengthPlannerContext,
        buildPlanReceipts,
        shouldAnswerWithPlanner,
        formatPlannerReply,
        fallbackNarration,
        decideStrengthPlan,
    ]);

    
    const settings = { repsPerSide: 3 };

    useEffect(() => {
        const history = loadHistory();
        if (history && (history.sessionsHistory?.length || 0) > 0) {
            setSessionsHistory(history.sessionsHistory || []);
            setTrendPoints(history.trendPoints || []);
            setRawPeakHistory(history.rawPeakHistory || []);
            setMaxMvcEver(history.mvcBaseline || 200);
            setReadinessTestCount(history.realTests ?? 0);
            const lastTrend = history.trendPoints?.[history.trendPoints.length - 1];
            if (lastTrend) {
                setReadinessScore(lastTrend.readiness);
                setInitialReadinessScore(lastTrend.readiness);
            }
        } else {
            const sim = generateSimulatedHistory(68);
            setSessionsHistory(sim.sessionsHistory);
            setTrendPoints(sim.trendPoints);
            setRawPeakHistory(sim.rawPeakHistory);
            setMaxMvcEver(sim.maxMvc);
            setReadinessTestCount(0);
            const lastTrend = sim.trendPoints?.[sim.trendPoints.length - 1];
            if (lastTrend) {
                setReadinessScore(lastTrend.readiness);
                setInitialReadinessScore(lastTrend.readiness);
            }
        }
        
        try {
            const seen = localStorage.getItem(LIVE_TUTORIAL_KEY) === 'true';
            setOnboardStep(seen ? 99 : 1);
        } catch(e) {
            setOnboardStep(1);
        }
    }, []);

    useEffect(() => {
        if(readinessScore !== null) {
            setNextOptimalDate(getRecoveryDate(readinessScore));
        }
    }, [readinessScore]);

    // Effect for handling the post-workout analysis fetch, which is the source of the abort error.
    useEffect(() => {
        if (!sessionJustCompleted || !sessionSummaryForCoach) {
            return;
        }

        const abortController = new AbortController();
        const getAnalysis = async () => {
            // Loading state is managed by the other effect, we just need to fetch here.
            try {
                const analysis = await fetchPostWorkoutAnalysis(sessionSummaryForCoach, { signal: abortController.signal });
                if (abortController.signal.aborted) return;

                const initialMessage: ChatMessage = { id: Date.now(), sender: 'coach', text: analysis.intro };
                setChatMessages([initialMessage]);
                chatHistoryForAPI.current = [initialMessage];
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    console.error("Gemini API call for post-workout analysis failed:", err);
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setIsCoachLoading(false); // Turn off loading once fetch is complete or fails
                    setSessionJustCompleted(false);
                    setJustAchievedPR(false);
                }
            }
        };

        getAnalysis();
        
        return () => {
            abortController.abort();
        };
    }, [sessionJustCompleted, sessionSummaryForCoach]);

    // Effect for updating the main home screen feedback and managing loading state
    useEffect(() => {
        const abortController = new AbortController();

        const updateFeedback = async () => {
            setIsCoachLoading(true);
            const isAnyConnected = sensorStatus.left.status === 'connected' || sensorStatus.right.status === 'connected';
            const lastSession = sessionsHistory?.[sessionsHistory.length - 1];

            const lastSessionDate = lastSession ? toDate(lastSession.date) : null;
            const nextDate = nextOptimalDate ?? null;
            const now = Date.now();
            const timeToNextHours = nextDate ? (nextDate.getTime() - now) / (1000 * 60 * 60) : null;
            const timeSinceMinutes = lastSessionDate ? (now - lastSessionDate.getTime()) / (1000 * 60) : null;
            const context = getCoachContext({ lastSessionDate, nextOptimalDate: nextDate });
            const daypartLabel = nextDate
                ? `${nextDate.toLocaleDateString([], { weekday: 'long' })} • ${nextDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()}`
                : null;

            const sessionCoachSummary = sessionSummaryForCoach ?? null;
            const latestSessionSummary = (() => {
                if (!lastSession) return null;
                const readinessStart =
                    typeof lastSession.pre === 'number' && Number.isFinite(lastSession.pre)
                        ? Math.round(lastSession.pre)
                        : null;
                const readinessEnd =
                    typeof lastSession.post === 'number' && Number.isFinite(lastSession.post)
                        ? Math.round(lastSession.post)
                        : null;
                const dropFromHistory =
                    readinessStart != null && readinessEnd != null
                        ? readinessStart - readinessEnd
                        : null;
                const dropFromContext =
                    typeof sessionCoachSummary?.readinessDrop === 'number'
                        ? Math.round(sessionCoachSummary.readinessDrop)
                        : null;
                const durationMinutes =
                    typeof lastSession.durationSec === 'number' && Number.isFinite(lastSession.durationSec)
                        ? Math.max(1, Math.round(lastSession.durationSec / 60))
                        : null;
                const totalSetsFromContext =
                    typeof sessionCoachSummary?.totalSets === 'number'
                        ? sessionCoachSummary.totalSets
                        : Array.isArray(sessionCoachSummary?.setsData)
                        ? sessionCoachSummary.setsData.length
                        : null;
                const primaryExercises =
                    Array.isArray(sessionCoachSummary?.primaryExercises)
                        ? sessionCoachSummary.primaryExercises
                              .filter((name): name is string => typeof name === 'string')
                              .map((name) => name.trim())
                              .filter((name) => name.length > 0)
                        : [];

                return {
                    readinessStart,
                    readinessEnd,
                    readinessDrop:
                        dropFromContext ?? (dropFromHistory != null ? dropFromHistory : null),
                    durationMinutes,
                    totalSets: totalSetsFromContext != null ? totalSetsFromContext : null,
                    primaryExercises: primaryExercises.length > 0 ? primaryExercises : undefined,
                };
            })();

            const upcomingPlanSummary = (() => {
                if (!latestWorkoutPlan) return null;
                const projected = latestWorkoutPlan.projected ?? null;
                const readinessStart =
                    typeof projected?.readinessBefore === 'number' && Number.isFinite(projected.readinessBefore)
                        ? Math.round(projected.readinessBefore)
                        : typeof latestWorkoutPlan.plan_meta?.readiness === 'number'
                        ? Math.round(latestWorkoutPlan.plan_meta.readiness)
                        : null;
                const readinessEnd =
                    typeof projected?.readinessAfter === 'number' && Number.isFinite(projected.readinessAfter)
                        ? Math.round(projected.readinessAfter)
                        : null;
                const projectedDrop =
                    typeof projected?.delta === 'number' && Number.isFinite(projected.delta)
                        ? Math.round(projected.delta)
                        : readinessStart != null && readinessEnd != null
                        ? readinessStart - readinessEnd
                        : null;
                const totalSets = latestWorkoutPlan.blocks.reduce((sum, block) => {
                    const sets = block.prescription?.sets;
                    if (typeof sets === 'number' && Number.isFinite(sets)) {
                        return sum + sets;
                    }
                    return sum;
                }, 0);
                const primaryExercises = latestWorkoutPlan.blocks
                    .map((block): string | null => {
                        const value = block.exercise?.name ?? block.label ?? null;
                        return typeof value === 'string' ? value.trim() : null;
                    })
                    .filter((name): name is string => Boolean(name && name.length));
                const uniqueExercises: string[] = Array.from(new Set(primaryExercises));

                return {
                    intent: latestWorkoutPlan.plan_meta?.intent ?? null,
                    readinessStart,
                    readinessEnd,
                    projectedDrop,
                    totalSets: totalSets > 0 ? totalSets : null,
                    primaryExercises:
                        uniqueExercises.length > 0 ? uniqueExercises.map((value: string) => value.trim()) : undefined,
                    mobilitySuggestion: null,
                };
            })();

            const coachData = {
                recoveryScore: readinessScore,
                strengthTrendWoW: Number.isFinite(weeklyTrend) ? weeklyTrend : null,
                nextOptimalDatetime: nextDate,
                timeToNextOptimalHours: timeToNextHours,
                timeSinceLastSessionMinutes: timeSinceMinutes,
                daypartLabel,
                recentPR: justAchievedPR,
                streakDays: 0,
                dataSyncOK: readinessScore != null,
                context,
                userProfile,
                latestSessionSummary,
                upcomingPlanSummary,
            };

            // Get base feedback with fallback hero copy
            const feedback = getSymmetricHomePageData(coachData, isAnyConnected);

            try {
                // Fetch Gemini-generated hero copy
                const heroCopy = await fetchHomeHeroCopy(coachData, feedback.cta, { signal: abortController.signal });

                const heroLine1 = heroCopy?.line1?.trim?.() ?? '';
                const heroLine2 = heroCopy?.line2?.trim?.() ?? '';
                const containsGenericReadiness =
                    /readiness is at/i.test(heroLine1) || /readiness is at/i.test(heroLine2);
                const containsPlaceholder =
                    heroLine1.length === 0 && heroLine2.length === 0;

                const shouldOverride = !containsGenericReadiness && !containsPlaceholder;

                const updatedFeedback = shouldOverride
                    ? {
                          ...feedback,
                          coach: {
                              ...feedback.coach,
                              line1: heroLine1 || feedback.coach.line1,
                              line2: heroLine2 || feedback.coach.line2,
                          },
                      }
                    : feedback;

                if (!abortController.signal.aborted) {
                    setCoachFeedback(updatedFeedback);
                }
            } catch (error) {
                // If Gemini API fails or is aborted, use fallback
                if (error instanceof Error && error.name !== 'AbortError') {
                    console.warn('[App] Failed to fetch Gemini hero copy, using fallback:', error.message);
                }
                if (!abortController.signal.aborted) {
                    setCoachFeedback(feedback);
                }
            }

            // If a session was just completed, the other effect is running, so we keep the loading state.
            // It will be turned off in that effect's finally block. Otherwise, we're done loading.
            if (!sessionJustCompleted && !abortController.signal.aborted) {
                setChatMessages([]);
                chatHistoryForAPI.current = [];
                setIsCoachLoading(false);
            }
        };

        updateFeedback();

        return () => {
            abortController.abort();
        };
    }, [
        readinessScore,
        sessionsHistory,
        nextOptimalDate,
        postScore,
        justAchievedPR,
        weeklyTrend,
        sensorStatus,
        sessionJustCompleted,
        userProfile,
        sessionSummaryForCoach,
        latestWorkoutPlan,
    ]);

    const updateAppScreen = useCallback((screen: Screen, extra: Partial<AppState> = {}) => {
        setAppState(prev => ({ ...prev, screen, ...extra }));
    }, []);

    useEffect(() => {
        if (appState.screen === 'onboarding' && userProfile) {
            updateAppScreen('connect');
        }
    }, [appState.screen, userProfile, updateAppScreen]);

    const handleConnect = useCallback((side: 'left' | 'right') => {
        setSensorError(null);
        setSensorStatus(prev => ({ ...prev, [side]: { ...prev[side], status: 'connecting' } }));
        setTimeout(() => {
            setSensorStatus(prev => ({
                ...prev,
                [side]: { status: 'connected', device: { name: `Simulated ${side}` }, server: 'mock', battery: 85 }
            }));
        }, 1500);
    }, []);

    const handleStartCheck = useCallback(() => {
        if (sensorStatus.left.status === 'connected' || sensorStatus.right.status === 'connected') {
            setSensorError(null);
            updateAppScreen("setup");
        } else {
            setSensorError("Please connect at least one sensor to start.");
            setTimeout(() => setSensorError(null), 3000);
        }
    }, [sensorStatus, updateAppScreen]);
    
    const beginTesting = () => {
        setRecordedReps({ left: [], right: [] });
        setIsTestingComplete(false);
        setIsCalculatingReadiness(false);
        updateAppScreen("testing");
    };
    
    const handleContraction = useCallback((side: 'left' | 'right', peakValue: number) => {
        setRecordedReps(prev => {
            if (prev[side].length >= settings.repsPerSide) return prev;
            
            const updated = { ...prev, [side]: [...prev[side], peakValue] };
            const doneLeft = sensorStatus.left.status !== 'connected' || updated.left.length >= settings.repsPerSide;
            const doneRight = sensorStatus.right.status !== 'connected' || updated.right.length >= settings.repsPerSide;
            
            if (doneLeft && doneRight) {
                setTimeout(() => {
                    setIsTestingComplete(true);
                    calculateReadinessScore(updated, isRetestFlow);
                }, 600);
            }
            return updated;
        });
    }, [settings.repsPerSide, isRetestFlow, sensorStatus]);

    const calculateReadinessScore = useCallback(async (reps: {left: number[], right: number[]}, isRetest: boolean) => {
        setIsCalculatingReadiness(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1200));

            const leftAvg = reps.left.length > 0 ? reps.left.reduce((a, b) => a + b, 0) / reps.left.length : 0;
            const rightAvg = reps.right.length > 0 ? reps.right.reduce((a, b) => a + b, 0) / reps.right.length : 0;
            const currentMvc = Math.max(leftAvg, rightAvg, 1);

            const previousTrueMax = rawPeakHistory.reduce((max, entry) => {
                const peak = typeof entry?.maxPeak === 'number' ? entry.maxPeak : 0;
                return Math.max(max, peak);
            }, 0);

            // A PR requires a meaningful improvement after several true readiness checks.
            const testsAfterThis = readinessTestCount + (isRetest ? 0 : 1);
            const isPR = !isRetest
                && testsAfterThis >= 4
                && previousTrueMax > 0
                && currentMvc > previousTrueMax * 1.02;

            if (isPR) {
                setJustAchievedPR(true);
                setPrValues({ old: Math.round(previousTrueMax), new: Math.round(currentMvc) });
            }

            const newMaxMvc = clampStrengthGain(maxMvcEver, currentMvc);
            setMaxMvcEver(newMaxMvc);

            const L = reps.left.length > 0 ? Math.min(100, Math.round((leftAvg / newMaxMvc) * 100)) : null;
            const R = reps.right.length > 0 ? Math.min(100, Math.round((rightAvg / newMaxMvc) * 100)) : null;
            const overall = L !== null && R !== null ? Math.round((L + R) / 2) : L ?? R ?? 0;

            if (isRetest) {
                setPostScore(overall);
            } else {
                // Clamp initial session readiness to 85-100
                const clampedReadiness = Math.max(85, Math.min(100, overall));
                setReadinessScore(clampedReadiness);
                setInitialReadinessScore(clampedReadiness);
            }

            if (testsAfterThis !== readinessTestCount) {
                setReadinessTestCount(testsAfterThis);
            }

            const timestamp = new Date();
            const nextTrendPoints = isRetest ? trendPoints : [...trendPoints, { date: timestamp, readiness: overall }];
            const nextRawPeakHistory = isRetest ? rawPeakHistory : [...rawPeakHistory, { date: timestamp, maxPeak: currentMvc, leftPeak: leftAvg, rightPeak: rightAvg }];

            if (!isRetest) {
                setTrendPoints(nextTrendPoints);
                setRawPeakHistory(nextRawPeakHistory);
            }

            saveHistory({
              sessionsHistory,
              trendPoints: nextTrendPoints,
              rawPeakHistory: nextRawPeakHistory,
              mvcBaseline: newMaxMvc,
              realTests: testsAfterThis,
            });

            updateAppScreen("result");
        } finally {
            setIsCalculatingReadiness(false);
        }

    }, [maxMvcEver, updateAppScreen, sessionsHistory, trendPoints, rawPeakHistory, readinessTestCount]);

    const startTraining = useCallback(() => {
        predictor.current = new LegacyPredictorAdapter({ mvcBaseline: maxMvcEver });
        // Clamp initial readiness to 85-100 for new sessions
        const rawScore = readinessScore || 65;
        const score = Math.max(85, Math.min(100, rawScore));
        setInitialReadinessScore(score);
        setPreSetReadiness(score);
        predictor.current.startSession({ preMVCpct: score });
        sessionStartedAtRef.current = new Date();
        sessionIdRef.current = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : `session-${Date.now()}`;
        setSessionPlanState((prev) => {
            if (!prev?.accepted) {
                return prev;
            }
            return {
                ...prev,
                nextIndex: 0,
                lastCompleted: null,
            };
        });

        setSessionData(predictor.current.predictReadiness());
        setCompletedSets([]);
        setSessionPhase('active');
        setCoachPrefs(prev => ({ ...prev, suppressStopsForSession: false }));
        setDismissedSuggestionKeys([]);
        setActiveUndo(null);
        setPostSetCoachOutput(null);
        lastCoachOutputRef.current = null;
        fatigueHistoryRef.current = [];
        orchestratorRef.current?.resetForNewSet();
        clearCoachInsight();
        updateAppScreen("training");
    }, [readinessScore, maxMvcEver, updateAppScreen, clearCoachInsight]);

    const handleUndoAction = useCallback(() => {
        if (!activeUndo) return;
        restorePredictor(predictor.current ?? null, activeUndo.sessionSnapshot.predictor);
        setSessionData(activeUndo.sessionSnapshot.sessionData);
        setSessionPhase(activeUndo.sessionSnapshot.sessionPhase);
        setPreSetReadiness(activeUndo.sessionSnapshot.preSetReadiness);
        setCompletedSets(activeUndo.sessionSnapshot.completedSets);
        setActiveUndo(null);
        setDismissedSuggestionKeys([]);
    }, [activeUndo]);

    const endTraining = useCallback(() => {
        if(!predictor.current) return;
        const finalReadiness = sessionData?.currentReadiness ?? initialReadinessScore ?? 0;
        const summary = predictor.current.endSession({ postMVCpct: finalReadiness });
        setPostScore(finalReadiness);

        const now = new Date();
        const sessionStart = sessionStartedAtRef.current ?? now;
        const elapsedSeconds = Math.max(60, Math.round((now.getTime() - sessionStart.getTime()) / 1000));
        const allReps = summary.reps ?? [];
        const effectReps = allReps.filter((rep) => rep.peak >= 80).length;
        const effectRate = allReps.length > 0 ? Math.round((effectReps / allReps.length) * 100) : 0;
        const workload = allReps.reduce((sum, rep) => sum + (rep.peak ?? 0), 0);
        const tutFromSets = completedSets.reduce((sum, set) => sum + (set.tut ?? 0), 0);
        const tutFromReps = allReps.reduce((sum, rep) => sum + (rep.duration ?? 0), 0);
        const durationSec = Math.max(elapsedSeconds, Math.round(tutFromSets || tutFromReps || elapsedSeconds));
        const sessionPre = Math.round(initialReadinessScore ?? readinessScore ?? finalReadiness);
        const sessionPost = Math.round(finalReadiness);
        const sessionEfficacy = allReps.length > 0 ? Math.round((Math.min(100, summary.sessionPeakPct) + effectRate) / 2) : sessionPost;
        const balanceScore = 95;

        const sessionEntry: SessionHistoryEntry = {
            date: now,
            pre: sessionPre,
            post: sessionPost,
            reps: allReps,
            totalReps: allReps,
            durationSec,
            workload,
            effectReps,
            effectRepRate: effectRate,
            sessionEfficacy,
            balanceScore,
        };

        const nextSessionsHistory = [...sessionsHistory, sessionEntry];
        const nextTrendPoints = [...trendPoints, { date: now, readiness: sessionPost }];
        const peakValue = summary.sessionPeakPct ?? 0;
        const nextRawPeakHistory = [...rawPeakHistory, { date: now, maxPeak: peakValue, leftPeak: peakValue, rightPeak: peakValue }];

        setSessionsHistory(nextSessionsHistory);
        setTrendPoints(nextTrendPoints);
        setRawPeakHistory(nextRawPeakHistory);
        saveHistory({
            sessionsHistory: nextSessionsHistory,
            trendPoints: nextTrendPoints,
            rawPeakHistory: nextRawPeakHistory,
            mvcBaseline: maxMvcEver,
            realTests: readinessTestCount,
        });
        setSessionJustCompleted(true);
        sessionStartedAtRef.current = null;
        
        const summaryContext = {
            readinessDrop: (initialReadinessScore ?? 100) - finalReadiness,
            totalSets: completedSets.length + (summary.reps.length > 0 ? 1 : 0),
            totalReps: summary.reps.length,
            peakActivation: summary.sessionPeakPct,
            setsData: [...completedSets, ...(summary.reps.length > 0 ? [{ reps: summary.reps.length, avgPeak: summary.sessionPeakPct, tut: 0 }] : [])],
        };
        setSessionSummaryForCoach(summaryContext);
        setSessionPlanState((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                accepted: false,
                nextIndex: 0,
                lastCompleted: null,
            };
        });

        setAppState(prev => ({ ...prev, screen: 'impact', sessionSummary: summary }));
        setLastSetReps([]);
    }, [sessionData, initialReadinessScore, readinessScore, completedSets, sessionsHistory, trendPoints, rawPeakHistory, maxMvcEver, readinessTestCount]);

    // Effect: Fetch Gemini coaching advice when impact screen is shown
    useEffect(() => {
        if (appState.screen !== 'impact') {
            return;
        }

        const summary = appState.sessionSummary;
        if (!summary || !summary.reps) {
            return;
        }

        const abortController = new AbortController();

        const fetchAdvice = async () => {
            setIsLoadingContinuationAdvice(true);

            try {
                const advice = await fetchSessionContinuationAdvice(
                    {
                        totalReps: summary.reps.length,
                        readinessDrop: summary.predictedDrop || 0,
                        currentReadiness: postScore ?? readinessScore ?? 0,
                        initialReadiness: initialReadinessScore ?? 100,
                        sessionPeakPct: summary.sessionPeakPct || 0,
                    },
                    { signal: abortController.signal }
                );

                if (!abortController.signal.aborted) {
                    setSessionContinuationAdvice(advice);
                }
            } catch (error) {
                if (error instanceof Error && error.name !== 'AbortError') {
                    console.warn('[App] Failed to fetch continuation advice:', error);
                }
                // Keep fallback text
                if (!abortController.signal.aborted) {
                    setSessionContinuationAdvice(
                        `Completed ${summary.reps.length} reps. Your readiness dropped by ${summary.predictedDrop} points.`
                    );
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setIsLoadingContinuationAdvice(false);
                }
            }
        };

        fetchAdvice();

        return () => {
            abortController.abort();
        };
    }, [appState.screen, appState.sessionSummary, postScore, readinessScore, initialReadinessScore]);

    const handleEndSet = useCallback((options: { viaSuggestion?: boolean; force?: boolean; undoLabel?: string; suggestionKey?: string } = {}) => {
        if (!predictor.current || !sessionData) return;

        const predictorSnapshot = snapshotPredictor(predictor.current);
        const previousSessionData = sessionData;
        const previousPhase = sessionPhase;
        const previousPreSet = preSetReadiness;
        const previousCompletedSets = completedSets;
        const preReadinessValue = preSetReadiness ?? previousSessionData?.currentReadiness ?? null;
        const postReadinessValue = previousSessionData?.currentReadiness ?? preReadinessValue;

        let fatigueLimited = false;
        if (fatigueEnabled) {
            const nowSec = latestFatigueTimeRef.current || Date.now() / 1000;
            const fallDuration = fatigueFallStartRef.current != null ? nowSec - fatigueFallStartRef.current : 0;
            if (fallDuration >= 5 || fatigueFallRepCountRef.current >= 2) {
                fatigueLimited = true;
                logAnalyticsEvent('fatigue.set_tagged', { fatigueLimited: true });
            }
        }

        const completedEntry: CompletedSet | null = sessionData.reps.length > 0
            ? {
                reps: sessionData.reps.length,
                tut: sessionData.tut,
                avgPeak: sessionData.reps.reduce((sum, r) => sum + r.peak, 0) / sessionData.reps.length,
                fatigueAtRep: sessionData.fatigueDetectedAtRep,
                status: 'completed',
                fatigueLimited,
            }
            : null;

        if (completedEntry) {
            setCompletedSets(prev => [...prev, completedEntry]);
            CoachContextBus.publish({
                type: 'set_completed',
                at: Date.now(),
                payload: {
                    reps: completedEntry.reps,
                    fatigueLimited,
                    readinessBefore: preReadinessValue,
                    readinessAfter: postReadinessValue,
                },
            });
        }
        setSessionPlanState((prev) => {
            if (!prev?.accepted) {
                return prev;
            }
            if (prev.nextIndex >= prev.sets.length) {
                const lastSet = prev.sets[prev.sets.length - 1] ?? prev.lastCompleted;
                return lastSet && lastSet !== prev.lastCompleted
                    ? { ...prev, lastCompleted: lastSet }
                    : prev;
            }
            const completedSet = prev.sets[prev.nextIndex] ?? null;
            return {
                ...prev,
                lastCompleted: completedSet,
                nextIndex: Math.min(prev.nextIndex + 1, prev.sets.length),
            };
        });

        const restInfo = {
            preReadiness: preReadinessValue,
            postReadiness: postReadinessValue,
            reps: sessionData.reps.length,
            weightAdjustmentMessage: previousSessionData?.weightAdjustmentMessage ?? null,
            nextWeightAdjustment: previousSessionData?.nextSetWeightAdjustment ?? null,
            fatigueLimited,
            fatigueAtRep: sessionData.fatigueDetectedAtRep ?? null,
        };
        setLastRestSummary({
            preReadiness: restInfo.preReadiness,
            postReadiness: restInfo.postReadiness,
            weightAdjustmentMessage: restInfo.weightAdjustmentMessage,
            nextWeightAdjustment: restInfo.nextWeightAdjustment,
            fatigueLimited,
        });
        fatigueHistoryRef.current = [];
        const readinessBefore = restInfo.preReadiness != null ? Math.round(restInfo.preReadiness) : Math.round(previousSessionData?.currentReadiness ?? 0);
        const readinessAfter = restInfo.postReadiness != null ? Math.round(restInfo.postReadiness) : readinessBefore;
        const readinessChange = readinessAfter - readinessBefore;
        const cumulativeChangePct = previousSessionData?.totalReadinessDrop != null
            ? -Math.round(previousSessionData.totalReadinessDrop)
            : 0;

        const trendValue = Number.isFinite(weeklyTrend) ? weeklyTrend : null;
        const historicalTrend: 'up' | 'flat' | 'down' | undefined = trendValue != null
            ? trendValue > 1
                ? 'up'
                : trendValue < -1
                    ? 'down'
                    : 'flat'
            : undefined;
        const fatigueDetected = sessionData?.fatigueDetected ?? false;
        const fatigueFlag = fatigueDetected || fatigueLimited;
        let symmetryPct: number | null = null;
        if (rawPeakHistory.length > 0) {
            const lastPeak = rawPeakHistory[rawPeakHistory.length - 1];
            const left = typeof lastPeak.leftPeak === 'number' ? lastPeak.leftPeak : null;
            const right = typeof lastPeak.rightPeak === 'number' ? lastPeak.rightPeak : null;
            if (left !== null && right !== null && (left + right) !== 0) {
                const avg = (left + right) / 2 || 1;
                const diffRatio = Math.abs(left - right) / avg;
                symmetryPct = Math.max(0, Math.min(100, Math.round((1 - diffRatio) * 100)));
            }
        }
        const targetRestSec = Number.isFinite(previousSessionData?.nextSetRestSeconds)
            ? previousSessionData?.nextSetRestSeconds ?? undefined
            : undefined;
        const sessionStage = previousCompletedSets.length === 0 ? 'warmup' : 'main';

        const setContext: VoiceSetContext = {
            exerciseName: previousSessionData?.intensityPill?.text ?? 'Working set',
            setNumber: previousCompletedSets.length + 1,
            readinessNow: readinessAfter,
            readinessChangePct: readinessChange,
            lastQualityFlagRep: sessionData.fatigueDetectedAtRep ?? undefined,
            targetRestSec,
            symmetryNow: symmetryPct ?? undefined,
            fatigueFlag,
            setVolume: { reps: restInfo.reps },
            historicalTrend,
            cumulativeChangePct,
            sessionStage,
        };

        if (lastCoachOutputRef.current) {
            const previousPlan = lastCoachOutputRef.current.appliedPlan;
            const outcome: OutcomeSignal = {
                userId: userCoachProfileRef.current.userId,
                scenario: planToScenario(previousPlan.kind),
                variant: {
                    persona: lastPostSetMetaRef.current.persona ?? 'calm',
                    cue: lastPostSetMetaRef.current.cue ?? 'brace',
                    cta: previousPlan.kind,
                },
                planFollowed: true,
                qualityImproved: !fatigueLimited,
                readinessRebounded: readinessAfter >= readinessBefore,
            };
            recordCoachOutcome(outcome);
        }

        const coachOutput = generatePersonalizedFeedback(setContext, userCoachProfileRef.current);
        lastCoachOutputRef.current = coachOutput;
        setPostSetCoachOutput(coachOutput);
        lastPostSetMetaRef.current = {
            readinessNow: setContext.readinessNow,
            readinessChangePct: setContext.readinessChangePct,
            cumulativeChangePct,
            planKind: coachOutput.plan,
            persona: coachOutput.personalization?.persona ?? null,
            cue: coachOutput.personalization?.cue ?? null,
            judgment: coachOutput.judgment,
        };
        logAnalyticsEvent('coach_feedback_shown', {
            planKind: coachOutput.plan,
            persona: coachOutput.personalization?.persona ?? null,
            cue: coachOutput.personalization?.cue ?? null,
            judgment: coachOutput.judgment,
            readinessNow: setContext.readinessNow,
            readinessChangePct: setContext.readinessChangePct,
            cumulativeChangePct,
        });

        setLastSetReps(sessionData?.reps ? sessionData.reps.map(cloneRep) : []);
        predictor.current.resetExercise();
        const finalSetDataRaw = predictor.current.predictReadiness();
        const finalSetData = applyPlanToPrediction(finalSetDataRaw, coachOutput.appliedPlan);
        setPreSetReadiness(previousSessionData?.currentReadiness ?? null);
        setSessionData(finalSetData);
        setSessionPhase('set-summary');
        setDismissedSuggestionKeys(prev => options.suggestionKey ? prev.filter(key => key !== options.suggestionKey) : prev);

        if (options.undoLabel) {
            registerUndo('end_set', options.undoLabel, {
                sessionData: previousSessionData,
                sessionPhase: previousPhase,
                preSetReadiness: previousPreSet,
                completedSets: previousCompletedSets,
                predictor: predictorSnapshot,
            });
        }

        if (fatigueEnabled) {
            fatigueBaselineRef.current = { baseline: null, sum: 0, count: 0 };
            fatigueFallStartRef.current = null;
            fatigueFallRepCountRef.current = 0;
            fatigueFallDismissedRef.current = false;
            setFatigueFallDismissed(false);
            resetFatigue();
        }
    }, [sessionData, sessionPhase, preSetReadiness, completedSets, registerUndo, fatigueEnabled, logAnalyticsEvent, resetFatigue, fatigueState, initialReadinessScore, weeklyTrend, rawPeakHistory, applyPlanToPrediction, recordCoachOutcome, planToScenario]);

    const handleContinueAnyway = useCallback(() => {
        if (!activeStopSuggestion) return;
        logAnalyticsEvent('coach_stop_dismissed', {
            target: activeStopSuggestion.suggestion.target,
            reasons: activeStopSuggestion.suggestion.reasons,
            confidence: activeStopSuggestion.suggestion.confidence,
        });
        setDismissedSuggestionKeys(prev => [...prev, activeStopSuggestion.key]);
    }, [activeStopSuggestion, logAnalyticsEvent]);

    const handleAcceptSuggestion = useCallback(() => {
        if (!activeStopSuggestion) return;
        logAnalyticsEvent('coach_stop_accepted', {
            target: activeStopSuggestion.suggestion.target,
            reasons: activeStopSuggestion.suggestion.reasons,
            confidence: activeStopSuggestion.suggestion.confidence,
        });
        handleEndSet({ viaSuggestion: true, undoLabel: 'Undo End Set', suggestionKey: activeStopSuggestion.key });
    }, [activeStopSuggestion, handleEndSet, logAnalyticsEvent]);

    const handleSkipSet = useCallback(() => {
        if (!predictor.current || !sessionData) return;
        const predictorSnapshot = snapshotPredictor(predictor.current);
        registerUndo('skip_set', 'Undo Skip', {
            sessionData,
            sessionPhase,
            preSetReadiness,
            completedSets,
            predictor: predictorSnapshot,
        });
        predictor.current.resetExercise();
        const nextData = predictor.current.predictReadiness();
        setSessionData(nextData);
        setSessionPhase('active');
    }, [sessionData, sessionPhase, preSetReadiness, completedSets, registerUndo]);

    const handleSkipExercise = useCallback(() => {
        endTraining();
    }, [endTraining]);

    const handleToggleSuppressStopsToday = useCallback(() => {
        setCoachPrefs(prev => ({ ...prev, suppressStopsForSession: !prev.suppressStopsForSession }));
    }, []);

    const handleCoachInsightContinue = useCallback(() => {
        logAnalyticsEvent('coach_insight_continued', {
            type: coachInsightMeta?.type,
            state: coachInsightMeta?.state,
            source: coachInsightMeta?.source,
        });
        clearCoachInsight();
    }, [logAnalyticsEvent, coachInsightMeta, clearCoachInsight]);

    const handleCoachInsightEnd = useCallback(() => {
        logAnalyticsEvent('coach_insight_ended_set', {
            type: coachInsightMeta?.type,
            state: coachInsightMeta?.state,
            source: coachInsightMeta?.source,
        });
        clearCoachInsight();
        handleEndSet({ force: true, undoLabel: 'Undo End Set' });
    }, [logAnalyticsEvent, coachInsightMeta, clearCoachInsight, handleEndSet]);

    const handleManualEndSet = useCallback(() => {
        if (GEMINI_DEBUG) console.log('[GEMINI] handleManualEndSet called.');
        if (!sessionData) {
            if (GEMINI_DEBUG) console.log('[GEMINI] handleManualEndSet: no sessionData, returning.');
            return;
        }
        const repCount = sessionData.reps?.length ?? 0;
        const isCalibrationSet = completedSets.length === 0;
        if (GEMINI_DEBUG) console.log(`[GEMINI] handleManualEndSet: repCount=${repCount}, isCalibrationSet=${isCalibrationSet}`);
        if (repCount < 3 && !isCalibrationSet) {
            if (GEMINI_DEBUG) console.log('[GEMINI] handleManualEndSet: rep count < 3 and not calibration, showing confirmation.');
            setAwaitingEndSetConfirm(true);
        } else {
            if (GEMINI_DEBUG) console.log('[GEMINI] handleManualEndSet: rep count >= 3 or calibration, calling handleEndSet directly.');
            handleEndSet({ force: true, undoLabel: 'Undo End Set' });
        }
    }, [sessionData, handleEndSet, completedSets]);

    const getReadinessData = (score: number | null) => {
        if (score === null) return { color: "#9CA3AF", word: "Unknown" };
        return score >= 85 ? { color: "#10B981", word: "Optimal" } :
               score >= 65 ? { color: "#3B82F6", word: "Ready" } :
               score >= 50 ? { color: "#F59E0B", word: "Recovering" } :
               { color: "#EF4444", word: "Fatigued" };
    };

    const onSimulateRep = useCallback((peak: number) => {
        if (!predictor.current) return;
        const newRep: Rep = { peak, duration: 2.5 + Math.random(), id: Date.now(), quality: 'Good' };
        predictor.current.addRep(newRep);
        const prediction = predictor.current.predictReadiness();
        setSessionData(prediction);
        processFatigueSample(peak);
    }, [processFatigueSample]);

    const handleSendMessage = useCallback((question: string, explicitIntent?: CoachIntent) => {
        const trimmed = question.trim();
        if (!trimmed) return;

        const userMessage: ChatMessage = { id: Date.now(), sender: 'user', text: trimmed };
        setChatMessages(prev => [...prev, userMessage]);
        chatHistoryForAPI.current.push(userMessage);
        setHomeRecommendationToken(token => token + 1);
        setCoachFeedback(prev => prev ? {
            ...prev,
            coach: {
                ...prev.coach,
                isTyping: true,
            },
        } : prev);

        if (coachRequestActiveRef.current) {
            coachRequestQueueRef.current.push({ question: trimmed, intent: explicitIntent });
        } else {
            processCoachQuestion({ question: trimmed, intent: explicitIntent });
        }
    }, [processCoachQuestion]);

    const completeSessionAndReturnHome = useCallback(() => {
        if (postScore === null) return;
        setReadinessScore(postScore);
        setChatMessages([]);
        chatHistoryForAPI.current = [];
        coachRequestQueueRef.current = [];
        coachRequestActiveRef.current = false;
        setIsCoachLoading(false);
        setCoachPrefs(prev => ({ ...prev, suppressStopsForSession: false }));
        setDismissedSuggestionKeys([]);
        setActiveUndo(null);
        setPostSetCoachOutput(null);
        lastCoachOutputRef.current = null;
        fatigueHistoryRef.current = [];
        orchestratorRef.current?.resetForNewSet();
        clearCoachInsight();
        setLastSetCoachSummary(null);
        setLastSetReps([]);
        sessionIdRef.current = null;
        updateAppScreen("ready");
    }, [postScore, updateAppScreen, clearCoachInsight]);

    const renderContent = () => {
        switch (appState.screen) {
            case "splash": return <SplashScreen onAnimationComplete={() => updateAppScreen("intro")} />;
            case "intro":
                return (
                    <IntroScreen
                        onComplete={() => updateAppScreen(userProfile ? "connect" : "onboarding")}
                    />
                );
            case "onboarding":
                return (
                    <OnboardingConversationScreen
                        onSubmit={(profile) => {
                            setUserProfile(profile);
                            setAppState(prev => ({ ...prev, userProfile: profile }));
                            setHomeRecommendationToken(token => token + 1);
                            updateAppScreen("connect", { userProfile: profile });
                        }}
                        onSkip={() => updateAppScreen("connect")}
                    />
                );
            case "connect": return <ConnectScreen onConnect={handleConnect} sensorStatus={sensorStatus} onComplete={() => updateAppScreen("placement-guide")} onBack={() => updateAppScreen("intro")} sensorError={sensorError} />;
            case "placement-guide": return <PlacementGuideScreen onComplete={() => updateAppScreen("mvc-setup")} onBack={() => updateAppScreen("connect")} />;
            case "mvc-setup": return <MVCScreen onBegin={beginTesting} onBack={() => updateAppScreen("placement-guide")} />;
            case "testing": return <TestingScreen onCancel={() => updateAppScreen("ready")} leftDone={recordedReps.left.length} rightDone={recordedReps.right.length} repsPerSide={settings.repsPerSide} isComplete={isTestingComplete} isAnalyzing={isCalculatingReadiness} onSimulateSqueeze={(side) => handleContraction(side, 600 + Math.random() * 200)} sensorStatus={sensorStatus} />;
            case "setup": return <SetupScreen onBack={() => updateAppScreen("ready")} repsPerSide={settings.repsPerSide} onBegin={beginTesting} onStartWorkoutDirectly={startTraining} />;
            case "result": return <PreTrainingScreen
                score={isRetestFlow ? postScore : readinessScore}
                rec={{ message: "Your muscles are primed." }}
                onStart={startTraining}
                onEndSession={() => updateAppScreen("ready")}
                getReadinessData={getReadinessData}
                planView={sessionPlanView}
                onGeneratePlan={generateSessionWorkoutPlan}
                onAcceptPlan={acceptSessionWorkoutPlan}
                isGeneratingPlan={isGeneratingSessionPlan}
                planError={sessionPlanError}
                planAccepted={Boolean(sessionPlanState?.accepted)}
            />;
            case "training": {
                const recoveryDirective = getRecoveryDirective(sessionData?.currentReadiness ?? null);
                const isCalibrationSet = completedSets.length === 0;
                const suggestionKey = activeStopSuggestion?.key ?? null;
                const suggestionData = activeStopSuggestion?.suggestion ?? null;
                const undoInfo = activeUndo ? { label: activeUndo.label } : null;
                return <TrainingScreen 
                    onEnd={endTraining} 
                    onSimulateRep={onSimulateRep} 
                    sessionData={sessionData} 
                    onEndSet={handleManualEndSet} 
                    onboardStep={onboardStep} 
                    onSetOnboardStep={setOnboardStep} 
                    sessionPhase={sessionPhase} 
                    onDismissTutorial={() => { setOnboardStep(99); localStorage.setItem(LIVE_TUTORIAL_KEY, 'true'); }} 
                    restDuration={sessionData?.nextSetRestSeconds || 60} 
                    onResumeSet={() => {
                        setSessionPhase('active');
                        setPreSetReadiness(sessionData?.currentReadiness ?? null);
                        if (predictor.current) {
                           const newSetData = predictor.current.predictReadiness();
                           setSessionData(newSetData);
                        }
                        setLastRestSummary(null);
                        setPostSetCoachOutput(null);
                        lastCoachOutputRef.current = null;
                        fatigueHistoryRef.current = [];
                        orchestratorRef.current?.resetForNewSet();
                        clearCoachInsight();
                        setLastSetReps([]);
                    }}
                    recoveryDirective={recoveryDirective}
                    preSetReadiness={preSetReadiness}
                    getReadinessData={getReadinessData}
                    completedSetsCount={completedSets.length}
                    isCalibrationSet={isCalibrationSet}
                    stopSuggestion={suggestionData}
                    suggestionKey={suggestionKey}
                    onContinueSuggestion={handleContinueAnyway}
                    onAcceptSuggestion={handleAcceptSuggestion}
                    onSkipSet={handleSkipSet}
                    onSkipExercise={handleSkipExercise}
                    onToggleSuppressStops={handleToggleSuppressStopsToday}
                    coachPrefs={coachPrefs}
                    awaitingEndSetConfirm={awaitingEndSetConfirm}
                    undoInfo={undoInfo}
                    onUndo={handleUndoAction}
                    coachMessage={coachInsightMessage}
                    coachMessageStatus={coachInsightState.status}
                    onCoachContinue={handleCoachInsightContinue}
                    onCoachEnd={handleCoachInsightEnd}
                    onSetCoachSummary={setLastSetCoachSummary}
                    coachOutput={postSetCoachOutput}
                    restSummary={lastRestSummary}
                    recentSetReps={lastSetReps}
                    plannedSet={plannedSetCurrent}
                    plannedNextSet={plannedSetNext}
                    plannedProgress={plannedSetProgress}
                />;
            }
            case "impact": {
                const summary = appState.sessionSummary;
                const workoutSummary = sessionContinuationAdvice || (summary && summary.reps
                    ? `Completed ${summary.reps.length} reps. Your readiness dropped by ${summary.predictedDrop} points.`
                    : "Great session!");

                const handleContinueSession = () => {
                    // Reset to training screen to continue
                    updateAppScreen("training");
                };

                return <ImpactScreen
                    readinessScore={initialReadinessScore}
                    postScore={postScore}
                    getReadinessData={getReadinessData}
                    onContinueSession={handleContinueSession}
                    onPlanNext={completeSessionAndReturnHome}
                    workoutSummary={workoutSummary}
                    isLoadingAdvice={isLoadingContinuationAdvice}
                />;
            }
            case "history": return <HistoryScreen sessions={sessionsHistory} onBack={() => updateAppScreen("ready")} getReadinessData={getReadinessData} />;
            case "progress": return <ProgressScreen trendPoints={trendPoints} sessions={sessionsHistory} onBack={() => updateAppScreen("ready")} />;
            case "chat": return <ChatScreen messages={chatMessages} isLoading={isCoachLoading} onSendMessage={handleSendMessage} onBack={() => updateAppScreen("ready")} />;
            case "ready":
            default:
                const lastSession = sessionsHistory.length > 0 ? sessionsHistory[sessionsHistory.length - 1] : null;
                const timeSinceLastSessionMinutes = lastSession
                    ? (Date.now() - toDate(lastSession.date).getTime()) / (1000 * 60)
                    : null;
                return <HomeScreen 
                    onStartCheck={handleStartCheck} 
                    onStartActiveRecovery={handleStartCheck}
                    onNavigateToConnect={() => updateAppScreen('connect')}
                    onViewProgress={() => updateAppScreen("progress")}
                    onViewHistory={() => updateAppScreen("history")}
                    isCoachLoading={isCoachLoading}
                    sensorStatus={sensorStatus}
                    coachFeedback={coachFeedback}
                    onOpenCoachChat={() => setCoachOpen(true)}
                    onWorkoutPlanChange={setLatestWorkoutPlan}
                    weeklyTrend={Number.isFinite(weeklyTrend) ? weeklyTrend : null}
                    recentSession={lastSession}
                    timeSinceLastSessionMinutes={timeSinceLastSessionMinutes}
                    userProfile={userProfile}
                    externalRefreshToken={homeRecommendationToken}
                    onLogAnalyticsEvent={logAnalyticsEvent}
                    prefetchedWorkoutPlan={sessionPlanState?.accepted ? sessionPlanState.plan : null}
                    coachGate={coachGate}
                    coachGateContext={coachGateContext}
                />;
        }
    };

    const EndSetConfirmationDialog = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void; }) => (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
                <h2 id="dialog-title" className="text-lg font-bold text-white">End Set Early?</h2>
                <p className="text-sm text-gray-400 mt-2">
                    This set has very few reps. Are you sure you want to end it?
                </p>
                <div className="flex justify-center space-x-4 mt-6">
                    <button
                        onClick={onCancel}
                        className="bg-gray-700 text-white py-2 px-6 rounded-lg font-semibold button-press"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="bg-red-600 text-white py-2 px-6 rounded-lg font-semibold button-press"
                    >
                        End Set
                    </button>
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="app-shell font-sans text-white">
            <div className="app-shell__bg-layer bg-gray-950"></div>
            <div className="app-shell__bg-layer bg-[radial-gradient(ellipse_at_center,_rgba(17,24,39,0)_0%,_rgba(17,24,39,1)_100%)]"></div>
            <div className="app-shell__bg-layer bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.02%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
            <div className="app-content">
                {renderContent()}
                {justAchievedPR && <StrengthAchievementPopup onDismiss={() => { setJustAchievedPR(false); setPrValues(null); }} prValues={prValues} />}
                {awaitingEndSetConfirm && <EndSetConfirmationDialog
                    onConfirm={() => {
                        handleEndSet({ force: true, undoLabel: 'Undo End Set' });
                        setAwaitingEndSetConfirm(false);
                    }}
                    onCancel={() => setAwaitingEndSetConfirm(false)}
                />}
                {/* Voice Coach: Use Gemini Live in dev, text-based in production */}
                {import.meta.env.DEV ? (
                    <GeminiLiveCoach
                        open={coachGate.canOpen && isCoachOpen}
                        onClose={() => setCoachOpen(false)}
                    />
                ) : (
                    <CoachDock
                        open={coachGate.canOpen && isCoachOpen}
                        onClose={() => setCoachOpen(false)}
                        onSend={handleCoachSend}
                    />
                )}
            </div>
        </div>
    );
};

export default App;
