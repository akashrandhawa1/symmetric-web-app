/**
 * Convert WorkoutPlan (Gemini JSON) to athlete-facing PlanProps.
 */

import type { WorkoutPlan } from "../../services";
import type { PlanProps, EffortLevel, SimplePlanView, LoadStrategy } from "../../types/plan";
import { normalizePlan } from "./normalize";

const LOAD_COST: Record<string, number> = {
  increase: 2.5,
  heavy: 2.5,
  hold: 1.6,
  moderate: 1.6,
  decrease: 1.0,
  light: 1.0,
  technique: 0.3,
  isometric: 0.6,
  aerobic_low: 0.8,
  "n/a": 1.2,
};

const repsMultiplier = (reps: number) => {
  if (reps <= 2) return 0.7;
  if (reps <= 6) return 1.0;
  if (reps <= 10) return 1.15;
  return 1.3;
};

const rmsDropMultiplier = (band?: [number, number] | null) => {
  if (!band) return 1.0;
  const avg = (band[0] + band[1]) / 2;
  if (avg < 12) return 0.9;
  if (avg <= 20) return 1.0;
  if (avg <= 28) return 1.12;
  return 1.25;
};

const parseReps = (value: string | number | undefined): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 6;
  const range = value.match(/(\d+)\s*[\-–]\s*(\d+)/);
  if (range) return Math.round((Number(range[1]) + Number(range[2])) / 2);
  const single = value.match(/(\d+)/);
  return single ? Number(single[1]) : 6;
};

const estimateBlockCost = (block: WorkoutPlan["blocks"][number]): number => {
  const loadKey = (block.prescription.load_adjustment ?? block.loadStrategy ?? "hold") as string;
  const base = LOAD_COST[loadKey] ?? 1.6;
  const reps = parseReps(block.prescription.reps);
  const sets = typeof block.prescription.sets === "number" ? block.prescription.sets : 3;
  const cost = sets * base * repsMultiplier(reps) * rmsDropMultiplier(block.targets?.rmsDropBand as [number, number] | undefined);
  const typeAdjust = block.type === "main" ? 1.25 : block.type === "accessory" ? 1.0 : 0.75;
  return cost * typeAdjust;
};

function inferEffort(level: string, readiness: number): EffortLevel {
  if (level === "main" && readiness >= 65) return "Push";
  if (level === "main") return "Solid";
  if (level === "accessory") return "Solid";
  return "Cruise";
}

const toOneDecimal = (value: number): number =>
  Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;

const clampReadiness = (value: number): number => Math.max(0, toOneDecimal(value));

const adjustmentToLoadStrategy = (value: string | undefined): LoadStrategy => {
  switch (value) {
    case "increase":
    case "heavy":
      return "heavy";
    case "hold":
    case "moderate":
      return "moderate";
    case "decrease":
    case "light":
      return "light";
    case "technique":
      return "technique";
    case "isometric":
      return "isometric";
    case "aerobic_low":
      return "aerobic_low";
    default:
      return "moderate";
  }
};

