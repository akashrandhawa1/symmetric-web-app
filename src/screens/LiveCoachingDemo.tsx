/**
 * Live Coaching Demo Screen
 *
 * Interactive demo showing real-time rep-by-rep coaching for strength training.
 * Simulates a set with live cues and end-of-set summary.
 *
 * @module screens/LiveCoachingDemo
 */

import React, { useState, useEffect } from 'react';
import { LiveCoachingCue, RepCounter } from '@/components/coach/LiveCoachingCue';
import { SetSummaryCard } from '@/components/coach/SetSummaryCard';
import type { LiveCoachingContext } from '@/lib/coach/liveCoaching';
import { generateSetSummary, getRepZone } from '@/lib/coach/liveCoaching';

// ============================================================================
// TYPES
// ============================================================================

type DemoPhase = 'setup' | 'executing' | 'summary';

// ============================================================================
// COMPONENT
// ============================================================================

export function LiveCoachingDemo() {
  const [phase, setPhase] = useState<DemoPhase>('setup');
  const [currentRep, setCurrentRep] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const context: LiveCoachingContext = {
    current_rep: currentRep,
    target_rep_range: [3, 6],
    exercise_name: 'Barbell Squat',
    set_number: setNumber,
    user_training_age: 'intermediate',
  };

  // Auto-play mode: simulates reps automatically
  useEffect(() => {
    if (phase === 'executing' && isAutoPlay) {
      const interval = setInterval(() => {
        setCurrentRep((prev) => {
          if (prev >= 10) {
            // End set at 10 reps for demo
            clearInterval(interval);
            setTotalReps(prev);
            setTimeout(() => setPhase('summary'), 500);
            return prev;
          }
          return prev + 1;
        });
      }, 2000); // New rep every 2 seconds

      return () => clearInterval(interval);
    }
  }, [phase, isAutoPlay]);

  const startSet = () => {
    setCurrentRep(1);
    setPhase('executing');
  };

  const manualRep = () => {
    setCurrentRep((prev) => prev + 1);
  };

  const endSet = () => {
    setTotalReps(currentRep);
    setPhase('summary');
  };

  const reset = () => {
    setPhase('setup');
    setCurrentRep(0);
    setTotalReps(0);
    setIsAutoPlay(false);
  };

  const nextSet = () => {
    setSetNumber((prev) => prev + 1);
    reset();
  };

  // ============================================================================
  // RENDER: SETUP PHASE
  // ============================================================================

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">💪</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Coaching Demo</h1>
            <p className="text-gray-600">
              Experience real-time rep-by-rep guidance focused on the 3-6 rep strength zone.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">How It Works:</h2>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Reps 1-2: Building up</li>
              <li>• Reps 3-6: 🎯 Strength zone (ideal!)</li>
              <li>• Reps 7-8: Approaching fatigue</li>
              <li>• Reps 9+: Unproductive territory</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                setIsAutoPlay(true);
                startSet();
              }}
              className="w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              ▶ Auto-Play Demo
            </button>
            <button
              onClick={startSet}
              className="w-full px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Manual Mode (Tap for Reps)
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            Set #{setNumber} • Barbell Squat
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: EXECUTING PHASE
  // ============================================================================

  if (phase === 'executing') {
    const zone = getRepZone(currentRep);

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
        {/* Live Coaching Cue (drops down from top) */}
        <LiveCoachingCue context={context} />

        {/* Exercise Info */}
        <div className="text-center mb-8">
          <h2 className="text-white text-xl font-medium opacity-75">Barbell Squat</h2>
          <p className="text-white text-sm opacity-60">Set #{setNumber}</p>
        </div>

        {/* Rep Counter */}
        <div className="mb-12">
          <RepCounter currentRep={currentRep} targetRange={[3, 6]} zone={zone} />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-md w-full">
          {!isAutoPlay && (
            <button
              onClick={manualRep}
              className="flex-1 px-8 py-4 bg-white text-gray-900 font-bold text-lg rounded-xl hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              ✓ Rep Complete
            </button>
          )}
          <button
            onClick={endSet}
            className={`${
              isAutoPlay ? 'flex-1' : ''
            } px-8 py-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
          >
            End Set
          </button>
        </div>

        {isAutoPlay && (
          <div className="mt-6 text-white text-sm opacity-60 animate-pulse">
            Auto-playing reps... (will stop at rep 10)
          </div>
        )}

        {/* Zone Legend */}
        <div className="mt-12 flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span className="text-white opacity-60">Warmup</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-white opacity-60">Strength Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-white opacity-60">Approaching Limit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span className="text-white opacity-60">Unproductive</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: SUMMARY PHASE
  // ============================================================================

  if (phase === 'summary') {
    const summary = generateSetSummary(totalReps, {
      target_rep_range: [3, 6],
      exercise_name: 'Barbell Squat',
      set_number: setNumber,
      user_training_age: 'intermediate',
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full">
          <SetSummaryCard
            summary={summary}
            onContinue={nextSet}
            onAdjustWeight={() => alert('Adjust weight feature coming soon!')}
            onEndSession={() => alert('End session - return to workout summary')}
          />

          <div className="text-center mt-6">
            <button
              onClick={reset}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              ← Back to Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default LiveCoachingDemo;
