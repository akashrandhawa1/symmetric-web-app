import { pickCoachModel, FALLBACK } from "./coachModels";
import { SYSTEM_COACH, buildUserPrompt } from "./coachPrompts";
import { CoachOutputSchema, CoachOutput } from "./coachSchema";
import { callGemini, openGeminiLiveSession } from "./geminiClient";

// Lightweight schema check (no external deps)
function validateCoachOutput(obj: any): asserts obj is CoachOutput {
  if (!obj || typeof obj !== "object") {
    throw new Error("Invalid CoachOutput");
  }
  if (typeof obj.line !== "string" || obj.line.length === 0 || obj.line.length > 180) {
    throw new Error("Invalid line");
  }
  if (
    ![
      "keep_load",
      "add_load",
      "reduce_load",
      "end_session",
      "add_set",
      "extend_rest",
    ].includes(obj.action)
  ) {
    throw new Error("Invalid action");
  }
  if ("rest_s" in obj && typeof obj.rest_s !== "number") {
    throw new Error("Invalid rest_s");
  }
}

type BuildPromptArgs = Parameters<typeof buildUserPrompt>[0];

export async function getCoachLine(
  input: BuildPromptArgs,
  opts?: {
    heavy?: boolean;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<CoachOutput> {
  const baseModel = pickCoachModel({ mode: input.mode, heavy: opts?.heavy });
  const fallbackModel = FALLBACK[baseModel as keyof typeof FALLBACK];
  const modelsToTry = [baseModel, fallbackModel].filter(
    (model): model is string => Boolean(model),
  );

  const prompt = buildUserPrompt(input);

  for (const model of modelsToTry) {
    try {
      const raw = await callGemini({
        model,
        system: SYSTEM_COACH,
        prompt,
        temperature: opts?.temperature ?? (input.mode === "liveSet" ? 0.4 : 0.5),
        maxOutputTokens: opts?.maxTokens ?? 120,
        jsonSchema: CoachOutputSchema,
      });
      const parsed = JSON.parse(raw);
      validateCoachOutput(parsed);
      return parsed;
    } catch {
      // try next model
    }
  }
  // Safe fallback for UI continuity
  return { line: "Hold steady and keep reps crisp.", action: "keep_load", rest_s: 90 };
}

export async function startLiveCoach(onDelta: (text: string) => void) {
  const model = "gemini-2.0-flash-live";
  try {
    const session = await openGeminiLiveSession(model);
    session.onMessage(onDelta);
    return session;
  } catch {
    // Fallback: degrade to non-live brief hint via flash-lite
    onDelta("Quick hint loading…");
    return null;
  }
}
