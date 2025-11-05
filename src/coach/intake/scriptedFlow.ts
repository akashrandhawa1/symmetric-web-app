import type { NextAction, IntakeTurn, WrapTurn } from "./openSchema";
import type { Topic } from "./contextMap";

export type IntakeBranch = "athlete" | "lifestyle";

type CoachSCC = { suggest: string; confirm: string; compensate: string };

export const SCRIPTED_TOPIC_SEQUENCE: Topic[] = [
  "name",
  "primary_goal",
  "training_context",
  "equipment_session",
  "frequency_commitment",
  "body_metrics",
  "limitations",
  "sport_context",
  // Legacy topics retained for backward compatibility with stored profiles
  "goal_intent",
  "experience_level",
  "equipment",
  "frequency",
  "session_length",
  "constraints",
];

export const SCC_SEEDS: Record<
  "goal" | "experience" | "safety" | "environment" | "schedule" | "basics",
  CoachSCC
> = {
  goal: { suggest: "Clarity guides progress", confirm: "Any priority works", compensate: "We'll refine as we learn" },
  experience: { suggest: "Match plan to skill", confirm: "Any level works", compensate: "We'll pace cues smartly" },
  safety: { suggest: "Protect weak links", confirm: "Comfort first", compensate: "Joint-friendly options" },
  environment: { suggest: "Use consistent tools", confirm: "Any setup works", compensate: "We'll adapt the plan" },
  schedule: { suggest: "Scheduling keeps momentum", confirm: "Your week wins", compensate: "We'll compress if needed" },
  basics: { suggest: "Stats calibrate loading", confirm: "Ranges are fine", compensate: "We can update anytime" },
};

export const PERSONA_LINES: Record<Topic | "default", string> = {
  name: "Knowing your name keeps coaching personal",
  primary_goal: "Dialling the mission keeps training sharp",
  training_context: "Experience level shapes exercise selection",
  equipment_session: "Setup and time define each session",
  frequency_commitment: "Schedule anchors the plan",
  body_metrics: "Body stats calibrate loading and cues",
  limitations: "Protecting weak links keeps you training",
  sport_context: "Sport context lets us tailor transfer",
  goal_intent: "Clear goals keep training sharp",
  experience_level: "Matching intensity avoids overwhelm",
  equipment: "Tools define how we load intent",
  frequency: "Schedule anchors the plan",
  session_length: "Session length shapes each block",
  constraints: "Protecting weak links sustains momentum",
  default: "Let's keep building your blueprint",
};

export const TOPIC_PHASE: Record<Topic, string> = {
  name: "rapport",
  primary_goal: "goal",
  training_context: "experience",
  equipment_session: "environment",
  frequency_commitment: "schedule",
  body_metrics: "basics",
  limitations: "safety",
  sport_context: "focus",
  goal_intent: "goal",
  experience_level: "experience",
  equipment: "environment",
  frequency: "schedule",
  session_length: "schedule",
  constraints: "safety",
  motivation: "goal",
  timeline: "goal",
  baseline_strength: "experience",
  baseline_conditioning: "experience",
  sleep_stress: "recovery",
  soreness_pattern: "recovery",
  preferences: "preferences",
  coach_vibe: "preferences",
  goal_detail: "goal",
  age_range: "basics",
  height_cm: "basics",
  weight_kg: "basics",
  program_style: "preferences",
  mobility_limitations: "safety",
  soreness_pain: "safety",
  sensor_today: "environment",
  sport_role: "focus",
  sport_position: "focus",
  occupation_type: "focus",
  daily_activity: "focus",
};

export const CHIPS_BY_TOPIC: Partial<Record<Topic, string[]>> = {
  primary_goal: [
    "Build max strength",
    "Add muscle size",
    "Train for a sport",
    "Rehab / return",
    "General fitness",
  ],
  training_context: [
    "New (0-6 months)",
    "Some experience (6mo-2yrs)",
    "Solid lifter (2-5 years)",
    "Very experienced (5+ years)",
  ],
  equipment_session: [
    "Barbell + rack • 45 min",
    "Dumbbells + bands • 30 min",
    "Machines only • 60 min",
    "Bodyweight only • 25 min",
  ],
  frequency_commitment: [
    "2 days / week",
    "3 days / week",
    "4 days / week",
    "5 days / week",
  ],
  limitations: ["None", "Knees", "Hips", "Low back", "Shoulders"],
  sport_context: ["Basketball guard", "Soccer midfield", "Track sprinter", "Powerlifting"],
};

const createTurn = (topic: Topic, question: string, chips?: string[]): NextAction => {
  const persona = PERSONA_LINES[topic] ?? PERSONA_LINES.default;
  const scc = topic === "body_metrics" ? SCC_SEEDS.basics :
    topic === "equipment_session" ? SCC_SEEDS.environment :
    topic === "frequency_commitment" ? SCC_SEEDS.schedule :
    topic === "training_context" ? SCC_SEEDS.experience :
    topic === "limitations" ? SCC_SEEDS.safety :
    topic === "primary_goal" ? SCC_SEEDS.goal :
    SCC_SEEDS.goal;

  return {
    action: "turn",
    turn: {
      persona_line: persona,
      scc,
      question,
      topic,
      chips: chips && chips.length ? chips : CHIPS_BY_TOPIC[topic] ?? [],
    },
  };
};

const normalisePrimaryGoal = (answers: Record<string, any>): string => {
  const goal = answers.primary_goal ?? answers.goal_intent ?? answers.goal ?? "";
  return typeof goal === "string" ? goal.toLowerCase() : "";
};

