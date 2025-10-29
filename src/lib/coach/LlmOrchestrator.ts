import { getGeminiClient, extractText, normaliseGeminiError } from '@/services';
import type { FatigueState } from '@/lib/fatigue/FatigueDetector';

type InsightAction = 'continue_anyway' | 'end_set' | 'none';
type InsightType = 'info' | 'suggestion' | 'caution';

type GeminiPart = {
  text?: string;
  inlineData?: { data: string; mimeType?: string };
  [key: string]: unknown;
};

type GeminiContent = {
  role: 'user' | 'model' | 'system';
  parts: GeminiPart[];
};

type GeminiCandidate = {
  text?: string;
  output?: string;
  content?: GeminiContent[] | GeminiPart[];
  parts?: GeminiPart[];
  [key: string]: unknown;
};

type GeminiGenerativeResponse = {
  text?: string;
  response?: { text?: string | (() => Promise<string>) } & Record<string, unknown>;
  candidates?: GeminiCandidate[];
  modelVersion?: string;
  usageMetadata?: Record<string, unknown>;
} & Record<string, unknown>;

type GeminiGenerateContentConfig = {
  abortSignal?: AbortSignal;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  [key: string]: unknown;
};

type GeminiGenerateContentArgs = {
  model: string;
  contents: GeminiContent[];
  systemInstruction?: string | GeminiContent;
  config?: GeminiGenerateContentConfig;
};

type GeminiGenerativeClient = {
  models: {
    generateContent: (args: GeminiGenerateContentArgs) => Promise<unknown>;
  };
};

interface CoachOrchestratorOptions {
  client?: GeminiGenerativeClient | null;
  now?: () => number;
  logger?: (event: string, payload: Record<string, unknown>) => void;
}

interface GenerateInsightOptions {
  signal?: AbortSignal;
}

type InsightMetricName = 'RMS' | 'MDF' | 'RoR' | 'Symmetry';

export interface CoachInsight {
  source: 'llm' | 'fallback';
  state: FatigueState;
  type: InsightType;
  headline: string;
  subline?: string;
  tip?: string;
  tags: Array<'Rise' | 'Plateau' | 'Fall' | 'SymmetryOff' | 'NoFatigue'>;
  actions: InsightAction[];
  rest_seconds: number;
  confidence: number;
  metric_cited: { name: InsightMetricName; value: string } | null;
}

export interface CoachInsightContext {
  user: { id: string; experience: string };
  exercise: { name: string; phase: string; rep: number };
  state: FatigueState;
  confidence: number;
  readiness?: number | null;
  baselineReadiness?: number | null;
  fatigueDetected?: boolean | null;
  rir?: number | null;
  symmetryPct?: number | null;
  rorTrend?: 'down' | 'flat' | 'up' | null;
  strain?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  metrics: {
    rms_change_pct_last_8s?: number | null;
    mdf_change_pct_last_8s?: number | null;
    ror_trend?: 'down' | 'flat' | 'up';
    symmetry_pct_diff?: number | null;
    motion_artifact?: number | null;
  };
  limits: {
    speak_min_gap_sec: number;
    max_messages_per_set: number;
    artifact_threshold: number;
  };
}

interface EvaluateResult {
  action: 'skip' | 'fallback' | 'call';
  reason?: 'artifact' | 'low_confidence' | 'noise' | 'no_signal' | 'timeout' | 'error';
}

const CONF_THRESHOLDS: Record<FatigueState, number> = {
  rise: 0.6,
  plateau: 0.6,
  fall: 0.7,
};

type ParsedModelResponse = {
  headline: string;
  subline?: string;
  tip?: string;
  tags?: Array<'Rise' | 'Plateau' | 'Fall' | 'SymmetryOff' | 'NoFatigue'>;
  actions?: InsightAction[];
  rest_seconds?: number;
  type?: InsightType;
  metric_cited?: { name: InsightMetricName; value: string } | null;
};

type FallbackReason = NonNullable<EvaluateResult['reason']> | 'error';

