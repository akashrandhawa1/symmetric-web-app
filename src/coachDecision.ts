// Save a coach decision (test-friendly, no ESM deps)
export function saveCoachDecision({ sessionId, setIdx, phase, suggestionId, why }: {
  sessionId: string,
  setIdx?: number,
  phase: "post_set" | "end",
  suggestionId: string,
  why: string
}) {
  // TODO: Implement actual persistence (API, localStorage, etc)
  // For now, just log
  console.log("saveCoachDecision", { sessionId, setIdx, phase, suggestionId, why });
}
