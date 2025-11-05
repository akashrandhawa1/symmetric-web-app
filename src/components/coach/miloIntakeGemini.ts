/**
 * Direct Gemini client for Coach Milo Intake
 *
 * Follows the same pattern as the rest of the app (client-side Gemini calls)
 * instead of using Netlify Functions
 */

import type { NextAction, IntakeTurn, NegotiationTurn, WrapTurn } from "../../coach/intake/openSchema";
import type { Topic } from "../../coach/intake/contextMap";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const extractJsonObject = (raw: string): string | null => {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let prevChar = "";

  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];

    if (inString) {
      if (char === '"' && prevChar !== "\\") {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return raw.slice(start, index + 1);
        }
      }
    }

    prevChar = char;
  }

  return null;
};

const SYSTEM_PROMPT = `You are Coach Milo 🐺, a warm, experienced strength coach having a genuine conversation to understand this person's training context.
Every response must be valid JSON using one of the allowed shapes below.

Conversational principles:
- Always acknowledge what they specifically said before moving forward (reference their actual words, not generic confirmations)
- Show genuine curiosity about their training journey
- Ask follow-up questions when their answer is interesting, vague, or reveals something important
- If they ask a question (why, what, how) or push back ('why should I care', 'idk', 'not sure'), ADDRESS IT DIRECTLY before continuing
  • Example: User says 'why should i care about this?' → Answer their question, then gently guide back to the topic
  • Example: User says 'idk' or 'not sure' → Acknowledge uncertainty, provide context, offer to skip or come back to it
  • Example: User asks 'what does this have to do with training?' → Explain the connection, then continue
- Keep responses natural and conversational (not formulaic or robotic)
- Use their name occasionally for warmth, but don't overdo it
- If they mention something specific (injury, sport, time constraint, equipment gap), explore it briefly
- Vary your language and phrasing—don't sound like you're reading from a script

Response guidelines:
- Persona line: Briefly explain why understanding this topic helps you coach them better (be specific to what they said)
- SCC (Suggest/Confirm/Compensate): Acknowledge their answer with coaching insight, not generic confirmations
  • Suggest: Why their answer helps guide the plan (reference specifics)
  • Confirm: Affirm their choice works
  • Compensate: If there's a constraint, explain how you'll work with it
- Question: Ask naturally, not like filling out a form. Can be 1-2 sentences if needed for clarity.
- NEVER prescribe specific exercises, sets, reps, %1RM, RPE, rest intervals, or exact loads (kg/lb)
- If you cannot comply, return an empty JSON object {}

Topic-specific question requirements (CRITICAL - must ask for EXACT data specified):
- body_metrics: LEGACY - replaced by separate questions below
- user_age: Ask "How old are you?" - Simple age question only
- user_height: Ask "What's your height?" - Height in feet and inches
- user_current_weight: Ask "What's your current weight in pounds?" - Current weight only
- user_goal_weight: Ask "What's your goal weight?" - Target weight only
- frequency_commitment: MUST ask about training days per week. Can optionally ask about timeline/event deadlines.
- equipment_session: MUST ask about equipment access AND session length/duration.
- primary_goal: Ask about their main training goal (strength, muscle, sport, rehab, general fitness).
- training_context: Ask about their strength training experience level.
- limitations: Ask about injuries, joint issues, or movement constraints.
- body_composition: Ask if they want to gain muscle, lose fat, maintain, or if it's not a priority.
- sport_context: If training for a sport, ask which sport and position/role.
- training_time: Ask when they usually train (morning, midday, evening, varies).
- exercise_preferences: Ask about movements they love or want to avoid.

IMPORTANT: Do NOT invent new questions or ask for information not listed above. Stick to what each topic requires.

JSON shapes:
{"persona_line":"...","scc":{"suggest":"...","confirm":"...","compensate":"..."},"question":"...","topic":"exact_topic_name","chips":[...]}  ← Use for normal intake questions
{"coach_take":"...","question":"...","chips":[...]}  ← Use when user asks a question or pushes back (address their concern in coach_take, then ask to continue)`;

