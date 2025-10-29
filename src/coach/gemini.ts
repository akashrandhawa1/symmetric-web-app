/**
 * Gemini Client Wrapper for Symmetric Home Coach
 *
 * Implements the LLM-first, app-verified flow using function calling while
 * layering style controls, anti-repetition, and optional What-If benefits.
 */

import { HOME_COACH_SYSTEM_PROMPT } from './prompt';
import { STYLE_AND_VARIETY_ADDENDUM } from './style/prompt.addendum';
import { TrainerSampler } from './style/sampler';
import { tooSimilarToRecent, pushHistory } from './style/antiRepeat';
import { CoachResponseSchema } from './validator';
import type { CoachJSON, SuggestionJSON, ContextPayload, VerifyResult, CoachMode, ActionId } from './types';
import { getContext, projectAction, verifyPlan, commitAction } from './tools';
import { shouldShowNumeric, shouldShowQual, recordShown, createHistory } from './whatif/gating';
import { numericToSecondary, qualToSecondary } from './whatif/text';
import type { WhatIfContext, WhatIfNumeric, WhatIfQualPayload } from './types.whatif';
import { runHomeCoachMock, type HomeCoachMockOverrides } from './mockGemini';

const GEMINI_ENABLED =
  typeof import.meta !== 'undefined' && (import.meta.env?.VITE_ENABLE_GEMINI ?? '1') !== '0';

const runtimeCoachOverride =
  typeof globalThis !== 'undefined' ? (globalThis as any).__ENABLE_COACH_API__ : undefined;

const COACH_API_ENABLED = (() => {
  if (runtimeCoachOverride != null) {
    if (typeof runtimeCoachOverride === 'string') {
      const trimmed = runtimeCoachOverride.trim().toLowerCase();
      if (trimmed === 'true' || trimmed === '1') return true;
      if (trimmed === 'false' || trimmed === '0') return false;
      return Boolean(trimmed);
    }
    if (typeof runtimeCoachOverride === 'boolean') return runtimeCoachOverride;
    return Boolean(runtimeCoachOverride);
  }
  const envValue = import.meta?.env?.VITE_ENABLE_COACH_API ?? '0';
  const normalised = typeof envValue === 'string' ? envValue.trim().toLowerCase() : envValue;
  return normalised !== '0' && normalised !== 'false';
})();

const GEMINI_ENV =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : {};
const DEFAULT_GEMINI_ENDPOINT = '/api/gemini/home-coach';
const GEMINI_ENDPOINT =
  GEMINI_ENABLED && COACH_API_ENABLED
    ? GEMINI_ENV.VITE_GEMINI_HOME_ENDPOINT || GEMINI_ENV.VITE_GEMINI_REST_ENDPOINT || DEFAULT_GEMINI_ENDPOINT
    : null;
const GEMINI_TIMEOUT_MS = 15000;
const MAX_TURNS = 8;

const whatIfHistory = createHistory();

export type GeminiCallPayload = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Internal Types
// ---------------------------------------------------------------------------

type GeminiMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'function'; name: string; content: string };

type GeminiToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

type GeminiToolCall = {
  name: string;
  arguments?: Record<string, unknown> | string | null;
};

type GeminiAPIResponse = {
  functionCalls?: GeminiToolCall[];
  text?: string;
  message?: unknown;
};

type GeminiCallResult = {
  output: unknown;
  context: ContextPayload | null;
};

const TOOL_DEFINITIONS: GeminiToolDefinition[] = [
  {
    name: 'get_context',
    description: 'Fetch current readiness, fatigue, session state, and allowed actions.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'project_action',
    description: 'Project outcome of a proposed action. Use action_id from allowed_actions.',
    parameters: {
      type: 'object',
      properties: {
        action_id: {
          type: 'string',
          enum: ['start_strength_block', 'start_recovery_30m', 'plan_tomorrow'],
        },
      },
      required: ['action_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'verify_plan',
    description: 'REQUIRED before final suggestion. App verifies safety of chosen mode.',
    parameters: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['TRAIN', 'ACTIVE_RECOVERY', 'FULL_REST'],
        },
      },
      required: ['mode'],
      additionalProperties: false,
    },
  },
  {
    name: 'commit_action',
    description: 'Commit the approved action to the session log (app-side use).',
    parameters: {
      type: 'object',
      properties: {
        action_id: {
          type: 'string',
          enum: ['start_strength_block', 'start_recovery_30m', 'plan_tomorrow'],
        },
      },
      required: ['action_id'],
      additionalProperties: false,
    },
  },
];

