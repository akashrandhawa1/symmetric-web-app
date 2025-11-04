export type Topic =
  | "name"                                                  // rapport
  // OPTIMIZED TOPICS (10-12 core questions)
  | "primary_goal"                                          // Combines: goal_intent + goal_detail + motivation
  | "body_composition"                                      // NEW: Gain, lose, maintain, or not a priority
  | "training_context"                                      // Combines: experience + baseline_strength + form_confidence
  | "baseline_fitness"                                      // NEW: Can you do basic movements? (push-ups, plank, squat, jog)
  | "age_range"                                             // NEW: Age for recovery capacity planning
  | "limitations"                                           // Combines: past_injuries + mobility + soreness + constraints
  | "activity_recovery"                                     // NEW: Daily activity level + sleep + stress
  | "sport_context"                                         // CONDITIONAL: Only if sport mentioned in primary_goal
  | "equipment_session"                                     // Combines: equipment + session_length + environment
  | "frequency_commitment"                                  // Combines: frequency + timeline
  // LEGACY TOPICS (backward compatibility)
  | "goal_intent" | "motivation"                            // goal + why
  | "timeline"                                              // deadline/event
  | "sport_role" | "performance_focus"                      // sport/activity context
  | "constraints" | "past_injuries"                         // safety
  | "baseline_strength" | "baseline_conditioning"           // current ability
  | "experience_level" | "form_confidence"                  // experience
  | "environment" | "equipment"                             // environment (combined)
  | "frequency" | "session_length"                          // schedule
  | "sleep_stress" | "soreness_pattern"                     // recovery
  | "preferences" | "coach_vibe"                            // preferences
  | "goal_detail" | "height_cm" | "weight_kg"
  | "program_style" | "mobility_limitations" | "soreness_pain"
  | "sensor_today" | "sport_position" | "occupation_type" | "daily_activity";

export type Coverage = Partial<Record<Topic, boolean>>;

export function coverageScore(cov: Coverage) {
  const w: Partial<Record<Topic, number>> = {
    // Critical (must-have for any plan)
    name: 3,
    primary_goal: 3,
    training_context: 3,
    equipment_session: 3,
    frequency_commitment: 3,

    // High-value (NEW - significantly improves plan quality)
    body_composition: 2,
    baseline_fitness: 2,
    age_range: 2,
    activity_recovery: 2,
    limitations: 2,

    // LEGACY Critical (backward compatibility)
    goal_intent: 3,
    experience_level: 3,
    constraints: 3,
    environment: 3,
    frequency: 3,
    session_length: 3,

    // LEGACY High-value
    motivation: 2,
    timeline: 2,
    baseline_strength: 2,
    equipment: 2,

    // Medium-value (adds personalization)
    sport_context: 1,
    sport_role: 1,
    performance_focus: 1,
    form_confidence: 1,
    sleep_stress: 1,
    soreness_pattern: 1,
    preferences: 1,
    coach_vibe: 1,

    // Optional (nice-to-have)
    past_injuries: 1,
    baseline_conditioning: 1,

    // Legacy (backward compatibility)
    goal_detail: 1,
    height_cm: 1,
    weight_kg: 1,
    program_style: 1,
    mobility_limitations: 1,
    soreness_pain: 1,
    sensor_today: 1,
    sport_position: 1,
    occupation_type: 1,
    daily_activity: 1,
  };
  return (Object.keys(w) as Topic[]).reduce((sum, key) => sum + ((cov[key] && w[key]) ? w[key]! : 0), 0);
}

export const COVERAGE_TARGET = 23; // 5 critical × 3 (15) + 4 high-value × 2 (8) = 23 points

// Minimal operational fields for preview (supports both new and legacy formats)
export function hasOperationalMinimum(a: Record<string, any>) {
  // NEW OPTIMIZED FORMAT
  const hasNewFormat = (
    !!a.name &&
    !!a.primary_goal &&
    !!a.training_context &&
    !!a.equipment_session &&
    !!a.frequency_commitment
  );

  // LEGACY FORMAT
  const hasLegacyFormat = (
    !!a.name &&
    !!a.goal_intent &&
    !!a.experience_level &&
    !!a.constraints &&
    !!a.environment &&
    !!a.frequency &&
    !!a.session_length
  );

  return hasNewFormat || hasLegacyFormat;
}

// ENHANCED Ordered phases for FIRST-TIME setup (coach-led conversation)
// Optimized for maximum plan quality with minimum questions
export const FIRST_TIME_PHASES: string[] = [
  "rapport",                 // name
  "goal_why",                // goal_intent, motivation (why it matters)
  "timeline",                // timeline (event/deadline)
  "sport_context",           // sport_role, performance_focus (if applicable)
  "safety",                  // constraints, past_injuries
  "baseline_ability",        // baseline_strength, baseline_conditioning
  "experience",              // experience_level, form_confidence
  "environment",             // environment + equipment (combined question)
  "schedule",                // frequency, session_length
  "recovery",                // sleep_stress, soreness_pattern
  "preferences",             // preferences, coach_vibe
  "wrap_summary",            // concise recap → done
];
