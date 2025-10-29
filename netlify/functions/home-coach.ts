import type { Handler } from "@netlify/functions";
import { CoachResponseSchema } from "../../src/coach/validator";
import type { CoachJSON } from "../../src/coach/types";
import { runHomeCoachMock } from "../../src/coach/mockGemini";
import { getAI } from "../../server/lib/geminiClient";
import { assertGenAISurface } from "../../server/guards/assertGenAISurface";

(() => {
  try {
    assertGenAISurface();
  } catch (error: any) {
    if (!(error?.message && error.message.includes("GEMINI_API_KEY is missing"))) {
      throw error;
    }
  }
})();

type HomeCoachRequestPayload = {
  readiness: number | null;
  trendPct: number | null;
  minutesSinceLastSession: number | null;
  decision: string | null;
  metrics?: {
    rmsDropPct?: number | null;
    rorDropPct?: number | null;
    symmetryPct?: number | null;
  };
  notes?: string | null;
};

const MODEL_ID = "gemini-2.0-flash";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Allow": "POST",
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let payload: HomeCoachRequestPayload | null = null;
  try {
    payload = event.body ? (JSON.parse(event.body).payload ?? null) : null;
  } catch (error) {
    console.error("[home-coach] invalid JSON:", error);
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Invalid JSON payload" }),
    };
  }

  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.VITE_GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.API_KEY ??
    null;

  if (!apiKey) {
    console.warn("[home-coach] Missing GEMINI_API_KEY env var. Falling back to mock.");
    const mock = await runHomeCoachMock();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(mock),
    };
  }

  const toPercent = (value: number | null | undefined) =>
    value == null || Number.isNaN(value) ? "unknown" : `${Math.round(value)}%`;

  const promptLines: string[] = [
    "You are a warm, encouraging personal trainer who speaks like a human.",
    "",
    "Return JSON only:",
    `{ "type": "suggestion", "mode": "TRAIN" | "ACTIVE_RECOVERY" | "FULL_REST", "message": string, "cta": string, "secondary": string | null }`,
    "",
    "Tone & length:",
    "- Friendly, natural, no slang.",
    "- Message: 2-3 sentences, ≤220 characters.",
    "- Secondary: 1 sentence, ≤160 characters.",
    "- No em dashes, no bullet lists, no emojis.",
    "",
    "Message structure:",
    "1. Current state: readiness level and what it means",
    "2. Why: brief connection to strength/recovery goals",
    "3. What to do: specific action based on mode",
    "",
    "Mode selection (critical):",
    "- TRAIN: readiness ≥50 and no major warnings → strength work",
    "- ACTIVE_RECOVERY: readiness 40-65 with fatigue signals → light movement",
    "- FULL_REST: readiness <40 or HR warning or sharp negative trend → rest/plan",
    "",
    "Secondary guidance:",
    "- TRAIN mode: mention target reps (3-6), rest times, or stop conditions (stop at readiness ~50)",
    "- ACTIVE_RECOVERY mode: suggest duration (20-30 min) and intensity (zone-2, light)",
    "- FULL_REST mode: mention sleep, protein, or planning next session",
    "",
    "Data interpretation:",
    "- Readiness 80+: high energy, can push hard",
    "- Readiness 65-79: solid, train smart",
    "- Readiness 50-64: workable, stay technical",
    "- Readiness 40-49: borderline, light work or rest",
    "- Readiness <40: needs rest",
    "- Symmetry <88%: mention form/balance",
    "- RMS drop >20%: fatigue building",
    "",
    "CTA requirements:",
    "- TRAIN: 'Start strength training' or 'Add focused block'",
    "- ACTIVE_RECOVERY: 'Start recovery session' or 'Light movement (20-30 min)'",
    "- FULL_REST: 'Plan tomorrow' or 'Rest today'",
    "",
    `Input data: ${JSON.stringify({
      readiness: payload?.readiness ?? null,
      trendPct: payload?.trendPct ?? null,
      minutesSinceLastSession: payload?.minutesSinceLastSession ?? null,
      decision: payload?.decision ?? null,
      metrics: payload?.metrics ?? null,
      notes: payload?.notes ?? null,
    })}`,
  ];

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: [{ role: "user", parts: [{ text: promptLines.join("\n") }] }],
      config: {
        temperature: 0.4,
        responseMimeType: "application/json",
        maxOutputTokens: 260,
      },
    });

    const raw = typeof response.text === "function" ? await response.text() : response.text;
    const text = raw ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Gemini returned non-JSON payload: ${text.slice(0, 200)}`);
    }

    const suggestion = CoachResponseSchema.parse(parsed) as CoachJSON;
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(suggestion),
    };
  } catch (error) {
    console.warn("[home-coach] Gemini request failed, using mock fallback:", error);
    const mock = await runHomeCoachMock({
      readiness: payload?.readiness ?? null,
      fatigueHigh: payload?.metrics?.rmsDropPct != null ? payload.metrics.rmsDropPct >= 20 : null,
    });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(mock),
    };
  }
};

export { handler };
