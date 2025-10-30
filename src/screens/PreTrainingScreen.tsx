import React, { useState, useEffect } from 'react';
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

    // Set app surface for state-aware coaching
    useEffect(() => {
        CoachContextBus.publishContext({
            appSurface: 'pre_session',
            readiness: score ?? 75,
            readinessTarget: 50,
        });
    }, [score]);

    return (
        <div className="flex h-full flex-col p-4 animate-screen-in">
            <div className="px-2 pt-8">
                <button
                    onClick={onEndSession}
                    className="button-press -ml-2 rounded-full p-2 text-gray-400 transition-colors hover:text-white"
                >
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
                        {planError && (
                            <p className="mt-2 text-xs text-rose-300/90">{planError}</p>
                        )}
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
