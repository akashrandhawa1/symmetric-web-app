import React, { useState, useEffect, useRef } from 'react';
import { BackIcon } from '../constants';
import { ReadinessArc } from '../components/ReadinessArc';
import PremiumPlanView from '../components/plan/PremiumPlanView';
import { PlanInlineSkeleton } from '../components/plan/PlanInlineSkeleton';
import { GeminiLiveCoach } from '../components/coach/GeminiLiveCoach';
import { CoachContextBus } from '../coach/CoachContextBus';
import type { PlanProps } from '../types/plan';

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

const ensurePreTrainingStyles = () => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('plan-entry-mobile-styles')) return;
    const style = document.createElement('style');
    style.id = 'plan-entry-mobile-styles';
    style.textContent = `
    @keyframes plan-entry-mobile {
        0% { opacity: 0; transform: translateY(28px) scale(0.96); }
        55% { opacity: 1; transform: translateY(-6px) scale(1.01); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
    }

    .plan-entry-shell {
        background: linear-gradient(135deg, rgba(15,23,42,0.88), rgba(15,23,42,0.65));
        border-radius: 1.5rem;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 24px 48px rgba(15,23,42,0.38);
        max-height: min(70vh, 540px);
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 1.5rem;
        position: relative;
    }

    .plan-entry-shell::before {
        content: '';
        position: absolute;
        top: -10%;
        right: -25%;
        width: 60%;
        height: 60%;
        background: radial-gradient(circle at center, rgba(129,140,248,0.22), rgba(129,140,248,0));
        filter: blur(32px);
        pointer-events: none;
    }

    .plan-entry-scroll {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .plan-entry-shell::-webkit-scrollbar {
        width: 6px;
    }

    .plan-entry-shell::-webkit-scrollbar-thumb {
        background: rgba(148,163,184,0.45);
        border-radius: 999px;
    }

    @media (max-width: 600px) {
        .plan-entry-shell {
            max-height: 68vh;
            padding: 1.1rem;
            border-radius: 1.25rem;
        }
        .plan-entry-scroll {
            gap: 0.85rem;
        }
    }
    `;
    document.head.appendChild(style);
};

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
    const [showCoach, setShowCoach] = useState(false);
    const [planAnimationKey, setPlanAnimationKey] = useState(0);
    const previousPlanRef = useRef<PlanProps | null>(null);

    useEffect(() => {
        ensurePreTrainingStyles();
    }, []);

    // Set app surface for state-aware coaching
    useEffect(() => {
        CoachContextBus.publishContext({
            appSurface: 'pre_session',
            readiness: score ?? 75,
            readinessTarget: 50,
        });
    }, [score]);

    useEffect(() => {
        if (hasPlan && planView && !isGeneratingPlan) {
            if (previousPlanRef.current !== planView) {
                previousPlanRef.current = planView;
                setPlanAnimationKey((key) => key + 1);
            }
        } else if (!hasPlan) {
            previousPlanRef.current = null;
        }
    }, [hasPlan, planView, isGeneratingPlan]);

    return (
        <div className="mx-auto flex h-full w-full max-w-screen-sm flex-col px-4 pb-4 pt-6 animate-screen-in">
            <div className="px-2 pt-4">
                <button
                    onClick={onEndSession}
                    className="button-press -ml-2 rounded-full p-2 text-gray-400 transition-colors hover:text-white"
                >
                    <BackIcon />
                </button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center space-y-6 text-center">
                <ReadinessArc score={score || 0} color={data.color} />
                <div className="space-y-1">
                    <h2 className="text-xl font-medium" style={{ color: data.color }}>
                        Ready to Train
                    </h2>
                    <p className="text-sm text-amber-300/90">{rec?.message}</p>
                </div>

                <div className="w-full space-y-4 text-left">
                    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-lg backdrop-blur-md">
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

                        <div className="mt-4">
                            {isGeneratingPlan ? (
                                <PlanInlineSkeleton />
                            ) : hasPlan && planView ? (
                                <div
                                    key={planAnimationKey}
                                    className="plan-entry-shell"
                                    style={{ animation: 'plan-entry-mobile 0.75s cubic-bezier(0.22, 0.68, 0.43, 0.98) both' }}
                                >
                                    <div className="plan-entry-scroll">
                                        <PremiumPlanView {...planView} />
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-5 text-sm text-white/70">
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
                        {planError && (
                            <p className="mt-2 text-xs text-rose-300/90">{planError}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-full space-y-3 pt-6">
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
