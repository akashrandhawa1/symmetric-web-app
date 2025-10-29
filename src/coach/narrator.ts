import { type CoachSummary, type NarratorInput } from './types';

const NARRATOR_ENDPOINT =
  typeof import.meta !== 'undefined'
    ? (import.meta.env as Record<string, string | undefined>).VITE_COACH_NARRATOR_ENDPOINT
    : undefined;

// Replace with real LLM implementation when available.
export async function callNarratorLLM(systemPrompt: string, input: NarratorInput): Promise<CoachSummary> {
  if (!NARRATOR_ENDPOINT) {
    return fallbackNarration(input);
  }

  try {
    const response = await fetch(NARRATOR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, input }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as CoachSummary;
    if (!data?.message || !data?.cta) {
      throw new Error('Narrator response missing required fields');
    }
    return data;
  } catch (error) {
    console.warn('[CoachDock] narrator request failed', error);
    return fallbackNarration(input);
  }
}

export const NARRATOR_SYSTEM_PROMPT = `
You are Symmetric’s personal strength coach. Use ONLY the provided plan/actions/receipts/decisionTrace.
Reply in 1–2 sentences, calm and actionable. Do not invent numbers or actions. Offer exactly one CTA.
Output JSON: {"message": "...", "cta": "...", "secondary": "..."} (secondary optional).
`;

export function fallbackNarration(input: NarratorInput): CoachSummary {
  const { plan, receipts } = input;
  const roi = receipts.roiLine ? ` ${receipts.roiLine}` : '';

  if (plan.mode === 'TRAIN') {
    const expectedSets = plan.projections?.trainBlock?.expectedSets ?? 1;
    const noun = expectedSets > 1 ? 'sets' : 'set';
    return {
      message: `Let’s ride the strength window—${expectedSets} hard ${noun} of 3–6 reps will keep the engine sharp.${roi}`,
      cta: 'Start hard set(s)',
    };
  }

  if (plan.mode === 'ACTIVE_RECOVERY') {
    return {
      message: `I’d go light right now—20–30 min easy work will spark readiness and set up tonight’s session.${roi}`,
      cta: 'Start active recovery',
    };
  }

  return {
    message: `Your body’s asking for the day—full rest now pays back tomorrow with fresher legs.${roi}`,
    cta: 'Plan tomorrow',
  };
}
