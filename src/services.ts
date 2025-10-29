// Save a coach decision (stub for now)
export function saveCoachDecision({ sessionId, setIdx, phase, suggestionId, why }: {
    sessionId: string,
    setIdx?: number,
    phase: "post_set" | "end",
    suggestionId: string,
    why: string
}) {
    // TODO: Implement actual persistence (API, localStorage, etc)
    // For now, just log
    console.log("saveCoachDecision", { sessionId, setIdx, phase, suggestionId, why });
}
import { Type } from "@google/genai";
import { STORAGE_KEY, RECOVERY_THRESHOLD } from "./constants";
import { resolveGeminiApiKey } from "./lib/geminiKey";
import type {
    CompletedSet,
    ChatMessage,
    CoachContextState,
    CoachHomeFeedback,
    CoachData,
    LoadSuggestion,
    HistoricalData,
    Rep,
    TrendPoint,
    SessionHistoryEntry,
    RawPeakHistoryEntry,
    FirebaseTimestamp,
    CoachIntent,
    StopSuggestion,
    CoachUserProfile,
} from "./types";
import type { SetSummaryMetrics, CoachRestAdvice } from './lib/coach/setSummary';

const FALLBACK_ANALYSIS = {
    intro: "Great work today. You pushed hard and your effort will pay off. Focus on recovery and get ready for the next session.",
    questions: [
        "How can I improve my readiness score?",
        "What's the main takeaway for next time?",
        "How do I get stronger from here?",
    ],
};

const QUAD_EXERCISE_IDS = new Set([
    'heel_elevated_front_squat',
    'rear_foot_split_squat',
    'sled_push',
    'high_bar_back_squat',
    'single_leg_press',
    'leg_extension_iso',
    'goblet_box_squat',
    'reverse_lunge_slider',
    'bike_flush',
    'barbell_back_squat',
    'barbell_front_squat',
    'barbell_safety_squat',
    'trap_bar_deadlift_quads',
    'smith_machine_front_squat',
    'smith_machine_split_squat',
    'split_squat_iso',
    'pistol_box_squat',
    'walking_lunge_db',
    'step_up_bench',
    'leg_press_wide',
    'leg_extension',
    'wall_sit_isometric',
]);

const QUAD_KEYWORDS = [
    'squat',
    'lunge',
    'split',
    'leg',
    'step',
    'extension',
    'press',
    'quad',
    'wall sit',
    'bike',
];

export type HomeRecommendation = {
    title: string;
    description: string;
    readinessDelta: number;
    projectionDelta: number;
    icon: string;
};

export const FALLBACK_HOME_RECOMMENDATIONS: HomeRecommendation[] = [] as HomeRecommendation[];

export type WorkoutPlan = {
    policy: {
        readiness_bands: {
            heavy_exposure_min: number;
            productive_min: number;
            conservative_min: number;
        };
        emg_quality_rules: {
            target_mvc_peak: number;
            max_ror_collapse_pct: number;
            min_symmetry_pct: number;
        };
        rationale: string;
        confidence: number;
    };
    plan_meta: {
        intent: "quad_strength";
        readiness: number;
        recovery_window: string;
        notes: string;
        confidence: number;
    };
    blocks: Array<{
        label: string;
        type: "main" | "accessory" | "primer" | "finisher" | "exploration";
        exercise: {
            id: string;
            name: string;
            quad_dominant: boolean;
            equipment_required: string[];
        };
        prescription: {
            sets: number;
            reps: string;
            tempo: string;
            rest_s: number;
            load_adjustment: "increase" | "hold" | "decrease" | "n/a";
        };
        criteria: {
            target_mvc_pct_min: number;
            stop_if: string[];
        };
        evidence: {
            metrics: Array<"%MVC_peak" | "RoR_0_150" | "symmetry_pct" | "fatigue_index" | "signal_quality" | "readiness">;
            rationale: string;
            policy_rule_applied: string;
        };
        assumptions: string[];
        expect_label: boolean;
        readiness_before?: number;
        readiness_after?: number;
        block_cost?: number;
    }>;
    alternatives: Array<{
        for_block: string;
        options: Array<{
            id: string;
            name: string;
            when_to_use: string;
        }>;
    }>;
    telemetry_focus: string[];
    projected?: {
        readinessBefore: number;
        readinessAfter: number;
        delta: number;
    };
    mode?: "strength" | "readiness_training" | "off_day";
};

export interface CoachPromptLastSessionContext {
    exercise: string | null;
    fatigueRep: number | null;
    peakedRep: number | null;
    symmetryNote: "high" | "low" | null;
    recentPR: boolean | null;
}

export interface CoachPromptUserPrefs {
    preferredDayparts: Array<"morning" | "afternoon" | "evening"> | null;
    sessionLengthMin: number | null;
}

export interface CoachPromptUserContext {
    goal: "strength" | "recovery" | "mobility" | null;
    timezone: string | null;
    locale: string | null;
    userPrefs: CoachPromptUserPrefs;
    profile?: {
        name: string;
        age: number;
        weight: number;
        height: number;
    } | null;
}

export interface CoachPromptConstraints {
    todayBusyUntil: string | null;
    travel: boolean | null;
}

export interface CoachPromptSubjectives {
    fatigueSelfReport: number | null;
    sleepHrs: number | null;
    soreness: number | null;
    stress: number | null;
    mood: "low" | "ok" | "good" | null;
    timeAvailableMin: number | null;
}

export interface CoachPromptUIContext {
    ctaCandidate: string | null;
    reduceMotion: boolean;
}

export interface CoachPromptContextInput {
    recoveryScore: number | null;
    recoverySlopePerHr: number | null;
    strengthTrendWoW: number | null;
    timeToNextOptimalHours: number | null;
    nextOptimalLabel: string | null;
    timeSinceLastSessionHours: number | null;
    symmetryIndex: number | null;
    lastSession: CoachPromptLastSessionContext;
    user: CoachPromptUserContext;
    constraints: CoachPromptConstraints;
    subjectives: CoachPromptSubjectives;
    ui: CoachPromptUIContext;
    dataSyncOK: boolean;
    coachState: CoachContextState;
    currentPlan?: {
        intent: string | null;
        readinessBefore: number | null;
        readinessAfter: number | null;
        blocks: Array<{
            displayName: string;
            loadStrategy: string | null;
            sets: number | null;
            reps: number | string | null;
            focus?: string | null;
        }>;
    } | null;
}

export interface ComposeCoachPromptArgs {
    question: string;
    history: ChatMessage[];
    sessionSummary: any;
    context: CoachPromptContextInput;
    intent: CoachIntent;
    needsTiming: boolean;
    ctaAlignmentHint?: string;
    mode?: 'qa' | 'daily_banner';
    lastSetSummary?: SetSummaryMetrics | null;
    lastSetMeta?: {
        exerciseName?: string | null;
        restAdvice?: CoachRestAdvice;
    } | null;
    cacheKeyExtras?: Record<string, string>;
}

const SYSTEM_INSTRUCTION_QA = `You are a friendly, knowledgeable SPORTS SCIENTIST COACH speaking on the MAIN SCREEN.

MODES
- daily_banner: One concise status line for today (1–2 short sentences).
- qa: Answer a user’s free-text question (2–5 short sentences).

TONE
- Natural, human, encouraging. Use contractions and plain English.
- Evidence-based but simple; give clear next steps.

DATA YOU MAY USE (provided in the user message)
- postSessionStatus: "just_finished" | "recovered_24h" | "none"
- readinessNow (0–100), baselineReadiness (0–100)
- recoverySlopePerHr (number or null), nextOptimalMinutes (number or null)
- lastSession: { fatigueDetected (bool), readiness (0–100 or null), symmetryPct (% or null) }
- symmetryTrendPct (% or null), strain24h (0–100 or null)
- notes (short context like "had coffee", "short sleep" or null)
- userQuestion (string or null, only for qa)
- currentPlan (if provided): today’s workout plan with readinessBefore/After and block summaries

GUARDRAILS
- Never invent numbers or causes; mention notes only if provided.
- Safety first; do not diagnose or provide medical advice.
- Keep advice general and adaptable; suggest self-checks (e.g., “if it feels grindy, cut volume”).

LOGIC
- Day classification from readinessNow:
  - ≥85 → GREEN (push/build; quality first)
  - 65–84 → YELLOW (steady and workable; moderate, smooth)
  - <65 → RED (recovery-biased; short, technical, or rest)
- Last-session fatigue (if available):
  - fatigueDetected=true AND readinessNow ≥85 → “productive fatigue last time”
  - fatigueDetected=true AND 65–84 → “borderline fatigue last time”
  - fatigueDetected=true AND <65 → “unproductive fatigue—pull back today”
- Symmetry cue: if (symmetryTrendPct < 90 OR lastSession.symmetryPct < 90) → add one brief stance/setup or unilateral cue.
- Timing: if nextOptimalMinutes > 0 → mention the window (e.g., “~45 min”).
- Session context phrasing:
  - postSessionStatus="just_finished": cooldown/recovery guidance (no new workout now).
  - postSessionStatus="recovered_24h": readiness-based plan for today.
  - "none": default to day classification.

OUTPUT
- daily_banner → 1–2 short sentences, plain text only.
- qa → 2–5 short sentences, plain text only: acknowledge the question, give 1–3 actionable steps, optional tiny “why”.
- Avoid robotic phrasing (“execute/cap/bank”); prefer “finish there,” “keep it smooth,” “short and clean,” “let’s build.”`;

function formatPromptValue(value: unknown): string {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
        return 'null';
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : 'null';
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    return JSON.stringify(value);
}

function derivePostSessionStatus(state: CoachContextState | undefined): "recovered_24h" | "just_finished" | "none" {
    switch (state) {
        case 'postWorkout':
            return 'just_finished';
        case 'midRecovery':
        case 'cooldown':
            return 'recovered_24h';
        default:
            return 'none';
    }
}

function toMinutes(hours: number | null | undefined): number | null {
    if (typeof hours !== 'number' || !Number.isFinite(hours)) {
        return null;
    }
    return Math.max(0, Math.round(hours * 60));
}

const FEW_SHOT_EXAMPLES = [
    {
        user: [
            'Use the system instruction to produce either a daily banner or a Q&A answer.',
            '',
            'MODE: daily_banner',
            '',
            'CONTEXT:',
            '- postSessionStatus: recovered_24h',
            '- readinessNow: 88',
            '- baselineReadiness: 72',
            '- recoverySlopePerHr: 0.6',
            '- nextOptimalMinutes: 45',
            '- symmetryTrendPct: 93',
            '- strain24h: 18',
            '- notes: had coffee',
            '',
            'LAST_SESSION:',
            '- fatigueDetected: true',
            '- readiness: 90',
            '- symmetryPct: 94',
            '',
            'USER_QUESTION (only if MODE=qa):',
            '',
            'CONSTRAINTS:',
            '- Plain text only.',
            '- If MODE=daily_banner: 1–2 short sentences; include day color implicitly via guidance (green/yellow/red logic).',
            '- If MODE=qa: 2–5 short sentences; give specific, safe, actionable suggestions; adapt to context if present.',
            '- Mention nextOptimalMinutes if > 0.',
            '- Add a symmetry cue only if < 90%.',
            '- No invented numbers or medical advice.',
        ].join('\n'),
        assistant: `You’re in a green day and last time was productive fatigue—nice dose. In ~45 minutes you’ll be in an even better pocket; hit a focused main lift with clean reps and stop before it turns grindy.`,
    },
    {
        user: [
            'Use the system instruction to produce either a daily banner or a Q&A answer.',
            '',
            'MODE: qa',
            '',
            'CONTEXT:',
            '- postSessionStatus: just_finished',
            '- readinessNow: 74',
            '- baselineReadiness: 70',
            '- recoverySlopePerHr: null',
            '- nextOptimalMinutes: null',
            '- symmetryTrendPct: 94',
            '- strain24h: 32',
            '- notes: null',
            '',
            'LAST_SESSION:',
            '- fatigueDetected: true',
            '- readiness: 76',
            '- symmetryPct: 92',
            '',
            'USER_QUESTION (only if MODE=qa):',
            'How can I recover faster?',
            '',
            'CONSTRAINTS:',
            '- Plain text only.',
            '- If MODE=daily_banner: 1–2 short sentences; include day color implicitly via guidance (green/yellow/red logic).',
            '- If MODE=qa: 2–5 short sentences; give specific, safe, actionable suggestions; adapt to context if present.',
            '- Mention nextOptimalMinutes if > 0.',
            '- Add a symmetry cue only if < 90%.',
            '- No invented numbers or medical advice.',
        ].join('\n'),
        assistant: `Great question—focus on the basics: 7–9h sleep, steady hydration, and a balanced meal with protein and carbs. Add 10–15 minutes of easy movement or mobility to get blood flowing, and if anything feels grindy, keep it short and clean today.`,
    },
];

const formatPercentString = (value: number, digits = 1): string => `${(value * 100).toFixed(digits)}%`;

const isAbortError = (error: unknown): boolean => {
    if (!error) return false;
    if ((error as any).name === 'AbortError') return true;
    const message = (error as any).message;
    return typeof message === 'string' && message.toLowerCase().includes('abort');
};

const tryParseJsonObject = (raw: string | null | undefined): any | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
        return JSON.parse(trimmed);
    } catch {
        const match = trimmed.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch {
                // ignore
            }
        }
    }
    return null;
};

type GeminiDisableContext = {
    code: string;
    message: string;
    at?: number;
    fingerprint?: string;
};

const GEMINI_DISABLED_STORAGE_KEY = '__GEMINI_DISABLED__';
const GEMINI_DISABLE_TTL_MS = 10 * 60 * 1000;

const coerceGeminiDisableContext = (value: unknown): GeminiDisableContext | null => {
    if (!value || typeof value !== 'object') {
        return null;
    }
    const candidate = value as any;
    const code = typeof candidate.code === 'string' ? candidate.code : undefined;
    const message = typeof candidate.message === 'string' ? candidate.message : undefined;
    const at =
        typeof candidate.at === 'number' && Number.isFinite(candidate.at) ? candidate.at : undefined;
    const fingerprint = typeof candidate.fingerprint === 'string' ? candidate.fingerprint : undefined;
    if (!code || !message) {
        return null;
    }
    return { code, message, at, fingerprint };
};

const fingerprintGeminiKey = (key: string): string => {
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
        hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16);
};

const clearPersistedGeminiDisableContext = () => {
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.removeItem(GEMINI_DISABLED_STORAGE_KEY);
        } catch {
            // ignore storage cleanup errors
        }
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).__GEMINI_DISABLED__) {
        delete (globalThis as any).__GEMINI_DISABLED__;
    }
};

const validateGeminiDisableContext = (
    context: GeminiDisableContext | null,
    currentFingerprint?: string | null,
): GeminiDisableContext | null => {
    if (!context) {
        return null;
    }
    if (context.at && Date.now() - context.at > GEMINI_DISABLE_TTL_MS) {
        clearPersistedGeminiDisableContext();
        return null;
    }
    if (currentFingerprint && context.fingerprint && context.fingerprint !== currentFingerprint) {
        clearPersistedGeminiDisableContext();
        return null;
    }
    return context;
};

const getRuntimeDisabledContext = (currentFingerprint?: string | null): GeminiDisableContext | null => {
    if (typeof globalThis !== 'undefined') {
        const runtime = validateGeminiDisableContext(
            coerceGeminiDisableContext((globalThis as any).__GEMINI_DISABLED__),
            currentFingerprint,
        );
        if (runtime) {
            return runtime;
        }
    }
    if (typeof localStorage !== 'undefined') {
        try {
            const persisted = localStorage.getItem(GEMINI_DISABLED_STORAGE_KEY);
            if (persisted) {
                const parsed = JSON.parse(persisted);
                const context = validateGeminiDisableContext(
                    coerceGeminiDisableContext(parsed),
                    currentFingerprint,
                );
                if (context) {
                    if (typeof globalThis !== 'undefined') {
                        (globalThis as any).__GEMINI_DISABLED__ = context;
                    }
                    return context;
                }
            }
        } catch (error) {
            console.warn('Failed to read persisted Gemini disable context:', error);
        }
    }
    return null;
};

let currentGeminiKeyFingerprint: string | null = (() => {
    const key = resolveGeminiApiKey();
    return key ? fingerprintGeminiKey(key) : null;
})();

let geminiDisabled: GeminiDisableContext | null = getRuntimeDisabledContext(currentGeminiKeyFingerprint);

const markGeminiDisabled = (code: string, message: string) => {
    const fingerprint = currentGeminiKeyFingerprint ?? (() => {
        const key = resolveGeminiApiKey();
        return key ? fingerprintGeminiKey(key) : undefined;
    })();
    const context: GeminiDisableContext = { code, message, at: Date.now(), fingerprint };
    if (
        geminiDisabled &&
        geminiDisabled.code === context.code &&
        geminiDisabled.message === context.message &&
        geminiDisabled.fingerprint === context.fingerprint
    ) {
        return;
    }
    geminiDisabled = context;
    if (typeof globalThis !== 'undefined') {
        (globalThis as any).__GEMINI_DISABLED__ = context;
    }
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(GEMINI_DISABLED_STORAGE_KEY, JSON.stringify(context));
        } catch (error) {
            console.warn('Failed to persist Gemini disable context:', error);
        }
    }
    geminiClient = null;
    console.warn(`[Gemini] Disabled (${code}): ${message}`);
};

