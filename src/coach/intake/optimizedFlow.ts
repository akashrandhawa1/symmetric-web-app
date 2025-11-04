/**
 * Optimized Milo Intake Flow
 *
 * Reduced from 30 topics to 5-7 questions with smart branching
 * Focus: Get 80% of value with 20% of questions
 */

export type OptimizedTopic =
  | "name"
  | "primary_goal"
  | "training_context"
  | "limitations"
  | "sport_context"
  | "equipment_session"
  | "frequency_commitment";

export type GoalType =
  | "build_max_strength"
  | "add_muscle_size"
  | "get_faster"
  | "train_for_sport"
  | "recover_injury"
  | "general_fitness"
  | "custom";

export type ExperienceLevel =
  | "new"          // 0-6 months
  | "intermediate" // 6mo-2yrs
  | "advanced"     // 2-5 years
  | "expert";      // 5+ years

export interface OptimizedAnswers {
  name: string;

  primary_goal: {
    type: GoalType;
    custom_text?: string;
  };

  training_context: {
    experience: ExperienceLevel;
  };

  limitations?: {
    tags: string[];
    details?: string;
  };

  sport_context?: {
    sport: string;
    role?: string;
    focus?: string;
  };

  equipment_session: {
    equipment: string[];
    minutes: number;
  };

  frequency_commitment: {
    days_per_week: number;
    weeks: number;
  };
}

/**
 * Core topics that everyone gets asked
 */
export const CORE_TOPICS: OptimizedTopic[] = [
  "name",
  "primary_goal",
  "training_context",
  "equipment_session",
  "frequency_commitment",
];

/**
 * Conditional topics based on answers
 */
export function getConditionalTopics(answers: Partial<OptimizedAnswers>): OptimizedTopic[] {
  const topics: OptimizedTopic[] = [];

  // Ask about sport context only if goal is sport-related
  if (answers.primary_goal?.type === "train_for_sport") {
    topics.push("sport_context");
  }

  // Ask about limitations only if goal is injury recovery OR user is new
  if (
    answers.primary_goal?.type === "recover_injury" ||
    answers.training_context?.experience === "new"
  ) {
    topics.push("limitations");
  }

  return topics;
}

/**
 * Get full topic sequence based on current answers
 */
export function getTopicSequence(answers: Partial<OptimizedAnswers>): OptimizedTopic[] {
  const sequence: OptimizedTopic[] = [...CORE_TOPICS];
  const conditionals = getConditionalTopics(answers);

  // Insert conditionals after training_context
  const insertIndex = sequence.indexOf("training_context") + 1;
  sequence.splice(insertIndex, 0, ...conditionals);

  return sequence;
}

/**
 * Goal options with icons and descriptions
 */
export const GOAL_OPTIONS = [
  {
    type: "build_max_strength" as GoalType,
    icon: "💪",
    label: "Build max strength",
    description: "Get as strong as possible",
  },
  {
    type: "add_muscle_size" as GoalType,
    icon: "🏋️",
    label: "Add muscle size",
    description: "Hypertrophy focus",
  },
  {
    type: "get_faster" as GoalType,
    icon: "⚡",
    label: "Get faster/explosive",
    description: "Power and speed",
  },
  {
    type: "train_for_sport" as GoalType,
    icon: "🏃",
    label: "Train for a sport",
    description: "Sport-specific performance",
  },
  {
    type: "recover_injury" as GoalType,
    icon: "🔄",
    label: "Recover from injury",
    description: "Rehab and rebuild",
  },
  {
    type: "general_fitness" as GoalType,
    icon: "🎯",
    label: "General fitness",
    description: "Overall health and strength",
  },
];

/**
 * Experience level options
 */
export const EXPERIENCE_OPTIONS = [
  {
    level: "new" as ExperienceLevel,
    icon: "🌱",
    label: "New to this",
    detail: "0-6 months",
    description: "Learning the basics",
  },
  {
    level: "intermediate" as ExperienceLevel,
    icon: "💪",
    label: "Some experience",
    detail: "6 months - 2 years",
    description: "Comfortable with basics",
  },
  {
    level: "advanced" as ExperienceLevel,
    icon: "🏋️",
    label: "Solid lifter",
    detail: "2-5 years",
    description: "Strong foundation",
  },
  {
    level: "expert" as ExperienceLevel,
    icon: "🏆",
    label: "Very experienced",
    detail: "5+ years",
    description: "Advanced techniques",
  },
];

/**
 * Equipment options with icons
 */
export const EQUIPMENT_OPTIONS = [
  { id: "barbell", icon: "🏋️", label: "Barbell + plates" },
  { id: "dumbbells", icon: "💪", label: "Dumbbells" },
  { id: "bands", icon: "🔗", label: "Resistance bands" },
  { id: "rack", icon: "📦", label: "Squat rack" },
  { id: "leg_press", icon: "🦵", label: "Leg press machine" },
  { id: "cable", icon: "🔌", label: "Cable machine" },
  { id: "bodyweight", icon: "🧍", label: "Bodyweight only" },
];

/**
 * Common limitation tags
 */
export const COMMON_LIMITATIONS = [
  "knee_pain_left",
  "knee_pain_right",
  "knee_pain_both",
  "back_pain_lower",
  "back_pain_upper",
  "ankle_mobility",
  "hip_mobility",
  "hip_impingement",
  "past_acl",
  "past_meniscus",
  "tendinitis",
];

/**
 * Limitation display names
 */
export const LIMITATION_LABELS: Record<string, string> = {
  knee_pain_left: "Knee pain (left)",
  knee_pain_right: "Knee pain (right)",
  knee_pain_both: "Knee pain (both)",
  back_pain_lower: "Lower back pain",
  back_pain_upper: "Upper back pain",
  ankle_mobility: "Limited ankle mobility",
  hip_mobility: "Limited hip mobility",
  hip_impingement: "Hip impingement",
  past_acl: "Past ACL injury",
  past_meniscus: "Past meniscus injury",
  tendinitis: "Tendinitis",
};

/**
 * Check if intake has minimum required information
 */
export function hasMinimumInfo(answers: Partial<OptimizedAnswers>): boolean {
  return !!(
    answers.name &&
    answers.primary_goal &&
    answers.training_context &&
    answers.equipment_session &&
    answers.frequency_commitment
  );
}

/**
 * Validate answers completeness
 */
export function validateAnswers(answers: Partial<OptimizedAnswers>): {
  isValid: boolean;
  missing: OptimizedTopic[];
} {
  const sequence = getTopicSequence(answers);
  const missing: OptimizedTopic[] = [];

  for (const topic of sequence) {
    if (!answers[topic]) {
      missing.push(topic);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
}