export function convertWorkoutPlanToPlanProps(plan: WorkoutPlan): PlanProps {
  let normalized: SimplePlanView | undefined;
  try {
    const candidate = normalizePlan(plan as any);
    if (candidate.blocks.length === plan.blocks.length) {
      normalized = candidate;
    }
  } catch {
    normalized = undefined;
  }

  const blocks = [...plan.blocks];

  const buildCostPath = (start: number) => {
    const manualReadiness = blocks.map((block) => {
      const value = (block as any).readiness_after ?? (block as any).readinessAfter;
      if (typeof value === "number" && Number.isFinite(value)) {
        return clampReadiness(value);
      }
      return null;
    });

    const costs = blocks.map((block) => estimateBlockCost(block));

    const pathValues: number[] = [start];
    let current = start;
    blocks.forEach((block, index) => {
      const provided = manualReadiness[index];
      if (provided !== null) {
        current = provided;
      } else {
        const next = current - costs[index];
        current = clampReadiness(next);
      }
      pathValues.push(current);
    });

    return {
      path: pathValues,
      final: pathValues[pathValues.length - 1] ?? start,
    };
  };

  const startReadiness = normalized ? clampReadiness(normalized.start) : plan.plan_meta.readiness;
  let path = normalized
    ? (() => {
        const candidate: number[] = [clampReadiness(normalized!.start)];
        normalized!.blocks.forEach((block) => {
          const prev = candidate[candidate.length - 1];
          const afterValue = Number.isFinite(block.after) ? block.after : prev;
          candidate.push(clampReadiness(afterValue));
        });
        return candidate.length === blocks.length + 1 ? candidate : null;
      })()
    : null;

  const fallbackPath = buildCostPath(startReadiness);

  let finalPath = path ?? fallbackPath.path;
  let finalReadiness = path ? finalPath[finalPath.length - 1] ?? startReadiness : fallbackPath.final;

  const normalizedDropSum =
    normalized?.blocks.reduce((sum, block) => sum + Math.abs(block.drop ?? 0), 0) ?? 0;
  const normalizedHasChange =
    normalized &&
    (Math.abs(normalized.start - normalized.finish) > 0.25 ||
      normalizedDropSum > 0.25 ||
      normalized.blocks.some((block) => Math.abs(block.before - block.after) > 0.25));

  if (!normalizedHasChange) {
    normalized = undefined;
    finalPath = fallbackPath.path;
    finalReadiness = fallbackPath.final;
  }

  if (!normalized) {
    const totalDrop = clampReadiness(startReadiness - finalReadiness);
    const safeTotal = totalDrop > 0 ? totalDrop : 1;
    normalized = {
      mode: plan.mode ?? "strength",
      start: startReadiness,
      finish: finalReadiness,
      totalDrop,
      blocks: blocks.map((block, index) => {
        const before = finalPath[index] ?? startReadiness;
        const after = finalPath[index + 1] ?? before;
        const drop = clampReadiness(before - after);
        return {
          name: block.exercise.name,
          load: adjustmentToLoadStrategy(block.prescription.load_adjustment),
          sets: block.prescription.sets,
          reps: block.prescription.reps,
          rest_s: block.prescription.rest_s,
          before,
          after,
          drop,
          dropShare: Math.min(1, Math.max(0, drop / safeTotal)),
        };
      }),
    };
  }

  if (!finalPath.length) {
    finalPath = [startReadiness];
    finalReadiness = startReadiness;
  }

  const drops: number[] = finalPath.slice(1).map((value, index) => {
    const prev = finalPath[index] ?? value;
    return clampReadiness(prev - value);
  });

  const totalDrop = drops.reduce((sum, value) => sum + value, 0);
  if (normalized && normalized.totalDrop < 0.25 && totalDrop >= 0.25) {
    const safeTotal = totalDrop > 0 ? totalDrop : 1;
    normalized = {
      mode: plan.mode ?? "strength",
      start: startReadiness,
      finish: finalReadiness,
      totalDrop,
      blocks: blocks.map((block, index) => {
        const before = finalPath[index] ?? startReadiness;
        const after = finalPath[index + 1] ?? before;
        const drop = drops[index] ?? 0;
        return {
          name: block.exercise.name,
          load: adjustmentToLoadStrategy(block.prescription.load_adjustment),
          sets: block.prescription.sets,
          reps: block.prescription.reps,
          rest_s: block.prescription.rest_s,
          before,
          after,
          drop,
          dropShare: Math.min(1, Math.max(0, drop / safeTotal)),
        };
      }),
    };
  }

  return {
    startReadiness: startReadiness,
    finalReadiness,
    path: finalPath,
    confidence: plan.policy?.confidence ?? plan.plan_meta?.confidence ?? undefined,
    blocks: plan.blocks.map((block, index) => ({
      label:
        block.type === "main"
          ? "Main"
          : block.type === "accessory"
          ? "Accessory"
          : block.type === "primer"
          ? "Primer"
          : block.type === "finisher"
          ? "Finisher"
          : "Main",
      name: block.exercise.name,
      sets: block.prescription.sets,
      reps: block.prescription.reps,
      tempo: block.prescription.tempo,
      rest_s: block.prescription.rest_s,
      load: block.prescription.load_adjustment,
      effort: inferEffort(block.type, startReadiness),
      predictedDrop: Math.max(0, drops[index] ?? 0),
      why: block.evidence.rationale,
      ctaState: "idle",
    })),
    simple: normalized,
  };
}
