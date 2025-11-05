import type { NextAction, IntakeTurn, WrapTurn } from "./openSchema";
import type { Topic } from "./contextMap";

export type IntakeBranch = "athlete" | "lifestyle";

type CoachSCC = { suggest: string; confirm: string; compensate: string };

// OPTIMIZED: Expanded from 7 to 10-15 questions for maximum plan quality
export const SCRIPTED_TOPIC_SEQUENCE: Topic[] = [
  // TIER 1: Identity & Goals (3-4 questions)
  "name",
  "primary_goal",            // Combines: goal_intent + goal_detail + motivation
  "specific_target",         // PHASE 2 OPTIONAL: Specific measurable goal
  "body_composition",        // PHASE 1: Gain, lose, maintain, or not a priority

  // TIER 2: Current State (4 questions)
  "training_context",        // Combines: experience + baseline_strength + form_confidence
  "baseline_fitness",        // PHASE 1: Can you do basic movements?
  "age_range",               // PHASE 1: Age for recovery capacity
  "limitations",             // Combines: past_injuries + mobility + soreness + constraints

  // TIER 3: Context & Preferences (3-4 questions, SOME CONDITIONAL)
  "activity_recovery",       // PHASE 1: Daily activity + sleep + stress
  "sport_context",           // CONDITIONAL: Only if sport mentioned in primary_goal
  "training_time",           // PHASE 2 OPTIONAL: When do you train?
  "exercise_preferences",    // PHASE 2 OPTIONAL: Loves/hates

  // TIER 4: Logistics (2 questions)
  "equipment_session",       // Combines: equipment + session_length + environment
  "frequency_commitment",    // Combines: frequency + timeline
];

export const SCC_SEEDS: Record<
  "goal" | "basics" | "experience" | "safety" | "environment" | "schedule" | "focus" | "recovery" | "preferences",
  CoachSCC
> = {
  goal: { suggest: "Clarity guides progress", confirm: "Any priority works", compensate: "We'll refine as we learn" },
  basics: { suggest: "Basics improve scaling", confirm: "Ranges are fine", compensate: "We'll adjust by feel" },
  experience: { suggest: "Match plan to skill", confirm: "Any level works", compensate: "We'll pace cues smartly" },
  safety: { suggest: "Protect weak links", confirm: "Comfort first", compensate: "Joint-friendly options" },
  environment: { suggest: "Use consistent tools", confirm: "Any setup works", compensate: "Adaptable patterns" },
  schedule: { suggest: "Scheduling keeps momentum", confirm: "Your week wins", compensate: "We'll compress if needed" },
  focus: { suggest: "Train to your role", confirm: "Any context helps", compensate: "Target real tasks" },
  recovery: { suggest: "Recovery fuels gains", confirm: "Any state works", compensate: "We'll modulate load quickly" },
  preferences: { suggest: "Enjoyment sustains effort", confirm: "Your call", compensate: "We'll swap to keep momentum" },
};

export const PERSONA_LINES: Record<Topic | "default", string> = {
  name: "Knowing your name keeps coaching personal",
  // OPTIMIZED TOPICS (PHASE 1)
  primary_goal: "Clear goals drive smart programming",
  body_composition: "Body comp goals shape volume and intensity",
  training_context: "Experience level shapes exercise selection",
  baseline_fitness: "Movement baseline guides starting point",
  age_range: "Age informs recovery and progression pace",
  limitations: "Protecting weak links keeps you training",
  activity_recovery: "Daily activity and recovery guide load management",
  sport_context: "Sport context tailors transfer work",
  equipment_session: "Setup and time define your sessions",
  frequency_commitment: "Schedule anchors your plan",
  // PHASE 2 TOPICS
  specific_target: "Specific targets enable reverse-engineered periodization",
  training_time: "Training time optimizes CNS-demanding exercise timing",
  exercise_preferences: "Movement preferences boost adherence and consistency",
  // LEGACY TOPICS
  goal_intent: "Clear goals keep training sharp",
  goal_detail: "Details keep progress targeted",
  motivation: "Motivation cements adherence",
  timeline: "Timeline keeps effort milestone-ready",
  sport_role: "Role context lets us tailor transfer",
  sport_position: "Position detail sharpens focus",
  performance_focus: "Focus points keep sessions relevant",
  occupation_type: "Workload informs recovery approach",
  daily_activity: "Daily activity guides volume",
  constraints: "Protecting weak links sustains momentum",
  past_injuries: "History guides safer progressions",
  mobility_limitations: "Mobility insight prevents flare ups",
  soreness_pain: "Tracking soreness keeps you moving",
  baseline_strength: "Baseline strength guides loading choices",
  baseline_conditioning: "Conditioning insight shapes work capacity",
  experience_level: "Matching intensity avoids overwhelm",
  form_confidence: "Confidence cues pace our coaching",
  program_style: "Preferred style boosts consistency",
  environment: "Knowing your setup keeps training realistic",
  equipment: "Tools define how we load intent",
  sensor_today: "Sensor use guides feedback depth",
  frequency: "Schedule anchors the whole plan",
  session_length: "Session length shapes each block",
  sleep_stress: "Recovery signals keep gains compounding",
  soreness_pattern: "Pattern tracking protects overload",
  preferences: "Enjoyment keeps the plan sticky",
  coach_vibe: "Right tone keeps coaching natural",
  age_range: "Basics help scale the plan safely",
  height_cm: "Basics help scale the plan safely",
  weight_kg: "Basics help scale the plan safely",
  default: "Let's keep building your blueprint",
};

