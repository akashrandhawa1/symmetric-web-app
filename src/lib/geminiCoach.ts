import { getGeminiClient, extractText } from '@/services';
import { ensurePayoffIfGeneric } from '@/lib/coachGuardrails';

export type CoachPhase = "post_set" | "end";
export type SuggestionId = "ADD_REP" | "HOLD_TEMPO" | "END_EARLY";

export interface CoachMetrics {
  fatigueFlag: boolean;
  symmetryGapPct: number;
  ror?: number | null;
  rms?: number | null;
}

export interface CoachRequest {
  sessionId: string;
  setIdx?: number;
  phase: CoachPhase;
  metrics: CoachMetrics;
}

export interface CoachResponse {
  primary: SuggestionId;
  secondary: SuggestionId;
  why: string;           // ≤90 chars
  payoff?: {
    magnitudePct: number;
    hours: number;
  };
}

// --- In-memory cache (60s TTL) ---
type CacheKey = string;
const cache = new Map<CacheKey, { response: CoachResponse; expires: number }>();
const CACHE_TTL_MS = 60000;

function makeCacheKey(req: CoachRequest): string {
  return JSON.stringify({
    phase: req.phase,
    setIdx: req.setIdx,
    metrics: req.metrics,
  });
}

// --- Fallback rules ---
export function fallbackRules(metrics: CoachMetrics): CoachResponse {
  if (metrics.symmetryGapPct >= 5) return { primary: "END_EARLY", secondary: "HOLD_TEMPO", why: "Left lagged. Fixing symmetry improves strength carryover." };
  if (metrics.fatigueFlag)        return { primary: "END_EARLY", secondary: "HOLD_TEMPO", why: "Quality dipped—small dial now protects strength trend." };
  return { primary: "ADD_REP", secondary: "HOLD_TEMPO", why: "You’re fresh—tiny progressive bump compounds." };
}

// --- SuggestionId to UI label ---
export const SUGGESTION_LABELS: Record<SuggestionId, string> = {
  ADD_REP: "+1 rep next set",
  HOLD_TEMPO: "Hold reps, tighten tempo",
  END_EARLY: "End 1 set early to recover faster",
};

// --- Gemini API call ---
export async function getCoachSuggestions(req: CoachRequest): Promise<CoachResponse> {
  const cacheKey = makeCacheKey(req);
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.response;
  }

  // Build prompt
  const prompt = buildPrompt(req);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  let response: CoachResponse | null = null;

  try {
    response = await callGemini(prompt, controller.signal);
  } catch (firstError) {
    // Retry once with 400ms backoff
    await new Promise(res => setTimeout(res, 400));
    try {
      response = await callGemini(prompt, controller.signal);
    } catch (secondError) {
      console.warn('[gemini-coach] Gemini request failed twice', secondError ?? firstError);
    }
  } finally {
    clearTimeout(timeout);
  }

  // Validate or fallback
  if (!response || !validateCoachResponse(response)) {
    response = fallbackRules(req.metrics);
  }
  response.why = ensurePayoffIfGeneric(response.why, response.payoff);
  cache.set(cacheKey, { response, expires: now + CACHE_TTL_MS });
  return response;
}

function buildPrompt(req: CoachRequest): string {
  // ...construct the SYSTEM and USER prompt as described in the spec...
  // For brevity, this is a placeholder. Implement full template as needed.
  return `SYSTEM: You are an elite strength coach...\nUSER: ...metrics: ${JSON.stringify(req.metrics)}`;
}

async function callGemini(prompt: string, signal: AbortSignal): Promise<CoachResponse> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini client unavailable');
  }

  const response = await client.models.generateContent({
    model: 'gemini-1.5-pro',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      abortSignal: signal,
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 256,
    },
  });

  const text = await extractText(response);
  if (!text) {
    throw new Error('No Gemini response text');
  }

  let parsed: CoachResponse;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini response not valid JSON: ${text}`);
  }
  return parsed;
}

function validateCoachResponse(resp: any): resp is CoachResponse {
  const validIds = ["ADD_REP", "HOLD_TEMPO", "END_EARLY"];
  return (
    resp &&
    validIds.includes(resp.primary) &&
    validIds.includes(resp.secondary) &&
    resp.primary !== resp.secondary &&
    typeof resp.why === 'string' &&
    resp.why.length <= 90
  );
}
