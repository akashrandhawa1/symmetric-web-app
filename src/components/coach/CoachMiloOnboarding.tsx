import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Answers } from "./miloChatTypes";
import { buildPlanPreview, getSuggestionsFor } from "./miloChatLogic";
import { tryParseUserAnswer } from "./miloChatLogic";
import { coachState } from "./coachPhase";
import {
  buildIntakeSystemPrompt,
  buildIntakeUserPrompt,
  parseIntakeAgentReply,
  minimalInfoSatisfied,
  looksLikePrescription,
  type IntakeAnswers,
  type IntakeSlots,
} from "./miloIntakeAgent";
import { resolveGeminiApiKey } from "../../lib/geminiKey";

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const randomPause = () => 250 + Math.random() * 350;

const INITIAL_ANSWERS: Answers = { bodyweight: { unit: "lb", value: "" } } as Answers;

const toIntakeAnswers = (answers: Answers): IntakeAnswers => ({
  name: answers.name,
  goal: answers.goal,
  equipment: answers.equipment,
  session_length: answers.session_length,
  experience: answers.experience,
  frequency: answers.frequency,
  constraints: answers.constraints,
  intensity_ref: answers.intensity_ref,
  sensor_today: answers.sensor_today,
});

function inferSlotFromQuestion(question: string): IntakeSlots | null {
  const q = question.toLowerCase();
  if (/call you|name/.test(q)) return "name";
  if (/focus|goal|chasing/.test(q)) return "goal";
  if (/equipment|gear|training with|barbell|dumbbell|machines|bodyweight/.test(q)) return "equipment";
  if (/session|time|minutes|long/.test(q)) return "session_length";
  if (/experience|lifting|level|new|intermediate|advanced/.test(q)) return "experience";
  if (/days|per week|schedule/.test(q)) return "frequency";
  if (/joint|knees|hips|back|constraints|aches/.test(q)) return "constraints";
  if (/load|rpe|percent|intensity/.test(q)) return "intensity_ref";
  if (/sensor|device/.test(q)) return "sensor_today";
  return null;
}

