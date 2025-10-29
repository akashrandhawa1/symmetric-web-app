/**
 * Workout Complete Demo
 *
 * Demonstrates the new Gemini-powered coach feedback system for post-workout summaries.
 * Shows WHAT happened, WHY it matters, NEXT steps for recovery, and ONE progress highlight.
 *
 * @module screens/WorkoutCompleteDemo
 */

import React, { useState, useEffect } from 'react';
import { getCoachText, type CoachPayload } from '../utils/getCoachText';
import CoachNote from '../components/CoachNote';

export function WorkoutCompleteDemo() {
  const [coachText, setCoachText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Sample workout data - in a real app, this would come from the session
  const [payload, setPayload] = useState<CoachPayload>({
    firstName: "Akash",
    session: {
      durationMin: 27,
      totalSets: 8,
      keyExercises: ["Back Squat", "Bulgarian Split Squat"],
      readinessStart: 73,
      readinessEnd: 52
    },
    progress: {
      topLoadTodayLb: 245,
      topLoadPrevLb: 235,
      topLoadDeltaPct: 4.3,
      emgDeltaPct: 3.0,
      setsPrevAvg: 6,
      minutesPrevAvg: 22
    },
    recovery: {
      windowClock: "7:30 pm"
    }
  });

  // Auto-fetch coach text on mount
  useEffect(() => {
    fetchCoachText();
  }, []);

  const fetchCoachText = async () => {
    setIsLoading(true);
    setError('');
    try {
      const text = await getCoachText(payload);
      if (!text) {
        setError('Failed to generate coach feedback. Check console for details.');
      } else {
        setCoachText(text);
      }
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
      console.error('Error fetching coach text:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePayload = (field: string, value: any) => {
    setPayload((prev) => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      }
      if (keys.length === 2) {
        return {
          ...prev,
          [keys[0]]: {
            ...(prev[keys[0] as keyof CoachPayload] as any),
            [keys[1]]: value
          }
        };
      }
      return prev;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Workout Complete
          </h1>
          <p className="text-slate-400">
            Demo of Gemini-powered post-workout coach feedback
          </p>
        </div>

        {/* Workout Summary Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Session Summary</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-500 mb-1">Duration</div>
              <div className="text-white font-semibold">{payload.session.durationMin} minutes</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Total Sets</div>
              <div className="text-white font-semibold">{payload.session.totalSets} sets</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Exercises</div>
              <div className="text-white font-semibold">{payload.session.keyExercises.join(", ")}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Readiness</div>
              <div className="text-white font-semibold">
                {payload.session.readinessStart} → {payload.session.readinessEnd}
              </div>
            </div>
          </div>

          {payload.progress && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Progress Data</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {payload.progress.topLoadTodayLb && (
                  <div>
                    <div className="text-slate-500">Top Load Today</div>
                    <div className="text-emerald-400 font-semibold">
                      {payload.progress.topLoadTodayLb} lb
                      {payload.progress.topLoadDeltaPct && (
                        <span className="ml-1">
                          (+{payload.progress.topLoadDeltaPct}%)
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {payload.progress.emgDeltaPct && (
                  <div>
                    <div className="text-slate-500">EMG Change</div>
                    <div className="text-blue-400 font-semibold">
                      +{payload.progress.emgDeltaPct}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Coach Feedback */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-white">Coach Feedback</h2>
            <button
              onClick={fetchCoachText}
              disabled={isLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? 'Generating...' : 'Regenerate'}
            </button>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-4">
              <div className="text-red-400 text-sm">{error}</div>
            </div>
          )}

          {isLoading ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-full"></div>
                  <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ) : (
            <CoachNote text={coachText} />
          )}
        </div>

        {/* Configuration Panel */}
        <details className="bg-slate-900/30 border border-slate-800 rounded-xl p-4">
          <summary className="text-slate-300 font-medium cursor-pointer hover:text-white transition-colors">
            Adjust Workout Data
          </summary>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={payload.session.durationMin}
                  onChange={(e) => updatePayload('session.durationMin', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Total Sets
                </label>
                <input
                  type="number"
                  value={payload.session.totalSets}
                  onChange={(e) => updatePayload('session.totalSets', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Readiness Start
                </label>
                <input
                  type="number"
                  value={payload.session.readinessStart}
                  onChange={(e) => updatePayload('session.readinessStart', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Readiness End
                </label>
                <input
                  type="number"
                  value={payload.session.readinessEnd}
                  onChange={(e) => updatePayload('session.readinessEnd', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {payload.progress && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Top Load Today (lb)
                    </label>
                    <input
                      type="number"
                      value={payload.progress.topLoadTodayLb || ''}
                      onChange={(e) => updatePayload('progress.topLoadTodayLb', parseInt(e.target.value) || undefined)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Delta %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={payload.progress.topLoadDeltaPct || ''}
                      onChange={(e) => updatePayload('progress.topLoadDeltaPct', parseFloat(e.target.value) || undefined)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}
            </div>

            <button
              onClick={fetchCoachText}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              Update Coach Feedback
            </button>
          </div>
        </details>

        {/* Info Panel */}
        <div className="mt-6 bg-slate-900/30 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">
            What the Coach Text Covers
          </h3>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• <strong>WHAT:</strong> Session summary (duration, sets, exercises, readiness change)</li>
            <li>• <strong>WHY:</strong> Brief explanation connecting the session to strength/recovery goals</li>
            <li>• <strong>NEXT:</strong> 1-2 specific actionable cooldown activities with reasons</li>
            <li>• <strong>PROGRESS:</strong> ONE highlight from the data (PR, EMG improvement, volume change)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default WorkoutCompleteDemo;
