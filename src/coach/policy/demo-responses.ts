/**
 * DEMO: Concrete examples of state-aware coach responses
 *
 * This file demonstrates actual coach replies across different surfaces,
 * experience levels, and scenarios.
 */

import type { CoachSnapshot, LLMReply } from './types';

/**
 * Example coach responses showing HOOK + WHY + ACTION format
 */

// ============================================================================
// SCENARIO 1: Home Screen - Silent by Default
// ============================================================================

const homeScenario: CoachSnapshot = {
  appSurface: 'home',
  experienceBand: 'intermediate',
  readiness_now: 75,
  readiness_target: 50,
  requiresChange: false,  // ← No change needed
  phase: 'planning',
  intent: 'ask',
  utterance: 'What should I do today?',
};

// Response: { speak: false }
// Coach stays SILENT - no coaching needed


// ============================================================================
// SCENARIO 2: Home Screen - Change Needed
// ============================================================================

const homeWithChange: CoachSnapshot = {
  appSurface: 'home',
  experienceBand: 'intermediate',
  readiness_now: 85,
  readiness_target: 50,
  requiresChange: true,  // ← High readiness, should start
  phase: 'planning',
  intent: 'ask',
  utterance: 'Should I train today?',
};

// Expected LLM Response:
const homeResponse: LLMReply = {
  hook: 'Readiness is 85.',
  why: 'Perfect window for work.',
  action: 'Start squats and finish near 50.',
  action_type: 'plan',
};

// Final spoken text:
// "Readiness is 85. Perfect window for work. Start squats and finish near 50."
// (15 words - within 18-word budget)


// ============================================================================
// SCENARIO 3: Working Set - Rep Guidance
// ============================================================================

const workingSetScenario: CoachSnapshot = {
  appSurface: 'working_set',
  experienceBand: 'intermediate',
  readiness_now: 60,
  readiness_target: 50,
  requiresChange: false,
  phase: 'executing',
  last_set: {
    exercise: 'Back Squat',
    weight_lb: 185,
    reps: 5,
    bar_speed: 'stable',
    depth: 'parallel',
  },
  intent: 'ask',
  utterance: 'How many reps should I do?',
};

// Expected LLM Response:
const workingSetResponse: LLMReply = {
  hook: 'Bar speed is stable.',
  why: 'Quality is there.',
  action: 'Hit 5 reps then stop.',
  action_type: 'reps',
};

// Final spoken text:
// "Bar speed is stable. Quality is there. Hit 5 reps then stop."
// (12 words - well within budget)


// ============================================================================
// SCENARIO 4: Top Set - Push Load
// ============================================================================

const topSetPush: CoachSnapshot = {
  appSurface: 'top_set',
  experienceBand: 'intermediate',
  readiness_now: 65,
  readiness_target: 50,
  requiresChange: true,
  phase: 'executing',
  last_set: {
    exercise: 'Back Squat',
    weight_lb: 225,
    reps: 5,
    bar_speed: 'fast',  // ← Moving fast, room to push
    depth: 'parallel',
  },
  intent: 'brag',
  utterance: 'That felt easy!',
};

// Expected LLM Response:
const topSetResponse: LLMReply = {
  hook: 'Bar speed is fast.',
  why: 'You have room.',
  action: 'Add 5 pounds next set.',
  action_type: 'load',
};

// Final spoken text:
// "Bar speed is fast. You have room. Add 5 pounds next set."
// (12 words)


// ============================================================================
// SCENARIO 5: Working Set - Depth Breakdown (Form Issue)
// ============================================================================

const depthIssue: CoachSnapshot = {
  appSurface: 'working_set',
  experienceBand: 'intermediate',
  readiness_now: 55,
  readiness_target: 50,
  requiresChange: true,  // ← Depth broke, needs fix
  phase: 'executing',
  last_set: {
    exercise: 'Back Squat',
    weight_lb: 205,
    reps: 4,
    bar_speed: 'slow',
    depth: 'above',  // ← Broke parallel
  },
  intent: 'struggle',
  utterance: 'That was tough.',
};

// Expected LLM Response:
const depthFixResponse: LLMReply = {
  hook: 'Depth broke parallel.',
  why: 'Load is too heavy.',
  action: 'Drop 10 pounds and add 2-second pause at bottom.',
  action_type: 'depth',
};

