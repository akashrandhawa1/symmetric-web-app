import { describe, it, expect } from "vitest";
import { validateAndFixPlan, type Plan } from "./readinessFloor";

describe("readiness floor", () => {
  it("converts below-floor strength plan into readiness_training >=49", () => {
    const bad: Plan = {
      mode: "strength",
      blocks: [
        {
          exerciseId: "back_squat",
          displayName: "Back Squat",
          loadStrategy: "heavy",
          sets: 5,
          reps: 5,
          restSec: 150,
          targets: { rmsDropBand: [18, 26], symmetryMin: 90 },
        },
      ],
      projected: { readinessBefore: 41, readinessAfter: 20, delta: -21 },
      rationale: "test",
    };
    const fixed = validateAndFixPlan(bad);
    expect(fixed.mode).toBe("readiness_training");
    expect(fixed.projected.readinessAfter).toBeGreaterThanOrEqual(49);
  });
});