export const CHIPS_BY_TOPIC: Partial<Record<Topic, string[]>> = {
  // OPTIMIZED CHIPS for 10-15 question flow
  primary_goal: [
    "💪 Build max strength",
    "🏋️ Add muscle size",
    "⚡ Get faster/explosive",
    "🏃 Train for a sport",
    "🔄 Recover from injury",
    "🎯 General fitness"
  ],
  specific_target: [], // Free text input with skip option
  body_composition: [
    "📈 Gain weight (muscle focus)",
    "📉 Lose fat",
    "⚖️ Maintain / Recomp",
    "🤷 Not a priority"
  ],
  training_context: [
    "🌱 New (0-6 months)",
    "💪 Some experience (6mo-2yrs)",
    "🏋️ Solid lifter (2-5 years)",
    "🏆 Very experienced (5+ years)"
  ],
  baseline_fitness: [], // Special multi-checkbox format (handled in UI)
  age_range: [
    "18-25",
    "26-35",
    "36-45",
    "46-55",
    "56+"
  ],
  limitations: [], // Multi-entry tag input, no fixed chips
  activity_recovery: [], // Special dual-slider format (handled in UI)
  sport_context: [], // Open text with smart parsing
  training_time: [
    "🌅 Morning (before 10am)",
    "☀️ Midday (10am-5pm)",
    "🌙 Evening (after 5pm)",
    "🔄 Varies"
  ],
  exercise_preferences: [], // Multi-entry tag input with loves/hates
  equipment_session: [
    "🏋️ Barbell + plates",
    "💪 Dumbbells",
    "🔗 Resistance bands",
    "📦 Squat rack",
    "🦵 Leg press",
    "🔌 Cable machine",
    "🧍 Bodyweight only"
  ],
  frequency_commitment: ["1", "2", "3", "4", "5", "6", "7"],

  // LEGACY CHIPS (backward compatibility)
  goal_intent: ["strength", "muscle", "general", "rehab"],
  goal_detail: ["lower body", "upper body", "overall fitness", "rehab"],
  motivation: ["upcoming event", "feel better daily", "sport performance", "injury prevention", "confidence boost"],
  timeline: ["<2 weeks", "2-4 weeks", "1-3 months", "3-6 months", "no deadline"],
  sport_role: ["basketball", "soccer", "running", "powerlifting", "baseball", "general", "other"],
  sport_position: [],
  performance_focus: ["speed", "power", "endurance", "strength", "agility"],
  occupation_type: ["desk", "active", "shift work", "mixed"],
  daily_activity: ["mostly seated", "on feet", "mixed days"],
  constraints: ["knees", "hips", "low back", "shoulders", "none"],
  past_injuries: ["old injury", "chronic pain", "recent surgery", "just cautious"],
  mobility_limitations: ["ankles", "hips", "shoulders", "none"],
  soreness_pain: ["none", "light", "moderate", "sharp"],
  baseline_strength: ["both easily", "squat yes", "pull-up yes", "neither yet"],
  baseline_conditioning: ["engine is great", "solid base", "needs work"],
  experience_level: ["new (<6mo)", "intermediate", "experienced"],
  form_confidence: ["very confident", "mostly confident", "need coaching"],
  program_style: ["structured plan", "flexible blocks", "auto-regulated", "tell me what works"],
  environment: ["gym (full)", "home (rack)", "home (dumbbells)", "minimal (bands/bodyweight)"],
  equipment: ["barbell", "dumbbells", "machines", "bands", "bodyweight"],
  sensor_today: ["yes", "not today"],
  frequency: ["1", "2", "3", "4+"],
  session_length: ["20", "30", "45", "60+"],
  sleep_stress: ["great (7-8hr)", "ok (6-7hr)", "rough (<6hr/high stress)"],
  soreness_pattern: ["fresh", "moderate soreness", "beat up lately"],
  preferences: ["love squats", "avoid lunges", "prefer machines", "prefer free weights", "no strong preference"],
  coach_vibe: ["direct & focused", "hype me up", "calm & steady", "surprise me"],
  age_range: ["under 18", "18-24", "25-34", "35-44", "45+"],
  height_cm: ["<160", "160-175", "175-190", "190+"],
  weight_kg: ["<60", "60-75", "75-90", "90+"],
};

