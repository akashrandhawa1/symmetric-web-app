/**
 * Live Coaching System for Real-Time Strength Training Guidance
 *
 * Provides rep-by-rep feedback during sets with focus on 3-6 rep range
 * for optimal strength building.
 *
 * NOW WITH DYNAMIC VARIATION ENGINE:
 * - Rotates scientific explanations to avoid repetition
 * - Context-aware feedback referencing previous sets
 * - Personalized encouragement based on progress
 * - Large response pools for varied messaging
 *
 * Key Zones:
 * - Reps 0-2: Warm-up into the set
 * - Reps 3-6: Goldilocks zone (productive strength gains)
 * - Reps 7-8: Approaching unproductive fatigue
 * - Reps 8+: Unproductive fatigue territory
 *
 * @module lib/coach/liveCoaching
 */

import {
  type FeedbackContext,
  type VariationState,
  createVariationState,
  updateVariationState,
  selectScientificAngle,
  generateContextualPhrase,
  selectVariedResponse,
  generatePersonalizedEncouragement,
  PERFECT_RANGE_RESPONSES,
  TOO_FEW_REPS_RESPONSES,
  SLIGHTLY_OVER_RESPONSES,
  WAY_OVER_RESPONSES,
  NEXT_SET_GUIDANCE_POOL,
} from './variationEngine';

// ============================================================================
// TYPES
// ============================================================================

export type RepZone = 'warmup' | 'goldilocks' | 'approaching_limit' | 'unproductive';

export type LiveCue = {
  zone: RepZone;
  message: string;
  tone: 'encouraging' | 'neutral' | 'warning';
  scientific_tip?: string;
  contextual_note?: string; // New: references previous set
};

export type SetSummary = {
  total_reps: number;
  zone_achieved: RepZone;
  productive_reps: number; // Reps in 3-6 range
  feedback: string;
  next_set_guidance: string;
  scientific_insight?: string;
  contextual_feedback?: string; // New: compares to previous set
  personalized_note?: string; // New: progress-based encouragement
};

export type LiveCoachingContext = {
  current_rep: number;
  target_rep_range: [number, number]; // e.g., [3, 6]
  exercise_name: string;
  set_number: number;
  user_training_age: 'beginner' | 'intermediate' | 'advanced';
  previous_set_reps?: number; // New: for context-aware feedback
  previous_set_feedback?: 'perfect' | 'too_light' | 'too_heavy' | 'slightly_over'; // New
  total_sets_today?: number; // New
  recent_trend?: 'improving' | 'consistent' | 'declining'; // New
};

// ============================================================================
// REP ZONE DETECTION
// ============================================================================

/**
 * Determines which zone the current rep falls into.
 */
export function getRepZone(currentRep: number): RepZone {
  if (currentRep <= 2) return 'warmup';
  if (currentRep >= 3 && currentRep <= 6) return 'goldilocks';
  if (currentRep === 7 || currentRep === 8) return 'approaching_limit';
  return 'unproductive';
}

/**
 * Checks if a rep count is in the productive range.
 */
export function isProductiveRange(reps: number): boolean {
  return reps >= 3 && reps <= 6;
}

// ============================================================================
// LIVE CUE GENERATION
// ============================================================================

/**
 * Generates varied, real-time cues based on current rep and zone.
 * Returns different messages to avoid repetition across sets.
 */
