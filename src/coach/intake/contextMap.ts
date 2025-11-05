export type Topic =
  | "name"                                                  // rapport
  // OPTIMIZED TOPICS (10-15 core + optional questions)
  | "primary_goal"                                          // Combines: goal_intent + goal_detail + motivation
  | "specific_target"                                       // PHASE 2: Specific measurable goal (e.g., "squat 315lbs", "first pull-up")
  | "body_composition"                                      // PHASE 1: Gain, lose, maintain, or not a priority
  | "training_context"                                      // Combines: experience + baseline_strength + form_confidence
  | "baseline_fitness"                                      // PHASE 1: Can you do basic movements? (push-ups, plank, squat, jog)
  | "age_range"                                             // PHASE 1: Age for recovery capacity planning
  | "limitations"                                           // Combines: past_injuries + mobility + soreness + constraints
  | "activity_recovery"                                     // PHASE 1: Daily activity level + sleep + stress
  | "sport_context"                                         // CONDITIONAL: Only if sport mentioned in primary_goal
  | "training_time"                                         // PHASE 2: When do you train? (morning/midday/evening/varies)
  | "exercise_preferences"                                  // PHASE 2: Loves/hates certain movements
  | "equipment_session"                                     // Combines: equipment + session_length + environment
  | "frequency_commitment"                                  // Combines: frequency + timeline
  | "body_metrics"                                          // height, weight, age
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
    body_metrics: 3,

    // High-value (phase-driven context)
    body_composition: 2,
    baseline_fitness: 2,
    age_range: 2,
    activity_recovery: 2,
    limitations: 2,
    goal_intent: 2,
    experience_level: 2,
    constraints: 2,
    environment: 2,
    frequency: 2,
    session_length: 2,

    // Medium-value / personalization
    motivation: 1,
    timeline: 1,
    baseline_strength: 1,
    baseline_conditioning: 1,
    equipment: 1,
    specific_target: 1,
    training_time: 1,
    exercise_preferences: 1,
    sport_context: 1,
    sport_role: 1,
    performance_focus: 1,
    form_confidence: 1,
    sleep_stress: 1,
    soreness_pattern: 1,
    preferences: 1,
    coach_vibe: 1,
    past_injuries: 1,
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

export const COVERAGE_TARGET = 24; // Ensures all core slots plus key context signals

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
    !!(a.primary_goal ?? a.goal_intent) &&
    !!(a.training_context ?? a.experience_level) &&
    !!(a.equipment_session || a.equipment) &&
    !!(a.frequency_commitment || a.frequency) &&
    !!a.body_metrics
  );

  return hasNewFormat || hasLegacyFormat;
}
