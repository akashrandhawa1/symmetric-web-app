import React, { useCallback, useEffect, useRef, useState } from "react";
import type { NextAction, IntakeTurn, NegotiationTurn, WrapTurn, PlanSummary } from "../../coach/intake/openSchema";
import type { Topic } from "../../coach/intake/contextMap";
import {
  SCRIPTED_TOPIC_SEQUENCE,
  PERSONA_LINES,
  resolveIntakeBranch,
  scriptedNextAction,
} from "../../coach/intake/scriptedFlow";
import { saveIntakeProfile } from "../../coach/intake/profileStorage";
import { coachState } from "./coachPhase";
import { tryParseUserAnswer } from "./miloChatLogic";
import type { QuestionId } from "./miloChatTypes";
import IntakeProgressIndicator from "./IntakeProgressIndicator";
import EnhancedTypingIndicator from "./EnhancedTypingIndicator";
import AnswerSummaryPanel from "./AnswerSummaryPanel";
import EnhancedChip from "./EnhancedChip";

type CoachTurnMessage = {
  who: "milo";
  kind: "turn";
  turn: IntakeTurn;
};

type CoachNegotiationMessage = {
  who: "milo";
  kind: "negotiation";
  negotiation: NegotiationTurn;
};

type CoachWrapMessage = {
  who: "milo";
  kind: "wrap";
  wrap: WrapTurn;
};

type CoachTextMessage = {
  who: "milo";
  kind: "text";
  text: string;
};

type UserMessage = {
  who: "you";
  kind: "text";
  text: string;
};

type Message = CoachTurnMessage | CoachNegotiationMessage | CoachWrapMessage | CoachTextMessage | UserMessage;

type ActiveAsk =
  | { kind: "turn"; topic: Topic; question: string; chips: string[] }
  | { kind: "negotiation"; question: string; chips: string[] }
  | { kind: "final_check"; question: string; chips: string[] };

type IntakeRequestPayload = {
  answers: Record<string, any>;
  coverage: Record<string, boolean>;
  user_name?: string;
  branch?: "athlete" | "lifestyle" | "auto";
  last_user_text?: string;
  recent_topics?: string[];
};

const PERSONA_TOPIC_KEYS = Object.keys(PERSONA_LINES).filter(
  (key): key is Topic => key !== "default"
);
const TOPIC_KEYS: Topic[] = Array.from(
  new Set<Topic>([...SCRIPTED_TOPIC_SEQUENCE, ...PERSONA_TOPIC_KEYS])
);
const TOPIC_SET = new Set<Topic>(TOPIC_KEYS);

const INITIAL_MESSAGES: Message[] = [
  {
    who: "milo",
    kind: "text",
    text: `${new Date().getHours() < 12 ? "Good morning" : "Hey there"}! I'm Coach Milo 🐺—your AI strength coach inside Symmetric.`,
  },
  {
    who: "milo",
    kind: "text",
    text: "I’ll learn your setup and dial the plan. Just talk to me like you would a real coach.",
  },
];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const ensurePlanRevealStyles = () => {
    if (typeof document === "undefined") return;
    if (document.getElementById("plan-reveal-animations")) return;
    const style = document.createElement("style");
    style.id = "plan-reveal-animations";
    style.textContent = `
    @keyframes plan-reveal-fade {
      0% { opacity: 0; transform: translateY(36px) scale(0.97); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes plan-card-rise {
      0% { opacity: 0; transform: translateY(28px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes plan-glow {
      0%, 100% { opacity: 0.35; transform: scale(1); }
      50% { opacity: 0.9; transform: scale(1.05); }
    }
    @keyframes plan-trail {
      0% { transform: translateX(-20%); opacity: 0; }
      50% { opacity: 0.6; }
      100% { transform: translateX(120%); opacity: 0; }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes spin-slower {
      from { transform: rotate(0deg); }
      to { transform: rotate(-360deg); }
    }
    .animate-spin-slow { animation: spin-slow 4s linear infinite; }
    .animate-spin-slower { animation: spin-slower 6s linear infinite; }
  `;
  document.head.appendChild(style);
};

const PlanLoadingOverlay: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
  useEffect(() => {
    ensurePlanRevealStyles();
  }, []);

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-xl" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/85 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)]" style={{ animation: "plan-reveal-fade 0.6s ease forwards" }}>
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6 h-32 w-32">
            <div className="absolute inset-0 rounded-full border border-white/15" />
            <div className="absolute inset-2 rounded-full border border-white/10" />
            <span className="absolute left-1/2 top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-emerald-400" style={{ animation: "plan-trail 2.6s ease-in-out infinite" }} />
            <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-dashed border-white/20" />
            <div className="absolute inset-4 animate-spin-slower rounded-full border border-white/10" />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              syncing
            </div>
          </div>
          <h3 className="text-lg font-semibold">Building your plan</h3>
          <p className="mt-2 text-sm text-white/75">
            Pulling in goals, constraints, and environment so every block fits exactly where you need it.
          </p>
          <ul className="mt-4 w-full space-y-2 text-left text-xs text-white/65">
            <li className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Goal profile ✓
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-sky-400" />
              Equipment & environment ✓
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-300" />
              Schedule & constraints ✓
            </li>
          </ul>
          <button
            type="button"
            onClick={onCancel}
            className="mt-6 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60 hover:border-white/30 hover:text-white/80"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const sanitizeNote = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(no|none|nothing|nah|n\/a|not really|all good|ready|that's it|nope)$/i.test(trimmed)) {
    return null;
  }
  return trimmed;
};