const getTrainingContext = (answers: Record<string, any>): string => {
  const ctx = answers.training_context ?? answers.experience_level ?? answers.experience;
  return typeof ctx === "string" ? ctx : "";
};

const getEquipmentSession = (answers: Record<string, any>) => answers.equipment_session;

const getFrequencyCommitment = (answers: Record<string, any>) => answers.frequency_commitment;

const getBodyMetrics = (answers: Record<string, any>) => answers.body_metrics;

const requiresLimitations = (goal: string) => /rehab|injur|recover/.test(goal);
const requiresSportContext = (goal: string) => /sport|team|athlete|game/.test(goal);

const hasValue = (value: unknown) => {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
};

export const resolveIntakeBranch = (branch: string | undefined, answers: Record<string, any>): IntakeBranch => {
  if (branch === "athlete" || branch === "lifestyle") return branch;
  const goal = normalisePrimaryGoal(answers);
  if (requiresSportContext(goal)) return "athlete";
  if (answers.sport_context) return "athlete";
  return "lifestyle";
};

export const scriptedNextAction = (answers: Record<string, any>, branch: IntakeBranch): NextAction => {
  const name = typeof answers.name === "string" ? answers.name.trim() : "";
  if (!name) {
    return createTurn("name", "What should I call you?", []);
  }

  const goal = normalisePrimaryGoal(answers);
  if (!hasValue(answers.primary_goal ?? answers.goal_intent)) {
    return createTurn(
      "primary_goal",
      `${name.split(" ")[0]}, what’s the main focus—strength, muscle, sport, rehab, or general fitness?`
    );
  }

  if (!hasValue(getTrainingContext(answers))) {
    return createTurn(
      "training_context",
      "How would you describe your lifting experience—new, some experience, solid, or very experienced?"
    );
  }

  if (!hasValue(getEquipmentSession(answers))) {
    return createTurn(
      "equipment_session",
      "What equipment do you have ready, and how long can each session run?"
    );
  }

  if (!hasValue(getFrequencyCommitment(answers))) {
    return createTurn(
      "frequency_commitment",
      "How many days per week can you train, and for how many weeks are you planning?"
    );
  }

  if (!hasValue(getBodyMetrics(answers))) {
    return createTurn(
      "body_metrics",
      "Quick stats check—what’s your age, height (feet/inches), and current weight in pounds?"
    );
  }

  if (requiresLimitations(goal) && !hasValue(answers.limitations ?? answers.constraints)) {
    return createTurn("limitations", "Any injuries or joints I should protect?", CHIPS_BY_TOPIC.limitations);
  }

  if (requiresSportContext(goal) && !hasValue(answers.sport_context)) {
    return createTurn("sport_context", "Which sport or position should I tailor this around?", CHIPS_BY_TOPIC.sport_context);
  }

  return buildWrapAction(answers);
};

export const buildWrapAction = (answers: Record<string, any>): NextAction => ({
  action: "wrap",
  wrap: buildWrap(answers),
});

const buildWrap = (answers: Record<string, any>): WrapTurn => {
  const goal = normalisePrimaryGoal(answers);
  const freq =
    typeof answers.frequency_commitment?.days_per_week === "number"
      ? answers.frequency_commitment.days_per_week
      : typeof answers.frequency === "number"
      ? answers.frequency
      : DEFAULT_WRAP.days_per_week;

  const sessionMinutes =
    typeof answers.equipment_session?.session_minutes === "number"
      ? answers.equipment_session.session_minutes
      : typeof answers.session_length === "number"
      ? answers.session_length
      : DEFAULT_WRAP.session_length_min;

  const planGoal: WrapTurn["plan_summary"]["goal"] = goal.includes("muscle")
    ? "muscle"
    : goal.includes("rehab")
    ? "rehab"
    : goal.includes("strength")
    ? "lower-body strength"
    : "general";

  const weeks = typeof answers.frequency_commitment?.focus_weeks === "number"
    ? Math.min(Math.max(answers.frequency_commitment.focus_weeks, 2), 16)
    : DEFAULT_WRAP.weeks;

  const constraints = (() => {
    const value = answers.limitations ?? answers.constraints;
    if (!value) return "No constraints flagged";
    if (Array.isArray(value)) {
      if (!value.length || value.includes("none")) return "No constraints flagged";
      return `Protecting: ${value.map(String).join(", ")}`;
    }
    if (typeof value === "string" && value.trim().length) return value.trim();
    return "No constraints flagged";
  })();

  const introName = typeof answers.name === "string" ? answers.name.split(" ")[0] : "Let's";

  return {
    coach_intro: `${introName}, plan locked—let's make this ${planGoal.replace("-", " ")} cycle count.`,
    plan_summary: {
      goal: planGoal,
      weeks,
      days_per_week: Math.min(Math.max(freq ?? DEFAULT_WRAP.days_per_week, 1), 6),
      session_length_min: Math.min(Math.max(sessionMinutes ?? DEFAULT_WRAP.session_length_min, 20), 120),
      constraints_notes: constraints,
      blocks: DEFAULT_WRAP.blocks,
    },
  };
};

const DEFAULT_WRAP: WrapTurn["plan_summary"] = {
  goal: "general",
  weeks: 6,
  days_per_week: 3,
  session_length_min: 45,
  constraints_notes: "No constraints flagged",
  blocks: [
    { name: "Heavy Lower Push", objective: "Prime quads and glutes with a leading compound" },
    { name: "Posterior Chain", objective: "Balance with hip hinge and hamstring volume" },
    { name: "Accessory + Core", objective: "Polish stability and knee-friendly accessory work" },
  ],
};
