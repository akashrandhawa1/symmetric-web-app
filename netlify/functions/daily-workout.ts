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

type IntakeProfilePayload = {
  answers?: Record<string, any>;
  planSummary?: PlanSummary | null;
  savedAt?: number;
};

const normaliseText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
};

const summariseIntakeProfile = (intake: IntakeProfilePayload | null): string[] => {
  if (!intake) return [];
  const answers = intake.answers ?? {};
  const summaryPairs: Array<[string, unknown]> = [
    ["name", answers.name],
    ["goal_intent", answers.goal_intent],
    ["motivation", answers.motivation],
    ["timeline", answers.timeline],
    ["branch", answers.branch],
    ["performance_focus", answers.performance_focus],
    ["constraints", answers.constraints],
    ["past_injuries", answers.past_injuries],
    ["experience_level", answers.experience_level],
    ["form_confidence", answers.form_confidence],
    ["environment", answers.environment],
    ["equipment", answers.equipment],
    ["frequency", answers.frequency],
    ["session_length", answers.session_length],
    ["preferences", answers.preferences],
    ["program_style", answers.program_style],
  ];
  const lines: string[] = [];
  for (const [label, value] of summaryPairs) {
    if (value == null) continue;
    const text = normaliseText(value);
    if (!text) continue;
    lines.push(`${label}: ${text}`);
  }
  if (intake.planSummary) {
    lines.push(`plan_summary: ${JSON.stringify(intake.planSummary)}`);
  }
  return lines;
};

