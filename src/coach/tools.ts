/**
 * Tool Adapters for Home Coach LLM Function Calling
 *
 * These functions are exposed to the Gemini API as tools.
 * Each includes timeout handling, retries, and proper error handling.
 *
 * @module coach/tools
 */

import type { ActionId, CoachMode, ContextPayload, Projection, VerifyResult } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TIMEOUT_MS = 8000; // 8 seconds
const MAX_RETRIES = 2;
const ENABLE_COACH_API = (() => {
  const runtimeOverride = typeof globalThis !== 'undefined' ? (globalThis as any).__ENABLE_COACH_API__ : undefined;
  if (runtimeOverride != null) {
    if (typeof runtimeOverride === 'string') {
      const normalised = runtimeOverride.trim().toLowerCase();
      if (normalised === 'false' || normalised === '0') return false;
      if (normalised === 'true' || normalised === '1') return true;
      return Boolean(normalised);
    }
    if (typeof runtimeOverride === 'boolean') return runtimeOverride;
    return Boolean(runtimeOverride);
  }
  const envValue = import.meta.env?.VITE_ENABLE_COACH_API ?? '0';
  const normalised = typeof envValue === 'string' ? envValue.trim().toLowerCase() : envValue;
  return normalised !== '0' && normalised !== 'false';
})();

const FALLBACK_CONTEXT: ContextPayload = {
  nowISO: new Date().toISOString(),
  sessionState: 'IDLE',
  readiness_local: 82,
  symmetryPct: 94,
  fatigue: { rmsDropPct: 12, rorDropPct: 15 },
  hoursSinceLastSameMuscle: 36,
  weekly: { done: 2, target: 4 },
  flags: { hrWarning: false, sorenessHigh: false },
  lastEndZone: 'GREEN',
  policy: {
    strengthWindowReps: [3, 6],
    symmetryIdeal: 95,
    fatigueZones: {
      rms: [15, 25, 40],
      ror: [20, 35, 50],
    },
  },
  allowed_actions: ['start_strength_block', 'start_recovery_30m', 'plan_tomorrow'],
};

const NON_RETRYABLE_ERROR_TOKENS = ['404', '<!doctype', 'not found', 'unexpected content type'];
let contextFallbackLogged = false;

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class ToolError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly retriesExhausted: boolean = false
  ) {
    super(message);
    this.name = 'ToolError';
  }
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  toolName: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const lowerMessage = lastError.message?.toLowerCase?.() ?? '';
      const nonRetryable = NON_RETRYABLE_ERROR_TOKENS.some((token) =>
        lowerMessage.includes(token),
      );

      if (attempt < maxRetries && !nonRetryable) {
        const delayMs = Math.pow(2, attempt) * 500; // 500ms, 1000ms, 2000ms
        console.warn(`[${toolName}] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        break;
      }
    }
  }

  throw new ToolError(
    lastError?.message || 'Unknown error',
    toolName,
    true
  );
}

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

export async function getContext(): Promise<ContextPayload> {
  if (!ENABLE_COACH_API) {
    return {
      ...FALLBACK_CONTEXT,
      nowISO: new Date().toISOString(),
    };
  }
  try {
    return await withRetry(async () => {
      const response = await fetchWithTimeout('/api/coach/context', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('Content-Type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Unexpected content type: ${contentType || 'unknown'}`);
      }

      const data = await response.json();

      if (
        !data ||
        typeof data.nowISO !== 'string' ||
        typeof data.readiness_local !== 'number' ||
        typeof data.weekly !== 'object' ||
        typeof data.flags !== 'object'
      ) {
        throw new Error('Invalid context payload: missing required fields');
      }

      return data as ContextPayload;
    }, 'get_context');
  } catch (error) {
    if (ENABLE_COACH_API && !contextFallbackLogged) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[get_context] Falling back to default context:', message);
      contextFallbackLogged = true;
    }
    return {
      ...FALLBACK_CONTEXT,
      nowISO: new Date().toISOString(),
    };
  }
}

/**
 * project_action(action_id) - Projects outcome of a proposed action
 *
 * Args:
 * - action_id: One of allowed_actions from context (e.g., 'start_strength', 'active_recovery')
 *
 * Returns:
 * - projectedReadiness: Expected readiness after action
 * - projectedFatigueZone: Expected fatigue zone
 * - estimatedDuration: Expected session length in minutes
 * - risks: Array of potential risks (e.g., ['overtraining', 'poor_symmetry'])
 */
export async function projectAction(action_id: ActionId): Promise<Projection> {
  return withRetry(async () => {
    const response = await fetchWithTimeout('/api/coach/project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action_id }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (
      !data ||
      typeof data.action_id !== 'string' ||
      typeof data.summary !== 'string' ||
      typeof data.effects !== 'object'
    ) {
      throw new Error('Invalid projection payload: missing required fields');
    }

    const effects = data.effects ?? {};
    if (
      !('strength_gain_pct' in effects) ||
      !('readiness_delta_pts' in effects) ||
      !('recovery_hours' in effects)
    ) {
      throw new Error('Invalid projection payload: missing effects fields');
    }

    return data as Projection;
  }, 'project_action');
}

/**
 * verify_plan(mode) - App verifies safety of LLM's proposed mode
 *
 * REQUIRED before finalizing any suggestion. LLM must call this.
 *
 * Args:
 * - mode: 'TRAIN' | 'ACTIVE_RECOVERY' | 'FULL_REST'
 *
 * Returns:
 * - approved: boolean - true if app allows this mode
 * - reason: string - explanation if rejected
 * - override_to: CoachMode | null - forced mode if safety override applied
 */
export async function verifyPlan(mode: CoachMode): Promise<VerifyResult> {
  return withRetry(async () => {
    const response = await fetchWithTimeout('/api/coach/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (typeof data?.ok !== 'boolean' || !data.safe_mode) {
      throw new Error('Invalid verify result: missing ok/safe_mode fields');
    }

    return data as VerifyResult;
  }, 'verify_plan');
}

/**
 * commit_action(action_id) - Commits user's chosen action to session log
 *
 * Called after user accepts suggestion and taps CTA.
 *
 * Args:
 * - action_id: The action ID from the approved suggestion
 *
 * Returns:
 * - ok: boolean - true if committed successfully
 */
export async function commitAction(action_id: ActionId): Promise<{ ok: boolean }> {
  return withRetry(async () => {
    const response = await fetchWithTimeout('/api/coach/commit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action_id }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (typeof data?.ok !== 'boolean') {
      throw new Error('Invalid commit result: missing ok field');
    }

    return data as { ok: boolean };
  }, 'commit_action');
}
