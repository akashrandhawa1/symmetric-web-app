import type { Handler } from "@netlify/functions";
import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextAction, IntakeTurn, NegotiationTurn, WrapTurn } from "../../src/coach/intake/openSchema";
import { coverageScore, COVERAGE_TARGET, hasOperationalMinimum, type Topic } from "../../src/coach/intake/contextMap";
import {
  scriptedNextAction,
  buildWrapAction,
  resolveIntakeBranch,
  SCRIPTED_TOPIC_SEQUENCE,
  CHIPS_BY_TOPIC,
  PERSONA_LINES,
  SCC_SEEDS,
  TOPIC_PHASE,
  type IntakeBranch,
} from "../../src/coach/intake/scriptedFlow";
import { getAI } from "../../server/lib/geminiClient";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..", "..");

if (!process.env.GEMINI_API_KEY && !process.env.VITE_GEMINI_API_KEY) {
  loadEnv({ path: join(projectRoot, ".env"), override: false });
  loadEnv({ path: join(projectRoot, ".env.local"), override: false });
}

type IntakeRequest = {
  answers?: Record<string, any>;
  coverage?: Record<string, boolean>;
  user_name?: string;
  vibe_hint?: "calm" | "hype" | "expert" | "auto";
  branch?: IntakeBranch | "auto";
  last_user_text?: string;
  chips?: string[];
  recent_topics?: string[];
  is_negotiation?: boolean;
};

type CacheEntry = { action: NextAction; expiresAt: number };

const SYSTEM_PROMPT = [
  "You are Coach Milo 🐺, a warm, experienced strength coach having a genuine conversation to understand this person's training context.",
  "Every response must be valid JSON using one of the allowed shapes below.",
  "",
  "Conversational principles:",
  "- Always acknowledge what they specifically said before moving forward (reference their actual words, not generic confirmations)",
  "- Show genuine curiosity about their training journey",
  "- Ask follow-up questions when their answer is interesting, vague, or reveals something important",
  "- If they ask a question (why, what, how) or push back ('why should I care', 'idk', 'not sure'), ADDRESS IT DIRECTLY before continuing",
  "  • Example: User says 'why should i care about this?' → Answer their question, then gently guide back to the topic",
  "  • Example: User says 'idk' or 'not sure' → Acknowledge uncertainty, provide context, offer to skip or come back to it",
  "  • Example: User asks 'what does this have to do with training?' → Explain the connection, then continue",
  "- Keep responses natural and conversational (not formulaic or robotic)",
  "- Use their name occasionally for warmth, but don't overdo it",
  "- If they mention something specific (injury, sport, time constraint, equipment gap), explore it briefly",
  "- Vary your language and phrasing—don't sound like you're reading from a script",
  "",
  "Coverage goals (cover these naturally through conversation, don't recite them):",
  "- Name and what to call them",
  "- Primary goal (strength, muscle, sport performance, rehab, general fitness)",
  "- Training experience level and confidence with form",
  "- Available equipment and typical session length",
  "- Training frequency and schedule commitment",
  "- Body metrics (age, height, weight) for programming",
  "- Any limitations (injuries, mobility issues, time/equipment constraints)",
  "- Sport context if relevant to their goal",
  "",
  "Response guidelines:",
  "- Persona line: Briefly explain why understanding this topic helps you coach them better (be specific to what they said)",
  "- SCC (Suggest/Confirm/Compensate): Acknowledge their answer with coaching insight, not generic confirmations",
  "  • Suggest: Why their answer helps guide the plan (reference specifics)",
  "  • Confirm: Affirm their choice works",
  "  • Compensate: If there's a constraint, explain how you'll work with it",
  "- Question: Ask naturally, not like filling out a form. Can be 1-2 sentences if needed for clarity.",
  "- When collecting body_metrics, ask for specific numbers (age, height in feet/inches, weight in pounds)",
  "- NEVER prescribe specific exercises, sets, reps, %1RM, RPE, rest intervals, or exact loads (kg/lb)",
  "- If chips are provided, you can casually mention quick-tap options are available",
  "- If you cannot comply, return an empty JSON object {} and the server will fall back to scripted flow",
  "",
  "JSON shapes:",
  '{"persona_line":"...","scc":{"suggest":"...","confirm":"...","compensate":"..."},"question":"...","topic":"exact next_topic","chips":[...]}  ← Use for normal intake questions',
  '{"coach_take":"...","question":"...","chips":[...]}  ← Use when user asks a question or pushes back (address their concern in coach_take, then ask to continue)',
  '{"coach_intro":"...","plan_summary":{"goal":"lower-body strength|muscle|general|rehab","weeks":number,"days_per_week":number,"session_length_min":number,"constraints_notes":"...","blocks":[{"name":"...","objective":"..."}...]}}  ← Use only for final plan wrap',
  "",
  "Topic examples (use these as inspiration, not templates):",
  JSON.stringify(PERSONA_LINES),
  "",
  "SCC inspiration (paraphrase and personalize based on their specific answer):",
  JSON.stringify(SCC_SEEDS),
].join("\n");

