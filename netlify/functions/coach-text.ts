import type { Handler } from '@netlify/functions';
import { COACH_SAFE_FALLBACK } from '../../src/lib/coach/constants';
import { containsVocalDrift } from '../../src/lib/coach/buildCoachPrompt';
import { buildCoachSystemPrompt, looksLikePrescription, type CoachPhase } from '../../src/lib/coach/systemPrompt';

const MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-2.0-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const FALLBACK_MESSAGE = COACH_SAFE_FALLBACK;

const buildHeaders = () => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
});

const makeResponse = (statusCode: number, body: string) => ({
  statusCode,
  headers: buildHeaders(),
  body,
});

const makeErrorResponse = (statusCode: number, message: string) =>
  makeResponse(statusCode, JSON.stringify({ error: message }));

type CoachTextRequest = {
  system?: string;
  input?: string;
  scope?: string;
  speaker_style?: string;
  persona_tone?: string;
  phase?: CoachPhase;
};

async function callGemini(system: string, input: string) {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(MODEL_ID)}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: input }],
          },
        ],
        systemInstruction: {
          parts: [{ text: system }],
        },
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 220,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini error ${response.status}: ${detail}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const textPart = parts.find((part: any) => typeof part?.text === 'string');
  const text = typeof textPart?.text === 'string' ? textPart.text.trim() : '';
  return text;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: buildHeaders(),
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return makeErrorResponse(405, 'Method Not Allowed');
  }

  try {
    const payload: CoachTextRequest = JSON.parse(event.body || '{}');
    const rawInput = typeof payload.input === 'string' ? payload.input.trim() : '';
    if (!rawInput) {
      return makeErrorResponse(400, 'Missing input');
    }

    const phase: CoachPhase = payload.phase === 'intake' || payload.phase === 'preview' ? payload.phase : 'live';
    const system = buildCoachSystemPrompt(phase);

    let reply = await callGemini(system, rawInput);
    if (!reply) {
      reply = FALLBACK_MESSAGE;
    }

    if (phase === 'intake' || phase === 'preview') {
      let safe = reply.trim();
      if (!safe || looksLikePrescription(safe)) {
        safe = "Got it. Quick one: what’s your main focus—strength, muscle, general, or rehab?";
      }
      return makeResponse(200, JSON.stringify({ text: safe, phase }));
    }

    if (containsVocalDrift(reply)) {
      const reminderPrompt = `${rawInput}\nReminder: stay on muscles, sets, load, symmetry, or recovery.`;
      const retry = await callGemini(system, reminderPrompt);
      if (retry && !containsVocalDrift(retry)) {
        reply = retry;
      } else {
        reply = FALLBACK_MESSAGE;
      }
    }

    return makeResponse(200, JSON.stringify({ text: reply.trim(), phase }));
  } catch (error: any) {
    console.error('[coach-text] error', error);
    return makeErrorResponse(500, error?.message ?? 'SERVER_ERROR');
  }
};