const topicToQuestionId = (topic: Topic): QuestionId | null => {
  switch (topic) {
    case "primary_goal":
    case "goal_intent":
      return "primary_goal";
    case "training_context":
    case "experience_level":
      return "training_context";
    case "equipment_session":
    case "equipment":
      return "equipment_session";
    case "frequency_commitment":
    case "frequency":
      return "frequency_commitment";
    case "body_metrics":
      return "body_metrics";
    case "limitations":
    case "constraints":
      return "limitations";
    case "sport_context":
    case "sport_role":
      return "sport_context";
    case "name":
      return "name";
    default:
      return null;
  }
};

const deriveFirstName = (intro: string | undefined): string => {
  if (!intro) return "You";
  const commaIndex = intro.indexOf(',');
  if (commaIndex > 0) {
    const candidate = intro.slice(0, commaIndex).trim();
    if (/^[A-Za-z'\-]{2,20}$/.test(candidate)) return candidate;
  }
  return "You";
};

const formatConstraintPhrase = (constraint: string | null | undefined): { short: string | null; clause: string | null } => {
  if (!constraint) return { short: null, clause: null };
  const trimmed = constraint.trim();
  if (!trimmed || /^none$/i.test(trimmed)) return { short: null, clause: null };
  const sentence = trimmed.replace(/[.]+$/, "");
  const lower = sentence.toLowerCase();
  if (lower.startsWith("protect ")) {
    return { short: sentence, clause: sentence.toLowerCase() };
  }
  return { short: sentence, clause: `keeping ${sentence.toLowerCase()}` };
};

const goalFocusMap: Record<PlanSummary['goal'], { descriptor: string; intro: string }> = {
  muscle: {
    descriptor: 'Muscle & Power',
    intro: 'building muscle and power you can feel on the field',
  },
  'lower-body strength': {
    descriptor: 'Lower-body Strength',
    intro: 'stacking lower-body strength with smart control',
  },
  general: {
    descriptor: 'Balanced Strength',
    intro: 'staying strong, balanced, and ready for anything',
  },
  rehab: {
    descriptor: 'Rebuild & Recover',
    intro: 'rebuilding strength safely without flare-ups',
  },
};

const blockIcons = ['🧩', '🔺', '⚡️', '🚀'];

type PlanNarrative = {
  firstName: string;
  introLine: string;
  chips: Array<{ label: string; value: string }>;
  blocks: Array<{ icon: string; title: string; description: string }>;
  phases: Array<{ title: string; focus: string; description: string }>;
  note: string | null;
  ctaLabel: string;
  ctaCaption: string;
};

const buildPlanNarrative = (wrap: WrapTurn, note: string | null | undefined): PlanNarrative => {
  const summary = wrap.plan_summary;
  const goalMeta = goalFocusMap[summary.goal] ?? goalFocusMap.general;
  const { short: constraintShort, clause: constraintClause } = formatConstraintPhrase(summary.constraints_notes);
  const firstName = deriveFirstName(wrap.coach_intro);
  const meaningfulNote = sanitizeNote(note);
  const weeks = summary.weeks ?? 4;

  const introLine = meaningfulNote
    ? `${firstName}, you mentioned "${meaningfulNote}". Here’s a ${weeks}-week plan focused on ${goalMeta.intro}${constraintClause ? ` while ${constraintClause}` : ''}.`
    : `${firstName}, here’s a ${weeks}-week plan focused on ${goalMeta.intro}${constraintClause ? ` while ${constraintClause}` : ''}.`;

  const chips = [
    { label: 'Focus', value: goalMeta.descriptor },
    { label: 'Timeline', value: `${weeks} ${weeks === 1 ? 'week' : 'weeks'}` },
    { label: 'Schedule', value: `${summary.days_per_week}× / wk • ${summary.session_length_min} min` },
    { label: 'Constraints', value: constraintShort ?? 'Stay smart with form' },
  ];

  const constraintLower = (constraintShort ?? '').toLowerCase();
  const jointKeyword = constraintLower.match(/hip|knee|back|shoulder|ankle/);
  const jointFriendly = jointKeyword ? `keeping your ${jointKeyword[0]} happy` : 'staying joint-friendly';

  const blockMessages: Array<string | undefined> = [
    summary.goal === 'rehab'
      ? `Ease in with tempo and controlled range so confidence rebuilds without flare-ups.`
      : `Dial in tempo and symmetry so ${jointKeyword ? jointFriendly : 'every rep feels smooth'} before we load up.`,
    summary.goal === 'muscle'
      ? `Layer progressive load and accessory volume to build muscle evenly across both legs.`
      : summary.goal === 'rehab'
      ? `Add gentle overload and unilateral patterns to restore strength evenly.`
      : `Build strength each week with progressive loading while keeping form tight.`,
    `Finish with power and mobility touches so you stay explosive and fresh.`,
  ];

  const blocks = summary.blocks.map((block, idx) => ({
    icon: blockIcons[idx % blockIcons.length],
    title: block.name ?? `Block ${idx + 1}`,
    description: blockMessages[idx] ?? block.objective ?? 'Purpose-built work to keep momentum going.',
  }));

  const stabilityCopy = jointKeyword
    ? `Expect that your ${jointKeyword[0]} feels smoother as tempo work and stability drills lock in.`
    : 'You’ll feel movement patterns tighten up as tempo work builds control.';
  const strengthCopy = summary.goal === 'muscle'
    ? 'Volume and steady overload bring visible size and stronger drives through each leg.'
    : summary.goal === 'rehab'
    ? 'Strength rebuilds evenly—notice how unilateral work evens things out.'
    : 'Loads feel lighter, bar speed improves, and balance stays sharp.';
  const powerCopy = summary.goal === 'muscle'
    ? 'Keep pumps high with optional finishers and mobility so gains stay smooth.'
    : 'Rotate finishers and mobility so you stay fast, durable, and ready for sport.';

  const phases = [
    { title: 'Weeks 1–2', focus: 'Stability & Control', description: stabilityCopy },
    { title: 'Weeks 3–4', focus: summary.goal === 'rehab' ? 'Confidence & Strength' : 'Strength & Volume', description: strengthCopy },
    { title: 'Week 5+', focus: 'Power & Longevity', description: powerCopy },
  ];

  return {
    firstName,
    introLine,
    chips,
    blocks,
    phases,
    note: meaningfulNote,
    ctaLabel: "I'm ready to train 💪",
    ctaCaption: 'This plan adapts as your readiness evolves.',
  };
};

function buildIntakeEndpoints(): string[] {
  if (typeof window === "undefined") {
    return ["/.netlify/functions/coach-intake-next"];
  }

  const endpoints = new Set<string>();
  const { hostname, port, protocol } = window.location;

  endpoints.add("/.netlify/functions/coach-intake-next");

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const localPort = port || "8888";
    endpoints.add(`${protocol}//${hostname}:${localPort}/.netlify/functions/coach-intake-next`);
  }

  if (port === "8888") {
    endpoints.add(`${protocol}//${hostname}:8888/.netlify/functions/coach-intake-next`);
  }

  if (hostname.endsWith(".netlify.app")) {
    endpoints.add("/.netlify/functions/coach-intake-next");
  }

  return Array.from(endpoints);
}

function isTopic(value: string): value is Topic {
  return TOPIC_SET.has(value as Topic);
}

function toCoverageRecord(source: Partial<Record<Topic, boolean>>): Record<string, boolean> {
  const record: Record<string, boolean> = {};
  for (const topic of TOPIC_KEYS) {
    if (source[topic]) {
      record[topic] = true;
    }
  }
  return record;
}

const Bubble: React.FC<{ who: "milo" | "you"; children: React.ReactNode }> = ({ who, children }) => {
  const isMilo = who === "milo";
  return (
    <div className={`flex w-full ${isMilo ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 leading-snug shadow-sm ${
          isMilo ? "bg-white text-neutral-900 border border-neutral-200" : "bg-neutral-900 text-white"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

const PlanRevealOverlay: React.FC<{
  wrap: WrapTurn;
  finalNote?: string | null;
  onStart: () => void;
  onClose: () => void;
}> = ({ wrap, finalNote, onStart, onClose }) => {
  useEffect(() => {
    ensurePlanRevealStyles();
  }, []);

  const narrative = buildPlanNarrative(wrap, finalNote);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-xl" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm" style={{ animation: "plan-reveal-fade 0.55s ease forwards" }}>
        <div className="relative max-h-[85vh] overflow-y-auto rounded-3xl border border-white/12 bg-neutral-950/90 p-6 text-neutral-100 shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
          <div className="space-y-6">
            <div className="space-y-3 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/70">
                Ready for you
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              <p className="text-sm text-white/80 leading-relaxed">{narrative.introLine}</p>
              {narrative.note ? (
                <div className="mx-auto w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-left text-xs text-white/80">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">Your note</div>
                  <div className="mt-1 text-sm text-white/90 break-words">{narrative.note}</div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              {narrative.chips.map((chip, idx) => (
                <div
                  key={chip.label}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white/85"
                  style={{ animation: "plan-card-rise 0.6s ease ${0.04 * idx}s both" }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">{chip.label}</span>
                  <span className="text-sm font-semibold text-white">{chip.value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {narrative.blocks.map((block, idx) => (
                <div
                  key={block.title + idx}
                  className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-left text-white/85"
                  style={{ animation: "plan-card-rise 0.65s ease ${0.1 * idx + 0.2}s both" }}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span>{block.icon}</span>
                    <span>{block.title}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/75">{block.description}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/6 p-4 text-left text-white/80">
              <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">What to expect</div>
              <div className="mt-3 space-y-3 text-sm">
                {narrative.phases.map((phase) => (
                  <div key={phase.title}>
                    <div className="text-sm font-semibold text-white">{phase.title} • {phase.focus}</div>
                    <p className="mt-1 text-white/75">{phase.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs uppercase tracking-[0.32em] text-white/60">
              <span>Ready to move?</span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onStart}
                  className="rounded-2xl bg-white py-3 text-sm font-semibold text-neutral-900 shadow-[0_12px_28px_rgba(255,255,255,0.18)] transition hover:bg-white/90"
                >
                  {narrative.ctaLabel}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-white/20 py-3 text-sm font-semibold text-white/80 transition hover:border-white/35 hover:text-white"
                >
                  Back to conversation
                </button>
              </div>
              <p className="text-center text-[11px] text-white/55">{narrative.ctaCaption}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CoachMiloOnboardingOpen({ onComplete }: { onComplete: () => void }) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [typing, setTyping] = useState(false);
  const [composer, setComposer] = useState("");
  const [activeAsk, setActiveAsk] = useState<ActiveAsk | null>(null);
  const [pendingWrap, setPendingWrap] = useState<WrapTurn | null>(null);
  const [planRevealed, setPlanRevealed] = useState(false);
  const [finalNote, setFinalNote] = useState<string | null>(null);
  const [planRevealWrap, setPlanRevealWrap] = useState<WrapTurn | null>(null);
  const [showPlanReveal, setShowPlanReveal] = useState(false);
  const [showPlanLoading, setShowPlanLoading] = useState(false);
  const [showAnswerSummary, setShowAnswerSummary] = useState(false);
  const [typingStartTime, setTypingStartTime] = useState<number | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const answersRef = useRef<Record<string, any>>({});
  const coverageRef = useRef<Partial<Record<Topic, boolean>>>({});
  const recentTopicsRef = useRef<string[]>([]);
  const pendingRef = useRef(false);
  const bootstrappedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  // Generate contextual transitions between questions
  const generateTransition = useCallback((nextTopic: Topic, answers: Record<string, any>): string | null => {
    const firstName = answers.name ? answers.name.split(/[ ,]/)[0].trim() : null;
    const greeting = firstName || "Got it";
    const goal = typeof answers.primary_goal === "string" ? answers.primary_goal.toLowerCase() :
      typeof answers.goal_intent === "string" ? answers.goal_intent.toLowerCase() : "";

    if (nextTopic === "primary_goal") {
      return `${greeting}! What’s the big focus—strength, muscle, sport, rehab, or general fitness?`;
    }

    if (nextTopic === "training_context") {
      return `${greeting}. How would you describe your lifting experience?`;
    }

    if (nextTopic === "equipment_session") {
      return `${greeting}. Let's talk setup—what gear and how long per session?`;
    }

    if (nextTopic === "frequency_commitment") {
      const session = answers.equipment_session;
      if (session?.session_minutes) {
        return `Perfect, ${session.session_minutes} minutes per session. How many days per week fits?`;
      }
      return `${greeting}. How many days per week can you train, and for how many weeks?`;
    }

    if (nextTopic === "body_metrics") {
      return `${greeting}. Quick stats check—age, height (ft/in), and weight in pounds?`;
    }

    if (nextTopic === "limitations" && /rehab|injur|recover/.test(goal)) {
      return `Noted. Any joints or injuries I should protect before we load up?`;
    }

    if (nextTopic === "sport_context" && /sport|team|athlete/.test(goal)) {
      return `${greeting}. Which sport or position should I tailor this around?`;
    }

    return null;
  }, []);

  const handleAction = useCallback(
    (action: NextAction) => {
      if (action.action === "turn") {
        // Add contextual transition before the question
        const transition = generateTransition(action.turn.topic, answersRef.current);
        if (transition) {
          appendMessage({ who: "milo", kind: "text", text: transition });
        }

        appendMessage({ who: "milo", kind: "turn", turn: action.turn });
        setActiveAsk({
          kind: "turn",
          topic: action.turn.topic,
          question: action.turn.question,
          chips: action.turn.chips ?? [],
        });
        if (action.turn.topic) {
          recentTopicsRef.current = [...recentTopicsRef.current, action.turn.topic].slice(-5);
        }
        return;
      }

      if (action.action === "negotiation") {
        appendMessage({ who: "milo", kind: "negotiation", negotiation: action.negotiation });
        setActiveAsk({
          kind: "negotiation",
          question: action.negotiation.question,
          chips: action.negotiation.chips ?? [],
        });
        return;
      }

      setPendingWrap(action.wrap);
      setPlanRevealWrap(null);
      setShowPlanReveal(false);
      setPlanRevealed(false);
      setFinalNote(null);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setShowPlanLoading(false);
      appendMessage({
        who: "milo",
        kind: "text",
        text: "Before I lock this in, is there anything else you'd like me to factor in? Share any last notes, or hit the button when you're ready for your plan.",
      });
      setActiveAsk({
        kind: "final_check",
        question: "Anything else you want me to know? (Optional)",
        chips: [],
      });
      const storedBranch = resolveIntakeBranch("auto", answersRef.current);
      saveIntakeProfile({ answers: { ...answersRef.current, branch: storedBranch }, planSummary: action.wrap.plan_summary });
      coachState.setPhase("preview");
      return;
    },
    [appendMessage, generateTransition]
  );

  const fetchNext = useCallback(
    async (lastUserText?: string, updatedAnswers?: Record<string, any>) => {
      if (pendingRef.current) {
        console.warn("[coach-intake] fetchNext already pending, skipping");
        return;
      }
      pendingRef.current = true;
      setTyping(true);
      setTypingStartTime(Date.now());
      console.log("[coach-intake] fetchNext called", { lastUserText, hasUpdatedAnswers: !!updatedAnswers });
      await sleep(160);

      try {
        const currentAnswers = updatedAnswers ?? answersRef.current;

        const branch = resolveIntakeBranch("auto", currentAnswers);

        const payload: IntakeRequestPayload = {
          answers: currentAnswers,
          coverage: toCoverageRecord(coverageRef.current),
          user_name: typeof currentAnswers.name === "string" ? currentAnswers.name : undefined,
          branch,
          last_user_text: lastUserText,
          recent_topics: recentTopicsRef.current.slice(-3),
        };

        const endpoints = buildIntakeEndpoints();
        console.log("[coach-intake] Trying endpoints:", endpoints);
        let nextAction: NextAction | null = null;

        for (const endpoint of endpoints) {
          try {
            console.log("[coach-intake] Fetching from:", endpoint);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
            console.log("[coach-intake] Response status:", response.status);

            if (!response.ok) {
              continue;
            }

            nextAction = (await response.json()) as NextAction;
            console.log("[coach-intake] Got nextAction from endpoint");
            break;
          } catch (error) {
            console.warn("[coach-intake] request failed:", endpoint, error);
          }
        }

        if (!nextAction) {
          // Fallback to scripted flow when functions are unavailable (e.g., npm run dev without netlify dev)
          console.log("[coach-intake] Using local scripted fallback");
          nextAction = scriptedNextAction(currentAnswers, branch);
        }

        if (!nextAction) {
          appendMessage({
            who: "milo",
            kind: "text",
            text: "I'm running into heavy traffic right now. Give me a second and try again.",
          });
          return;
        }

        handleAction(nextAction);
      } finally {
        setTyping(false);
        setTypingStartTime(null);
        pendingRef.current = false;
      }
    },
    [appendMessage, handleAction]
  );

  const updateCoverage = useCallback((topic: Topic) => {
    coverageRef.current = { ...coverageRef.current, [topic]: true };
  }, []);

  const handleSend = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || !activeAsk) return;
      if (activeAsk.kind === "final_check") {
        const meaningful = sanitizeNote(trimmed);
        const nextAnswers = { ...answersRef.current };
        if (meaningful) {
          appendMessage({ who: "you", kind: "text", text: meaningful });
          nextAnswers.final_note = meaningful;
        } else {
          delete nextAnswers.final_note;
        }
        setFinalNote(meaningful);
        answersRef.current = nextAnswers;
        return;
      }

      appendMessage({ who: "you", kind: "text", text: trimmed });

      let topicKey: Topic | undefined;
      if (activeAsk.kind === "turn" && isTopic(activeAsk.topic)) {
        topicKey = activeAsk.topic;
      }

      setActiveAsk(null);

      const questionId: QuestionId | null = topicKey ? topicToQuestionId(topicKey) : null;
      const parsed = questionId ? tryParseUserAnswer(questionId, trimmed) : null;
      const storedValue = parsed ? parsed.value : trimmed;

      const fieldId = topicKey ?? `note_${Date.now()}`;
      const nextAnswers = { ...answersRef.current, [fieldId]: storedValue };

      if (questionId === "body_metrics" && parsed && typeof parsed.value === "object") {
        const metrics = parsed.value as { age?: number | null; height_ft?: number | null; height_in?: number | null; weight_lb?: number | null };
        nextAnswers.body_metrics = metrics;
        if (metrics.age != null) nextAnswers.age = metrics.age;
        if (metrics.height_ft != null) nextAnswers.height_ft = metrics.height_ft;
        if (metrics.height_in != null) nextAnswers.height_in = metrics.height_in;
        if (metrics.weight_lb != null) nextAnswers.weight_lb = metrics.weight_lb;
      }

      if (questionId === "equipment_session" && parsed && typeof parsed.value === "object") {
        nextAnswers.equipment_session = parsed.value;
      }

      if (questionId === "frequency_commitment" && parsed && typeof parsed.value === "object") {
        nextAnswers.frequency_commitment = parsed.value;
      }

      if (questionId === "primary_goal" && parsed) {
        nextAnswers.primary_goal = parsed.value;
      }

      if (questionId === "training_context" && parsed) {
        nextAnswers.training_context = parsed.value;
      }

      if (questionId === "limitations" && parsed) {
        nextAnswers.limitations = parsed.value;
      }

      if (questionId === "sport_context" && parsed) {
        nextAnswers.sport_context = parsed.value;
      }

      answersRef.current = nextAnswers;

      if (topicKey) {
        updateCoverage(topicKey);
      }

      await fetchNext(trimmed, nextAnswers);
    },
    [activeAsk, appendMessage, fetchNext, updateCoverage]
  );

  const handleRevealPlan = useCallback(() => {
    if (!pendingWrap || showPlanLoading) return;

    const wrap = pendingWrap;
    const noteToCapture = composer.trim();
    let nextAnswers: Record<string, any> = { ...answersRef.current };

    if (noteToCapture) {
      const meaningful = sanitizeNote(noteToCapture);
      if (meaningful) {
        appendMessage({ who: "you", kind: "text", text: meaningful });
        nextAnswers = { ...nextAnswers, final_note: meaningful };
        setFinalNote(meaningful);
      } else {
        delete nextAnswers.final_note;
        setFinalNote(null);
      }
      setComposer("");
    } else if (finalNote) {
      nextAnswers = { ...nextAnswers, final_note: finalNote };
    } else {
      delete nextAnswers.final_note;
    }

    answersRef.current = nextAnswers;

    setActiveAsk(null);
    setShowPlanLoading(true);

    const branch = resolveIntakeBranch("auto", nextAnswers);

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    loadingTimeoutRef.current = setTimeout(() => {
      saveIntakeProfile({ answers: { ...nextAnswers, branch }, planSummary: wrap.plan_summary });
      appendMessage({ who: "milo", kind: "wrap", wrap });
      setPlanRevealWrap(wrap);
      setShowPlanReveal(true);
      setPendingWrap(null);
      setPlanRevealed(true);
      setShowPlanLoading(false);
      loadingTimeoutRef.current = null;
    }, 650);
  }, [appendMessage, composer, finalNote, pendingWrap, showPlanLoading]);

  const handleChip = useCallback(
    async (choice: string) => {
      if (!activeAsk || showPlanLoading) return;
      if (activeAsk.kind === "final_check") {
        await handleSend(choice);
        handleRevealPlan();
        return;
      }
      await handleSend(choice);
    },
    [activeAsk, handleRevealPlan, handleSend, showPlanLoading]
  );

  const handleCancelLoading = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setShowPlanLoading(false);
  }, []);

  const handleSkipAI = useCallback(() => {
    // Force use of local fallback
    setTyping(false);
    setTypingStartTime(null);
    const currentAnswers = answersRef.current;
    const branch = resolveIntakeBranch("auto", currentAnswers);
    const nextAction = scriptedNextAction(currentAnswers, branch);
    if (nextAction) {
      handleAction(nextAction);
    }
    pendingRef.current = false;
  }, [handleAction]);

  // Build answer summary for display
  const getAnsweredQuestions = useCallback(() => {
    const answers = answersRef.current;
    const summary: Array<{ key: string; label: string; value: string }> = [];

    const labelMap: Record<string, string> = {
      name: "Name",
      primary_goal: "Goal",
      goal_intent: "Goal",
      training_context: "Experience",
      experience_level: "Experience",
      equipment_session: "Equipment",
      equipment: "Equipment",
      frequency_commitment: "Days/week",
      frequency: "Days/week",
      body_metrics: "Body metrics",
      limitations: "Limitations",
      constraints: "Constraints",
      sport_context: "Sport",
      sport_role: "Sport",
      motivation: "Why",
      timeline: "Timeline",
      baseline_strength: "Strength",
      environment: "Environment",
      session_length: "Session length",
    };

    for (const [key, value] of Object.entries(answers)) {
      if (!labelMap[key] || value == null) continue;

      let displayValue: string;

      if (key === "equipment_session" && typeof value === "object") {
        const session = value as { equipment?: string[]; session_minutes?: number };
        const equipment = session.equipment?.join(", ") ?? "";
        const minutes = session.session_minutes ? `${session.session_minutes} min` : "";
        displayValue = [equipment, minutes].filter(Boolean).join(" · ") || "(details)";
      } else if (key === "frequency_commitment" && typeof value === "object") {
        const freq = value as { days_per_week?: number; focus_weeks?: number };
        const days = freq.days_per_week ? `${freq.days_per_week}×/wk` : "";
        const weeks = freq.focus_weeks ? `${freq.focus_weeks} wks` : "";
        displayValue = [days, weeks].filter(Boolean).join(" · ") || "(details)";
      } else if (key === "body_metrics" && typeof value === "object") {
        const metrics = value as { age?: number; height_ft?: number; height_in?: number; weight_lb?: number };
        const pieces = [
          metrics.age ? `${metrics.age}y` : null,
          metrics.height_ft != null ? `${metrics.height_ft}'${metrics.height_in ?? 0}"` : null,
          metrics.weight_lb ? `${metrics.weight_lb} lb` : null,
        ].filter(Boolean) as string[];
        displayValue = pieces.join(" · ") || "(details)";
      } else if (Array.isArray(value)) {
        displayValue = value.join(", ");
      } else {
        displayValue = String(value);
      }

      summary.push({
        key,
        label: labelMap[key],
        value: displayValue,
      });
    }

    return summary;
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) {
      return () => {
        pendingRef.current = false;
      };
    }

    bootstrappedRef.current = true;
    coachState.setPhase("intake");
    pendingRef.current = false;
    void fetchNext();

    return () => {
      pendingRef.current = false;
    };
  }, [fetchNext]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, typing]);

  const renderMessage = (message: Message, index: number) => {
    if (message.kind === "text") {
      return (
        <Bubble key={`text-${index}`} who={message.who}>
          {message.text}
        </Bubble>
      );
    }

    if (message.kind === "turn") {
      return (
        <Bubble key={`turn-${index}`} who="milo">
          {message.turn.question}
        </Bubble>
      );
    }

    if (message.kind === "negotiation") {
      return (
        <Bubble key={`neg-${index}`} who="milo">
          <div className="space-y-2">
            <p className="text-sm text-neutral-700">{message.negotiation.coach_take}</p>
            <p className="font-medium text-sm">{message.negotiation.question}</p>
          </div>
        </Bubble>
      );
    }

    const narrative = buildPlanNarrative(message.wrap, finalNote);

    return (
      <Bubble key={`wrap-${index}`} who="milo">
        <div className="space-y-4 rounded-2xl border border-white/12 bg-neutral-950/85 p-5 text-white shadow-[0_24px_48px_rgba(15,23,42,0.45)]">
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-white/85">{narrative.introLine}</p>
          </div>
          <div className="space-y-2">
            {narrative.chips.map((chip) => (
              <div
                key={chip.label}
                className="flex items-center justify-between rounded-xl border border-white/12 bg-white/10 px-3 py-2 text-xs"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60">{chip.label}</span>
                <span className="text-sm font-semibold text-white/85">{chip.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {narrative.blocks.slice(0, 3).map((block, idx) => (
              <div key={`${block.title}-${idx}`} className="rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-left text-white/85">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span>{block.icon}</span>
                  <span>{block.title}</span>
                </div>
                <p className="mt-1 text-xs text-white/70">{block.description}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-xs text-white/70">
            {narrative.phases.slice(0, 2).map((phase) => (
              <div key={phase.title} className="rounded-xl border border-white/10 bg-white/8 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/55">{phase.title} • {phase.focus}</div>
                <p className="mt-1 text-xs text-white/70">{phase.description}</p>
              </div>
            ))}
          </div>
          <button
            onClick={onComplete}
            className="w-full rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 py-3 text-sm font-semibold text-white transition hover:from-neutral-800 hover:to-neutral-700 active:scale-[0.98]"
          >
            {narrative.ctaLabel}
          </button>
          <button
            onClick={() => {
              setPlanRevealWrap(message.wrap);
              setShowPlanReveal(true);
              setPlanRevealed(true);
            }}
            className="w-full rounded-xl border border-white/20 bg-white/10 py-3 text-sm font-semibold text-white/80 transition hover:border-white/35 hover:text-white"
          >
            View immersive preview
          </button>
          <p className="text-center text-[11px] text-white/60">{narrative.ctaCaption}</p>
        </div>
      </Bubble>
    );
  };

  // Helper to get chip recommendations based on context
  const getChipMetadata = (chip: string, index: number) => {
    const metadata: {
      icon?: string;
      hint?: string;
      recommended?: boolean;
      shortcut?: string;
    } = {};

    // Add keyboard shortcuts for first 4 chips
    if (index < 4) {
      metadata.shortcut = String(index + 1);
    }

    // Context-aware recommendations and hints
    if (activeAsk?.kind === "turn") {
      const topic = activeAsk.topic;

      if (topic === "training_context" || topic === "experience_level") {
        if (chip.toLowerCase().includes("beginner") || chip.toLowerCase().includes("new")) {
          metadata.icon = "🌱";
          metadata.hint = "We'll build your foundation";
        } else if (chip.toLowerCase().includes("intermediate")) {
          metadata.icon = "💪";
          metadata.hint = "Time to refine and progress";
          metadata.recommended = true;
        } else if (chip.toLowerCase().includes("advanced")) {
          metadata.icon = "🏆";
          metadata.hint = "Maximum complexity and volume";
        }
      }

      if (topic === "primary_goal" || topic === "goal_intent") {
        if (chip.toLowerCase().includes("muscle")) {
          metadata.icon = "💪";
          metadata.hint = "Focus on hypertrophy and size";
        } else if (chip.toLowerCase().includes("strength")) {
          metadata.icon = "🏋️";
          metadata.hint = "Build max force output";
          metadata.recommended = true;
        } else if (chip.toLowerCase().includes("performance") || chip.toLowerCase().includes("sport")) {
          metadata.icon = "⚡";
          metadata.hint = "Sport-specific power";
        } else if (chip.toLowerCase().includes("rehab")) {
          metadata.icon = "🩹";
          metadata.hint = "We'll keep joints calm and supported";
        }
      }

      if (topic === "frequency_commitment" || topic === "frequency") {
        if (/3/.test(chip)) {
          metadata.recommended = true;
          metadata.hint = "Optimal for most goals";
        } else if (/4/.test(chip)) {
          metadata.hint = "Great for faster progress";
        }
      }

      if (topic === "equipment_session" || topic === "equipment") {
        if (chip.toLowerCase().includes("full") || chip.toLowerCase().includes("gym")) {
          metadata.icon = "🏋️";
          metadata.hint = "Access to all exercise variations";
        } else if (chip.toLowerCase().includes("bodyweight")) {
          metadata.icon = "🤸";
          metadata.hint = "Train anywhere, anytime";
        } else if (chip.toLowerCase().includes("minimal") || chip.toLowerCase().includes("home")) {
          metadata.icon = "🏠";
          metadata.hint = "We'll work with what you have";
        }
      }
    }

    return metadata;
  };

  const renderChips = () => {
    if (!activeAsk || typing || activeAsk.chips.length === 0) return null;
    return (
      <div className="mb-3 flex flex-wrap gap-2">
        {activeAsk.chips.map((chip, index: number) => {
          const metadata = getChipMetadata(chip, index);
          return (
            <div key={chip}>
              <EnhancedChip
                label={chip}
                value={chip}
                onClick={handleChip}
                icon={metadata.icon}
                hint={metadata.hint}
                recommended={metadata.recommended}
                shortcut={metadata.shortcut}
                disabled={showPlanLoading}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const answeredCount = Object.keys(answersRef.current).length;
  const totalQuestions = SCRIPTED_TOPIC_SEQUENCE.length;
  const answeredQuestions = getAnsweredQuestions();
  const isTypingLong = typingStartTime !== null && Date.now() - typingStartTime > 3000;

  return (
    <div className="flex h-full flex-col">
      {/* Progress indicator at top */}
      {answeredCount > 0 && !planRevealed && (
        <IntakeProgressIndicator
          current={answeredCount}
          total={totalQuestions}
          phase="Building your plan"
        />
      )}

      {/* Answer summary panel */}
      {answeredQuestions.length > 0 && !planRevealed && (
        <AnswerSummaryPanel
          answers={answeredQuestions}
          isOpen={showAnswerSummary}
          onToggle={() => setShowAnswerSummary(!showAnswerSummary)}
        />
      )}

      <div ref={scrollRef} className="flex max-h-[60vh] min-h-[60vh] flex-col gap-3 overflow-y-auto pb-4">
        {messages.map((message, index) => renderMessage(message, index))}
        {typing && (
          <Bubble who="milo">
            <EnhancedTypingIndicator
              takingLong={isTypingLong}
              onSkip={isTypingLong ? handleSkipAI : undefined}
            />
          </Bubble>
        )}
      </div>

      {renderChips()}

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                const text = composer.trim();
                if (text) {
                  void handleSend(text);
                  setComposer("");
                }
              }
            }}
            placeholder={activeAsk?.question ?? "Message Coach Milo…"}
            className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            disabled={planRevealed || showPlanLoading}
          />
          <button
            type="button"
            onClick={() => {
              const text = composer.trim();
              if (text) {
                void handleSend(text);
                setComposer("");
              }
            }}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
            disabled={planRevealed || showPlanLoading || !composer.trim()}
          >
            {pendingWrap && !planRevealed ? "Add note" : "Send"}
          </button>
        </div>
        {pendingWrap && !planRevealed ? (
          <button
            type="button"
            onClick={handleRevealPlan}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-neutral-900 py-3 text-sm font-semibold text-white shadow-md shadow-neutral-900/10 transition hover:from-indigo-500 hover:via-purple-500 hover:to-neutral-800 active:scale-[0.98]"
            disabled={showPlanLoading}
          >
            {showPlanLoading ? "Crafting your plan…" : "Generate my plan"}
          </button>
        ) : null}
      </div>
      {showPlanLoading ? <PlanLoadingOverlay onCancel={handleCancelLoading} /> : null}
      {showPlanReveal && planRevealWrap ? (
        <PlanRevealOverlay
          wrap={planRevealWrap}
          finalNote={finalNote}
          onStart={() => {
            setShowPlanReveal(false);
            onComplete();
          }}
          onClose={() => setShowPlanReveal(false)}
        />
      ) : null}
    </div>
  );
}
