/**
 * Policy types for state-aware voice coaching system.
 *
 * This module defines the core types for a state-aware, objective-driven coach
 * that adapts its responses based on app surface, experience level, and workout context.
 */

/**
 * App surfaces representing different states in the workout flow.
 * Each surface has distinct coaching needs and policies.
 */
export type AppSurface =
  | 'home'           // User is on home screen, not actively training
  | 'pre_session'    // About to start a session, planning phase
  | 'warmup'         // Warming up, focus on form and preparation
  | 'working_set'    // Main working sets, balanced intensity
  | 'top_set'        // Peak intensity sets, pushing limits
  | 'backoff'        // Post-peak sets with reduced load
  | 'rest_overlay'   // Resting between sets
  | 'cooldown'       // Winding down the session
  | 'post_session'   // Session complete, reviewing results
  | 'recovery_mode'; // Active recovery day

/**
 * User experience bands for adaptive verbosity and topic selection.
 */
export type ExperienceBand = 'novice' | 'intermediate' | 'advanced';

/**
 * Coaching topics that can be addressed in responses.
 * Each topic aligns with specific training concepts.
 */
export type Topic =
  | 'load'              // Weight/resistance adjustments
  | 'reps'              // Repetition targets and counting
  | 'tempo'             // Movement speed and timing
  | 'depth'             // Range of motion (especially squat depth)
  | 'stance'            // Foot position and setup
  | 'symmetry'          // Left/right balance
  | 'plan'              // Session structure and strategy
  | 'readiness_budget'  // Fatigue management and remaining capacity
  | 'motivation';       // Mental engagement (use sparingly)

/**
 * Coaching objectives that drive the response strategy.
 * Each objective focuses the coach's decision-making.
 */
export type CoachObjective =
  | 'decide_next_block'    // Help user choose what to do next
  | 'execute_reps'         // Guide through current set execution
  | 'push_or_hold'         // Decide whether to increase intensity or maintain
  | 'fix_single_fault'     // Address one specific form issue
  | 'protect_budget'       // Prevent overtraining, manage fatigue
  | 'wrap_and_transition'; // End current phase and move to next

/**
 * Complete snapshot of coaching context at a given moment.
 * This is passed to the router to generate appropriate responses.
 */
export type CoachSnapshot = {
  appSurface: AppSurface;
  experienceBand: ExperienceBand;
  readiness_now: number;          // Current readiness score (0-100)
  readiness_target: number;       // Target post-session readiness (typically ~50)
  requiresChange: boolean;        // Engine signals a change is needed
  phase: 'planning' | 'executing' | 'resting';

  // Optional set data from most recent performance
  last_set?: {
    exercise: string;
    weight_lb: number;
    reps: number;
    tempo?: string;                // e.g., "2010" (2s eccentric, 0s bottom, 1s concentric, 0s top)
    depth?: 'above' | 'parallel' | 'below';
    bar_speed?: 'slow' | 'stable' | 'fast';
  };

  // Symmetry analysis
  symmetry?: {
    left_pct: number;
    right_pct: number;
  };

  // Session management
  time_left_min?: number;

  // Safety flags
  safety?: {
    pain_flag: boolean;
  };

  // User intent classification
  intent: 'report' | 'ask' | 'struggle' | 'brag' | 'stall';
  utterance: string;              // Raw user input
};

/**
 * Policy configuration that controls coaching behavior.
 * Policies are determined by app surface and modified by experience band.
 */
export type Policy = {
  objective: CoachObjective;
  allowed: Topic[];                       // Topics the coach can discuss
  banned?: Topic[];                       // Topics to explicitly avoid
  wordBudget: number;                     // Maximum words in response
  sayNothingUnlessChange?: boolean;       // Stay silent unless requiresChange is true
};

/**
 * Structured LLM response with all components of a coaching cue.
 * Format: HOOK + WHY + ACTION
 */
export type LLMReply = {
  silent?: boolean;                       // If true, coach should not speak
  hook?: string;                          // Opening statement to grab attention (1 sentence)
  why?: string;                           // Brief reasoning or context (1 clause)
  action?: string;                        // Concrete directive for user (1 instruction)
  action_type?: Topic;                    // Which topic this action addresses
  prosody?: {                            // Voice delivery characteristics
    pace?: 'slow' | 'medium' | 'fast';
    energy?: 'calm' | 'confident' | 'high';
  };
};