const SPORT_POSITION_CHIPS: Record<string, string[]> = {
  basketball: ["guard", "forward", "center", "stretch four", "utility"],
  soccer: ["forward", "midfield", "defense", "goalkeeper"],
  running: ["sprints", "middle distance", "long distance", "trail"],
  powerlifting: ["squat focus", "bench focus", "deadlift focus", "balanced"],
  baseball: ["pitcher", "catcher", "infield", "outfield", "utility"],
  football: ["quarterback", "skill positions", "line", "special teams"],
  hockey: ["forward", "defense", "goalie", "utility"],
};

const DEFAULT_SPORT_POSITION_CHIPS = ["primary", "supporting", "hybrid", "rotational"];

export const TOPIC_PHASE: Record<Topic, string> = {
  name: "rapport",
  // OPTIMIZED TOPICS (PHASE 1)
  primary_goal: "goal",
  body_composition: "goal",
  training_context: "experience",
  baseline_fitness: "baseline",
  age_range: "basics",
  limitations: "safety",
  activity_recovery: "recovery",
  sport_context: "context",
  equipment_session: "environment",
  frequency_commitment: "schedule",
  // PHASE 2 TOPICS
  specific_target: "goal",
  training_time: "schedule",
  exercise_preferences: "preferences",
  // LEGACY TOPICS
  goal_intent: "goal",
  goal_detail: "goal",
  motivation: "goal",
  timeline: "timeline",
  sport_role: "context",
  sport_position: "context",
  performance_focus: "context",
  occupation_type: "context",
  daily_activity: "context",
  constraints: "safety",
  past_injuries: "safety",
  mobility_limitations: "safety",
  soreness_pain: "safety",
  baseline_strength: "baseline",
  baseline_conditioning: "baseline",
  experience_level: "experience",
  form_confidence: "experience",
  program_style: "experience",
  environment: "environment",
  equipment: "environment",
  sensor_today: "environment",
  frequency: "schedule",
  session_length: "schedule",
  sleep_stress: "recovery",
  soreness_pattern: "recovery",
  preferences: "preferences",
  coach_vibe: "preferences",
  age_range: "basics",
  height_cm: "basics",
  weight_kg: "basics",
};

const topicCategory = (topic: Topic): keyof typeof SCC_SEEDS => {
  // OPTIMIZED TOPICS (PHASE 1 & 2)
  if (["primary_goal", "body_composition", "specific_target"].includes(topic)) return "goal";
  if (["training_context", "baseline_fitness"].includes(topic)) return "experience";
  if (topic === "limitations") return "safety";
  if (["activity_recovery", "sleep_stress", "soreness_pattern"].includes(topic)) return "recovery";
  if (topic === "sport_context") return "focus";
  if (["equipment_session", "training_time"].includes(topic)) return "environment";
  if (topic === "frequency_commitment") return "schedule";
  if (["exercise_preferences", "preferences", "coach_vibe"].includes(topic)) return "preferences";
  // LEGACY TOPICS
  if (["goal_intent", "goal_detail", "motivation", "timeline"].includes(topic)) return "goal";
  if (["name", "age_range", "height_cm", "weight_kg"].includes(topic)) return "basics";
  if (
    ["baseline_strength", "baseline_conditioning", "experience_level", "form_confidence", "program_style"].includes(
      topic
    )
  )
    return "experience";
  if (
    ["constraints", "past_injuries", "mobility_limitations", "soreness_pain"].includes(topic)
  )
    return "safety";
  if (["environment", "equipment", "sensor_today"].includes(topic)) return "environment";
  if (["frequency", "session_length"].includes(topic)) return "schedule";
  if (["sport_role", "sport_position", "performance_focus", "occupation_type", "daily_activity"].includes(topic))
    return "focus";
  return "goal";
};