// Final spoken text:
// "Depth broke parallel. Load is too heavy. Drop 10 pounds and add 2-second pause at bottom."
// (16 words)


// ============================================================================
// SCENARIO 6: Warmup - Tempo Cue
// ============================================================================

const warmupScenario: CoachSnapshot = {
  appSurface: 'warmup',
  experienceBand: 'novice',  // ← Novice gets more words (22 budget)
  readiness_now: 80,
  readiness_target: 50,
  requiresChange: false,
  phase: 'executing',
  intent: 'ask',
  utterance: 'How should I move?',
};

// Expected LLM Response:
const warmupResponse: LLMReply = {
  hook: 'Control the descent.',
  why: 'Build the pattern now.',
  action: 'Count to 2 going down, pause at bottom, then drive up fast.',
  action_type: 'tempo',
};

// Final spoken text (NOVICE - longer):
// "Control the descent. Build the pattern now. Count to 2 going down, pause at bottom, then drive up fast."
// (20 words - within 22-word novice budget)


// ============================================================================
// SCENARIO 7: Top Set - Advanced Lifter (Terse)
// ============================================================================

const advancedTopSet: CoachSnapshot = {
  appSurface: 'top_set',
  experienceBand: 'advanced',  // ← Advanced gets fewer words (14 budget)
  readiness_now: 58,
  readiness_target: 50,
  requiresChange: true,
  phase: 'executing',
  last_set: {
    exercise: 'Back Squat',
    weight_lb: 315,
    reps: 3,
    bar_speed: 'stable',
    depth: 'parallel',
  },
  intent: 'ask',
  utterance: 'Load?',
};

// Expected LLM Response:
const advancedResponse: LLMReply = {
  hook: 'Hold weight.',
  why: 'Near target.',
  action: 'Hit a tight triple.',
  action_type: 'load',
};

// Final spoken text (ADVANCED - terse):
// "Hold weight. Near target. Hit a tight triple."
// (8 words - well under 14-word advanced budget)


// ============================================================================
// SCENARIO 8: Rest Overlay - Budget Check
// ============================================================================

const restBudget: CoachSnapshot = {
  appSurface: 'rest_overlay',
  experienceBand: 'intermediate',
  readiness_now: 52,
  readiness_target: 50,
  requiresChange: true,  // ← Near target, needs budget check
  phase: 'resting',
  intent: 'ask',
  utterance: 'One more set?',
};

// Expected LLM Response:
const restResponse: LLMReply = {
  hook: 'Readiness is 52.',
  why: 'Close to target.',
  action: 'One more hard set, then backoff.',
  action_type: 'readiness_budget',
};

// Final spoken text:
// "Readiness is 52. Close to target. One more hard set, then backoff."
// (13 words)


// ============================================================================
// SCENARIO 9: Pain Flag - Safety Override
// ============================================================================

const painScenario: CoachSnapshot = {
  appSurface: 'working_set',
  experienceBand: 'intermediate',
  readiness_now: 60,
  readiness_target: 50,
  requiresChange: false,
  phase: 'executing',
  safety: {
    pain_flag: true,  // ← PAIN DETECTED
  },
  intent: 'struggle',
  utterance: 'My knee hurts.',
};

// Response: IMMEDIATE SAFETY OVERRIDE (no LLM call)
// Final spoken text:
// "Stop the set. We don't push through pain. Skip squats and switch to leg press light."
// (16 words)


// ============================================================================
// SCENARIO 10: Symmetry Issue
// ============================================================================

const symmetryIssue: CoachSnapshot = {
  appSurface: 'working_set',
  experienceBand: 'intermediate',
  readiness_now: 65,
  readiness_target: 50,
  requiresChange: true,  // ← Asymmetry detected
  phase: 'executing',
  last_set: {
    exercise: 'Back Squat',
    weight_lb: 185,
    reps: 5,
    bar_speed: 'stable',
    depth: 'parallel',
  },
  symmetry: {
    left_pct: 42,   // ← Left leg only doing 42%
    right_pct: 58,  // ← Right leg doing 58%
  },
  intent: 'report',
  utterance: 'Finished the set.',
};