const detectGeminiCredentialError = (error: unknown) => {
    if (geminiDisabled) {
        return;
    }

    const structuralCandidates: unknown[] = [];
    const textCandidates: string[] = [];

    if (typeof error === 'string') {
        textCandidates.push(error);
    } else if (error && typeof error === 'object') {
        structuralCandidates.push(error);
    }

    if (error instanceof Error && typeof error.message === 'string') {
        textCandidates.push(error.message);
    }

    const inspectStructured = (value: unknown): boolean => {
        if (!value || typeof value !== 'object') {
            return false;
        }
        const target = (value as any).error ?? value;
        const message = typeof target?.message === 'string' ? target.message : undefined;
        if (message) {
            const lower = message.toLowerCase();
            if (
                lower.includes('api key not valid') ||
                lower.includes('invalid api key') ||
                lower.includes('api_key_invalid')
            ) {
                markGeminiDisabled('API_KEY_INVALID', message);
                return true;
            }
        }

        const reason =
            typeof target?.reason === 'string'
                ? target.reason
                : typeof target?.status === 'string'
                  ? target.status
                  : undefined;
        if (reason && reason.toUpperCase().includes('API_KEY')) {
            markGeminiDisabled(reason.toUpperCase(), message ?? reason);
            return true;
        }

        const details = Array.isArray(target?.details)
            ? target.details
            : Array.isArray(target?.error?.details)
              ? target.error.details
              : null;
        if (details) {
            for (const detail of details) {
                if (inspectStructured(detail)) {
                    return true;
                }
                const detailReason =
                    typeof (detail as any)?.reason === 'string'
                        ? (detail as any).reason
                        : typeof (detail as any)?.metadata?.reason === 'string'
                          ? (detail as any).metadata.reason
                          : undefined;
                if (detailReason && detailReason.toUpperCase().includes('API_KEY')) {
                    markGeminiDisabled(detailReason.toUpperCase(), detailReason);
                    return true;
                }
            }
        }

        try {
            const serialised = JSON.stringify(target);
            if (serialised && serialised.toLowerCase().includes('api_key')) {
                markGeminiDisabled('API_KEY_INVALID', message ?? 'Gemini API key invalid');
                return true;
            }
        } catch {
            // ignore JSON serialisation issues
        }

        return false;
    };

    for (const candidate of structuralCandidates) {
        if (inspectStructured(candidate)) {
            return;
        }
    }

    for (const text of textCandidates) {
        const lower = text.toLowerCase();
        if (
            lower.includes('api key not valid') ||
            lower.includes('invalid api key') ||
            lower.includes('api_key_invalid')
        ) {
            markGeminiDisabled('API_KEY_INVALID', text);
            return;
        }
        const parsed = tryParseJsonObject(text);
        if (parsed && inspectStructured(parsed)) {
            return;
        }
    }
};

const coerceRuntimeBoolean = (value: unknown): boolean | undefined => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();
        if (!trimmed) return undefined;
        if (['0', 'false', 'no', 'off'].includes(trimmed)) return false;
        if (['1', 'true', 'yes', 'on'].includes(trimmed)) return true;
        return true;
    }
    return Boolean(value);
};

const resolveBooleanFlag = (
    runtimeKey: string,
    envKey: string | undefined,
    fallbackEnvKey?: string,
    defaultValue = false,
): boolean => {
    if (typeof globalThis !== 'undefined') {
        const runtimeValue = (globalThis as any)[runtimeKey];
        const runtimeCoerced = coerceRuntimeBoolean(runtimeValue);
        if (runtimeCoerced !== undefined) return runtimeCoerced;
    }

    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        const envValue = envKey ? (import.meta as any).env[envKey] : undefined;
        const envCoerced = coerceRuntimeBoolean(envValue);
        if (envCoerced !== undefined) return envCoerced;

        if (fallbackEnvKey) {
            const fallbackValue = (import.meta as any).env[fallbackEnvKey];
            const fallbackCoerced = coerceRuntimeBoolean(fallbackValue);
            if (fallbackCoerced !== undefined) return fallbackCoerced;
        }
    }

    if (typeof process !== 'undefined' && process.env) {
        const procValue = envKey ? process.env[envKey] : undefined;
        const procCoerced = coerceRuntimeBoolean(procValue);
        if (procCoerced !== undefined) return procCoerced;

        if (fallbackEnvKey) {
            const procFallback = process.env[fallbackEnvKey];
            const procFallbackCoerced = coerceRuntimeBoolean(procFallback);
            if (procFallbackCoerced !== undefined) return procFallbackCoerced;
        }
    }

    return defaultValue;
};

const isQuadBlock = (block: WorkoutPlan['blocks'][number] | undefined): boolean => {
    if (!block || !block.exercise) return false;
    const id = typeof block.exercise.id === 'string' ? block.exercise.id.toLowerCase() : '';
    if (id && QUAD_EXERCISE_IDS.has(id)) return true;
    if (block.exercise.quad_dominant === true) return true;
    const name = typeof block.exercise.name === 'string' ? block.exercise.name.toLowerCase() : '';
    if (name && QUAD_KEYWORDS.some((keyword) => name.includes(keyword))) return true;
    return false;
};

const enforceQuadFocus = (plan: WorkoutPlan, fallback: WorkoutPlan): WorkoutPlan => {
    const fallbackBlocks = fallback.blocks;
    let replaced = false;
    const adjusted = plan.blocks.map((block, index) => {
        if (isQuadBlock(block)) {
            return block;
        }
        replaced = true;
        return fallbackBlocks[Math.min(index, fallbackBlocks.length - 1)] ?? block;
    });

    if (!replaced) {
        return plan;
    }

    return {
        ...plan,
        blocks: adjusted,
        alternatives: [],
    };
};

const coerceHeroCopyFromResponse = (response: any): { line1: string; line2: string } | null => {
    const candidates =
        response?.response?.candidates ??
        response?.candidates ??
        response?.output ??
        [];
    const parts = Array.isArray(candidates)
        ? candidates.flatMap((candidate: any) => candidate?.content?.parts ?? candidate?.parts ?? [])
        : [];

    for (const part of parts) {
        if (typeof part?.text === 'string') {
            const parsed = tryParseJsonObject(part.text);
            if (parsed?.line1 && parsed?.line2) {
                return {
                    line1: String(parsed.line1).trim(),
                    line2: String(parsed.line2).trim(),
                };
            }
        }
        const fnCall = part?.functionCall;
        if (fnCall) {
            const args =
                fnCall.arguments ??
                fnCall.args ??
                fnCall.parameters ??
                fnCall.payload ??
                null;
            if (typeof args === 'string') {
                const parsed = tryParseJsonObject(args);
                if (parsed?.line1 && parsed?.line2) {
                    return {
                        line1: String(parsed.line1).trim(),
                        line2: String(parsed.line2).trim(),
                    };
                }
            } else if (args && typeof args === 'object') {
                if ((args as any).line1 && (args as any).line2) {
                    return {
                        line1: String((args as any).line1).trim(),
                        line2: String((args as any).line2).trim(),
                    };
                }
            }
        }
        const fnResponse = part?.functionResponse?.response;
        if (fnResponse && typeof fnResponse === 'object') {
            if ((fnResponse as any).line1 && (fnResponse as any).line2) {
                return {
                    line1: String((fnResponse as any).line1).trim(),
                    line2: String((fnResponse as any).line2).trim(),
                };
            }
        }
    }

    return null;
};

const buildHeroCopyFromText = (raw: string | null | undefined): { line1: string; line2: string } | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const jsonAttempt = tryParseJsonObject(trimmed);
    if (jsonAttempt?.line1 && jsonAttempt?.line2) {
        return {
            line1: String(jsonAttempt.line1).trim(),
            line2: String(jsonAttempt.line2).trim(),
        };
    }

    const parts = trimmed
        .replace(/\r\n/g, '\n')
        .split(/\n+/)
        .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9])/))
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (parts.length === 0) return null;

    const line1 = parts[0];
    const line2 = parts[1] ?? "Let's keep momentum steady and stay smart today.";

    return {
        line1,
        line2,
    };
};

export function composeCoachPrompt(args: ComposeCoachPromptArgs): string {
    const { question, context } = args;
    const mode = args.mode ?? (question.trim().length > 0 ? 'qa' : 'daily_banner');
    const readinessNow = context?.recoveryScore ?? null;
    // baselineReadiness: no recentSessions or postWorkoutReadiness in type, so set to null or use another available field if appropriate
    const baselineReadiness = null;
    const recoverySlopePerHr = context?.recoverySlopePerHr ?? null;
    const nextOptimalMinutes = toMinutes(context?.timeToNextOptimalHours ?? null);
    const symmetryTrendPct = context?.symmetryIndex ?? null;
    const strain24h = null;
    const notes = context?.subjectives?.mood ?? null;

    // lastRecentSession, postWorkoutReadiness, and symmetryPct do not exist on CoachPromptLastSessionContext
    const lastFatigueDetected = (context as any)?.lastSession?.fatigueDetected ?? null;
    const lastReadiness = (context as any)?.lastSession?.readiness ?? null;
    const lastSymmetryPct = (context as any)?.lastSession?.symmetryPct ?? null;
    const postSessionStatus = derivePostSessionStatus(context?.coachState);

    const promptLines = [
        'Use the system instruction to produce either a daily banner or a Q&A answer.',
        '',
        `MODE: ${mode}`,
        '',
        'CONTEXT:',
        `- postSessionStatus: ${postSessionStatus}`,
        `- readinessNow: ${formatPromptValue(readinessNow)}`,
        `- baselineReadiness: ${formatPromptValue(baselineReadiness)}`,
        `- recoverySlopePerHr: ${formatPromptValue(recoverySlopePerHr)}`,
        `- nextOptimalMinutes: ${formatPromptValue(nextOptimalMinutes)}`,
        `- symmetryTrendPct: ${formatPromptValue(symmetryTrendPct)}`,
        `- strain24h: ${formatPromptValue(strain24h)}`,
        `- notes: ${formatPromptValue(notes)}`,
        '',
        'LAST_SESSION:',
        `- fatigueDetected: ${formatPromptValue(lastFatigueDetected)}`,
        `- readiness: ${formatPromptValue(lastReadiness)}`,
        `- symmetryPct: ${formatPromptValue(lastSymmetryPct)}`,
        '',
        'USER_QUESTION (only if MODE=qa):',
        mode === 'qa' ? question : '',
        '',
        'CONSTRAINTS:',
        '- Plain text only.',
        '- If MODE=daily_banner: 1–2 short sentences; include day color implicitly via guidance (green/yellow/red logic).',
        '- If MODE=qa: 2–5 short sentences; give specific, safe, actionable suggestions; adapt to context if present.',
        '- Mention nextOptimalMinutes if > 0.',
        '- Add a symmetry cue only if < 90%.',
        '- Keep guidance tied to the set/exercise metrics provided; avoid generic “drink water” tips.',
        '- No invented numbers or medical advice.',
    ];

    const lastSummary = args.lastSetSummary ?? null;
    if (lastSummary) {
        promptLines.push(
            '',
            'LAST_SET_SUMMARY:',
            `- exercise: ${formatPromptValue(args.lastSetMeta?.exerciseName ?? null)}`,
            `- zone_at_end: ${lastSummary.zone}`,
            `- fatigue_rep: ${formatPromptValue(lastSummary.fatigueRep)}`,
            `- reps: ${lastSummary.reps}`,
            `- total_rise_pct: ${formatPercentString(lastSummary.totalRisePct, 1)}`,
            `- slope_pct_per_rep: ${formatPercentString(lastSummary.slopePctPerRep, 2)}`,
            `- signal_conf_avg: ${formatPercentString(lastSummary.signalConfidenceAvg, 1)}`,
        );
        if (lastSummary.lowSignalSpans.length) {
            const spans = lastSummary.lowSignalSpans
                .map(([from, to]) => (from === to ? `${from}` : `${from}-${to}`))
                .join(', ');
            promptLines.push(`- low_signal_spans: ${spans}`);
        }
        if (typeof lastSummary.repVelocityAvg === 'number') {
            promptLines.push(`- rep_velocity_avg: ${lastSummary.repVelocityAvg.toFixed(2)}`);
        }
        if (lastSummary.notes.length) {
            promptLines.push(`- notes: ${lastSummary.notes.join('; ')}`);
        }
    }

    if (args.lastSetMeta?.restAdvice) {
        const restAdvice = args.lastSetMeta.restAdvice;
        promptLines.push(
            '',
            'LAST_REST_ADVICE:',
            `- primary: ${restAdvice.primary}`,
            `- secondary: ${restAdvice.secondary}`,
            `- rest_seconds: ${restAdvice.restSeconds}`,
            `- effort_delta: ${restAdvice.effortDelta}`,
            `- source: ${restAdvice.source}`,
        );
    }

    if (context?.currentPlan) {
        promptLines.push(
            '',
            'CURRENT_PLAN:',
            `- intent: ${formatPromptValue(context.currentPlan.intent ?? null)}`,
            `- readiness_before: ${formatPromptValue(context.currentPlan.readinessBefore ?? null)}`,
            `- readiness_after: ${formatPromptValue(context.currentPlan.readinessAfter ?? null)}`,
        );
        context.currentPlan.blocks.slice(0, 4).forEach((block, index) => {
            const focus = block.focus ? ` • ${block.focus}` : '';
            promptLines.push(
                `  block_${index + 1}: ${block.displayName} | ${block.loadStrategy ?? '—'} | ${formatPromptValue(block.sets)} sets × ${formatPromptValue(block.reps)}${focus}`,
            );
        });
    }

    return promptLines.join('\n');
}

export function normaliseGeminiError(label: string, error: unknown) {
    const result: Record<string, unknown> = { label };
    if (error instanceof Error) {
        result.message = error.message;
        result.name = error.name;
        result.stack = error.stack;
    } else {
        result.raw = error;
        try {
            result.serialised = JSON.parse(JSON.stringify(error));
        } catch {
            // ignore
        }
    }
    detectGeminiCredentialError(error);
    if (geminiDisabled) {
        result.disabled = geminiDisabled;
    }
    if (typeof window !== "undefined") {
        (window as any).__lastGeminiError = result;
    }
    return result;
}

export const loadHistory = (): HistoricalData | null => {
    if (typeof localStorage === "undefined") {
        return null;
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as HistoricalData;
    } catch (error) {
        console.warn("Failed to load history:", error);
        return null;
    }
};

export const saveHistory = (history: HistoricalData): void => {
    if (typeof localStorage === "undefined") {
        return;
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
        console.error("Failed to save history:", error);
    }
};

// ...

const GEMINI_ENABLED = (() => {
    const runtimeOverride = typeof globalThis !== 'undefined' ? (globalThis as any).__ENABLE_GEMINI__ : undefined;
    if (runtimeOverride != null) {
        if (typeof runtimeOverride === 'string') return runtimeOverride !== '0';
        if (typeof runtimeOverride === 'boolean') return runtimeOverride;
        return Boolean(runtimeOverride);
    }
    const inline = import.meta.env?.VITE_ENABLE_GEMINI ?? '1';
    return inline !== '0';
})();

const isGeminiActive = () => {
    if (!GEMINI_ENABLED) {
        return false;
    }
    geminiDisabled = validateGeminiDisableContext(geminiDisabled, currentGeminiKeyFingerprint);
    if (!geminiDisabled) {
        const runtime = getRuntimeDisabledContext(currentGeminiKeyFingerprint);
        if (runtime) {
            geminiDisabled = runtime;
        }
    }
    return !geminiDisabled;
};

const GEMINI_MODELS = {
    primary: "gemini-2.5-flash-lite",
    lite: "gemini-2.5-flash-lite",
    heavy: "gemini-2.5-flash",
    streaming: "gemini-2.5-flash",
    tts: "gemini-2.5-flash-tts",
} as const;

let homeHeroCopyErrorLogged = false;

export const defaultWorkoutPlan: WorkoutPlan = {
    policy: {
        readiness_bands: {
            heavy_exposure_min: 70,
            productive_min: 60,
            conservative_min: 48,
        },
        emg_quality_rules: {
            target_mvc_peak: 80,
            max_ror_collapse_pct: 25,
            min_symmetry_pct: 90,
        },
        rationale: "Fallback policy derived from historical averages when Gemini is unavailable.",
        confidence: 0.4,
    },
    plan_meta: {
        intent: "quad_strength",
        readiness: 65,
        recovery_window: "PM 90–180m",
        notes: "Default session provided while the AI plan is unavailable.",
        confidence: 0.5,
    },
    blocks: [
        {
            label: "Main Exposure",
            type: "main",
            exercise: {
                id: "heel_elevated_front_squat",
                name: "Heel-Elevated Front Squat",
                quad_dominant: true,
                equipment_required: ["barbell", "plates/wedge"],
            },
            prescription: {
                sets: 2,
                reps: "3–5",
                tempo: "20X1",
                rest_s: 150,
                load_adjustment: "hold",
            },
            criteria: {
                target_mvc_pct_min: 78,
                stop_if: ["RoR collapse > 30% vs rep1", "symmetry_pct < 88"],
            },
            evidence: {
                metrics: ["%MVC_peak", "RoR_0_150", "symmetry_pct", "readiness"],
                rationale: "Maintains quad bias while staying inside the productive readiness band.",
                policy_rule_applied: "productive band + target_mvc_peak",
            },
            assumptions: ["Heel wedge available"],
            expect_label: true,
        },
        {
            label: "Accessory Unilateral",
            type: "accessory",
            exercise: {
                id: "rear_foot_elevated_split_squat",
                name: "Rear-Foot Elevated Split Squat",
                quad_dominant: true,
                equipment_required: ["dumbbell", "bench"],
            },
            prescription: {
                sets: 2,
                reps: "6/side",
                tempo: "31X0",
                rest_s: 90,
                load_adjustment: "hold",
            },
            criteria: {
                target_mvc_pct_min: 70,
                stop_if: ["fatigue_index > 0.35", "signal_quality = poor"],
            },
            evidence: {
                metrics: ["symmetry_pct", "fatigue_index", "signal_quality"],
                rationale: "Controls symmetry drift while keeping systemic fatigue manageable.",
                policy_rule_applied: "symmetry guardrail",
            },
            assumptions: [],
            expect_label: true,
        },
    ],
    alternatives: [
        {
            for_block: "Main Exposure",
            options: [
                {
                    id: "smith_machine_front_squat",
                    name: "Smith Front Squat",
                    when_to_use: "If bar path needs constraint or signal quality drops to 'ok'.",
                },
            ],
        },
    ],
    telemetry_focus: ["%MVC_peak", "RoR_0_150", "symmetry_pct", "fatigue_index"],
};