const TOPIC_SET = new Set<Topic>(SCRIPTED_TOPIC_SEQUENCE);

const CACHE_TTL_MS = 60_000;
const RETRY_BACKOFF_MS = [0, 400, 1100];
const MODEL_SEQUENCE = [
  { id: "gemini-2.0-flash-exp", timeoutMs: 2500 },
  { id: "gemini-1.5-pro-latest", timeoutMs: 2800 },
  { id: "gemini-1.5-flash-latest", timeoutMs: 2000 },
] as const;
const CAPACITY_RESET_MS = 120_000;
const MAX_THROTTLE_FAILURES = 3;

const responseCache = new Map<string, CacheEntry>();
let throttleUntil = 0;
let consecutiveThrottleFailures = 0;
let capacityNoticeAt = 0;
let capacityNoticeDisplayExpiry = 0;
let loggedMissingClient = false;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const PLAN_GOAL_VALUES: WrapTurn["plan_summary"]["goal"][] = ["lower-body strength", "muscle", "general", "rehab"];

function buildModelInput(params: {
  answers: Record<string, any>;
  nextTopic: Topic;
  branch: IntakeBranch;
  userName?: string;
  vibeHint?: string;
  lastUserText?: string;
  chips: string[];
  recentTopics: string[];
}): string {
  const { answers, nextTopic, branch, userName, vibeHint, lastUserText, chips, recentTopics } = params;

  // Build conversation context summary from answers
  const conversationContext: string[] = [];
  if (answers.name) conversationContext.push(`Their name: ${answers.name}`);
  if (answers.primary_goal || answers.goal_intent) {
    conversationContext.push(`Goal: ${answers.primary_goal || answers.goal_intent}`);
  }
  if (answers.training_context || answers.experience_level) {
    conversationContext.push(`Experience: ${answers.training_context || answers.experience_level}`);
  }
  if (answers.equipment_session || answers.equipment) {
    conversationContext.push(`Equipment/Session: ${answers.equipment_session || answers.equipment}`);
  }
  if (answers.frequency_commitment || answers.frequency) {
    conversationContext.push(`Frequency: ${answers.frequency_commitment || answers.frequency}`);
  }
  if (answers.limitations || answers.constraints) {
    conversationContext.push(`Limitations: ${answers.limitations || answers.constraints}`);
  }
  if (answers.sport_context) {
    conversationContext.push(`Sport context: ${answers.sport_context}`);
  }

  return JSON.stringify({
    user_name: userName ?? "",
    vibe_hint: vibeHint ?? "auto",
    known_answers: answers ?? {},
    conversation_so_far: conversationContext.length > 0
      ? `What you know about them:\n${conversationContext.join('\n')}\n\nUse this context to ask personalized questions and make relevant connections.`
      : "",
    next_topic: nextTopic,
    branch,
    last_user_text: lastUserText ?? "",
    chips,
    is_negotiation: false,
    phase: TOPIC_PHASE[nextTopic] ?? "goal",
    recent_topics: recentTopics.slice(-3),
  });
}

