import type { SimplePlanView, LoadStrategy } from "@/types/plan";

type RawBlock = {
  label?: string;
  type?: string;
  exercise?: { id?: string; name?: string };
  displayName?: string;
  prescription?: {
    sets?: number;
    reps?: string | number;
    rest_s?: number;
    restSec?: number;
    load_adjustment?: string;
  };
  loadStrategy?: LoadStrategy;
  readiness_before?: number;
  readiness_after?: number;
  block_cost?: number;
};

type RawPlan = {
  mode: "strength" | "readiness_training" | "off_day";
  blocks?: RawBlock[];
  projected?: { readinessBefore?: number; readinessAfter?: number; delta?: number };
  plan_meta?: { readiness?: number; readinessAfter?: number };
};

const normaliseLoad = (value: string | undefined): LoadStrategy => {
  const lower = (value ?? "moderate").toLowerCase();
  if (lower === "heavy" || lower === "increase") return "heavy";
  if (lower === "light" || lower === "decrease") return "light";
  if (lower === "technique") return "technique";
  if (lower === "isometric") return "isometric";
  if (lower === "aerobic_low") return "aerobic_low";
  return "moderate";
};

export function normalizePlan(raw: RawPlan): SimplePlanView {
  const start = Number(
    raw.projected?.readinessBefore ??
      raw.plan_meta?.readiness ??
      raw.blocks?.[0]?.readiness_before ??
      0
  );

  const finish = Number(
    raw.projected?.readinessAfter ??
      raw.plan_meta?.readinessAfter ??
      raw.blocks?.[raw.blocks.length - 1]?.readiness_after ??
      start
  );

  const blocks = (raw.blocks ?? []).map((block) => {
    const name = block.displayName || block.exercise?.name || block.label || "Block";
    const sets = block.prescription?.sets ?? 0;
    const reps = block.prescription?.reps ?? "";
    const rest = block.prescription?.rest_s ?? block.prescription?.restSec ?? 0;
    const before = Number(block.readiness_before ?? start);
    const after = Number(block.readiness_after ?? before);
    const cost = Number(
      block.block_cost ?? (Number.isFinite(before) && Number.isFinite(after) ? before - after : 0)
    );
    const drop = Number((before - after).toFixed(1));

    return {
      name,
      load: normaliseLoad(block.loadStrategy ?? block.prescription?.load_adjustment),
      sets,
      reps,
      rest_s: rest,
      readiness_before: before,
      readiness_after: after,
      block_cost: Number(cost.toFixed(1)),
      drop,
    };
  });

  let cursor = start;
  let totalDrop = 0;
  blocks.forEach((block) => {
    if (Math.abs(block.readiness_before - cursor) > 0.6) {
      block.readiness_before = Number(cursor.toFixed(1));
    }
    const after = Number(block.readiness_after.toFixed(1));
    block.readiness_after = after;
    const drop = Number((block.readiness_before - block.readiness_after).toFixed(1));
    block.block_cost = Math.abs(block.block_cost) > 0 ? block.block_cost : drop;
    totalDrop += drop;
    cursor = after;
  });

  const expectedDrop = Number((start - finish).toFixed(1));
  if (blocks.length && Number.isFinite(expectedDrop)) {
    const lastIndex = blocks.length - 1;
    const others = blocks.slice(0, lastIndex).reduce((acc, block) => {
      const drop = Number((block.readiness_before - block.readiness_after).toFixed(1));
      return acc + drop;
    }, 0);
    const last = blocks[lastIndex];
    const correctedLastDrop = Number((expectedDrop - others).toFixed(1));
    const correctedAfter = Number((last.readiness_before - correctedLastDrop).toFixed(1));
    last.readiness_after = correctedAfter;
    last.block_cost = Math.abs(last.block_cost) > 0 ? last.block_cost : correctedLastDrop;
    cursor = correctedAfter;
    totalDrop = Number((others + correctedLastDrop).toFixed(1));
  } else {
    totalDrop = Number(totalDrop.toFixed(1));
  }

  const resolvedFinish = blocks.length ? cursor : finish;

  const safeTotal = Math.max(0.0001, Math.abs(totalDrop));
  const simplified = blocks.map((block) => {
    const drop = Number((block.readiness_before - block.readiness_after).toFixed(1));
    const dropShare = Math.min(1, Math.max(0, +(Math.abs(drop) / safeTotal).toFixed(3)));
    return {
      name: block.name,
      load: block.load,
      sets: block.sets,
      reps: block.reps,
      rest_s: block.rest_s,
      before: block.readiness_before,
      after: block.readiness_after,
      drop,
      dropShare,
    };
  });

  return {
    mode: raw.mode,
    start,
    finish: Number(resolvedFinish.toFixed(1)),
    totalDrop,
    blocks: simplified,
  };
}

export type { RawPlan, RawBlock };
