import React from "react";
import type { SimplePlanView } from "@/types/plan";

type Props = {
  plan: SimplePlanView;
  title?: string;
};

export default function ReadinessDrops({ plan, title = "Readiness per Exercise" }: Props) {
  return (
    <div className="rounded-2xl bg-slate-900 p-4 shadow-sm">
      <div className="text-sm font-medium text-slate-200">{title}</div>
      <div className="mt-1 text-xs text-slate-400">
        Start{" "}
        <span className="font-semibold text-slate-100">{plan.start.toFixed(1)}</span>
        {" → "}
        Finish <span className="font-semibold text-emerald-300">{plan.finish.toFixed(1)}</span>
        <span className="ml-1 text-slate-500">(↓ {plan.totalDrop.toFixed(1)})</span>
      </div>

      <div className="mt-4 space-y-4">
        {plan.blocks.map((block, index) => (
          <div key={`${block.name}-${index}`} className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-100">{block.name}</div>
              <div className="mt-1 text-xs text-slate-400">
                {block.sets}×{typeof block.reps === "string" ? block.reps : block.reps}
                {" • "}
                {block.load}
                {" • Rest "}
                {block.rest_s}s
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${Math.min(100, Math.round(block.dropShare * 100))}%` }}
                />
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-xs text-slate-200">
                <span className="font-mono">{block.before.toFixed(1)}</span>
                <span className="mx-1 text-slate-500">→</span>
                <span className="font-mono text-emerald-300">{block.after.toFixed(1)}</span>
              </div>
              <div className="mt-1 inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-100">
                −{block.drop.toFixed(1)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
