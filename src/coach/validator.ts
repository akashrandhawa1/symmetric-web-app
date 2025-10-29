/**
 * Coach Response Validation
 *
 * Zod schemas for strict validation of LLM output.
 */

import { z } from 'zod';
import type { CoachJSON } from './types';

const WhatIfSchema = z.object({
  kind: z.string(),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  confidence: z.number().min(0).max(1),
  title: z.string(),
  clause: z.string().optional().nullable(),
});

export const SuggestionSchema = z.object({
  type: z.literal('suggestion'),
  mode: z.enum(['TRAIN', 'ACTIVE_RECOVERY', 'FULL_REST']),
  message: z.string().min(4).max(240),
  cta: z.string().min(2).max(60),
  secondary: z.string().max(160).optional(),
  science: z.string().max(160).optional(),
  what_if: WhatIfSchema.optional(),
});

export const QuestionSchema = z.object({
  type: z.literal('question'),
  message: z.string().min(4).max(140),
});

export const CoachResponseSchema = z.union([SuggestionSchema, QuestionSchema]);

/**
 * Validates LLM output against schema
 * @throws ZodError if invalid
 */
export function validateCoachJSON(raw: unknown): CoachJSON {
  return CoachResponseSchema.parse(raw);
}

/**
 * Safe validation that returns error details
 */
export function safeValidateCoachJSON(raw: unknown):
  | { success: true; data: CoachJSON }
  | { success: false; error: string } {
  const result = CoachResponseSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
  };
}
