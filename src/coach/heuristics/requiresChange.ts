/**
 * Heuristics for determining when coaching intervention is needed.
 *
 * This module provides simple rule-based triggers that signal when
 * the coach should speak on otherwise-quiet surfaces like home, rest, and recovery.
 *
 * Design philosophy:
 * - Keep heuristics simple and interpretable
 * - Trigger on actionable changes (form breaks, capacity available, budget risk)
 * - Integrate with workout engine for real-time signals
 */

import { CoachSnapshot } from '../policy/types';

/**
 * Determines if coaching intervention is required.
 *
 * Returns true when:
 * - Form quality degrades (depth breaks, speed drops)
 * - Performance indicates room to progress (stable speed, not near target)
 * - Budget check is needed (rest surface)
 * - Asymmetry detected
 *
 * @param ctx - Complete coaching context snapshot
 * @returns true if coach should speak, false if silence is fine
 */
export function computeRequiresChange(ctx: CoachSnapshot): boolean {
  const set = ctx.last_set;

  // No set data = no change signal
  if (!set) {
    return false;
  }

  // Check depth quality
  const depthBroke = set.depth === 'above';
  if (depthBroke) {
    return true; // Form breakdown: needs pause or load reduction
  }

  // Check bar speed for capacity signal
  const speedStable = set.bar_speed === 'stable' || set.bar_speed === 'fast';
  const nearTarget = ctx.readiness_now <= ctx.readiness_target + 4;

  if (speedStable && !nearTarget) {
    return true; // Room to push load or reps
  }

  // Check if speed is degrading (slow bar)
  const speedDegrading = set.bar_speed === 'slow';
  if (speedDegrading && !nearTarget) {
    return true; // May need load adjustment or form cue
  }

  // Check symmetry imbalance
  if (ctx.symmetry) {
    const { left_pct, right_pct } = ctx.symmetry;
    const imbalance = Math.abs(left_pct - right_pct);
    if (imbalance > 12) {
      return true; // Significant asymmetry
    }
  }

  // Always speak on rest_overlay to check budget
  if (ctx.appSurface === 'rest_overlay') {
    return true; // Budget check needed
  }

  // Check if user is struggling
  if (ctx.intent === 'struggle') {
    return true; // User needs help
  }

  // Check if readiness is critically low
  if (ctx.readiness_now < 35 && ctx.phase === 'executing') {
    return true; // Protect from overtraining
  }

  // Check if readiness is very high (potential to do more)
  if (ctx.readiness_now > 75 && ctx.phase === 'planning') {
    return true; // Encourage starting
  }

  return false;
}

/**
 * Classifies user intent from their utterance.
 *
 * This is a simple heuristic classifier that can be enhanced later.
 * Used to set ctx.intent before calling routeCoachReply.
 *
 * @param utterance - User's spoken input
 * @returns Intent classification
 */
export function classifyIntent(utterance: string): CoachSnapshot['intent'] {
  const lower = utterance.toLowerCase().trim();

  // Struggle patterns
  if (
    /hard|difficult|can't|too heavy|struggling|tough|tired|exhausted/i.test(lower)
  ) {
    return 'struggle';
  }

  // Question patterns
  if (
    /what|how|should|when|why|\?/.test(lower) ||
    /^(do|can|will|is|are)/i.test(lower)
  ) {
    return 'ask';
  }

  // Brag patterns
  if (
    /easy|felt great|crushed|strong|nailed|best|pr|personal record/i.test(lower)
  ) {
    return 'brag';
  }

  // Stall patterns
  if (
    /rest|break|wait|pause|later|not now|maybe/i.test(lower)
  ) {
    return 'stall';
  }

  // Default: report (stating facts)
  return 'report';
}
