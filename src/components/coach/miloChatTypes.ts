export type Vibe = "hype" | "calm" | "expert";

export type GoalIntent = "strength" | "muscle" | "general" | "rehab" | "sport";

export type PrimaryGoalChoice =
  | "strength"
  | "muscle"
  | "sport"
  | "rehab"
  | "general";

export type TrainingContextLevel =
  | "new"
  | "some_experience"
  | "solid_lifter"
  | "very_experienced";

export type EquipmentKind =
  | "barbell"
  | "dumbbells"
  | "machines"
  | "bands"
  | "rack"
  | "bodyweight";

export type LimitationKind = "knees" | "hips" | "low_back" | "shoulders" | "ankles" | "none" | "other";

export type EquipmentSession = {
  equipment: EquipmentKind[];
  session_minutes: number | null;
};

export type FrequencyCommitment = {
  days_per_week: number | null;
  focus_weeks?: number | null;
};

export type Answers = {
  name?: string;
  vibe?: Vibe;
  goal_intent?: GoalIntent;
  primary_goal?: PrimaryGoalChoice | string;
  training_context?: TrainingContextLevel | string;
  limitations?: LimitationKind[];
  sport_context?: string;
  equipment_session?: EquipmentSession;
  frequency_commitment?: FrequencyCommitment;
  body_composition?: string | null;
  baseline_fitness?: string | null;
  age_range?: string | null;
  activity_recovery?: string | null;
  specific_target?: string | null;
  training_time?: string | null;
  exercise_preferences?: string | null;
  user_age?: number | string | null;
  user_height?: string | null;
  user_current_weight?: number | null;
  user_goal_weight?: number | null;
  age?: number | null;
  height_ft?: number | null;
  height_in?: number | null;
  weight_lb?: number | null;
  body_metrics?: {
    age?: number | null;
    height_ft?: number | null;
    height_in?: number | null;
    weight_lb?: number | null;
    goal_weight_lb?: number | null;
  };

  // Legacy fields kept for compatibility with downstream logic
  goal?: "lower_body_strength" | "build_muscle" | "general_fitness" | "rehab";
  experience?: "new" | "intermediate" | "advanced";
  equipment?: ("barbell_rack" | "dumbbells" | "machines" | "bands" | "bodyweight")[];
  session_length?: number;
  frequency?: number;
  constraints?: ("none" | "knees" | "hips" | "low_back" | "other")[];
  intensity_ref?: "rpe" | "percent" | "unsure";
  sensor_today?: "yes" | "no";
  age_band?: "18_24" | "25_34" | "35_44" | "45_54" | "55_plus" | "unspecified";
  bodyweight?: { value?: number | ""; unit: "lb" | "kg" };
};

export type QuestionId =
  | "name"
  | "vibe"
  | "primary_goal"
  | "training_context"
  | "limitations"
  | "sport_context"
  | "equipment_session"
  | "frequency_commitment"
  | "body_metrics"
  | "user_age"
  | "user_height"
  | "user_current_weight"
  | "user_goal_weight"
  | "body_composition"
  | "activity_recovery"
  | "specific_target"
  | "training_time"
  | "exercise_preferences"
  | "goal"
  | "goal_intent"
  | "experience"
  | "equipment"
  | "session_length"
  | "frequency"
  | "constraints"
  | "intensity_ref"
  | "sensor_today"
  | "age_band"
  | "bodyweight";
