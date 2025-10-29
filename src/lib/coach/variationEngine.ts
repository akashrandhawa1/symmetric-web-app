/**
 * Variation Engine for Dynamic, Non-Repetitive Coaching Feedback
 *
 * Provides varied scientific explanations, personalized context-aware messaging,
 * and dynamic response pools to keep coaching fresh across multiple sets.
 *
 * @module lib/coach/variationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type ScientificAngle =
  | 'mechanical_tension'
  | 'motor_unit_recruitment'
  | 'metabolic_fatigue'
  | 'neural_adaptation'
  | 'recovery_efficiency'
  | 'muscle_damage'
  | 'myofibrillar_synthesis'
  | 'force_production'
  | 'form_quality';

export type ContextualPhrase = {
  text: string;
  scientific_angle: ScientificAngle;
  tone: 'encouraging' | 'neutral' | 'cautionary' | 'celebratory';
};

export type FeedbackContext = {
  set_number: number;
  previous_set_reps?: number;
  previous_set_feedback?: 'perfect' | 'too_light' | 'too_heavy' | 'slightly_over';
  total_sets_today?: number;
  user_training_age: 'beginner' | 'intermediate' | 'advanced';
  recent_trend?: 'improving' | 'consistent' | 'declining';
};

export type VariationState = {
  last_used_angles: ScientificAngle[];
  last_used_phrases: string[];
  feedback_history: FeedbackContext[];
  session_cue_count: number;
};

// ============================================================================
// SCIENTIFIC ANGLE ROTATION
// ============================================================================

/**
 * Pool of scientific explanations for why 3-6 reps is optimal for strength.
 * Each angle emphasizes a different aspect of exercise science.
 */
export const SCIENTIFIC_EXPLANATIONS: Record<ScientificAngle, string[]> = {
  mechanical_tension: [
    "Heavy loads in this range create maximum mechanical tension on muscle fibers—the primary driver of strength.",
    "This rep range maximizes tension-time under load, triggering mTOR pathways that signal strength adaptations.",
    "Mechanical tension is highest when you're lifting heavy for 3-6 reps—that's pure strength stimulus.",
  ],
  motor_unit_recruitment: [
    "You're recruiting high-threshold motor units (type IIx fibers) that have the most growth potential.",
    "This rep range forces your nervous system to activate the biggest, strongest muscle fibers.",
    "Heavy loads for 3-6 reps recruit motor units that lighter loads can't reach—that's where strength lives.",
  ],
  metabolic_fatigue: [
    "Short sets avoid excessive lactate buildup, keeping fatigue low and strength quality high.",
    "You're minimizing metabolic stress here, which means faster recovery between sets.",
    "Low reps = low metabolic byproducts = you can repeat this quality across more sets.",
  ],
  neural_adaptation: [
    "Your nervous system is learning to fire muscle fibers more efficiently—that's neural strength.",
    "This teaches your brain to produce maximum force on demand, which translates to real-world power.",
    "Heavy, low-rep work builds neural pathways for explosive strength, not just bigger muscles.",
  ],
  recovery_efficiency: [
    "Stopping at 6 reps leaves gas in the tank, so you recover faster for tomorrow's session.",
    "This rep range hits the sweet spot: enough stimulus to grow, not so much that recovery suffers.",
    "You're building strength without trashing your recovery system—sustainable gains.",
  ],
  muscle_damage: [
    "Low reps mean less eccentric damage per set, so you can train more frequently without soreness.",
    "Keeping reps under 6 minimizes muscle damage while still triggering adaptation.",
    "Less volume = less breakdown = faster recovery = more training days per week.",
  ],
  myofibrillar_synthesis: [
    "This rep range optimizes myofibrillar protein synthesis—the foundation of dense, strong muscle.",
    "Heavy loads trigger myofibrillar growth (contractile proteins), not just sarcoplasmic fluff.",
    "You're building the contractile machinery that actually produces force.",
  ],
  force_production: [
    "Every rep here is a high-force event, training your muscles to produce maximum power.",
    "This teaches your body to generate peak force quickly—essential for strength and explosiveness.",
    "Heavy reps = high force output = nervous system learns to produce power efficiently.",
  ],
  form_quality: [
    "Stopping early preserves perfect form—sloppy reps build bad patterns and increase injury risk.",
    "Quality trumps quantity. Clean reps in this range build strength safely.",
    "Perfect form for 5 reps beats ugly form for 10. Protect the movement pattern.",
  ],
};

/**
 * Selects a scientific angle that hasn't been used recently.
 * Uses round-robin rotation to ensure variety.
 */
export function selectScientificAngle(
  state: VariationState,
  preferredAngles?: ScientificAngle[]
): { angle: ScientificAngle; explanation: string } {
  const allAngles = Object.keys(SCIENTIFIC_EXPLANATIONS) as ScientificAngle[];
  const availableAngles = preferredAngles || allAngles;

  // Filter out recently used angles (last 3)
  const recentAngles = state.last_used_angles.slice(-3);
  const freshAngles = availableAngles.filter(angle => !recentAngles.includes(angle));

  // If all angles used recently, reset and use any
  const candidateAngles = freshAngles.length > 0 ? freshAngles : availableAngles;

  // Pick random from candidates
  const selectedAngle = candidateAngles[Math.floor(Math.random() * candidateAngles.length)];
  const explanations = SCIENTIFIC_EXPLANATIONS[selectedAngle];
  const explanation = explanations[Math.floor(Math.random() * explanations.length)];

  return { angle: selectedAngle, explanation };
}

