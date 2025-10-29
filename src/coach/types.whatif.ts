export type CoachMode = "TRAIN" | "ACTIVE_RECOVERY" | "FULL_REST";

/** Numeric (server-projected) result */
export type WhatIfNumeric = {
  action_id:
    | "walk_after_workout"
    | "active_recovery"
    | "cooldown_mobility"
    | "sleep_early"
    | "protein_target"
    | string;
  confidence: number; // 0..1
  effects: {
    recovery_hours_saved: number | null;
    readiness_delta_pts: number | null;
    next_session_quality_prob: number | null;
  };
};

/** Qualitative (LLM-only) */
export type WhatIfQual = {
  kind:
    | "walk"
    | "zone2"
    | "mobility"
    | "unilateral_control"
    | "sleep_early"
    | "protein"
    | "breathing"
    | "hydration"
    | string;
  impact: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  title: string;
};

/** Minimal context needed for gating */
export type WhatIfContext = {
  safeMode: CoachMode;
  minutesAvailable?: number;
  hoursSinceLastSameMuscle?: number | null;
};

/** Simple show-history for deduplication */
export type WhatIfHistory = {
  shown: Array<{ action_or_kind: string; ts: number }>;
  accepted: Record<string, number>;
};

/** Qualitative payload returned by LLM */
export type WhatIfQualPayload = WhatIfQual & {
  clause?: string | null;
};
