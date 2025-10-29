/**
 * API endpoint stub for Gemini Coach.
 *
 * This is a mock/stub implementation that returns canned responses when MOCK_COACH=1.
 * TODO: Wire this to the actual Gemini API endpoint for production use.
 *
 * In a real Vite app, this would be implemented as a server-side endpoint using:
 * - Vite's proxy configuration (vite.config.ts)
 * - Or a separate Express/Fastify server
 * - Or Next.js API routes if migrating to Next
 *
 * @module api/gemini/coach
 */

import type { CoachRequest, CoachAdvice } from '@/lib/coach/types';
import { inWindowResponse } from '@/mocks/coachFixtures';

/**
 * Mock handler that returns canned valid responses.
 * Set MOCK_COACH=1 to use this instead of hitting the real API.
 */
export async function handleCoachRequest(
  systemPrompt: string,
  request: CoachRequest
): Promise<CoachAdvice> {
  // In mock mode, return a canned response
  if (process.env.MOCK_COACH === '1') {
    console.log('[Mock] Returning canned coach response');
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return inWindowResponse;
  }

  // TODO: Implement real Gemini API call here
  // Example implementation structure:
  //
  // const response = await fetch('https://generativelanguage.googleapis.com/v1beta/...', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-goog-api-key': process.env.GEMINI_API_KEY || '',
  //   },
  //   body: JSON.stringify({
  //     contents: [{
  //       parts: [{
  //         text: `${systemPrompt}\n\nUser request:\n${JSON.stringify(request, null, 2)}`
  //       }]
  //     }],
  //     generationConfig: {
  //       temperature: 0.7,
  //       topP: 0.9,
  //       responseSchema: { ... }, // Pass Zod schema as JSON Schema
  //     }
  //   })
  // });
  //
  // const data = await response.json();
  // return data.candidates[0].content.parts[0].text; // Parse JSON from text

  throw new Error(
    'Real Gemini API not implemented yet. Set MOCK_COACH=1 to use mock responses.'
  );
}

/**
 * Express-style route handler (for reference if using server framework).
 * This would be mounted at POST /api/gemini/coach
 */
export async function POST(req: { body: { systemPrompt: string; request: CoachRequest } }) {
  try {
    const { systemPrompt, request } = req.body;

    if (!systemPrompt || !request) {
      return {
        status: 400,
        body: { error: 'Missing systemPrompt or request in body' },
      };
    }

    const advice = await handleCoachRequest(systemPrompt, request);

    return {
      status: 200,
      body: advice,
    };
  } catch (error) {
    console.error('Error in coach API:', error);
    return {
      status: 500,
      body: { error: 'Internal server error' },
    };
  }
}
