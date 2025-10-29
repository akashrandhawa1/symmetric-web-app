export type EffortLevel = "Cruise" | "Solid" | "Push";

export type PlanBlock = {
  label: "Main" | "Accessory" | "Primer" | "Finisher";
  name: string;
  sets: number;
  reps: string;
  tempo?: string;
  rest_s?: number;
  load: "increase" | "hold" | "decrease" | "n/a";
  effort: EffortLevel;
  predictedDrop: number;
  why?: string;
  ctaState?: "idle" | "in_progress" | "logged";
};

export type PlanProps = {
  startReadiness: number;
  finalReadiness: number;
  path: number[];
  blocks: PlanBlock[];
  confidence?: number;
  simple?: SimplePlanView;
};

export type LoadStrategy = "heavy" | "moderate" | "light" | "technique" | "isometric" | "aerobic_low";

export interface SimplePlanBlock {
  name: string;
  load: LoadStrategy;
  sets: number;
  reps: string | number;
  rest_s: number;
  readiness_before: number;
  readiness_after: number;
  block_cost: number;
}

export interface SimplePlanView {
  mode: "strength" | "readiness_training" | "off_day";
  start: number;
  finish: number;
  totalDrop: number;
  blocks: Array<{
    name: string;
    load: LoadStrategy;
    sets: number;
    reps: string | number;
    rest_s: number;
    before: number;
    after: number;
    drop: number;
    dropShare: number;
  }>;
}
