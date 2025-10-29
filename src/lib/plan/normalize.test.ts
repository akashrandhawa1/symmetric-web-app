import { describe, expect, it } from "vitest";
import { normalizePlan } from "./normalize";

describe("normalizePlan", () => {
  it("computes per-block drops, totals, and shares", () => {
    const raw = {
      mode: "strength" as const,
      plan_meta: { readiness: 62 },
      projected: { readinessBefore: 62, readinessAfter: 44.4, delta: -17.6 },
      blocks: [
        {
          displayName: "HE Front Squat",
          loadStrategy: "heavy",
          prescription: { sets: 4, reps: "4", rest_s: 150 },
          readiness_before: 62,
          readiness_after: 50.8,
          block_cost: 11.2,
        },
        {
          displayName: "Leg Press (Wide)",
          loadStrategy: "moderate",
          prescription: { sets: 3, reps: "6", rest_s: 120 },
          readiness_before: 50.8,
          readiness_after: 46.0,
          block_cost: 4.8,
        },
        {
          displayName: "DB Bulgarian Split Squat",
          loadStrategy: "moderate",
          prescription: { sets: 1, reps: "6/side", rest_s: 90 },
          readiness_before: 46.0,
          readiness_after: 44.4,
          block_cost: 1.6,
        },
      ],
    };

    const simple = normalizePlan(raw);

    expect(simple.start).toBe(62);
    expect(simple.finish).toBeCloseTo(44.4, 1);
    expect(simple.totalDrop).toBeCloseTo(17.6, 1);
    expect(simple.blocks).toHaveLength(3);
    expect(simple.blocks[0].drop).toBeCloseTo(11.2, 1);
    expect(simple.blocks[1].dropShare).toBeCloseTo(4.8 / 17.6, 3);
  });

  it("gracefully handles missing readiness fields", () => {
    const raw = {
      mode: "readiness_training" as const,
      blocks: [
        {
          displayName: "Breathing",
          loadStrategy: "technique",
          prescription: { sets: 2, reps: "5", rest_s: 45 },
        },
      ],
      projected: { readinessBefore: 55, readinessAfter: 54, delta: -1 },
    };

    const simple = normalizePlan(raw);
    expect(simple.start).toBe(55);
    expect(simple.finish).toBe(54);
    expect(simple.totalDrop).toBeCloseTo(1, 1);
    expect(simple.blocks[0].dropShare).toBe(1);
  });
});
