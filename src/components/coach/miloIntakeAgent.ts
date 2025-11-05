// Milo Intake Agent: guides the 7-question core intake with optional follow-ups.

export type IntakeSlots =
  | "name"
  | "primary_goal"
  | "training_context"
  | "equipment_session"
  | "frequency_commitment"
  | "body_metrics"
  | "limitations"
  | "sport_context"
  | "body_composition"
  | "activity_recovery"
  | "specific_target"
  | "training_time"
  | "exercise_preferences";

export type IntakeAnswers = Partial<Record<IntakeSlots, unknown>>;

const REQUIRED_SLOTS: IntakeSlots[] = [
  "name",
  "primary_goal",
  "training_context",
  "equipment_session",
  "frequency_commitment",
  "body_metrics",
];

export function minimalInfoSatisfied(a: IntakeAnswers) {
  return REQUIRED_SLOTS.every((slot) => Boolean(a[slot]));
}

export function looksLikePrescription(s: string) {
  return /(\d+\s*x\s*\d+|sets?|reps?|rest|@ *rpe|% *1rm|kg|lb\b(?!s on scale))/i.test(s);
}

export function buildIntakeSystemPrompt(): string {
  return `You are Coach Milo, Symmetric's AI strength coach. PHASE=intake.

Core objective: Gather the essentials in ≤7 questions:
1. name
2. primary_goal (strength, muscle, sport, rehab, general)
3. training_context (experience level)
4. equipment_session (equipment + session minutes)
5. frequency_commitment (days/week + timeframe if given)
6. body_metrics (age, height in feet+inches, weight in pounds)
7. context follow-up: limitations (if rehab/injury) or sport_context (if sport goal)

Optional add-ons (ask only if still missing after the core set):
- body_composition, activity_recovery, specific_target, training_time, exercise_preferences

Rules:
- ONE short question per turn (<18 words) in warm, human language.
- Never prescribe exercises, sets, reps, loads, tempo, or readiness metrics.
- When collecting body_metrics, demand exact numbers (e.g., "32, 5ft 10in, 178 lb").
- If the user already gave a value, confirm it quickly and progress.
- Vary phrasing—sound like a real coach texting a friend.
- Output format: ask|<question> or done|<celebratory summary>. No extra text.

Fallback behaviour:
- If uncertain, ask for the earliest missing required slot.
- For sport/rehab goals, remember to grab sport_context or limitations.
- Keep questions one sentence, no bullet lists, no JSON.
`;
}

export function buildIntakeUserPrompt(known: IntakeAnswers, lastUserText?: string) {
  const examples = [
    {
      known: {},
      last_user: "",
      output: "ask|What should I call you?",
    },
    {
      known: { name: "Akash" },
      last_user: "Akash",
      output: "ask|Akash, what’s the big focus—strength, muscle, sport, rehab, or general fitness?",
    },
    {
      known: { name: "Akash", primary_goal: "strength" },
      last_user: "Strength and power",
      output: "ask|How would you describe your lifting experience—new, some experience, solid, or very experienced?",
    },
    {
      known: { name: "Akash", primary_goal: "strength", training_context: "solid_lifter" },
      last_user: "About 3 years consistently",
      output: "ask|Nice. What equipment do you have ready, and how long can each session run?",
    },
    {
      known: {
        name: "Akash",
        primary_goal: "strength",
        training_context: "solid_lifter",
        equipment_session: { equipment: ["barbell", "rack"], session_minutes: 45 },
      },
      last_user: "Barbell, rack, usually 45 minute sessions",
      output: "ask|Perfect. How many days per week can you train, and for how many weeks?",
    },
    {
      known: {
        name: "Akash",
        primary_goal: "strength",
        training_context: "solid_lifter",
        equipment_session: { equipment: ["barbell", "rack"], session_minutes: 45 },
        frequency_commitment: { days_per_week: 3, focus_weeks: 6 },
      },
      last_user: "3 days a week for 6 weeks",
      output: "ask|Great. Quick stats—age, height (feet/inches), and current weight in pounds?",
    },
    {
      known: {
        name: "Akash",
        primary_goal: "strength",
        training_context: "solid_lifter",
        equipment_session: { equipment: ["barbell", "rack"], session_minutes: 45 },
        frequency_commitment: { days_per_week: 3, focus_weeks: 6 },
        body_metrics: { age: 32, height_ft: 5, height_in: 10, weight_lb: 178 },
      },
      last_user: "32, 5ft 10in, 178 lb",
      output: "done|All set—ready to build your strength block.",
    },
  ];

  return JSON.stringify({
    examples,
    known_answers: known,
    last_user_text: (lastUserText || "").slice(0, 240),
    minimal_info_set: REQUIRED_SLOTS,
  });
}

export function parseIntakeAgentReply(raw: string) {
  const s = (raw || "").trim();
  if (looksLikePrescription(s)) {
    return { type: "ask" as const, text: "ask|Let’s restate that without sets or loads." };
  }
  const match = s.match(/^(ask|done)\s*\|\s*(.+)$/i);
  if (!match) {
    return { type: "ask" as const, text: "ask|What should I call you?" };
  }
  const type = match[1].toLowerCase() as "ask" | "done";
  const text = `${type}|${match[2]}`;
  return { type, text };
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (function sanityIntakeAgent() {
    const sys = buildIntakeSystemPrompt();
    console.assert(/PHASE=intake/.test(sys), "Intake agent must declare PHASE=intake");
    console.assert(
      !/sets|reps|rest|@ *rpe|% *1rm/i.test(sys),
      "Intake prompt must not invite prescriptions"
    );
  })();
}
