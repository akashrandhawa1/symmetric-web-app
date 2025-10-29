import { COACH_SYSTEM, COACH_SAFE_FALLBACK } from './constants';
import { resolveGeminiApiKey } from '../geminiKey';

const LOCAL_FUNCTION_PORT = 8888;

const buildFallbackEndpoint = (): string | null => {
  if (typeof window === 'undefined') return null;
  const { protocol, hostname, port } = window.location;
  if (hostname === 'localhost' && port !== String(LOCAL_FUNCTION_PORT)) {
    return `${protocol}//${hostname}:${LOCAL_FUNCTION_PORT}/.netlify/functions/coach-text`;
  }
  return null;
};

const postCoachText = async (url: string, payload: Record<string, unknown>, init?: RequestInit) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    ...init,
  });
  return response;
};

const callGeminiDirect = async (payload: Record<string, unknown>): Promise<string | null> => {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    console.warn('[callGeminiDirect] No API key found');
    return null;
  }
  console.log('[callGeminiDirect] API key found, making request...');

  const system = typeof payload.system === 'string' && payload.system.trim() ? payload.system : COACH_SYSTEM;
  const input = typeof payload.input === 'string' && payload.input.trim() ? payload.input : '';
  if (!input) {
    console.warn('[callGeminiDirect] No input provided');
    return null;
  }

  console.log('[callGeminiDirect] System prompt length:', system.length);
  console.log('[callGeminiDirect] User prompt length:', input.length);
  console.log('[callGeminiDirect] User prompt:', input);

  const model = typeof payload.model === 'string' && payload.model.trim() ? payload.model : 'gemini-2.5-flash-lite';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
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
            maxOutputTokens: 320,
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`direct_gemini_error_${response.status}:${detail}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const textPart = parts.find((part: any) => typeof part?.text === 'string');
    const text = typeof textPart?.text === 'string' ? textPart.text.trim() : '';
    return text || null;
  } catch (error) {
    console.warn('[sendCoachText] direct Gemini call failed', error);
    return null;
  }
};

export async function sendCoachText(userPrompt: string, extra?: Record<string, any>): Promise<string> {
  const payload = {
    system: COACH_SYSTEM,
    input: userPrompt,
    scope: 'quads-strength-recovery-only',
    ...(extra ?? {}),
  };

  const primaryEndpoint = '/api/gemini/coach-text';
  const fallbackEndpoint = buildFallbackEndpoint();

  const attempts: Array<{ url: string; init?: RequestInit }> = [{ url: primaryEndpoint }];
  if (fallbackEndpoint) {
    attempts.push({ url: fallbackEndpoint, init: { mode: 'cors' } });
  } else {
    attempts.push({ url: '/.netlify/functions/coach-text' });
  }

  for (const { url, init } of attempts) {
    try {
      const res = await postCoachText(url, payload, init);
      if (!res.ok) {
        if (res.status === 404) {
          continue;
        }
        throw new Error(`coach_text_failed_${res.status}`);
      }
      const data = await res.json();
      const text = typeof data?.text === 'string' ? data.text.trim() : '';
      if (text) {
        return text;
      }
    } catch (error) {
      if (attempts[attempts.length - 1].url !== url) {
        continue;
      }
      console.warn('[sendCoachText] falling back to safe message', error);
    }
  }

  console.log('[sendCoachText] attempting direct Gemini call...');
  const direct = await callGeminiDirect(payload);
  if (direct) {
    console.log('[sendCoachText] direct Gemini call succeeded:', direct);
    return direct;
  }

  console.warn('[sendCoachText] direct Gemini call returned null, using fallback');
  return COACH_SAFE_FALLBACK;
}
