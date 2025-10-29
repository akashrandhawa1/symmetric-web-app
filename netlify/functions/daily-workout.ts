import type { Handler } from "@netlify/functions";
import { Type } from "@google/genai";
import type { WorkoutPlan } from "../../src/services";
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

const MODEL_ID = "gemini-2.0-flash";

const QUAD_EXERCISES = [
  { id: "heel_elevated_front_squat", name: "Heel-Elevated Front Squat", loadStrategy: "heavy" },
  { id: "rear_foot_split_squat", name: "Rear-Foot Split Squat", loadStrategy: "moderate" },
  { id: "trap_bar_deadlift_quads", name: "Trap-Bar Deadlift (Quad Bias)", loadStrategy: "heavy" },
  { id: "smith_machine_front_squat", name: "Smith Machine Front Squat", loadStrategy: "moderate" },
  { id: "leg_press_wide", name: "Leg Press (Wide Stance)", loadStrategy: "moderate" },
  { id: "bulgarian_split_squat_db", name: "DB Bulgarian Split Squat", loadStrategy: "moderate" },
  { id: "step_up_bench", name: "Bench Step-Up", loadStrategy: "light" },
  { id: "leg_extension", name: "Leg Extension", loadStrategy: "technique" },
  { id: "split_squat_iso", name: "Split-Squat Iso Hold", loadStrategy: "isometric" },
  { id: "bike_flush", name: "Assault Bike Flush", loadStrategy: "aerobic_low" },
];

