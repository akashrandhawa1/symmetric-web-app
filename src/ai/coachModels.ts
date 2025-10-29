export type CoachMode = "home" | "postSet" | "liveSet";

export function pickCoachModel(ctx: { mode: CoachMode; heavy?: boolean }): string {
  if (ctx.mode === "liveSet") return "gemini-2.0-flash-live";
  if (ctx.heavy) return "gemini-2.5-pro";
  return "gemini-2.5-flash";
}

export const FALLBACK: Record<string, string> = {
  "gemini-2.5-flash": "gemini-2.0-flash-lite",
  "gemini-2.0-flash-live": "gemini-2.0-flash",
  "gemini-2.5-pro": "gemini-2.5-flash",
};