export const resolveIntakeBranch = (branch: string | undefined, answers: Record<string, any>): IntakeBranch => {
  if (branch === "athlete" || branch === "lifestyle") return branch;
  const sportRole = typeof answers.sport_role === "string" ? answers.sport_role.toLowerCase() : "";
  if (["basketball", "soccer", "running", "powerlifting", "baseball", "football", "hockey"].includes(sportRole))
    return "athlete";
  if (answers.performance_focus && sportRole !== "general") return "athlete";
  if (answers.occupation_type || answers.daily_activity) return "lifestyle";
  return "athlete";
};

export const scriptedNextAction = (answers: Record<string, any>, branch: IntakeBranch): NextAction => {
  const name = typeof answers.name === "string" ? answers.name.trim() : "";
  const chipsOrDefault = (topic: Topic, candidate?: string[]) =>
    candidate && candidate.length ? candidate : CHIPS_BY_TOPIC[topic] ?? [];
  const buildTurn = (topic: Topic, rawQuestion: string, candidateChips?: string[]): NextAction => {
    const persona = PERSONA_LINES[topic] ?? PERSONA_LINES.default;
    const scc = SCC_SEEDS[topicCategory(topic)];
    return {
      action: "turn",
      turn: {
        persona_line: persona,
        scc,
        question: rawQuestion.replace(/\s+/g, " ").trim(),
        topic,
        chips: chipsOrDefault(topic, candidateChips),
      },
    };
  };

  if (!name) {
    return buildTurn("name", "What should I call you?", []);
  }

  if (!answers.goal_intent) {
    return buildTurn(
      "goal_intent",
      `${name}, what goal are we training for—strength, muscle, general, or rehab?`,
      ["strength", "muscle", "general", "rehab"]
    );
  }

  if (!answers.motivation) {
    const goalPrompt: Record<string, string> = {
      strength: "Why does getting stronger matter to you right now?",
      muscle: "Why is building muscle important for you now?",
      general: "What makes building overall fitness matter right now?",
      rehab: "What are you working to recover from?",
    };
    const base = String(answers.goal_intent ?? "").toLowerCase();
    return buildTurn(
      "motivation",
      goalPrompt[base] ?? "What is driving this training push?",
      ["upcoming event", "feel better daily", "sport performance", "injury prevention", "confidence boost"]
    );
  }

  if (!answers.timeline) {
    return buildTurn(
      "timeline",
      "Any deadline or event we should target?",
      ["<2 weeks", "2-4 weeks", "1-3 months", "3-6 months", "no deadline"]
    );
  }

  if (branch === "athlete") {
    if (!answers.sport_role) {
      return buildTurn(
        "sport_role",
        "What sport or activity should I plan around?",
        ["basketball", "soccer", "running", "powerlifting", "general"]
      );
    }
    if (answers.sport_role && answers.sport_role !== "general" && !answers.sport_position) {
      const normalisedRole = String(answers.sport_role).toLowerCase().trim();
      const positionChips = SPORT_POSITION_CHIPS[normalisedRole] ?? DEFAULT_SPORT_POSITION_CHIPS;
      const roleLabel =
        normalisedRole && normalisedRole !== "other" ? answers.sport_role : "that activity";
      return buildTurn(
        "sport_position",
        `For ${roleLabel}, what role matches how you show up?`,
        positionChips
      );
    }
    if (!answers.performance_focus) {
      return buildTurn(
        "performance_focus",
        "What performance focus do you want first?",
        ["speed", "power", "endurance", "strength", "agility"]
      );
    }
  } else {
    if (!answers.occupation_type) {
      return buildTurn(
        "occupation_type",
        "What best describes your workdays?",
        ["desk", "active", "shift work", "mixed"]
      );
    }
    if (!answers.daily_activity) {
      return buildTurn(
        "daily_activity",
        "How active are you outside training?",
        ["mostly seated", "on feet", "mixed days"]
      );
    }
    if (!answers.performance_focus) {
      return buildTurn(
        "performance_focus",
        "Which focus will feel best to unlock first?",
        ["move better", "get stronger", "boost energy", "lean out"]
      );
    }
  }

  if (!answers.constraints) {
    return buildTurn(
      "constraints",
      `${name}, any joints or areas we should protect?`,
      ["knees", "hips", "low back", "shoulders", "none"]
    );
  }

  if (answers.constraints && answers.constraints !== "none" && !answers.past_injuries) {
    const constraintLabel = String(answers.constraints);
    return buildTurn(
      "past_injuries",
      `Tell me briefly about your ${constraintLabel} history.`,
      ["old injury", "chronic pain", "recent surgery", "just cautious"]
    );
  }

  if (!answers.mobility_limitations) {
    return buildTurn(
      "mobility_limitations",
      "Any mobility limitations you want me to know?",
      ["ankles", "hips", "shoulders", "none"]
    );
  }

  if (!answers.baseline_strength) {
    return buildTurn(
      "baseline_strength",
      "Can you squat to parallel and do a pull-up?",
      ["both easily", "squat yes", "pull-up yes", "neither yet"]
    );
  }

  if (!answers.baseline_conditioning) {
    return buildTurn(
      "baseline_conditioning",
      "How would you rate your conditioning engine right now?",
      ["engine is great", "solid base", "needs work"]
    );
  }

  if (!answers.experience_level) {
    return buildTurn(
      "experience_level",
      "How long have you been strength training?",
      ["new (<6mo)", "intermediate", "experienced"]
    );
  }

  if (!answers.form_confidence) {
    return buildTurn(
      "form_confidence",
      "How confident do you feel with main lifts?",
      ["very confident", "mostly confident", "need coaching"]
    );
  }

  if (!answers.program_style) {
    return buildTurn(
      "program_style",
      "What programming style keeps you consistent?",
      ["structured plan", "flexible blocks", "auto-regulated", "tell me what works"]
    );
  }

  if (!answers.environment) {
    return buildTurn(
      "environment",
      "Where will you train most sessions?",
      ["gym (full)", "home (rack)", "home (dumbbells)", "minimal (bands/bodyweight)"]
    );
  }

  if (!answers.equipment) {
    return buildTurn(
      "equipment",
      "Any specific equipment I should anchor around?",
      ["barbell", "dumbbells", "machines", "bands", "bodyweight"]
    );
  }

  if (answers.environment && !answers.sensor_today && String(answers.environment).toLowerCase().includes("gym")) {
    return buildTurn("sensor_today", "Are you using the Symmetric sensor today?", ["yes", "not today"]);
  }

  if (!answers.frequency) {
    return buildTurn("frequency", "How many training days fit your week?", ["1", "2", "3", "4+"]);
  }

  if (!answers.session_length) {
    return buildTurn("session_length", "How long can each session run?", ["20", "30", "45", "60+"]);
  }

  if (!answers.sleep_stress) {
    return buildTurn(
      "sleep_stress",
      "How are your sleep and stress lately?",
      ["great (7-8hr)", "ok (6-7hr)", "rough (<6hr/high stress)"]
    );
  }

  if (!answers.soreness_pattern) {
    return buildTurn(
      "soreness_pattern",
      "Any soreness pattern I should factor in?",
      ["fresh", "moderate soreness", "beat up lately"]
    );
  }

  if (!answers.preferences) {
    return buildTurn(
      "preferences",
      "Any exercises you love or avoid?",
      ["love squats", "avoid lunges", "prefer machines", "prefer free weights", "no strong preference"]
    );
  }

  if (!answers.coach_vibe) {
    return buildTurn(
      "coach_vibe",
      "What coaching vibe keeps you most engaged?",
      ["direct & focused", "hype me up", "calm & steady", "surprise me"]
    );
  }

  const optionalTopics: Array<{ topic: Topic; question: string; chips?: string[] }> = [
    { topic: "goal_detail", question: "Any specifics behind that goal?", chips: CHIPS_BY_TOPIC.goal_detail },
    { topic: "age_range", question: "Which age range fits you best?", chips: CHIPS_BY_TOPIC.age_range },
    { topic: "height_cm", question: "What is your height so I can scale intent?", chips: CHIPS_BY_TOPIC.height_cm },
    { topic: "weight_kg", question: "What is your current weight?", chips: CHIPS_BY_TOPIC.weight_kg },
    { topic: "soreness_pain", question: "Any recurring soreness or pain lately?", chips: CHIPS_BY_TOPIC.soreness_pain },
  ];

  for (const item of optionalTopics) {
    if (!answers[item.topic]) {
      return buildTurn(item.topic, item.question, item.chips);
    }
  }

  return buildWrapAction(answers);
};