function normaliseAnswers(answers: Record<string, any>): Record<string, any> {
  const sortedKeys = Object.keys(answers ?? {}).sort();
  const normalised: Record<string, any> = {};
  for (const key of sortedKeys) {
    normalised[key] = answers[key];
  }
  return normalised;
}

function makeCacheKey(params: {
  answers: Record<string, any>;
  branch: IntakeBranch;
  topic: Topic | "wrap";
  lastUserText?: string;
}): string {
  return JSON.stringify({
    branch: params.branch,
    topic: params.topic,
    last: params.lastUserText ?? "",
    answers: normaliseAnswers(params.answers),
  });
}

function mergeCoverage(
  answers: Record<string, any>,
  coverage?: Record<string, boolean>
): Partial<Record<Topic, boolean>> {
  const merged: Partial<Record<Topic, boolean>> = {};
  if (coverage) {
    for (const [key, value] of Object.entries(coverage)) {
      if (value && TOPIC_SET.has(key as Topic)) {
        merged[key as Topic] = true;
      }
    }
  }
  for (const [key, value] of Object.entries(answers ?? {})) {
    if (!TOPIC_SET.has(key as Topic)) continue;
    if (value == null) continue;
    const text = typeof value === "string" ? value.trim() : String(value);
    if (!text.length) continue;
    merged[key as Topic] = true;
  }
  return merged;
}

function safeGetGeminiClient() {
  try {
    const ai = getAI();
    loggedMissingClient = false;
    return ai;
  } catch (error) {
    if (!loggedMissingClient) {
      console.warn("[coach-intake-next] Gemini client unavailable:", (error as Error)?.message ?? error);
      loggedMissingClient = true;
    }
    return null;
  }
}

async function extractTextPayload(result: any): Promise<string> {
  if (!result) return "";
  if (typeof result.text === "function") {
    try {
      const text = await result.text();
      if (typeof text === "string") {
        return text;
      }
    } catch {
      // ignore
    }
  }
  if (typeof result.text === "string") {
    return result.text;
  }
  const response = result.response ?? result;
  const candidates = response?.candidates ?? [];
  if (Array.isArray(candidates) && candidates.length) {
    const parts = candidates[0]?.content?.parts ?? candidates[0]?.parts ?? [];
    if (Array.isArray(parts)) {
      const partWithText = parts.find((part: any) => typeof part?.text === "string" && part.text.trim().length > 0);
      if (partWithText?.text) {
        return partWithText.text;
      }
    }
  }
  return "";
}

function coerceNextAction(payload: unknown): NextAction | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidate = payload as Record<string, any>;
  if ("persona_line" in candidate && "scc" in candidate && "topic" in candidate) {
    const turn: IntakeTurn = {
      persona_line: String(candidate.persona_line ?? ""),
      scc: candidate.scc as IntakeTurn["scc"],
      question: String(candidate.question ?? ""),
      topic: candidate.topic as Topic,
      chips: Array.isArray(candidate.chips) ? candidate.chips.map(String) : [],
    };
    if (!turn.topic) {
      return null;
    }
    return { action: "turn", turn };
  }
  if ("coach_take" in candidate && "question" in candidate) {
    const negotiation: NegotiationTurn = {
      coach_take: String(candidate.coach_take ?? ""),
      question: String(candidate.question ?? ""),
      chips: Array.isArray(candidate.chips) ? candidate.chips.map(String) : [],
    };
    return { action: "negotiation", negotiation };
  }
  if ("coach_intro" in candidate && "plan_summary" in candidate) {
    const wrap: WrapTurn = {
      coach_intro: String(candidate.coach_intro ?? ""),
      plan_summary: candidate.plan_summary,
    };
    return { action: "wrap", wrap };
  }
  return null;
}

