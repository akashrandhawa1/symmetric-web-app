import { useMemo } from "react";
import { validateAndFixPlan, type Plan } from "@/logic/readinessFloor";
import { normalizePlan } from "@/lib/plan/normalize";
import type { SimplePlanView } from "@/types/plan";
import ReadinessDrops from "@/components/ReadinessDrops";

type Props = { llmText: string };

export default function PlanScreen({ llmText }: Props) {
  const { plan, simple }: { plan: Plan | null; simple: SimplePlanView | null } = useMemo(() => {
    try {
      const raw = JSON.parse(llmText);
      const validated = validateAndFixPlan(raw as Plan);
      let normalized: SimplePlanView | null = null;
      try {
        normalized = normalizePlan(raw);
      } catch {
        normalized = null;
      }
      return { plan: validated, simple: normalized };
    } catch {
      return { plan: null, simple: null };
    }
  }, [llmText]);

  if (!plan) return <div className="p-4">Plan unavailable.</div>;

  const startReadiness = simple?.start ?? plan.projected.readinessBefore ?? 0;
  const projectedFinish = simple?.finish ?? plan.projected.readinessAfter ?? 0;
  const finalShown = Math.max(49, projectedFinish);
  const totalDrop = Math.max(0, startReadiness - finalShown);

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-slate-900 p-4 shadow-sm">
        <div className="text-slate-300 text-xs tracking-wide">TODAY’S READINESS</div>
        <div className="mt-1 text-2xl font-semibold">
          {plan.blocks?.[0]?.displayName ?? (plan.mode === "strength" ? "Strength Plan" : "Readiness Training")}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-slate-400 text-xs">Start</div>
            <div className="text-3xl font-bold">{startReadiness.toFixed(1)}</div>
          </div>
          <div className="text-slate-400 text-sm">↓ {Math.max(0, totalDrop).toFixed(1)}</div>
          <div>
            <div className="text-slate-400 text-xs">Final</div>
            <div className="text-3xl font-bold text-emerald-400">{finalShown.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {simple ? <ReadinessDrops plan={simple} /> : null}

      <div className="space-y-3">
        {plan.blocks.map((b, i) => (
          <div key={i} className="rounded-2xl bg-slate-900 p-4 shadow-sm">
            <div className="mb-1 text-xs text-slate-400">
              {plan.mode === "strength"
                ? b.loadStrategy === "heavy"
                  ? "PRIME • Heavy"
                  : "BLOCK"
                : "READINESS"}
            </div>
            <div className="text-lg font-semibold">{b.displayName}</div>
            <div className="mt-1 text-slate-300">
              {b.sets} × {typeof b.reps === "string" ? b.reps : `${b.reps}`} • Rest {b.restSec}s
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
