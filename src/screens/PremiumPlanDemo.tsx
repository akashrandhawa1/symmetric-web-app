import React from "react";
import PremiumPlanView from "../components/plan/PremiumPlanView";
import type { PlanProps } from "../types/plan";

export default function PremiumPlanDemo() {
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
        ctaState: "idle"
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Premium Plan View</h1>
          <p className="text-sm text-zinc-400">
            Clean, minimal design showing only what matters: exercise, sets×reps, and effort level
          </p>
        </div>
        <PremiumPlanView {...props} />
      </div>
    </div>
  );
}
