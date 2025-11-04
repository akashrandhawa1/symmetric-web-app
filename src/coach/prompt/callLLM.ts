/**
 * LLM caller wrapper for state-aware coaching system.
 *
 * This module wraps the existing Gemini client to:
 * - Call the LLM with system + user prompts
 * - Parse JSON responses into LLMReply format
 * - Handle errors gracefully with fallbacks
 * - Support both direct API and function endpoints
 */

import { LLMReply } from '../policy/types';
import { resolveGeminiApiKey } from '../../lib/geminiKey';

/**
 * Calls the LLM with system and user prompts, expecting JSON response.
 *
 * @param systemPrompt - System instructions for the LLM
 * @param userPayload - User context as JSON string
 * @returns Parsed LLMReply object
 * @throws Error if all call attempts fail
 */
export async function callLLM(systemPrompt: string, userPayload: string): Promise<LLMReply> {
  // Try direct Gemini call first
  const apiKey = resolveGeminiApiKey();
  if (apiKey) {
    try {
      const reply = await callGeminiDirect(systemPrompt, userPayload, apiKey);
      if (reply) {
        return reply;
      }
    } catch (error) {
      console.warn('[callLLM] Direct Gemini call failed:', error);
    }
  }

  // Fallback to function endpoints
  try {
    const reply = await callViaFunctionEndpoint(systemPrompt, userPayload);
    if (reply) {
      return reply;
    }
  } catch (error) {
    console.warn('[callLLM] Function endpoint call failed:', error);
  }

  // If all fails, throw
  throw new Error('All LLM call attempts failed');
}

/**
 * Calls Gemini API directly with JSON response mode.
 *
 * @param systemPrompt - System instructions
 * @param userPayload - User context JSON
 * @param apiKey - Gemini API key
 * @returns Parsed LLMReply or null on failure
 */
async function callGeminiDirect(
  systemPrompt: string,
  userPayload: string,
  apiKey: string
): Promise<LLMReply | null> {
  const model = 'gemini-2.0-flash';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
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
              parts: [{ text: userPayload }],
            },
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('[callGeminiDirect] HTTP error:', response.status);
      return null;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const textPart = parts.find((part: any) => typeof part?.text === 'string');
    const text = typeof textPart?.text === 'string' ? textPart.text.trim() : '';

    if (!text) {
      return null;
    }

    // Parse JSON response
    const parsed = JSON.parse(text) as LLMReply;
    return parsed;
  } catch (error) {
    console.error('[callGeminiDirect] Error:', error);
    return null;
  }
}

/**
 * Calls LLM via function endpoint (Netlify or local).
 *
 * @param systemPrompt - System instructions
 * @param userPayload - User context JSON
 * @returns Parsed LLMReply or null on failure
 */
async function callViaFunctionEndpoint(
  systemPrompt: string,
  userPayload: string
): Promise<LLMReply | null> {
  const endpoints = [
    '/api/gemini/coach-text',
    '/.netlify/functions/coach-text',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          input: userPayload,
          mode: 'json',
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          continue; // Try next endpoint
        }
        console.error('[callViaFunctionEndpoint] HTTP error:', response.status);
        continue;
      }

      const data = await response.json();

      // Handle different response formats
      if (data.reply && typeof data.reply === 'object') {
        return data.reply as LLMReply;
      }

      if (data.text && typeof data.text === 'string') {
        // Try parsing text as JSON
        try {
          return JSON.parse(data.text) as LLMReply;
        } catch {
          // If not JSON, construct basic reply
          return {
            hook: data.text.split('.')[0] + '.',
            action: data.text,
            action_type: 'plan',
          };
        }
      }
    } catch (error) {
      console.warn(`[callViaFunctionEndpoint] ${endpoint} failed:`, error);
      continue;
    }
  }

  return null;
}
