import type {
  Answers,
  EquipmentKind,
  EquipmentSession,
  FrequencyCommitment,
  GoalIntent,
  PrimaryGoalChoice,
  QuestionId,
  TrainingContextLevel,
} from "./miloChatTypes";

const PRIMARY_GOAL_CHOICES: PrimaryGoalChoice[] = [
  "strength",
  "muscle",
  "sport",
  "rehab",
  "general",
];

const TRAINING_CONTEXT_LEVELS: TrainingContextLevel[] = [
  "new",
  "some_experience",
  "solid_lifter",
  "very_experienced",
];

const EQUIPMENT_KEYWORDS: Record<EquipmentKind, RegExp> = {
  barbell: /(barbell|oly|olympic)/i,
  dumbbells: /(dumbbell|db)/i,
  machines: /(machine|leg\s*press|hack|cable|smith)/i,
  bands: /(band|tube|loop)/i,
  rack: /(rack|cage|power\s*rack)/i,
  bodyweight: /(bodyweight|no equipment|none|just me)/i,
};

const LIMITATION_KEYWORDS: Record<string, string> = {
  knees: "knees",
  hips: "hips",
  low_back: "low back",
  shoulders: "shoulders",
  ankles: "ankles",
  none: "none",
  other: "other",
};

const DEFAULT_SESSION_MINUTES = 45;
const DEFAULT_FREQUENCY_DAYS = 3;

export const essentialIds: QuestionId[] = [
  "name",
  "primary_goal",
  "training_context",
  "equipment_session",
  "frequency_commitment",
  "body_metrics",
];

export const timeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

export function hasEnough(a: Answers) {
  const goal = resolveLegacyGoal(a);
  const experience = resolveExperienceLevel(a);
  const equipment = resolveEquipmentSession(a)?.equipment ?? [];
  const sessionMinutes = resolveEquipmentSession(a)?.session_minutes ?? a.session_length;
  const frequency = resolveFrequencyCommitment(a)?.days_per_week ?? a.frequency;
  const metricsComplete =
    isFiniteNumber(a.age) &&
    isFiniteNumber(a.height_ft) &&
    isFiniteNumber(a.height_in) &&
    isFiniteNumber(a.weight_lb);

  return (
    !!goal &&
    !!experience &&
    equipment.length > 0 &&
    !!sessionMinutes &&
    !!frequency &&
    metricsComplete
  );
}

function resolveLegacyGoal(a: Answers): Answers["goal"] | undefined {
  if (a.goal) return a.goal;
  const primary = (a.primary_goal ?? a.goal_intent) as string | undefined;
  if (!primary) return undefined;
  const value = primary.toLowerCase();
  if (value.includes("strength")) return "lower_body_strength";
  if (value.includes("muscle")) return "build_muscle";
  if (value.includes("rehab") || value.includes("recover")) return "rehab";
  if (value.includes("sport") || value.includes("performance")) return "lower_body_strength";
  return "general_fitness";
}

function resolveEquipmentSession(a: Answers): EquipmentSession | undefined {
  if (a.equipment_session) return a.equipment_session;
  const equipment: EquipmentKind[] = [];
  (a.equipment ?? []).forEach((legacy) => {
    switch (legacy) {
      case "barbell_rack":
        equipment.push("barbell", "rack");
        break;
      case "dumbbells":
        equipment.push("dumbbells");
        break;
      case "machines":
        equipment.push("machines");
        break;
      case "bands":
        equipment.push("bands");
        break;
      case "bodyweight":
        equipment.push("bodyweight");
        break;
      default:
        break;
    }
  });
  if (!equipment.length && !a.session_length) {
    return undefined;
  }
  return {
    equipment: Array.from(new Set(equipment)),
    session_minutes: a.session_length ?? null,
  };
}

function resolveFrequencyCommitment(a: Answers): FrequencyCommitment | undefined {
  if (a.frequency_commitment) return a.frequency_commitment;
  if (a.frequency == null) return undefined;
  return { days_per_week: a.frequency, focus_weeks: undefined };
}

