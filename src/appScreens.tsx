import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BackIcon, HistoryIcon, RepeatIcon, SitUprightIcon, SqueezeIcon, introSlides, onboardingTutorialSteps, InfoIcon } from './constants';
import {
  HomeHero,
  ReadinessArc,
  ReadinessBar,
  SensorCard,
  SideCard,
  TutorialPopUp,
  RepBarsChart,
  RecoveryChecklist,
  StrengthAchievementPopup,
  TimerBlock,
  JudgmentChip,
  CoachMessageCard,
  TypewriterText,
  DecisionHero as RecoveryDecisionHero,
} from './components';
import DropStack from './components/notify/DropStack';
import RestCoach, { type RestCoachAction } from './components/coach/RestCoach';
import { GeminiLiveCoach } from './components/coach/GeminiLiveCoach';
import { CoachContextBus } from './coach/CoachContextBus';
import { SlideUpLogPanel } from './components/SlideUpLogPanel';
import type { ReadinessPrediction, RawPeakHistoryEntry, SensorStatus, SessionHistoryEntry, TrendPoint, CompletedSet, RecoveryTask, ChatMessage, CoachHomeFeedback, CoachIntent, StopSuggestion, CoachPrefs, CoachOutput, CoachCta, Rep, PlannedWorkoutSet } from './types';
import type { FatigueState } from './lib/fatigue/FatigueDetector';
import type { CoachFinalMessage } from './lib/coach/CoachMessageComposer';
import type { CoachInsightStatus } from './hooks/useCoachInsightPipeline';
import { toDate } from './services';
import { makeRmsSetV2, DEFAULTS as EMG_SIM_DEFAULTS, type RepFeature, type Scenario, type SetSimOptions } from './lib/sim/emgSimulator';
import { useCoachDrop } from './hooks/useCoachDrop';
import { determineZone } from './lib/fatigue/engine';
import { TARGET_RANGE } from './lib/fatigue/thresholds';
import type { Zone } from './lib/fatigue/types';
import { primaryLine, secondaryLine, whyLine } from './lib/coach/tone';
import {
  computeSetSummary,
  buildGeminiSetRequest,
  type CoachRestAdvice,
  type GeminiSetRequest,
  type CoachSetSummaryRecord,
  type SetSummaryMetrics,
} from './lib/coach/setSummary';
import PremiumPlanView from './components/plan/PremiumPlanView';
import { PlanInlineSkeleton } from './components/plan/PlanInlineSkeleton';
import type { PlanProps } from './types/plan';
import { useRecovery } from './hooks/useRecovery';
import type { Profile as RecoveryProfile, SessionFeatures as RecoverySession, EMG as RecoveryEMG } from './lib/recovery';
import { z } from 'zod';

const QUICK_PROMPT_INTENTS: Record<string, CoachIntent> = {
  'Recover faster?': 'recovery_action',
  'Ready for heavy when?': 'when_to_train',
  'Was fatigue timed right?': 'post_session_analysis',
  'How long to 100%?': 'when_to_train',
  'Light work okay now?': 'session_focus',
  'Next heavy window?': 'plan_next',
  'Today’s focus?': 'session_focus',
  'Rest interval?': 'rest_interval',
  'Warm-up ideas?': 'recovery_action',
  'When is my next session?': 'when_to_train',
  'How’s my trend?': 'trend_explanation',
  'Plan the week?': 'plan_next',
  'Plan the week': 'plan_next',
  'Plan next session': 'plan_next',
};

const LEG_EXERCISES = [
  'Heel-Elevated Front Squat',
  'High-Bar Back Squat',
  'Goblet Box Squat',
  'Smith Machine Front Squat',
  'Rear-Foot Split Squat',
  'Bulgarian Split Squat',
  'Split Squat Iso Hold',
  'Reverse Lunge',
  'Forward Lunge',
  'Walking Lunge',
  'Leg Press',
  'Single-Leg Press',
  'Leg Extension',
  'Leg Curl',
  'Sled Push',
  'Step-Up',
  'Trap Bar Deadlift (Quad Bias)',
  'Hack Squat',
  'Copenhagen Plank',
  'Cyclist Squat',
];

const QUICK_WEIGHT_OPTIONS = [65, 85, 95, 115, 135, 155, 185, 205, 225, 245];

const RMS_MIN = 0.7;
const RMS_MAX = 1.65;
const clampValue = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const formatLoadAdjustmentLabel = (
  value: PlannedWorkoutSet['loadAdjustment'] | undefined | null,
): string => {
  if (!value || value === 'n/a') return 'Plan';
  const friendly = String(value).replace(/_/g, ' ');
  return friendly.charAt(0).toUpperCase() + friendly.slice(1);
};

const normalizePeakToRms = (peak: number): number => {
  const bounded = Math.max(0, Math.min(peak, 110));
  const fraction = bounded / 100;
  return clampValue(RMS_MIN + fraction * (RMS_MAX - RMS_MIN), RMS_MIN, RMS_MAX);
};

const deriveRepVelocity = (duration: number | undefined): number | null => {
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  const normalized = clampValue(1 - Math.min(duration / 4.5, 0.9), 0.1, 0.95);
  return Number(normalized.toFixed(3));
};

const convertSessionRepToFeature = (rep: Rep, idx: number): RepFeature => ({
  idx,
  rmsNorm: normalizePeakToRms(rep.peak),
  signalConfidence: clampValue((rep.avgIntensity ?? rep.peak) / 100, 0.35, 0.95),
  repVelocity: deriveRepVelocity(rep.duration),
});

const buildRepFeaturesFromSession = (reps: Rep[] | null | undefined): RepFeature[] => {
  if (!reps?.length) return [];
  return reps.map((rep, index) => convertSessionRepToFeature(rep, index + 1));
};

const GEMINI_SYSTEM_PROMPT = `You are "Symmetric Coach," a smart, supportive strength coach.
Output concise, friendly 2-line guidance tied to outcomes.
Do not be jargony. No physiology lectures.
Prioritize strength (3–5 rep "goldilocks").
Rules:
• If zone_at_end = "in_zone" → reinforce, default rest ~120s, suggest +1 rep only if reps felt crisp.
• If "too_heavy_early" → lower effort by one notch, rest 120–180s, remind target fatigue 3–5.
• If "too_light" → add +1 rep or +1 effort next set, rest ~90–120s.
• If "low_signal" → ask to reseat electrode/dry sweat; keep effort same.
• Use data in set_summary (e.g., total_rise_pct, fatigue_rep) to justify advice in plain language.
• Two short lines, max 140 chars each.
• Return only JSON that matches the schema.`;

const GEMINI_FEW_SHOT_RESPONSES = [
  {
    primary_text: 'Perfect strength set — you nailed the window.',
    secondary_text: 'Rest 120s, same effort next set. Felt crisp? Add +1 rep.',
    rest_seconds: 120,
    effort_delta: 0 as -1 | 0 | 1,
    show_why: true,
    why_text: 'RMS up ~45% with steady rise.',
  },
  {
    primary_text: 'Came in hot — fatigue hit too early.',
    secondary_text: 'Back off one notch; rest 120–180s. Aim to hit reps 3–5.',
    rest_seconds: 150,
    effort_delta: -1 as -1 | 0 | 1,
    show_why: true,
    why_text: 'Big early jump; better to land 3–5.',
  },
  {
    primary_text: 'Too comfy — didn’t reach the strength zone.',
    secondary_text: 'Add +1 rep or +1 effort next set. Rest ~90–120s.',
    rest_seconds: 90,
    effort_delta: 1 as -1 | 0 | 1,
    show_why: true,
    why_text: 'Total rise <5% by rep 5.',
  },
] as const;

const GeminiCoachResponseSchema = z.object({
  primary_text: z.string(),
  secondary_text: z.string(),
  rest_seconds: z.number().int().min(60).max(240),
  effort_delta: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  show_why: z.boolean().optional(),
  why_text: z.string().optional(),
});

type GeminiCoachResponse = z.infer<typeof GeminiCoachResponseSchema>;

const GEMINI_TARGET_WINDOW = { min: 3, max: 5 } as const;
const GEMINI_ENV = (typeof import.meta !== 'undefined' ? (import.meta.env as Record<string, string | undefined>) : {}) ?? {};
const GEMINI_ENDPOINT = GEMINI_ENV.VITE_GEMINI_REST_ENDPOINT ?? null;
const GEMINI_IS_MOCK =
  typeof import.meta !== 'undefined' &&
  (GEMINI_ENV.VITE_MOCK_COACH === '1' || !GEMINI_ENDPOINT);
const ANIMATION_DEBUG =
  typeof window !== 'undefined' && Boolean((window as any).__ANIMATION_DEBUG__);

const fallbackEffortDeltaForZone = (zone: Zone): -1 | 0 | 1 => {
  switch (zone) {
    case 'too_heavy_early':
      return -1;
    case 'too_light':
      return 1;
    default:
      return 0;
  }
};

type RecapTone = 'success' | 'info' | 'warn';

type SetRecapState = {
  headline: string;
  detail: string;
  tone: RecapTone;
  scientificTip: string | null;
};

const TIPS_IN_ZONE = [
  'Landing between 3–6 reps keeps high-threshold fibers firing without over-fatiguing.',
  'Productive fatigue stacks best when quality reps stop once speed drops after 6.',
] as const;

const TIPS_OVERSHOOT = [
  'Shutting it down before rep 7–8 preserves neural drive for the next heavy effort.',
  'Past 8 reps you shift toward endurance—rack earlier to keep the strength signal high.',
] as const;

const TIPS_EARLY_HEAVY = [
  'Spreading fatigue across 3–6 reps lets the nervous system stay responsive between sets.',
  'Backing off slightly helps the next set hit the money reps without grinding early.',
] as const;

const TIPS_UNDER_RANGE = [
  'You need at least 3 crisp reps to recruit the largest motor units for strength gains.',
  'Building tension across 3–6 reps drives the neural adaptation you’re chasing.',
] as const;

const TIPS_GENERAL = [
  'Quality reps in the 3–6 window drive strength without excessive fatigue.',
  'Capping sets when speed drops keeps power output high across the session.',
] as const;

const SET_RECAP_TONE_CLASSES: Record<RecapTone, string> = {
  success: 'border-emerald-400/35 bg-emerald-900/35',
  info: 'border-sky-400/30 bg-sky-900/30',
  warn: 'border-amber-400/35 bg-amber-900/30',
};

const pickRandom = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

// Gemini-powered set recap summary
const GeminiSetRecapSchema = z.object({
  headline: z.string(),
  detail: z.string(),
});