const buildWrap = (answers: Record<string, any>): WrapTurn => {
  const goalIntent = String(answers.goal_intent ?? "").toLowerCase();
  let goal: WrapTurn["plan_summary"]["goal"] = "general";
  if (goalIntent.includes("muscle")) goal = "muscle";
  else if (goalIntent.includes("rehab") || goalIntent.includes("recover")) goal = "rehab";
  else if (goalIntent.includes("strength")) goal = "lower-body strength";

  const freqStr = String(answers.frequency ?? "");
  const freqNum = Number.parseInt(freqStr.replace(/\D/g, ""), 10);
  const daysPerWeek = Number.isFinite(freqNum) && freqNum > 0 ? Math.min(freqNum, 6) : 3;

  const sessionStr = String(answers.session_length ?? "");
  const sessionNum = Number.parseInt(sessionStr.replace(/\D/g, ""), 10);
  const sessionLength = Number.isFinite(sessionNum) && sessionNum > 0 ? Math.max(sessionNum, 20) : 45;

  const timeline = String(answers.timeline ?? "").toLowerCase();
  let weeks = 4;
  if (timeline.includes("2 weeks")) weeks = 2;
  else if (timeline.includes("2-4")) weeks = 4;
  else if (timeline.includes("1-3")) weeks = 8;
  else if (timeline.includes("3-6")) weeks = 12;

  const name = typeof answers.name === "string" ? answers.name.trim() : "";
  const summaryParts = [
    answers.goal_intent && String(answers.goal_intent),
    answers.motivation && `(${String(answers.motivation)})`,
    answers.timeline && `timeline: ${String(answers.timeline)}`,
    answers.sport_role && answers.sport_role !== "general" && String(answers.sport_role),
    answers.performance_focus && String(answers.performance_focus),
    answers.occupation_type && String(answers.occupation_type),
    answers.daily_activity && String(answers.daily_activity),
    answers.baseline_strength && `baseline: ${String(answers.baseline_strength)}`,
    answers.baseline_conditioning && `engine: ${String(answers.baseline_conditioning)}`,
    answers.environment && String(answers.environment),
    answers.frequency && `${String(answers.frequency)}x/wk`,
    answers.session_length && `${String(answers.session_length)} min`,
    answers.constraints && answers.constraints !== "none" ? `protect ${String(answers.constraints)}` : null,
    answers.sleep_stress && `recovery: ${String(answers.sleep_stress).split(" ")[0]}`,
    answers.preferences && answers.preferences !== "no strong preference" && String(answers.preferences),
  ]
    .filter(Boolean)
    .map((value) => String(value));

  const coachIntro = summaryParts.length
    ? `${name ? `${name}, ` : ""}here's your blueprint: ${summaryParts.join(" • ")}. Ready to build your plan?`
    : `${name ? `${name}, ` : ""}ready to build your preview with what we've locked in.`;

  const constraintsNotes = [
    answers.constraints && answers.constraints !== "none" ? `Protect ${String(answers.constraints)}` : null,
    answers.past_injuries && `History: ${String(answers.past_injuries)}`,
    answers.soreness_pattern && `Soreness: ${String(answers.soreness_pattern)}`,
  ]
    .filter(Boolean)
    .join("; ") || "No constraints flagged";

  const blocks =
    weeks <= 4
      ? [
          { name: "Foundation", objective: "Reinforce mechanics and controlled loading" },
          { name: "Progressive Overload", objective: "Drive confident strength gains" },
        ]
      : [
          { name: "Foundation", objective: "Reinforce positions and activate engine" },
          { name: "Development", objective: "Ramp volume with focused strength work" },
          { name: "Peak Prep", objective: "Dial intensity toward your timeline goal" },
        ];

  return {
    coach_intro: coachIntro,
    plan_summary: {
      goal,
      weeks,
      days_per_week: daysPerWeek,
      session_length_min: sessionLength,
      constraints_notes: constraintsNotes,
      blocks,
    },
  };
};

export const buildWrapAction = (answers: Record<string, any>): NextAction => ({ action: "wrap", wrap: buildWrap(answers) });