type WorkoutContextInput = Parameters<typeof fetchDailyWorkoutPlan>[0];

const OFFLINE_BLOCK_LIBRARY = {
    high: {
        main: {
            id: "heel_elevated_front_squat",
            name: "Heel-Elevated Front Squat",
            sets: 3,
            reps: "5",
            tempo: "21X1",
            rest_s: 150,
            load: "increase" as const,
            rationale: "Leverages high readiness to drive heavy quad-focused output while symmetry stays controlled.",
        },
        accessory: {
            id: "rear_foot_split_squat",
            name: "Rear-Foot Split Squat",
            sets: 3,
            reps: "8/side",
            tempo: "31X0",
            rest_s: 90,
            load: "hold" as const,
            rationale: "Locks in unilateral strength without over-spiking fatigue after the main lift.",
        },
        finisher: {
            id: "sled_push",
            name: "Heavy Sled Push",
            sets: 4,
            reps: "20m",
            tempo: "power",
            rest_s: 90,
            load: "hold" as const,
            rationale: "Finishes with concentric focus to keep DOMS low while extending power output.",
        },
    },
    medium: {
        main: {
            id: "high_bar_back_squat",
            name: "High-Bar Back Squat",
            sets: 3,
            reps: "6",
            tempo: "30X1",
            rest_s: 135,
            load: "hold" as const,
            rationale: "Maintains productive tension with moderate systemic cost at mid readiness.",
        },
        accessory: {
            id: "leg_press_single",
            name: "Single-Leg Press",
            sets: 3,
            reps: "10/side",
            tempo: "21X1",
            rest_s: 75,
            load: "hold" as const,
            rationale: "Keeps symmetry trending up while managing fatigue through machine stability.",
        },
        finisher: {
            id: "leg_extension_iso",
            name: "Leg Extension Iso Hold",
            sets: 3,
            reps: "0:30 hold",
            tempo: "iso",
            rest_s: 60,
            load: "decrease" as const,
            rationale: "Finishes with metabolic tension to extend stimulus without heavy loading.",
        },
    },
    low: {
        main: {
            id: "goblet_box_squat",
            name: "Goblet Box Squat",
            sets: 3,
            reps: "8",
            tempo: "30X1",
            rest_s: 90,
            load: "decrease" as const,
            rationale: "Uses constrained ROM to protect fatigued quads while reinforcing patterning.",
        },
        accessory: {
            id: "reverse_lunge_slider",
            name: "Reverse Lunge (Slider)",
            sets: 2,
            reps: "10/side",
            tempo: "3111",
            rest_s: 60,
            load: "n/a" as const,
            rationale: "Drives blood flow and symmetry without overloading neural resources.",
        },
        finisher: {
            id: "bike_flush",
            name: "Assault Bike Flush",
            sets: 3,
            reps: "0:60 @ 6/10",
            tempo: "steady",
            rest_s: 30,
            load: "n/a" as const,
            rationale: "Keeps recovery moving while readiness is rebuilding.",
        },
    },
} satisfies Record<string, {
    main: {
        id: string;
        name: string;
        sets: number;
        reps: string;
        tempo: string;
        rest_s: number;
        load: "increase" | "hold" | "decrease" | "n/a";
        rationale: string;
    };
    accessory: {
        id: string;
        name: string;
        sets: number;
        reps: string;
        tempo: string;
        rest_s: number;
        load: "increase" | "hold" | "decrease" | "n/a";
        rationale: string;
    };
    finisher: {
        id: string;
        name: string;
        sets: number;
        reps: string;
        tempo: string;
        rest_s: number;
        load: "increase" | "hold" | "decrease" | "n/a";
        rationale: string;
    };
}>;

function buildOfflineWorkoutPlan(context: WorkoutContextInput): WorkoutPlan {
  const readiness = Math.max(30, Math.min(95, Math.round(context.readiness ?? defaultWorkoutPlan.plan_meta.readiness)));
    const symmetry = Math.max(60, Math.round(context.metrics.symmetryPct ?? 90));
    const fatigue = Math.max(0, Math.round(context.metrics.rmsDropPct ?? 12));
    const intensityKey = readiness >= 75 ? 'high' : readiness >= 55 ? 'medium' : 'low';
    const library = OFFLINE_BLOCK_LIBRARY[intensityKey];

    const guardrails = {
        heavy: Math.min(95, Math.max(65, readiness - 5)),
        productive: Math.min(85, Math.max(55, readiness - 15)),
        conservative: Math.min(70, Math.max(40, readiness - 25)),
    };

    const recoveryLabel = context.recoveryHours != null
        ? `Aim to finish with ~${Math.max(4, Math.round(context.recoveryHours))}h recovery window.`
        : "Keep hydration and sleep primed to rebound faster.";

    const sharedStopList = [
        "signal_quality = poor",
        `symmetry_pct < ${Math.max(70, symmetry - 10)}`,
        `fatigue_index > ${(fatigue / 100 + 0.35).toFixed(2)}`,
    ];

    let nextBlockIndex = Math.max(0, Math.min(2, Math.round((context.metrics.rmsDropPct ?? 10) / 10)));
    const blockOrder: Array<{ label: string; type: "main" | "accessory" | "finisher"; config: any; target: number }> = [
        { label: 'Main', type: 'main', config: library.main, target: guardrails.heavy },
        { label: 'Accessory', type: 'accessory', config: library.accessory, target: guardrails.productive },
        { label: 'Finisher', type: 'finisher', config: library.finisher, target: guardrails.conservative },
    ];

    const buildBlock = (
        label: string,
        type: "main" | "accessory" | "finisher",
        config: any,
        targetMvc: number,
    ): WorkoutPlan['blocks'][number] => ({
        label,
        type,
        exercise: {
            id: config.id,
            name: config.name,
            quad_dominant: true,
            equipment_required: type === 'finisher' ? ['sled', 'bike', 'bodyweight'] : ['barbell', 'dumbbell', 'sled', 'machine'],
        },
        prescription: {
            sets: config.sets,
            reps: config.reps,
            tempo: config.tempo,
            rest_s: config.rest_s,
            load_adjustment: config.load === "n/a" ? "hold" : config.load,
        },
        criteria: {
            target_mvc_pct_min: targetMvc,
            stop_if: sharedStopList,
        },
        evidence: {
            metrics: ['%MVC_peak', 'symmetry_pct', 'fatigue_index'],
            rationale: config.rationale,
            policy_rule_applied: intensityKey === 'high' ? 'heavy exposure window' : intensityKey === 'medium' ? 'productive band' : 'conservative band',
        },
        assumptions: [
            'Maintain 1–2 RIR on final set',
            'Pause between reps if signal quality drops',
        ],
        expect_label: type !== 'finisher',
    });

    const orderedBlocks = [
        blockOrder[(nextBlockIndex) % blockOrder.length],
        blockOrder[(nextBlockIndex + 1) % blockOrder.length],
        blockOrder[(nextBlockIndex + 2) % blockOrder.length],
    ].map(({ label, type, config, target }) => buildBlock(label, type, config, target));

    return {
        policy: {
            readiness_bands: {
                heavy_exposure_min: guardrails.heavy,
                productive_min: guardrails.productive,
                conservative_min: guardrails.conservative,
            },
            emg_quality_rules: {
                target_mvc_peak: Math.min(95, guardrails.heavy + 5),
                max_ror_collapse_pct: Math.max(20, fatigue + 10),
                min_symmetry_pct: symmetry,
            },
            rationale: `Session tailored for readiness ${readiness} with symmetry ${symmetry}% and fatigue ${fatigue}%.`,
            confidence: 0.55,
        },
        plan_meta: {
            intent: 'quad_strength',
            readiness,
            recovery_window: recoveryLabel,
            notes:
                intensityKey === 'high'
                    ? 'Prime quads with heavy front squat exposure, then balance fatigue with controlled unilateral work.'
                    : intensityKey === 'medium'
                    ? 'Stay productive with moderated squats and machine support while symmetry normalises.'
                    : 'Keep intensity conservative while rebuilding readiness with patterning and flow work.',
            confidence: 0.45,
        },
        blocks: orderedBlocks,
        alternatives: [
            {
                for_block: 'Main',
                options: [
                    {
                        id: 'smith_machine_front_squat',
                        name: 'Smith Front Squat',
                        when_to_use: 'Swap if balance is limited or you want added bar path constraint.',
                    },
                ],
            },
            {
                for_block: 'Accessory',
                options: [
                    {
                        id: 'bulgarian_split_squat_db',
                        name: 'DB Bulgarian Split Squat',
                        when_to_use: 'Use when you need more free-weight stability work.',
                    },
                ],
            },
        ],
        telemetry_focus: ['%MVC_peak', 'symmetry_pct', 'fatigue_index'],
    };
}

function buildRecoveryWorkoutPlan(context: WorkoutContextInput): WorkoutPlan {
    const readiness = Math.round(context.readiness ?? 48);
    return {
        policy: {
            readiness_bands: {
                heavy_exposure_min: Math.max(45, readiness - 5),
                productive_min: Math.max(40, readiness - 10),
                conservative_min: Math.max(35, readiness - 15),
            },
            emg_quality_rules: {
                target_mvc_peak: 65,
                max_ror_collapse_pct: 18,
                min_symmetry_pct: Math.max(70, Math.round(context.metrics.symmetryPct ?? 80)),
            },
            rationale: 'Readiness is below the productive strength window. Today focuses on blood-flow, parasympathetic work, and gentle patterning.',
            confidence: 0.5,
        },
        plan_meta: {
            intent: 'quad_strength',
            readiness,
            recovery_window: 'Prioritize sleep + hydration • aim for >60% readiness tomorrow.',
            notes: 'Keep intensity low. Focus on breath-driven tempo and mobility to accelerate recovery.',
            confidence: 0.4,
        },
        blocks: [
            {
                label: 'Recovery Flow',
                type: 'primer',
                exercise: {
                    id: 'quad_90_90_breath',
                    name: '90/90 Breathing + Quad Opener',
                    quad_dominant: false,
                    equipment_required: ['mat'],
                },
                prescription: {
                    sets: 2,
                    reps: '5 breaths/side',
                    tempo: 'slow inhale/exhale',
                    rest_s: 30,
                    load_adjustment: 'n/a',
                },
                criteria: {
                    target_mvc_pct_min: 40,
                    stop_if: ['heart_rate > 120', 'signal_quality = poor'],
                },
                evidence: {
                    metrics: ['symmetry_pct', 'fatigue_index'],
                    rationale: 'Resets sympathetic drive and opens hip flexors without adding fatigue.',
                    policy_rule_applied: 'recovery priority',
                },
                assumptions: ['Focus on nasal breathing', 'Keep ribs stacked over pelvis'],
                expect_label: false,
            },
            {
                label: 'Recovery Strength',
                type: 'accessory',
                exercise: {
                    id: 'qb_split_squat_iso',
                    name: 'Split-Squat Iso (Support)',
                    quad_dominant: true,
                    equipment_required: ['bodyweight', 'dowel'],
                },
                prescription: {
                    sets: 2,
                    reps: '0:20 hold/side',
                    tempo: 'iso',
                    rest_s: 45,
                    load_adjustment: 'n/a',
                },
                criteria: {
                    target_mvc_pct_min: 55,
                    stop_if: ['signal_quality = poor', 'quad_tremor > 2'],
                },
                evidence: {
                    metrics: ['%MVC_peak', 'symmetry_pct'],
                    rationale: 'Drives blood flow and neural drive without heavy eccentric cost.',
                    policy_rule_applied: 'conservative band',
                },
                assumptions: ['Front foot flat, light dowel support', 'Stop if knee discomfort'],
                expect_label: false,
            },
            {
                label: 'Parasym Finisher',
                type: 'finisher',
                exercise: {
                    id: 'zone2_cycle',
                    name: 'Easy Bike Flush',
                    quad_dominant: false,
                    equipment_required: ['bike'],
                },
                prescription: {
                    sets: 3,
                    reps: '2:00 @ RPE 4',
                    tempo: 'steady',
                    rest_s: 30,
                    load_adjustment: 'n/a',
                },
                criteria: {
                    target_mvc_pct_min: 30,
                    stop_if: ['heart_rate > 135', 'signal_quality = poor'],
                },
                evidence: {
                    metrics: ['fatigue_index', 'symmetry_pct'],
                    rationale: 'Supports lactate clearance and parasympathetic rebound.',
                    policy_rule_applied: 'recovery priority',
                },
                assumptions: ['Stay conversational', 'Focus on long exhales'],
                expect_label: false,
            },
        ],
        alternatives: [
            {
                for_block: 'Recovery Strength',
                options: [
                    {
                        id: 'tke_band',
                        name: 'Terminal Knee Extension (Band)',
                        when_to_use: 'Swap if knees prefer closed-chain tension.',
                    },
                ],
            },
        ],
        telemetry_focus: ['symmetry_pct', 'fatigue_index'],
    };
}

type GeminiGenerateContentConfig = {
    abortSignal?: AbortSignal;
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    candidateCount?: number;
    stopSequences?: string[];
    responseMimeType?: string;
    responseSchema?: unknown;
};

type GeminiGenerateContentRequest = {
    model: string;
    contents: Array<Record<string, unknown>>;
    config?: GeminiGenerateContentConfig;
    tools?: unknown;
    toolConfig?: unknown;
    systemInstruction?: unknown;
    safetySettings?: unknown;
    cachedContent?: unknown;
};

type GeminiResponse = Record<string, unknown> & { text?: string };

type GeminiClient = {
    models: {
        generateContent: (request: GeminiGenerateContentRequest) => Promise<GeminiResponse>;
    };
};

const GEMINI_API_BASE_URL = (() => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_BASE_URL) {
        return String(import.meta.env.VITE_GEMINI_API_BASE_URL);
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).__GEMINI_API_BASE_URL__) {
        return String((globalThis as any).__GEMINI_API_BASE_URL__);
    }
    return 'https://generativelanguage.googleapis.com';
})();

const stripUndefined = (value: Record<string, unknown>): Record<string, unknown> => {
    for (const key of Object.keys(value)) {
        if (value[key] === undefined) {
            delete value[key];
        }
    }
    return value;
};

const coalesceCandidateText = (payload: any): string | undefined => {
    const candidates = payload?.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
        return undefined;
    }
    const tryExtractText = (parts: any): string | undefined => {
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part && typeof part === 'object') {
                    if (typeof part.text === 'string' && part.text.trim()) {
                        return part.text;
                    }
                    const call = part.functionCall;
                    if (call && typeof call === 'object') {
                        const args = call.arguments ?? call.args;
                        if (typeof args === 'string' && args.trim()) {
                            return args;
                        }
                        if (args && typeof args === 'object') {
                            try {
                                return JSON.stringify(args);
                            } catch {
                                // ignore serialization errors
                            }
                        }
                    }
                }
            }
        }
        return undefined;
    };

    for (const candidate of candidates) {
        const direct = typeof candidate?.text === 'string' ? candidate.text : undefined;
        if (direct && direct.trim()) {
            return direct;
        }
        const parts = candidate?.content?.parts ?? candidate?.parts;
        const text = tryExtractText(parts);
        if (text && text.trim()) {
            return text;
        }
    }
    return undefined;
};