export async function callGeminiForIntake(params: {
  answers: Record<string, any>;
  nextTopic: Topic;
  userName?: string;
  lastUserText?: string;
  chips?: string[];
}): Promise<NextAction | null> {
  if (!GEMINI_API_KEY) {
    console.warn("[miloIntakeGemini] No API key found");
    return null;
  }

  const { answers, nextTopic, userName, lastUserText, chips } = params;

  // Build conversation context
  const conversationContext: string[] = [];
  if (answers.name) conversationContext.push(`Their name: ${answers.name}`);
  if (answers.primary_goal) conversationContext.push(`Goal: ${answers.primary_goal}`);
  if (answers.training_context) conversationContext.push(`Experience: ${answers.training_context}`);
  if (answers.equipment_session) conversationContext.push(`Equipment: ${JSON.stringify(answers.equipment_session)}`);
  if (answers.frequency_commitment) conversationContext.push(`Frequency: ${JSON.stringify(answers.frequency_commitment)}`);
  if (answers.limitations) conversationContext.push(`Limitations: ${answers.limitations}`);

  const userPrompt = JSON.stringify({
    user_name: userName ?? "",
    conversation_so_far: conversationContext.length > 0
      ? `What you know about them:\n${conversationContext.join('\n')}\n\nUse this context to ask personalized questions.`
      : "",
    next_topic: nextTopic,
    last_user_text: lastUserText ?? "",
    chips: chips ?? [],
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: userPrompt }]
        }],
        systemInstruction: {
          role: "system",
          parts: [{ text: SYSTEM_PROMPT }]
        },
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 400,
          responseMimeType: "application/json",
        }
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      let detail: string | undefined;
      try {
        detail = await response.text();
      } catch (error) {
        detail = (error as Error)?.message;
      }
      console.error("[miloIntakeGemini] API error:", response.status, response.statusText, detail);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("[miloIntakeGemini] No text in response");
      return null;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      const extracted = extractJsonObject(text);
      if (extracted) {
        try {
          parsed = JSON.parse(extracted);
        } catch (err) {
          console.error("[miloIntakeGemini] Failed to parse extracted JSON:", extracted);
          throw err;
        }
      } else {
        console.error("[miloIntakeGemini] Failed to locate JSON in response:", text);
        throw parseError;
      }
    }

    // Convert to NextAction format
    if ("persona_line" in parsed && "scc" in parsed && "topic" in parsed) {
      const turn: IntakeTurn = {
        persona_line: String(parsed.persona_line ?? ""),
        scc: parsed.scc as IntakeTurn["scc"],
        question: String(parsed.question ?? ""),
        topic: parsed.topic as Topic,
        chips: Array.isArray(parsed.chips) ? parsed.chips.map(String) : [],
      };
      if (turn.topic !== nextTopic) {
        console.warn(
          "[miloIntakeGemini] Topic mismatch. Expected",
          nextTopic,
          "but model returned",
          turn.topic,
          "— falling back to scripted flow."
        );
        return null;
      }
      return { action: "turn", turn };
    }

    if ("coach_take" in parsed && "question" in parsed) {
      const negotiation: NegotiationTurn = {
        coach_take: String(parsed.coach_take ?? ""),
        question: String(parsed.question ?? ""),
        chips: Array.isArray(parsed.chips) ? parsed.chips.map(String) : [],
      };
      return { action: "negotiation", negotiation };
    }

    console.error("[miloIntakeGemini] Unexpected payload shape:", parsed);
    return null;

  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("[miloIntakeGemini] Request timeout");
    } else {
      console.error("[miloIntakeGemini] Error:", error);
    }
    return null;
  }
}

const WRAP_SYSTEM_PROMPT = `You are Coach Milo 🐺 wrapping up an intake conversation and creating a personalized training plan.

Your response must be STRICT JSON using this exact shape:
{
  "coach_intro": "...",
  "plan_summary": {
    "goal": "lower-body strength" | "muscle" | "general" | "rehab",
    "weeks": number,
    "days_per_week": number,
    "session_length_min": number,
    "constraints_notes": "...",
    "blocks": [
      {"name": "...", "objective": "..."},
      {"name": "...", "objective": "..."},
      {"name": "...", "objective": "..."}
    ]
  }
}

Guidelines for personalization:
- coach_intro: Warm, conversational summary (2-3 sentences) that references their SPECIFIC context (name, goal, constraints, preferences from final_note)
- goal: Pick the most appropriate category based on their primary_goal
- weeks: 4-8 weeks is typical, adjust based on their timeline/goals
- days_per_week: Use their frequency_commitment
- session_length_min: Use their equipment_session time
- constraints_notes: If they mentioned limitations, preferences, or final notes, summarize here. If "I love jumping" → mention plyometrics. If "quick workouts" → mention efficiency focus. Otherwise: "No major constraints"
- blocks: 2-4 training blocks with names and objectives. MUST reflect their preferences:
  * If they mentioned "jumping" or plyometrics → include a power/plyometric block
  * If they want "quick workouts" → emphasize supersets or circuits
  * If they have injuries → include mobility/prehab block
  * Each objective should be 1-2 sentences, no specific sets/reps

CRITICAL: Use their exact words from final_note when creating constraints_notes and blocks. Make it feel personalized to THEM, not a template.`;

