import React from "react";
import PlanViewInlineSpine from "../components/plan/PlanViewInlineSpine";
import type { PlanProps } from "../types/plan";

export default function PlanInlineDemo() {
  const props: PlanProps = {
    startReadiness: 65,
    finalReadiness: 51,
    path: [65, 57, 51],
    blocks: [
      {
        label: "Main",
        name: "Heel-Elevated Front Squat",
        sets: 2,
        reps: "3–5",
        tempo: "20X1",
        rest_s: 150,
        load: "hold",
        effort: "Push",
        predictedDrop: 8,
        why: "Quad bias with crisp reps while staying inside the productive readiness band.",
        ctaState: "idle"
      },
      {
        label: "Accessory",
        name: "Rear-Foot Elevated Split Squat",
        sets: 2,
        reps: "6/side",
        tempo: "31X0",
        rest_s: 90,
        load: "hold",
        effort: "Solid",
        predictedDrop: 6,
        why: "Controls symmetry drift while keeping systemic fatigue manageable.",
        ctaState: "idle"
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Inline Spine Plan View Demo</h1>
          <p className="text-sm text-zinc-400">
            Vertical spine running alongside plan cards with aligned nodes showing readiness path
          </p>
        </div>
        <PlanViewInlineSpine {...props} />
      </div>
    </div>
  );
}