const SYSTEM_PROMPT = `You are a sports scientist coaching an athlete BETWEEN SETS.

TONE
- Natural, human, and encouraging—like a smart coach standing next to the rack.
- Evidence-based but plainspoken. Use contractions. No emojis, no hype.

OUTPUT
- ONE block of text, at most TWO short sentences total.
- Output PLAIN TEXT ONLY (no JSON, no quotes, no bullets).

DATA YOU MAY USE (will be provided in the user message)
- phase: Rise | Plateau | Fall
- readiness: 0–100 (current neuromuscular readiness)
- baselineReadiness: 0–100 (typical recent baseline)
- fatigueDetected: true/false
- rir: integer or null
- symmetryPct: percent or null
- rorTrend: "up" | "flat" | "down" | null
- strain: 0–100 or null
- restSeconds: seconds or 0
- notes: short context like "had coffee", "short sleep" (optional)

STRICT RULES
- Never invent numbers or causes. If notes exist, you may mention them once.
- Safety first: if fatigueDetected=true or phase=Fall → advise stopping and recovering.
- If symmetryPct < 90 → briefly cue a setup/stance fix.
- If rorTrend="down" → cue a sharper first second next set.
- If phase≠Fall and fatigueDetected=false and rir≥1 → you may suggest 1–2 clean reps max, only if form stays crisp.
- If restSeconds>0, include it naturally (e.g., "Rest 90s ...").
- Avoid robotic words like "execute/cap/bank"; prefer "finish there," "let's rack," "keep it smooth".

FATIGUE-IN-CONTEXT FRAMING (apply exactly)
- If fatigueDetected=true:
  - readiness ≥ 85 → call it "productive fatigue" (good dose at high readiness; stop now to bank quality).
  - 65 ≤ readiness < 85 → "borderline fatigue" (okay work; stop now and protect form).
  - readiness < 65 → "unproductive fatigue" (shut it down; lengthen rest or reduce demand next set).
- If fatigueDetected=false:
  - readiness ≥ 85 → "plenty in the tank" (optional 1–2 clean reps if form stays crisp).
  - 65 ≤ readiness < 85 → "steady and workable" (stay precise; same plan).
  - readiness < 65 → "low readiness" (keep it conservative; clean reps over grind).

STYLE PATTERN
- Sentence 1: What you noticed (fatigue status + how that ranks given readiness, or steady state).
- Sentence 2: The next best move (rest, form cue, tiny rep guidance).`;

const FEW_SHOT_EXAMPLES = [
  `Example 1 — Productive fatigue (high readiness)

PHASE: Fall
SIGNALS: readiness 89, baselineReadiness 72, fatigueDetected true, rir 0, symmetryPct 95, rorTrend "flat", strain 52, restSeconds 120, notes "had coffee"
EXPECTED STYLE:
That was productive fatigue at a high-readiness state—nice work finding the line. Let's rack there, rest 120s, and go again once it feels sharp.`,
  `Example 2 — Borderline fatigue (mid readiness) + symmetry drift

PHASE: Fall
SIGNALS: readiness 74, baselineReadiness 68, fatigueDetected true, rir 0, symmetryPct 87, rorTrend "down", strain 60, restSeconds 120, notes null
EXPECTED STYLE:
Borderline fatigue showed and Left/Right drifted (~87%)—that's our stop. Rest 120s, rebuild your setup, and open the next set with a sharper first second.`,
];

function toPhaseLabel(state: FatigueState, explicit?: string | null): 'Rise' | 'Plateau' | 'Fall' {
  if (explicit === 'Rise' || explicit === 'Plateau' || explicit === 'Fall') {
    return explicit;
  }
  switch (state) {
    case 'rise':
      return 'Rise';
    case 'plateau':
      return 'Plateau';
    default:
      return 'Fall';
  }
}

function formatSignalValue(value: unknown, fallback: string = 'null'): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return String(Math.round((value + Number.EPSILON) * 100) / 100);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  const stringified = String(value).trim();
  return stringified.length > 0 ? stringified : fallback;
}

function buildUserPrompt(context: CoachInsightContext): string {
  const phase = toPhaseLabel(context.state, (context as any)?.phase);
  const readiness = formatSignalValue(context.readiness ?? null);
  const baselineReadiness = formatSignalValue(context.baselineReadiness ?? null);
  const fatigueDetected = formatSignalValue(
    context.fatigueDetected ?? (context.state === 'fall'),
    'false',
  );
  const rir = formatSignalValue(context.rir ?? null);
  const symmetryDiff = context.metrics.symmetry_pct_diff;
  const computedSymmetry =
    symmetryDiff != null && Number.isFinite(symmetryDiff) ? 100 - Math.abs(symmetryDiff) : null;
  const symmetrySource = context.symmetryPct ?? computedSymmetry;
  const symmetryPct = formatSignalValue(symmetrySource);
  const rorTrend = formatSignalValue(
    context.rorTrend ?? context.metrics.ror_trend ?? null,
  );
  const strain = formatSignalValue(context.strain ?? null);
  const restSeconds = formatSignalValue(context.restSeconds ?? null, '0');
  const notes = formatSignalValue(context.notes ?? null);

  return [
    'Write one between-set coaching message using the system instruction.',
    '',
    `PHASE: ${phase}`,
    '',
    'SIGNALS:',
    `- readiness: ${readiness}`,
    `- baselineReadiness: ${baselineReadiness}`,
    `- fatigueDetected: ${fatigueDetected}`,
    `- rir: ${rir}`,
    `- symmetryPct: ${symmetryPct}`,
    `- rorTrend: ${rorTrend}`,
    `- strain: ${strain}`,
    `- restSeconds: ${restSeconds}`,
    `- notes: ${notes}`,
    '',
    'CONSTRAINTS:',
    '- Two short sentences max, plain text only.',
    '- Use the Fatigue-in-Context Framing exactly as written in the system instruction.',
    '- If restSeconds > 0, include it naturally.',
    '- If symmetryPct < 90, add a brief setup/stance cue.',
    '- No jargon; sound like a calm, human coach.',
  ].join('\n');
}

function defaultNowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function clampMetric(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}

export class CoachInsightOrchestrator {
  private client?: GeminiGenerativeClient | null;
  private readonly nowFn: () => number;
  private readonly logger?: (event: string, payload: Record<string, unknown>) => void;

  private lastInsightAtMs = Number.NEGATIVE_INFINITY;
  private insightsThisSet = 0;
  private lastState: FatigueState | null = null;
  private lastReason: FallbackReason | null = null;

  constructor(options?: CoachOrchestratorOptions) {
    this.client = options?.client;
    this.nowFn = options?.now ?? defaultNowMs;
    this.logger = options?.logger;
  }

  resetForNewSet() {
    this.lastInsightAtMs = Number.NEGATIVE_INFINITY;
    this.insightsThisSet = 0;
    this.lastState = null;
    this.lastReason = null;
  }

  getLastInsightTimestamp(): number {
    return this.lastInsightAtMs;
  }

  async generateInsight(
    context: CoachInsightContext,
    trigger: 'state' | 'checkpoint' | 'prefailure',
    options?: GenerateInsightOptions,
  ): Promise<CoachInsight | null> {
    if (options?.signal?.aborted) {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }

    const evalResult = this.evaluateContext(context);
    this.log('coach_insight_evaluated', {
      trigger,
      action: evalResult.action,
      reason: evalResult.reason ?? null,
      state: context.state,
      confidence: context.confidence,
      insightsThisSet: this.insightsThisSet,
    });

    if (evalResult.action === 'skip') {
      return null;
    }

    const now = this.nowFn();
    let reason: FallbackReason | null = evalResult.reason ?? null;
    let insight: CoachInsight | null = null;

    const shouldAbort = () => Boolean(options?.signal?.aborted);

    if (evalResult.action === 'fallback') {
      if (shouldAbort()) {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        throw abortError;
      }
      insight = this.buildFallback(context, reason ?? 'error');
    } else {
      try {
        insight = await this.invokeGemini(context, options?.signal);
        if (!insight) {
          reason = 'error';
          insight = this.buildFallback(context, 'error');
        }
      } catch (error: any) {
        if (shouldAbort()) {
          const abortError = new Error('Aborted');
          abortError.name = 'AbortError';
          throw abortError;
        }
        const normalised = normaliseGeminiError('coach_insight', error);
        console.error('[coach-orchestrator]', normalised);
        reason = (error as Error)?.message === 'Gemini timeout' ? 'timeout' : 'error';
        insight = this.buildFallback(context, reason === 'timeout' ? 'error' : reason);
      }
    }

    if (!insight) {
      return null;
    }

    this.lastInsightAtMs = now;
    this.insightsThisSet += 1;
    this.lastState = context.state;
    this.lastReason = reason;

    return insight;
  }

  private evaluateContext(context: CoachInsightContext): EvaluateResult {
    if (context.exercise.phase !== 'set') {
      return { action: 'skip' };
    }

    if (this.insightsThisSet >= context.limits.max_messages_per_set) {
      return { action: 'skip' };
    }

    const now = this.nowFn();
    if (now - this.lastInsightAtMs < context.limits.speak_min_gap_sec * 1000) {
      return { action: 'skip' };
    }

    const artifact = clampMetric(context.metrics.motion_artifact) ?? 0;
    if (artifact >= context.limits.artifact_threshold) {
      return { action: 'fallback', reason: 'artifact' };
    }

    const threshold = CONF_THRESHOLDS[context.state];
    if (context.confidence < threshold) {
      return { action: 'fallback', reason: 'low_confidence' };
    }

    const rms = clampMetric(context.metrics.rms_change_pct_last_8s);
    if (rms == null) {
      return { action: 'fallback', reason: 'no_signal' };
    }

    if (Math.abs(rms) < 7) {
      return { action: 'fallback', reason: 'noise' };
    }

    return { action: 'call' };
  }

