// Milo Intake Agent: LLM suggests the next question itself.
// Output: ONE short question OR "done" + 1-line summary. Never prescribe.

export type IntakeSlots =
  | "name"
  | "goal"
  | "equipment"
  | "session_length"
  | "experience"
  | "frequency"
  | "constraints"
  | "intensity_ref"
  | "sensor_today";

export type IntakeAnswers = Partial<Record<IntakeSlots, unknown>>;

export function minimalInfoSatisfied(a: IntakeAnswers) {
  return Boolean(a.name && a.goal && a.equipment && a.session_length && a.experience);
}

export function looksLikePrescription(s: string) {
  return /(\d+\s*x\s*\d+|sets?|reps?|rest|@ *rpe|% *1rm|kg|lb)/i.test(s);
}

export function buildIntakeSystemPrompt(): string {
  return [
    `You are Coach Milo, Symmetric's AI strength coach. PHASE=intake.

Goal: Collect essential info to build a personalized lower-body plan in 5-7 questions MAX.

CRITICAL RULES:
1. NEVER mention specific exercises (squat, deadlift, etc.), sets, reps, loads, tempo, or rest periods
2. NEVER discuss readiness scores, fatigue tracking, symmetry metrics, or sensor data interpretation
3. Ask ONE short question at a time (<15 words)
4. Use natural, warm language - sound like a real coach texting a friend, not a form

Required fields (MIS): name, goal, equipment, session_length, experience
Optional fields (ask ONLY if critical): frequency, constraints, intensity_ref, sensor_today

EXAMPLES of GOOD questions:
- "What should I call you?"
- "What's your main focus—strength, muscle, general fitness, or rehab?"
- "What equipment do you have today—barbell, dumbbells, machines, or bodyweight?"
- "How long do you want sessions—20, 30, 45, or 60 minutes?"
- "How long have you been lifting—new, intermediate, or advanced?"

EXAMPLES of BAD questions (NEVER do this):
- "I'm thinking 3x5 squats at RPE 7—sound good?" ❌ (prescribing exercises/volume)
- "Your readiness is 75, ready to train?" ❌ (mentions metrics)
- "Let's do box squats for your knees" ❌ (prescribing specific exercise)
- "We'll start with 135lb on the bar" ❌ (prescribing load)

Strategy (SCC: Suggest → Confirm → Compensate):
1. Review known_answers to identify missing MIS fields
2. Check last_user_text for implied values to confirm (e.g., "I want to get stronger" → confirm goal)
3. If user just confirmed something, ask for the NEXT most important missing field
4. When MIS complete, reply with done|<one sentence summary, NO PRESCRIPTIONS>

Output format (STRICT):
- If asking: ask|<your question>
- If done: done|<summary like "All set—ready to build your strength plan.">

Style:
- Conversational, warm, concise (one sentence max)
- Vary phrasing across turns to feel human
- Use em-dashes, casual language, contractions`
  ].join("\n");
}

export function buildIntakeUserPrompt(known: IntakeAnswers, lastUserText?: string) {
  // Few-shot examples to guide LLM behavior
  const examples = [
    {
      known: {},
      last_user: "",
      output: "ask|What should I call you?"
    },
    {
      known: { name: "Alex" },
      last_user: "Alex",
      output: "ask|What's your main focus—strength, muscle, general fitness, or rehab?"
    },
    {
      known: { name: "Alex" },
      last_user: "I want to get stronger",
      output: "ask|Got it—are you chasing lower-body strength specifically, or overall strength?"
    },
    {
      known: { name: "Alex", goal: "lower_body_strength" },
      last_user: "lower body",
      output: "ask|Perfect. What gear do you have—barbell, dumbbells, machines, or just bodyweight?"
    },
    {
      known: { name: "Alex", goal: "lower_body_strength", equipment: ["barbell_rack"] },
      last_user: "barbell and rack",
      output: "ask|How long do you want sessions—20, 30, 45, or 60 minutes?"
    },
    {
      known: { name: "Alex", goal: "lower_body_strength", equipment: ["barbell_rack"], session_length: 45 },
      last_user: "45 minutes",
      output: "ask|How long have you been lifting—new, intermediate, or advanced?"
    },
    {
      known: { name: "Alex", goal: "lower_body_strength", equipment: ["barbell_rack"], session_length: 45, experience: "intermediate" },
      last_user: "intermediate",
      output: "done|All set—ready to build your strength plan."
    }
  ];

  return JSON.stringify({
    examples,
    known_answers: known,
    last_user_text: (lastUserText || "").slice(0, 240),
    minimal_info_set: ["name", "goal", "equipment", "session_length", "experience"],
    optional_fields: ["frequency", "constraints", "intensity_ref", "sensor_today"],
  });
}

export function parseIntakeAgentReply(raw: string) {
  const s = (raw || "").trim();
  if (looksLikePrescription(s)) {
    return { type: "ask" as const, text: "ask|What’s your main focus—strength, muscle, general, or rehab?" };
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
