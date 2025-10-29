export type Plan = {
  mode: "strength" | "readiness_training";
  blocks: Array<{
    exerciseId: string;
    displayName: string;
    loadStrategy:
      | "heavy"
      | "moderate"
      | "light"
      | "technique"
      | "isometric"
      | "aerobic_low";
    sets: number;
    reps: number | string;
    restSec: number;
    tempo?: string;
    notes?: string;
    targets?: {
      rmsDropBand?: [number, number];
      rorCue?: string;
      symmetryMin?: number;
    };
  }>;
  projected: { readinessBefore: number; readinessAfter: number; delta: number };
  policy?: any;
  rationale?: string;
};

const parseReps = (r: number | string) => {
  if (typeof r === "number") return r;
  const s = String(r);
  const range = s.match(/(\d+)\s*[\-–]\s*(\d+)/);
  if (range) return Math.round((+range[1] + +range[2]) / 2);
  const single = s.match(/\b(\d+)\b/);
  return single ? +single[1] : 4;
};

const SET_COST: Record<
  NonNullable<Plan["blocks"][number]["loadStrategy"]>,
  number
> = {
  heavy: 2.5,
  moderate: 1.6,
  light: 1.0,
  technique: 0.3,
  isometric: 0.6,
  aerobic_low: 0.8,
};

const repsMultiplier = (reps: number) => {
  if (reps <= 2) return 0.7;
  if (reps <= 6) return 1.0;
  if (reps <= 10) return 1.15;
  return 1.3;
};

const rmsDropMultiplier = (band?: [number, number]) => {
  if (!band) return 1.0;
  const avg = (band[0] + band[1]) / 2;
  if (avg < 12) return 0.9;
  if (avg <= 20) return 1.0;
  if (avg <= 28) return 1.12;
  return 1.25;
};

export function estimatePlanCost(plan: Plan): number {
  let total = 0;
  for (const b of plan.blocks) {
    const reps = parseReps(b.reps);
    const base = SET_COST[b.loadStrategy] ?? 1.2;
    total +=
      b.sets * base * repsMultiplier(reps) * rmsDropMultiplier(b.targets?.rmsDropBand);
  }
  return Math.round(total * 10) / 10;
}

export function validateAndFixPlan(raw: Plan): Plan {
  const before = raw.projected?.readinessBefore ?? 60;
  const cost = estimatePlanCost(raw);
  const after = Math.max(0, Math.round((before - cost) * 10) / 10);

  let plan: Plan = {
    ...raw,
    projected: {
      readinessBefore: before,
      readinessAfter: after,
      delta: +(after - before).toFixed(1),
    },
  };

  if (plan.mode === "strength") {
    for (const b of plan.blocks) {
      if (!b.targets) b.targets = {};
      b.targets.symmetryMin = Math.max(90, b.targets.symmetryMin ?? 90);
    }
  }

  return plan;
}