function resolveExperienceLevel(a: Answers): string | undefined {
  if (a.training_context) return a.training_context;
  if (a.experience) {
    switch (a.experience) {
      case "new":
        return "new";
      case "intermediate":
        return "some_experience";
      case "advanced":
        return "solid_lifter";
      default:
        return a.experience;
    }
  }
  return undefined;
}

function resolveConstraints(a: Answers): string[] {
  if (Array.isArray(a.limitations) && a.limitations.length) {
    return a.limitations;
  }
  return a.constraints ?? [];
}

export function buildPlanPreview(a: Answers) {
  const goal = resolveLegacyGoal(a) ?? "general_fitness";
  const equipmentSession = resolveEquipmentSession(a);
  const freq = resolveFrequencyCommitment(a)?.days_per_week ?? DEFAULT_FREQUENCY_DAYS;
  const sessionMinutes = equipmentSession?.session_minutes ?? a.session_length ?? DEFAULT_SESSION_MINUTES;
  const equipmentSet = new Set(equipmentSession?.equipment ?? []);
  const constraints = resolveConstraints(a);
  const knees = constraints.includes("knees");
  const hips = constraints.includes("hips");
  const lowBack = constraints.includes("low_back");
  const experience = resolveExperienceLevel(a) ?? "new";

  const hasBarbell = equipmentSet.has("barbell") || equipmentSet.has("rack");
  const hasDumbbells = equipmentSet.has("dumbbells");
  const hasMachines = equipmentSet.has("machines");

  let primary = "Back Squat";
  let primaryDetails = "";

  if (goal === "rehab" || knees || hips) {
    if (hasBarbell) {
      primary = "Box Squat (high-bar)";
      primaryDetails = "paused at parallel";
    } else if (hasMachines) {
      primary = knees ? "Leg Press (short ROM)" : "Hack Squat (controlled)";
    } else if (hasDumbbells) {
      primary = "Goblet Squat";
      primaryDetails = "tempo 3-1-1";
    } else {
      primary = "Split Squat (BW)";
      primaryDetails = "slow eccentric";
    }
  } else if (goal === "build_muscle") {
    if (hasBarbell) {
      primary = "High-Bar Squat";
      primaryDetails = "deep, controlled";
    } else if (hasMachines) {
      primary = "Hack Squat";
    } else if (hasDumbbells) {
      primary = "Bulgarian Split Squat";
      primaryDetails = "slow tempo";
    } else {
      primary = "Tempo Squat";
      primaryDetails = "3-1-X";
    }
  } else if (goal === "lower_body_strength") {
    if (hasBarbell) {
      primary = experience === "very_experienced" ? "Back Squat (low-bar)" : "Back Squat";
    } else if (hasMachines) {
      primary = "Hack Squat";
    } else if (hasDumbbells) {
      primary = "Goblet Squat (heavy)";
    } else {
      primary = "Pistol Squat (assisted)";
    }
  } else {
    if (hasBarbell) {
      primary = "Back Squat";
    } else if (hasMachines) {
      primary = "Leg Press";
    } else if (hasDumbbells) {
      primary = "Goblet Squat";
    } else {
      primary = "Air Squat (high volume)";
    }
  }

  let secondary = "RDL";
  if (lowBack) {
    secondary = hasMachines ? "Leg Curl" : "Glute Bridge";
  } else if (goal === "build_muscle") {
    if (hasBarbell || hasDumbbells) secondary = "RDL (slow eccentric)";
    else if (hasMachines) secondary = "Seated Leg Curl";
    else secondary = "Single-Leg Hip Thrust";
  } else {
    if (hasDumbbells || hasBarbell) secondary = "RDL";
    else if (hasMachines) secondary = "Hip Hinge Machine";
    else secondary = "Hip Thrust (BW)";
  }

  const accessory = (() => {
    if (goal === "build_muscle" && hasDumbbells) return "Walking Lunges";
    if (knees) return "Leg Press (short ROM)";
    if (hasDumbbells) return "DB Split Squat";
    if (hasMachines) return "Leg Extension";
    return "Step-ups";
  })();

  const intensityRef = a.intensity_ref ?? "rpe";
  let mainSets = "3×5";
  let mainIntensity = "RPE 7–8";

  if (goal === "lower_body_strength") {
    switch (experience) {
      case "very_experienced":
        mainSets = "4×3";
        break;
      case "some_experience":
      case "solid_lifter":
        mainSets = "4×4";
        break;
      default:
        mainSets = "3×5";
        break;
    }
    if (intensityRef === "percent") mainIntensity = "85–90%";
  } else if (goal === "build_muscle") {
    mainSets = experience === "very_experienced" ? "4×8" : experience === "some_experience" ? "3×8" : "3×10";
  } else if (goal === "rehab") {
    mainSets = "3×8";
    mainIntensity = "RPE 5–6";
  } else {
    mainSets = experience === "very_experienced" ? "3×6" : "3×8";
  }

  const blockCount = sessionMinutes >= 45 ? 3 : sessionMinutes >= 30 ? 2 : 1;

  const blocks = [
    {
      name: primary,
      details: primaryDetails ? `${mainSets} • ${mainIntensity} • ${primaryDetails}` : `${mainSets} • ${mainIntensity}`,
      estDrop: goal === "lower_body_strength" ? 22 : goal === "build_muscle" ? 18 : 15,
    },
  ];

  if (blockCount >= 2) {
    blocks.push({
      name: secondary,
      details:
        experience === "new"
          ? "3×6 • RPE 6–7"
          : goal === "build_muscle"
          ? "3×10 • RPE 7"
          : "3×5 • RPE 7",
      estDrop: goal === "build_muscle" ? 14 : 12,
    });
  }

  if (blockCount >= 3) {
    blocks.push({
      name: accessory,
      details: goal === "build_muscle" ? "3×12 • RPE 7" : "2×8–10 • RPE 7",
      estDrop: 8,
    });
  }

  let drop = blocks.reduce((sum, block) => sum + block.estDrop, 0);
  if (experience === "new") drop = Math.round(drop * 0.85);
  if (goal === "rehab") drop = Math.max(18, Math.round(drop * 0.65));
  drop = Math.max(15, Math.min(50, drop));

  return {
    title: `${goalLabel(goal)} • ${sessionMinutes} min` as const,
    freq,
    blocks,
    estSessionDrop: drop,
    sensor: a.sensor_today === "yes",
  } as const;
}

