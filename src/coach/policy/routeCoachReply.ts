/**
 * Router and guardrails for state-aware voice coaching.
 *
 * This module:
 * - Routes coaching requests through policy-aware system
 * - Applies guardrails to ensure responses follow rules
 * - Provides fallback cues when LLM output is invalid
 * - Enforces word budgets and topic restrictions
 * - Handles silence for quiet surfaces
 */

import { CoachSnapshot, LLMReply, Policy, Topic } from './types';
import { mergePolicy } from './table';
import { buildSystemPrompt, buildUserPayload } from '../prompt/build';
import { callLLM } from '../prompt/callLLM';

/**
 * Result of routing a coaching request.
 */
export type CoachReplyResult = {
  speak: boolean;          // Should the coach speak?
  text?: string;           // Final text to speak (if speak=true)
  raw?: LLMReply;         // Raw LLM response for debugging
};

/**
 * Routes a coaching request through the policy system.
 *
 * Flow:
 * 1. Determine policy from app surface + experience band
 * 2. Check if coach should stay silent (sayNothingUnlessChange)
 * 3. Handle safety overrides (pain flag)
 * 4. Call LLM with policy-constrained prompt
 * 5. Apply guardrails to LLM output
 * 6. Enforce word budget
 * 7. Return formatted response or fallback
 *
 * @param ctx - Complete coaching context snapshot
 * @returns Coach reply result with speak flag and text
 */
export async function routeCoachReply(ctx: CoachSnapshot): Promise<CoachReplyResult> {
  const policy = mergePolicy(ctx.appSurface, ctx.experienceBand);

  // Rule 1: Quiet surfaces unless change is needed
  if (policy.sayNothingUnlessChange && !ctx.requiresChange) {
    return { speak: false };
  }

  // Rule 2: Safety check - immediate override for pain
  if (ctx.safety?.pain_flag) {
    return {
      speak: true,
      text: "Stop the set. We don't push through pain. Skip squats and switch to leg press light.",
    };
  }

  // Build prompt with policy constraints
  const systemPrompt = buildSystemPrompt(policy);
  const userPayload = buildUserPayload(ctx);

  let llmReply: LLMReply;

  try {
    llmReply = await callLLM(systemPrompt, userPayload);
  } catch (error) {
    console.error('[routeCoachReply] LLM call failed:', error);
    // Use fallback cue
    return {
      speak: true,
      text: fallbackCue(policy),
    };
  }

  // Rule 3: Honor silence signal from model
  if (llmReply?.silent) {
    return { speak: false };
  }

  // Rule 4: Validate required fields
  if (!llmReply?.hook || !llmReply?.action || !llmReply?.action_type) {
    return {
      speak: true,
      text: fallbackCue(policy),
    };
  }

  // Rule 5: Check banned topics
  if (policy.banned?.includes(llmReply.action_type as Topic)) {
    return {
      speak: true,
      text: fallbackCue(policy),
    };
  }

  // Rule 6: Check allowed topics
  if (!policy.allowed.includes(llmReply.action_type as Topic)) {
    return {
      speak: true,
      text: fallbackCue(policy),
    };
  }

  // Rule 7: Format and enforce word budget
  const text = formatResponse(llmReply);
  const words = text.split(' ').length;
  const finalText = words > policy.wordBudget ? trimToWordBudget(text, policy.wordBudget) : text;

  return {
    speak: true,
    text: finalText,
    raw: llmReply,
  };
}

/**
 * Formats LLM reply into final spoken text.
 *
 * @param reply - Structured LLM response
 * @returns Formatted text: "HOOK WHY ACTION"
 */
function formatResponse(reply: LLMReply): string {
  const parts: string[] = [];

  if (reply.hook) {
    parts.push(reply.hook.trim());
  }

  if (reply.why) {
    parts.push(reply.why.trim());
  }

  if (reply.action) {
    parts.push(reply.action.trim());
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Trims response to fit word budget by preferring to drop WHY clause.
 *
 * Strategy:
 * 1. Try removing WHY clause first (least critical)
 * 2. If still too long, truncate at word boundary
 *
 * @param text - Full response text
 * @param maxWords - Maximum allowed words
 * @returns Trimmed text fitting budget
 */
function trimToWordBudget(text: string, maxWords: number): string {
  // Try splitting on sentence boundaries and removing middle clause (WHY)
  const sentences = text.split('. ');

  if (sentences.length >= 2) {
    // Keep first (HOOK) and last (ACTION) sentences
    const compact = `${sentences[0]}. ${sentences[sentences.length - 1]}`.replace(/\s+/g, ' ').trim();
    const compactWords = compact.split(' ').length;

    if (compactWords <= maxWords) {
      return compact;
    }
  }

  // Last resort: hard truncate at word boundary
  return text.split(' ').slice(0, maxWords).join(' ');
}

/**
 * Generates minimal fallback cue based on objective.
 *
 * Used when:
 * - LLM call fails
 * - LLM output violates policy
 * - LLM output is malformed
 *
 * @param policy - Active policy with objective
 * @returns Safe, always-valid coaching cue
 */
function fallbackCue(policy: Policy): string {
  switch (policy.objective) {
    case 'decide_next_block':
      return 'Start squats now and finish near 50 readiness.';

    case 'execute_reps':
      return 'Own the bottom; pause 2 seconds, then drive up hard.';

    case 'push_or_hold':
      return 'Keep the weight; hit a tight triple with clean depth.';

    case 'fix_single_fault':
      return 'Feel the stance: knees track over toes through the whole rep.';

    case 'protect_budget':
      return 'Stay on plan: one more hard set, then backoff.';

    case 'wrap_and_transition':
      return 'Wrap this block. You hit the target readiness window.';

    default:
      return 'Keep reps clean; stop once quality drops.';
  }
}