function classifyGeminiError(error: unknown): { status?: number; throttled: boolean; message: string } {
  if (!error) return { throttled: false, message: "unknown" };
  if (typeof error === "string") {
    const throttled = /quota|exceed|throttle|resource exhausted/i.test(error);
    return { throttled, message: error };
  }
  const err = error as any;
  if (err?.name === "AbortError") {
    return { throttled: false, message: "aborted" };
  }
  const status =
    typeof err?.status === "number"
      ? err.status
      : typeof err?.response?.status === "number"
      ? err.response.status
      : undefined;
  const message = typeof err?.message === "string" ? err.message : status ? `status ${status}` : "unknown";
  const throttled =
    status === 429 ||
    /quota|exceed|throttle|resource exhausted|rate/i.test(message) ||
    err?.error?.status === "RESOURCE_EXHAUSTED";
  return { status, throttled, message };
}

type GeminiCallResult = {
  action: NextAction | null;
  latencyMs?: number;
  model?: string;
  attempts: number;
  throttled: boolean;
  capacity: boolean;
  error?: unknown;
};

async function callGemini(modelInput: string): Promise<GeminiCallResult> {
  const ai = safeGetGeminiClient();
  if (!ai) {
    capacityNoticeAt = Date.now();
    return { action: null, attempts: 0, throttled: false, capacity: true };
  }

  const now = Date.now();
  if (throttleUntil > now) {
    await sleep(throttleUntil - now);
  }

  let attempts = 0;
  let lastError: unknown = null;

  for (const model of MODEL_SEQUENCE) {
    for (let retry = 0; retry < RETRY_BACKOFF_MS.length; retry += 1) {
      const backoff = RETRY_BACKOFF_MS[retry];
      if (backoff > 0) {
        await sleep(backoff);
      }

      attempts += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), model.timeoutMs);
      const started = Date.now();

      try {
        const response = await ai.models.generateContent({
          model: model.id,
          contents: [{ role: "user", parts: [{ text: modelInput }] }],
          systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
          config: {
            temperature: 0.85,
            maxOutputTokens: 400,
            responseMimeType: "application/json",
            abortSignal: controller.signal,
          },
        });

        clearTimeout(timeout);

        const latencyMs = Date.now() - started;
        const text = await extractTextPayload(response);
        const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
        if (!cleaned) {
          throw new Error("Empty Gemini response");
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(cleaned);
        } catch (error) {
          throw new Error(`Gemini returned non-JSON payload: ${cleaned.slice(0, 160)}`);
        }

        // Debug logging to see what Gemini actually returned
        console.log("[coach-intake-next] DEBUG: Gemini raw response:", JSON.stringify(parsed, null, 2));

        const action = coerceNextAction(parsed);
        if (!action) {
          console.error("[coach-intake-next] DEBUG: coerceNextAction failed. Parsed payload:", JSON.stringify(parsed, null, 2));
          throw new Error("Gemini returned unexpected payload shape");
        }

        consecutiveThrottleFailures = 0;
        capacityNoticeAt = 0;
        capacityNoticeDisplayExpiry = 0;
        throttleUntil = 0;
        return { action, latencyMs, model: model.id, attempts, throttled: false, capacity: false };
      } catch (error) {
        clearTimeout(timeout);
        if ((error as any)?.name === "AbortError") {
          lastError = error;
          continue;
        }

        lastError = error;
        const { status, throttled, message } = classifyGeminiError(error);
        if (throttled) {
          consecutiveThrottleFailures += 1;
          const waitMs = Math.min(2000 * consecutiveThrottleFailures, 15000);
          throttleUntil = Date.now() + waitMs;
          await sleep(waitMs);
          continue;
        }

        if (status && status >= 500 && status < 600 && retry < RETRY_BACKOFF_MS.length - 1) {
          await sleep(300 * (retry + 1));
          continue;
        }

        consecutiveThrottleFailures = 0;
        console.warn("[coach-intake-next] Gemini model failed", {
          model: model.id,
          status,
          message,
        });
        break;
      }
    }
  }

  const capacity = consecutiveThrottleFailures >= MAX_THROTTLE_FAILURES;
  if (capacity) {
    capacityNoticeAt = Date.now();
  }

  return {
    action: null,
    attempts,
    throttled: throttleUntil > Date.now(),
    capacity,
    error: lastError,
  };
}

