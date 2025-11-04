// Milo Intake Agent: LLM suggests the next question itself.
// Output: ONE short question OR "done" + 1-line summary. Never prescribe.

export type IntakeSlots =
  | "name"
  // OPTIMIZED SLOTS (7-question flow)
  | "primary_goal"
  | "training_context"
  | "limitations"
  | "sport_context"
  | "equipment_session"
  | "frequency_commitment"
  // LEGACY SLOTS (backward compatibility)
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
  // OPTIMIZED: Check new 5-question minimum
  const hasOptimized = Boolean(
    a.name &&
    a.primary_goal &&
    a.training_context &&
    a.equipment_session &&
    a.frequency_commitment
  );

  // LEGACY: Support old 5-question format
  const hasLegacy = Boolean(
    a.name &&
    a.goal &&
    a.equipment &&
    a.session_length &&
    a.experience
  );

  return hasOptimized || hasLegacy;
}

export function looksLikePrescription(s: string) {
  return /(\d+\s*x\s*\d+|sets?|reps?|rest|@ *rpe|% *1rm|kg|lb)/i.test(s);
}

export function buildIntakeSystemPrompt(): string {
  return `You are Coach Milo, Symmetric's AI strength coach.

PHASE: Intake conversation
GOAL: Build rapport and gather essentials for a personalized plan in 5-7 questions

CONVERSATION RULES:
1. ONE question at a time, max 15 words
2. Warm, conversational, like texting a friend
3. NEVER mention: specific exercises, sets, reps, loads, tempo, readiness scores, sensor metrics
4. Vary your phrasing—don't sound robotic
5. Use em-dashes, contractions, casual language

REQUIRED INFO (MIS):
- name: What to call them
- primary_goal: Why they're here (strength, muscle, sport, rehab, general)
- training_context: Experience level (new, intermediate, advanced, expert)
- equipment_session: What they have + time available
- frequency_commitment: Days/week + duration

OPTIONAL INFO (ask ONLY if critical):
- limitations: Injuries, pain, mobility issues (ALWAYS ask if goal=rehab)
- sport_context: Sport details (ONLY if goal=sport)

SMART BEHAVIOR:
- If user volunteers info (e.g., "I play basketball"), CONFIRM it instead of re-asking
  Example: User: "I want to jump higher for basketball"
  You: "Got it—building explosive power for basketball. What position?" ✅
  NOT: "What's your goal?" (you already know!)

- If answer is vague, ask ONE clarifying follow-up
  Example: User: "I want to get stronger"
  You: "Nice—stronger for everyday life, a sport, or just overall power?"

- If user gives multi-part answer, extract ALL info before asking next
  Example: User: "I'm new, have dumbbells, 30min sessions"
  You: [extract: experience=new, equipment=dumbbells, session=30min]
  Next: "Perfect. How many days a week works for you?"

BRANCHING LOGIC:
IF primary_goal includes "sport" → ask sport_context
IF primary_goal includes "injury/rehab" → ask limitations
IF training_context = "new" → emphasize form cues in plan
IF equipment includes "bodyweight only" → adjust exercise library

OUTPUT FORMAT:
ask|<your question>
done|Ready to build your plan, <name>—let's make it happen.

TONE EXAMPLES:
✅ "What should I call you?"
✅ "Nice—what brings you here today?"
✅ "Got it. What equipment do you have?"
✅ "How much time per session works for you?"
✅ "Awesome. How many days a week can you train?"

❌ "Please provide your fitness objectives" (too formal)
❌ "I need to know your equipment availability" (robotic)
❌ "Understood. Proceeding to next query." (AI-speak)

Remember: You're a coach, not a form. Be human.`;
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
