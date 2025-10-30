/**
 * Adapter to convert existing CoachContext to new CoachSnapshot format.
 *
 * This module bridges the gap between the existing context structure
 * and the new policy-aware coaching system.
 */

import type { CoachContext, CoachContextPhase } from '../CoachContextBus';
import type { CoachSnapshot, AppSurface } from './types';
import { computeRequiresChange, classifyIntent } from '../heuristics/requiresChange';

/**
 * Maps legacy session phase to new AppSurface type.
 *
 * @param phase - Legacy CoachContextPhase
 * @returns Corresponding AppSurface
 */
function mapPhaseToSurface(phase: CoachContextPhase): AppSurface {
  switch (phase) {
    case 'intro':
      return 'pre_session';
    case 'warmup':
      return 'warmup';
    case 'work':
      return 'working_set'; // Default to working_set, can be overridden
    case 'rest':
      return 'rest_overlay';
    case 'cooldown':
      return 'cooldown';
    case 'summary':
      return 'post_session';
    default:
      return 'home';
  }
}

/**
 * Maps session phase to execution phase.
 *
 * @param phase - CoachContextPhase
 * @returns Execution phase for snapshot
 */
function mapToExecutionPhase(phase: CoachContextPhase): 'planning' | 'executing' | 'resting' {
  switch (phase) {
    case 'intro':
    case 'summary':
      return 'planning';
    case 'rest':
      return 'resting';
    case 'warmup':
    case 'work':
    case 'cooldown':
      return 'executing';
    default:
      return 'planning';
  }
}

/**
 * Converts CoachContext to CoachSnapshot for policy routing.
 *
 * This adapter:
 * - Maps legacy fields to new structure
 * - Provides sensible defaults for missing fields
 * - Computes derived values (requiresChange)
 * - Classifies user intent
 *
 * @param ctx - Legacy CoachContext
 * @param utterance - User's spoken input
 * @param overrides - Optional field overrides
 * @returns Complete CoachSnapshot ready for routing
 */
export function contextToSnapshot(
  ctx: CoachContext,
  utterance: string,
  overrides?: Partial<CoachSnapshot>
): CoachSnapshot {
  // Map app surface
  const appSurface = overrides?.appSurface ?? ctx.appSurface ?? mapPhaseToSurface(ctx.sessionPhase);

  // Determine experience band (default to intermediate)
  const experienceBand = overrides?.experienceBand ?? ctx.experienceBand ?? 'intermediate';

  // Readiness values
  const readiness_now = ctx.readiness ?? 75;
  const readiness_target = ctx.readinessTarget ?? 50;

  // Execution phase
  const phase = mapToExecutionPhase(ctx.sessionPhase);

  // Build last_set data
  const last_set = ctx.lastSet
    ? {
        exercise: ctx.lastSet.exercise,
        weight_lb: ctx.lastSet.weight_lb ?? 0,
        reps: ctx.lastSet.reps,
        tempo: ctx.lastSet.tempo,
        depth: ctx.lastSet.depth,
        bar_speed: ctx.lastSet.bar_speed,
      }
    : undefined;

  // Symmetry data
  const symmetry = ctx.symmetry ?? (ctx.metrics?.symmetryPct !== undefined
    ? {
        left_pct: ctx.metrics.symmetryPct,
        right_pct: 100 - ctx.metrics.symmetryPct,
      }
    : undefined);

  // Safety flags
  const safety = {
    pain_flag: ctx.userFlags?.pain ?? false,
  };

  // Classify intent
  const intent = overrides?.intent ?? classifyIntent(utterance);

  // Build snapshot
  const snapshot: CoachSnapshot = {
    appSurface,
    experienceBand,
    readiness_now,
    readiness_target,
    requiresChange: false, // Will be computed below
    phase,
    last_set,
    symmetry,
    time_left_min: ctx.timeLeftMin,
    safety,
    intent,
    utterance,
    ...overrides, // Apply any overrides
  };

  // Compute requiresChange based on snapshot
  snapshot.requiresChange = overrides?.requiresChange ?? computeRequiresChange(snapshot);

  return snapshot;
}
