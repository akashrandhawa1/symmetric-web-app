/**
 * Barrel export for Rest Screen Coach library modules.
 * Provides clean import paths for types, client, and telemetry.
 */

// Types
export type {
  CoachRequest,
  CoachAdvice,
  TrainingAge,
  TargetRepRange,
  UserPrevDecision,
  PainFlag,
  AdviceType,
  EffortDelta,
  ReasonCode,
} from './types';

export { zCoachAdvice, trimToTwoLines, validateSafetyConstraints, REASON_CODE_LABELS } from './types';

// Client
export { getCoachAdvice, createMockAdvice, FALLBACK_ADVICE, SYSTEM_PROMPT } from './geminiClient';

// Telemetry
export type {
  UserDecision,
  CoachAdviceShownPayload,
  CoachUserDecisionPayload,
  CoachNextSetOutcomePayload,
} from './telemetry';

export {
  emitAdviceShown,
  emitUserDecision,
  emitNextSetOutcome,
  installTelemetryHandler,
  clearTelemetryHandler,
} from './telemetry';