const createGeminiClient = (apiKey: string): GeminiClient => {
    const baseUrl = GEMINI_API_BASE_URL.replace(/\/+$/, '');

    const buildGenerationConfig = (config?: GeminiGenerateContentConfig) => {
        if (!config) {
            return undefined;
        }
        const {
            temperature,
            topP,
            topK,
            maxOutputTokens,
            stopSequences,
            responseMimeType,
            responseSchema,
        } = config;
        const generation: Record<string, unknown> = stripUndefined({
            temperature,
            topP,
            topK,
            maxOutputTokens,
            responseMimeType,
            responseSchema,
        });
        if (Array.isArray(stopSequences) && stopSequences.length) {
            generation.stopSequences = stopSequences;
        }
        return Object.keys(generation).length ? generation : undefined;
    };

    const normaliseModelId = (model: string): string => {
        const trimmed = model.trim();
        if (trimmed.startsWith('models/')) {
            return trimmed.slice('models/'.length);
        }
        return trimmed;
    };

    return {
        models: {
            async generateContent(request) {
                const { model, contents, config, tools, toolConfig, systemInstruction, safetySettings, cachedContent } =
                    request;

                const { abortSignal, candidateCount, ...restConfig } = config ?? {};
                const generationConfig = buildGenerationConfig(restConfig);

                const payload: Record<string, unknown> = {
                    contents,
                };

                if (generationConfig) {
                    payload.generationConfig = generationConfig;
                }

                if (typeof candidateCount === 'number') {
                    payload.candidateCount = candidateCount;
                }

                if (tools !== undefined) {
                    payload.tools = tools;
                }
                if (toolConfig !== undefined) {
                    payload.toolConfig = toolConfig;
                }
                if (systemInstruction !== undefined) {
                    payload.systemInstruction = systemInstruction;
                }
                if (safetySettings !== undefined) {
                    payload.safetySettings = safetySettings;
                }
                if (cachedContent !== undefined) {
                    payload.cachedContent = cachedContent;
                }

                const url = new URL(
                    `${baseUrl}/v1beta/models/${encodeURIComponent(normaliseModelId(model))}:generateContent`,
                );
                url.searchParams.set('key', apiKey);

                const response = await fetch(url.toString(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(stripUndefined(payload)),
                    signal: abortSignal,
                });

                const contentType = response.headers.get('content-type') ?? '';
                let data: any = null;
                if (contentType.includes('application/json')) {
                    try {
                        data = await response.json();
                    } catch (error) {
                        data = null;
                    }
                } else {
                    const textBody = await response.text();
                    try {
                        data = JSON.parse(textBody);
                    } catch {
                        data = { text: textBody };
                    }
                }

                if (!response.ok) {
                    const errorPayload = data ?? {};
                    const message =
                        errorPayload?.error?.message ??
                        (typeof errorPayload === 'string' ? errorPayload : response.statusText || 'Gemini request failed');
                    const error = new Error(message || 'Gemini request failed');
                    (error as any).status = response.status;
                    (error as any).error = errorPayload;
                    throw error;
                }

                if (data && typeof data === 'object') {
                    const text = coalesceCandidateText(data);
                    if (typeof text === 'string' && text.length) {
                        data.text = text;
                    }
                }

                return data ?? {};
            },
        },
    };
};

let geminiClient: GeminiClient | null | undefined;
let geminiKeyCheckLogged = false;

export const getGeminiClient = (): GeminiClient | null => {
    if (!isGeminiActive()) {
        if (!geminiKeyCheckLogged) {
            if (!GEMINI_ENABLED) {
                console.info('[Gemini] Disabled via VITE_ENABLE_GEMINI flag. Using offline logic.');
            } else if (geminiDisabled) {
                console.warn(`[Gemini] Disabled (${geminiDisabled.code}). Using offline logic.`);
            }
            geminiKeyCheckLogged = true;
        }
        geminiClient = null;
        return geminiClient;
    }
    if (geminiClient !== undefined) {
        return geminiClient;
    }

    const apiKey = resolveGeminiApiKey();
    if (!geminiKeyCheckLogged) {
        console.info("[Gemini] API key resolved?", Boolean(apiKey));
        geminiKeyCheckLogged = true;
    }
    if (!apiKey) {
        geminiClient = null;
        currentGeminiKeyFingerprint = null;
        return geminiClient;
    }

    try {
        currentGeminiKeyFingerprint = fingerprintGeminiKey(apiKey);
        geminiDisabled = validateGeminiDisableContext(geminiDisabled, currentGeminiKeyFingerprint);
        geminiClient = createGeminiClient(apiKey);
    } catch (error) {
        console.error('Failed to initialise Gemini client:', error);
        geminiClient = null;
    }
    return geminiClient;
};

export const extractText = async (result: any): Promise<string> => {
    if (!result) return '';

    if (typeof result === 'string') {
        return result;
    }

    if (typeof result?.text === 'string') {
        return result.text;
    }

    if (typeof result?.text === 'function') {
        try {
            return await result.text();
        } catch (error) {
            console.warn('Failed to read text() from Gemini result:', error);
        }
    }

    const response = result.response ?? result;

    if (response) {
        if (typeof response?.text === 'string') {
            return response.text;
        }

        if (typeof response?.text === 'function') {
            try {
                return await response.text();
            } catch (error) {
                console.warn('Failed to read response.text() from Gemini result:', error);
            }
        }

        const candidates = response.candidates ?? response.output ?? [];
        if (Array.isArray(candidates) && candidates.length > 0) {
            const parts = candidates[0]?.content?.parts ?? candidates[0]?.parts ?? [];
            if (Array.isArray(parts)) {
                const textPart = parts.find((part: any) => typeof part?.text === 'string' && part.text.trim().length);
                if (textPart?.text) {
                    return textPart.text;
                }

                const fnCallPart = parts.find((part: any) => {
                    const call = part?.functionCall;
                    if (!call) return false;
                    return (typeof call?.args === 'object' && call.args != null) ||
                        typeof call?.arguments === 'string' ||
                        (typeof call?.arguments === 'object' && call.arguments != null);
                });
                if (fnCallPart?.functionCall) {
                    const { functionCall } = fnCallPart;
                    if (typeof functionCall.arguments === 'string') {
                        return functionCall.arguments;
                    }
                    const normalisedArgs = functionCall.args ?? functionCall.arguments;
                    if (normalisedArgs != null) {
                        try {
                            return JSON.stringify(normalisedArgs);
                        } catch (error) {
                            console.warn('Failed to serialise Gemini functionCall args:', error);
                        }
                    }
                }

                const fnResponsePart = parts.find((part: any) => part?.functionResponse?.response);
                if (fnResponsePart?.functionResponse?.response) {
                    try {
                        return JSON.stringify(fnResponsePart.functionResponse.response);
                    } catch (error) {
                        console.warn('Failed to serialise Gemini functionResponse:', error);
                    }
                }
            }
        }
    }

    return '';
};

