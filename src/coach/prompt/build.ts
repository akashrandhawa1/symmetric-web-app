/**
 * Prompt construction for state-aware voice coaching.
 *
 * This module builds tight, structured prompts that enforce:
 * - Concise responses (HOOK + WHY + ACTION format)
 * - Topic restrictions based on policy
 * - Quad-focused strength coaching only
 * - JSON-structured output for reliable parsing
 */

import { CoachSnapshot, Policy } from '../policy/types';

/**
 * Builds the system prompt that enforces coaching constraints.
 *
 * The prompt is designed to:
 * - Enforce word budget and structure
 * - Restrict topics to policy-allowed list
 * - Maintain strength coach persona
 * - Ensure JSON output format
 * - Handle silence when appropriate
 *
 * @param policy - Active policy with objective, topics, and word budget
 * @returns System prompt string for LLM
 */
export function buildSystemPrompt(policy: Policy): string {
  const lines: string[] = [
    `You are Symmetric's Voice Strength Coach.`,
    `Speak in ≤${policy.wordBudget} words using exactly:`,
    `1) HOOK (1 short sentence)`,
    `2) WHY (1 clause)`,
    `3) ACTION (1 directive)`,
    ``,
    `Only discuss ALLOWED topics: ${policy.allowed.join(', ')}.`,
  ];

  if (policy.banned?.length) {
    lines.push(`Never mention: ${policy.banned.join(', ')}.`);
  }

  lines.push(
    ``,
    `Objective: ${policy.objective}. Quad strength only. No wellness tips. No apologies.`,
    ``,
    `If the client indicates sayNothingUnlessChange and requiresChange=false → return {"silent": true}.`,
    `If intent=STRUGGLE and no pain → give 1 form cue and keep or slightly reduce load.`,
    ``,
    `Return JSON: {silent?: boolean, hook, why, action, action_type: "${policy.allowed.join('|')}", prosody:{pace,energy}}.`
  );

  return lines.join('\n');
}

/**
 * Builds the user payload with complete context snapshot.
 *
 * This provides the LLM with all necessary information to make informed decisions:
 * - Current state and phase
 * - Readiness and fatigue budget
 * - Recent performance data
 * - Safety flags
 * - User intent and utterance
 *
 * @param ctx - Complete coaching context snapshot
 * @returns JSON string containing all context
 */
export function buildUserPayload(ctx: CoachSnapshot): string {
  return JSON.stringify({
    surface: ctx.appSurface,
    experience: ctx.experienceBand,
    readiness_now: ctx.readiness_now,
    readiness_target: ctx.readiness_target,
    requiresChange: ctx.requiresChange,
    phase: ctx.phase,
    last_set: ctx.last_set ?? null,
    symmetry: ctx.symmetry ?? null,
    time_left_min: ctx.time_left_min ?? null,
    safety: ctx.safety ?? null,
    intent: ctx.intent,
    utterance: ctx.utterance,
  });
}
