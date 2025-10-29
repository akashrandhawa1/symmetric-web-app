import React from 'react';
import { ReadinessArc } from '../components/ReadinessArc';

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