function Bubble({ who, children }: { who: "milo" | "you"; children: React.ReactNode }) {
  const isMilo = who === "milo";
  return (
    <div className={`flex w-full ${isMilo ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 leading-snug shadow-sm ${
          isMilo
            ? "bg-gradient-to-br from-[rgb(0,217,163)] to-[rgb(0,184,138)] text-neutral-900"
            : "bg-neutral-800 text-white border border-neutral-700"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.2s]" />
      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-neutral-400" />
      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:0.2s]" />
    </div>
  );
}

function PlanPreviewCard({
  plan,
  onStart,
}: {
  plan: ReturnType<typeof buildPlanPreview>;
  onStart: () => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-neutral-700 bg-neutral-800 p-4">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-white">{plan.title}</div>
        <div className="text-xs font-medium text-[rgb(0,217,163)]">{plan.freq}×/week</div>
      </div>
      <div className="space-y-2">
        {plan.blocks.map((block, idx) => (
          <div
            key={`${block.name}-${idx}`}
            className="flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2"
          >
            <div>
              <div className="text-sm font-semibold text-white">{block.name}</div>
              <div className="text-xs text-neutral-400">{block.details}</div>
            </div>
            <div className="text-[11px] font-medium text-neutral-500">−{block.estDrop}</div>
          </div>
        ))}
      </div>
      <div className="text-sm text-neutral-300">
        Estimated session drop: <span className="font-semibold text-[rgb(0,217,163)]">−{plan.estSessionDrop}</span>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-gradient-to-r from-[rgb(0,217,163)] to-[rgb(0,184,138)] px-4 py-2 text-sm font-semibold text-neutral-900 shadow-lg shadow-[rgb(0,217,163)]/20 hover:shadow-xl hover:shadow-[rgb(0,217,163)]/30 transition-all"
        >
          Start Session
        </button>
        <button
          type="button"
          className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-700 transition-colors"
          onClick={() => alert("Plan editing coming soon.")}
        >
          Edit Plan
        </button>
        <button
          type="button"
          className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-700 transition-colors"
          onClick={() => window.location.reload()}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

const shouldUseLocalIntake = (): boolean => {
  if (typeof window === "undefined") return false;
  const { hostname, port } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  const isDev = Boolean((import.meta as any)?.env?.DEV);
  if (!isLocalHost && !isDev) return false;
  const normalizedPort = port || (isLocalHost ? "80" : "");
  // Netlify dev defaults to 8888. Any other port (3000, 5173, etc.) means the functions server isn't running.
  return normalizedPort !== "8888";
};

const buildIntakeEndpoints = (): string[] => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return ["/.netlify/functions/coach-intake-next"];
    }
  }
  return ["/api/coach/intake-next", "/.netlify/functions/coach-intake-next"];
};

const localIntakeFallback = (answers: IntakeAnswers): string => {
  const firstMissing = (slots: IntakeSlots[]) => slots.find((slot) => answers[slot] == null);
  const primaryOrder: IntakeSlots[] = [
    "name",
    "goal",
    "equipment",
    "session_length",
    "experience",
  ];
  const secondaryOrder: IntakeSlots[] = [
    "frequency",
    "constraints",
    "intensity_ref",
    "sensor_today",
  ];

  const missingPrimary = firstMissing(primaryOrder);
  const missingSecondary = firstMissing(secondaryOrder);

  if (!missingPrimary && minimalInfoSatisfied(answers)) {
    const summaryGoal = typeof answers.goal === "string" ? String(answers.goal) : "personal";
    return `done|All set—ready to build your ${summaryGoal} plan.`;
  }

  const slot = missingPrimary ?? missingSecondary ?? "name";
  switch (slot) {
    case "name":
      return "ask|What should I call you?";
    case "goal":
      return "ask|What’s the focus—strength, muscle, general fitness, or rehab?";
    case "equipment":
      return "ask|What equipment do you have today—barbell+rack, dumbbells, machines, or bodyweight only?";
    case "session_length":
      return "ask|How long do you want today’s session—20, 30, 45, or 60 minutes?";
    case "experience":
      return "ask|Lifting level check: new, intermediate, or advanced?";
    case "frequency":
      return "ask|How many days per week can you train right now—1 to 4?";
    case "constraints":
      return "ask|Any joints I should be gentle with—knees, hips, low back, or none?";
    case "intensity_ref":
      return "ask|How should I set loads—RPE, %1RM, or should I choose for you?";
    case "sensor_today":
      return "ask|Using the Symmetric sensor today—yes or no?";
    default:
      return "ask|What should I call you?";
  }
};

async function callGeminiDirect(system: string, user: string): Promise<string | null> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    console.warn("[callGeminiDirect] No API key found");
    return null;
  }

  const MODEL_ID = "gemini-2.0-flash";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(MODEL_ID)}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: user }],
            },
          ],
          systemInstruction: {
            parts: [{ text: system }],
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 120,
          },
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.warn(`[callGeminiDirect] Gemini error ${response.status}:`, detail);
      return null;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const textPart = parts.find((part: any) => typeof part?.text === "string");
    const text = typeof textPart?.text === "string" ? textPart.text.trim() : "";

    // Validate response doesn't contain prescriptions
    if (text && looksLikePrescription(text)) {
      console.warn("[callGeminiDirect] Response contained prescription, rejecting");
      return null;
    }

    return text || null;
  } catch (error) {
    console.warn("[callGeminiDirect] Request failed:", error);
    return null;
  }
}

async function callIntakeLLM(answers: IntakeAnswers, lastUserText?: string): Promise<string> {
  const system = buildIntakeSystemPrompt();
  const user = buildIntakeUserPrompt(answers, lastUserText);

  // Try 1: Direct Gemini API call (works in npm run dev!)
  console.log("[intake] Trying direct Gemini API...");
  const directResult = await callGeminiDirect(system, user);
  if (directResult) {
    console.log("[intake] ✓ Direct Gemini succeeded:", directResult);
    return directResult;
  }

  // Try 2: Netlify functions (when deployed or netlify dev)
  if (!shouldUseLocalIntake()) {
    console.log("[intake] Trying Netlify functions...");
    const payload = { system, user };
    const endpoints = buildIntakeEndpoints();

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const text = String(data?.text ?? data?.reply ?? "").trim();
        if (text) {
          console.log("[intake] ✓ Netlify function succeeded:", text);
          return text;
        }
      } catch (error) {
        console.warn("[intake-agent] Netlify function failed", error);
      }
    }
  }

  // Try 3: Hard-coded fallback
  console.log("[intake] Using hard-coded fallback");
  return localIntakeFallback(answers);
}

const slotToQuestionId = (slot: IntakeSlots) => slot as any;

const updateAnswersForSlot = (prev: Answers, slot: IntakeSlots, value: any): Answers => {
  const next: Answers = {
    ...prev,
    bodyweight: prev.bodyweight ?? { unit: "lb", value: "" },
  };
  switch (slot) {
    case "name":
      (next as any).name = String(value).trim();
      break;
    case "goal":
      (next as any).goal = value;
      break;
    case "equipment":
      (next as any).equipment = Array.isArray(value) ? value : value ? [value] : undefined;
      break;
    case "session_length":
      (next as any).session_length = value != null ? Number(value) || undefined : undefined;
      break;
    case "experience":
      (next as any).experience = value;
      break;
    case "frequency":
      if (value != null) (next as any).frequency = Number(value) || undefined;
      break;
    case "constraints":
      (next as any).constraints = Array.isArray(value) ? value : value ? [value] : undefined;
      break;
    case "intensity_ref":
      (next as any).intensity_ref = value;
      break;
    case "sensor_today":
      (next as any).sensor_today = value;
      break;
    default:
      break;
  }
  return next;
};

export default function CoachMiloOnboarding({ onComplete }: { onComplete: () => void }) {
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const answersRef = useRef<Answers>(INITIAL_ANSWERS);
  const [messages, setMessages] = useState<Array<{ who: "milo" | "you"; text: string }>>([
    {
      who: "milo",
      text: `${timeGreeting()}! I'm Coach Milo 🐺—your AI strength coach inside Symmetric.`,
    },
    {
      who: "milo",
      text: "I'll help you track your quads, balance your training, and build your plan. Let's personalize it quick—just talk to me like you would a real coach.",
    },
  ]);
  const [typing, setTyping] = useState(false);
  const [composer, setComposer] = useState("");
  const [, forcePhase] = useState(0);
  const [previewSummary, setPreviewSummary] = useState<string | null>(null);
  const [lastParsedValue, setLastParsedValue] = useState<{ label: string; slot: IntakeSlots } | null>(null);
  const [failedParses, setFailedParses] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastAskedSlotRef = useRef<IntakeSlots | null>(null);
  const lastQuestionRef = useRef<string | null>(null);
  const pendingRequestRef = useRef(false);

  useEffect(() => coachState.onChange(() => forcePhase((n) => n + 1)), [forcePhase]);

  const appendMessage = useCallback((who: "milo" | "you", text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { who, text: trimmed }]);
  }, []);

  const addMilo = useCallback((text: string) => appendMessage("milo", text), [appendMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const intakeComplete = useMemo(() => minimalInfoSatisfied(toIntakeAnswers(answers)), [answers]);
  const planPreview = useMemo(() => (intakeComplete ? buildPlanPreview(answers) : null), [intakeComplete, answers]);

  const requiredSlots: IntakeSlots[] = ["name", "goal", "equipment", "session_length", "experience"];
  const filledSlots = useMemo(() => {
    const intakeAnswers = toIntakeAnswers(answers);
    return requiredSlots.filter(slot => intakeAnswers[slot] != null).length;
  }, [answers]);

  const currentSlotSuggestions = useMemo(() => {
    if (!lastAskedSlotRef.current) return [];
    return getSuggestionsFor(slotToQuestionId(lastAskedSlotRef.current));
  }, [lastAskedSlotRef.current]);

  const askNext = useCallback(
    async (currentAnswers: Answers, lastUserText?: string) => {
      if (coachState.phase !== "intake" || pendingRequestRef.current) return;
      pendingRequestRef.current = true;
      setTyping(true);
      try {
        const raw = await callIntakeLLM(toIntakeAnswers(currentAnswers), lastUserText);
        const parsed = parseIntakeAgentReply(raw);
        if (parsed.type === "done" || minimalInfoSatisfied(toIntakeAnswers(currentAnswers))) {
          if (coachState.phase === "intake") coachState.setPhase("preview");
          const summary = parsed.text.replace(/^done\|/, "").trim() || "All set. Here’s a clean first session.";
          setPreviewSummary(summary);
          addMilo(summary);
        } else {
          const question = parsed.text.replace(/^ask\|/, "").trim();
          lastQuestionRef.current = question;
          lastAskedSlotRef.current = inferSlotFromQuestion(question);
          addMilo(question);
        }
      } catch (error) {
        console.warn("[intake-agent] askNext failed", error);
        const fallback = "What should I call you?";
        lastQuestionRef.current = fallback;
        lastAskedSlotRef.current = "name";
        addMilo(fallback);
      } finally {
        setTyping(false);
        pendingRequestRef.current = false;
      }
    },
    [addMilo]
  );

  useEffect(() => {
    coachState.setPhase("intake");
    (async () => {
      await sleep(300);
      await askNext(answersRef.current);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendAnswer = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      appendMessage("you", text);

      if (coachState.phase !== "intake") {
        return;
      }

      let updatedAnswers = answersRef.current;
      const slot = lastAskedSlotRef.current ?? inferSlotFromQuestion(lastQuestionRef.current ?? "");

      if (slot === "name") {
        updatedAnswers = updateAnswersForSlot(updatedAnswers, slot, text);
        answersRef.current = updatedAnswers;
        setAnswers(updatedAnswers);
        setLastParsedValue({ label: text, slot });
        setFailedParses(0);
      } else if (slot) {
        const parsed = tryParseUserAnswer(slotToQuestionId(slot), text);
        if (parsed) {
          updatedAnswers = updateAnswersForSlot(updatedAnswers, slot, parsed.value);
          answersRef.current = updatedAnswers;
          setAnswers(updatedAnswers);
          setLastParsedValue({ label: parsed.label, slot });
          setFailedParses(0);
        } else {
          // Failed to parse - provide helpful feedback
          setFailedParses(prev => prev + 1);

          if (failedParses >= 1) {
            // After 2 failed attempts, show suggestions
            const suggestions = getSuggestionsFor(slotToQuestionId(slot));
            if (suggestions.length > 0) {
              addMilo(`I didn't catch that. Try one of these: ${suggestions.slice(0, 3).join(', ')}`);
              return; // Don't ask next question yet
            }
          }
        }
      }

      await askNext(updatedAnswers, text);
    },
    [appendMessage, askNext, failedParses, addMilo]
  );

  const handleSend = useCallback(async () => {
    const text = composer.trim();
    if (!text) return;
    setComposer("");
    await sendAnswer(text);
  }, [composer, sendAnswer]);

  const handleStartSession = useCallback(() => {
    coachState.setPhase("live");
    onComplete();
  }, [onComplete]);

  return (
    <div className="flex h-full flex-col">
      {/* Progress Bar */}
      {coachState.phase === "intake" && (
        <div className="mb-4 space-y-1">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full bg-gradient-to-r from-[rgb(0,217,163)] to-[rgb(0,184,138)] transition-all duration-500 ease-out"
              style={{ width: `${(filledSlots / requiredSlots.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-neutral-400">
            {filledSlots}/{requiredSlots.length} questions answered
          </p>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex max-h-[60vh] min-h-[60vh] flex-col gap-3 overflow-y-auto pb-4"
      >
        {messages.map((message, idx) => (
          <Bubble key={`${idx}-${message.text.slice(0, 16)}`} who={message.who}>
            {message.text}
          </Bubble>
        ))}
        {typing && coachState.phase === "intake" && (
          <Bubble who="milo">
            <TypingDots />
          </Bubble>
        )}
        {coachState.phase === "preview" && planPreview && (
          <Bubble who="milo">
            <PlanPreviewCard plan={planPreview} onStart={handleStartSession} />
          </Bubble>
        )}
      </div>

      {/* Suggestion Chips */}
      {coachState.phase === "intake" && currentSlotSuggestions.length > 0 && !typing && (
        <div className="mb-3 flex flex-wrap gap-2">
          {currentSlotSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => void sendAnswer(suggestion)}
              className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-[rgb(0,217,163)] hover:bg-[rgb(0,217,163)]/10 hover:text-[rgb(0,217,163)]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <input
          value={composer}
          onChange={(event) => setComposer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          disabled={coachState.phase !== "intake"}
          placeholder="Message Coach Milo…"
          className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 shadow-sm placeholder:text-neutral-600 focus:border-[rgb(0,217,163)] focus:outline-none focus:ring-2 focus:ring-[rgb(0,217,163)]/20 disabled:cursor-not-allowed disabled:bg-neutral-800"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={coachState.phase !== "intake"}
          className="rounded-xl bg-gradient-to-r from-[rgb(0,217,163)] to-[rgb(0,184,138)] px-4 py-2 text-sm font-semibold text-neutral-900 shadow-lg shadow-[rgb(0,217,163)]/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none hover:shadow-xl hover:shadow-[rgb(0,217,163)]/30 transition-all"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
