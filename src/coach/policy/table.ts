/**
 * Policy table defining coaching behavior for each app surface.
 *
 * This module provides the policy matrix that controls:
 * - What topics the coach can discuss
 * - How verbose responses should be
 * - When the coach should stay silent
 * - What objective drives the coach's strategy
 */

import { Policy, AppSurface, ExperienceBand } from './types';

/**
 * Base policy matrix: defines default coaching behavior for each app surface.
 *
 * Design principles:
 * - Home/Rest/Recovery surfaces are silent by default (sayNothingUnlessChange: true)
 * - Working sets get balanced topic access with moderate word budgets
 * - Top sets focus on performance with slightly more verbosity
 * - Each surface has a specific objective that drives response strategy
 */
export const BASE_POLICY: Record<AppSurface, Policy> = {
  // Home screen: only speak if something needs attention
  home: {
    objective: 'decide_next_block',
    allowed: ['plan', 'readiness_budget'],
    banned: ['load', 'tempo', 'depth', 'stance', 'symmetry'],
    wordBudget: 18,
    sayNothingUnlessChange: true,
  },

  // Pre-session: help user plan and check readiness
  pre_session: {
    objective: 'decide_next_block',
    allowed: ['plan', 'readiness_budget'],
    wordBudget: 18,
  },

  // Warmup: focus on movement quality and preparation
  warmup: {
    objective: 'fix_single_fault',
    allowed: ['tempo', 'depth', 'stance', 'symmetry'],
    wordBudget: 18,
  },

  // Working sets: balanced coaching on all technical aspects
  working_set: {
    objective: 'execute_reps',
    allowed: ['load', 'reps', 'tempo', 'depth', 'symmetry'],
    wordBudget: 18,
  },

  // Top set: peak performance, can discuss load management
  top_set: {
    objective: 'push_or_hold',
    allowed: ['load', 'reps', 'depth', 'tempo', 'readiness_budget'],
    wordBudget: 18,
  },

  // Backoff sets: maintain quality with reduced load
  backoff: {
    objective: 'execute_reps',
    allowed: ['tempo', 'depth', 'reps', 'symmetry'],
    wordBudget: 16,
  },

  // Rest between sets: silent unless readiness or plan adjustment needed
  rest_overlay: {
    objective: 'protect_budget',
    allowed: ['readiness_budget', 'plan', 'load'],
    wordBudget: 16,
    sayNothingUnlessChange: true,
  },

  // Cooldown: wrap up and transition
  cooldown: {
    objective: 'wrap_and_transition',
    allowed: ['plan', 'readiness_budget'],
    wordBudget: 18,
  },

  // Post-session: review and plan ahead
  post_session: {
    objective: 'wrap_and_transition',
    allowed: ['plan', 'readiness_budget'],
    wordBudget: 18,
  },

  // Recovery mode: silent unless specific guidance needed
  recovery_mode: {
    objective: 'decide_next_block',
    allowed: ['plan', 'readiness_budget'],
    wordBudget: 16,
    sayNothingUnlessChange: true,
  },
};

/**
 * Experience-based overrides for policy customization.
 *
 * Design philosophy:
 * - Novices need more words, simpler topics (basics: tempo, depth, stance)
 * - Intermediates use default settings
 * - Advanced lifters prefer terse cues focusing on load and readiness
 */
export const EXPERIENCE_OVERRIDES: Partial<Record<ExperienceBand, Partial<Policy>>> = {
  novice: {
    wordBudget: 22,
    allowed: ['tempo', 'depth', 'stance', 'reps', 'plan'],
  },

  intermediate: {
    wordBudget: 18,
    // No topic override - use surface defaults
  },

  advanced: {
    wordBudget: 14,
    allowed: ['load', 'reps', 'tempo', 'readiness_budget'],
  },
};

/**
 * Merges base policy with experience-based overrides.
 *
 * @param surface - Current app surface
 * @param band - User's experience level
 * @returns Complete policy with overrides applied
 */
export function mergePolicy(surface: AppSurface, band: ExperienceBand): Policy {
  const base = BASE_POLICY[surface];
  const override = EXPERIENCE_OVERRIDES[band] ?? {};

  return {
    objective: (override.objective as Policy['objective']) ?? base.objective,
    allowed: override.allowed ?? base.allowed,
    banned: override.banned ?? base.banned,
    wordBudget: override.wordBudget ?? base.wordBudget,
    sayNothingUnlessChange: override.sayNothingUnlessChange ?? base.sayNothingUnlessChange,
  };
}
