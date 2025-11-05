export type Topic =
  | "name"                                                  // rapport
  // OPTIMIZED TOPICS (7 core questions)
  | "primary_goal"                                          // Combines: goal_intent + goal_detail + motivation
  | "training_context"                                      // Combines: experience + baseline_strength + form_confidence
  | "limitations"                                           // Combines: past_injuries + mobility + soreness + constraints
  | "sport_context"                                         // CONDITIONAL: Only if sport mentioned in primary_goal
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
  | "goal_detail" | "age_range" | "height_cm" | "weight_kg"
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
    limitations: 2,
    sport_context: 2,

    // Legacy / supplementary
    goal_intent: 2,
    experience_level: 2,
    equipment: 1,
    frequency: 1,
    session_length: 1,
    constraints: 1,
    motivation: 1,
    timeline: 1,
    baseline_strength: 1,
    baseline_conditioning: 1,
  };
  return (Object.keys(w) as Topic[]).reduce((sum, key) => sum + ((cov[key] && w[key]) ? w[key]! : 0), 0);
}

export const COVERAGE_TARGET = 18; // 6 critical × 3 = 18 points

// Minimal operational fields for preview
export function hasOperationalMinimum(a: Record<string, any>) {
  return (
    !!a.name &&
    !!(a.primary_goal ?? a.goal_intent) &&
    !!(a.training_context ?? a.experience_level) &&
    !!(a.equipment_session || a.equipment) &&
    !!(a.frequency_commitment || a.frequency) &&
    !!a.body_metrics
  );
}
