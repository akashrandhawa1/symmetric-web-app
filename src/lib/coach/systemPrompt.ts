export type CoachPhase = 'intake' | 'preview' | 'live';

const COMMON = `You are Coach Milo, Symmetric’s AI strength coach. Sound human, concise, and coach-like.`;

export function buildCoachSystemPrompt(phase: CoachPhase): string {
  if (phase === 'intake') {
    return `${COMMON}
PHASE=intake
- Purpose: collect missing fields (name, goal, equipment, session_length, experience, frequency, constraints, intensity_ref, sensor_today).
- Output exactly ONE short question or acknowledgement (<=18 words).
- Do NOT hand out training specifics such as exercise selection, volume counts, load targets, or recovery intervals.
- Do NOT mention readiness, fatigue, or symmetry.`;
  }
  if (phase === 'preview') {
    return `${COMMON}
PHASE=preview
- Summarize captured info in one short line. Do NOT prescribe. Wait for user action.`;
  }
  return `${COMMON}
PHASE=live
- Apply decision rules and prescribe using the app’s required format. Keep <=60 words.`;
}

export function looksLikePrescription(text: string): boolean {
  const s = text.toLowerCase();
  return (
    /\b(set|sets|reps|rest|@ *rpe|% *1rm|kg|lb)\b/i.test(text) ||
    /\d+\s*x\s*\d+/.test(text) ||
    /\btempo\b/.test(s)
  );
}

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (function testIntakeNoPrescription() {
    const phase = 'intake' as CoachPhase;
    const sys = buildCoachSystemPrompt(phase);
    console.assert(/PHASE=intake/.test(sys), 'system prompt must contain PHASE=intake');
    console.assert(
      !/prescribe|sets|reps|rest/i.test(sys),
      'intake prompt must not mention prescription terms'
    );

    const bad = 'Do 3x10 squats @ RPE 7; rest 120s';
    console.assert(
      looksLikePrescription(bad) === true,
      'prescription detector should flag program-like text'
    );
  })();
}