export function getLiveCue(context: LiveCoachingContext, variationIndex: number = 0): LiveCue {
  const zone = getRepZone(context.current_rep);
  const rep = context.current_rep;

  const cueVariations: Record<RepZone, LiveCue[]> = {
    warmup: [
      {
        zone: 'warmup',
        message: "You're building up—let's keep going.",
        tone: 'encouraging',
      },
      {
        zone: 'warmup',
        message: 'Warming up nicely. Stay controlled.',
        tone: 'neutral',
      },
      {
        zone: 'warmup',
        message: 'Good start. Building momentum.',
        tone: 'encouraging',
      },
    ],
    goldilocks: [
      {
        zone: 'goldilocks',
        message: 'Nice! You're right in the strength zone.',
        tone: 'encouraging',
        scientific_tip: 'This 3-6 rep range recruits high-threshold motor units for max strength gains.',
      },
      {
        zone: 'goldilocks',
        message: 'Perfect range—this is where strength happens.',
        tone: 'encouraging',
      },
      {
        zone: 'goldilocks',
        message: `Rep ${rep}—right in the sweet spot for gains.`,
        tone: 'encouraging',
      },
      {
        zone: 'goldilocks',
        message: 'Goldilocks zone activated. Keep this quality.',
        tone: 'encouraging',
      },
    ],
    approaching_limit: [
      {
        zone: 'approaching_limit',
        message: 'Heads up—approaching the fatigue threshold.',
        tone: 'warning',
      },
      {
        zone: 'approaching_limit',
        message: `Rep ${rep}—you're getting close to unproductive range.`,
        tone: 'warning',
      },
      {
        zone: 'approaching_limit',
        message: 'Quality over quantity here. Consider stopping soon.',
        tone: 'warning',
      },
    ],
    unproductive: [
      {
        zone: 'unproductive',
        message: 'Heads up, you're going beyond the ideal range now.',
        tone: 'warning',
        scientific_tip: 'Beyond 8 reps at this weight, you're accumulating fatigue faster than strength stimulus.',
      },
      {
        zone: 'unproductive',
        message: `Rep ${rep}—now in fatigue territory. Stop when form breaks.`,
        tone: 'warning',
      },
      {
        zone: 'unproductive',
        message: 'You've moved past the strength zone. Finish this rep and consider stopping.',
        tone: 'warning',
      },
    ],
  };

  const variations = cueVariations[zone];
  const index = variationIndex % variations.length;
  return variations[index];
}

// ============================================================================
// SET SUMMARY GENERATION
// ============================================================================

/**
 * Generates an end-of-set summary with feedback and guidance.
 */
export function generateSetSummary(
  totalReps: number,
  context: Omit<LiveCoachingContext, 'current_rep'>,
  variationIndex: number = 0
): SetSummary {
  const productiveReps = Math.min(Math.max(0, totalReps - 2), 4); // Reps in 3-6 range
  const finalZone = getRepZone(totalReps);

  // Different summaries based on performance
  if (totalReps >= 3 && totalReps <= 6) {
    // Perfect range
    const perfectSummaries = [
      {
        feedback: `Great set! You hit ${totalReps} reps right in the productive zone for strength.`,
        next_set_guidance: "Same weight next set—consistency here builds a solid base.",
        scientific_insight: "Staying in this 3-6 rep range maximizes mechanical tension on muscle fibers while minimizing metabolic fatigue.",
      },
      {
        feedback: `Excellent execution—${totalReps} reps is exactly where we want you.`,
        next_set_guidance: "Keep this weight. You're teaching your nervous system to own this load.",
        scientific_insight: "This rep range optimizes myofibrillar protein synthesis—the foundation of strength gains.",
      },
      {
        feedback: `Perfect! ${totalReps} quality reps in the strength zone.`,
        next_set_guidance: "Repeat this next set. Your body adapts best to consistent stimulus.",
      },
    ];

    const summary = perfectSummaries[variationIndex % perfectSummaries.length];
    return {
      total_reps: totalReps,
      zone_achieved: 'goldilocks',
      productive_reps: totalReps - 2,
      ...summary,
    };
  } else if (totalReps <= 2) {
    // Too few reps
    const lowRepSummaries = [
      {
        feedback: `Only ${totalReps} reps—you've got more in the tank.`,
        next_set_guidance: "Push for at least 3-6 reps next set to hit the strength zone. Consider adding weight if this felt too easy.",
        scientific_insight: "Sub-3 rep sets are great for neural adaptation but need heavier loads to build strength effectively.",
      },
      {
        feedback: `Set ended early at ${totalReps} reps. Strength gains come from 3+ quality reps.`,
        next_set_guidance: "Next set: aim for 4-5 reps. If you can't hit 3, the weight might be too heavy.",
      },
    ];

    const summary = lowRepSummaries[variationIndex % lowRepSummaries.length];
    return {
      total_reps: totalReps,
      zone_achieved: 'warmup',
      productive_reps: 0,
      ...summary,
    };
  } else if (totalReps === 7 || totalReps === 8) {
    // Slightly over
    const overSummaries = [
      {
        feedback: `Good effort—${totalReps} reps total. You went slightly past the ideal 3-6 range.`,
        next_set_guidance: "Next set: stop around rep 5-6. You'll build the same strength with less fatigue.",
        scientific_insight: "Reps 7-8 start tipping the balance toward metabolic stress rather than pure strength stimulus.",
      },
      {
        feedback: `${totalReps} reps completed. You drifted into fatigue territory after the sweet spot.`,
        next_set_guidance: "Dial it back next time—stopping at rep 6 preserves quality and recovery.",
      },
    ];

    const summary = overSummaries[variationIndex % overSummaries.length];
    return {
      total_reps: totalReps,
      zone_achieved: 'approaching_limit',
      productive_reps: 4,
      ...summary,
    };
  } else {
    // Way over (9+ reps)
    const highRepSummaries = [
      {
        feedback: `You went a bit over the ideal range with ${totalReps} reps. That's endurance work, not strength.`,
        next_set_guidance: "Let's dial it back next time—stop around rep 5-6 to keep this in the strength zone.",
        scientific_insight: "Beyond 8 reps, you're accumulating fatigue without additional strength stimulus. More isn't always better.",
      },
      {
        feedback: `${totalReps} total reps—that's outside the strength-building window.`,
        next_set_guidance: "Next set: end around rep 6 max. If that's too easy, add weight instead of reps.",
        scientific_insight: "High-rep sets tax your recovery system more than they build max strength. Save the gas tank.",
      },
      {
        feedback: `Solid effort, but ${totalReps} reps is too many for optimal strength work.`,
        next_set_guidance: "Cut reps, not weight. Aim for 4-5 quality reps next time.",
      },
    ];

    const summary = highRepSummaries[variationIndex % highRepSummaries.length];
    return {
      total_reps: totalReps,
      zone_achieved: 'unproductive',
      productive_reps: 4,
      ...summary,
    };
  }
}