function applyCapacityNotice(action: NextAction): NextAction {
  if (action.action !== "turn") {
    return action;
  }
  const now = Date.now();
  if (capacityNoticeDisplayExpiry < now) {
    capacityNoticeDisplayExpiry = now + CAPACITY_RESET_MS;
    return {
      action: "turn",
      turn: {
        ...action.turn,
        persona_line: "Gemini's rate limit hit, so I'm steering manually for now.",
      },
    };
  }
  return action;
}

const clampNumber = (value: number, { min, max, fallback }: { min: number; max: number; fallback: number }) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.round(Math.min(max, Math.max(min, value)));
};

const sanitiseGoal = (goal: unknown, fallback: WrapTurn["plan_summary"]["goal"]) => {
  const normalised = typeof goal === "string" ? goal.toLowerCase().trim() : "";
  const match = PLAN_GOAL_VALUES.find((candidate) => candidate === normalised);
  return match ?? fallback;
};

const toPlainText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  return value.replace(/\s+/g, " ").trim();
};

const normaliseBlock = (
  block: unknown,
  fallback: { name: string; objective: string }
): { name: string; objective: string } => {
  if (!block || typeof block !== "object") return fallback;
  const candidate = block as Record<string, unknown>;
  const name = toPlainText(candidate.name, fallback.name).slice(0, 60);
  const objective = toPlainText(candidate.objective, fallback.objective).slice(0, 140);
  if (!name || !objective) return fallback;
  return { name, objective };
};

function buildPlanContext(answers: Record<string, any>, fallback: WrapTurn) {
  const freqCommitment = answers.frequency_commitment ?? null;
  const equipSession = answers.equipment_session ?? null;
  const bodyMetrics = answers.body_metrics ?? null;

  return {
    name: typeof answers.name === "string" ? answers.name.trim() : "",

    // Goal & motivation
    primary_goal: answers.primary_goal ?? answers.goal_intent ?? answers.goal ?? null,
    specific_target: answers.specific_target ?? null,
    body_composition: answers.body_composition ?? null,
    goal_intent: answers.goal_intent ?? null,
    motivation: answers.motivation ?? null,
    timeline: answers.timeline ?? null,

    // Current training state
    training_context: answers.training_context ?? answers.experience_level ?? answers.experience ?? null,
    baseline_fitness: answers.baseline_fitness ?? null,
    age_range: answers.age_range ?? null,
    experience_level: answers.experience_level ?? null,
    confidence: answers.form_confidence ?? null,

    // Equipment & environment
    equipment_session: equipSession,
    environment: answers.environment ?? null,
    equipment: answers.equipment ?? null,
    training_time: answers.training_time ?? null,

    // Schedule commitment
    frequency_commitment: freqCommitment,

    // Body metrics (exact values)
    body_metrics: bodyMetrics,

    // Safety & recovery
    limitations: answers.limitations ?? answers.constraints ?? null,
    constraints: answers.constraints ?? null,
    past_injuries: answers.past_injuries ?? null,
    activity_recovery: answers.activity_recovery ?? null,

    // Sport / preferences
    sport_context: answers.sport_context ?? answers.sport_role ?? null,
    exercise_preferences: answers.exercise_preferences ?? null,
    preferences: answers.preferences ?? null,
    program_style: answers.program_style ?? null,

    branch: resolveIntakeBranch(undefined, answers),
    schedule: {
      days_per_week:
        typeof freqCommitment?.days_per_week === "number"
          ? freqCommitment.days_per_week
          : fallback.plan_summary.days_per_week,
      session_length_min:
        typeof equipSession?.session_minutes === "number"
          ? equipSession.session_minutes
          : fallback.plan_summary.session_length_min,
      weeks:
        typeof freqCommitment?.focus_weeks === "number"
          ? freqCommitment.focus_weeks
          : fallback.plan_summary.weeks,
    },
  };
}