export async function fetchPostWorkoutAnalysis(ctx: any, { signal }: { signal: AbortSignal }): Promise<{ intro: string; questions: string[] }> {
    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    if (!isGeminiActive()) {
        return FALLBACK_ANALYSIS;
    }

    const summary = ctx ?? {};
    const readinessDrop = summary.readinessDrop ?? 'unknown';
    const totalSets = summary.totalSets ?? 'unknown';
    const totalReps = summary.totalReps ?? 'unknown';
    const rawPeakActivation = summary.peakActivation;
    const peakActivation = typeof rawPeakActivation === 'number'
        ? `${rawPeakActivation}%`
        : String(rawPeakActivation ?? 'unknown');
    const setsDescription = (summary.setsData ?? []).map((s: CompletedSet, i: number) => {
        if (s.status === 'skipped') {
            return `- Set ${i + 1}: skipped`;
        }
        const avg = Number.isFinite(s.avgPeak) ? Math.round(s.avgPeak) : '—';
        return `- Set ${i + 1}: ${s.reps} reps at ${avg}% avg activation.`;
    }).join('\n');

    const prompt = `System: You are an AI Strength Coach named Symmetric.
Guidelines: Generate a JSON object with two keys: "intro" and "questions".
- "intro": A 2-3 sentence conversational summary (max 40 words) of the user's session. Focus on a positive highlight and an observation.
- "questions": An array of 3 short, distinct follow-up questions (max 12 words each) the user might ask about their session. Questions should be actionable and focus on improvement. Examples: "How can I improve my readiness?", "What should I do to get stronger?", "Explain my peak activation."

Session Data:
- Readiness Drop: ${readinessDrop} points
- Total Sets: ${totalSets}
- Total Reps: ${totalReps}
- Peak Activation: ${peakActivation}
- Sets Breakdown:
${setsDescription}`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            intro: { type: Type.STRING },
            questions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['intro', 'questions']
    };

    try {
        const client = getGeminiClient();
        if (!client) {
            return FALLBACK_ANALYSIS;
        }

        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const response = await client.models.generateContent({
            model: GEMINI_MODELS.primary,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                abortSignal: signal,
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        const rawText = response.text ?? await extractText(response);
        const parsed = rawText ? JSON.parse(rawText.trim()) : null;
        if (!parsed?.intro || !parsed?.questions) throw new Error('Invalid JSON structure');
        return parsed;
    } catch (e: any) {
        if (isAbortError(e)) {
            throw new DOMException('Aborted', 'AbortError');
        }
        console.error("Gemini API call for post-workout analysis failed:", normaliseGeminiError("postWorkoutAnalysis", e));
        return FALLBACK_ANALYSIS;
    }
}

export async function fetchCoachAnswer(args: ComposeCoachPromptArgs, { signal }: { signal: AbortSignal }): Promise<string> {
    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    if (!isGeminiActive()) {
        return GEMINI_COACH_FALLBACK_MESSAGE;
    }

    const prompt = composeCoachPrompt(args);

    try {
        const client = getGeminiClient();
        if (!client) {
            return GEMINI_COACH_FALLBACK_MESSAGE;
        }

        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const fewShotContents = FEW_SHOT_EXAMPLES.flatMap(({ user, assistant }) => [
            { role: "user" as const, parts: [{ text: user }] },
            { role: "model" as const, parts: [{ text: assistant }] },
        ]);

        const response = await client.models.generateContent({
            model: GEMINI_MODELS.primary,
            contents: [
                ...fewShotContents,
                { role: "user", parts: [{ text: prompt }] },
            ],
            config: {
                abortSignal: signal,
                temperature: 0.4,
                maxOutputTokens: 220,
                responseMimeType: "text/plain",
            },
        });
        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const raw = response.text ?? await extractText(response);
        let msg = typeof raw === 'string' ? raw.trim() : '';

        const collectCandidateText = (candidate: any): string[] => {
            const outputs: string[] = [];
            const pushText = (value: unknown) => {
                if (typeof value === 'string' && value.trim().length > 0) {
                    outputs.push(value.trim());
                }
            };

            const walk = (node: any) => {
                if (node == null) return;
                if (typeof node === 'string') {
                    pushText(node);
                    return;
                }
                if (Array.isArray(node)) {
                    node.forEach(walk);
                    return;
                }
                if (typeof node === 'object') {
                    if (typeof node.text === 'string') {
                        pushText(node.text);
                    }
                    if (typeof node.output === 'string') {
                        pushText(node.output);
                    }
                    if (node.functionCall && typeof node.functionCall === 'object') {
                        try {
                            pushText(JSON.stringify(node.functionCall));
                        } catch {
                            // ignore json errors
                        }
                    }
                    if ('parts' in node) {
                        walk((node as { parts: unknown }).parts);
                    }
                    if ('content' in node) {
                        walk((node as { content: unknown }).content);
                    }
                }
            };

            walk(candidate);
            return outputs;
        };

        if (!msg) {
            const candidateTexts =
                collectCandidateText(response) ??
                [];
            msg = candidateTexts.join(' ').replace(/\s+/g, ' ').trim();
        }

        if (!msg) {
            const fallbackCandidate = response?.candidates?.[0];
            if (fallbackCandidate) {
                const shove = (value: unknown) => {
                    if (!msg && typeof value === 'string' && value.trim().length > 0) {
                        msg = value.trim();
                    }
                };
                shove((fallbackCandidate as any)?.text);
                shove((fallbackCandidate as any)?.output);
                if (!msg && Array.isArray(fallbackCandidate?.content)) {
                    for (const block of fallbackCandidate.content) {
                        shove((block as any)?.text);
                        if (Array.isArray((block as any)?.parts)) {
                            for (const part of (block as any).parts) {
                                shove((part as any)?.text);
                                const inline = (part as any)?.inlineData;
                                if (!msg && inline?.data) {
                                    try {
                                        const decoded = typeof atob === 'function'
                                            ? atob(inline.data)
                                            : typeof Buffer !== 'undefined'
                                                ? Buffer.from(inline.data, 'base64').toString('utf-8')
                                                : '';
                                        shove(decoded);
                                    } catch {
                                        // ignore base64 errors
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (!msg) {
            try {
                const safeResponse = JSON.parse(
                    JSON.stringify(response, (_key, value) =>
                        typeof value === 'bigint' ? value.toString() : value,
                    ),
                );
                console.warn('[Gemini][coachAnswer] empty response payload', safeResponse);
            } catch {
                console.warn('[Gemini][coachAnswer] empty response payload', response);
            }
        return GEMINI_COACH_FALLBACK_MESSAGE;
        }

        console.info("[Symmetric][CoachAnswer]", {
            prompt,
            response: msg,
            state: args.context.coachState,
            intent: args.intent,
            ctaCandidate: args.context.ui.ctaCandidate,
        });
        return msg;
    } catch (e: any) {
        if (isAbortError(e)) {
            throw new DOMException('Aborted', 'AbortError');
        }
        console.error("Gemini API call for coach answer failed:", normaliseGeminiError("coachAnswer", e));
        return GEMINI_COACH_FALLBACK_MESSAGE;
    }
}

// --- NEW SYMMETRIC COACH STATE MACHINE ---

type HomeRecommendationInput = {
    readinessScore: number | null;
    trendPercentage: number | null;
    context: CoachContextState;
    ctaAction: CoachHomeFeedback['cta']['action'];
    timeSinceLastSessionMinutes: number | null;
    recentSession?: {
        readinessDrop: number | null;
        totalReps: number;
        durationSec: number | null;
        effectReps: number | null;
        effectRepRate: number | null;
    } | null;
    userProfile?: CoachUserProfile | null;
};

export async function fetchHomeRecommendations(
    input: HomeRecommendationInput,
    { signal }: { signal: AbortSignal },
): Promise<HomeRecommendation[]> {
    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    if (!isGeminiActive()) {
        return FALLBACK_HOME_RECOMMENDATIONS;
    }

    try {
        const client = getGeminiClient();
        if (!client) {
            return FALLBACK_HOME_RECOMMENDATIONS;
        }

        const {
            readinessScore,
            trendPercentage,
            context,
            ctaAction,
            timeSinceLastSessionMinutes,
            recentSession,
            userProfile,
        } = input;

        const readinessDescriptor = readinessScore != null ? `${Math.round(readinessScore)}` : 'unknown';
        const trendDescriptor =
            trendPercentage != null && Number.isFinite(trendPercentage)
                ? `${trendPercentage >= 0 ? '+' : ''}${Math.round(trendPercentage)}`
                : '0';
        const minutesSince = timeSinceLastSessionMinutes != null && Number.isFinite(timeSinceLastSessionMinutes)
            ? Math.max(0, Math.round(timeSinceLastSessionMinutes))
            : null;

        const sessionContext = (() => {
            if (!recentSession) {
                return "No completed session in the last 7 days.";
            }
            const readinessDrop =
                recentSession.readinessDrop != null && Number.isFinite(recentSession.readinessDrop)
                    ? `${Math.round(recentSession.readinessDrop)} point drop`
                    : "no readiness change recorded";
            const repLine = recentSession.totalReps > 0 ? `${recentSession.totalReps} total reps` : "no recorded reps";
            const durationLine =
                recentSession.durationSec != null && Number.isFinite(recentSession.durationSec)
                    ? `${Math.round(recentSession.durationSec / 60)} min duration`
                    : "duration unknown";

            return `Latest session: ${repLine}, ${readinessDrop}, ${durationLine}. Effect reps ${recentSession.effectReps ?? 0}, rate ${recentSession.effectRepRate ?? 0}.`;
        })();

        const contextHint = (() => {
            switch (context) {
                case 'postWorkout':
                    return 'Session just ended moments ago; coach should prioritise cooldown, refuel, and leverage elevated adaptations.';
                case 'cooldown':
                    return 'Athlete finished a session within the past hour and is winding down.';
                case 'midRecovery':
                    return 'Athlete is between sessions and focusing on recovery.';
                case 'preSession':
                    return 'Athlete is approaching the next optimal session soon.';
                case 'idle':
                default:
                    return 'Athlete is between training blocks without immediate session pressure.';
            }
        })();

        const profileContext = (() => {
            if (!userProfile) return null;
            const name = userProfile.name?.trim() || 'Athlete';
            const descriptors = [] as string[];
            if (Number.isFinite(userProfile.age)) descriptors.push(`${Math.round(userProfile.age)}y`);
            if (Number.isFinite(userProfile.weight)) descriptors.push(`${Math.round(userProfile.weight)} lbs`);
            if (Number.isFinite(userProfile.height)) descriptors.push(`${Math.round(userProfile.height)} in`);
            return `Athlete profile: ${name}${descriptors.length ? ` (${descriptors.join(', ')})` : ''}.`;
        })();

        const promptLines: string[] = [
            "You are Symmetric's strength coach. Generate exactly three actionable micro-adjustments the athlete can take to improve neuromuscular readiness and projected strength gains.",
            "Return JSON: an array of objects with fields { \"title\": string, \"description\": string, \"readinessDelta\": number, \"projectionDelta\": number, \"icon\": string }.",
            "Use short, energetic titles (max 5 words) and concise descriptions (max 140 characters).",
            "Choose an emoji icon that matches the action. readinessDelta and projectionDelta should be integers between -5 and +7.",
            `Current readiness score: ${readinessDescriptor}. Trend vs last week: ${trendDescriptor} percent.`,
            `Coach CTA in app: ${ctaAction}.`,
            minutesSince != null ? `Minutes since last session: ${minutesSince}.` : "No recent timestamp for last session.",
            `Coach state context: ${context} (${contextHint}).`,
            sessionContext,
        ];
        if (profileContext) {
            promptLines.push(profileContext);
        }
        promptLines.push("If data is missing, infer reasonable, safe general recovery or performance boosters.");
        const prompt = promptLines.join('\n');

        const schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    readinessDelta: { type: Type.NUMBER },
                    projectionDelta: { type: Type.NUMBER },
                    icon: { type: Type.STRING },
                },
                required: ['title', 'description', 'readinessDelta', 'projectionDelta'],
            },
            minItems: 3,
            maxItems: 3,
        };

        const response = await client.models.generateContent({
            model: GEMINI_MODELS.primary,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                abortSignal: signal,
                temperature: 0.65,
                responseMimeType: "application/json",
                responseSchema: schema,
                maxOutputTokens: 220,
            },
        });
        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const raw = response.text ?? await extractText(response);
        if (!raw) {
            throw new Error('Empty recommendation payload');
        }

        const parsed = JSON.parse(raw.trim());
        if (!Array.isArray(parsed)) {
            throw new Error('Recommendation payload was not an array');
        }

        const normalised = parsed
            .flat()
            .filter(Boolean)
            .slice(0, 3)
            .map((item) => {
                const title = typeof item.title === 'string' && item.title.trim().length > 0
                    ? item.title.trim()
                    : 'Coach Tip';
                const description = typeof item.description === 'string' && item.description.trim().length > 0
                    ? item.description.trim()
                    : 'Small adjustment to keep momentum.';
                const readinessDelta = Number.isFinite(Number(item.readinessDelta))
                    ? Math.round(Number(item.readinessDelta))
                    : 0;
                const projectionDelta = Number.isFinite(Number(item.projectionDelta))
                    ? Math.round(Number(item.projectionDelta))
                    : 0;
                const icon = typeof item.icon === 'string' && item.icon.trim().length > 0
                    ? item.icon.trim()
                    : '💡';

                return {
                    title,
                    description,
                    readinessDelta,
                    projectionDelta,
                    icon,
                };
            });

        if (normalised.length === 0) {
            return FALLBACK_HOME_RECOMMENDATIONS;
        }

        return normalised as HomeRecommendation[];
    } catch (e: any) {
        if (isAbortError(e)) {
            throw new DOMException('Aborted', 'AbortError');
        }
        console.error("Gemini API call for home recommendations failed:", normaliseGeminiError("homeRecommendations", e));
        return FALLBACK_HOME_RECOMMENDATIONS;
    }
}

export function getCoachContext(data: { lastSessionDate: Date | null; nextOptimalDate: Date | null }): CoachContextState {
    const now = new Date().getTime();

    const timeSinceLastSession = data.lastSessionDate ? (now - toDate(data.lastSessionDate).getTime()) / (1000 * 60) : Infinity;
    const timeToNextOptimal = data.nextOptimalDate ? (toDate(data.nextOptimalDate).getTime() - now) / (1000 * 60) : Infinity;

    // Priority Order: postWorkout > preSession > cooldown > midRecovery > idle
    if (timeSinceLastSession <= 10) return 'postWorkout';
    if (timeToNextOptimal > 0 && timeToNextOptimal <= 120) return 'preSession';
    if (timeSinceLastSession > 10 && timeSinceLastSession <= 60) return 'cooldown';
    if (timeSinceLastSession > 60 && timeSinceLastSession <= 12 * 60) return 'midRecovery';
    
    return 'idle';
}

const formatExercisesList = (exercises: string[] | undefined): string | null => {
    if (!Array.isArray(exercises)) return null;
    const cleaned = exercises
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
    if (cleaned.length === 0) return null;
    if (cleaned.length === 1) return cleaned[0]!;
    if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
    return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
};

const formatDurationMinutes = (minutes: number | null | undefined): string | null => {
    if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return null;
    const rounded = Math.round(minutes);
    return `${rounded} minute${rounded === 1 ? '' : 's'}`;
};

const formatTotalSets = (sets: number | null | undefined): string | null => {
    if (typeof sets !== 'number' || !Number.isFinite(sets) || sets <= 0) return null;
    const rounded = Math.round(sets);
    return `${rounded} set${rounded === 1 ? '' : 's'}`;
};

const describeReadinessDelta = (delta: number | null | undefined): { descriptor: string | null; pushCue: string | null } => {
    if (typeof delta !== 'number' || !Number.isFinite(delta)) {
        return { descriptor: null, pushCue: null };
    }

    if (delta < -2) {
        return {
            descriptor: 'a rare climb that shows recovery is outpacing fatigue',
            pushCue: 'lock it in with crisp technique next block',
        };
    }
    if (delta <= 2) {
        return {
            descriptor: 'barely moved, which means you banked skill without adding fatigue',
            pushCue: 'feel free to nudge the effort next block',
        };
    }
    if (delta <= 7) {
        return {
            descriptor: 'a light drop that builds skill and keeps recovery easy',
            pushCue: 'you could push a bit more next time',
        };
    }
    if (delta <= 12) {
        return {
            descriptor: 'a solid drop that signals productive strength work',
            pushCue: 'keep recovery on rails so the adaptation sticks',
        };
    }
    return {
        descriptor: 'a big drop—treat recovery like part of the session',
        pushCue: 'ease off until readiness settles back above 60',
    };
};

const describeCurrentReadiness = (
    readiness: number | null,
    ctaAction: CoachHomeFeedback['cta']['action'],
): string => {
    if (readiness == null) {
        return "let's get sensors synced and pick up right where we left off.";
    }
    if (readiness >= 85) {
        return `readiness sits at ${readiness}, so chase a crisp strength block while you're this fresh.`;
    }
    if (readiness >= 70) {
        return `readiness is ${readiness}, steady enough for a focused block without overreaching.`;
    }
    if (readiness >= 55) {
        return `readiness is ${readiness}, so keep it technical and cap it when speed fades.`;
    }
    if (ctaAction === 'start_strength') {
        return `readiness is ${readiness}, so treat today like recovery and let the system recharge.`;
    }
    return `readiness is ${readiness}, so stay patient and let recovery catch up.`;
};

const formatHoursWindow = (hours: number | null | undefined): string | null => {
    if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0) return null;
    const lower = Math.max(1, Math.floor(hours));
    const upper = Math.max(lower, Math.ceil(hours));
    if (upper === lower) {
        return `Within ${lower} hour${lower === 1 ? '' : 's'}`;
    }
    return `Within ${lower} to ${upper} hours`;
};

const lowerCaseFirst = (value: string): string => {
    if (!value) return value;
    return value.charAt(0).toLowerCase() + value.slice(1);
};

const capitalizeFirst = (value: string): string => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
};

const ensureTrailingPeriod = (value: string): string => {
    if (!value) return value;
    return /[.!?]\s*$/.test(value) ? value : `${value}.`;
};

const composeHomeCoachNarrative = (
    data: CoachData,
    ctaAction: CoachHomeFeedback['cta']['action'],
): { line1: string; line2: string } => {
    const firstName = data.userProfile?.name?.trim().split(/\s+/)[0] ?? null;
    const greeting = firstName ? `Hey ${firstName},` : 'Hey,';

    if (!data.dataSyncOK) {
        return {
            line1: `${greeting} data's still syncing from yesterday.`,
            line2: "This window is for patience—let's give it a moment so your next lift stays on track.",
        };
    }

    const latest = data.latestSessionSummary ?? null;
    const readinessNow =
        typeof data.recoveryScore === 'number' && Number.isFinite(data.recoveryScore)
            ? Math.round(data.recoveryScore)
            : null;

    const durationText = formatDurationMinutes(latest?.durationMinutes ?? null);
    const setsText = formatTotalSets(latest?.totalSets ?? null);
    const exercisesText = formatExercisesList(
        Array.isArray(latest?.primaryExercises) ? latest?.primaryExercises : undefined,
    );

    let workloadSentence = '';
    if (durationText && setsText) {
        workloadSentence = `You trained ${durationText} for ${setsText}`;
    } else if (durationText) {
        workloadSentence = `You trained ${durationText}`;
    } else if (setsText) {
        workloadSentence = `You logged ${setsText}`;
    }
    if (workloadSentence && exercisesText) {
        workloadSentence += ` on ${exercisesText}`;
    } else if (!workloadSentence && exercisesText) {
        workloadSentence = `You focused on ${exercisesText}`;
    }

    const readinessStart =
        typeof latest?.readinessStart === 'number' && Number.isFinite(latest.readinessStart)
            ? Math.round(latest.readinessStart)
            : null;
    const readinessEnd =
        typeof latest?.readinessEnd === 'number' && Number.isFinite(latest.readinessEnd)
            ? Math.round(latest.readinessEnd)
            : null;
    const dropValue =
        typeof latest?.readinessDrop === 'number' && Number.isFinite(latest.readinessDrop)
            ? Math.round(latest.readinessDrop)
            : readinessStart != null && readinessEnd != null
            ? readinessStart - readinessEnd
            : null;

    const readinessMovement =
        readinessStart != null && readinessEnd != null
            ? `and readiness moved from ${readinessStart} to ${readinessEnd}`
            : null;
    const deltaNarrative = describeReadinessDelta(dropValue);

    const summaryParts = [
        workloadSentence,
        readinessMovement,
        deltaNarrative.descriptor,
    ].filter((part): part is string => Boolean(part && part.length));

    let summarySentence = summaryParts.join(', ');
    if (summarySentence && deltaNarrative.pushCue) {
        summarySentence = `${summarySentence}, ${deltaNarrative.pushCue}`;
    }
    if (summarySentence) {
        summarySentence = ensureTrailingPeriod(summarySentence);
    }

    const opener = latest ? `${greeting} clean work.` : `${greeting} let's map today.`;
    let line1 = summarySentence
        ? `${opener} ${summarySentence}`
        : `${greeting} ${describeCurrentReadiness(readinessNow, ctaAction)}`;
    line1 = line1.trim();

    const windowText = formatHoursWindow(data.timeToNextOptimalHours);
    const mobilitySuggestionRaw =
        data.upcomingPlanSummary?.mobilitySuggestion ?? null;
    const fallbackMobility =
        ctaAction === 'start_strength'
            ? 'do a 6 minute hip opener with 90 90 for 45 seconds per side and ankle rocks for 30 seconds per side, because it keeps squat depth smooth and reduces tightness'
            : 'work in gentle mobility and breath work so legs stay loose before the next block';
    const mobilitySuggestion = mobilitySuggestionRaw?.trim().length
        ? mobilitySuggestionRaw.trim()
        : fallbackMobility;
    const mobilitySegment = mobilitySuggestion
        ? ensureTrailingPeriod(
              windowText
                  ? `${windowText}, ${lowerCaseFirst(mobilitySuggestion)}`
                  : capitalizeFirst(mobilitySuggestion),
          )
        : '';

    const trend = typeof data.strengthTrendWoW === 'number' && Number.isFinite(data.strengthTrendWoW)
        ? Math.round(data.strengthTrendWoW)
        : null;
    let progressSegment = '';
    if (trend != null) {
        if (trend > 0) {
            progressSegment = `Progress today: quad activation was up about ${Math.abs(trend)} percent versus your recent average. Nice consistency, keep it up.`;
        } else if (trend < 0) {
            progressSegment = `Progress today: quad activation dipped about ${Math.abs(trend)} percent versus your recent average. Reset technique and keep the base building.`;
        } else {
            progressSegment = 'Progress today: quad activation held steady versus your recent average. Nice consistency, keep it up.';
        }
    } else {
        progressSegment = 'Nice consistency, keep it up.';
    }
    progressSegment = ensureTrailingPeriod(progressSegment);

    const line2Parts = [mobilitySegment, progressSegment].filter(
        (part): part is string => Boolean(part && part.length),
    );
    const line2 = line2Parts.join(' ').trim();

    return {
        line1,
        line2,
    };
};

function buildFallbackHero(data: CoachData, ctaAction: CoachHomeFeedback['cta']['action']): { line1: string; line2: string } {
    return composeHomeCoachNarrative(data, ctaAction);
}

// NEW: Generate home page hero copy via Gemini API
export async function fetchHomeHeroCopy(
    data: CoachData,
    cta: CoachHomeFeedback['cta'],
    { signal }: { signal: AbortSignal }
): Promise<{ line1: string; line2: string }> {
    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    if (!isGeminiActive()) {
        const fallback = buildFallbackHero(data, cta.action);
        return fallback;
    }

    const {
        recoveryScore,
        strengthTrendWoW,
        timeSinceLastSessionMinutes,
        dataSyncOK,
        context,
    } = data;

    const roundedRecovery = recoveryScore != null ? Math.round(recoveryScore) : null;
    const firstName = data.userProfile?.name?.trim().split(/\s+/)[0] ?? null;

    const readinessLevel = (() => {
        if (roundedRecovery == null) return 'unknown';
        if (roundedRecovery >= 85) return 'high';
        if (roundedRecovery >= 50) return 'mid';
        return 'low';
    })();

    const trendDescriptor = (() => {
        if (strengthTrendWoW == null) return 'steady';
        if (strengthTrendWoW >= 2) return 'rising';
        if (strengthTrendWoW <= -2) return 'cooling';
        return 'steady';
    })();

    const justFinished =
        context === 'postWorkout' ||
        (timeSinceLastSessionMinutes != null && timeSinceLastSessionMinutes <= 20);

    const promptLines: string[] = [
        "You are a warm, encouraging personal trainer. Speak like a human who knows this athlete.",
        "",
        "Return JSON: { \"line1\": string, \"line2\": string }",
        "",
        "Format:",
        "- line1: A flowing paragraph (2-4 sentences, max 420 characters)",
        "- line2: Empty string (not used)",
        "",
        "Tone:",
        "- Friendly, natural, no slang or emojis",
        "- Casual but professional",
        "- No em dashes, bullet lists, or technical jargon",
        "",
        "Structure for line1:",
        `1. Greeting: ${firstName ? `"Hey ${firstName}, "` : '"'} + brief acknowledgment`,
        `2. State: "Your readiness is at ${roundedRecovery ?? '—'}" + what it means`,
        "3. Action: What to do and why it makes sense",
        "4. (Optional) Brief encouragement or next step",
        "",
        "Example outputs:",
        "",
        `Readiness 80+ (fresh):`,
        `"Hey ${firstName ?? 'there'}, your readiness is at 85, which means you're fresh and recovered. This is a great time to add a focused strength block before you drift toward 50, so you can maximize gains while you have this high energy. Keep it technical and stop when power starts to fade."`,
        "",
        `Readiness 65-79 (solid):`,
        `"Hey ${firstName ?? 'there'}, your readiness is at 68, which is solid for training without overdoing it. You can add a clean strength block now and wrap up as you approach 50 to balance stimulus and recovery. Stay sharp and rack when form softens."`,
        "",
        `Readiness 50-64 (workable):`,
        `"Hey ${firstName ?? 'there'}, your readiness is at 56, which is workable but you should train carefully. Light work in the 3-6 rep range will help maintain strength without adding extra recovery time. Focus on form and stop if anything feels off."`,
        "",
        `Readiness <50 (need rest):`,
        `"Hey ${firstName ?? 'there'}, your readiness is at 42, which means your body needs rest right now. Sleep and nutrition will set you up for a strong session tomorrow, so prioritize recovery over pushing through. Give it 12-24 hours before your next block."`,
        "",
        `Context: readiness=${roundedRecovery ?? '?'}, level=${readinessLevel}, action=${cta.action}, justFinished=${justFinished}`,
        "",
        "Rules:",
        "- Write ONE flowing paragraph in line1",
        "- Set line2 to empty string",
        "- Use natural language: 'which means', 'so you can', 'to help'",
        "- Connect current state → action → reasoning → outcome",
        `- Recommended action: ${cta.action === 'start_strength' ? 'add a strength block' : cta.action === 'start_recovery' ? 'do light movement for 20-30min' : 'rest and plan tomorrow'}`,
        "- If justFinished=true, acknowledge the recent session briefly",
        "- Max 420 characters total",
    ];

    const prompt = promptLines.join('\n');

    const schema = {
        type: Type.OBJECT,
        properties: {
            line1: { type: Type.STRING },
            line2: { type: Type.STRING },
        },
        required: ['line1', 'line2'],
    };

    try {
        const client = getGeminiClient();
        if (!client) {
            return buildFallbackHero(data, cta.action);
        }

        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const response = await client.models.generateContent({
            model: GEMINI_MODELS.primary,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                abortSignal: signal,
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: schema,
                maxOutputTokens: 300,
            },
        });

        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const rawText = response.text ?? await extractText(response);
        const parsed = tryParseJsonObject(rawText);
        const hero = (() => {
            if (parsed?.line1 !== undefined && parsed?.line2 !== undefined) {
                return {
                    line1: String(parsed.line1).trim(),
                    line2: String(parsed.line2).trim(),
                };
            }
            return coerceHeroCopyFromResponse(response);
        })();

        if (!hero) {
            const textHero = buildHeroCopyFromText(rawText);
            if (textHero) {
                console.warn('[Gemini][HomeHeroCopy] Falling back to text-derived hero copy.', {
                    raw: rawText,
                });
                return textHero;
            }
            throw new Error('Invalid JSON structure from Gemini');
        }

        console.info("[Symmetric][HomeHeroCopy]", { prompt, response: hero });
        homeHeroCopyErrorLogged = false;
        return hero;
    } catch (e: any) {
        if (isAbortError(e)) {
            throw new DOMException('Aborted', 'AbortError');
        }
        if (!homeHeroCopyErrorLogged) {
            const normalised = normaliseGeminiError("homeHeroCopy", e);
            const message = typeof normalised?.message === 'string'
                ? normalised.message
                : JSON.stringify(normalised);
            console.debug("[Symmetric][HomeHeroCopy] Gemini unavailable, using fallback:", message);
            homeHeroCopyErrorLogged = true;
        }
        // Fallback
        return buildFallbackHero(data, cta.action);
    }
}

export async function fetchDailyWorkoutPlan(
    context: {
        readiness: number | null;
        metrics: { rmsDropPct: number; ror: string; symmetryPct: number };
        ctaAction: CoachHomeFeedback['cta']['action'];
        recoveryHours: number | null;
        minutesSinceLastSession: number | null;
        justFinished: boolean;
        firstName: string | null;
        labels?: Record<string, unknown>;
        history?: Record<string, unknown>;
        constraints?: Record<string, unknown>;
        exerciseId?: string;
        weightKg?: number;
        est1RMKg?: number;
    },
    { signal }: { signal: AbortSignal }
): Promise<WorkoutPlan> {
    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    const offlinePlan = buildOfflineWorkoutPlan(context);

    if (!isGeminiActive()) {
        return offlinePlan;
    }

    const proxyVarietyToken = Math.floor(Math.random() * 1000);
    const proxyPayload = { context, varietyToken: proxyVarietyToken };

    let proxyEnabled = resolveBooleanFlag('__ENABLE_DAILY_PROXY__', 'VITE_ENABLE_DAILY_PROXY', 'VITE_ENABLE_COACH_API', false);
    if (proxyEnabled && typeof window !== 'undefined') {
        const { hostname, port } = window.location;
        if (hostname === 'localhost' && (port === '' || port === '3000')) {
            proxyEnabled = false;
        }
    }

    if (proxyEnabled) {
        try {
            const response = await fetch('/api/gemini/daily-workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal,
                body: JSON.stringify(proxyPayload),
            });

            if (signal.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }

            if (response.ok) {
                const plan = (await response.json()) as WorkoutPlan;
                if (plan && Array.isArray(plan.blocks) && plan.blocks.length > 0) {
                    return enforceQuadFocus(plan, offlinePlan);
                }
            }

            if (response.status !== 404) {
                throw new Error(`Proxy returned ${response.status}`);
            }
        } catch (error) {
            if (isAbortError(error)) {
                throw new DOMException('Aborted', 'AbortError');
            }
            console.warn('[Symmetric][DailyWorkoutPlan] Proxy unavailable, falling back to direct Gemini:', normaliseGeminiError('dailyWorkoutPlan', error));
        }
    }

    // Skip API proxy - use direct Gemini client call
    // (Serverless function not deployed in this environment)

    const client = getGeminiClient();
    if (!client) {
        console.info('[Symmetric][DailyWorkoutPlan] Gemini client unavailable, using offline generator.');
        return offlinePlan;
    }

    const varietyToken = Math.floor(Math.random() * 1000);

    const promptLines: string[] = [
        "You are Symmetric's Quad Strength Planner—expert in sEMG (RMS, rate-of-rise, %MVC), fatigue, and progressive overload for quadriceps development.",
        "Return ONLY JSON per the schema at the end. No markdown or extra text.",
        '',
        'PRIMARY DIRECTIVE (READ THIS FIRST)',
        'Every workout MUST bring readiness down to 50-55 by the end. This is your #1 goal.',
        'You will add as many exercises as needed (3, 4, or even 5 blocks) to achieve this target.',
        'DO NOT stop at 2 exercises unless readiness has already reached 50-55.',
        '',
        'Objective',
        'Generate today\'s most effective QUAD-FOCUSED strength plan. Prioritize compound leg exercises that build quadriceps strength and size.',
        'Strength training is forbidden below readiness 49. If readiness < 49, use light technique work or recommend rest.',
        '',
        'Inputs',
        `readiness: ${context.readiness}`,
        `metrics: { rmsDropPct: ${context.metrics.rmsDropPct}, ror: "${context.metrics.ror}", symmetryPct: ${context.metrics.symmetryPct} }`,
        `labels: ${JSON.stringify(context.labels ?? {})}`,
        `history: ${JSON.stringify(context.history ?? {})}`,
        `constraints: ${JSON.stringify(context.constraints ?? {})}`,
        `justFinished: ${context.justFinished}`,
        `minutesSinceLastSession: ${Math.round(context.minutesSinceLastSession ?? -1)}`,
        `recoveryWindowHours: ${context.recoveryHours != null ? Math.round(context.recoveryHours) : 'null'}`,
        `varietyToken: "${varietyToken}"`,
        `exerciseId: "${context.exerciseId ?? ''}"`,
        `weightKg: ${context.weightKg ?? 'null'}`,
        `est1RMKg: ${context.est1RMKg ?? 'null'}`,
        '',
        'Exercise Selection Rules (CRITICAL)',
        'STRENGTH MODE (readiness ≥ 49):',
        '  - Primary exercises ONLY: Barbell Back Squat, Front Squat, Bulgarian Split Squat, Leg Press, Hack Squat',
        '  - Accessory exercises ONLY: Leg Extension, Goblet Squat, Step-ups, Walking Lunges, Box Squats, Sissy Squat',
        '  - NEVER use: planks, cardio, aerobic work, isometric holds, core work (these do NOT build quad strength)',
        '  - Structure: 1 main compound lift + as many accessories as needed to hit readiness target',
        '  - Total blocks: typically 3-5 exercises (2 blocks is rarely enough volume)',
        '  - IMPORTANT: Keep adding exercises until readinessAfter reaches 50-55 range',
        '',
        'READINESS_TRAINING MODE (readiness < 49):',
        '  - Light technique ONLY: Bodyweight squats (15-20 reps), wall sits (30s), tempo squats (slow eccentric)',
        '  - Purpose: practice movement patterns WITHOUT fatigue or strength gains',
        '  - Total cost must be ≤ 1.0',
        '',
        'OFF_DAY MODE:',
        '  - Use when: readiness < 30, pain/illness labels present, or excessive fatigue',
        '  - Return empty blocks array with rationale explaining why rest is needed',
        '',
        'Mode rule (hard)',
        'If readiness < 49 → mode must be "readiness_training" or "off_day" (NO strength work).',
        'If readiness ≥ 49 → mode should be "strength" (unless pain/illness present).',
        '',
        'Cost model (for projection)',
        'Per-set base: heavy 2.5, moderate 1.6, light 1.0, isometric 0.6, technique 0.3, aerobic_low 0.8.',
        'Reps multiplier: ≤2 ×0.7; 3–6 ×1.0; 7–10 ×1.15; >10 ×1.3.',
        'RMS-drop multiplier (avg of band): <12 ×0.9; 12–20 ×1.0; 21–28 ×1.12; >28 ×1.25.',
        'TotalCost = Σ(base × repsMult × rmsDropMult);',
        'projected.readinessAfter = max(0, readinessBefore − round1(TotalCost)).',
        '',
        'Volume Target (CRITICAL - MUST ACHIEVE)',
        'PRIMARY GOAL: Every workout MUST drive readiness down to 50-55 by the end. This is NON-NEGOTIABLE.',
        'Target readinessAfter: MUST be 50-55 (never below 49, never above 56).',
        'Calculate exact TotalCost needed: TotalCost = readinessBefore - 52 (targeting mid-range of 50-55).',
        'Examples:',
        '  - Starting readiness 80 → TotalCost must be ~28 (result: 52)',
        '  - Starting readiness 75 → TotalCost must be ~23 (result: 52)',
        '  - Starting readiness 70 → TotalCost must be ~18 (result: 52)',
        '  - Starting readiness 65 → TotalCost must be ~13 (result: 52)',
        '  - Starting readiness 60 → TotalCost must be ~8 (result: 52)',
        'You MUST add enough exercises (2, 3, 4, or even 5 blocks) to reach this target.',
        '',
        'Caps (safety limits):',
        'If mode === "strength" and readiness is 49–64 → TotalCost = readiness - 52 (minimum to hit target).',
        'If mode === "strength" and readiness is 65–79 → TotalCost must be (readiness - 52), capped at 30 max.',
        'If mode === "strength" and readiness ≥ 80 → TotalCost must be (readiness - 52), capped at 40 max.',
        'If mode !== "strength" → TotalCost ≤ 1 (aim 0–0.5).',
        'The cap is a safety limit, but you should ALWAYS try to hit readinessAfter of 50-55.',
        '',
        'Strength rules (only if mode = "strength")',
        'You MUST add enough blocks to drive readiness to 50-55. Calculate running cost after each block.',
        '',
        'Block 1 (REQUIRED - Main): ONE primary compound (Barbell Squat, Front Squat, Bulgarian Split Squat, Leg Press, or Hack Squat).',
        '  - Heavy load: 4-5 sets × 3-6 reps (cost ~10-14) OR moderate load: 4 sets × 6-8 reps (cost ~8-12)',
        '  - Rest: 120-180s',
        '',
        'Block 2 (REQUIRED - Accessory 1): ONE secondary compound or isolation.',
        '  - Moderate/light: 3-4 sets × 8-12 reps (cost ~6-9)',
        '  - Examples: Leg Extension, Bulgarian Split Squat, Goblet Squat, Step-ups',
        '  - Rest: 60-90s',
        '',
        'Block 3 (REQUIRED IF readinessAfter still >55 after Block 2): ONE quad isolation or unilateral.',
        '  - Light/moderate: 3-4 sets × 10-15 reps (cost ~5-8)',
        '  - Examples: Leg Extension, Walking Lunges, Sissy Squat, Single-leg Step-ups',
        '  - Rest: 60s',
        '',
        'Block 4 (REQUIRED IF readinessAfter still >55 after Block 3): Additional quad work.',
        '  - Light/moderate: 3 sets × 12-20 reps (cost ~4-7)',
        '  - Examples: Leg Extension (burnout), Goblet Squat (high rep), Walking Lunges',
        '  - Rest: 45-60s',
        '',
        'Block 5 (Add if needed): If after 4 blocks readinessAfter is still >55, add a fifth block.',
        '  - Light: 2-3 sets × 15-20 reps (cost ~3-5)',
        '  - Examples: Leg Extension, Sissy Squat, High-rep Step-ups',
        '  - Rest: 45-60s',
        '',
        'CALCULATION PROCESS (follow exactly):',
        '1. Start with readinessBefore (from input)',
        '2. Design Block 1 → estimate its cost → subtract from readiness',
        '   Record: Block 1 readiness_before = input readiness, readiness_after = input - cost',
        '3. Design Block 2 → estimate its cost → subtract from running readiness',
        '   Record: Block 2 readiness_before = Block 1 readiness_after, readiness_after = Block 1 readiness_after - cost',
        '4. Check: is current readiness in 50-55? If YES, stop. If NO (>55), add Block 3.',
        '5. Design Block 3 → estimate its cost → subtract from running readiness',
        '   Record: Block 3 readiness_before = Block 2 readiness_after, readiness_after = Block 2 readiness_after - cost',
        '6. Check: is current readiness in 50-55? If YES, stop. If NO (>55), add Block 4.',
        '7. Continue until readinessAfter lands in 50-55 range.',
        '8. IMPORTANT: Track readiness_before, readiness_after, and block_cost for EVERY block.',
        '',
        'SymmetryMin ≥ 90 for all strength work.',
        'Respect exerciseId/weightKg if provided (user\'s preference from last session).',
        'Notes MUST explain: (1) why this exercise builds quads, (2) key form cues.',
        '',
        'Readiness training rules',
        'Light bodyweight movements ONLY. Bodyweight squats (15-20 reps), wall sits (30-45s max), tempo squats.',
        'Goal: maintain movement quality and neural patterns, NOT build strength. Keep cost ≤ 1.',
        '',
        'Contract (must pass - STRICT VALIDATION)',
        'If readiness < 49 → mode !== "strength".',
        'If mode === "strength" → projected.readinessAfter MUST be between 50 and 55 (NOT 49, NOT 56+).',
        'If mode !== "strength" → projected.readinessAfter ≥ readinessBefore − 1.',
        'Strength blocks: targets.symmetryMin ≥ 90.',
        'If pain/illness labels → mode = "off_day".',
        'STRENGTH mode: blocks array must contain ONLY quad-building exercises (NO planks, cardio, core work).',
        'STRENGTH mode: minimum 2 blocks, but keep adding until readinessAfter is 50-55.',
        'EVERY block MUST have: readiness_before (number), readiness_after (number), block_cost (number).',
        'Block readiness chain: Block[N].readiness_before === Block[N-1].readiness_after (for N > 0).',
        'Final block readiness_after === projected.readinessAfter.',
        'FAIL CONDITION: If mode="strength" and projected.readinessAfter > 55 → YOU MUST ADD MORE EXERCISES.',
        'FAIL CONDITION: If mode="strength" and projected.readinessAfter < 50 → YOU MUST REDUCE VOLUME.',
        'FAIL CONDITION: If any block is missing readiness_before, readiness_after, or block_cost → INVALID.',
        '',
        'Self-audit (MANDATORY - do this BEFORE generating JSON)',
        'Step 1: Verify ALL exercises are quad-focused compound or isolation movements.',
        'Step 2: Verify you avoided planks, cardio, isometric holds, and core exercises.',
        'Step 3: Count your blocks. Do you have at least 2?',
        'Step 4: Calculate TotalCost step by step:',
        '  - Block 1 cost = ? (use the formulas)',
        '  - Block 2 cost = ?',
        '  - Block 3 cost = ? (if present)',
        '  - Block 4 cost = ? (if present)',
        '  - TotalCost = sum of all block costs',
        'Step 5: Calculate projected.readinessAfter = readinessBefore - TotalCost',
        'Step 6: CHECK: Is projected.readinessAfter between 50 and 55?',
        '  - If > 55: ADD ANOTHER BLOCK (go back to Step 4)',
        '  - If < 50: REDUCE sets/reps in one block (go back to Step 4)',
        '  - If 50-55: GOOD, proceed to Step 7',
        'Step 7: Calculate PER-BLOCK readiness values (CRITICAL FOR TIMELINE):',
        '  - Block 1: readiness_before = readinessBefore (from input), readiness_after = readinessBefore - Block1Cost, block_cost = Block1Cost',
        '  - Block 2: readiness_before = Block1.readiness_after, readiness_after = Block1.readiness_after - Block2Cost, block_cost = Block2Cost',
        '  - Block 3: readiness_before = Block2.readiness_after, readiness_after = Block2.readiness_after - Block3Cost, block_cost = Block3Cost',
        '  - Continue for all blocks...',
        '  - Final block readiness_after MUST match projected.readinessAfter',
        'Step 8: Echo readiness into projected.readinessBefore.',
        'Step 9: Double-check contract conditions one more time.',
        'Step 10: Verify EVERY block has readiness_before, readiness_after, and block_cost fields populated.',
        'CRITICAL: Do NOT emit JSON until projected.readinessAfter is in 50-55 range AND all blocks have readiness fields.',
        '',
        'Output JSON exactly matching the schema.',
        '',
        'Output schema',
        '{',
        '"mode": "strength" | "readiness_training" | "off_day",',
        '"blocks": [',
        '{',
        '"exerciseId": string,',
        '"displayName": string,',
        '"loadStrategy": "heavy" | "moderate" | "light" | "technique" | "isometric" | "aerobic_low",',
        '"sets": number,',
        '"reps": number | string,',
        '"restSec": number,',
        '"tempo": string | null,',
        '"notes": string | null,',
        '"targets": { "rmsDropBand": [number, number] | null, "rorCue": string | null, "symmetryMin": number | null },',
        '"readiness_before": number,  // REQUIRED - readiness at start of this block',
        '"readiness_after": number,   // REQUIRED - readiness at end of this block',
        '"block_cost": number          // REQUIRED - cost of this block (readiness_before - readiness_after)',
        '}',
        '],',
        '"projected": { "readinessBefore": number, "readinessAfter": number, "delta": number },',
        '"policy": {',
        '"productiveBandSummary": string | null,',
        '"movementClass": "single_joint_stable" | "multi_joint_free" | "mixed",',
        '"loadBucket": "heavy" | "moderate" | "light",',
        '"safety": { "symmetryMin": number, "noiseFloorUsed": 7 },',
        '"reasoningSignals": { "ror": "down" | "stable" | "up", "rmsDropPct": number, "signalQuality": "low" | "ok" | "high" }',
        '},',
        '"rationale": string',
        '}',
        '',
        'Call-side tips',
        'Set temperature 0.2, candidateCount: 1, response_mime_type: application/json.',
        'If available, use Gemini response_schema matching the above.',
        'Keep your client-side validator that clamps/auto-switches if some response still violates the floor.',
    ];

    const prompt = promptLines.join('\n');

    // Retry function with exponential backoff for 503 errors
    const retryWithBackoff = async (maxRetries = 3, baseDelay = 2000) => {
        let lastError: any;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await client.models.generateContent({
                    model: 'gemini-2.5-flash-lite',
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: {
                        abortSignal: signal,
                        temperature: 0.2,
                        responseMimeType: 'application/json',
                        maxOutputTokens: 1500,  // Increased for complete workout plans
                    },
                });
            } catch (error: any) {
                lastError = error;
                const errorMsg = error?.message || String(error);
                const is503 = errorMsg.includes('503') || errorMsg.includes('overloaded') || errorMsg.includes('UNAVAILABLE');
                const is429 = errorMsg.includes('429') || errorMsg.includes('quota');

                if (is503 || is429) {
                    if (attempt < maxRetries - 1) {
                        const delay = baseDelay * Math.pow(2, attempt);
                        console.warn(`[DailyWorkoutPlan] Gemini overloaded (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                } else {
                    throw error;
                }
            }
        }
        throw lastError;
    };

    try {
        console.log('[DailyWorkoutPlan] Starting Gemini API call...');
        const response = await retryWithBackoff(3, 2000);
        console.log('[DailyWorkoutPlan] Gemini API call successful');

        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const raw = response.text ?? (await extractText(response));
        console.log('[DailyWorkoutPlan] Raw response length:', raw?.length);
        console.log('[DailyWorkoutPlan] Raw response (first 500 chars):', raw?.substring(0, 500));

        const parsed = tryParseJsonObject(raw);
        console.log('[DailyWorkoutPlan] Parsed response keys:', parsed ? Object.keys(parsed) : 'null');

        if (!parsed || typeof parsed !== 'object') {
            console.error('[DailyWorkoutPlan] Failed to parse. Raw:', raw);
            throw new Error('Invalid workout plan structure');
        }

        const candidate = parsed as Record<string, unknown>;
        const blocksRaw = Array.isArray(candidate.blocks) ? candidate.blocks : null;
        if (!blocksRaw || blocksRaw.length === 0) {
            throw new Error('Plan missing blocks');
        }

        // Validate Gemini's response schema (new format)
        const blocksAreUsable = blocksRaw.every((block) => {
            if (!block || typeof block !== 'object') return false;
            const b = block as Record<string, unknown>;
            return (
                typeof b.exerciseId === 'string' &&
                typeof b.displayName === 'string' &&
                typeof b.loadStrategy === 'string' &&
                typeof b.sets === 'number' &&
                (typeof b.reps === 'string' || typeof b.reps === 'number') &&
                typeof b.restSec === 'number'
            );
        });

        if (!blocksAreUsable) {
            throw new Error('Plan blocks incomplete');
        }

        // Transform Gemini response to WorkoutPlan format
        const transformedBlocks = blocksRaw.map((block, idx) => {
            const b = block as Record<string, unknown>;
            const targets = (b.targets as Record<string, unknown>) || {};
            const readinessBefore =
                typeof (b as any).readiness_before === 'number'
                    ? (b as any).readiness_before
                    : typeof (b as any).readinessBefore === 'number'
                    ? (b as any).readinessBefore
                    : undefined;
            const readinessAfter =
                typeof (b as any).readiness_after === 'number'
                    ? (b as any).readiness_after
                    : typeof (b as any).readinessAfter === 'number'
                    ? (b as any).readinessAfter
                    : undefined;
            const blockCostRaw =
                typeof (b as any).block_cost === 'number'
                    ? (b as any).block_cost
                    : typeof (b as any).blockCost === 'number'
                    ? (b as any).blockCost
                    : readinessBefore != null && readinessAfter != null
                    ? readinessBefore - readinessAfter
                    : undefined;
            const blockCost =
                blockCostRaw != null && Number.isFinite(blockCostRaw)
                    ? Number(blockCostRaw)
                    : undefined;
            return {
                label: b.displayName as string,
                type: idx === 0 ? 'main' : 'accessory',
                exercise: {
                    id: b.exerciseId as string,
                    name: b.displayName as string,
                    quad_dominant: true,
                    equipment_required: ['barbell', 'dumbbell'],
                },
                prescription: {
                    sets: b.sets as number,
                    reps: String(b.reps),
                    tempo: (b.tempo as string) || '2010',
                    rest_s: b.restSec as number,
                    load_adjustment: (b.loadStrategy === 'heavy' ? 'increase' : b.loadStrategy === 'moderate' ? 'hold' : 'decrease') as any,
                },
                criteria: {
                    target_mvc_pct_min: 70,
                    stop_if: ['symmetry < 85%', 'signal quality drops', 'pain'],
                },
                evidence: {
                    metrics: ['%MVC_peak', 'RoR_0_150', 'symmetry_pct', 'readiness'] as any,
                    rationale: (b.notes as string) || '',
                    policy_rule_applied: 'gemini_generated',
                },
                assumptions: [],
                expect_label: true,
                readiness_before: readinessBefore,
                readiness_after: readinessAfter,
                block_cost: blockCost,
            };
        });

        const projected = (candidate.projected as Record<string, unknown>) || {};
        const readiness = typeof projected.readinessBefore === 'number' ? projected.readinessBefore : context.readiness ?? 65;
        const projectedAfter =
            typeof projected.readinessAfter === 'number' ? projected.readinessAfter : undefined;
        const projectedDelta =
            typeof projected.delta === 'number'
                ? projected.delta
                : projectedAfter != null
                ? projectedAfter - readiness
                : undefined;

        // Build the complete WorkoutPlan
        const workoutPlan: WorkoutPlan = {
            policy: typeof candidate.policy === 'object' && candidate.policy !== null
                ? candidate.policy as WorkoutPlan['policy']
                : offlinePlan.policy,
            plan_meta: {
                intent: 'quad_strength',
                readiness: readiness,
                recovery_window: context.recoveryHours ? `~${Math.round(context.recoveryHours)}h` : 'unknown',
                notes: (candidate.rationale as string) || 'AI-generated workout plan',
                confidence: 0.8,
            },
            blocks: transformedBlocks as WorkoutPlan['blocks'],
            alternatives: Array.isArray(candidate.alternatives) ? candidate.alternatives as any : [],
            telemetry_focus: Array.isArray(candidate.telemetry_focus)
                ? candidate.telemetry_focus as any
                : ['%MVC_peak', 'RoR_0_150', 'symmetry_pct', 'readiness'],
            projected:
                projectedAfter != null && projectedDelta != null
                    ? {
                          readinessBefore: readiness,
                          readinessAfter: projectedAfter,
                          delta: projectedDelta,
                      }
                    : projectedAfter != null
                    ? {
                          readinessBefore: readiness,
                          readinessAfter: projectedAfter,
                          delta: projectedAfter - readiness,
                      }
                    : undefined,
            mode:
                typeof candidate.mode === 'string'
                    ? (candidate.mode as WorkoutPlan['mode'])
                    : undefined,
        };

        return enforceQuadFocus(workoutPlan, offlinePlan);
    } catch (error) {
        if (isAbortError(error)) {
            throw new DOMException('Aborted', 'AbortError');
        }
        console.warn('[Symmetric][DailyWorkoutPlan] Falling back:', normaliseGeminiError('dailyWorkoutPlan', error));
        return enforceQuadFocus(offlinePlan, offlinePlan);
    }
}

export function getSymmetricHomePageData(data: CoachData, isConnected: boolean): CoachHomeFeedback {
    const {
        recoveryScore,
        strengthTrendWoW,
        nextOptimalDatetime,
        timeToNextOptimalHours,
        timeSinceLastSessionMinutes,
        dataSyncOK,
        context,
    } = data;

    const roundedRecovery = recoveryScore != null ? Math.round(recoveryScore) : null;
    const roundedHours = timeToNextOptimalHours != null ? Math.max(0, Math.round(timeToNextOptimalHours)) : null;
    const hasTrendData = strengthTrendWoW != null && Number.isFinite(strengthTrendWoW);
    const roundedTrend = hasTrendData ? Number(strengthTrendWoW?.toFixed(0)) : null;

    const scheduleLine = (() => {
        if (!nextOptimalDatetime || roundedHours == null) return null;
        const day = nextOptimalDatetime.toLocaleDateString([], { weekday: 'long' });
        const time = nextOptimalDatetime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
        return `${day} • ${time} • in ~${roundedHours}h — Next optimal session`;
    })();

    let cta: CoachHomeFeedback['cta'];
    if (!isConnected) {
        cta = {
            text: "Connect Sensors",
            caption: "Pair your sensors to begin.",
            action: 'connect',
        };
    } else {
        cta = {
            text: "Start Workout",
            caption: "Dial in today's session and follow the readiness path.",
            action: 'start_strength',
        };
    }

    const hero = {
        recoveryScore: roundedRecovery,
        scheduleLine,
        trendText: hasTrendData ? `Strength trend: ${strengthTrendWoW! >= 0 ? '+' : ''}${roundedTrend}% vs last week` : 'Strength trend: —',
        trendHasData: hasTrendData,
    };

    const story = composeHomeCoachNarrative(data, cta.action);

    const quickReplyMap: Record<CoachContextState, string[]> = {
        postWorkout: ["Recover faster?", "Ready for heavy when?", "Was fatigue timed right?"],
        cooldown: ["Recover faster?", "Ready for heavy when?", "Was fatigue timed right?"],
        midRecovery: ["How long to 100%?", "Light work okay now?", "Next heavy window?"],
        preSession: ["Today’s focus?", "Rest interval?", "Warm-up ideas?"],
        idle: ["When is my next session?", "How’s my trend?", "Plan the week?"],
    };

    return {
        hero,
        coach: {
            line1: story.line1,
            line2: story.line2,
            isTyping: false,
        },
        cta,
        quickReplies: [],
        dataSyncOK,
        context,
    };
}


// --- UTILITY FUNCTIONS ---

export function computeLoadSuggestion({ rir, lastPeakPct, goal = 'strength' }: { rir: number | null, lastPeakPct: number | null, goal?: string }): LoadSuggestion {
    if (rir == null || rir < 0) {
        return { action: 'none', text: 'No RIR provided.' };
    }

    const inStrengthZone = (lastPeakPct ?? 0) >= 80;

    if (rir <= 1) {
        if (inStrengthZone) {
            return {
                action: 'increase_now',
                delta: '+2.5–5%',
                text: 'Very close to failure — increase weight slightly next set.'
            };
        }
        return {
            action: 'push_now',
            text: 'Not yet in strength zone — push harder this set before adding weight.'
        };
    }

    if (rir <= 3) {
        if (inStrengthZone) {
            return {
                action: 'maintain',
                text: 'Solid effort — keep the same weight and focus on form.'
            };
        }
        return {
            action: 'push_now',
            text: 'Build to the strength zone before increasing load.'
        };
    }

    if (inStrengthZone) {
        return {
            action: 'increase_next_session',
            delta: '+5%',
            text: 'Plenty in reserve — increase weight next session.'
        };
    }

    return {
        action: 'add_reps_next_session',
        delta: '+2 reps',
        text: 'Add 2 reps next session, then reassess load.'
    };
}

export function formatLoadCommand({ suggestion, rir, lastPeakPct }: { suggestion: LoadSuggestion | null, rir: number | null, lastPeakPct: number | null }) {
    if (!suggestion || suggestion.action === 'none') {
        return {
            command: 'Log your RIR to dial in the next set.',
            subtext: 'Aim for max strain at rep 5.'
        };
    }

    const inZone = (lastPeakPct ?? 0) >= 80;
    switch (suggestion.action) {
        case 'increase_now':
            return {
                command: 'Increase +5 lb next set.',
                subtext: 'Aim for max strain at rep 5.'
            };
        case 'push_now':
            return {
                command: 'Drive intensity before you add load.',
                subtext: inZone ? 'Hold the squeeze for each rep.' : 'Get activation into the strength zone.'
            };
        case 'maintain':
            return {
                command: 'Stay the same; hit rep 5 hard.',
                subtext: 'Keep the bar path crisp.'
            };
        case 'increase_next_session':
            return {
                command: 'Increase +5 lb next session.',
                subtext: 'Log today’s strain and recover fully.'
            };
        case 'add_reps_next_session':
            return {
                command: 'Stay the same; add 2 reps next session.',
                subtext: 'Build quality volume before the next jump.'
            };
        default:
            return {
                command: suggestion.text || 'Focus on quality; keep the load.',
                subtext: inZone ? 'Hold form through the sticking point.' : 'Push activation toward 80%.'
            };
    }
}

export function getRecoveryDirective(readiness: number | null): string {
    const score = typeof readiness === 'number' ? readiness : null;
    if (score == null) {
        return 'Refuel with 20g protein and light stretch.';
    }
    if (score < 30) {
        return 'Take 25g protein now and schedule breath work tonight.';
    }
    if (score < 40) {
        return 'Refuel with 20g protein and a slow walk to flush.';
    }
    if (score < 50) {
        return 'Hit 20g protein within 30 minutes and hydrate aggressively.';
    }
    return 'Recover with protein + mobility before the next lift.';
}

export function toDate(value: Date | number | string | FirebaseTimestamp | null | undefined): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') return new Date(value);
    if (typeof value === 'object' && typeof (value as FirebaseTimestamp).seconds === 'number') {
        return new Date((value as FirebaseTimestamp).seconds * 1000 + Math.floor(((value as FirebaseTimestamp).nanoseconds || 0) / 1e6));
    }
    return new Date(value as any);
}

const createTimestamp = (date: Date): FirebaseTimestamp => ({
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1e6,
});


const DAILY_RECOVERY_POINTS = 5;
const STRENGTH_GAIN_MIN = 0.005; // ~0.5% gain per session
const STRENGTH_GAIN_MAX = 0.008; // ~0.8% gain per session

export const getRecoveryDate = (score: number | null): Date | null => {
    if (score === null || typeof score !== 'number') return null;
    if (score >= RECOVERY_THRESHOLD) return new Date();
    let tempScore = score;
    let daysToAdd = 0;
    while (tempScore < RECOVERY_THRESHOLD && daysToAdd < 365) {
        tempScore += DAILY_RECOVERY_POINTS;
        daysToAdd += 1;
    }
    if (tempScore >= RECOVERY_THRESHOLD) {
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);
        return date;
    }
    return null;
};

const projectNextPeak = (previousPeak: number | null) => {
    if (!previousPeak || previousPeak <= 0) {
        return Math.round(200 + Math.random() * 100);
    }
    const getStrengthGainMultiplier = () => 1 + STRENGTH_GAIN_MIN + Math.random() * (STRENGTH_GAIN_MAX - STRENGTH_GAIN_MIN);
    return Math.round(previousPeak * getStrengthGainMultiplier());
};

export const generateSimulatedHistory = (latestScore = 68): { trendPoints: TrendPoint[], sessionsHistory: SessionHistoryEntry[], rawPeakHistory: RawPeakHistoryEntry[], maxMvc: number } => {
    const totalDays = 12;
    const simulatedTrend: TrendPoint[] = [];
    const simulatedSessions: SessionHistoryEntry[] = [];
    const simulatedRawPeaks: RawPeakHistoryEntry[] = [];
    const today = new Date();
    let readiness = Math.max(55, Math.min(80, latestScore - 12));
    let currentPeak = 200 + Math.random() * 100; // Establish baseline peak

    for (let dayOffset = totalDays; dayOffset >= 1; dayOffset--) {
        const date = new Date(today);
        date.setDate(date.getDate() - dayOffset);
        readiness = Math.max(50, Math.min(92, readiness + (Math.random() * 6 - 2.5)));
        const readinessRounded = Math.round(readiness);
        const pre = Math.min(100, readinessRounded + Math.floor(Math.random() * 3));
        const post = Math.max(48, readinessRounded - Math.floor(Math.random() * 5));
        const reps: Rep[] = Array.from({ length: 10 + Math.floor(Math.random() * 3) }, (_, i) => ({
            peak: Math.round(60 + Math.random() * 28),
            duration: Number((1.8 + Math.random() * 1.2).toFixed(2)),
            quality: 'Good',
            id: date.getTime() + i,
        }));
        const sessionWorkload = reps.reduce((sum, rep) => sum + rep.peak, 0);
        const simulatedMvcClamp = Math.max(1, currentPeak || 500);
        const effectCount = reps.filter(rep => rep.peak >= simulatedMvcClamp * 0.8).length;
        const effectRate = reps.length ? Math.round((effectCount / reps.length) * 100) : 0;
        const sessionEfficacy = Math.round((Math.min(100, currentPeak) + effectRate) / 2);
        const balanceScore = Math.max(70, Math.min(100, Math.round(92 + (Math.random() * 6 - 3))));
        
        simulatedTrend.push({ date: createTimestamp(date), readiness: post });
        simulatedSessions.push({
            date: createTimestamp(date),
            pre, post, reps, totalReps: reps,
            durationSec: 1500 + Math.floor(Math.random() * 450),
            workload: sessionWorkload, effectReps: effectCount, effectRepRate: effectRate,
            sessionEfficacy, balanceScore
        });

        // Push the *current* peak for this historical entry
        simulatedRawPeaks.push({
            date: createTimestamp(date),
            maxPeak: currentPeak,
            leftPeak: Math.round(currentPeak * (0.94 + Math.random() * 0.03)),
            rightPeak: Math.round(currentPeak * (0.95 + Math.random() * 0.03)),
        });
        
        // Now, project the peak for the *next* day in the history
        currentPeak = projectNextPeak(currentPeak);
    }

    return {
        trendPoints: simulatedTrend,
        sessionsHistory: simulatedSessions,
        rawPeakHistory: simulatedRawPeaks,
        maxMvc: currentPeak,
    };
};

export const clampStrengthGain = (previousPeak: number | null, proposedPeak: number | null): number => {
    if (!previousPeak || previousPeak <= 0) {
        return Math.max(200, proposedPeak || 0);
    }
    const minPeak = previousPeak * (1 + STRENGTH_GAIN_MIN);
    const maxPeak = previousPeak * (1 + STRENGTH_GAIN_MAX);
    if (!proposedPeak || proposedPeak <= 0) {
        return Math.round(minPeak);
    }
    return Math.round(Math.max(minPeak, Math.min(maxPeak, proposedPeak)));
};

// Simplified Readiness Predictor for UI demo purposes
export class LegacyPredictorAdapter {
    history: HistoricalData;
    mvcBaseline: number;
    sessionActive: boolean = false;
    reps: Rep[] = [];
    totalReps: Rep[] = [];
    currentReadiness: number = 100;
    preMVCpct: number = 100;
    lastPeakPct: number | null = null;
    tut: number = 0;
    zoneTimes: any = { "Strength Training": 0, "Hypertrophy": 0, "Muscular Endurance": 0, "Active Recovery": 0 };
    maxPeakInSet: number = 0;
    fatigueDetectedInSet: boolean = false;
    fatigueDetectedAtRep: number | null = null;
    isCalibrationSet: boolean = false;

    constructor({ mvcBaseline = 100, historicalData = {} }: { mvcBaseline?: number, historicalData?: HistoricalData } = {}) {
        this.history = historicalData;
        this.mvcBaseline = mvcBaseline;
    }

    startSession(opts: { preMVCpct?: number; mvcBaseline?: number } = {}) {
        const { preMVCpct = 100, mvcBaseline } = opts;
        if (mvcBaseline) this.mvcBaseline = mvcBaseline;
        this.sessionActive = true;
        this.currentReadiness = preMVCpct;
        this.preMVCpct = preMVCpct;
        this.reps = [];
        this.totalReps = [];
        this.tut = 0;
        this.zoneTimes = { "Strength Training": 0, "Hypertrophy": 0, "Muscular Endurance": 0, "Active Recovery": 0 };
        this.lastPeakPct = null;
        this.maxPeakInSet = 0;
        this.fatigueDetectedInSet = false;
        this.fatigueDetectedAtRep = null;
        this.isCalibrationSet = true;
    }

    processSample(rms: number, ts: number) {
        // This is a placeholder as we don't have live EMG data.
        // Reps are added via onSimulateRep in the UI.
    }
    
    addRep(rep: Rep) {
        if (!this.sessionActive) return;
        this.reps.push(rep);
        this.totalReps.push(rep);
        this.lastPeakPct = rep.peak;
        this.tut += rep.duration;
        this.maxPeakInSet = Math.max(this.maxPeakInSet, rep.peak);
        
        // Fatigue detection: if peak drops more than 15% from the set's max, flag it.
        // Only start checking after a couple of reps to establish a true peak.
        if (this.reps.length > 2 && rep.peak < (this.maxPeakInSet * 0.85) && this.fatigueDetectedAtRep === null) {
            this.fatigueDetectedInSet = true;
            this.fatigueDetectedAtRep = this.reps.length;
        }

        const getIntensityZone = (x: number) => {
          if (x >= 80) return "Strength Training";
          if (x >= 60) return "Hypertrophy";
          if (x >= 20) return "Muscular Endurance";
          return "Active Recovery";
        };

        const zone = getIntensityZone(rep.peak);
        this.zoneTimes[zone] = (this.zoneTimes[zone] || 0) + rep.duration;
        
        // Simplified fatigue model
        const fatigueCost = (rep.peak / 100) * 0.5 + (rep.duration / 5);
        this.currentReadiness = Math.max(0, this.currentReadiness - fatigueCost);
    }

    resetExercise() {
        this.reps = [];
        this.lastPeakPct = null;
        this.maxPeakInSet = 0;
        this.fatigueDetectedInSet = false;
        this.fatigueDetectedAtRep = null;
        this.isCalibrationSet = false;
    }

    generateSetCoachingAndAdjustments() {
        const numReps = this.reps.length;
        const isCalibration = this.isCalibrationSet;
        const TARGET_REP_GOAL = 5;

        let restSeconds = 90;
        let restAdjustmentSeconds = 0;
        let nextSetWeightAdjustment = 0;
        let weightAdjustmentMessage: string | null = null;
        let nextSetRestMessage = "Solid effort. Rest up and maintain focus.";
        let stopSuggestion: StopSuggestion | null = null;

        const firstRep = this.reps[0] ?? null;
        const lastRep = this.reps[this.reps.length - 1] ?? null;
        const peakDropPct = firstRep && lastRep && firstRep.peak > 0
            ? ((firstRep.peak - lastRep.peak) / firstRep.peak) * 100
            : null;

        // Previously forced stop: very early fatigue (before rep 3)
        if (this.fatigueDetectedAtRep !== null && this.fatigueDetectedAtRep < 3) {
            const reasons: StopSuggestion['reasons'] = [{
                code: 'fatigue_high',
                value: Math.round(this.maxPeakInSet || 0),
                threshold: 85,
            }];

            if (this.reps.length < 3) {
                reasons.push({ code: 'signal_unstable' });
            }

            if (peakDropPct != null && peakDropPct >= 25) {
                reasons.push({
                    code: 'rep_speed_drop',
                    value: Math.round(peakDropPct),
                    threshold: 25,
                });
            }

            stopSuggestion = {
                target: 'set',
                confidence: this.reps.length < 3 ? 0.6 : 0.85,
                reasons: reasons.slice(0, 2),
            };

            nextSetWeightAdjustment = -0.10; // -10%
            weightAdjustmentMessage = "Fatigue spiked before rep 3. Reduce load ~10% and reset for a cleaner effort next set.";
            restSeconds = 120;
            restAdjustmentSeconds = 0;
            nextSetRestMessage = "Fatigue surged. Take a longer reset before continuing.";
        }
        
        if (this.fatigueDetectedAtRep !== null) { // Fatigue was detected
            if (this.fatigueDetectedAtRep < 3) {
                // Early fatigue case handled above to preserve the stronger guidance.
            } else if (this.fatigueDetectedAtRep < TARGET_REP_GOAL) {
                // Early Fatigue
                nextSetWeightAdjustment = -0.05; // -5%
                weightAdjustmentMessage = `Fatigue hit at rep ${this.fatigueDetectedAtRep}. ${isCalibration ? 'For your next set,' : ''} decrease weight by ~5% to target failure at rep 5.`;
                restAdjustmentSeconds = 30; // +30s
                nextSetRestMessage = "Fatigue hit early. Take extra rest for full recovery.";
                restSeconds = 120;
            } else if (this.fatigueDetectedAtRep === TARGET_REP_GOAL) {
                // Perfect Fatigue
                nextSetWeightAdjustment = 0;
                weightAdjustmentMessage = `Perfect intensity! You hit fatigue right at rep ${TARGET_REP_GOAL}. Maintain this weight.`;
                restAdjustmentSeconds = 0;
                nextSetRestMessage = "You've dialed in the right intensity. Recover fully.";
                restSeconds = 90;
            } else { // > TARGET_REP_GOAL
                // Late Fatigue
                nextSetWeightAdjustment = 0.05; // +5%
                weightAdjustmentMessage = `Great endurance, fatigue hit at rep ${this.fatigueDetectedAtRep}. Increase weight by ~5% to target failure at rep 5.`;
                restAdjustmentSeconds = -15;
                nextSetRestMessage = "Strong set. Let's increase the intensity.";
                restSeconds = 75;
            }
        } else { // No fatigue detected
            if (numReps >= TARGET_REP_GOAL) {
                nextSetWeightAdjustment = 0.05; // +5%
                weightAdjustmentMessage = `Strong set with no fatigue. ${isCalibration ? 'For your next set,' : ''} increase weight by ~5% to find your failure point around rep 5.`;
                restAdjustmentSeconds = -30; // -30s
                nextSetRestMessage = "You're recovering fast. Let's increase training density.";
                restSeconds = 60;
            } else if (numReps > 0) {
                 weightAdjustmentMessage = "Set ended before fatigue. Ensure you push to at least 5 reps to maximize strength stimulus.";
                 nextSetRestMessage = "Keep your focus and intensity high for this next effort.";
                 restSeconds = 75;
            } else { // numReps === 0
                return {
                    stopSuggestion,
                    nextSetRestSeconds: 60,
                    restAdjustmentSeconds: 0,
                    nextSetWeightAdjustment: 0,
                    weightAdjustmentMessage: null,
                    nextSetRestMessage: "First set. Establish a strong mind-muscle connection.",
                };
            }
        }

        return {
            stopSuggestion,
            nextSetRestSeconds: restSeconds,
            restAdjustmentSeconds,
            nextSetWeightAdjustment,
            weightAdjustmentMessage,
            nextSetRestMessage,
        };
    }

    predictReadiness() {
        if (!this.sessionActive) return null;
        
        const intensityGuidance = (pct: number | null) => {
            const TARGET = 80;
            if (pct == null) return { state: 'unknown' as const, color: '#9CA3AF', text: '—' };
            if (pct >= TARGET) return { state: 'targetMet' as const, color: '#10B981', text: 'On target · Strong squeeze' };
            return { state: 'belowTarget' as const, color: '#9CA3AF', text: 'Below target · Squeeze harder' };
        };
        const readiness = Math.round(this.currentReadiness);
        const totalReadinessDrop = Math.max(0, this.preMVCpct - readiness);
        const coaching = this.generateSetCoachingAndAdjustments();
        let stopSuggestion = coaching.stopSuggestion;

        if (stopSuggestion) {
            const cappedReasons = stopSuggestion.reasons.slice(0, 2);
            stopSuggestion = {
                ...stopSuggestion,
                reasons: cappedReasons,
            };
        }

        if (readiness < 50) {
            const readinessReason = {
                code: 'readiness_low' as const,
                value: readiness,
                threshold: 50,
            };
            const nextReasons = stopSuggestion ? [...stopSuggestion.reasons] : [];
            const existingIndex = nextReasons.findIndex(reason => reason.code === 'readiness_low');
            if (existingIndex >= 0) {
                nextReasons[existingIndex] = readinessReason;
            } else if (nextReasons.length >= 2) {
                nextReasons[nextReasons.length - 1] = readinessReason;
            } else {
                nextReasons.push(readinessReason);
            }
            stopSuggestion = {
                target: 'exercise',
                confidence: stopSuggestion ? Math.max(stopSuggestion.confidence, 0.7) : 0.7,
                reasons: nextReasons.slice(0, 2),
            };
        }

        if (stopSuggestion && stopSuggestion.reasons.every(reason => reason.code !== 'signal_unstable')) {
            const dataPointsLow = this.reps.length < 2 || this.maxPeakInSet < 55;
            if (dataPointsLow) {
                const nextReasons = [...stopSuggestion.reasons];
                if (nextReasons.length >= 2) {
                    nextReasons[nextReasons.length - 1] = { code: 'signal_unstable' as const };
                } else {
                    nextReasons.push({ code: 'signal_unstable' as const });
                }
                stopSuggestion = {
                    ...stopSuggestion,
                    confidence: Math.min(stopSuggestion.confidence, 0.6),
                    reasons: nextReasons.slice(0, 2),
                };
            }
        }
        
        const predictRecoveryHours = (currentReadiness: number) => {
            if (currentReadiness >= RECOVERY_THRESHOLD) return 0;
            let hours = 0;
            let tempScore = currentReadiness;
            while(tempScore < RECOVERY_THRESHOLD && hours < 120) {
                tempScore += DAILY_RECOVERY_POINTS / 24;
                hours++;
            }
            return hours;
        }

        return {
            readiness,
            currentReadiness: readiness,
            totalReadinessDrop,
            sessionNmTrimp: this.totalReps.reduce((sum, r) => sum + (r.peak * r.duration), 0) / 100,
            normalizedActivation: this.lastPeakPct || 0,
            reps: [...this.reps],
            // FIX: Corrected typo from `this.totalRps` to `this.totalReps`.
            totalReps: [...this.totalReps],
            tut: this.tut,
            zoneTimes: { ...this.zoneTimes },
            intensityPill: intensityGuidance(this.lastPeakPct),
            nextSetRestSeconds: coaching.nextSetRestSeconds,
            nextSetRestMessage: coaching.nextSetRestMessage,
            nextOptimalSessionHours: predictRecoveryHours(readiness),
            nextSetRecommendation: { action: 'none' as const, text: '' },
            confidence: 0.8,
            uncertainty: 5,
            reliability: 'Medium',
            fatigueDetected: this.fatigueDetectedInSet,
            fatigueDetectedAtRep: this.fatigueDetectedAtRep,
            forceEndSet: false,
            restAdjustmentSeconds: coaching.restAdjustmentSeconds,
            nextSetWeightAdjustment: coaching.nextSetWeightAdjustment,
            weightAdjustmentMessage: coaching.weightAdjustmentMessage,
            stopSuggestion,
        };
    }

    endSession(options: { postMVCpct?: number } = {}) {
        this.sessionActive = false;
        const finalReadiness = options.postMVCpct ?? this.currentReadiness;
        return {
            predictedDrop: Math.round(this.preMVCpct - this.currentReadiness),
            actualDrop: options.postMVCpct != null ? Math.round(this.preMVCpct - options.postMVCpct) : null,
            sessionPeakPct: this.totalReps.length > 0 ? Math.max(...this.totalReps.map(r => r.peak)) : 0,
            strengthDeltaPct: null, // Simplified
            reps: [...this.totalReps]
        };
    }
}
export const GEMINI_COACH_FALLBACK_MESSAGE =
  "I'm having a bit of trouble analyzing that right now. Let's focus on recovery, and we can dig into the data later.";

// NEW: Generate session continuation coaching advice
export async function fetchSessionContinuationAdvice(
    sessionData: {
        totalReps: number;
        readinessDrop: number;
        currentReadiness: number;
        initialReadiness: number;
        sessionPeakPct: number;
    },
    { signal }: { signal: AbortSignal }
): Promise<string> {
    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    if (!isGeminiActive()) {
        return `Completed ${sessionData.totalReps} reps. Your readiness dropped by ${sessionData.readinessDrop} points.`;
    }

    const { totalReps, readinessDrop, currentReadiness, initialReadiness, sessionPeakPct } = sessionData;

    const promptLines: string[] = [
        "You are Symmetric's strength coach. The athlete just completed a set block and you need to provide guidance on whether they should continue or end their session.",
        "Analyze their performance and readiness to give personalized coaching advice.",
        "",
        "SESSION DATA:",
        `- Total reps completed: ${totalReps}`,
        `- Readiness drop: ${readinessDrop} points (from ${initialReadiness} to ${currentReadiness})`,
        `- Current readiness: ${currentReadiness}`,
        `- Peak activation: ${sessionPeakPct}%`,
        "",
        "DECISION LOGIC:",
        "- If currentReadiness >= 65: They likely have more in the tank. Encourage 1-2 more quality sets.",
        "- If currentReadiness 50-64: They're in the moderate zone. Suggest 1 more focused set if they feel good, then wrap up.",
        "- If currentReadiness < 50: They've done good work. Recommend ending session to preserve recovery.",
        "- If readinessDrop > 25: Significant fatigue. Praise the effort, suggest wrapping up.",
        "- If totalReps < 15: Light session. They could probably do more if readiness allows.",
        "- If totalReps > 30: Solid volume. Acknowledge the work done.",
        "",
        "OUTPUT FORMAT:",
        "Write 2-3 short sentences (max 180 characters total). Structure:",
        "1. Acknowledge what they did (reps + readiness drop)",
        "2. Assess current state (energy, capacity remaining)",
        "3. Give clear recommendation (continue for X more sets, or end session)",
        "",
        "TONE: Encouraging, direct, coaching. Be specific about numbers. Use 'you' and contractions.",
        "",
        "EXAMPLES:",
        "- 'Completed 17 reps, readiness dropped 18 points. You've still got plenty in the tank—grab 1-2 more quality sets before calling it.'",
        "- 'Solid 24 reps with a 22-point drop. You're in the moderate zone—one more focused set if you feel crisp, then wrap it up.'",
        "- 'Great work, 28 reps and a 30-point drop. You've earned good fatigue—time to end the session and lock in recovery.'",
        "- 'Just 12 reps with a 10-point drop. You're barely warmed up—keep pushing for at least 2 more sets.'",
        "",
        "Generate the coaching advice now. Return ONLY the plain text advice, no JSON, no extra formatting.",
    ];

    const prompt = promptLines.join('\n');

    try {
        const client = getGeminiClient();
        if (!client) {
            // Fallback
            return `Completed ${totalReps} reps. Your readiness dropped by ${readinessDrop} points.`;
        }

        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const response = await client.models.generateContent({
            model: GEMINI_MODELS.lite,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                abortSignal: signal,
                temperature: 0.7,
                responseMimeType: "text/plain",
                maxOutputTokens: 150,
            },
        });

        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const rawText = response.text ?? await extractText(response);
        const advice = rawText ? rawText.trim() : null;

        if (!advice || advice.length === 0) {
            throw new Error('Empty advice from Gemini');
        }

        console.info("[Symmetric][SessionContinuation]", { prompt, response: advice });
        return advice;
    } catch (e: any) {
        if (isAbortError(e)) {
            throw new DOMException('Aborted', 'AbortError');
        }
        console.error("Gemini API call for session continuation failed:", normaliseGeminiError("sessionContinuation", e));
        // Fallback
        return `Completed ${totalReps} reps. Your readiness dropped by ${readinessDrop} points.`;
    }
}