const fetchGeminiSetRecap = async (metrics: SetSummaryMetrics): Promise<{ headline: string; detail: string } | null> => {
  const { reps, fatigueRep, zone, totalRisePct, slopePctPerRep, signalConfidenceAvg } = metrics;

  if (!GEMINI_ENDPOINT) {
    return null;
  }
  const inProductiveWindow = reps >= 3 && reps <= 6 && zone !== 'too_light';
  const overshoot = reps > 8;
  const nearUpper = reps === 7 || reps === 8;
  const underTarget = reps < 3;
  const heavyEarly = zone === 'too_heavy_early';
  const lowSignal = zone === 'low_signal';
  const tooLight = zone === 'too_light';
  const totalRisePercent = Math.round(Math.abs(totalRisePct) * 100);

  const systemPrompt = `You are "Symmetric Coach," giving quick set recap feedback.
Generate a concise 2-part summary in JSON: { "headline": string, "detail": string }

TONE: Encouraging, direct, coaching voice. Use em-dashes (—) for emphasis. Keep it tight.

headline: Short punchy summary (max 50 chars). Examples:
- "Great set—right in the strength pocket."
- "Strength sweet spot nailed."
- "Goldilocks zone secured."
- "Fatigue spiked early."
- "Signal dipped mid-set."
- "Almost too deep into the set."

detail: One sentence with specific feedback (max 140 chars). Reference rep count and fatigue rep if provided.

CONTEXT:
- Total reps: ${reps}
- Fatigue detected at rep: ${fatigueRep ?? 'none'}
- Zone: ${zone}
- Signal rise: ${totalRisePercent}%
- Signal confidence: ${Math.round(signalConfidenceAvg * 100)}%

RULES:
- If lowSignal (zone=low_signal): headline about signal quality, detail suggests reseating electrode
- If heavyEarly (zone=too_heavy_early): headline about early fatigue, detail suggests easing load or cutting at 3-4 reps
- If overshoot (reps > 8): headline about unproductive reps, detail suggests stopping at rep 6
- If nearUpper (reps 7-8): headline about "almost too deep", detail suggests racking earlier
- If inProductiveWindow (3-6 reps, not too_light): headline celebrates strength zone, detail reinforces the quality
- If underTarget or tooLight: headline about pushing into strength range, detail suggests adding reps or load

Use similar language to these examples but vary phrasing slightly.`;

  const userPrompt = `Set just finished:
- Reps: ${reps}
- Fatigue rep: ${fatigueRep ?? 'not detected'}
- Zone classification: ${zone}
- Total signal rise: ${totalRisePercent}%

Generate headline and detail.`;

  try {
    const response = await fetch(GEMINI_ENDPOINT!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        userMessage: userPrompt,
        responseSchema: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            detail: { type: 'string' },
          },
          required: ['headline', 'detail'],
        },
      }),
    });

    if (!response.ok) {
      console.warn('[Gemini] Set recap request failed:', response.status);
      return null;
    }

    const data = await response.json();
    const parsed = GeminiSetRecapSchema.safeParse(data);
    if (!parsed.success) {
      console.warn('[Gemini] Set recap schema mismatch:', parsed.error.flatten());
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.warn('[Gemini] Set recap fetch failed:', error);
    return null;
  }
};

const buildSetRecapSummary = (metrics: SetSummaryMetrics): SetRecapState => {
  const { reps, fatigueRep, zone, totalRisePct } = metrics;
  const inProductiveWindow = reps >= 3 && reps <= 6 && zone !== 'too_light';
  const overshoot = reps > 8;
  const nearUpper = reps === 7 || reps === 8;
  const underTarget = reps < 3;
  const heavyEarly = zone === 'too_heavy_early';
  const lowSignal = zone === 'low_signal';
  const tooLight = zone === 'too_light';
  const totalRisePercent = Math.round(Math.abs(totalRisePct) * 100);

  if (lowSignal) {
    return {
      tone: 'warn',
      headline: 'Signal dipped mid-set.',
      detail: 'Reseat the electrode or dry sweat, then target 3–6 smooth reps once the trace steadies.',
      scientificTip: null,
    };
  }

  if (heavyEarly) {
    return {
      tone: 'warn',
      headline: 'Fatigue spiked early.',
      detail:
        fatigueRep != null
          ? `You hit fatigue around rep ${fatigueRep}. Ease the load or cut the next set at 3–4 crisp reps.`
          : 'Tension ramped too fast. Drop effort a notch so fatigue lands between reps 3–6.',
      scientificTip: pickRandom(TIPS_EARLY_HEAVY),
    };
  }

  if (overshoot) {
    return {
      tone: 'warn',
      headline: 'You drifted into unproductive reps.',
      detail:
        fatigueRep != null
          ? `You carried the set to ${reps} reps while fatigue peaked near rep ${fatigueRep}. Rack it closer to 6.`
          : `You carried the set to ${reps} reps. Shut it down once quality fades past rep 6.`,
      scientificTip: pickRandom(TIPS_OVERSHOOT),
    };
  }

  if (inProductiveWindow) {
    const headlines = [
      'Great set—right in the strength pocket.',
      'Strength sweet spot nailed.',
      'Goldilocks zone secured.',
    ] as const;
    const headline = pickRandom(headlines);
      const detail =
      fatigueRep != null
        ? `You logged ${reps} reps with fatigue showing up around rep ${fatigueRep}. That’s textbook strength work.`
        : `Those ${reps} reps stayed tight and inside the productive window. Keep that feel.`;
    const includeTip = Math.random() < 0.5;
    return {
      tone: 'success',
      headline,
      detail,
      scientificTip: includeTip ? pickRandom(TIPS_IN_ZONE) : null,
    };
  }

  if (nearUpper) {
    return {
      tone: 'info',
      headline: 'Almost too deep into the set.',
      detail:
        fatigueRep != null
          ? `You hit ${reps} reps and fatigue around rep ${fatigueRep}. Rack one sooner to stay sharp.`
          : `You hit ${reps} reps. Stop a rep earlier to stay locked in on strength.`,
      scientificTip: pickRandom(TIPS_OVERSHOOT),
    };
  }

  if (underTarget || tooLight) {
    return {
      tone: 'info',
      headline: 'Let’s push into the strength range.',
      detail: tooLight
        ? 'Fatigue never arrived. Add a rep or bump the load so you land between 3–6 quality reps.'
        : `Only ${reps} reps logged. Aim for at least 3 crisp reps to get useful fatigue.`,
      scientificTip: pickRandom(TIPS_UNDER_RANGE),
    };
  }

  return {
    tone: 'info',
    headline: 'Solid work—dial it toward 3–6 reps.',
    detail:
      totalRisePercent > 0
        ? `You built about a ${totalRisePercent}% rise in signal. Keep the next set between 3–6 reps to lock strength gains.`
        : 'Keep steering toward 3–6 focused reps so the fatigue signal lines up cleanly.',
    scientificTip: pickRandom(TIPS_GENERAL),
  };
};

const requestGeminiSetSummary = async (payload: GeminiSetRequest): Promise<GeminiCoachResponse | null> => {
  if (GEMINI_IS_MOCK) {
    return GEMINI_FEW_SHOT_RESPONSES[0];
  }

  if (!GEMINI_ENDPOINT) {
    return null;
  }

  try {
    const response = await fetch(GEMINI_ENDPOINT!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: GEMINI_SYSTEM_PROMPT,
        examples: GEMINI_FEW_SHOT_RESPONSES,
        payload,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const parsed = GeminiCoachResponseSchema.safeParse(data);
    if (!parsed.success) {
      console.warn('[Gemini] response schema mismatch', parsed.error.flatten());
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.warn('[Gemini] rest coach request failed', error);
    return null;
  }
};

const formatSuggestionReason = (reason: StopSuggestion['reasons'][number]): string => {
  switch (reason.code) {
    case 'fatigue_high': {
      const threshold = reason.threshold ?? 85;
      const value = reason.value != null ? Math.round(reason.value) : null;
      return value != null
        ? `Fatigue signal high (${value} vs ${threshold})`
        : `Fatigue signal high (over ${threshold})`;
    }
    case 'rep_speed_drop': {
      const value = reason.value != null ? Math.round(reason.value) : null;
      const drop = value != null ? `-${value}%` : `-${reason.threshold ?? 25}%`;
      return `Rep speed declining (${drop} vs set start)`;
    }
    case 'readiness_low': {
      const value = reason.value != null ? Math.round(reason.value) : null;
      return value != null
        ? `Readiness low (today ${value})`
        : `Readiness low (today ${reason.threshold ?? 50})`;
    }
    case 'asymmetry_rising': {
      const value = reason.value != null ? Math.round(reason.value) : null;
      const threshold = reason.threshold != null ? Math.round(reason.threshold) : 10;
      return value != null
        ? `Asymmetry rising (${value}% last 3 reps)`
        : `Asymmetry rising (> ${threshold}% last 3 reps)`;
    }
    case 'signal_unstable':
    default:
      return 'Signal unstable - suggestion may be inaccurate.';
  }
};


interface SplashScreenProps {
  onAnimationComplete: () => void;
}
export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onAnimationComplete, 4000);
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <div className="h-full w-full bg-transparent flex flex-col items-center justify-center splash-screen">
      <h1 className="splash-title-new text-4xl font-bold tracking-widest text-white/90">
        {'SYMMETRIC'.split('').map((char, index) => (
          <span key={index} style={{ animationDelay: `${0.5 + index * 0.1}s` }}>{char}</span>
        ))}
      </h1>
    </div>
  );
};


