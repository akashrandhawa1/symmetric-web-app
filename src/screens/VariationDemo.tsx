/**
 * Variation Engine Demo
 *
 * Demonstrates how the variation engine provides fresh, non-repetitive feedback
 * across multiple sets with identical performance.
 */

import React, { useState } from 'react';
import { generateVariedSetSummary, resetVariationState } from '../lib/coach/liveCoaching';
import type { SetSummary } from '../lib/coach/liveCoaching';

export default function VariationDemo() {
  const [summaries, setSummaries] = useState<SetSummary[]>([]);
  const [currentSet, setCurrentSet] = useState(1);

  const handleGenerateSet = (reps: number) => {
    const context = {
      target_rep_range: [3, 6] as [number, number],
      exercise_name: 'Barbell Squat',
      set_number: currentSet,
      user_training_age: 'intermediate' as const,
      previous_set_reps: summaries.length > 0 ? summaries[summaries.length - 1].total_reps : undefined,
      previous_set_feedback: summaries.length > 0
        ? (summaries[summaries.length - 1].zone_achieved === 'goldilocks' ? 'perfect'
          : summaries[summaries.length - 1].total_reps < 3 ? 'too_light'
          : summaries[summaries.length - 1].total_reps <= 8 ? 'slightly_over'
          : 'too_heavy') as const
        : undefined,
      total_sets_today: currentSet,
      recent_trend: currentSet >= 3 ? 'consistent' as const : undefined,
    };

    const summary = generateVariedSetSummary(reps, context);
    setSummaries([...summaries, summary]);
    setCurrentSet(currentSet + 1);
  };

  const handleReset = () => {
    resetVariationState();
    setSummaries([]);
    setCurrentSet(1);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Variation Engine Demo</h1>
          <p className="text-gray-400">
            Generate multiple sets with the same rep count to see how feedback varies each time.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Generate Set #{currentSet}</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleGenerateSet(2)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
            >
              2 Reps (Too Light)
            </button>
            <button
              onClick={() => handleGenerateSet(5)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition"
            >
              5 Reps (Perfect)
            </button>
            <button
              onClick={() => handleGenerateSet(8)}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition"
            >
              8 Reps (Slightly Over)
            </button>
            <button
              onClick={() => handleGenerateSet(10)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition"
            >
              10 Reps (Way Over)
            </button>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            Reset Session
          </button>
        </div>

        {/* Summaries */}
        <div className="space-y-6">
          {summaries.map((summary, index) => (
            <div
              key={index}
              className="bg-gray-900 rounded-xl p-6 border-2 border-gray-800 hover:border-gray-700 transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-500">#{index + 1}</div>
                  <div>
                    <div className="font-semibold">Set {index + 1}: {summary.total_reps} reps</div>
                    <div className="text-sm text-gray-400">
                      Zone: <span className={`font-medium ${
                        summary.zone_achieved === 'goldilocks' ? 'text-green-400' :
                        summary.zone_achieved === 'warmup' ? 'text-blue-400' :
                        summary.zone_achieved === 'approaching_limit' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>{summary.zone_achieved}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Productive Reps</div>
                  <div className="text-2xl font-bold text-green-400">{summary.productive_reps}</div>
                </div>
              </div>

              {/* Main Feedback */}
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-400 mb-1">FEEDBACK</div>
                <div className="text-lg">{summary.feedback}</div>
              </div>

              {/* Next Set Guidance */}
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-400 mb-1">NEXT SET</div>
                <div className="text-gray-300">{summary.next_set_guidance}</div>
              </div>

              {/* Scientific Insight */}
              {summary.scientific_insight && (
                <div className="mb-4 bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                  <div className="text-sm font-semibold text-blue-400 mb-1">💡 SCIENCE</div>
                  <div className="text-sm text-gray-300">{summary.scientific_insight}</div>
                </div>
              )}

              {/* Contextual Feedback */}
              {summary.contextual_feedback && (
                <div className="mb-4 bg-purple-900/20 border border-purple-800/30 rounded-lg p-4">
                  <div className="text-sm font-semibold text-purple-400 mb-1">🔄 CONTEXT</div>
                  <div className="text-sm text-gray-300">{summary.contextual_feedback}</div>
                </div>
              )}

              {/* Personalized Note */}
              {summary.personalized_note && (
                <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
                  <div className="text-sm font-semibold text-green-400 mb-1">✨ PERSONAL</div>
                  <div className="text-sm text-gray-300">{summary.personalized_note}</div>
                </div>
              )}
            </div>
          ))}

          {summaries.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <div className="text-6xl mb-4">🎭</div>
              <div className="text-xl font-medium mb-2">No sets yet</div>
              <div>Click a button above to generate your first set feedback</div>
            </div>
          )}

          {summaries.length >= 3 && (
            <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-green-400 mb-3">🎉 Variation In Action!</h3>
              <p className="text-gray-300 mb-4">
                Notice how even with identical rep counts, the feedback varies:
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span><strong>Different Phrasings:</strong> "Great set", "Solid work", "Beautiful set", etc.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span><strong>Rotating Science:</strong> Mechanical tension → Motor recruitment → Metabolic fatigue → etc.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span><strong>Context Awareness:</strong> References previous set performance when relevant</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span><strong>Personalization:</strong> Progress-based encouragement after multiple consistent sets</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
