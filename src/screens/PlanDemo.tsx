import React from "react";
import PlanViewWithRightSpine from "@/components/plan/PlanViewWithRightSpine";
import { PlanSkeleton } from "@/components/plan/PlanViewTwoColumn";
import type { PlanProps } from "@/types/plan";

const mockPlan: PlanProps = {
  startReadiness: 65,
  finalReadiness: 51,
  path: [65, 57, 51],
  confidence: 0.4,
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
      why: "Quad bias with crisp reps; efficient readiness drop",
      ctaState: "idle",
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
      why: "Adds unilateral load while staying in the window",
      ctaState: "idle",
    },
  ],
};

export default function PlanDemo() {
  const [loading] = React.useState(false); // flip to true to preview skeleton
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Plan View demo</h1>
          <p className="text-sm text-white/60">
            Use this screen to preview the two-column athlete view. Toggle the mock data or connect live Gemini output.
          </p>
        </header>
        {loading ? <PlanSkeleton /> : <PlanViewWithRightSpine {...mockPlan} />}
      </div>
    </main>
  );
}
