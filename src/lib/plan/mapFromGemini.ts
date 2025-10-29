import type { EffortLevel, PlanProps } from "@/types/plan";

type GeminiBlock = {
  label: "Main" | "Accessory" | "Primer" | "Finisher";
  name: string;
  prescription: {
    sets: number;
    reps: string;
    tempo?: string;
    rest_s?: number;
    load: "increase" | "hold" | "decrease" | "n/a";
  };
  effort: EffortLevel;
  predicted_drop: number;
  why?: string;
};

type GeminiPlanMeta = {
  start_readiness: number;
  final_readiness: number;
  predicted_path: number[];
  confidence?: number;
};

type GeminiAthleteView = {
  plan_meta: GeminiPlanMeta;
  blocks: GeminiBlock[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function planPropsFromGemini(payload: unknown): PlanProps {
  const root = isObject(payload) ? payload : {};
  const av = (root["athlete_view"] ?? root["athleteView"] ?? root) as GeminiAthleteView;
  if (!isObject(av) || !isObject(av.plan_meta) || !Array.isArray(av.blocks)) {
    throw new Error("Invalid Gemini plan payload");
  }
  const meta = av.plan_meta as GeminiPlanMeta;
  return {
    startReadiness: meta.start_readiness,
    finalReadiness: meta.final_readiness,
    path: meta.predicted_path ?? [meta.start_readiness, meta.final_readiness],
    confidence: meta.confidence,
    blocks: av.blocks.map((block) => ({
      label: block.label,
      name: block.name,
      sets: block.prescription.sets,
      reps: block.prescription.reps,
      tempo: block.prescription.tempo,
      rest_s: block.prescription.rest_s,
      load: block.prescription.load,
      effort: block.effort,
      predictedDrop: block.predicted_drop,
      why: block.why,
      ctaState: "idle",
    })),
  };
}
