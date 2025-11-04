export type Vibe = "hype" | "calm" | "expert";

export type Answers = {
  name?: string;
  vibe?: Vibe;
  goal?: "lower_body_strength" | "build_muscle" | "general_fitness" | "rehab";
  experience?: "new" | "intermediate" | "advanced";
  equipment?: ("barbell_rack" | "dumbbells" | "machines" | "bands" | "bodyweight")[];
  session_length?: number;   // minutes
  frequency?: number;        // 1–4
  constraints?: ("none" | "knees" | "hips" | "low_back" | "other")[];
  intensity_ref?: "rpe" | "percent" | "unsure";
  sensor_today?: "yes" | "no";
  age_band?: "18_24" | "25_34" | "35_44" | "45_54" | "55_plus" | "unspecified";
  bodyweight?: { value?: number | ""; unit: "lb" | "kg" };
};

export type QuestionId =
  | "name" | "vibe" | "goal" | "experience" | "equipment"
  | "session_length" | "frequency" | "constraints" | "intensity_ref" | "sensor_today"
  | "age_band" | "bodyweight";
