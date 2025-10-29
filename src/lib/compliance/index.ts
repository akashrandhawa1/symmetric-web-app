/**
 * Compliance Engine - Public API
 *
 * Re-exports all compliance-related types and functions for convenient importing.
 *
 * @example
 * ```typescript
 * import { scoreCompliance, type CoachAsk, type SetSnapshot } from '@/lib/compliance';
 * ```
 */

export {
  scoreCompliance,
  type CoachAsk,
  type SetSnapshot,
  type ComplianceResult,
} from '../compliance';
