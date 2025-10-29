import { COACH_PERSONA } from './constants';

export const VOCAL_RE =
  /\b(vocal|sing(ing)?|throat|larynx|projection|resonance|diaphragm|strengthen your voice)\b/i;
export const containsVocalDrift = (t: string) => VOCAL_RE.test(t);

type Ctx = {
  readiness: number;
  phase: 'rest' | 'active' | 'idle';
  goal?: 'strength' | 'recovery';
  symmetryPct?: number;
  fatiguePct?: number;
  nextExercise?: string;
  parts: string[];
  recentEvents?: string;
  userUtterance?: string;
};

export function buildCoachUserPrompt(ctx: Ctx) {
  const trimmed = (ctx.userUtterance ?? '').trim();
  if (ctx.phase === 'active') {
    return [
      `Context: phase=active; readiness=${ctx.readiness}; goal=${ctx.goal ?? 'strength'}`,
      `Athlete just said: "${trimmed || '...'}"`,
      `Coach reply (one line, defer coaching until rest):`,
    ].join('\n');
  }
  return [
    `Context:`,
    `- phase=${ctx.phase}; readiness=${ctx.readiness}; goal=${ctx.goal ?? 'strength'}`,
    ctx.symmetryPct != null ? `- symmetry=${ctx.symmetryPct}%` : undefined,
    ctx.fatiguePct != null ? `- fatigue=${ctx.fatiguePct}%` : undefined,
    ctx.nextExercise ? `- next_exercise=${ctx.nextExercise}` : undefined,
    ...(ctx.parts || []).map((line) => `- ${line}`),
    ctx.recentEvents ? `Recent events:\n${ctx.recentEvents}` : undefined,
    '',
    `Persona tone: ${COACH_PERSONA.persona_tone} (speaker_style="${COACH_PERSONA.speaker_style}")`,
    `Constraints: ≤3 sentences, ≤100 words. No lists/markdown. Be specific and actionable.`,
    `Safety: never discuss singing/vocal training; scope = muscles/sets/recovery.`,
    '',
    `Athlete just said: "${trimmed || '...'}"`,
    '',
    `Coach reply:`,
  ]
    .filter(Boolean)
    .join('\n');
}