  private resolveClient(): GeminiGenerativeClient | null {
    if (this.client === undefined) {
      const resolved = getGeminiClient();
      this.client = resolved ? (resolved as unknown as GeminiGenerativeClient) : null;
    }
    return this.client ?? null;
  }

  private async invokeGemini(context: CoachInsightContext, externalSignal?: AbortSignal): Promise<CoachInsight | null> {
    const client = this.resolveClient();
    if (!client) {
      throw new Error('Gemini client unavailable');
    }

    const userPrompt = [
      SYSTEM_PROMPT,
      '',
      buildUserPrompt(context),
    ].join('\n\n');

    const contents: Array<{ role: 'user'; parts: Array<{ text: string }> }> = [
      { role: 'user', parts: [{ text: userPrompt }] },
    ];

    for (const example of FEW_SHOT_EXAMPLES) {
      contents.push({ role: 'user', parts: [{ text: example }] });
    }

    const abortController = new AbortController();
    let didTimeOut = false;
    const timeoutId = setTimeout(() => {
      didTimeOut = true;
      abortController.abort();
    }, 600);

    const handleExternalAbort = () => {
      abortController.abort();
    };
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        throw abortError;
      }
      externalSignal.addEventListener('abort', handleExternalAbort);
    }

    try {
      const generationConfig: GeminiGenerateContentConfig = {
        abortSignal: abortController.signal,
        temperature: 0.4,
        responseMimeType: 'text/plain',
        maxOutputTokens: 120,
      };

      const response = (await client.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents,
        config: generationConfig,
      })) as GeminiGenerativeResponse;

      const raw = await extractText(response);
      const parsed = this.parseModelResponse(raw);
      if (!parsed) {
        return null;
      }

      return this.normaliseModelResponse(parsed, context);
    } catch (error: any) {
      if (error?.name === 'AbortError' || abortController.signal.aborted) {
        if (externalSignal?.aborted && !didTimeOut) {
          const abortError = new Error('Aborted');
          abortError.name = 'AbortError';
          throw abortError;
        }
        if (didTimeOut) {
          throw new Error('Gemini timeout');
        }
        throw error;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', handleExternalAbort);
      }
    }
  }

  private parseModelResponse(raw: string): ParsedModelResponse | null {
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed) {
      return null;
    }

    const sanitizeTags = (input: unknown): Array<'Rise' | 'Plateau' | 'Fall' | 'SymmetryOff' | 'NoFatigue'> | undefined => {
      if (!Array.isArray(input)) return undefined;
      const valid = input
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter((tag) => ['Rise', 'Plateau', 'Fall', 'SymmetryOff', 'NoFatigue'].includes(tag));
      return valid.length > 0 ? (valid as Array<'Rise' | 'Plateau' | 'Fall' | 'SymmetryOff' | 'NoFatigue'>) : undefined;
    };

    const sanitizeActions = (input: unknown): InsightAction[] | undefined => {
      if (!Array.isArray(input)) return undefined;
      const valid: InsightAction[] = [];
      for (const item of input) {
        if (item === 'continue_anyway' || item === 'end_set') {
          valid.push(item);
        }
      }
      return valid;
    };

    const sanitizeMetric = (input: unknown): { name: InsightMetricName; value: string } | null | undefined => {
      if (!input || typeof input !== 'object') {
        return input === null ? null : undefined;
      }
      const record = input as Record<string, unknown>;
      const name = record.name;
      const value = record.value;
      if (
        (name === 'RMS' || name === 'MDF' || name === 'RoR' || name === 'Symmetry') &&
        typeof value === 'string' &&
        value.trim().length > 0
      ) {
        return { name, value: value.trim() };
      }
      return null;
    };

    try {
      const data = JSON.parse(trimmed);
      if (typeof data === 'string') {
        const headline = data.trim();
        return headline ? { headline } : null;
      }
      if (typeof data !== 'object' || data === null) {
        return null;
      }

      const record = data as Record<string, unknown>;
      const rawHeadline =
        (typeof record.headline === 'string' && record.headline.trim()) ||
        (typeof record.primary === 'string' && record.primary.trim()) ||
        (typeof record.text === 'string' && record.text.trim());

      if (!rawHeadline) {
        return null;
      }

      const subline =
        (typeof record.subline === 'string' && record.subline.trim()) ||
        (typeof record.secondary === 'string' && record.secondary.trim()) ||
        undefined;

      const tip = typeof record.tip === 'string' && record.tip.trim().length > 0 ? record.tip : undefined;
      const tags = sanitizeTags(record.tags);
      const actions = sanitizeActions(record.actions);
      const restSeconds =
        typeof record.rest_seconds === 'number'
          ? record.rest_seconds
          : typeof record.restSeconds === 'number'
          ? record.restSeconds
          : undefined;

      const type =
        record.type === 'info' || record.type === 'suggestion' || record.type === 'caution'
          ? record.type
          : undefined;

      const metric =
        sanitizeMetric(record.metric_cited) ??
        sanitizeMetric((record as Record<string, unknown>).metricCited);

      return {
        headline: rawHeadline,
        subline,
        tip,
        tags,
        actions,
        rest_seconds: restSeconds,
        type,
        metric_cited: metric,
      };
    } catch {
      return { headline: trimmed };
    }
  }

  private normaliseModelResponse(parsed: ParsedModelResponse, context: CoachInsightContext): CoachInsight {
    const tags =
      parsed.tags && parsed.tags.length > 0 ? parsed.tags : [toPhaseLabel(context.state)];
    const restSeconds =
      typeof parsed.rest_seconds === 'number' && Number.isFinite(parsed.rest_seconds)
        ? parsed.rest_seconds
        : Math.max(0, Number(context.restSeconds ?? 0));
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const filteredActions = actions.filter(
      (action): action is InsightAction =>
        action === 'continue_anyway' || action === 'end_set',
    );
    const inferredType: InsightType =
      parsed.type ??
      (filteredActions.includes('end_set') ? 'caution' : 'suggestion');
    const metric = parsed.metric_cited ?? null;

    const headlineParts = [
      typeof parsed.headline === 'string' ? parsed.headline.trim() : '',
      typeof parsed.subline === 'string' ? parsed.subline.trim() : '',
    ].filter((part) => part.length > 0);

    const combinedHeadline = headlineParts.join(' ').replace(/\s+/g, ' ').trim();
    const safeHeadline =
      combinedHeadline.length > 0 ? combinedHeadline : 'Hold that quality—rest up and stay sharp.';

    return {
      source: 'llm',
      state: context.state,
      type: inferredType,
      headline: safeHeadline,
      subline: undefined,
      tip: undefined,
      tags,
      actions: filteredActions,
      rest_seconds: restSeconds,
      confidence: context.confidence,
      metric_cited: metric,
    };
  }

  private buildFallback(context: CoachInsightContext, reason: FallbackReason): CoachInsight {
    const state = context.state;
    const confidence = Math.max(0, Math.min(1, context.confidence));

    const lines: string[] = [];
    if (reason === 'artifact') {
      lines.push('Signal is noisy.');
      lines.push('Reset contact and keep it smooth next set.');
    } else if (reason === 'low_confidence' || reason === 'noise' || reason === 'no_signal') {
      lines.push('Not enough signal yet—hold your form steady.');
      lines.push('We’ll flag the moment the data stabilizes.');
    } else if (state === 'rise') {
      lines.push('Form is dialed in—keep the tempo right where it is.');
      lines.push('Stay smooth and we’ll cue the next adjustment when it’s needed.');
    } else if (state === 'plateau') {
      lines.push("You're holding steady and pacing well.");
      lines.push('Keep it tidy and stay smooth.');
    } else if (state === 'fall') {
      lines.push('Quality is slipping—activation is falling.');
      lines.push('Let’s rack there to protect output.');
    } else {
      lines.push('Nice work. Keep things smooth between reps.');
    }

    const combinedHeadline = lines.join(' ').replace(/\s+/g, ' ').trim();
    const tags: Array<'Rise' | 'Plateau' | 'Fall' | 'SymmetryOff' | 'NoFatigue'> = [
      toPhaseLabel(state),
    ];
    const actions: InsightAction[] = state === 'fall' ? ['end_set'] : [];
    const type: InsightType =
      state === 'fall'
        ? 'caution'
        : reason === 'artifact' || reason === 'low_confidence' || reason === 'noise' || reason === 'no_signal'
          ? 'info'
          : 'suggestion';
    const restSeconds = Math.max(0, Number(context.restSeconds ?? 0));

    return {
      source: 'fallback',
      state,
      type,
      headline: combinedHeadline || 'Hold steady and reset for your next clean reps.',
      subline: undefined,
      tip: undefined,
      tags,
      actions,
      rest_seconds: restSeconds,
      confidence,
      metric_cited: null,
    };
  }

  private log(event: string, payload: Record<string, unknown>) {
    if (this.logger) {
      this.logger(event, payload);
    }
  }
}