const buildIntakeHighlights = (intake: IntakeProfilePayload | null) => {
  const answers = intake?.answers ?? {};
  const summary = intake?.planSummary ?? null;

  const goalRaw = normaliseText(summary?.goal ?? answers.goal_intent ?? answers.goal ?? "general strength");
  const motivationRaw = normaliseText(answers.motivation ?? "");
  const environmentRaw = normaliseText(answers.environment ?? "");
  const equipmentRaw = answers.equipment;
  const equipmentList = Array.isArray(equipmentRaw)
    ? equipmentRaw.map(normaliseText).filter(Boolean)
    : normaliseText(equipmentRaw ?? "")
        .split(/[,/]|\band\b|\bwith\b/)
        .map((part) => part.trim())
        .filter(Boolean);
  const equipmentLine = equipmentList.length ? equipmentList.join(", ") : normaliseText(answers.equipment ?? "bodyweight");

  const daysPerWeek = summary?.days_per_week ?? Number.parseInt(normaliseText(answers.frequency ?? ""), 10);
  const sessionLengthMin = summary?.session_length_min ?? Number.parseInt(normaliseText(answers.session_length ?? ""), 10);
  const scheduleLine = [
    Number.isFinite(daysPerWeek) && daysPerWeek ? `${daysPerWeek} sessions/week` : null,
    Number.isFinite(sessionLengthMin) && sessionLengthMin ? `${sessionLengthMin} min each` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const constraintsRaw = normaliseText(answers.constraints ?? summary?.constraints_notes ?? "none");
  const preferencesRaw = normaliseText(answers.preferences ?? "");
  const focusRaw = normaliseText(answers.performance_focus ?? "");
  const styleRaw = normaliseText(answers.program_style ?? "");

  return [
    goalRaw ? `Goal focus: ${goalRaw}.` : null,
    motivationRaw ? `Motivation: ${motivationRaw}.` : null,
    environmentRaw ? `Primary environment: ${environmentRaw}.` : null,
    equipmentLine ? `Equipment available: ${equipmentLine}.` : null,
    scheduleLine ? `Schedule cadence: ${scheduleLine}.` : null,
    constraintsRaw && constraintsRaw.toLowerCase() !== "none" ? `Protect constraints/injuries: ${constraintsRaw}.` : null,
    preferencesRaw ? `Preferences: ${preferencesRaw}.` : null,
    focusRaw ? `Performance focus: ${focusRaw}.` : null,
    styleRaw ? `Program style preference: ${styleRaw}.` : null,
  ].filter((line): line is string => Boolean(line && line.length));
};

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
  intakeProfile?: IntakeProfilePayload | null;
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

  const intakeProfile = payload.intakeProfile ?? null;
  const intakeSummaryLines = summariseIntakeProfile(intakeProfile);
  const intakeHighlights = buildIntakeHighlights(intakeProfile);

  const promptLines = [
    "You are Symmetric's adaptive lower-body planner—engineer a session that lands near readiness 50 while reflecting the athlete's intake profile.",
    "Return ONLY JSON matching the schema. No commentary, markdown, or stray text.",
    "",
    "TRAINING PREFERENCE INFERENCE (use objective data to personalize):",
    "",
    "1. Rep Range Strategy (infer from goal + experience + body composition):",
    "   - Max strength goal + experienced lifter → Heavy focus (1-5 reps main lifts)",
    "   - Muscle building goal → Moderate-high reps (6-12 reps)",
    "   - Weight loss goal (current > goal weight) → Higher volume, shorter rest (10-15+ reps)",
    "   - Weight gain goal (current < goal weight) → Progressive overload emphasis (5-8 reps)",
    "   - Beginner experience → Moderate reps for skill building (8-12 reps)",
    "   - Advanced experience + general fitness → Varied rep ranges for stimulus",
    "",
    "2. Movement Pattern Balance (infer from sport context + age + limitations):",
    "   - Court sports (basketball, tennis) → More unilateral work (split squats, single-leg RDL)",
    "   - Field sports (soccer, football) → Balance bilateral strength + unilateral power",
    "   - Powerlifting goal → Bilateral barbell emphasis",
    "   - Age 40+ → Include more unilateral for stability and injury prevention",
    "   - Knee/hip limitations → Favor bilateral for control, careful unilateral progression",
    "",
    "3. Training Intensity (infer from age + experience + timeline):",
    "   - Age <25 + experienced → Can handle higher frequency and intensity",
    "   - Age 35-45 → Moderate intensity, prioritize recovery quality",
    "   - Age 45+ → Lower intensity, longer rest, more technique work",
    "   - Short timeline (4-6 weeks) → Higher intensity, focused blocks",
    "   - Long timeline (12+ weeks) → Periodized approach, build gradually",
    "",
    "4. Exercise Variety vs Mastery (infer from experience + goal + preferences):",
    "   - Beginner → Limited variety, master fundamental patterns first",
    "   - Intermediate → Moderate variety, introduce variations every 2-3 weeks",
    "   - Advanced → Higher variety, weekly variations to prevent plateau",
    "   - Strength goal → Stick with primary lifts longer (4-6 week blocks)",
    "   - Muscle/aesthetics goal → More variety to hit angles (2-week rotations)",
    "   - 'quick workout' or time-constrained → Supersets, circuits, compound movements",
    "   - 'love jumping' or plyometric interest → Include power/explosive work",
    "",
    "5. Load Progression (infer from body composition trajectory):",
    "   - Significant weight to lose (>15 lb gap) → Maintain strength, volume for calorie burn",
    "   - Weight gain goal → Aggressive progressive overload, prioritize strength gains",
    "   - Maintaining weight → Standard linear progression",
    "   - Body recomp (lose fat + gain muscle) → Moderate progressive overload + volume",
    "",
    "CRITICAL: Use these inference rules to guide exercise selection, rep ranges, rest periods,",
    "and training structure WITHOUT needing to ask the user their preferences directly.",
    "The objective data (age, weight, goal weight, height, experience, goal) tells you everything.",
    "",
    "Intake highlights:",
    ...(intakeHighlights.length
      ? intakeHighlights
      : ["Goal focus: general strength.", "Equipment available: standard lower-body setup."]),
    "",
    "Today's readiness data:",
    `- readiness_start: ${readiness ?? "unknown"}`,
    `- target_final_readiness: ${readiness != null && readiness < 51 ? Math.round(readiness) : 52}`,
    `- metrics: rmsDropPct=${metrics.rmsDropPct}, ror=${metrics.ror}, symmetryPct=${metrics.symmetryPct}`,
    `- cta_action: ${ctaAction}`,
    `- recovery_window_hours: ${recoveryHours ?? "null"}`,
    `- minutes_since_last_session: ${minutesSinceLastSession ?? "null"}`,
    `- just_finished_session: ${justFinished}`,
    `- labels: ${JSON.stringify(labels ?? {})}`,
    `- history: ${JSON.stringify(history ?? {})}`,
    `- constraints_flags: ${JSON.stringify(constraints ?? {})}`,
    `- preferred_exercise_id: ${exerciseId ?? ""}`,
    `- reference_load: ${weightKg ?? "null"}`,
    `- reference_est1RM: ${est1RMKg ?? "null"}`,
    `- variety_token: ${payload.varietyToken}`,
    "",
    "Reason through the plan before responding:",
    "- First, list the key requirements in your head (goal, constraints, equipment, readiness target).",
    "- If any requirement conflicts, resolve it before producing the JSON output.",
    "- Do not include your scratchpad in the response—return ONLY the JSON plan.",
    "",
    "Session design guidelines:",
    "- Choose movements that advance the intake goal using the available equipment.",
    "- Emphasise lower-body patterns (squat/hinge/lunge/brace) and note how each block honours constraints or preferences.",
    "- Produce 3–4 blocks: 1 primary lift, 1–2 accessories, optional finisher or recovery block.",
    "- Provide realistic sets/reps/tempo/rest; set loadStrategy to heavy/moderate/light/isometric/aerobic_low/technique.",
    "- readiness_after must chain cleanly and finish between 50-55 when mode='strength'.",
    "- If readiness < 49 or constraints demand recovery, set mode='readiness_training' and keep total block cost ≤ 1.",
    "- Tailor notes to explain intent, constraints, or adherence cues in ≤120 characters.",
    "",
    "Volume + projection rules:",
    "- Use the cost model (heavy 2.5, moderate 1.6, light 1.0, isometric 0.6, technique 0.3, aerobic_low 0.8) × reps multiplier × RMS multiplier to derive block_cost.",
    "- Maintain accurate readiness_before/after sequencing across blocks.",
    "- If mode='strength' and readiness_after > 55 add work; if < 50 reduce volume.",
    "",
    "JSON schema (no extra fields):",
  ];

  if (intakeSummaryLines.length) {
    promptLines.push("", "Raw intake summary:", ...intakeSummaryLines, "");
  }

  const prompt = promptLines.join("\n");

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