function parseArguments(raw: GeminiToolCall['arguments']): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`Failed to parse tool arguments: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return raw;
}

function normalizeMode(value: unknown): CoachMode {
  if (value === 'TRAIN' || value === 'ACTIVE_RECOVERY' || value === 'FULL_REST') {
    return value;
  }
  throw new Error(`Invalid mode "${String(value)}" passed to verify_plan`);
}

function normalizeActionId(value: unknown): ActionId {
  if (
    value === 'start_strength_block' ||
    value === 'start_recovery_30m' ||
    value === 'plan_tomorrow'
  ) {
    return value;
  }
  throw new Error(`Unsupported action_id "${String(value)}"`);
}

// ---------------------------------------------------------------------------
// Gemini Call Helper
// ---------------------------------------------------------------------------

async function callGemini(
  systemPrompt: string,
  payload: GeminiCallPayload,
  sampler = TrainerSampler,
): Promise<GeminiCallResult> {
  if (!GEMINI_ENABLED || !COACH_API_ENABLED) {
    const mock = await runHomeCoachMock(payload as HomeCoachMockOverrides);
    return { output: mock, context: null };
  }
  if (!GEMINI_ENDPOINT) {
    throw new Error('Gemini home coach endpoint unavailable');
  }
  const history: GeminiMessage[] = [{ role: 'user', content: JSON.stringify(payload) }];
  let turns = 0;
  let latestContext: ContextPayload | null = null;

  while (turns < MAX_TURNS) {
    turns += 1;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const response = await fetch(endpointWithKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemPrompt,
          messages: history,
          tools: TOOL_DEFINITIONS,
          sampler,
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Gemini] ${response.status} error:`, errorText);
        throw new Error(`Gemini endpoint responded ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as GeminiAPIResponse;

      if (data.functionCalls && data.functionCalls.length > 0) {
        for (const call of data.functionCalls) {
          const args = parseArguments(call.arguments);

          switch (call.name) {
            case 'get_context': {
              const context = await getContext();
              latestContext = context;
              history.push({ role: 'function', name: 'get_context', content: JSON.stringify(context) });
              break;
            }
            case 'project_action': {
              const actionId = normalizeActionId(args.action_id);
              const projection = await projectAction(actionId);
              history.push({ role: 'function', name: 'project_action', content: JSON.stringify(projection) });
              break;
            }
            case 'verify_plan': {
              const mode = normalizeMode(args.mode);
              const verification = await verifyPlan(mode);
              history.push({ role: 'function', name: 'verify_plan', content: JSON.stringify(verification) });
              break;
            }
            case 'commit_action': {
              const actionId = normalizeActionId(args.action_id);
              const commitResult = await commitAction(actionId);
              history.push({ role: 'function', name: 'commit_action', content: JSON.stringify(commitResult) });
              break;
            }
            default:
              throw new Error(`Unknown tool call "${call.name}"`);
          }
        }
        continue;
      }

      const output = data.text ?? data.message;
      return { output, context: latestContext };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Gemini request timeout after ${GEMINI_TIMEOUT_MS}ms`);
      }
      throw error;
    }
  }

  throw new Error('Gemini exceeded maximum tool turns without final response');
}

