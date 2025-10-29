import type { WhatIfNumeric, WhatIfQual, WhatIfContext, WhatIfHistory } from "../types.whatif";

const now = () => Date.now();

function recentlyShown(history: WhatIfHistory, key: string, hours = 36) {
  const cutoff = now() - hours * 3600 * 1000;
  return history.shown.some((item) => item.action_or_kind === key && item.ts >= cutoff);
}

function isActionableMinutes(ctx: WhatIfContext, needed: number) {
  const avail = ctx.minutesAvailable ?? 30;
  return avail >= needed;
}

/** === Numeric path rules === */
export function shouldShowNumeric(
  ctx: WhatIfContext,
  res: WhatIfNumeric,
  history: WhatIfHistory
): boolean {
  const { confidence: c, effects: e, action_id: key } = res;
  if (c < 0.5) return false;

  const material =
    (e.recovery_hours_saved ?? 0) >= 3 ||
    (e.readiness_delta_pts ?? 0) >= 2 ||
    (e.next_session_quality_prob ?? 0) >= 0.12;
  if (!material) return false;

  const need =
    key === "active_recovery" ? 20 :
    key === "walk_after_workout" ? 15 :
    key === "sleep_early" ? 30 :
    10;
  if (!isActionableMinutes(ctx, need) && key !== "sleep_early") return false;

  if (ctx.safeMode === "FULL_REST" && !["sleep_early", "protein_target"].includes(key)) {
    return false;
  }

  if (recentlyShown(history, key, 36)) return false;
  return true;
}

/** === Qualitative (LLM-only) rules === */
export function shouldShowQual(
  ctx: WhatIfContext,
  wf: WhatIfQual,
  history: WhatIfHistory
): boolean {
  if (wf.impact === "LOW") return false;
  if (wf.impact === "MEDIUM" && wf.confidence < 0.5) return false;
  if (wf.impact === "HIGH" && wf.confidence < 0.5) return false;

  const title = wf.title.toLowerCase();
  const need =
    /zone-2|walk/.test(title) ? 20 :
    /mobility|breathing/.test(title) ? 10 :
    /sleep/.test(title) ? 30 :
    10;
  if (!isActionableMinutes(ctx, need) && wf.kind !== "sleep_early") return false;

  if (ctx.safeMode === "FULL_REST" && wf.kind === "unilateral_control") return false;

  if (recentlyShown(history, wf.kind, 36)) return false;
  return true;
}

export function recordShown(history: WhatIfHistory, key: string) {
  history.shown.push({ action_or_kind: key, ts: now() });
  history.accepted[key] = (history.accepted[key] ?? 0) + 1;
}

export function createHistory(): WhatIfHistory {
  return { shown: [], accepted: {} };
}
