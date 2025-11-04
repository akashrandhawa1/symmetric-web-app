// Open schema for Milo's intake flow.

export type IntakeTurn = {
  persona_line: string;
  scc: {
    suggest: string;
    confirm: string;
    compensate: string;
  };
  question: string;
  topic: string;
  chips?: string[];
};

export type NegotiationTurn = {
  coach_take: string;
  question: string;
  chips?: string[];
};

export type PlanSummary = {
  goal: "lower-body strength" | "muscle" | "general" | "rehab";
  weeks: number;
  days_per_week: number;
  session_length_min: number;
  constraints_notes: string;
  blocks: Array<{ name: string; objective: string }>;
};

export type WrapTurn = {
  coach_intro: string;
  plan_summary: PlanSummary;
};

export type NextAction =
  | { action: "turn"; turn: IntakeTurn }
  | { action: "negotiation"; negotiation: NegotiationTurn }
  | { action: "wrap"; wrap: WrapTurn };

// Guard terms: intake cannot prescribe.
export const PRESCRIPTION_REGEX = /\b(\d+\s*x\s*\d+|sets?|reps?|rest|@ *rpe|% *1rm|kg|lb)\b/i;
export const looksLikePrescription = (s: string) => PRESCRIPTION_REGEX.test(s || "");
