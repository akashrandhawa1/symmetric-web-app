import React from 'react';

export const STORAGE_KEY = 'symmetric_history_v1';
export const RECOVERY_THRESHOLD = 85;
export const LIVE_TUTORIAL_KEY = 'symmetric_live_tutorial_seen';
export const FEATURE_FATIGUE_DETECTOR =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_FEATURE_FATIGUE_DETECTOR != null)
    ? ((import.meta as any).env.VITE_FEATURE_FATIGUE_DETECTOR === 'true' || (import.meta as any).env.VITE_FEATURE_FATIGUE_DETECTOR === true)
    : true;
export const FEATURE_COACH_LLM_GUARDED =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_FEATURE_COACH_LLM_GUARDED != null)
    ? ((import.meta as any).env.VITE_FEATURE_COACH_LLM_GUARDED === 'true' || (import.meta as any).env.VITE_FEATURE_COACH_LLM_GUARDED === true)
    : true;

export const introSlides = [
    { imageUrl: "https://i.postimg.cc/jjPys2Cp/20250829-1133-Sprinter-s-Explosive-Start-simple-compose-01k3v7ays4fncvsqmcvwgjy5jp.png", headline: "Go Beyond Guesswork.", subtext: "Your body sends signals. We translate them into smarter training, faster recovery, and peak performance." },
    { imageUrl: "https://i.postimg.cc/Y06p0cQq/20250829-1139-Basketball-Athlete-s-Legs-simple-compose-01k3v7nq2keqpsw8g4h8yf8jm4.png", headline: "Know Your Readiness.", subtext: "By measuring your muscle activation, we calculate a daily readiness score. It's your guide to knowing when to push and when to recover." },
    { imageUrl: "https://images.unsplash.com/photo-1548690312-e3b507d8c110?q=80&w=420&auto=format&fit=crop&h=800", headline: "Calibrate Your Potential.", subtext: "Let's get started by connecting your sensor and setting your personal strength baseline." }
];

export const onboardingTutorialSteps = [
    { id: 1, title: "Your Repetitions", description: "This shows your reps in real-time. Each bar is one rep - taller bars mean higher intensity. Red bars mean you're building strength (80%+ effort). Tap to try it!", targetClass: 'rep-graph-target' },
    { id: 2, title: "Real-Time Readiness", description: "This is your Readiness Score. It starts at 100% and drops with each rep, reflecting the fatigue you accumulate. Keep an eye on it to know when to rest.", targetClass: 'readiness-target' },
    { id: 3, title: "Track Your Sets", description: "All your completed sets will be summarized here. This section helps you review your progress and plan for your next set.", targetClass: 'sets-target' },
];

export const READINESS_BASE = 72;
export const BASE_PROJECTION = 8;

export const DEFAULT_INTENSITY_PILL = { state: 'unknown' as const, color: '#9CA3AF', text: '—' };

// --- ICONS ---

export const HistoryIcon: React.FC = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M12 7v5l4 2"/> </svg> );
export const BackIcon: React.FC = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <polyline points="15 18 9 12 15 6"/> </svg> );
export const CheckmarkIcon: React.FC<{ className?: string }> = ({ className }) => (<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="checkmark-anim"/></svg>);
export const SitUprightIcon: React.FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><path d="M10 12H7a2 2 0 0 0-2 2v5h14v-5a2 2 0 0 0-2-2h-3"/><path d="M10 9L12 12L14 9"/></svg>);
export const SqueezeIcon: React.FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>);
export const RepeatIcon: React.FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" ><path d="M17 2.1l4 4-4 4"/><path d="M3 12.6v-2.6a4 4 0 0 1 4-4h14"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.4v2.6a4 4 0 0 1-4 4H3"/></svg>);
export const InfoIcon: React.FC = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <circle cx="12" cy="12" r="10"></circle> <line x1="12" y1="16" x2="12" y2="12"></line> <line x1="12" y1="8" x2="12.01" y2="8"></line> </svg> );

export const coachPrompts = {
  postSession: [
    "What should I do now to recover faster?",
    "Did I hit fatigue at the right time?",
    "When will I be ready for heavy work again?",
    "Any tips to reduce soreness today?",
    "Summarize my session in one sentence.",
  ],
  midRecovery: [
    "Am I ready for light work right now?",
    "How long until I’m 100%?",
    "What’s the best small thing I can do today?",
    "Should I shorten my next rest intervals?",
    "How’s my symmetry trending?",
  ],
  preSession: [
    "What should today’s focus be?",
    "How hard should I push?",
    "What rest interval should I use?",
    "Any warm-up suggestions for today?",
    "How will today affect recovery?",
  ],
  idle: [
    "When is my next optimal session?",
    "How is my strength trending this week?",
    "Give me one thing to improve recovery.",
    "What’s my recent PR?",
    "Plan my next two sessions.",
  ],
};
