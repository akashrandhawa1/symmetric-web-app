/**
 * Direct Gemini client for Coach Milo Intake
 *
 * Follows the same pattern as the rest of the app (client-side Gemini calls)
 * instead of using Netlify Functions
 */

import type { NextAction, IntakeTurn, NegotiationTurn } from "../../coach/intake/openSchema";
import type { Topic } from "../../coach/intake/contextMap";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-exp";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
      console.error("[miloIntakeGemini] API error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("[miloIntakeGemini] No text in response");
      return null;
    }

    const parsed = JSON.parse(text);

    // Convert to NextAction format
    if ("persona_line" in parsed && "scc" in parsed && "topic" in parsed) {
      const turn: IntakeTurn = {
        persona_line: String(parsed.persona_line ?? ""),
        scc: parsed.scc as IntakeTurn["scc"],
        question: String(parsed.question ?? ""),
        topic: parsed.topic as Topic,
        chips: Array.isArray(parsed.chips) ? parsed.chips.map(String) : [],
      };
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