// ============================================================================
// GEMINI API INTEGRATION HELPERS
// ============================================================================

/**
 * System prompt for Gemini API to generate live coaching cues.
 */
export const LIVE_COACHING_SYSTEM_PROMPT = `You are a live strength training coach providing real-time guidance during sets.

CONTEXT:
- Ideal rep range: 3-6 reps for strength building
- Beyond 8 reps: unproductive fatigue territory
- You're watching the user perform reps in real-time

REP ZONES:
- Reps 0-2: Warm-up phase. Encourage building momentum.
- Reps 3-6: GOLDILOCKS ZONE. This is perfect for strength gains. Be enthusiastic!
- Reps 7-8: Approaching limit. Gentle warning about fatigue.
- Reps 8+: Unproductive range. Clear warning to stop soon.

TONE:
- Supportive and varied—don't be repetitive
- Brief cues (5-10 words max per rep)
- Occasionally mention science, but keep it digestible
- Sound like a knowledgeable friend spotting them

EXAMPLES:
- Rep 2: "Building up—let's keep going."
- Rep 4: "Nice! You're in the strength zone."
- Rep 6: "Perfect range—this is where strength happens."
- Rep 8: "Heads up—approaching fatigue threshold."
- Rep 9: "Beyond the ideal range. Quality over quantity."

Generate brief, encouraging, scientifically-informed cues.`;

/**
 * Prompt builder for live rep cues.
 */
export function buildLiveCuePrompt(context: LiveCoachingContext): string {
  return `Current rep: ${context.current_rep}
Exercise: ${context.exercise_name}
Set number: ${context.set_number}
User level: ${context.user_training_age}

Generate a brief, supportive cue for this rep. Keep it under 10 words.`;
}

/**
 * Prompt builder for end-of-set summary.
 */
export function buildSetSummaryPrompt(
  totalReps: number,
  context: Omit<LiveCoachingContext, 'current_rep'>
): string {
  const inRange = totalReps >= 3 && totalReps <= 6;
  const tooFew = totalReps < 3;
  const tooMany = totalReps > 6;

  return `Set completed: ${totalReps} reps
Exercise: ${context.exercise_name}
Set number: ${context.set_number}
Target range: ${context.target_rep_range[0]}-${context.target_rep_range[1]} reps

Performance:
${inRange ? '✓ Hit the productive strength zone (3-6 reps)' : ''}
${tooFew ? '✗ Below productive range (too few reps)' : ''}
${tooMany ? '✗ Beyond productive range (too many reps)' : ''}

Generate:
1. Brief feedback on their performance (20-30 words)
2. Guidance for next set (15-20 words)
3. Optional: One scientific insight if relevant (20 words max)

Be supportive but educational. Help them understand the "why" behind staying in the 3-6 rep range.`;
}

// ============================================================================
// ENHANCED VARIATION-ENGINE POWERED FUNCTIONS
// ============================================================================

// Global variation state (in production, this should be persisted per session)
let globalVariationState: VariationState = createVariationState();

/**
 * Resets the variation state (call at start of new session).
 */