interface IntroScreenProps {
  onComplete: () => void;
}
export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const currentSlide = introSlides[slideIndex];
  const handleNext = () => { slideIndex < introSlides.length - 1 ? setSlideIndex(slideIndex + 1) : onComplete(); };

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-950 animate-screen-in">
      <img key={slideIndex} src={currentSlide.imageUrl} alt={currentSlide.headline} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="relative h-full flex flex-col p-6 pt-12 text-center text-white">
        <div className="flex-1 flex flex-col items-center justify-end space-y-4 pb-16">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-shadow-lg">{currentSlide.headline}</h1>
            <p className="text-base text-gray-200 max-w-md mx-auto text-shadow-lg leading-relaxed">{currentSlide.subtext}</p>
          </div>
        </div>
        <div className="pb-4 space-y-4">
          <div className="flex justify-center space-x-2">
            {introSlides.map((_, index) => (
              <div key={index} className={`w-2 h-2 rounded-full transition-all ${index === slideIndex ? 'bg-blue-500 scale-125' : 'bg-gray-400'}`} />
            ))}
          </div>
          <button onClick={handleNext} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">
            {slideIndex === introSlides.length - 1 ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface OnboardingConversationScreenProps {
  onSubmit: (profile: { name: string; age: number; weight: number; height: number }) => void;
  onSkip: () => void;
}

export const OnboardingConversationScreen: React.FC<OnboardingConversationScreenProps> = ({ onSubmit, onSkip }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [step, setStep] = useState(0);
  const steps = [
    {
      label: "Awesome to meet you—what should I call you?",
      placeholder: "Name",
      value: name,
      onChange: (value: string) => setName(value),
      inputMode: 'text' as const,
    },
    {
      label: "Great, and how old are you?",
      placeholder: "Age",
      value: age,
      onChange: (value: string) => setAge(value.replace(/\D/g, '')),
      inputMode: 'numeric' as const,
    },
    {
      label: "Got it. What's your weight right now (in lbs)?",
      placeholder: "Weight",
      value: weight,
      onChange: (value: string) => setWeight(value.replace(/[^0-9.]/g, '')),
      inputMode: 'decimal' as const,
    },
    {
      label: "And your height? (feet and inches)",
      placeholder: "e.g., 5'10\"",
      value: height,
      onChange: (value: string) =>
        setHeight(
          value
            .replace(/[^0-9'\"ftin\s]/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trimStart(),
        ),
      inputMode: 'decimal' as const,
    },
  ];

  const currentStep = steps[step];

  const parseHeightInput = useCallback((input: string): number | null => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return null;

    const numberParts = trimmed.match(/\d+/g);
    if (!numberParts) return null;

    const containsFeetKeyword = /ft|feet|'/i.test(trimmed);
    const containsInchKeyword = /in|inch|\"/i.test(trimmed);

    if (numberParts.length === 1) {
      const value = Number.parseInt(numberParts[0], 10);
      if (!Number.isFinite(value)) return null;
      return containsFeetKeyword ? value * 12 : value;
    }

    const feet = Number.parseInt(numberParts[0], 10);
    const inches = Number.parseInt(numberParts[1], 10);
    if (!Number.isFinite(feet)) return null;

    const normalizedInches = Number.isFinite(inches) ? inches : 0;
    return feet * 12 + normalizedInches;
  }, []);

  const handleNext = () => {
    const trimmed = currentStep.value.trim();
    if (!trimmed) return;
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      const parsedAge = Number.parseInt(age, 10);
      const parsedWeight = Number.parseFloat(weight);
      const parsedHeight = parseHeightInput(height);
      if (parsedHeight == null) return;
      onSubmit({ name: name.trim(), age: Number.isFinite(parsedAge) ? parsedAge : 0, weight: Number.isFinite(parsedWeight) ? parsedWeight : 0, height: Number.isFinite(parsedHeight) ? parsedHeight : 0 });
    }
  };

  const handleBack = () => {
    if (step === 0) {
      onSkip();
    } else {
      setStep(step - 1);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white animate-screen-in">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15)_0%,rgba(15,23,42,0.85)_65%)]" />
      <div className="relative flex h-full flex-col px-6 py-10 gap-8">
        <header className="flex items-center justify-between text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          <button onClick={handleBack} className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/70 hover:border-white/40">
            {step === 0 ? 'Skip' : 'Back'}
          </button>
          <span>{step + 1} / {steps.length}</span>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-10">
          <div className="max-w-md text-center space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-blue-200/70">Coach AI</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white drop-shadow-md">
              {currentStep.label}
            </h2>
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl shadow-[0_28px_60px_rgba(15,23,42,0.4)]">
            <input
              className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-4 text-lg font-semibold text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              placeholder={currentStep.placeholder}
              value={currentStep.value}
              inputMode={currentStep.inputMode}
              onChange={(event) => currentStep.onChange(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleNext()}
              autoFocus
            />
            <p className="mt-4 text-xs text-white/60">This helps me personalize readiness targets and session pacing.</p>
          </div>
        </main>

        <footer className="flex w-full justify-center">
          <button
            onClick={handleNext}
            className="w-full max-w-sm rounded-full bg-blue-500 px-5 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_18px_40px_rgba(59,130,246,0.35)] transition hover:bg-blue-400"
          >
            {step === steps.length - 1 ? "I'm ready" : 'Next'}
          </button>
        </footer>
      </div>
    </div>
  );
};


interface ConnectScreenProps {
  onConnect: (side: 'left' | 'right') => void;
  sensorStatus: SensorStatus;
  onComplete: () => void;
  onBack: () => void;
  sensorError: string | null;
}
export const ConnectScreen: React.FC<ConnectScreenProps> = ({ onConnect, sensorStatus, onComplete, onBack, sensorError }) => {
    const isAnyConnected = sensorStatus.left.status === 'connected' || sensorStatus.right.status === 'connected';

    return (
        <div className="h-full flex flex-col p-6 pt-12 animate-screen-in text-center bg-transparent">
            <div className="flex justify-start">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-300 button-press"><BackIcon/></button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                <h1 className="text-2xl font-bold tracking-tight">Let's pair your sensors</h1>
                <p className="text-gray-400 max-w-sm">Press the button on your sensor, then tap its icon to connect.</p>
                <div className="grid grid-cols-2 gap-4 w-full">
                    <SensorCard side="Left" status={sensorStatus.left.status} onConnect={() => onConnect('left')} />
                    <SensorCard side="Right" status={sensorStatus.right.status} onConnect={() => onConnect('right')} />
                </div>
                <div className="text-center text-gray-400 h-10">
                    {sensorError && <p className="text-red-400 text-sm mt-1">{sensorError}</p>}
                </div>
            </div>
            <div className="pb-4">
                <button onClick={onComplete} disabled={!isAnyConnected} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none hover:bg-blue-700 transition-all shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">
                    Next: Strap Sensors
                </button>
            </div>
        </div>
    );
};

interface PlacementGuideScreenProps {
  onComplete: () => void;
  onBack: () => void;
}
export const PlacementGuideScreen: React.FC<PlacementGuideScreenProps> = ({ onComplete, onBack }) => {
    return (
        <div className="h-full relative flex flex-col animate-screen-in bg-black text-white overflow-hidden">
             <img 
                src="https://i.postimg.cc/90tbv23q/20250603-1448-Sleek-EMG-Sensor-simple-compose-01jwvhx5rfe25arnkmphjynbxh.png" 
                alt="Sensor placement on quadriceps" 
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent z-10"></div>
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-gray-950/60 to-transparent z-10"></div>
            
            <div className="relative z-20 h-full flex flex-col p-6">
                <div className="pt-6 flex items-center flex-shrink-0">
                    <button onClick={onBack} className="p-2 -ml-2 text-white button-press z-10"><BackIcon /></button>
                    <h1 className="text-2xl font-bold tracking-tight text-center w-full -ml-8 text-shadow-lg">Sensor Placement</h1>
                </div>

                <div className="flex-1"></div>

                <div className="flex-shrink-0 space-y-4 pb-4">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-white text-shadow-lg">Center of the Quadriceps</h2>
                        <p className="text-base text-gray-200 mt-1 leading-relaxed text-shadow-lg">Place the sensor halfway between your hip and knee for the most accurate reading.</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 border border-white/20 backdrop-blur-sm text-left space-y-2 w-full">
                        <h3 className="text-sm font-semibold text-white">Key Points</h3>
                        <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
                            <li>Make direct contact with the skin.</li>
                            <li>Secure firmly with the strap.</li>
                            <li>Align vertically with the muscle fibers.</li>
                        </ul>
                    </div>
                    <button onClick={onComplete} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">
                        Next: Peak Strength Test
                    </button>
                </div>
            </div>
        </div>
    );
};


interface MVCScreenProps {
    onBegin: () => void;
    onBack: () => void;
}
export const MVCScreen: React.FC<MVCScreenProps> = ({ onBegin, onBack }) => {
    return (
        <div className="h-full relative flex flex-col animate-screen-in bg-black text-white overflow-hidden">
            <video 
                src="https://ia801002.us.archive.org/18/items/untitled_20250912_2248/Untitled.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
            ></video>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent z-10"></div>
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-gray-950/60 to-transparent z-10"></div>
            <div className="relative z-20 h-full flex flex-col p-6">
                <div className="pt-6 flex items-center flex-shrink-0">
                    <button onClick={onBack} className="p-2 -ml-2 text-white button-press z-10"><BackIcon /></button>
                    <h1 className="text-2xl font-bold tracking-tight text-center w-full -ml-8 text-shadow-lg">Peak Strength Test</h1>
                </div>
                <div className="w-full grid grid-cols-3 gap-3 text-center py-6 flex-shrink-0">
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center aspect-square">
                        <SitUprightIcon className="w-8 h-8 text-white/90 mb-1"/>
                        <p className="text-xs font-semibold leading-tight text-shadow-lg">Sit Upright</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center aspect-square">
                        <SqueezeIcon className="w-8 h-8 text-white/90 mb-1"/>
                        <p className="text-xs font-semibold leading-tight text-shadow-lg">Max Squeeze</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center aspect-square">
                        <RepeatIcon className="w-8 h-8 text-white/90 mb-1"/>
                        <p className="text-xs font-semibold leading-tight text-shadow-lg">3x Per Leg</p>
                    </div>
                </div>
                <div className="flex-1"></div>
                <div className="flex-shrink-0 space-y-4 pb-4">
                    <div className="w-full bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-center backdrop-blur-sm">
                        <p className="text-sm text-amber-300 font-medium">For best results, test only when you feel fresh.</p>
                    </div>
                    <button onClick={onBegin} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">
                        Begin Test
                    </button>
                </div>
            </div>
        </div>
    );
};

interface SetupScreenProps {
    onBack: () => void;
    repsPerSide: number;
    onBegin: () => void;
    onStartWorkoutDirectly: () => void;
}
export const SetupScreen: React.FC<SetupScreenProps> = ({ onBack, repsPerSide, onBegin, onStartWorkoutDirectly }) => {
  return (
    <div className="h-full flex flex-col animate-screen-in p-6">
      <div className="pt-6"><button onClick={onBack} className="text-gray-400 hover:text-white transition-colors p-2 -ml-2 button-press"><BackIcon /></button></div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center space-y-8 w-full">
          <div className="space-y-2"> <h2 className="text-3xl font-bold">Readiness Check</h2> <p className="text-base text-gray-300">Perform {repsPerSide} max squeezes per leg.</p> </div>
          <div className="text-5xl">💪</div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-left space-y-2 backdrop-blur-sm">
            <h3 className="text-sm font-medium text-white">Instructions</h3>
            <ol className="list-decimal list-inside text-sm text-gray-300 space-y-1">
              <li>Sit comfortably, sensor on your thigh.</li> <li>Extend one leg and squeeze as hard as you can.</li> <li>Relax, then repeat for the other leg.</li>
            </ol>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={onBegin} className="w-full bg-blue-600 text-white py-4 text-lg font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">Begin Check</button>
            <button onClick={onStartWorkoutDirectly} className="w-full bg-white/10 text-white py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-colors button-press">
              Start Workout Directly
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TestingScreenProps {
    onCancel: () => void;
    leftDone: number;
    rightDone: number;
    repsPerSide: number;
    isComplete: boolean;
    isAnalyzing: boolean;
    onSimulateSqueeze: (side: 'left' | 'right') => void;
    sensorStatus: SensorStatus;
}
export const TestingScreen: React.FC<TestingScreenProps> = ({ onCancel, leftDone, rightDone, repsPerSide, isComplete, isAnalyzing, onSimulateSqueeze, sensorStatus }) => {
    const isLeftActive = sensorStatus.left.status === 'connected';
    const isRightActive = sensorStatus.right.status === 'connected';
    const showAnalyzing = isComplete || isAnalyzing;

    let promptText = "Squeeze as hard as you can!";
    if (isLeftActive && leftDone < repsPerSide) { promptText = "Squeeze Left Leg"; }
    else if (isRightActive && rightDone < repsPerSide) { promptText = "Squeeze Right Leg"; }
    else if (isLeftActive || isRightActive) { promptText = "All reps recorded!"; }

    return (
        <div className="h-full flex flex-col animate-screen-in p-4">
            <div className="pt-8">
                <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">Cancel</button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {showAnalyzing ? (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 mx-auto bg-emerald-900/40 rounded-full flex items-center justify-center border-2 border-emerald-500/50">
                            <span className="text-3xl">{isComplete ? '✓' : '⏳'}</span>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-light">{isComplete ? 'Check Complete!' : 'Analyzing Readiness…'}</h3>
                            <p className="text-gray-400 text-sm">Hang tight, crunching the numbers.</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
                        <div className="text-center space-y-2"> <h3 className="text-xl font-semibold">{promptText}</h3> <p className="text-sm text-gray-400">Give it your maximum effort!</p> </div>
                        <div className="w-full flex-1 flex items-center justify-center gap-4">
                            {isLeftActive && <SideCard label="Left" color="blue" done={leftDone} total={repsPerSide} onSimulateSqueeze={() => onSimulateSqueeze('left')} />}
                            {isRightActive && <SideCard label="Right" color="emerald" done={rightDone} total={repsPerSide} onSimulateSqueeze={() => onSimulateSqueeze('right')} />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface PreTrainingScreenProps {
    score: number | null;
    rec: { message: string } | null;
    onStart: () => void;
    onEndSession: () => void;
    getReadinessData: (score: number | null) => { color: string; word: string };
    planView?: PlanProps | null;
    onGeneratePlan?: () => void;
    onAcceptPlan?: () => void;
    isGeneratingPlan?: boolean;
    planError?: string | null;
    planAccepted?: boolean;
}
export const PreTrainingScreen: React.FC<PreTrainingScreenProps> = ({
    score,
    rec,
    onStart,
    onEndSession,
    getReadinessData,
    planView,
    onGeneratePlan,
    onAcceptPlan,
    isGeneratingPlan = false,
    planError,
    planAccepted = false,
}) => {
    const data = getReadinessData(score);
    const hasPlan = Boolean(planView) && !isGeneratingPlan;
    const [showCoach, setShowCoach] = React.useState(false);

    // Set app surface for state-aware coaching
    React.useEffect(() => {
        CoachContextBus.publishContext({
            appSurface: 'pre_session',
            readiness: score ?? 75,
            readinessTarget: 50,
        });
    }, [score]);

    return (
        <div className="flex h-full flex-col p-4 animate-screen-in">
            <div className="px-2 pt-8">
                <button onClick={onEndSession} className="button-press -ml-2 rounded-full p-2 text-gray-400 transition-colors hover:text-white">
                    <BackIcon />
                </button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center space-y-5 text-center">
                <ReadinessArc score={score || 0} color={data.color} />
                <div className="space-y-1">
                    <h2 className="text-xl font-medium" style={{ color: data.color }}>
                        Ready to Train
                    </h2>
                    <p className="text-sm text-amber-300/90">{rec?.message}</p>
                </div>
                <div className="w-full max-w-md space-y-3 text-left">
                    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-lg backdrop-blur-md">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">
                                    Today’s Plan
                                </p>
                                <p className="mt-1 text-sm text-white/80">
                                    Build an AI-guided session from this readiness check.
                                </p>
                            </div>
                            {planAccepted && (
                                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                                    Added
                                </span>
                            )}
                        </div>
                        <div className="mt-4 overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60">
                            {isGeneratingPlan ? (
                                <PlanInlineSkeleton />
                            ) : hasPlan && planView ? (
                                <PremiumPlanView {...planView} />
                            ) : (
                                <div className="p-5 text-sm text-white/65">
                                    Tap “Generate today’s workout” to get blocks, reps, and rest tailored to
                                    this readiness score. Accept it to auto-load sets into your session.
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={onGeneratePlan}
                                disabled={isGeneratingPlan || !onGeneratePlan}
                                className="button-press rounded-2xl border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/50 hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {hasPlan ? 'Regenerate plan' : "Generate today's workout"}
                            </button>
                            {hasPlan && !planAccepted && (
                                <button
                                    type="button"
                                    onClick={onAcceptPlan}
                                    disabled={!onAcceptPlan}
                                    className="button-press rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
                                >
                                    Use this plan
                                </button>
                            )}
                        </div>
                        {planError && <p className="mt-2 text-xs text-rose-300/90">{planError}</p>}
                    </div>
                </div>
            </div>
            <div className="w-full space-y-3 pb-4">
                <button
                    onClick={() => setShowCoach(true)}
                    className="button-press w-full rounded-xl border border-purple-400/30 bg-purple-500/15 py-4 text-lg font-medium text-purple-100 shadow-[0_4px_14px_0_rgb(168,85,247,0.25)] transition-colors hover:border-purple-300/50 hover:bg-purple-500/25"
                >
                    🎙️ Talk to Coach
                </button>
                <button
                    onClick={onStart}
                    disabled={isGeneratingPlan}
                    className="button-press w-full rounded-xl bg-blue-600 py-4 text-lg font-medium text-white shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isGeneratingPlan ? 'Designing workout…' : 'Start Workout'}
                </button>
            </div>

            {/* Voice Coach Modal */}
            <GeminiLiveCoach open={showCoach} onClose={() => setShowCoach(false)} />
        </div>
    );
};

interface TrainingScreenProps {
    onEnd: () => void;
    onSimulateRep: (peak: number) => void;
    sessionData: ReadinessPrediction | null;
    onEndSet: () => void;
    onboardStep: number;
    onSetOnboardStep: (step: number) => void;
    sessionPhase: 'active' | 'set-summary' | 'end';
    onDismissTutorial: () => void;
    restDuration: number;
    onResumeSet: () => void;
    recoveryDirective: string;
    preSetReadiness: number | null;
    completedSetsCount: number;
    getReadinessData: (score: number | null) => { color: string; word: string };
    isCalibrationSet: boolean;
    stopSuggestion: StopSuggestion | null;
    suggestionKey: string | null;
    onContinueSuggestion: (key: string) => void;
    onAcceptSuggestion: (key: string) => void;
    onSkipSet: () => void;
    onSkipExercise: () => void;
    onToggleSuppressStops: (on: boolean) => void;
    coachPrefs: CoachPrefs;
    awaitingEndSetConfirm: boolean;
    undoInfo: { label: string } | null;
    onUndo: () => void;
    restSummary: { preReadiness: number | null; postReadiness: number | null; weightAdjustmentMessage: string | null; nextWeightAdjustment: number | null; fatigueLimited: boolean } | null;
    coachOutput: CoachOutput | null;
    coachMessage: CoachFinalMessage | null;
    coachMessageStatus: CoachInsightStatus;
    onCoachContinue: () => void;
    onCoachEnd: () => void;
    onSetCoachSummary: (summary: CoachSetSummaryRecord | null) => void;
    recentSetReps: Rep[];
    plannedSet?: PlannedWorkoutSet | null;
    plannedNextSet?: PlannedWorkoutSet | null;
    plannedProgress?: { completed: number; total: number } | null;
}
export const TrainingScreen: React.FC<TrainingScreenProps> = ({
    onEnd, onSimulateRep, sessionData, onEndSet, sessionPhase, onboardStep, onSetOnboardStep, 
    onDismissTutorial, restDuration, onResumeSet, recoveryDirective,
    preSetReadiness, completedSetsCount, getReadinessData, isCalibrationSet,
    stopSuggestion, suggestionKey, onContinueSuggestion, onAcceptSuggestion,
    onSkipSet, onSkipExercise, onToggleSuppressStops, coachPrefs,
    awaitingEndSetConfirm, undoInfo, onUndo,
    restSummary, coachOutput, coachMessage, coachMessageStatus,
    onCoachContinue, onCoachEnd, onSetCoachSummary, recentSetReps,
    plannedSet, plannedNextSet, plannedProgress,
}) => {    const isFatigued = sessionData?.fatigueDetected || false;
    const preventAutoResume = Boolean(stopSuggestion);
    const suggestionReasons = useMemo(() => (stopSuggestion ? stopSuggestion.reasons.slice(0, 2).map(formatSuggestionReason) : []), [stopSuggestion]);
    const suggestionHeadline = stopSuggestion?.target === 'exercise' ? 'Coach suggests stopping this exercise' : 'Coach suggests stopping this set';
    const suggestionPrimaryLabel = stopSuggestion?.target === 'exercise' ? 'End exercise' : 'End set';
    const showCoachSkeleton = coachMessageStatus === 'skeleton';
    const showCoachMessage = coachMessageStatus === 'ready' && Boolean(coachMessage);
    const [isCoachMessageVisible, setIsCoachMessageVisible] = useState(false);

    const [showSuggestionBanner, setShowSuggestionBanner] = useState(Boolean(stopSuggestion));
    const [showSuggestionReasons, setShowSuggestionReasons] = useState(false);
    const [showOverflowMenu, setShowOverflowMenu] = useState(false);
    const bannerTimerRef = useRef<number | null>(null);

    const [restSecondsLeft, setRestSecondsLeft] = useState(restDuration);
    const totalSetsPlanned = Math.max(completedSetsCount + 1, 4);
    const timerJudgment = coachOutput?.judgment ?? 'neutral';
    const timerSubLabel = coachOutput?.timerSubLabel ?? null;
    const planKind = coachOutput?.plan ?? null;
    const coachCardMessage = coachOutput?.message ?? null;
    const primaryCta = coachOutput?.ctas?.find(cta => cta.emphasis === 'primary') ?? null;
    const secondaryCtas = useMemo(
        () => (coachOutput?.ctas ?? []).filter(cta => cta.emphasis === 'secondary'),
        [coachOutput],
    );
    const [showFatigueAlert, setShowFatigueAlert] = useState(false);
    const prevIsFatigued = useRef(isFatigued);
    const [animatedScore, setAnimatedScore] = useState(preSetReadiness ?? 100);
    const [animationStage, setAnimationStage] = useState<'hidden' | 'arc' | 'line' | 'rest'>('hidden');
    const prevPhaseRef = useRef(sessionPhase);
    const lastRestSignatureRef = useRef<string | null>(null);
    const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearRestInterval = useCallback(() => {
        if (restIntervalRef.current) {
            clearInterval(restIntervalRef.current);
            restIntervalRef.current = null;
        }
    }, []);

    const startRestCountdown = useCallback((initialSeconds: number) => {
        clearRestInterval();
        const initial = Math.max(0, Math.round(initialSeconds || 0));
        setRestSecondsLeft(initial);
        if (initial <= 0) {
            if (!preventAutoResume) {
                // Defer to next tick so parent state updates don't occur during render
                window.setTimeout(() => onResumeSet(), 0);
            }
            return;
        }
        restIntervalRef.current = window.setInterval(() => {
            setRestSecondsLeft(prev => {
                if (prev <= 1) {
                    clearRestInterval();
                    if (!preventAutoResume) {
                        // Defer to next tick so parent state updates don't occur during render
                        window.setTimeout(() => onResumeSet(), 0);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [clearRestInterval, preventAutoResume, onResumeSet]);

    useEffect(() => {
        if (isFatigued && !prevIsFatigued.current) {
            setShowFatigueAlert(true);
            const timer = setTimeout(() => {
                setShowFatigueAlert(false);
            }, 4000); // show for 4 seconds
            return () => clearTimeout(timer);
        }
        prevIsFatigued.current = isFatigued;
    }, [isFatigued]);

    useEffect(() => {
        const repCount = sessionData?.reps?.length ?? 0;
        if (sessionPhase === 'active' && repCount >= 9) {
            setShowFatigueAlert(true);
        }
    }, [sessionData?.reps?.length, sessionPhase]);

    useEffect(() => {
        if (coachMessageStatus === 'ready' && coachMessage) {
            let raf: number | null = null;
            if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
                setIsCoachMessageVisible(false);
                raf = window.requestAnimationFrame(() => setIsCoachMessageVisible(true));
            } else {
                setIsCoachMessageVisible(true);
            }
            return () => {
                if (raf !== null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
                    window.cancelAnimationFrame(raf);
                }
                setIsCoachMessageVisible(false);
            };
        }
        setIsCoachMessageVisible(false);
        return undefined;
    }, [coachMessageStatus, coachMessage?.id]);

    useEffect(() => {
        if (bannerTimerRef.current) {
            window.clearTimeout(bannerTimerRef.current);
            bannerTimerRef.current = null;
        }
        if (!stopSuggestion || !suggestionKey) {
            setShowSuggestionBanner(false);
            setShowSuggestionReasons(false);
            setShowOverflowMenu(false);
            return;
        }
        setShowSuggestionBanner(true);
        setShowSuggestionReasons(false);
        setShowOverflowMenu(false);
        bannerTimerRef.current = window.setTimeout(() => {
            setShowSuggestionBanner(false);
        }, 6500);
        return () => {
            if (bannerTimerRef.current) {
                window.clearTimeout(bannerTimerRef.current);
                bannerTimerRef.current = null;
            }
        };
    }, [stopSuggestion, suggestionKey]);

    useEffect(() => {
        if (showSuggestionReasons && bannerTimerRef.current) {
            window.clearTimeout(bannerTimerRef.current);
            bannerTimerRef.current = null;
        }
    }, [showSuggestionReasons]);

    

    const memoisedRestSummary = useMemo(() => restSummary ?? {
        preReadiness: preSetReadiness ?? sessionData?.currentReadiness ?? 0,
        postReadiness: sessionData?.currentReadiness ?? 0,
        weightAdjustmentMessage: sessionData?.weightAdjustmentMessage ?? null,
        nextWeightAdjustment: sessionData?.nextSetWeightAdjustment ?? null,
        fatigueLimited: false,
    }, [restSummary, preSetReadiness, sessionData?.currentReadiness, sessionData?.weightAdjustmentMessage, sessionData?.nextSetWeightAdjustment]);

    const activeScenario = useMemo<Scenario>(() => {
        const signalUnstable = stopSuggestion?.reasons?.some(reason => reason.code === 'signal_unstable') ?? false;
        if (isCalibrationSet) return 'just_right';
        if (signalUnstable) return 'low_signal';
        if (coachOutput?.offerType === 'progress') return 'too_light';
        if (coachOutput?.offerType === 'recovery') return 'early_heavy';
        if (completedSetsCount === 1) return 'early_heavy';
        return 'just_right';
    }, [isCalibrationSet, stopSuggestion, coachOutput?.offerType, completedSetsCount]);

    const emgPlanRef = useRef<RepFeature[]>([]);
    const emgScenarioRef = useRef<Scenario | null>(null);
    const emgLastOptionsRef = useRef<SetSimOptions | null>(null);
    const prevRepCountRef = useRef<number>(sessionData?.reps?.length ?? 0);
    const emgRepsRef = useRef<RepFeature[]>([]);
    const hasRequestedCoachRef = useRef(false);
    const { notes, pushRepCue, dismiss: dismissNote, reset: resetDropNotes } = useCoachDrop();
    const [restCoachState, setRestCoachState] = useState<{
        primary: string;
        secondary: string;
        restSeconds: number;
        zone: Zone;
        why?: string;
        effortDelta: -1 | 0 | 1;
    } | null>(null);
    const [isFetchingCoach, setIsFetchingCoach] = useState(false);
    const [coachError, setCoachError] = useState<string | null>(null);
    const [setRecap, setSetRecap] = useState<SetRecapState | null>(null);
    const [showSetLoggingPanel, setShowSetLoggingPanel] = useState(false);
    const [exerciseQuery, setExerciseQuery] = useState('');
    const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
    const [weightEntry, setWeightEntry] = useState('');
    const [setIsLogged, setSetIsLogged] = useState(false);
    const [loggedData, setLoggedData] = useState<{ exercise: string; weight: string } | null>(null);
    const [logFeedback, setLogFeedback] = useState<string | null>(null);
    const [logError, setLogError] = useState<string | null>(null);

    const plannedLoadLabel = useMemo(() => {
        if (!plannedSet) return '';
        return formatLoadAdjustmentLabel(plannedSet.loadAdjustment);
    }, [plannedSet]);
    const plannedNextLoadLabel = useMemo(() => {
        if (!plannedNextSet) return '';
        return formatLoadAdjustmentLabel(plannedNextSet.loadAdjustment);
    }, [plannedNextSet]);
    const plannedCurrentSummary = useMemo(() => {
        if (!plannedSet) return null;
        const parts = [plannedSet.reps ?? 'coach-guided'];
        if (plannedSet.tempo) parts.push(plannedSet.tempo);
        if (plannedLoadLabel) parts.push(plannedLoadLabel);
        return parts.filter(Boolean).join(' · ');
    }, [plannedSet, plannedLoadLabel]);
    const plannedNextSummary = useMemo(() => {
        if (!plannedNextSet) return null;
        const parts = [plannedNextSet.reps ?? 'coach-guided'];
        if (plannedNextSet.tempo) parts.push(plannedNextSet.tempo);
        if (plannedNextLoadLabel) parts.push(plannedNextLoadLabel);
        return parts.filter(Boolean).join(' · ');
    }, [plannedNextSet, plannedNextLoadLabel]);

    useEffect(() => {
        if (animationStage === 'line') {
            setShowSetLoggingPanel(false);
            if (plannedSet) {
                const exerciseName = plannedSet.exerciseName;
                setExerciseQuery(exerciseName);
                setSelectedExercise(exerciseName);
                setWeightEntry(plannedLoadLabel || 'Plan');
                setLogFeedback('Plan pre-filled. Add reps and tap save.');
            } else {
                setExerciseQuery('');
                setSelectedExercise(null);
                setWeightEntry('');
                setLogFeedback(null);
            }
            setSetIsLogged(false);
            setLoggedData(null);
            setLogError(null);
        } else if (animationStage === 'rest') {
            setShowSetLoggingPanel(true);
        }
    }, [animationStage, plannedSet, plannedLoadLabel]);

    const emitTelemetry = useCallback(
        (event: { type: 'coach_advice_shown'; zone: Zone; fatigue_rep: number | null } | { type: 'coach_user_decision'; decision: RestCoachAction }) => {
            console.info('[telemetry]', event);
        },
        [],
    );

    const filteredExercises = useMemo(() => {
        const query = exerciseQuery.trim().toLowerCase();
        if (query.length < 3) return [] as string[];
        return LEG_EXERCISES.filter((name) => name.toLowerCase().includes(query)).slice(0, 10);
    }, [exerciseQuery]);

    const handleExerciseSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setExerciseQuery(event.target.value);
        setSelectedExercise(null);
        setLogFeedback(null);
        setLogError(null);
    }, []);

    const handleSelectExerciseOption = useCallback((name: string) => {
        setSelectedExercise(name);
        setExerciseQuery(name);
        setLogFeedback(null);
        setLogError(null);
    }, []);

    const handleSelectWeightValue = useCallback((value: number) => {
        setWeightEntry(String(value));
        setLogFeedback(null);
        setLogError(null);
    }, []);

    const handleWeightInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setWeightEntry(event.target.value);
        setLogFeedback(null);
        setLogError(null);
    }, []);

    const handleSaveSetDetails = useCallback(() => {
        const exerciseName = (selectedExercise ?? exerciseQuery).trim();
        const weightValue = weightEntry.trim();

        if (!exerciseName && !weightValue) {
            setLogError('Add an exercise or weight before saving.');
            setLogFeedback(null);
            return;
        }

        setLogError(null);
        setLogFeedback("Logged. We'll use this to sharpen future cues.");
        console.info('[Symmetric][SetLog]', {
            exercise: exerciseName || null,
            weight: weightValue ? Number(weightValue) : null,
        });
    }, [exerciseQuery, selectedExercise, weightEntry]);

    const clearEmgReps = useCallback(() => {
        emgRepsRef.current = [];
        resetDropNotes();
    }, [resetDropNotes]);

    useEffect(() => {
        const currentCount = sessionData?.reps?.length ?? 0;
        const previousCount = prevRepCountRef.current;

        if (currentCount > previousCount) {
            for (let idx = previousCount + 1; idx <= currentCount; idx += 1) {
                pushRepCue(idx);
            }
        }

        if (currentCount === 0 && previousCount > 0) {
            emgPlanRef.current = [];
            emgScenarioRef.current = null;
            emgLastOptionsRef.current = null;
            clearEmgReps();
        }
        prevRepCountRef.current = currentCount;
    }, [sessionData?.reps?.length, clearEmgReps, pushRepCue]);

    useEffect(() => {
        if (sessionPhase !== 'active') {
            emgPlanRef.current = [];
            emgScenarioRef.current = null;
            emgLastOptionsRef.current = null;
        }
    }, [sessionPhase]);

    const buildSimOptions = useCallback((repIndex: number, scenario: Scenario): SetSimOptions => {
        const baseTargetRange = isCalibrationSet ? { min: 4, max: 6 } : { min: 7, max: 10 };
        const baseRepsTarget = Math.max(repIndex + 6, isCalibrationSet ? 6 : 18);
        const options: SetSimOptions = {
            scenario,
            exercise: 'barbell_squat',
            repsTarget: baseRepsTarget,
            targetRange: baseTargetRange,
        };

        if (scenario === 'low_signal') {
            options.forceLowSignalWindows = [
                {
                    from: Math.max(2, baseTargetRange.min - 1),
                    to: baseTargetRange.min + 2,
                    confidence: 0.4,
                },
            ];
        }

        if (scenario === 'too_light') {
            options.effortStep = EMG_SIM_DEFAULTS.effortStep * 0.8;
            options.fatigueGain = EMG_SIM_DEFAULTS.fatigueGain * 0.7;
        }

        if (scenario === 'early_heavy') {
            options.failureTriggerFatigue = Math.min(
                0.75,
                EMG_SIM_DEFAULTS.failureTriggerFatigue - 0.04,
            );
        }

        if (isCalibrationSet) {
            options.customCurve = [
                { atRep: 1, rms: 0.95 },
                { atRep: Math.max(2, Math.round(baseRepsTarget / 2)), rms: 1.28 },
                { atRep: baseRepsTarget, rms: 1.42 },
            ];
        }

        return options;
    }, [isCalibrationSet]);

    const ensurePlanForRep = useCallback((repIndex: number): RepFeature[] => {
        const scenario = activeScenario;
        const needsFreshPlan = emgPlanRef.current.length === 0 || emgScenarioRef.current !== scenario;
        if (needsFreshPlan) {
            const options = buildSimOptions(repIndex, scenario);
            emgPlanRef.current = makeRmsSetV2(options);
            emgScenarioRef.current = scenario;
            emgLastOptionsRef.current = options;
        }

        if (emgPlanRef.current.length <= repIndex) {
            const baseOptions = emgLastOptionsRef.current ?? buildSimOptions(repIndex, scenario);
            const currentTarget = baseOptions.repsTarget ?? repIndex + 4;
            const extendedTarget = Math.max(repIndex + 4, currentTarget + 4);
            const extendedPlan = makeRmsSetV2({ ...baseOptions, repsTarget: extendedTarget });
            emgPlanRef.current = [
                ...emgPlanRef.current,
                ...extendedPlan.slice(emgPlanRef.current.length),
            ];
            emgLastOptionsRef.current = { ...baseOptions, repsTarget: extendedTarget };
        }

        return emgPlanRef.current;
    }, [activeScenario, buildSimOptions]);

    const convertFeatureToPeak = useCallback((feature: RepFeature): number => {
        const normalized = clampValue((feature.rmsNorm - RMS_MIN) / (RMS_MAX - RMS_MIN), 0, 1);
        const velocityPenalty = feature.repVelocity != null ? (1 - feature.repVelocity) * 6 : 0;
        const basePeak = 52 + normalized * 46 - velocityPenalty;
        const jitter = (Math.random() - 0.5) * 2.5;
        return Math.round(clampValue(basePeak + jitter, 35, 100));
    }, []);

    const handleSimulatedRep = useCallback(() => {
        if (sessionPhase !== 'active') return;
        const repIndex = emgRepsRef.current.length;
        const plan = ensurePlanForRep(repIndex);
        if (plan.length === 0) return;
        const sourceFeature = plan[Math.min(repIndex, plan.length - 1)];
        const feature: RepFeature = { ...sourceFeature, idx: repIndex + 1 };
        emgRepsRef.current = [...emgRepsRef.current, feature];

        const peak = convertFeatureToPeak(feature);
        onSimulateRep(peak);
    }, [sessionPhase, ensurePlanForRep, convertFeatureToPeak, onSimulateRep]);

    useEffect(() => {
        if (sessionPhase === 'set-summary') {
            resetDropNotes();
        }

        if (sessionPhase === 'set-summary') {
            if (hasRequestedCoachRef.current) {
                return;
            }
            hasRequestedCoachRef.current = true;

            const featureSnapshot =
                emgRepsRef.current.length > 0
                    ? [...emgRepsRef.current]
                    : buildRepFeaturesFromSession(recentSetReps.length ? recentSetReps : sessionData?.reps);

            if (!featureSnapshot.length) {
                setRestCoachState(null);
                setSetRecap(null);
                return;
            }

            const metrics = computeSetSummary(featureSnapshot);
            if (!metrics) {
                onSetCoachSummary?.(null);
                setSetRecap(null);
                return;
            }

            // First set fallback recap immediately
            const fallbackRecap = buildSetRecapSummary(metrics);
            setSetRecap(fallbackRecap);

            const payload = buildGeminiSetRequest(metrics);
            let cancelled = false;
            setIsFetchingCoach(true);
            setCoachError(null);

            (async () => {
                // Fetch Gemini-generated set recap in parallel with rest coach advice
                const [geminiRecap, response] = await Promise.all([
                    fetchGeminiSetRecap(metrics),
                    requestGeminiSetSummary(payload),
                ]);

                // Update recap with Gemini version if available
                if (geminiRecap && !cancelled) {
                    setSetRecap({
                        headline: geminiRecap.headline,
                        detail: geminiRecap.detail,
                        tone: fallbackRecap.tone,
                        scientificTip: fallbackRecap.scientificTip,
                    });
                }
                if (cancelled) return;
                setIsFetchingCoach(false);

                let restAdvice: CoachRestAdvice;
                if (response) {
                    restAdvice = {
                        source: 'gemini',
                        primary: response.primary_text,
                        secondary: response.secondary_text,
                        restSeconds: response.rest_seconds,
                        effortDelta: response.effort_delta,
                        why: response.show_why ? response.why_text ?? undefined : undefined,
                    };
                } else {
                    setCoachError('Using local coaching guidance.');
                    restAdvice = {
                        source: 'fallback',
                        primary: primaryLine(metrics.zone),
                        secondary: secondaryLine(metrics.zone),
                        restSeconds:
                            metrics.zone === 'too_light'
                                ? 90
                                : metrics.zone === 'too_heavy_early'
                                ? 150
                                : 120,
                        effortDelta: fallbackEffortDeltaForZone(metrics.zone),
                        why: whyLine(metrics.zone, {
                            totalRisePct: metrics.totalRisePct,
                            slopePctPerRep: metrics.slopePctPerRep,
                        }) || undefined,
                    };
                }

                setRestCoachState({
                    primary: restAdvice.primary,
                    secondary: restAdvice.secondary,
                    restSeconds: restAdvice.restSeconds,
                    zone: metrics.zone,
                    why: restAdvice.why,
                    effortDelta: restAdvice.effortDelta,
                });

                onSetCoachSummary?.({
                    metrics,
                    restAdvice,
                    exerciseName: sessionData?.intensityPill?.text ?? null,
                    geminiResponse: response ?? undefined,
                    timestamp: Date.now(),
                });

                emitTelemetry({
                    type: 'coach_advice_shown',
                    zone: metrics.zone,
                    fatigue_rep: metrics.fatigueRep,
                });
            })();

            return () => {
                cancelled = true;
            };
        }

        hasRequestedCoachRef.current = false;
        setIsFetchingCoach(false);
        setCoachError(null);
        if (sessionPhase !== 'set-summary') {
            setRestCoachState(null);
            setSetRecap(null);
        }
    }, [sessionPhase, emitTelemetry, resetDropNotes, onSetCoachSummary, sessionData?.intensityPill?.text, sessionData?.reps, recentSetReps]);

    useEffect(() => {
        const previousPhase = prevPhaseRef.current;
        prevPhaseRef.current = sessionPhase;

        const enteringSetSummary = sessionPhase === 'set-summary' && previousPhase !== 'set-summary';
        let stage1Timer: ReturnType<typeof setTimeout> | null = null;
        let stage2Timer: ReturnType<typeof setTimeout> | null = null;
        let stage3Timer: ReturnType<typeof setTimeout> | null = null;
        const preScore = memoisedRestSummary.preReadiness ?? preSetReadiness ?? 100;
        const postScore = memoisedRestSummary.postReadiness ?? preScore;

        const summarySignature = `${preScore}|${postScore}`;
        const summaryChanged = summarySignature !== lastRestSignatureRef.current;
        if (sessionPhase === 'set-summary' && summaryChanged) {
            lastRestSignatureRef.current = summarySignature;
        }

        const shouldKickoff = sessionPhase === 'set-summary' && (enteringSetSummary || animationStage === 'hidden' || summaryChanged);

        if (shouldKickoff) {
            if (ANIMATION_DEBUG) console.log('[ANIMATION] Starting animation sequence - Stage 1: arc');
            setAnimationStage('arc');
            setAnimatedScore(preScore);
            setRestSecondsLeft(Math.max(0, Math.round(restDuration || 0)));

            stage1Timer = setTimeout(() => {
                if (ANIMATION_DEBUG) console.log('[ANIMATION] Stage 1 complete - updating score');
                setAnimatedScore(postScore);
            }, 100);

            stage2Timer = setTimeout(() => {
                if (ANIMATION_DEBUG) console.log('[ANIMATION] Stage 2: morphing to line');
                setAnimationStage('line');
            }, 2000);

            stage3Timer = setTimeout(() => {
                if (ANIMATION_DEBUG) console.log('[ANIMATION] Stage 3: showing rest content');
                setAnimationStage('rest');
            }, 2600);
        } else if (sessionPhase !== 'set-summary') {
            setAnimationStage('hidden');
            clearRestInterval();
        }

        return () => {
            // Only clear timers if we're actually leaving the set-summary phase
            if (sessionPhase !== 'set-summary') {
                if (ANIMATION_DEBUG) console.log('[ANIMATION] Cleanup: clearing timers (leaving set-summary)');
                if (stage1Timer) clearTimeout(stage1Timer);
                if (stage2Timer) clearTimeout(stage2Timer);
                if (stage3Timer) clearTimeout(stage3Timer);
                clearRestInterval();
            }
        };
    }, [sessionPhase, animationStage, restDuration, preSetReadiness, memoisedRestSummary.preReadiness, memoisedRestSummary.postReadiness, clearRestInterval]);

    useEffect(() => {
        if (animationStage === 'rest') {
            startRestCountdown(restDuration);
            return () => {
                clearRestInterval();
            };
        }
        return () => undefined;
    }, [animationStage, restDuration, startRestCountdown, clearRestInterval]);
    
    const handleTutorialNext = useCallback(() => {
        const nextStep = onboardStep + 1;
        if (nextStep > onboardingTutorialSteps.length) {
            onSetOnboardStep(99);
            onDismissTutorial();
        } else {
            onSetOnboardStep(nextStep);
        }
    }, [onboardStep, onSetOnboardStep, onDismissTutorial]);

    const handleAcceptClick = useCallback(() => {
        if (suggestionKey) {
            onAcceptSuggestion(suggestionKey);
        }
    }, [suggestionKey, onAcceptSuggestion]);

    const handleContinueClick = useCallback(() => {
        if (suggestionKey) {
            onContinueSuggestion(suggestionKey);
            setShowSuggestionBanner(false);
        }
    }, [suggestionKey, onContinueSuggestion]);

    const handleCoachCta = useCallback((cta: CoachCta) => {
        if (cta.action === 'end_session') {
            onEnd();
            return;
        }
    deferResume();
    }, [onEnd, onResumeSet]);

    const deferResume = useCallback(() => {
        window.setTimeout(() => onResumeSet(), 0);
    }, [onResumeSet]);

    const handleSkipSetClick = useCallback(() => {
        setShowOverflowMenu(false);
        onSkipSet();
    }, [onSkipSet]);

    const handleSkipExerciseClick = useCallback(() => {
        setShowOverflowMenu(false);
        onSkipExercise();
    }, [onSkipExercise]);

    const handleRestCoachAction = useCallback(
        (action: RestCoachAction) => {
            emitTelemetry({ type: 'coach_user_decision', decision: action });
            setRestCoachState(null);
            clearEmgReps();
        },
        [emitTelemetry, clearEmgReps],
    );

    const handleToggleSuppressClick = useCallback(() => {
        setShowOverflowMenu(false);
        onToggleSuppressStops(!coachPrefs.suppressStopsForSession);
    }, [onToggleSuppressStops, coachPrefs.suppressStopsForSession]);

    const formatLoggedWeight = useCallback((value: string) => {
        const trimmed = value.trim();
        const numeric = Number(trimmed);
        if (!trimmed.length) return trimmed;
        if (!Number.isNaN(numeric)) {
            return `${numeric} lbs`;
        }
        return trimmed;
    }, []);

    const renderPostSetScreen = () => {
        const preScore = memoisedRestSummary.preReadiness ?? preSetReadiness ?? 0;
        const finalReadiness = memoisedRestSummary.postReadiness ?? preScore;
        const readinessData = getReadinessData(finalReadiness);
        const animatedReadinessData = getReadinessData(animatedScore);
        
        return (
            <div className={`post-set-screen ${animationStage !== 'hidden' ? 'visible' : ''}`}>
                <div className={`post-set-arc-container ${animationStage === 'line' || animationStage === 'rest' ? 'morphed' : ''}`}>
                    <div className={`arc-wrapper ${animationStage !== 'arc' ? 'hidden' : ''}`}>
                        <ReadinessArc 
                            score={animatedScore}
                            color={animatedReadinessData.color}
                            size={220}
                        />
                    </div>
                    <div className={`line-wrapper ${animationStage === 'line' || animationStage === 'rest' ? 'visible' : ''}`}>
                         <div className="flex-grow">
                             <ReadinessBar 
                                 preSetScore={preScore} 
                                 postSetScore={finalReadiness} 
                                 color={readinessData.color}
                             />
                         </div>
                         <span className="font-semibold text-gray-300">{Math.round(finalReadiness)}% Readiness</span>
                    </div>
                </div>

                <div className={`resting-content-container ${animationStage === 'rest' ? 'visible' : ''}`}>
                    <div className="flex flex-col items-center justify-center">
                        <span className="text-5xl font-black tracking-tight">{`${String(Math.floor(restSecondsLeft/60)).padStart(2,'0')}:${String(restSecondsLeft%60).padStart(2,'0')}`}</span>
                        <span className="text-sm text-white/60 -mt-1">Resting...</span>
                    </div>
                    {/* HERO: Coach Feedback - Most Important */}
                    {setRecap ? (
                        <div
                            className={`w-full max-w-sm rounded-3xl border px-7 py-6 text-center text-white shadow-2xl backdrop-blur-lg ${SET_RECAP_TONE_CLASSES[setRecap.tone]} transform transition-all duration-500 animate-in fade-in slide-in-from-bottom-4`}
                        >
                            <p className="text-lg font-bold tracking-tight leading-tight">{setRecap.headline}</p>
                            <p className="mt-3 text-sm text-white/90 leading-relaxed">{setRecap.detail}</p>
                            {setRecap.scientificTip ? (
                                <p className="mt-3 text-xs text-white/70 leading-relaxed italic border-t border-white/20 pt-3">{setRecap.scientificTip}</p>
                            ) : null}
                        </div>
                    ) : null}
                    {coachMessageStatus === 'ready' && coachMessage ? (
                        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/95 px-7 py-6 text-center shadow-2xl backdrop-blur-lg transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
                            <p className="text-lg font-bold text-white leading-tight">{coachMessage.headline}</p>
                            {coachMessage.subline && (
                                <p className="mt-3 text-sm text-white/80 leading-relaxed">{coachMessage.subline}</p>
                            )}
                            {coachMessage.tip && (
                                <p className="mt-3 text-xs text-white/65 leading-relaxed italic border-t border-white/20 pt-3">{coachMessage.tip}</p>
                            )}
                        </div>
                    ) : null}
                    {plannedNextSet && (
                        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/70 px-6 py-5 text-left text-white shadow-2xl backdrop-blur-lg transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
                                Up Next
                            </p>
                            <p className="mt-2 text-sm font-semibold text-white">{plannedNextSet.exerciseName}</p>
                            <p className="mt-1 text-xs text-white/70">
                                Set {plannedNextSet.setIndex + 1} of {plannedNextSet.totalSets}
                                {plannedNextSummary ? ` · ${plannedNextSummary}` : ''}
                            </p>
                            {plannedProgress && plannedProgress.total > 0 && (
                                <p className="mt-2 text-[11px] text-white/45">
                                    {Math.min(plannedProgress.completed, plannedProgress.total)} / {plannedProgress.total} sets logged
                                </p>
                            )}
                        </div>
                    )}
                    {plannedSet && !setIsLogged && (
                        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-4 text-left text-white shadow-2xl backdrop-blur-lg transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/35">
                                Just logged
                            </p>
                            <p className="mt-2 text-sm font-semibold text-white">{plannedSet.exerciseName}</p>
                            {plannedCurrentSummary && (
                                <p className="mt-1 text-xs text-white/65">{plannedCurrentSummary}</p>
                            )}
                        </div>
                    )}
                    <div className="w-full max-w-sm space-y-3">
                        {/* Simple Status Indicator for Logging */}
                        {setIsLogged ? (
                            <button
                                type="button"
                                onClick={() => setShowSetLoggingPanel(true)}
                                className="w-full rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 transition hover:bg-emerald-500/20 hover:border-emerald-500/40 active:scale-[0.98] button-press animate-in fade-in slide-in-from-top duration-500"
                            >
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 animate-in zoom-in duration-300">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-semibold text-emerald-400">Set logged</p>
                                    </div>
                                    {loggedData && (
                                        <p className="text-xs text-emerald-300/80 font-medium">
                                            {formatLoggedWeight(loggedData.weight)}
                                            {loggedData.exercise ? ` • ${loggedData.exercise}` : ''}
                                        </p>
                                    )}
                                    <span className="text-xs text-emerald-400/60 mt-0.5">Tap to edit</span>
                                </div>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowSetLoggingPanel(true)}
                                className="w-full rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 transition hover:bg-amber-500/20 hover:border-amber-500/40 active:scale-[0.98] button-press"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-lg">📝</span>
                                    <p className="text-sm font-medium text-amber-400">Log this set</p>
                                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400/80">Optional</span>
                                </div>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => (primaryCta && !restCoachState ? handleCoachCta(primaryCta) : onResumeSet())}
                            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-400 button-press"
                        >
                            {!restCoachState && primaryCta?.label ? primaryCta.label : 'Start Next Set'}
                        </button>
                        {!restCoachState && secondaryCtas.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-3">
                                {secondaryCtas.map((cta) => (
                                    <button
                                        key={cta.id}
                                        type="button"
                                        onClick={() => handleCoachCta(cta)}
                                        className="text-xs font-semibold text-white/70 underline-offset-2 transition hover:underline button-press"
                                    >
                                        {cta.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={onEnd}
                            className="w-full rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/16 button-press"
                        >
                            End Session
                        </button>
                    </div>

                    {/* Slide-Up LogSetCard Panel */}
                    <SlideUpLogPanel
                        show={showSetLoggingPanel}
                        onClose={() => {
                            console.log('[DEBUG] Panel closed, NOT setting logged state');
                            setShowSetLoggingPanel(false);
                        }}
                        onSaved={(data) => {
                            console.log('[DEBUG] Set SAVED with data:', data);
                            setLoggedData(data);
                            setSetIsLogged(true);
                        }}
                        initialExercise={selectedExercise || ''}
                        initialWeight={weightEntry}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={`relative flex h-full w-full flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white transition-all duration-1000 ${isFatigued ? 'fatigue-glow-bg' : ''}`}>
            <DropStack notes={notes} onDismiss={dismissNote} />
            {onboardStep < 99 && <TutorialPopUp step={onboardStep} onNext={handleTutorialNext} onSkip={onDismissTutorial} steps={onboardingTutorialSteps} />}

            {sessionPhase !== 'set-summary' && (showCoachSkeleton || showCoachMessage) && (
                <div className="fixed top-4 left-1/2 z-40 w-[min(420px,calc(100%-32px))] -translate-x-1/2" aria-live="polite">
                    {showCoachSkeleton && (
                        <div className="rounded-3xl border border-white/10 bg-slate-900/90 px-5 py-4 shadow-2xl backdrop-blur-md">
                            <div className="h-3 w-24 rounded-full bg-white/10 animate-pulse" />
                            <div className="mt-3 h-3 w-3/4 rounded-full bg-white/5 animate-pulse" />
                        </div>
                    )}
                    {showCoachMessage && coachMessage && (
                        <div
                            key={coachMessage.id}
                            className={`rounded-3xl border border-white/10 bg-slate-900/95 px-5 py-4 shadow-2xl backdrop-blur-lg transition-opacity duration-200 ${isCoachMessageVisible ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <p className="text-sm font-semibold text-white">{coachMessage.headline}</p>
                            {coachMessage.subline && (
                                <p className="mt-1 text-sm text-white/70">{coachMessage.subline}</p>
                            )}
                            {coachMessage.tip && (
                                <p className="mt-2 text-xs text-white/60">{coachMessage.tip}</p>
                            )}
                            {coachMessage.actions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {coachMessage.actions.includes('continue_anyway') && (
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onCoachContinue();
                                            }}
                                            className="flex-1 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/60 hover:text-white"
                                        >
                                            Continue anyway
                                        </button>
                                    )}
                                    {coachMessage.actions.includes('end_set') && (
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onCoachEnd();
                                            }}
                                            className="flex-1 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
                                        >
                                            End set
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            {stopSuggestion && suggestionKey && showSuggestionBanner && (
                <div className="fixed top-6 left-1/2 z-40 w-[min(420px,calc(100%-32px))] -translate-x-1/2" aria-live="polite" role="status">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/95 px-5 py-4 shadow-2xl">
                        <div className="flex items-start gap-3">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-white">{suggestionHeadline}</p>
                                {suggestionReasons[0] && (
                                    <p className="mt-1 text-xs text-white/70">{suggestionReasons[0]}</p>
                                )}
                                {showSuggestionReasons && (
                                    <ul className="mt-2 space-y-1 text-xs text-white/70">
                                        {suggestionReasons.map((reason, index) => (
                                            <li key={`${reason}-${index}`} className="flex items-start gap-2">
                                                <span className="mt-[3px] h-[4px] w-[4px] rounded-full bg-white/60"></span>
                                                <span>{reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={onEnd} className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400 button-press">
                                        End session
                                    </button>
                                    <button type="button" onClick={handleContinueClick} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20 button-press">
                                        Continue anyway
                                    </button>
                                    <button type="button" onClick={() => setShowSuggestionReasons(prev => !prev)} className="text-xs font-semibold text-white/70 underline-offset-2 transition hover:underline" aria-expanded={showSuggestionReasons}>
                                        Why?
                                    </button>
                                </div>
                            </div>
                            <div className="relative">
                                <button type="button" className="p-2 text-white/60 transition hover:text-white" aria-haspopup="true" aria-expanded={showOverflowMenu} onClick={() => setShowOverflowMenu(prev => !prev)}>
                                    ...
                                </button>
                                {showOverflowMenu && (
                                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-xl">
                                        <button type="button" onClick={handleSkipSetClick} className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/10 button-press">
                                            Skip set
                                        </button>
                                        <button type="button" onClick={handleSkipExerciseClick} className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/10 button-press">
                                            Skip exercise
                                        </button>
                                        <button type="button" onClick={handleToggleSuppressClick} className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/10 button-press">
                                            {coachPrefs.suppressStopsForSession ? 'Allow stop suggestions today' : "Don't suggest stops again today"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {renderPostSetScreen()}

            

            {undoInfo && (
                <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
                    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/95 px-4 py-2 shadow-2xl">
                        <span className="text-sm text-white/80">{undoInfo.label}</span>
                        <button type="button" onClick={onUndo} className="text-sm font-semibold text-emerald-300 transition hover:text-emerald-200 button-press">
                            Undo
                        </button>
                    </div>
                </div>
            )}

            <div className={`flex-1 flex flex-col transition-opacity duration-300 ${sessionPhase === 'set-summary' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {isCalibrationSet && (sessionData?.reps?.length || 0) === 0 && sessionPhase === 'active' && (
                    <div className="absolute inset-x-0 top-1/4 z-10 p-6 animate-screen-in">
                        <div className="bg-blue-900/50 border border-blue-500 rounded-2xl p-4 text-center backdrop-blur-sm space-y-2 shadow-lg">
                            <h3 className="text-lg font-bold text-blue-300">
                                Calibration Set
                            </h3>
                            <p className="text-white/90 text-base leading-relaxed">
                                We’re going to do 5 reps. The goal is to hit peak fatigue by the fifth rep.
                            </p>
                        </div>
                    </div>
                )}

                <div className={`flex-1 flex flex-col transition-opacity duration-500 ${isCalibrationSet && (sessionData?.reps?.length || 0) === 0 ? 'opacity-30' : 'opacity-100'}`}>
                    <div 
                        className="flex-grow relative py-6 md:py-10 chart-container"
                        onClick={handleSimulatedRep}
                        role="button"
                        aria-label="Simulate one high-realism rep"
                    >
                        <RepBarsChart 
                            reps={sessionData?.reps || []}
                            fatigueAtRep={sessionData?.fatigueDetectedAtRep || null}
                            targetRep={5}
                        />
                        {(sessionData?.reps?.length || 0) === 0 && !isCalibrationSet && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <p className="text-lg text-white/70 bg-black/50 px-4 py-2 rounded-lg animate-screen-in">Tap anywhere to start the set</p>
                            </div>
                        )}
                    </div>
                </div>
            
                <div className="mt-auto w-full rounded-t-3xl bg-slate-900/80 p-6 shadow-[0_-8px_35px_rgba(15,23,42,0.55)] backdrop-blur footer-section space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={onEndSet} className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)] transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 button-press">
                            End Set
                        </button>
                        <button
                            onClick={onEnd}
                            className="flex-1 rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white/90 button-press"
                        >
                            End Session
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

interface ImpactScreenProps {
    readinessScore: number | null;
    postScore: number | null;
    getReadinessData: (score: number | null) => { color: string, word: string };
    onContinueSession: () => void;
    onPlanNext: () => void;
    workoutSummary: string;
    isLoadingAdvice?: boolean;
}
export const ImpactScreen: React.FC<ImpactScreenProps> = ({
    readinessScore,
    postScore,
    getReadinessData,
    onContinueSession,
    onPlanNext,
    workoutSummary,
    isLoadingAdvice = false,
}) => {
    const animatedScore = postScore ?? readinessScore ?? 0;

    return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-screen-in space-y-6">
            <h2 className="text-3xl font-bold">Set Block Complete!</h2>
            <div className="py-4 flex flex-col items-center space-y-2">
                <div className="text-base font-medium text-gray-300">Current Readiness</div>
                <ReadinessArc score={animatedScore} color={getReadinessData(animatedScore).color} size={220} />
            </div>
            <div className="min-h-[80px] flex items-center justify-center">
                {isLoadingAdvice ? (
                    <p className="text-gray-400 text-sm italic">Coach is analyzing...</p>
                ) : (
                    <p className="text-gray-300 max-w-xs text-base leading-relaxed">{workoutSummary}</p>
                )}
            </div>
            <div className="w-full space-y-3 pt-6">
                <button onClick={onContinueSession} className="w-full bg-emerald-600 text-white py-4 text-lg rounded-2xl font-semibold hover:bg-emerald-700 transition-colors shadow-[0_4px_14px_0_rgb(16,185,129,0.39)] button-press">Continue Session</button>
                <button onClick={onPlanNext} className="w-full bg-white/10 text-white py-4 rounded-2xl text-lg button-press">End Session</button>
            </div>
        </div>
    );
};

export { HomeScreen } from './screens/HomeScreen';
export type { HomeScreenProps } from './screens/HomeScreen';

export const ChatScreen: React.FC<{
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string, intent?: CoachIntent) => void;
  onBack: () => void;
}> = ({ messages, isLoading, onSendMessage, onBack }) => {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
  
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: 'end' });
    };
  
    useEffect(() => {
      setTimeout(scrollToBottom, 100);
    }, [messages, isLoading]);
  
    const handleSend = () => {
      if (inputText.trim()) {
        onSendMessage(inputText.trim());
        setInputText('');
      }
    };
  
    return (
      <div className="h-full flex flex-col animate-chat-open bg-slate-900">
        <header className="flex justify-between items-center flex-shrink-0 h-20 px-4 pt-6 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-300 button-press"><BackIcon /></button>
          <h2 className="text-lg font-bold">Symmetric Coach</h2>
          <div className="w-8"></div>
        </header>
  
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex-1 space-y-4">
            {messages.map((message, index) => (
              <div key={message.id} className={`flex items-start gap-2.5 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                {message.sender === 'coach' && <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 mt-1"></div>}
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${message.sender === 'user' ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-slate-700 text-gray-200 rounded-bl-lg'}`}>
                  {message.sender === 'coach' && index === messages.length - 1 && isLoading && message.text ? (
                     <TypewriterText text={message.text} speed={30} className="leading-relaxed whitespace-pre-wrap" />
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.sender === 'user' && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 mt-1"></div>
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-slate-700 text-gray-200 rounded-bl-lg shadow-md">
                  <p className="opacity-70 leading-relaxed">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>
        
        <footer className="w-full p-4 flex-shrink-0 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-800 border border-slate-600 rounded-full py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleSend} className="bg-blue-600 text-white rounded-full p-2.5 button-press hover:bg-blue-500 transition-colors disabled:bg-gray-600" disabled={!inputText.trim()}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
        </footer>
      </div>
    );
};

interface HistoryScreenProps {
  sessions: SessionHistoryEntry[];
  onBack: () => void;
  getReadinessData: (score: number | null) => { color: string; word: string };
}
export const HistoryScreen: React.FC<HistoryScreenProps> = ({ sessions, onBack, getReadinessData }) => {
    return (
        <div className="h-full flex flex-col p-4 animate-screen-in">
            <div className="pt-8 flex items-center justify-between">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors p-2 -ml-2 button-press"><BackIcon /></button>
                <h2 className="text-2xl font-bold text-center flex-1 -ml-4">Session History</h2>
                 <div className="w-8"></div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
                {sessions.length === 0 ? (
                    <div className="text-center text-gray-500 pt-16">No sessions recorded yet.</div>
                ) : (
                    [...sessions].reverse().map((session, index) => {
                        const readinessData = getReadinessData(session.post);
                        return (
                            <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold">{toDate(session.date).toLocaleDateString()}</h3>
                                    <span className="text-sm font-semibold" style={{ color: readinessData.color }}>{readinessData.word}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-center text-sm">
                                    <div className="bg-gray-800/50 rounded-lg p-2">
                                        <div className="text-gray-400">Readiness Score</div>
                                        <div className="font-semibold text-lg" style={{ color: readinessData.color }}>{Math.round(session.post)}</div>
                                    </div>
                                    <div className="bg-gray-800/50 rounded-lg p-2">
                                        <div className="text-gray-400">Total Reps</div>
                                        <div className="font-semibold text-lg">{session.totalReps.length}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

interface ProgressScreenProps {
  trendPoints: TrendPoint[];
  sessions: SessionHistoryEntry[];
  onBack: () => void;
}

const ChartCard: React.FC<{
  title: string;
  subtitle: string;
  data: Array<{ label: string; value: number | null }>;
  stroke: string;
  valueFormatter?: (value: number) => string;
  maxXTicks?: number;
}> = ({ title, subtitle, data, stroke, valueFormatter, maxXTicks = 5 }) => {
  const width = 320;
  const height = 200;
  const padding = { top: 16, right: 24, bottom: 52, left: 60 };

  const points = data.map((point, index) => ({
    label: point.label,
    value:
      typeof point.value === 'number' && Number.isFinite(point.value) ? point.value : null,
    order: index,
  }));

  const filtered = points.filter((p) => p.value !== null) as Array<{
    label: string;
    value: number;
    order: number;
  }>;

  if (filtered.length === 1) {
    filtered.push({ ...filtered[0], order: filtered[0].order + 1 });
  }

  const values = filtered.map((p) => p.value);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const span = maxValue - minValue || 1;
  const paddingAmount = span * 0.1;
  const chartMin = minValue - paddingAmount;
  const chartMax = maxValue + paddingAmount;
  const chartRange = chartMax - chartMin || 1;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const createTicks = (min: number, max: number, count = 5) => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
    const safeCount = Math.max(count, 2);
    const step = safeCount > 1 ? (max - min) / (safeCount - 1) : 0;
    return Array.from({ length: safeCount }, (_, idx) => {
      const value = min + idx * step;
      return Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
    });
  };

  const yTicks = createTicks(chartMin, chartMax, 5);
  const latestValue = filtered.length ? filtered[filtered.length - 1].value : null;

  const buildPath = () => {
    if (filtered.length < 2) return '';
    return filtered
      .map((point, index) => {
        const ratio = filtered.length === 1 ? 0.5 : index / (filtered.length - 1);
        const x = padding.left + ratio * innerWidth;
        const y =
          padding.top +
          innerHeight -
          ((point.value - chartMin) / chartRange) * innerHeight;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  };

  const xTicks = (() => {
    if (filtered.length === 0) return [] as Array<{ label: string; position: number }>;
    const desired = Math.min(maxXTicks, Math.max(filtered.length, 2));
    const indices = new Set<number>();
    for (let i = 0; i < desired; i++) {
      const idx = desired === 1 ? 0 : Math.round(((filtered.length - 1) * i) / (desired - 1));
      indices.add(Math.max(0, Math.min(filtered.length - 1, idx)));
    }
    return Array.from(indices)
      .sort((a, b) => a - b)
      .map((idx) => {
        const ratio = filtered.length === 1 ? 0.5 : idx / (filtered.length - 1);
        return {
          label: filtered[idx]?.label ?? '',
          position: padding.left + ratio * innerWidth,
        };
      });
  })();

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/55">{subtitle}</p>
        </div>
        {latestValue != null && (
          <span className="text-sm font-semibold text-white/80">
            {valueFormatter ? valueFormatter(latestValue) : latestValue.toFixed(1)}
          </span>
        )}
      </div>

      <div className="mt-4">
        {filtered.length < 2 ? (
          <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-white/50">
            More data needed to chart this trend.
          </div>
        ) : (
          <svg width={width} height={height} className="w-full text-white/15">
            <rect
              x={padding.left}
              y={padding.top}
              width={innerWidth}
              height={innerHeight}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
            />

            {yTicks.map((value, idx) => {
              const y =
                padding.top +
                innerHeight -
                ((value - chartMin) / chartRange) * innerHeight;
              return (
                <g key={`y-tick-${idx}`}>
                  <line
                    x1={padding.left}
                    x2={padding.left + innerWidth}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 12}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-white/60 text-xs"
                  >
                    {valueFormatter ? valueFormatter(value) : value.toFixed(1)}
                  </text>
                </g>
              );
            })}

            <line
              x1={padding.left}
              y1={padding.top + innerHeight}
              x2={padding.left + innerWidth}
              y2={padding.top + innerHeight}
              stroke="rgba(255,255,255,0.2)"
            />

            <path
              d={buildPath()}
              fill="none"
              stroke={stroke}
              strokeWidth={3}
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(59,130,246,0.25)]"
            />
          </svg>
        )}
      </div>

      <div
        className="relative mt-4 h-6 text-[11px] uppercase tracking-[0.18em] text-white/45"
        style={{ width }}
      >
        {xTicks.map((tick, index) => (
          <span
            key={`${tick.label}-${index}`}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${tick.position}px` }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
};
export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  trendPoints,
  sessions,
  onBack,
}) => {
  const strengthData = React.useMemo(() => {
    return trendPoints
      .slice(-10)
      .map((point) => ({
        label: toDate(point.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        value: Number(point.readiness),
      }));
  }, [trendPoints]);

  const recoveryData = React.useMemo(() => {
    return sessions
      .slice(-10)
      .map((session) => {
        const post = Number(session.post);
        const pre = Number(session.pre);
        const delta =
          Number.isFinite(post) && Number.isFinite(pre) ? post - pre : null;
        return {
          label: toDate(session.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          value: delta,
        };
      });
  }, [sessions]);

  return (
    <div className="flex h-full flex-col bg-slate-950/90 px-6 pb-8 pt-10 text-white">
      <header className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-full border border-white/15 bg-white/10 p-2 text-white/70 transition hover:border-white/30 hover:text-white"
        >
          <BackIcon />
        </button>
        <h1 className="text-2xl font-semibold">Progress</h1>
        <div className="w-10" />
      </header>

      <p className="mt-3 text-sm text-white/60">
        Track how strength and recovery are trending after your recent sessions.
      </p>

      <main className="mt-6 flex-1 space-y-5 overflow-y-auto pb-12">
        <ChartCard
          title="Strength Trend"
          subtitle="Readiness (weekly view)"
          data={strengthData}
          stroke="#38bdf8"
          valueFormatter={(value) => `${value.toFixed(0)}`}
          maxXTicks={4}
        />
        <ChartCard
          title="Recovery Bounce"
          subtitle="Δ readiness after hard sets"
          data={recoveryData}
          stroke="#f59e0b"
          valueFormatter={(value) =>
            `${value > 0 ? '+' : ''}${value.toFixed(1)}`
          }
          maxXTicks={4}
        />
      </main>
    </div>
  );
};
export { ComplianceDemoScreen } from './screens/ComplianceDemo';
export { ExerciseRecommendationDemo } from './screens/ExerciseRecommendationDemo';
export { default as PlanDemo } from './screens/PlanDemo';
export { default as PlanInlineDemo } from './screens/PlanInlineDemo';
export { default as PlanRightSpineDemo } from './screens/PlanRightSpineDemo';
export { default as PremiumPlanDemo } from './screens/PremiumPlanDemo';
export { default as RestScreen } from './screens/RestScreen';
export { default as RestScreenDemo } from './screens/RestScreenDemo';
