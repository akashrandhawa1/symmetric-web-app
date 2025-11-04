export type Topic =
  | "name"                                                  // rapport
  // OPTIMIZED TOPICS (7 core questions)
  | "primary_goal"                                          // Combines: goal_intent + goal_detail + motivation
  | "training_context"                                      // Combines: experience + baseline_strength + form_confidence
  | "limitations"                                           // Combines: past_injuries + mobility + soreness + constraints
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
  | "goal_detail" | "age_range" | "height_cm" | "weight_kg"
  | "program_style" | "mobility_limitations" | "soreness_pain"
  | "sensor_today" | "sport_position" | "occupation_type" | "daily_activity";

export type Coverage = Partial<Record<Topic, boolean>>;

export function coverageScore(cov: Coverage) {
  const w: Partial<Record<Topic, number>> = {
    // Critical (must-have for any plan)
    name: 3,
    goal_intent: 3,
    experience_level: 3,
    constraints: 3,
    environment: 3,
    frequency: 3,
    session_length: 3,

    // High-value (significantly improves plan quality)
    motivation: 2,
    timeline: 2,
    baseline_strength: 2,
    equipment: 2,

    // Medium-value (adds personalization)
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
    age_range: 1,
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

export const COVERAGE_TARGET = 21; // 7 critical × 3 = 21 points

// Minimal operational fields for preview
export function hasOperationalMinimum(a: Record<string, any>) {
  return (
    !!a.name &&
    !!a.goal_intent &&
    !!a.experience_level &&
    !!a.constraints &&
    !!a.environment &&
    !!a.frequency &&
    !!a.session_length
  );
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
