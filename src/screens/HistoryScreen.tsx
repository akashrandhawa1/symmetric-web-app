import React from 'react';
import { BackIcon } from '../constants';
import type { SessionHistoryEntry } from '../types';
import { toDate } from '../services';

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