// ============================================================================
// CONTEXTUAL PHRASE GENERATION
// ============================================================================

/**
 * Generates context-aware feedback that references previous set performance.
 */
export function generateContextualPhrase(
  currentReps: number,
  context: FeedbackContext
): ContextualPhrase | null {
  // No context on first set
  if (context.set_number === 1 || !context.previous_set_reps) {
    return null;
  }

  const prevReps = context.previous_set_reps;
  const prevFeedback = context.previous_set_feedback;

  // User improved from last set
  if (prevFeedback === 'too_light' && currentReps >= 3 && currentReps <= 6) {
    return {
      text: `Great adjustment from your last set—this is the ideal intensity now.`,
      scientific_angle: 'motor_unit_recruitment',
      tone: 'celebratory',
    };
  }

  // User corrected from going too heavy
  if (prevFeedback === 'too_heavy' && currentReps >= 3 && currentReps <= 6) {
    return {
      text: `Perfect correction! This load is dialed in for strength.`,
      scientific_angle: 'mechanical_tension',
      tone: 'celebratory',
    };
  }

  // User overcorrected (was too light, now too heavy)
  if (prevFeedback === 'too_light' && currentReps > 8) {
    return {
      text: `You swung too far the other direction—let's find the middle ground.`,
      scientific_angle: 'metabolic_fatigue',
      tone: 'cautionary',
    };
  }

  // User maintaining consistency (goldilocks zone multiple sets in a row)
  if (prevFeedback === 'perfect' && currentReps >= 3 && currentReps <= 6) {
    const consistencyPhrases = [
      `You're really dialing it in—keep this up and strength gains are inevitable.`,
      `Consistency like this is how you build a foundation. Nice work.`,
      `Two solid sets in a row—this is what sustainable progress looks like.`,
    ];
    return {
      text: consistencyPhrases[Math.floor(Math.random() * consistencyPhrases.length)],
      scientific_angle: 'neural_adaptation',
      tone: 'encouraging',
    };
  }

  // User struggling to hit range (second set too low)
  if (prevReps && prevReps < 3 && currentReps < 3) {
    return {
      text: `Two sets under the strength zone—consider dropping weight to hit 4-5 quality reps.`,
      scientific_angle: 'force_production',
      tone: 'cautionary',
    };
  }

  // User going too high consistently
  if (prevReps && prevReps > 8 && currentReps > 8) {
    return {
      text: `This is the second set beyond ideal range—let's prioritize quality over quantity next time.`,
      scientific_angle: 'recovery_efficiency',
      tone: 'cautionary',
    };
  }

  return null;
}

// ============================================================================
// VARIED RESPONSE POOLS
// ============================================================================

/**
 * Large pools of varied phrases for different scenarios.
 * Each pool contains 8-12+ variations to minimize repetition.
 */
export const PERFECT_RANGE_RESPONSES = [
  "Great set! You hit {reps} reps right in the productive zone for strength.",
  "Excellent execution—{reps} reps is exactly where we want you.",
  "Perfect! {reps} quality reps in the strength zone.",
  "Solid work—{reps} reps is the sweet spot for building max strength.",
  "You nailed it. {reps} reps with heavy load = optimal strength stimulus.",
  "That's what we're looking for—{reps} reps of quality work.",
  "Beautiful set. {reps} reps in the goldilocks zone builds real strength.",
  "Textbook strength training—{reps} reps at this intensity is perfect.",
  "{reps} reps? That's the money range. Keep this up.",
  "Strong set. {reps} reps means you're hitting the right intensity.",
  "Exactly right—{reps} reps with good form is where gains happen.",
  "You're locked in. {reps} reps is precisely the target for strength work.",
];

export const TOO_FEW_REPS_RESPONSES = [
  "Only {reps} reps—you've got more in the tank.",
  "Set ended early at {reps} reps. Strength gains come from 3+ quality reps.",
  "Just {reps} reps? That's too light for strength building.",
  "{reps} reps won't cut it for strength—we need at least 3-4 to hit motor unit recruitment.",
  "Stopping at {reps} reps leaves gains on the table. Add weight or push for more next time.",
  "{reps} reps is neural practice but not enough to build strength. Aim higher.",
  "You only got {reps}—this weight might be too heavy, or you stopped too soon.",
  "Under {reps} reps? We need 3-6 to get into the strength zone.",
];

