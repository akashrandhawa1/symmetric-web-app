/**
 * Mock API server plugin for Vite development.
 *
 * Intercepts /api/gemini/coach requests and returns fixture responses
 * without hitting the real Gemini API.
 *
 * @module api/gemini/mockServer
 */

import type { Plugin } from 'vite';
import type { CoachRequest } from '../../lib/coach/types.js';
import {
  allFixtures,
  inWindowResponse,
  earlyFatigueResponse,
  noFatigueResponse,
  painFlagResponse,
  lowSignalResponse,
} from '../../mocks/coachFixtures.js';
import { COACH_SAFE_FALLBACK } from '../../lib/coach/constants.js';

/**
 * Vite plugin that provides a mock API endpoint for coach requests.
 * Intelligently matches request telemetry to appropriate fixtures.
 */
interface MockCoachOptions {
  enabled?: boolean;
}

export function mockCoachApiPlugin(options: MockCoachOptions = {}): Plugin {
  const enabled = options.enabled ?? true;
  return {
    name: 'mock-coach-api',
    configureServer(server) {
      if (!enabled) {
        return;
      }
      server.middlewares.use('/api/gemini/coach-text', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}') as {
              input?: string;
              scope?: string;
            };
            const input = typeof payload.input === 'string' ? payload.input.trim() : '';

            const reply = buildMockCoachTextReply(input);

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ text: reply }));
          } catch (error) {
            console.error('Error in mock coach-text API:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
      });

      server.middlewares.use('/api/gemini/coach', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { request } = JSON.parse(body) as { request: CoachRequest };

            // Select fixture based on telemetry
            const response = selectFixtureResponse(request);

            // Simulate network delay
            setTimeout(() => {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(response));
            }, 600);
          } catch (error) {
            console.error('Error in mock coach API:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
      });
    },
  };
}

function buildMockCoachTextReply(input: string): string {
  if (!input) {
    return COACH_SAFE_FALLBACK;
  }

  const normalized = input.toLowerCase();
  if (normalized.includes('load') || normalized.includes('weight')) {
    return 'Ride a smooth 70% of your top set for 3 controlled triples—keep tempo crisp and watch symmetry.';
  }
  if (normalized.includes('warm') || normalized.includes('warmup') || normalized.includes('warm-up')) {
    return 'Prime the quads with 5 slow tempo bodyweight squats and a 30-second wall sit before you touch the bar.';
  }
  if (normalized.includes('recovery') || normalized.includes('rest')) {
    return 'Stack a 12-minute bike spin at RPE 4 with hip flexor openers—light moves, just enough to flush fatigue.';
  }
  if (normalized.includes('tempo')) {
    return 'Lock a 3-1-1 tempo: glide down for three, hold the pocket, then fire up. That keeps quads loaded without dumping form.';
  }

  return 'Keep today’s set snappy—3 x 6 front squats @ RPE 7, focus on knee drive and brace between reps.';
}

/**
 * Selects an appropriate fixture response based on request telemetry.
 * Uses heuristics to match the scenario to the best fixture.
 */
function selectFixtureResponse(request: CoachRequest) {
  const { set_telemetry } = request;

  // Pain flag present → pain response
  if (set_telemetry.pain_flag > 0) {
    return painFlagResponse;
  }

  // Low signal confidence → signal check response
  if (set_telemetry.signal_confidence < 0.7) {
    return lowSignalResponse;
  }

  // Early fatigue (fatigue rep < 6) → reduce effort
  if (
    set_telemetry.fatigue_rep !== null &&
    set_telemetry.fatigue_rep < 6
  ) {
    return earlyFatigueResponse;
  }

  // No fatigue detected → increase effort
  if (set_telemetry.fatigue_rep === null && set_telemetry.rep_count >= 8) {
    return noFatigueResponse;
  }

  // Default: in-window response
  return inWindowResponse;
}
