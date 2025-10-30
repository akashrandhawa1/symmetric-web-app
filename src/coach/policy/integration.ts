/**
 * Integration helpers for state-aware coaching system.
 *
 * This module provides utility functions to integrate the new policy-aware
 * coaching router with existing voice coach infrastructure.
 */

import type { CoachContext } from '../CoachContextBus';
import { contextToSnapshot } from './adapter';
import { routeCoachReply, type CoachReplyResult } from './routeCoachReply';

/**
 * Generates a state-aware coaching response from context and user utterance.
 *
 * This is the main integration point for using the new coaching system.
 * It handles:
 * - Converting legacy context to snapshot
 * - Routing through policy system
 * - Returning formatted response
 *
 * Usage example:
 * ```typescript
 * const ctx = CoachContextBus.getSnapshot();
 * const result = await generateStateAwareCoachResponse(ctx, "How many reps should I do?");
 * if (result.speak) {
 *   speak(result.text); // Use TTS to speak the response
 * }
 * ```
 *
 * @param ctx - Current coaching context
 * @param utterance - User's spoken input
 * @returns Coach reply result with speak flag and text
 */
export async function generateStateAwareCoachResponse(
  ctx: CoachContext,
  utterance: string
): Promise<CoachReplyResult> {
  // Convert context to snapshot
  const snapshot = contextToSnapshot(ctx, utterance);

  // Route through policy system
  const result = await routeCoachReply(snapshot);

  return result;
}

/**
 * Checks if coach should stay silent based on current context.
 *
 * This is useful for proactive silence checks before initiating voice input.
 * Can be used to disable mic button on surfaces where coach shouldn't speak.
 *
 * @param ctx - Current coaching context
 * @returns true if coach should stay silent
 */
export function shouldCoachStaySilent(ctx: CoachContext): boolean {
  const snapshot = contextToSnapshot(ctx, '');

  // Import policy to check sayNothingUnlessChange
  import('./table').then(({ mergePolicy }) => {
    const policy = mergePolicy(snapshot.appSurface, snapshot.experienceBand);
    return policy.sayNothingUnlessChange && !snapshot.requiresChange;
  });

  // Synchronous fallback: check quiet surfaces
  const quietSurfaces = ['home', 'rest_overlay', 'recovery_mode'];
  const surface = snapshot.appSurface;

  return quietSurfaces.includes(surface) && !snapshot.requiresChange;
}

/**
 * Gets the current policy for the given context.
 *
 * Useful for UI hints about what topics the coach can discuss.
 *
 * @param ctx - Current coaching context
 * @returns Active policy with objective, topics, and word budget
 */
export async function getCurrentPolicy(ctx: CoachContext) {
  const { mergePolicy } = await import('./table');
  const snapshot = contextToSnapshot(ctx, '');
  return mergePolicy(snapshot.appSurface, snapshot.experienceBand);
}