export const SLIGHTLY_OVER_RESPONSES = [
  "Good effort—{reps} reps total. You went slightly past the ideal 3-6 range.",
  "{reps} reps completed. You drifted into fatigue territory after the sweet spot.",
  "{reps} reps is solid work, but you started accumulating fatigue past rep 6.",
  "You got {reps}, but the last few reps were likely diminishing returns.",
  "{reps} reps means you crossed into metabolic stress territory—not ideal for pure strength.",
  "Strong effort at {reps} reps, but reps 7-8 don't add much strength stimulus.",
  "{reps} total reps—everything after rep 6 was extra fatigue without extra gains.",
];

export const WAY_OVER_RESPONSES = [
  "You pushed to {reps} reps—that's endurance work, not strength.",
  "{reps} reps is impressive endurance, but we're building max strength, not stamina.",
  "Solid effort, but {reps} reps is too many for optimal strength work.",
  "You went a bit overboard with {reps} reps. That's fatigue accumulation, not strength building.",
  "{reps} total reps—that's outside the strength-building window.",
  "{reps} reps means you spent more time in fatigue than in productive strength stimulus.",
  "You got {reps}, but everything past rep 8 was just grinding through fatigue.",
  "High volume at {reps} reps, but strength work is about intensity, not quantity.",
];

export const NEXT_SET_GUIDANCE_POOL: Record<string, string[]> = {
  perfect_repeat: [
    "Same weight next set—consistency here builds a solid base.",
    "Keep this weight. You're teaching your nervous system to own this load.",
    "Repeat this next set. Your body adapts best to consistent stimulus.",
    "Stay at this weight—you're in the sweet spot.",
    "Don't change anything. This load is working perfectly.",
    "Lock this in. Same weight, same rep target next time.",
  ],
  too_light_add_weight: [
    "Push for at least 3-6 reps next set to hit the strength zone. Consider adding weight if this felt too easy.",
    "Next set: aim for 4-5 reps. If you can't hit 3, the weight might be too heavy.",
    "Add 5-10% more weight next set and aim for 4-5 quality reps.",
    "Bump the weight up—you need more resistance to recruit the big motor units.",
    "This was too easy. Add weight next set and target 4-6 reps.",
  ],
  too_heavy_reduce: [
    "Next set: stop around rep 5-6. You'll build the same strength with less fatigue.",
    "Dial it back next time—stopping at rep 6 preserves quality and recovery.",
    "Cut reps, not weight. Aim for 4-5 quality reps next time.",
    "Let's tighten this up—stop at rep 6 max next set.",
    "Rein it in. Target 5-6 reps and call it there.",
    "End around rep 6 next time. If that's too easy, add weight instead of reps.",
  ],
};

/**
 * Selects a varied response from the pool, avoiding recently used phrases.
 */
export function selectVariedResponse(
  pool: string[],
  state: VariationState,
  replacements?: Record<string, string | number>
): string {
  // Filter out recently used phrases (last 5)
  const recentPhrases = state.last_used_phrases.slice(-5);
  const freshPhrases = pool.filter(phrase => !recentPhrases.includes(phrase));

  // If all used recently, reset
  const candidates = freshPhrases.length > 0 ? freshPhrases : pool;

  // Pick random
  let selected = candidates[Math.floor(Math.random() * candidates.length)];

  // Apply replacements (e.g., {reps} -> 5)
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      selected = selected.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    });
  }

  return selected;
}

// ============================================================================
// PERSONALIZATION HOOKS
// ============================================================================

/**
 * Generates personalized encouragement based on user progress and training age.
 */
export function generatePersonalizedEncouragement(context: FeedbackContext): string | null {
  // Beginner on their 3rd+ set of good work
  if (
    context.user_training_age === 'beginner' &&
    context.set_number >= 3 &&
    context.recent_trend === 'consistent'
  ) {
    return "You're really getting the hang of this—keep building that foundation!";
  }

  // Intermediate/advanced showing improvement
  if (
    (context.user_training_age === 'intermediate' || context.user_training_age === 'advanced') &&
    context.recent_trend === 'improving'
  ) {
    return "Your technique is tightening up—this progress is going to compound fast.";
  }

  // Anyone showing consistency over multiple sets
  if (context.total_sets_today && context.total_sets_today >= 4 && context.recent_trend === 'consistent') {
    return "This kind of consistency is what separates people who get strong from people who spin their wheels.";
  }

  // Advanced user maintaining quality late in session
  if (
    context.user_training_age === 'advanced' &&
    context.total_sets_today &&
    context.total_sets_today >= 5
  ) {
    return "Quality this deep into the session? That's pro-level work.";
  }

  return null;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Creates a new variation state for tracking usage.
 */
export function createVariationState(): VariationState {
  return {
    last_used_angles: [],
    last_used_phrases: [],
    feedback_history: [],
    session_cue_count: 0,
  };
}

/**
 * Updates variation state after generating feedback.
 */
export function updateVariationState(
  state: VariationState,
  usedAngle: ScientificAngle,
  usedPhrase: string,
  context: FeedbackContext
): VariationState {
  return {
    last_used_angles: [...state.last_used_angles, usedAngle].slice(-5),
    last_used_phrases: [...state.last_used_phrases, usedPhrase].slice(-8),
    feedback_history: [...state.feedback_history, context].slice(-10),
    session_cue_count: state.session_cue_count + 1,
  };
}