async function generateWrapWithGemini(answers: Record<string, any>, fallback: WrapTurn): Promise<WrapTurn | null> {
  const ai = safeGetGeminiClient();
  if (!ai) {
    return null;
  }

  const context = buildPlanContext(answers, fallback);
  const planSample = fallback.plan_summary;

  const instructions = [
    "You are Coach Milo 🐺 wrapping an intake with a concise workout preview.",
    "Respond with STRICT JSON using this shape:",
    '{"coach_intro":"...","plan_summary":{"goal":"lower-body strength|muscle|general|rehab","weeks":number,"days_per_week":number,"session_length_min":number,"constraints_notes":"...","blocks":[{"name":"...","objective":"..."}]}}',
    "",
    "Guidelines:",
    "- Coach intro: conversational, ≤55 words, mention the user's name every 2–3 turns when available.",
    "- Plan must honour the supplied schedule (days/week, session minutes, weeks).",
    "- Leverage primary_goal, training_context, equipment_session, frequency_commitment, and body_metrics when crafting the summary.",
    "- Keep blocks between 2 and 4. Each objective is 1 sentence describing focus and key movements. Avoid explicit set/rep prescriptions.",
    "- If constraints exist, highlight how the plan protects them; otherwise say 'No constraints flagged'.",
    "- Goal must be one of the allowed enum values.",
    "- Stay upbeat, precise, and avoid marketing fluff.",
    "",
    "KEY PERSONALIZATION FACTORS (PHASE 1):",
    "- Body Composition: If 'gain', emphasize volume and progressive overload. If 'lose', balance intensity with recovery. If 'maintain/recomp', focus on strength gains.",
    "- Baseline Fitness: If user struggles with basic movements, start with foundational progressions and movement prep.",
    "- Age Range: For 46+, emphasize recovery time, joint-friendly variations, and longer deload cycles.",
    "- Activity & Recovery: If high stress or poor sleep (<6hrs), reduce volume by 20-30% and add extra rest.",
    "- Limitations: Always protect flagged areas with modified ROM, exercise substitutions, or controlled tempos.",
    "",
    "PHASE 2 PERSONALIZATION (if available):",
    "- Specific Target: If user has a measurable goal (e.g., 'squat 315lbs'), reverse-engineer periodization to peak at that target. Build progressive overload cycles that lead to the specific lift.",
    "- Training Time: If 'morning', place CNS-demanding work early when fresh. If 'evening', consider fatigue from work day. If 'varies', use autoregulation.",
    "- Exercise Preferences: If user loves certain movements, program them frequently. If user hates certain movements, substitute with similar stimulus. Never force hated movements—adherence > perfection.",
    "",
    "Intake answers:",
    JSON.stringify(context, null, 2),
    "",
    "Reference plan defaults (use them unless you have a compelling reason to tweak based on the personalization factors above):",
    JSON.stringify(planSample, null, 2),
  ].join("\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ role: "user", parts: [{ text: instructions }] }],
      config: {
        temperature: 0.75,
        maxOutputTokens: 400,
        responseMimeType: "application/json",
      },
    });

    const text = await extractTextPayload(response);
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    if (!cleaned) {
      throw new Error("Empty Gemini wrap response");
    }

    const parsed = JSON.parse(cleaned) as Partial<WrapTurn>;
    if (!parsed || typeof parsed !== "object" || !parsed.plan_summary) {
      throw new Error("Unexpected Gemini wrap shape");
    }

    const coachIntro = toPlainText(parsed.coach_intro, fallback.coach_intro).slice(0, 280);
    const summary = parsed.plan_summary;

    const goal = sanitiseGoal(summary.goal, planSample.goal);
    const weeks = clampNumber(Number(summary.weeks), { min: 2, max: 16, fallback: planSample.weeks });
    const daysPerWeek = clampNumber(Number(summary.days_per_week), {
      min: 1,
      max: 6,
      fallback: planSample.days_per_week,
    });
    const sessionLength = clampNumber(Number(summary.session_length_min), {
      min: 20,
      max: 120,
      fallback: planSample.session_length_min,
    });

    const constraintsNotes = toPlainText(summary.constraints_notes, planSample.constraints_notes).slice(0, 160);

    const blocksSource = Array.isArray(summary.blocks) ? summary.blocks : [];
    const fallbackBlocks = planSample.blocks;
    const normalisedBlocks = blocksSource
      .slice(0, 4)
      .map((block, index) => normaliseBlock(block, fallbackBlocks[index] ?? fallbackBlocks[0]))
      .filter(Boolean);

    const blocks = normalisedBlocks.length >= 2 ? normalisedBlocks : fallbackBlocks;

    return {
      coach_intro: coachIntro,
      plan_summary: {
        goal,
        weeks,
        days_per_week: daysPerWeek,
        session_length_min: sessionLength,
        constraints_notes: constraintsNotes || planSample.constraints_notes,
        blocks,
      },
    };
  } catch (error) {
    console.warn("[coach-intake-next] Plan generation failed; using scripted wrap:", error);
    return null;
  }
}

