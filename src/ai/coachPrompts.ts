export const SYSTEM_COACH = `
You are a concise, evidence-aware strength coach for quadriceps training.
Use session EMG and recent history to give ONE natural line plus a concrete action.
Avoid medical advice. No emojis. Output strictly in the provided JSON schema.
`;

export function buildUserPrompt(input: {
  readiness: number; // 0–100
  deltaVsLast?: number; // e.g., +7
  metrics: { rmsDropPct: number; ror: "down" | "stable" | "up"; symmetryPct: number };
  lastSet?: { reps: number; rpe?: number };
  goal: "strength";
  constraints?: { minRest?: number; maxRest?: number };
  mode: "home" | "postSet" | "liveSet";
}) {
  // Keep short; pass only most-recent signals for low latency.
  return `
Context:
- Mode: ${input.mode}
- Readiness: ${input.readiness}${input.deltaVsLast ? ` (Δ ${input.deltaVsLast})` : ""}
- Metrics: RMS drop ${input.metrics.rmsDropPct}%, RoR ${input.metrics.ror}, Symmetry ${input.metrics.symmetryPct}%
- Last set: ${input.lastSet ? `${input.lastSet.reps} reps${input.lastSet.rpe ? `, RPE ${input.lastSet.rpe}` : ""}` : "n/a"}
- Goal: Strength (quads)

Task:
Return JSON matching the schema with:
- "line": 1 human sentence referencing the data (no fluff).
- "action": one of keep_load, add_load, reduce_load, end_session, add_set, extend_rest
- "rest_s": optional seconds if rest is relevant (respect min/max if present).

Be specific and brief. Do not include explanations or extra keys.
`;
}
