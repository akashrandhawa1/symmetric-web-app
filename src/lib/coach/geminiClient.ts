/**
 * Gemini API client for the Rest Screen Coach.
 *
 * Responsibilities:
 * - Send typed requests to Gemini API with system prompt
 * - Validate responses against Zod schema
 * - Retry once on validation failure
 * - Return fallback advice on persistent errors
 * - Apply safety constraints and text truncation
 *
 * @module lib/coach/geminiClient
 */

import type { CoachRequest, CoachAdvice } from './types';
import { zCoachAdvice, trimToTwoLines, validateSafetyConstraints } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * System prompt sent to Gemini API.
 * Defines the coach's personality, decision-making policy, and output format.
 *
 * ENHANCED WITH VARIATION GUIDELINES to ensure fresh, non-repetitive feedback.
 */
export const SYSTEM_PROMPT = `You are Symmetric Strength Coach—a sharp, funny personal trainer with a science brain. Respond with exactly two conversational sentences.

VOICE:
- Sentence 1 calls out what you observed (fatigue timing, symmetry %, signal confidence) and what it means for progress or recovery.
- Sentence 2 gives the next move plus the why, tying it to strength gains, recovery protection, or joint health.
- Sound human, warm, and witty. Use contractions. Skip corporate jargon, filler, emojis, or bullet lists.
- Offer agency: invite the athlete to make the call, never bark orders.

VARIATION GUIDELINES (CRITICAL):
1. **Never Repeat Yourself**: Use different phrasings each time. Rotate through varied expressions.
   - Instead of: "Rest 90s and repeat" every time
   - Rotate: "Take 90s and go again", "Rest 90s to reload", "Give it 90s before the next round"

2. **Rotate Scientific Reasons**: Explain the "why" from different angles each time:
   - Mechanical tension: "Heavy loads create max tension on muscle fibers"
   - Motor unit recruitment: "This recruits your biggest, strongest muscle fibers"
   - Metabolic fatigue: "Short sets minimize lactate buildup for faster recovery"
   - Neural adaptation: "Teaches your nervous system to fire efficiently"
   - Recovery efficiency: "Leaves gas in the tank for tomorrow's session"
   - Form quality: "Preserves perfect form—sloppy reps build bad patterns"
   - Muscle damage: "Minimizes breakdown so you can train more frequently"

3. **Context Awareness**: If the user has previous set data, reference it:
   - "Great adjustment from your last set—this is dialed in now."
   - "You're locking in the pattern—two solid sets in a row."
   - "This is a big improvement over your last attempt."

4. **Personalization**: Occasionally add progress-based notes:
   - "You're really getting the hang of this—keep building that foundation!"
   - "This kind of consistency compounds into serious strength."
   - "Quality work deep into the session—that's next-level discipline."

FORMAT:
- Output JSON only. primary_text = sentence 1. secondary_text = sentence 2. Each sentence ≤140 characters.
- Reference concrete numbers (reps, seconds, percentages) whenever it helps clarity.
- If uncertain, default to the safest route that protects recovery.
- **VARY YOUR LANGUAGE**: No two responses should use identical phrasing.

EXAMPLES OF VARIED RESPONSES:
Good Set (3-6 reps):
- "Fatigue hit around rep 5—exactly where we want it. Rest 90s and repeat this load; you're hitting the sweet spot for strength without trashing recovery."
- "You nailed the goldilocks zone at 5 reps. Take 90s to reload, then go again—this recruits high-threshold motor units perfectly."
- "Perfect pacing—fatigue showed up right on cue at rep 5. Give it 90s before the next round; this builds strength without excessive muscle damage."

Remember: **VARY YOUR PHRASING** every single time. Use different words and scientific explanations.`;

/**
 * Fallback advice returned when API call fails or validation fails twice.
 * Prioritizes safety: suggests signal check and conservative rest.
 */
export const FALLBACK_ADVICE: CoachAdvice = {
  advice_id: 'fallback-001',
  advice_type: 'check_signal',
  primary_text: "Signal just went wobbly, so pushing now would be guesswork.",
  secondary_text: 'Check the electrode seal, rest 90s, and retry at the same effort so safety leads the way.',
  rest_seconds: 90,
  effort_delta: 0,
  add_reps: null,
  offer_swap: false,
  swap_candidate: null,
  projection: null,
  safety: {
    suppress_load_calls: true,
    end_exercise: false,
  },
  ask_reason_on_skip_or_override: false,
  confidence: 0.5,
  telemetry_tags: ['fallback', 'validation_error'],
  internal_rationale: 'Fallback triggered due to API or validation failure',
};

// ============================================================================
// API CLIENT
// ============================================================================

/**
 * Fetches coach advice from Gemini API with validation and retry logic.
 *
 * Flow:
 * 1. Send request to /api/gemini/coach with system prompt + input
 * 2. Validate response with Zod schema
 * 3. Apply safety constraints and text truncation
 * 4. On validation failure: retry once
 * 5. On persistent failure: return FALLBACK_ADVICE
 *
 * @param input - Structured coach request with user profile, session context, and telemetry
 * @returns Promise resolving to validated CoachAdvice
 */
export async function getCoachAdvice(input: CoachRequest): Promise<CoachAdvice> {
  const maxRetries = 1;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch('/api/gemini/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT,
          request: input,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Validate with Zod schema
      const parseResult = zCoachAdvice.safeParse(data);

      if (!parseResult.success) {
        console.warn('Gemini response validation failed:', parseResult.error.format());
        attempt++;
        if (attempt > maxRetries) {
          console.error('Max retries exceeded. Returning fallback advice.');
          return FALLBACK_ADVICE;
        }
        continue; // Retry
      }

      let advice: CoachAdvice = parseResult.data as CoachAdvice;

      // Apply safety constraints
      if (!validateSafetyConstraints(advice, input.set_telemetry)) {
        console.warn('Safety constraints violated. Applying fallback.');
        advice = {
          ...advice,
          effort_delta: 0,
          add_reps: null,
          safety: {
            ...advice.safety,
            suppress_load_calls: true,
          },
          telemetry_tags: [...advice.telemetry_tags, 'safety_override'],
        };
      }

      // Ensure text fits within two-line constraint
      advice = trimToTwoLines(advice);

      return advice;
    } catch (error) {
      console.error('Error calling Gemini API (attempt', attempt + 1, '):', error);
      attempt++;
      if (attempt > maxRetries) {
        console.error('Max retries exceeded. Returning fallback advice.');
        return FALLBACK_ADVICE;
      }
    }
  }

  // Should never reach here, but TypeScript requires it
  return FALLBACK_ADVICE;
}

/**
 * Utility to construct a mock advice for testing without hitting the API.
 *
 * @param overrides - Partial advice object to override defaults
 * @returns CoachAdvice object
 */
export function createMockAdvice(overrides: Partial<CoachAdvice> = {}): CoachAdvice {
  const base: CoachAdvice = {
    advice_id: 'mock-001',
    advice_type: 'rest',
    primary_text: 'Solid set—good work.',
    secondary_text: 'Rest 90s. Same effort next set.',
    rest_seconds: 90,
    effort_delta: 0,
    add_reps: null,
    offer_swap: false,
    swap_candidate: null,
    projection: null,
    safety: {
      suppress_load_calls: false,
      end_exercise: false,
    },
    ask_reason_on_skip_or_override: false,
    confidence: 0.85,
    telemetry_tags: ['mock'],
  };

  return { ...base, ...overrides };
}