export const handler: Handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  let body: IntakeRequest = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch (error) {
    console.warn("[coach-intake-next] Failed to parse request body", error);
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON payload" }) };
  }

  const answers = body.answers ?? {};
  const branch = resolveIntakeBranch(body.branch, answers);
  const recentTopics = Array.isArray(body.recent_topics)
    ? body.recent_topics.filter((value): value is string => typeof value === "string")
    : [];
  const userName = body.user_name ?? answers.name ?? "";
  const vibeHint = body.vibe_hint ?? "auto";
  const lastUserText = body.last_user_text ?? "";
  const mergedCoverage = mergeCoverage(answers, body.coverage);
  const score = coverageScore(mergedCoverage);
  const coverageMet = hasOperationalMinimum(answers) && score >= COVERAGE_TARGET;

  // Detect if user is asking a question or pushing back (requires LLM negotiation)
  const isQuestion = /^(why|what|how|when|where|who|can you|could you|should i|do i|is it|tell me|explain)/i.test(lastUserText) || lastUserText.includes('?');
  const isPushback = /^(idk|i don't know|i dont know|not sure|maybe|skip|pass|why should|don't care|dont care)/i.test(lastUserText.toLowerCase());
  const requiresNegotiation = (isQuestion || isPushback) && lastUserText.length > 0;

  const scripted = scriptedNextAction(answers, branch);

  if (scripted.action === "wrap" || coverageMet) {
    const fallbackWrapAction = scripted.action === "wrap" ? scripted : buildWrapAction(answers);
    const geminiWrap = await generateWrapWithGemini(answers, fallbackWrapAction.wrap);
    const finalWrapAction: NextAction = geminiWrap ? { action: "wrap", wrap: geminiWrap } : fallbackWrapAction;
    const cacheKey = makeCacheKey({ answers, branch, topic: "wrap", lastUserText });
    responseCache.set(cacheKey, { action: finalWrapAction, expiresAt: Date.now() + CACHE_TTL_MS });
    console.info("[coach-intake-next] wrap", {
      branch,
      coverage: `${score}/${COVERAGE_TARGET}`,
      cached: false,
      enhanced: Boolean(geminiWrap),
    });
    return { statusCode: 200, headers, body: JSON.stringify(finalWrapAction) };
  }

  if (scripted.action !== "turn") {
    console.warn("[coach-intake-next] Unexpected scripted action", scripted.action);
    return { statusCode: 200, headers, body: JSON.stringify(scripted) };
  }

  const nextTopic = scripted.turn.topic;
  const requestChips = body.chips && Array.isArray(body.chips) && body.chips.length ? body.chips.map(String) : [];
  const modelInput = buildModelInput({
    answers,
    nextTopic,
    branch,
    userName,
    vibeHint,
    lastUserText,
    chips: requestChips,
    recentTopics,
  });

  const cacheKey = makeCacheKey({ answers, branch, topic: nextTopic, lastUserText });
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    console.info("[coach-intake-next] cache-hit", { topic: nextTopic, branch });
    return { statusCode: 200, headers, body: JSON.stringify(cached.action) };
  }

  const geminiResult = await callGemini(modelInput);

  let action: NextAction;
  let modelId = geminiResult.model ?? "scripted";
  if (geminiResult.action && geminiResult.action.action === "turn") {
    const turnTopic = geminiResult.action.turn.topic;
    if (turnTopic !== nextTopic) {
      console.warn("[coach-intake-next] Gemini topic mismatch", { expected: nextTopic, got: turnTopic });
      action = requiresNegotiation ? geminiResult.action : scripted; // Use LLM response if negotiation needed
      modelId = requiresNegotiation ? (geminiResult.model ?? "gemini") : "scripted";
    } else {
      action = geminiResult.action;
    }
  } else if (geminiResult.action) {
    action = geminiResult.action;
  } else {
    // If LLM failed but user needs negotiation, create an intelligent acknowledgment
    if (requiresNegotiation) {
      const topicExplanations: Record<string, string> = {
        primary_goal: "Great question! Your goal determines everything—rep ranges, rest times, exercise selection. Building max strength needs heavy sets of 3-5 reps with long rest. Muscle building uses 8-12 reps with shorter rest. Sport training depends on your sport's demands. I need to know what you're chasing so I don't waste your time with the wrong approach.",
        training_context: "Good question! Your experience level changes how I program. If you're new, I'll focus on teaching movement patterns safely—light weight, perfect form, building confidence. If you've been lifting for years, we can use advanced techniques like RPE, auto-regulation, and higher intensities. I won't make a beginner do advanced periodization, and I won't bore an experienced lifter with basics.",
        equipment_session: "Totally fair to ask! Equipment determines what exercises I can program. A barbell opens up squats, deadlifts, bench press—the backbone of strength training. Dumbbells mean we adjust rep schemes and unilateral work. Bodyweight only means I need to get creative with progressions. Session length determines how much volume I can fit. I'm asking because I need to build a plan that fits what you actually have access to.",
        frequency_commitment: "Good question! Frequency determines how I distribute volume. Training 3x/week means full-body sessions. 4-5x/week lets us split upper/lower or push/pull. 6x/week means I can dedicate days to specific movements. Timeline matters because if you've got a competition in 8 weeks, we peak differently than if you're training for general strength over 6 months.",
        body_metrics: "Fair question! Body stats help me calibrate starting loads and give better form cues. Age affects recovery capacity. Height affects lever lengths—taller people need different cues for squats. Weight gives me a rough idea of where to start with loading recommendations. These aren't required, but they help me be more accurate instead of shooting in the dark.",
        limitations: "Smart question! I need to know what to protect. Got bad knees? I'll avoid deep lunges and modify squat depth. Shoulder issues? I'll skip overhead work until we rehab. Lower back problems? Deadlifts get adjusted. If I don't know your weak points, I might program something that hurts you. Rather know upfront.",
        sport_context: "Great question! Sport context changes the whole plan. Training for powerlifting means max strength on the big 3. Training for basketball means I'm adding explosive movements and conditioning. If you're rehabbing from soccer injuries, I'll emphasize unilateral stability work. Generic strength training doesn't transfer as well as sport-specific work.",
      };

      const explanation = topicExplanations[nextTopic] ?? `I hear you. Let me explain why this helps—knowing your ${nextTopic.replace(/_/g, ' ')} lets me build a plan that actually works for you, not just a generic template.`;

      action = {
        action: "negotiation",
        negotiation: {
          coach_take: explanation,
          question: scripted.turn.question,
          chips: scripted.turn.chips ?? [],
        },
      };
      modelId = "fallback-negotiation";
    } else {
      action =
        geminiResult.capacity || Date.now() - capacityNoticeAt < CAPACITY_RESET_MS
          ? applyCapacityNotice(scripted)
          : scripted;
      modelId = "scripted";
    }
  }

  responseCache.set(cacheKey, { action, expiresAt: Date.now() + CACHE_TTL_MS });

  console.info("[coach-intake-next] turn", {
    topic: nextTopic,
    branch,
    model: modelId,
    latencyMs: geminiResult.latencyMs ?? null,
    attempts: geminiResult.attempts,
    coverage: `${score}/${COVERAGE_TARGET}`,
    fallback: modelId === "scripted",
    throttled: geminiResult.throttled,
    capacity: geminiResult.capacity,
  });

  return { statusCode: 200, headers, body: JSON.stringify(action) };
};