// Expected LLM Response:
const symmetryResponse: LLMReply = {
  hook: 'Left side is weaker.',
  why: '42-58 split.',
  action: 'Lead with left leg and chase even pressure next set.',
  action_type: 'symmetry',
};

// Final spoken text:
// "Left side is weaker. 42-58 split. Lead with left leg and chase even pressure next set."
// (16 words)


// ============================================================================
// SUMMARY OF EXAMPLES
// ============================================================================

export const RESPONSE_EXAMPLES = {
  // Silent scenarios
  home_silent: {
    scenario: homeScenario,
    response: { speak: false },
    note: 'Coach stays silent - no change needed on home screen',
  },

  // Active coaching scenarios
  home_start_training: {
    scenario: homeWithChange,
    response: homeResponse,
    text: 'Readiness is 85. Perfect window for work. Start squats and finish near 50.',
    words: 15,
  },

  working_set_reps: {
    scenario: workingSetScenario,
    response: workingSetResponse,
    text: 'Bar speed is stable. Quality is there. Hit 5 reps then stop.',
    words: 12,
  },

  top_set_push: {
    scenario: topSetPush,
    response: topSetResponse,
    text: 'Bar speed is fast. You have room. Add 5 pounds next set.',
    words: 12,
  },

  depth_breakdown: {
    scenario: depthIssue,
    response: depthFixResponse,
    text: 'Depth broke parallel. Load is too heavy. Drop 10 pounds and add 2-second pause at bottom.',
    words: 16,
  },

  warmup_novice: {
    scenario: warmupScenario,
    response: warmupResponse,
    text: 'Control the descent. Build the pattern now. Count to 2 going down, pause at bottom, then drive up fast.',
    words: 20,
    note: 'Novice gets 22-word budget (more verbose)',
  },

  top_set_advanced: {
    scenario: advancedTopSet,
    response: advancedResponse,
    text: 'Hold weight. Near target. Hit a tight triple.',
    words: 8,
    note: 'Advanced gets 14-word budget (very terse)',
  },

  rest_budget_check: {
    scenario: restBudget,
    response: restResponse,
    text: 'Readiness is 52. Close to target. One more hard set, then backoff.',
    words: 13,
  },

  pain_safety_override: {
    scenario: painScenario,
    response: null, // No LLM call - immediate override
    text: "Stop the set. We don't push through pain. Skip squats and switch to leg press light.",
    words: 16,
    note: 'SAFETY OVERRIDE - bypasses all policies',
  },

  symmetry_imbalance: {
    scenario: symmetryIssue,
    response: symmetryResponse,
    text: 'Left side is weaker. 42-58 split. Lead with left leg and chase even pressure next set.',
    words: 16,
  },
};

// ============================================================================
// KEY PATTERNS DEMONSTRATED
// ============================================================================

/*

1. SILENCE MANAGEMENT
   - Home screen (no change): SILENT ✓
   - Rest overlay (no change): SILENT ✓
   - Active surfaces: SPEAKS ✓

2. WORD BUDGETS
   - Novice (22 words): "Control the descent. Build the pattern..." (20 words) ✓
   - Intermediate (18 words): "Bar speed is stable..." (12 words) ✓
   - Advanced (14 words): "Hold weight. Near target..." (8 words) ✓

3. STRUCTURE (HOOK + WHY + ACTION)
   - HOOK: "Bar speed is fast." (observation)
   - WHY: "You have room." (reasoning)
   - ACTION: "Add 5 pounds next set." (directive)

4. TOPIC RESTRICTIONS
   - Home: Only plan/readiness_budget ✓
   - Warmup: Only tempo/depth/stance/symmetry ✓
   - Working set: load/reps/tempo/depth/symmetry ✓
   - Top set: load/reps/depth/tempo/readiness_budget ✓

5. OBJECTIVES
   - decide_next_block (home): "Start squats and finish near 50"
   - execute_reps (working): "Hit 5 reps then stop"
   - push_or_hold (top): "Add 5 pounds next set"
   - fix_single_fault (depth): "Drop 10 pounds and add 2-second pause"
   - protect_budget (rest): "One more hard set, then backoff"

6. SAFETY
   - Pain flag: Immediate override, no LLM call
   - Always safe, actionable advice
   - No generic wellness tips

*/