export function resetVariationState(): void {
  globalVariationState = createVariationState();
}

/**
 * Enhanced set summary generation using variation engine.
 * Provides varied scientific angles, context-aware feedback, and personalized notes.
 */
export function generateVariedSetSummary(
  totalReps: number,
  context: Omit<LiveCoachingContext, 'current_rep'>
): SetSummary {
  const productiveReps = Math.min(Math.max(0, totalReps - 2), 4);
  const finalZone = getRepZone(totalReps);

  // Determine feedback type
  let feedbackType: 'perfect' | 'too_light' | 'too_heavy' | 'slightly_over';
  if (totalReps >= 3 && totalReps <= 6) {
    feedbackType = 'perfect';
  } else if (totalReps <= 2) {
    feedbackType = 'too_light';
  } else if (totalReps === 7 || totalReps === 8) {
    feedbackType = 'slightly_over';
  } else {
    feedbackType = 'too_heavy';
  }

  // Build feedback context
  const feedbackContext: FeedbackContext = {
    set_number: context.set_number,
    previous_set_reps: context.previous_set_reps,
    previous_set_feedback: context.previous_set_feedback,
    total_sets_today: context.total_sets_today,
    user_training_age: context.user_training_age,
    recent_trend: context.recent_trend,
  };

  // Select varied response from pool
  let feedbackText: string;
  let guidancePool: string[];
  let guidanceKey: string;

  if (feedbackType === 'perfect') {
    feedbackText = selectVariedResponse(PERFECT_RANGE_RESPONSES, globalVariationState, { reps: totalReps });
    guidancePool = NEXT_SET_GUIDANCE_POOL.perfect_repeat;
    guidanceKey = 'perfect_repeat';
  } else if (feedbackType === 'too_light') {
    feedbackText = selectVariedResponse(TOO_FEW_REPS_RESPONSES, globalVariationState, { reps: totalReps });
    guidancePool = NEXT_SET_GUIDANCE_POOL.too_light_add_weight;
    guidanceKey = 'too_light_add_weight';
  } else if (feedbackType === 'slightly_over') {
    feedbackText = selectVariedResponse(SLIGHTLY_OVER_RESPONSES, globalVariationState, { reps: totalReps });
    guidancePool = NEXT_SET_GUIDANCE_POOL.too_heavy_reduce;
    guidanceKey = 'too_heavy_reduce';
  } else {
    feedbackText = selectVariedResponse(WAY_OVER_RESPONSES, globalVariationState, { reps: totalReps });
    guidancePool = NEXT_SET_GUIDANCE_POOL.too_heavy_reduce;
    guidanceKey = 'too_heavy_reduce';
  }

  const guidanceText = selectVariedResponse(guidancePool, globalVariationState);

  // Select scientific angle (rotate to avoid repetition)
  const { angle, explanation } = selectScientificAngle(globalVariationState);

  // Generate contextual feedback (compares to previous set)
  const contextualPhrase = generateContextualPhrase(totalReps, feedbackContext);

  // Generate personalized encouragement
  const personalizedNote = generatePersonalizedEncouragement(feedbackContext);

  // Update state
  globalVariationState = updateVariationState(
    globalVariationState,
    angle,
    feedbackText,
    feedbackContext
  );

  return {
    total_reps: totalReps,
    zone_achieved: finalZone,
    productive_reps: productiveReps,
    feedback: feedbackText,
    next_set_guidance: guidanceText,
    scientific_insight: explanation,
    contextual_feedback: contextualPhrase?.text,
    personalized_note: personalizedNote || undefined,
  };
}

/**
 * Enhanced Gemini system prompt with variation guidelines.
 */