function goalLabel(goal: Answers["goal"] | undefined) {
  switch (goal) {
    case "lower_body_strength":
      return "Lower-Body Strength";
    case "build_muscle":
      return "Build Muscle";
    case "rehab":
      return "Return from Injury";
    case "general_fitness":
    default:
      return "Personal Plan";
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function nextMicrocopy(id: QuestionId, value: unknown, a: Answers) {
  const name = a.name?.split(" ")[0] || "friend";

  // Add variation by picking randomly from response options
  const pick = (options: string[]) => options[Math.floor(Math.random() * options.length)];

  switch (id) {
    case "name":
      return pick([
        `Great to meet you, ${name}!`,
        `Hey ${name}, stoked to work with you!`,
        `${name}—awesome, let's get after it!`,
      ]);
    case "primary_goal":
      return pick([
        `Love it—${String(value ?? "your goal")} is a great focus.`,
        `Perfect, we'll build everything around ${String(value ?? "that")}.`,
        `${String(value ?? "That goal")}—I can work with that. Let's do it.`,
      ]);
    case "training_context":
      if (value === "new") return pick([
        "No rush—we'll nail the basics first.",
        "All good—everyone starts somewhere. We'll build a solid foundation.",
        "Perfect, we'll take our time and get the movement patterns right.",
      ]);
      if (value === "some_experience") return pick([
        "Nice—you've got a base to build on.",
        "Solid. We can ramp things up with some structure.",
        "Cool, I'll meet you where you're at and push from there.",
      ]);
      if (value === "solid_lifter") return pick([
        "Hell yeah—we'll stack some quality volume.",
        "Love it. Time to dial in the details and keep progressing.",
        "Nice! We'll get strategic with your programming.",
      ]);
      if (value === "very_experienced") return pick([
        "Respect. We'll get precise with the loading.",
        "Perfect—time for some advanced periodization.",
        "Love working with experienced lifters. Let's optimize this.",
      ]);
      return "Got it—I'll match the intensity.";
    case "limitations":
      if (Array.isArray(value) && value.includes("none")) return pick([
        "Awesome—we can push confidently.",
        "Perfect, no limitations means more options.",
        "Great—that opens up a lot of movement choices.",
      ]);
      return pick([
        "Noted—I'll keep those joints safe.",
        "Got it. We'll work around that smartly.",
        "Copy that—protecting those areas is priority one.",
      ]);
    case "sport_context":
      return pick([
        `${String(value ?? "That sport")}—nice, I'll tailor everything for that.`,
        "Perfect, I'll program with sport-specific transfer in mind.",
        "Got it—we'll build strength that translates to the field.",
      ]);
    case "equipment_session":
      return pick([
        "Setup locked in—I'll design around what you've got.",
        "Perfect, I'll pace sessions to fit that time.",
        "Got it—working with your equipment and schedule.",
      ]);
    case "frequency_commitment":
      return pick([
        `${resolveFrequencyCommitment(a)?.days_per_week ?? "Your frequency"}x/week—I'll manage recovery around that.`,
        "Locked in. I'll distribute volume across those sessions.",
        "Perfect, I can work with that schedule.",
      ]);
    case "body_metrics":
      return pick([
        "Thanks—those numbers help me dial in the loads.",
        "Got it. I'll use those to calibrate intensity.",
        "Perfect, that helps me personalize the programming.",
      ]);
    case "equipment":
      return pick([
        "Got it—building your exercise pool now.",
        "Perfect, I'll work with what you've got.",
      ]);
    case "goal_intent":
    case "goal":
      return pick([
        "Goal locked—let's build around it.",
        "Perfect, everything will ladder up to that.",
      ]);
    default:
      return pick([
        `Noted, ${name}.`,
        "Got it.",
        "Copy that.",
      ]);
  }
}

function parsePrimaryGoal(raw: string) {
  const s = raw.toLowerCase();
  if (/sport|performance|team/.test(s)) return { value: "sport", label: "Train for sport" } as const;
  if (/rehab|recover|injur/.test(s)) return { value: "rehab", label: "Rehab / return" } as const;
  if (/muscle|size|hypertrophy|bulk/.test(s)) return { value: "muscle", label: "Build muscle" } as const;
  if (/strength|power|force/.test(s)) return { value: "strength", label: "Build strength" } as const;
  if (/general|overall|feel better/.test(s)) return { value: "general", label: "General fitness" } as const;
  return null;
}

function parseTrainingContext(raw: string) {
  const s = raw.toLowerCase();
  if (/^\s*(new|beginner)/.test(s) || /0-6/.test(s)) return { value: "new", label: "New" } as const;
  if (/6.*(months|mo)|some|1-2/.test(s)) return { value: "some_experience", label: "Some experience" } as const;
  if (/2-5|couple|solid|lifter/.test(s)) return { value: "solid_lifter", label: "Solid lifter" } as const;
  if (/5\+|advanced|very|seasoned|veteran/.test(s))
    return { value: "very_experienced", label: "Very experienced" } as const;
  return null;
}

function parseLimitations(raw: string) {
  const s = raw.toLowerCase();
  const picks = new Set<string>();
  Object.entries(LIMITATION_KEYWORDS).forEach(([key, token]) => {
    if (token === "none") {
      if (/none|no issues|all good|feeling fine/.test(s)) picks.add("none");
    } else if (new RegExp(token).test(s)) {
      picks.add(key);
    }
  });
  if (!picks.size && /injur|pain|tweak|surgery/.test(s)) picks.add("other");
  if (!picks.size) return null;
  return { value: Array.from(picks), label: Array.from(picks).join(", ") } as const;
}

function parseEquipmentSession(raw: string): { value: EquipmentSession; label: string } | null {
  const lower = raw.toLowerCase();
  const equipment = new Set<EquipmentKind>();
  Object.entries(EQUIPMENT_KEYWORDS).forEach(([kind, regex]) => {
    if (regex.test(lower)) equipment.add(kind as EquipmentKind);
  });

  if (/garage|home/.test(lower) && equipment.has("barbell") && !equipment.has("rack")) {
    equipment.add("rack");
  }

  const minutesMatch = lower.match(/(\d{2,3})\s*(min|minutes|m)/);
  const sessionMinutes = minutesMatch ? Number.parseInt(minutesMatch[1], 10) : null;

  if (!equipment.size && sessionMinutes == null) {
    return null;
  }

  const value = {
    equipment: Array.from(equipment),
    session_minutes: sessionMinutes,
  } satisfies EquipmentSession;

  const parts: string[] = [];
  if (value.equipment.length) parts.push(value.equipment.join(", "));
  if (sessionMinutes != null) parts.push(`${sessionMinutes} min`);

  return { value, label: parts.join(" · ") || raw };
}

function parseFrequencyCommitment(raw: string): { value: FrequencyCommitment; label: string } | null {
  const lower = raw.toLowerCase();
  const dayMatch = lower.match(/(\d)(?:\s*x|\s*days?|\s*per|\s*times?)/);
  let days = dayMatch ? Number.parseInt(dayMatch[1], 10) : null;
  if (!days && /four|4\+/.test(lower)) days = 4;
  if (!days && /five/.test(lower)) days = 5;
  if (!days && /six/.test(lower)) days = 6;
  if (!days && /seven/.test(lower)) days = 7;
  if (!days && /(three|3)/.test(lower)) days = 3;
  if (!days && /(two|2)/.test(lower)) days = 2;
  if (!days && /(one|1)/.test(lower)) days = 1;

  const weekMatch = lower.match(/(\d{1,2})\s*(weeks?|wks?)/);
  const focusWeeks = weekMatch ? Number.parseInt(weekMatch[1], 10) : null;

  if (!days && focusWeeks == null) return null;

  const value: FrequencyCommitment = {
    days_per_week: days,
    focus_weeks: focusWeeks,
  };

  const labelParts: string[] = [];
  if (days) labelParts.push(`${days}×/week`);
  if (focusWeeks) labelParts.push(`${focusWeeks} weeks`);

  return { value, label: labelParts.join(" · ") || raw };
}

function parseUserAge(raw: string) {
  const lower = raw.toLowerCase();

  // Match age patterns: "25", "25 years old", "25yo", "I'm 25"
  const ageMatch = lower.match(/(\d{2,3})\s*(?:yo|yrs?|years?\s*old)?/) ||
                   lower.match(/i'm\s*(\d{2,3})/) ||
                   lower.match(/^(\d{2,3})$/);

  if (!ageMatch) {
    // Try to match age range chips: "18-24", "25-34", etc.
    const rangeMatch = raw.match(/(\d{2})-(\d{2})/);
    if (rangeMatch) {
      return { value: raw, label: raw } as const;
    }
    return null;
  }

  const age = Number.parseInt(ageMatch[1], 10);
  if (age < 10 || age > 100) return null;

  return { value: age, label: `${age} years old` } as const;
}

function parseUserHeight(raw: string) {
  const lower = raw.toLowerCase();

  // Match height patterns: "6'2\"", "6 feet 2 inches", "6'2", "6 2", "74 inches"
  const feetInchMatch = lower.match(/(\d)\s*(?:ft|'|feet)?\s*(\d{1,2})\s*(?:in|"|inches)?/) ||
                        lower.match(/(\d)\s*(\d{1,2})/);

  if (feetInchMatch) {
    const feet = Number.parseInt(feetInchMatch[1], 10);
    const inches = Number.parseInt(feetInchMatch[2], 10);
    return { value: `${feet}'${inches}"`, label: `${feet}'${inches}"` } as const;
  }

  // Match total inches: "74 inches" or "74in"
  const inchesMatch = lower.match(/(\d{2,3})\s*(?:in|"|inches)/);
  if (inchesMatch) {
    const totalInches = Number.parseInt(inchesMatch[1], 10);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return { value: `${feet}'${inches}"`, label: `${feet}'${inches}"` } as const;
  }

  // Fallback: if it matches format like "5'10\"", use as-is
  if (/\d'\d{1,2}"?/.test(raw)) {
    return { value: raw, label: raw } as const;
  }

  return null;
}

function parseUserWeight(raw: string) {
  const lower = raw.toLowerCase();

  // Match weight patterns: "180 lb", "180 pounds", "180lbs", "180"
  const weightMatch = lower.match(/(\d{2,3})\s*(?:lb|lbs|pounds?)?/);

  if (!weightMatch) return null;

  const weight = Number.parseInt(weightMatch[1], 10);
  if (weight < 50 || weight > 500) return null;

  return { value: weight, label: `${weight} lb` } as const;
}

function parseBodyMetrics(raw: string) {
  const lower = raw.toLowerCase();

  const ageMatch = lower.match(/(\d{2})\s*(?:yo|yrs?|years?)/);
  const age = ageMatch ? Number.parseInt(ageMatch[1], 10) : null;

  let heightFt: number | null = null;
  let heightIn: number | null = null;

  const heightMatch = lower.match(/(\d)\s*(?:ft|'|feet)\s*(\d{1,2})?\s*(?:in|"|inches)?/);
  if (heightMatch) {
    heightFt = Number.parseInt(heightMatch[1], 10);
    heightIn = heightMatch[2] ? Number.parseInt(heightMatch[2], 10) : 0;
  } else {
    const inchesOnly = lower.match(/(\d{2})\s*(?:in|"|inches)/);
    if (inchesOnly) {
      const total = Number.parseInt(inchesOnly[1], 10);
      heightFt = Math.floor(total / 12);
      heightIn = total % 12;
    }
  }

  // Match current weight and goal weight
  // Patterns: "180 lb current, 170 goal", "180 now, 170 goal", "180 lb and 170 lb goal"
  const weightPatterns = [
    // Pattern: "180 lb, goal 170 lb" or "180, goal 170"
    /(\d{2,3})\s*(?:lb|lbs|pounds?)?\s*(?:current|now)?\s*,?\s*(?:goal|target)\s*(\d{2,3})\s*(?:lb|lbs|pounds?)?/,
    // Pattern: "180 and 170 goal" or "180 current and 170 goal"
    /(\d{2,3})\s*(?:lb|lbs|pounds?)?\s*(?:current|now)?\s*(?:and|&)\s*(\d{2,3})\s*(?:lb|lbs|pounds?)?\s*(?:goal|target)/,
  ];

  let currentWeight: number | null = null;
  let goalWeight: number | null = null;

  for (const pattern of weightPatterns) {
    const match = lower.match(pattern);
    if (match) {
      currentWeight = Number.parseInt(match[1], 10);
      goalWeight = Number.parseInt(match[2], 10);
      break;
    }
  }

  // Fallback: if no goal weight pattern found, just match a single weight as current
  if (currentWeight == null) {
    const singleWeightMatch = lower.match(/(\d{2,3})\s*(?:lb|lbs|pounds?)/);
    currentWeight = singleWeightMatch ? Number.parseInt(singleWeightMatch[1], 10) : null;
  }

  if (!age && heightFt == null && currentWeight == null) return null;

  return {
    value: {
      age: age ?? null,
      height_ft: heightFt ?? null,
      height_in: heightIn ?? null,
      weight_lb: currentWeight ?? null,
      goal_weight_lb: goalWeight ?? null,
    },
    label: [
      age ? `${age}y` : null,
      heightFt != null ? `${heightFt}'${heightIn ?? 0}"` : null,
      currentWeight ? `${currentWeight} lb` : null,
      goalWeight ? `→ ${goalWeight} lb` : null,
    ]
      .filter(Boolean)
      .join(" · ") || raw,
  } as const;
}

function parseBodyComposition(raw: string) {
  const s = raw.toLowerCase();
  if (/gain|build|bulk/.test(s)) return { value: "gain", label: "Gain" } as const;
  if (/lose|cut|fat/.test(s)) return { value: "lose", label: "Lose" } as const;
  if (/maintain|maint/.test(s)) return { value: "maintain", label: "Maintain" } as const;
  if (/none|not/.test(s)) return { value: "none", label: "Not a priority" } as const;
  return null;
}

function parseActivityRecovery(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return { value: trimmed, label: trimmed } as const;
}

function parseSpecificTarget(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return { value: trimmed, label: trimmed } as const;
}

function parseTrainingTime(raw: string) {
  const s = raw.toLowerCase();
  if (/morning|am|6|7|8|9/.test(s)) return { value: "morning", label: "Morning" } as const;
  if (/midday|noon|11|12|1 pm|afternoon/.test(s)) return { value: "midday", label: "Midday" } as const;
  if (/evening|pm|night|after work/.test(s)) return { value: "evening", label: "Evening" } as const;
  if (/varies|depends|mixed/.test(s)) return { value: "varies", label: "Varies" } as const;
  return null;
}

function parseExercisePreferences(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return { value: trimmed, label: trimmed } as const;
}

export function tryParseUserAnswer(id: QuestionId, raw: string) {
  const s = raw.trim();
  if (!s) return null;

  switch (id) {
    case "name": {
      // Extract name from conversational patterns like "Hey I'm akash" or "My name is alex"
      const patterns = [
        /(?:hey |hi |hello )?(?:i'm |im |i am |my name is |call me |it's |its )([a-z]+)/i,
        /^([a-z]+)(?:\s+here)?$/i, // Just "akash" or "akash here"
      ];
      for (const pattern of patterns) {
        const match = s.match(pattern);
        if (match?.[1]) {
          const name = match[1].trim();
          // Capitalize first letter
          const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
          return { value: capitalized, label: capitalized } as const;
        }
      }
      // Fallback: use as-is if it looks like a name (single word, capitalized)
      if (/^[A-Z][a-z]+$/.test(s)) {
        return { value: s, label: s } as const;
      }
      // Last resort: capitalize and use it
      const capitalized = s.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      return { value: capitalized, label: capitalized } as const;
    }
    case "primary_goal":
      return parsePrimaryGoal(s);
    case "training_context":
      return parseTrainingContext(s);
    case "body_composition":
      return parseBodyComposition(s);
    case "limitations":
      return parseLimitations(s);
    case "sport_context":
      return { value: s, label: s } as const;
    case "equipment_session":
      return parseEquipmentSession(s);
    case "frequency_commitment":
      return parseFrequencyCommitment(s);
    case "body_metrics":
      return parseBodyMetrics(s);
    case "user_age":
      return parseUserAge(s);
    case "user_height":
      return parseUserHeight(s);
    case "user_current_weight":
      return parseUserWeight(s);
    case "user_goal_weight":
      return parseUserWeight(s);
    case "activity_recovery":
      return parseActivityRecovery(s);
    case "specific_target":
      return parseSpecificTarget(s);
    case "training_time":
      return parseTrainingTime(s);
    case "exercise_preferences":
      return parseExercisePreferences(s);
    case "goal_intent":
      return parsePrimaryGoal(s);
    case "goal":
      if (/strength|power|lower/.test(s.toLowerCase()))
        return { value: "lower_body_strength", label: "Build lower-body strength" } as const;
      if (/muscle|size|hypertrophy/.test(s.toLowerCase()))
        return { value: "build_muscle", label: "Build muscle" } as const;
      if (/fitness|general|health/.test(s.toLowerCase()))
        return { value: "general_fitness", label: "General fitness" } as const;
      if (/rehab|injur|return/.test(s.toLowerCase()))
        return { value: "rehab", label: "Return from injury" } as const;
      return null;
    case "experience":
      if (/new|beginner/.test(s.toLowerCase()))
        return { value: "new", label: "New" } as const;
      if (/intermediate|some|few/.test(s.toLowerCase()))
        return { value: "intermediate", label: "Intermediate" } as const;
      if (/advanced|experienced|elite/.test(s.toLowerCase()))
        return { value: "advanced", label: "Advanced" } as const;
      return null;
    case "equipment":
      return parseEquipmentSession(s);
    case "session_length": {
      const minutes = Number.parseInt(s.match(/\d{2,3}/)?.[0] ?? "", 10);
      if (minutes) return { value: minutes, label: `${minutes} min` } as const;
      return null;
    }
    case "frequency": {
      const match = s.match(/\b[1-6]\b/);
      if (match) return { value: Number.parseInt(match[0], 10), label: match[0] } as const;
      if (/four|4\+/.test(s.toLowerCase())) return { value: 4, label: "4" } as const;
      return null;
    }
    case "constraints":
      return parseLimitations(s);
    case "intensity_ref":
      if (/rpe/.test(s.toLowerCase())) return { value: "rpe", label: "RPE" } as const;
      if (/%|percent/.test(s.toLowerCase())) return { value: "percent", label: "%1RM" } as const;
      if (/unsure|you choose|idk|not sure/.test(s.toLowerCase()))
        return { value: "unsure", label: "Not sure" } as const;
      return null;
    case "sensor_today":
      if (/yes|yep|on|sure/.test(s.toLowerCase())) return { value: "yes", label: "Yes" } as const;
      if (/no|not today|off/.test(s.toLowerCase())) return { value: "no", label: "Not today" } as const;
      return null;
    case "age_band":
    case "bodyweight":
      return null;
    default:
      return null;
  }
}

export function getSuggestionsFor(id: QuestionId): string[] {
  switch (id) {
    case "primary_goal":
      return [
        "Build strength",
        "Add muscle size",
        "Train for a sport",
        "Rehab / return",
        "General fitness",
      ];
    case "training_context":
      return [
        "New (0-6 months)",
        "Some experience (6mo-2yrs)",
        "Solid lifter (2-5 years)",
        "Very experienced (5+ years)",
      ];
    case "body_composition":
      return ["Gain muscle", "Lose fat", "Maintain", "Not a priority"];
    case "equipment_session":
      return [
        "Barbell, rack, 45 minutes",
        "Dumbbells + bands, 30 minutes",
        "Machines only, 60 minutes",
        "Bodyweight only, 25 minutes",
      ];
    case "frequency_commitment":
      return [
        "2 days per week",
        "3 days per week",
        "4 days per week",
        "5 days per week",
      ];
    case "limitations":
      return ["None", "Knees", "Hips", "Low back", "Shoulders"];
    case "sport_context":
      return ["Basketball guard", "Soccer midfield", "Track sprinter", "Powerlifting" ];
    case "training_time":
      return ["Morning", "Midday", "Evening", "Varies"];
    case "exercise_preferences":
      return ["Love squats", "Prefer machines", "Avoid lunges", "Free weights"];
    case "body_metrics":
      return [
        "32 years old, 5ft 10in, 178 lb",
        "27 years old, 5ft 6in, 145 lb",
        "41 years old, 6ft 1in, 205 lb",
      ];
    case "equipment":
      return [
        "Barbell rack and dumbbells",
        "Barbell rack only",
        "Machines only",
        "Bands and bodyweight",
        "Bodyweight only",
      ];
    case "session_length":
      return ["20 minutes", "30 minutes", "45 minutes", "60 minutes"];
    case "frequency":
      return ["2 days", "3 days", "4 days"];
    case "goal":
      return [
        "Lower-body strength",
        "Build muscle",
        "General fitness",
        "Rehab / returning",
      ];
    default:
      return [];
  }
}
