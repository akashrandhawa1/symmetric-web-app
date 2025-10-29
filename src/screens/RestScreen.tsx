/**
 * RestScreen Component
 *
 * Displays a rest period timer and coaching advice.
 * Automatically shows LogSetCard in a slide-up panel when rest period starts.
 *
 * @module screens/RestScreen
 */

import React, { useState, useEffect } from 'react';
import { SlideUpLogPanel } from '@/components/SlideUpLogPanel';

interface RestScreenProps {
  /** Exercise name */
  exerciseName?: string;
  /** Current set number */
  setNumber?: number;
  /** Rest duration in seconds */
  restSeconds?: number;
  /** Callback when timer completes */
  onTimerEnd?: () => void;
  /** Callback when set data is saved */
  onSetSaved?: (data: { exercise: string; weight: string }) => void;
}

export function RestScreen({
  exerciseName = 'Barbell Squat',
  setNumber = 1,
  restSeconds = 90,
  onTimerEnd,
  onSetSaved,
}: RestScreenProps) {
  const [timer, setTimer] = useState(restSeconds);
  const [showLogPanel, setShowLogPanel] = useState(false);

  // Countdown timer
  useEffect(() => {
    setTimer(restSeconds);
  }, [restSeconds]);

  useEffect(() => {
    if (timer <= 0) {
      onTimerEnd?.();
      return;
    }

    const id = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          onTimerEnd?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [timer, onTimerEnd]);

  // Auto-show panel when rest begins
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogPanel(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleManualLog = () => {
    setShowLogPanel(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-6">
      {/* Rest Timer Card */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Rest Period
            </h1>
            <p className="text-gray-500">
              {exerciseName} • Set {setNumber}
            </p>
          </div>

          {/* Timer Display */}
          <div className="mb-8">
            <div className="text-7xl font-bold text-blue-600 font-mono">
              {formatTime(timer)}
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Take your time to recover
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${((restSeconds - timer) / restSeconds) * 100}%`,
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleManualLog}
              className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              Log Set
            </button>
            <button
              type="button"
              className="w-full h-12 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              Skip Rest
            </button>
          </div>
        </div>

        {/* Coaching Tip */}
        <div className="mt-6 p-4 bg-blue-100 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-blue-900 text-sm mb-1">
                Coaching Tip
              </div>
              <div className="text-blue-800 text-sm">
                Focus on steady breathing and light movement to promote recovery.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-Up Panel with LogSetCard */}
      <SlideUpLogPanel
        show={showLogPanel}
        onClose={() => setShowLogPanel(false)}
        initialExercise={exerciseName}
        initialWeight="95"
      />
    </div>
  );
}

export default RestScreen;