type DailyWorkoutPayload = {
  context: {
    readiness: number | null;
    metrics: { rmsDropPct: number; ror: string; symmetryPct: number };
    ctaAction: string;
    recoveryHours: number | null;
    minutesSinceLastSession: number | null;
    justFinished: boolean;
    firstName: string | null;
    labels?: Record<string, unknown>;
    history?: Record<string, unknown>;
    constraints?: Record<string, unknown>;
    exerciseId?: string | null;
    weightKg?: number | null;
    est1RMKg?: number | null;
  };
  varietyToken: number;
};

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

  let payload: DailyWorkoutPayload | null = null;
  try {
    payload = event.body ? JSON.parse(event.body) : null;
  } catch (error) {
    console.error("[daily-workout] invalid JSON:", error);
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Invalid JSON payload" }),
    };
  }

  if (!payload) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing payload" }),
    };
  }

  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.VITE_GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.API_KEY ??
    null;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }),
    };
  }

  const {
    readiness,
    metrics,
    ctaAction,
    recoveryHours,
    minutesSinceLastSession,
    justFinished,
    firstName,
    labels,
    history,
    constraints,
    exerciseId,
    weightKg,
    est1RMKg,
  } = payload.context;

  const exerciseCatalog = QUAD_EXERCISES.map(
    (item) => `- ${item.id} → ${item.name} (${item.loadStrategy})`
  ).join("\n");

  const prompt = [
    "You are Symmetric’s Quad Strength Planner—engineer a quad-focused session that finishes readiness at 50.",
    "Return ONLY JSON matching the schema. No commentary, markdown, or stray text.",
    "",
    "SESSION RULES:",
    "- Use exercises from the allowed quad list below (swap only for mechanically equivalent quad options).",
    "- Emit 3–4 blocks total: 1 main lift, 1–2 accessory strength blocks, and 1 recovery/flush block.",
    "- Provide realistic sets/reps/tempo/rest and set loadStrategy to one of heavy/moderate/light/technique/isometric/aerobic_low.",
    "- Include readiness_after for each block (projected readiness after that block).",
    "- If starting readiness ≥ 51: keep readiness_after strictly descending toward 50 (never below 49 for strength prescriptions).",
    "- If starting readiness < 51 OR CTA indicates recovery: set mode='readiness_training', keep readiness_after ≥ readiness_before - 1 (preferably +1 to +3), and favour technique/isometric/aerobic prescriptions.",
    "- Populate notes with concise execution cues (≤120 chars).",
    "- plan_meta.readiness must equal the starting readiness; plan.projected.readinessAfter must equal 50.",
    "- Secondary rationale belongs in policy.rationale and block.evidence.rationale; no marketing fluff.",
    "",
    `Allowed quad exercises (id → name):\n${exerciseCatalog}`,
    "",
    `Starting readiness: ${readiness ?? "unknown"}`,
    `Target final readiness: ${readiness != null && readiness < 51 ? Math.round(readiness) : 50}`,
    `Metrics: rmsDropPct=${metrics.rmsDropPct}, ror="${metrics.ror}", symmetryPct=${metrics.symmetryPct}`,
    `CTA action: ${ctaAction}`,
    `Recovery window hours: ${recoveryHours ?? "null"}`,
    `Minutes since last session: ${minutesSinceLastSession ?? "null"}`,
    `Just finished session: ${justFinished}`,
    `First name: ${firstName ?? "null"}`,
    `Labels: ${JSON.stringify(labels ?? {})}`,
    `History: ${JSON.stringify(history ?? {})}`,
    `Constraints: ${JSON.stringify(constraints ?? {})}`,
    `Requested exerciseId: ${exerciseId ?? ""}`,
    `WeightKg: ${weightKg ?? "null"}`,
    `Estimated 1RM: ${est1RMKg ?? "null"}`,
    `Variety token: ${payload.varietyToken}`,
    "",
    "JSON schema (no extra fields):",
  ].join("\n");

  const schema = {
    type: Type.OBJECT,
    properties: {
      policy: {
        type: Type.OBJECT,
        properties: {
          readiness_bands: {
            type: Type.OBJECT,
            properties: {
              heavy_exposure_min: { type: Type.NUMBER },
              productive_min: { type: Type.NUMBER },
              conservative_min: { type: Type.NUMBER },
            },
            required: ["heavy_exposure_min", "productive_min", "conservative_min"],
          },
          emg_quality_rules: {
            type: Type.OBJECT,
            properties: {
              target_mvc_peak: { type: Type.NUMBER },
              max_ror_collapse_pct: { type: Type.NUMBER },
              min_symmetry_pct: { type: Type.NUMBER },
            },
            required: ["target_mvc_peak", "max_ror_collapse_pct", "min_symmetry_pct"],
          },
          rationale: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ["readiness_bands", "emg_quality_rules", "rationale", "confidence"],
      },
      plan_meta: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING },
          readiness: { type: Type.NUMBER },
          recovery_window: { type: Type.STRING },
          notes: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ["intent", "readiness", "recovery_window", "notes", "confidence"],
      },
      blocks: {
        type: Type.ARRAY,
        minItems: 2,
        maxItems: 4,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            type: { type: Type.STRING },
            exercise: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                quad_dominant: { type: Type.BOOLEAN },
                equipment_required: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["id", "name", "quad_dominant", "equipment_required"],
            },
            prescription: {
              type: Type.OBJECT,
              properties: {
                sets: { type: Type.NUMBER },
                reps: { type: Type.STRING },
                tempo: { type: Type.STRING },
                rest_s: { type: Type.NUMBER },
                load_adjustment: { type: Type.STRING },
              },
              required: ["sets", "reps", "tempo", "rest_s", "load_adjustment"],
            },
            criteria: {
              type: Type.OBJECT,
              properties: {
                target_mvc_pct_min: { type: Type.NUMBER },
                stop_if: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["target_mvc_pct_min", "stop_if"],
            },
            evidence: {
              type: Type.OBJECT,
              properties: {
                metrics: { type: Type.ARRAY, items: { type: Type.STRING } },
                rationale: { type: Type.STRING },
                policy_rule_applied: { type: Type.STRING },
              },
              required: ["metrics", "rationale", "policy_rule_applied"],
            },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            expect_label: { type: Type.BOOLEAN },
            readiness_after: { type: Type.NUMBER },
          },
          required: [
            "label",
            "type",
            "exercise",
            "prescription",
            "criteria",
            "evidence",
            "assumptions",
            "expect_label",
          ],
        },
      },
      alternatives: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            for_block: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  when_to_use: { type: Type.STRING },
                },
                required: ["id", "name", "when_to_use"],
              },
            },
          },
          required: ["for_block", "options"],
        },
      },
      telemetry_focus: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: ["policy", "plan_meta", "blocks", "alternatives", "telemetry_focus"],
  };

  try {
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: MODEL_ID,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens: 550,
      },
    });

    const text = typeof result.text === "function" ? await result.text() : result.text ?? "";
    const plan = JSON.parse(text) as WorkoutPlan;

    if (plan.plan_meta) {
      plan.plan_meta.intent = readiness != null && readiness < 51 ? 'readiness_training' : 'quad_strength';
      plan.plan_meta.readiness = readiness ?? plan.plan_meta.readiness ?? 50;
    }

    if (plan.projected) {
      const startReadiness = readiness ?? plan.projected.readinessBefore ?? 50;
      plan.projected.readinessBefore = startReadiness;
      if (startReadiness < 51) {
        const projected = typeof plan.projected.readinessAfter === 'number' ? plan.projected.readinessAfter : startReadiness;
        plan.projected.readinessAfter = Math.max(startReadiness, Math.round(projected));
      } else {
        plan.projected.readinessAfter = 50;
      }
      plan.projected.delta = (plan.projected.readinessAfter ?? 50) - (plan.projected.readinessBefore ?? 50);
    }

    if (plan.blocks) {
      plan.blocks = plan.blocks.map((block) => {
        const rawValue = (block as any).readiness_after;
        return {
          ...block,
          readiness_after:
            typeof rawValue === "number"
              ? Math.max(0, Math.round(rawValue))
              : undefined,
        };
      }) as WorkoutPlan["blocks"];
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(plan),
    };
  } catch (error) {
    console.error("[daily-workout] Gemini request failed:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Failed to generate workout plan" }),
    };
  }
};

export { handler };