async function resolveMockOverrides(): Promise<HomeCoachMockOverrides | undefined> {
  try {
    const context = await getContext();
    const fatiguePct =
      typeof context.fatigue?.rmsDropPct === 'number' ? context.fatigue.rmsDropPct : null;
    const fatigueHigh =
      fatiguePct == null ? null : Number.isFinite(fatiguePct) ? fatiguePct >= 15 : null;
    return {
      readiness:
        typeof context.readiness_local === 'number' && Number.isFinite(context.readiness_local)
          ? context.readiness_local
          : null,
      hoursSinceLastSameMuscle:
        typeof context.hoursSinceLastSameMuscle === 'number' && Number.isFinite(context.hoursSinceLastSameMuscle)
          ? context.hoursSinceLastSameMuscle
          : null,
      hrWarning:
        typeof context.flags?.hrWarning === 'boolean' ? context.flags.hrWarning : null,
      fatigueHigh,
    };
  } catch (error) {
    console.warn('[Gemini] Unable to load context for mock fallback:', error);
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Anti-repetition helper
// ---------------------------------------------------------------------------

export async function ensureVariety(
  output: CoachJSON,
  rewriteFn: (hint: string) => Promise<CoachJSON>,
): Promise<CoachJSON> {
  if (output.type !== 'suggestion') return output;
  const text = `${output.message} | ${output.cta} | ${output.secondary ?? ''} | ${(output as any).science ?? ''}`;
  if (!tooSimilarToRecent(text)) return output;

  const hint = 'Rephrase with different verbs and connectors. Keep meaning and length; avoid prior bigrams.';
  const rewritten = await rewriteFn(hint);
  if (rewritten.type === 'suggestion') {
    const rewrittenText = `${rewritten.message} | ${rewritten.cta} | ${rewritten.secondary ?? ''} | ${(rewritten as any).science ?? ''}`;
    if (!tooSimilarToRecent(rewrittenText)) {
      return rewritten;
    }
  }
  return output;
}

// ---------------------------------------------------------------------------
// What-If helpers
// ---------------------------------------------------------------------------

async function fetchWhatIfNumeric(): Promise<WhatIfNumeric | null> {
  try {
    const response = await fetch('/api/coach/what-if', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload) return null;
    if (Array.isArray(payload) && payload.length > 0) {
      return payload[0] as WhatIfNumeric;
    }
    if (payload.result) return payload.result as WhatIfNumeric;
    return payload as WhatIfNumeric;
  } catch (error) {
    console.warn('[HomeCoach] what-if projection unavailable', error);
    return null;
  }
}

async function augmentSuggestionWithWhatIf(
  suggestion: SuggestionJSON,
  ctx: WhatIfContext,
  qualPayload?: WhatIfQualPayload | null,
): Promise<SuggestionJSON> {
  const numeric = await fetchWhatIfNumeric();
  if (numeric && shouldShowNumeric(ctx, numeric, whatIfHistory)) {
    const secondary = numericToSecondary(numeric);
    if (secondary) {
      suggestion.secondary = secondary;
      recordShown(whatIfHistory, numeric.action_id);
      return suggestion;
    }
  }

  if (qualPayload && shouldShowQual(ctx, qualPayload, whatIfHistory)) {
    const clause = qualToSecondary(qualPayload.clause ?? qualPayload.title);
    if (clause) {
      suggestion.secondary = clause;
      recordShown(whatIfHistory, qualPayload.kind);
    }
  }

  return suggestion;
}

// ---------------------------------------------------------------------------
// Main Flow
// ---------------------------------------------------------------------------

export async function runHomeCoach(): Promise<CoachJSON> {
  if (!GEMINI_ENDPOINT) {
    const overrides = await resolveMockOverrides();
    return runHomeCoachMock(overrides);
  }

  const system = `${HOME_COACH_SYSTEM_PROMPT}
${STYLE_AND_VARIETY_ADDENDUM}`;

  try {
    const firstPass = await callGemini(system, { intent: 'home_coach' });
    const firstParsed = CoachResponseSchema.parse(
      typeof firstPass.output === 'string' ? JSON.parse(String(firstPass.output)) : firstPass.output,
    );

    let suggestion: CoachJSON = firstParsed;
    let activeContext = firstPass.context;

    if (suggestion.type === 'suggestion') {
      const verification: VerifyResult = await verifyPlan(suggestion.mode);
      if (!verification.ok) {
        const rewrite = await callGemini(system, {
          intent: 'rewrite_for_safe_mode',
          safe_mode: verification.safe_mode,
          previous: suggestion,
        });
        const rewriteParsed = CoachResponseSchema.parse(
          typeof rewrite.output === 'string' ? JSON.parse(String(rewrite.output)) : rewrite.output,
        );
        suggestion = rewriteParsed;
        activeContext = rewrite.context ?? activeContext;
      }
    }

    const varied = await ensureVariety(suggestion, async (hint) => {
      const rewrite = await callGemini(system, {
        intent: 'refresh_wording',
        hint,
        previous: suggestion,
      });
      return CoachResponseSchema.parse(
        typeof rewrite.output === 'string' ? JSON.parse(String(rewrite.output)) : rewrite.output,
      );
    });

    suggestion = varied;

    if (suggestion.type !== 'suggestion') {
      return suggestion;
    }

    const qualPayload = (suggestion as any).what_if as WhatIfQualPayload | null | undefined;

    const whatIfCtx: WhatIfContext = {
      safeMode: suggestion.mode,
      minutesAvailable: undefined,
      hoursSinceLastSameMuscle: activeContext?.hoursSinceLastSameMuscle ?? null,
    };

    await augmentSuggestionWithWhatIf(suggestion, whatIfCtx, qualPayload ?? null);

    if ('what_if' in suggestion) {
      delete (suggestion as any).what_if;
    }

    pushHistory({
      message: suggestion.message,
      cta: suggestion.cta,
      secondary: suggestion.secondary ?? null,
      science: (suggestion as any).science ?? null,
    });

    return suggestion;
  } catch (error) {
    console.warn('[Gemini] Falling back to mock home coach generator.', error);
    const overrides = await resolveMockOverrides();
    return runHomeCoachMock(overrides);
  }
}

export function __resetWhatIfHistoryForTests(): void {
  whatIfHistory.shown.splice(0, whatIfHistory.shown.length);
  for (const key of Object.keys(whatIfHistory.accepted)) {
    delete whatIfHistory.accepted[key];
  }
}