export const ENHANCED_GEMINI_SYSTEM_PROMPT = `You are a live strength training coach providing real-time guidance during sets.

CONTEXT:
- Ideal rep range: 3-6 reps for strength building
- Beyond 8 reps: unproductive fatigue territory
- You're watching the user perform reps in real-time

REP ZONES:
- Reps 0-2: Warm-up phase. Encourage building momentum.
- Reps 3-6: GOLDILOCKS ZONE. This is perfect for strength gains. Be enthusiastic!
- Reps 7-8: Approaching limit. Gentle warning about fatigue.
- Reps 8+: Unproductive range. Clear warning to stop soon.

VARIATION GUIDELINES (CRITICAL):
1. **Vary Your Language**: Use different phrasings each time. Never repeat the exact same sentence twice.
   - Instead of: "Great job hitting the sweet spot" every time
   - Rotate: "Perfect range!", "You nailed it", "Right in the goldilocks zone", "Exactly where we want you"

2. **Rotate Scientific Angles**: Explain the "why" from different perspectives:
   - Mechanical tension ("heavy loads create maximum tension on muscle fibers")
   - Motor unit recruitment ("recruiting high-threshold type IIx fibers")
   - Metabolic fatigue ("short sets minimize lactate buildup")
   - Neural adaptation ("teaching your nervous system to fire efficiently")
   - Recovery efficiency ("leaving gas in the tank for tomorrow")
   - Form quality ("perfect reps build safe movement patterns")

3. **Context Awareness**: If previous set info is provided, reference it:
   - "Great adjustment from your last set—this is the ideal intensity now."
   - "You're really dialing it in—two solid sets in a row."
   - "You swung too far the other direction—let's find the middle ground."

4. **Personalization**: Add occasional progress-based encouragement:
   - "You're really getting the hang of this—keep building that foundation!"
   - "This kind of consistency is what separates people who get strong from people who spin their wheels."
   - "Quality this deep into the session? That's pro-level work."

TONE:
- Supportive and varied—NEVER repetitive
- Brief cues (5-10 words max per rep)
- Rotate through different scientific explanations
- Sound like a knowledgeable friend who keeps things fresh

EXAMPLES OF VARIED RESPONSES:
Perfect Range (3-6 reps):
- "Great set! You hit 5 reps right in the productive zone for strength."
- "Solid work—5 reps is the sweet spot for building max strength."
- "You nailed it. 5 reps with heavy load = optimal strength stimulus."
- "Beautiful set. 5 reps in the goldilocks zone builds real strength."

Too Many Reps (9+):
- "You pushed to 10 reps—that's endurance work, not strength."
- "Solid effort, but 10 reps is too many for optimal strength work."
- "10 reps means you spent more time in fatigue than in productive strength stimulus."

Scientific Explanations (rotate these):
- "This range maximizes mechanical tension on muscle fibers while minimizing metabolic fatigue."
- "You're recruiting high-threshold motor units that have the most growth potential."
- "Stopping at 6 reps leaves gas in the tank, so you recover faster for tomorrow."
- "This rep range optimizes myofibrillar protein synthesis—the foundation of strength."

Remember: **VARY YOUR LANGUAGE** every single time. No two responses should sound identical.`;

/**
 * Enhanced prompt builder for set summaries with context.
 */
export function buildEnhancedSetSummaryPrompt(
  totalReps: number,
  context: Omit<LiveCoachingContext, 'current_rep'>
): string {
  const inRange = totalReps >= 3 && totalReps <= 6;
  const tooFew = totalReps < 3;
  const tooMany = totalReps > 6;

  let contextNote = '';
  if (context.previous_set_reps && context.previous_set_feedback) {
    const prevReps = context.previous_set_reps;
    const prevFeedback = context.previous_set_feedback;
    contextNote = `
Previous Set Context:
- Previous set: ${prevReps} reps (${prevFeedback})
- Current set: ${totalReps} reps
${prevFeedback === 'too_light' && inRange ? '- User corrected intensity—acknowledge improvement!' : ''}
${prevFeedback === 'perfect' && inRange ? '- User maintaining consistency—celebrate this!' : ''}`;
  }

  let progressNote = '';
  if (context.total_sets_today && context.total_sets_today >= 3) {
    progressNote = `\n- Total sets today: ${context.total_sets_today} (consider acknowledging sustained quality)`;
  }

  return `Set completed: ${totalReps} reps
Exercise: ${context.exercise_name}
Set number: ${context.set_number}
Target range: ${context.target_rep_range[0]}-${context.target_rep_range[1]} reps
User level: ${context.user_training_age}${contextNote}${progressNote}

Performance:
${inRange ? '✓ Hit the productive strength zone (3-6 reps)' : ''}
${tooFew ? '✗ Below productive range (too few reps)' : ''}
${tooMany ? '✗ Beyond productive range (too many reps)' : ''}

Generate (use VARIED language—don't repeat previous responses):
1. Brief feedback on their performance (20-30 words)
2. Guidance for next set (15-20 words)
3. One scientific insight from a DIFFERENT angle than you've used recently (20 words max)
${contextNote ? '4. Brief contextual note acknowledging previous set performance (optional, 10-15 words)' : ''}

Remember: VARY YOUR PHRASING. Use different words and explanations each time.`;
}
