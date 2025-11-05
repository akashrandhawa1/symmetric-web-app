// Milo Intake Agent tuned for the 7-question flow.
// Output: ONE short question via "ask|..." or "done|..." summary.

export type IntakeSlots =
  | "name"
  | "primary_goal"
  | "training_context"
  | "equipment_session"
  | "frequency_commitment"
  | "body_metrics"
  | "limitations"
  | "sport_context";

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

Goal: Collect the essentials in <=7 questions to build a lower-body training plan.

Seven-question blueprint:
1. name
2. primary_goal (strength, muscle, sport, rehab, general)
3. training_context (experience level)
4. equipment_session (equipment + session minutes)
5. frequency_commitment (days per week + timeframe if mentioned)
6. body_metrics (AGE in years, HEIGHT in feet + inches, WEIGHT in pounds)
7. conditional follow-up: limitations (if rehab/injury) OR sport_context (if goal involves sport)

Rules:
- ONE short question per turn (<18 words), natural and warm.
- NEVER prescribe exercises, sets, reps, loads, tempo, or readiness metrics.
- Respect casual tone: contractions, em dashes, conversational phrasing.
- If the user already supplied a value, confirm it and move to the next slot.
- For body_metrics, demand exact numbers (e.g., "32, 5ft 10in, 178 lb").
- Keep questions human: no bullet lists, no JSON, no form-speak.

Output format (STRICT):
- Asking:  ask|<question>
- Finished: done|<short celebratory summary>

Fallback behaviour:
- If unsure which slot is next, default to the earliest missing required slot.
- If sport goal detected, ask sport_context once (position/role).
- If rehab goal detected, ask limitations once.

Reminders:
- Vary language; feel like a real coach, not a script.
- Keep questions under 18 words and under 90 characters.
- No emojis unless user uses them first.`;
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
      output: "ask|Akash, what’s the main focus—strength, muscle, sport, rehab, or general fitness?",
    },
    {
      known: { name: "Akash", primary_goal: "strength" },
      last_user: "Strength and a bit of explosiveness",
      output: "ask|Got it. How would you describe your lifting experience—new, some experience, solid, or very experienced?",
    },
    {
      known: { name: "Akash", primary_goal: "strength", training_context: "solid_lifter" },
      last_user: "Been lifting for 3 years",
      output: "ask|Nice. What equipment do you have ready and how long can each session run?",
    },
    {
      known: {
        name: "Akash",
        primary_goal: "strength",
        training_context: "solid_lifter",
        equipment_session: { equipment: ["barbell", "rack"], session_minutes: 45 },
      },
      last_user: "Barbell, rack, 45 minutes sessions",
      output: "ask|Perfect. How many days per week can you train, and for how many weeks are you planning?",
    },
    {
      known: {
        name: "Akash",
        primary_goal: "strength",
        training_context: "solid_lifter",
        equipment_session: { equipment: ["barbell", "rack"], session_minutes: 45 },
        frequency_commitment: { days_per_week: 3, focus_weeks: 6 },
      },
      last_user: "3 days a week for the next 6 weeks",
      output: "ask|Quick stats check—what’s your age, height (feet/inches), and current weight in pounds?",
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
      last_user: "32 years old, 5ft 10in, 178 lb",
      output: "done|All set—ready to engineer your strength block."
    }
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
    return { type: "ask" as const, text: "ask|Quick redo—can you share that without sets or loads?" };
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
