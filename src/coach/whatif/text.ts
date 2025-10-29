import type { WhatIfNumeric } from "../types.whatif";

/** Convert numeric result to a tiny pill; hedge if confidence < 0.7 (should be filtered already). */
export function numericToSecondary(res: WhatIfNumeric): string | null {
  const { effects: e, confidence: c } = res;
  const hedge = c < 0.7 ? "likely " : "";

  if ((e.recovery_hours_saved ?? 0) >= 3) {
    return `${hedge}saving about ${Math.round(e.recovery_hours_saved!)}h of recovery`;
  }
  if ((e.readiness_delta_pts ?? 0) >= 2) {
    return `${hedge}boosting readiness for the next lift`;
  }
  if ((e.next_session_quality_prob ?? 0) >= 0.12) {
    return `${hedge}improving next-session quality odds`;
  }
  return null;
}

/** Qualitative path: the LLM should already produce a short clause; allow pass-through. */
export function qualToSecondary(clause: string | null | undefined) {
  if (!clause) return null;
  const trimmed = clause.trim();
  return trimmed.length > 0 ? trimmed : null;
}