export async function generateWrapWithGemini(
  answers: Record<string, any>,
  fallback: WrapTurn
): Promise<WrapTurn | null> {
  if (!GEMINI_API_KEY) {
    console.warn("[miloIntakeGemini] No API key for wrap generation");
    return null;
  }

  // Build comprehensive context from all answers
  const context: Record<string, any> = {
    name: answers.name || "friend",
    primary_goal: answers.primary_goal || answers.goal_intent || "strength",
    training_context: answers.training_context || answers.experience_level,
    equipment_session: answers.equipment_session,
    frequency_commitment: answers.frequency_commitment,
    body_metrics: answers.body_metrics,
    limitations: answers.limitations,
    sport_context: answers.sport_context,
    body_composition: answers.body_composition,
    training_time: answers.training_time,
    exercise_preferences: answers.exercise_preferences,
    final_note: answers.final_note || null,
  };

  // Extract defaults from fallback
  const defaults = {
    goal: fallback.plan_summary.goal,
    weeks: fallback.plan_summary.weeks,
    days_per_week: fallback.plan_summary.days_per_week,
    session_length_min: fallback.plan_summary.session_length_min,
  };

  const userPrompt = JSON.stringify({
    context,
    defaults,
    instruction: "Generate a personalized training plan wrap that reflects ALL of the user's context, especially their final_note preferences."
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // Longer timeout for plan generation

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: userPrompt }]
        }],
        systemInstruction: {
          role: "system",
          parts: [{ text: WRAP_SYSTEM_PROMPT }]
        },
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 600,
          responseMimeType: "application/json",
        }
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error("[miloIntakeGemini] Wrap API error:", response.status);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("[miloIntakeGemini] No text in wrap response");
      return null;
    }

    const parsed = JSON.parse(text);

    // Validate and sanitize the response
    if (!parsed.coach_intro || !parsed.plan_summary) {
      console.error("[miloIntakeGemini] Invalid wrap structure");
      return null;
    }

    const wrap: WrapTurn = {
      coach_intro: String(parsed.coach_intro).slice(0, 280),
      plan_summary: {
        goal: ["lower-body strength", "muscle", "general", "rehab"].includes(parsed.plan_summary.goal)
          ? parsed.plan_summary.goal
          : fallback.plan_summary.goal,
        weeks: Math.max(2, Math.min(16, Number(parsed.plan_summary.weeks) || fallback.plan_summary.weeks)),
        days_per_week: Math.max(1, Math.min(6, Number(parsed.plan_summary.days_per_week) || fallback.plan_summary.days_per_week)),
        session_length_min: Math.max(20, Math.min(120, Number(parsed.plan_summary.session_length_min) || fallback.plan_summary.session_length_min)),
        constraints_notes: String(parsed.plan_summary.constraints_notes || "No major constraints").slice(0, 200),
        blocks: Array.isArray(parsed.plan_summary.blocks) && parsed.plan_summary.blocks.length >= 2
          ? parsed.plan_summary.blocks.slice(0, 4).map((block: any) => ({
              name: String(block.name || "Training Block").slice(0, 60),
              objective: String(block.objective || "Build strength").slice(0, 140)
            }))
          : fallback.plan_summary.blocks
      }
    };

    console.log("[miloIntakeGemini] Generated personalized wrap");
    return wrap;

  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("[miloIntakeGemini] Wrap generation timeout");
    } else {
      console.error("[miloIntakeGemini] Wrap generation error:", error);
    }
    return null;
  }
}
