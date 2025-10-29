/**
 * Exercise Recommendation Demo Screen
 *
 * Interactive testing UI for the Gemini-powered exercise recommendation system.
 * Allows testing various EMG scenarios and user contexts.
 *
 * @module screens/ExerciseRecommendationDemo
 */

import React, { useState } from 'react';
import { useExerciseRecommendation } from '../hooks/useExerciseRecommendation';
import { ExerciseRecommendationCard, ExerciseRecommendationSkeleton } from '../components/ExerciseRecommendationCard';
import type { EMGDataInput, UserContext } from '../services/exerciseRecommendation';

// ============================================================================
// TEST SCENARIOS
// ============================================================================

type Scenario = {
  id: string;
  name: string;
  description: string;
  emgData: EMGDataInput;
  userContext: UserContext;
};

const TEST_SCENARIOS: Scenario[] = [
  {
    id: 'strong_continue',
    name: 'Strong Performance - Continue',
    description: 'High activation (85%), good RoR, symmetry. Ready for more.',
    emgData: {
      peakRmsPctMvc: 85,
      rateOfRiseMs: 420,
      symmetryPct: 94,
      rmsDropPct: 12,
      rorDropPct: 8,
    },
    userContext: {
      readinessScore: 78,
      currentExercise: 'back_squat',
      currentWeightKg: 100,
      setsCompleted: 2,
    },
  },
  {
    id: 'moderate_continue',
    name: 'Moderate - Need More Load',
    description: 'Low activation (68%), suggesting weight too light.',
    emgData: {
      peakRmsPctMvc: 68,
      rateOfRiseMs: 380,
      symmetryPct: 91,
      rmsDropPct: 8,
    },
    userContext: {
      readinessScore: 72,
      currentExercise: 'back_squat',
      currentWeightKg: 90,
      setsCompleted: 1,
    },
  },
  {
    id: 'fatigued_switch',
    name: 'Fatigued - Switch to Accessory',
    description: 'Readiness <50, high fatigue markers. Need lighter work.',
    emgData: {
      peakRmsPctMvc: 72,
      rateOfRiseMs: 520,
      symmetryPct: 86,
      rmsDropPct: 32,
      rorDropPct: 28,
    },
    userContext: {
      readinessScore: 48,
      currentExercise: 'front_squat',
      currentWeightKg: 85,
      setsCompleted: 4,
    },
  },
  {
    id: 'asymmetry_unilateral',
    name: 'Asymmetry Detected',
    description: 'Poor symmetry (78%). Coach should recommend unilateral work.',
    emgData: {
      peakRmsPctMvc: 76,
      rateOfRiseMs: 450,
      symmetryPct: 78,
      rmsDropPct: 18,
    },
    userContext: {
      readinessScore: 68,
      currentExercise: 'back_squat',
      currentWeightKg: 95,
      setsCompleted: 2,
    },
  },
  {
    id: 'fresh_push',
    name: 'Fresh & Strong - Push Harder',
    description: 'High readiness, good metrics. Room to add load.',
    emgData: {
      peakRmsPctMvc: 88,
      rateOfRiseMs: 390,
      symmetryPct: 95,
      rmsDropPct: 5,
    },
    userContext: {
      readinessScore: 85,
      currentExercise: 'leg_press',
      currentWeightKg: 180,
      setsCompleted: 1,
    },
  },
  {
    id: 'with_labels',
    name: 'User Prefers Split Squats',
    description: 'Historical labels show user responds well to split squats.',
    emgData: {
      peakRmsPctMvc: 74,
      rateOfRiseMs: 440,
      symmetryPct: 89,
    },
    userContext: {
      readinessScore: 70,
      currentExercise: 'back_squat',
      setsCompleted: 3,
      historicalLabels: [
        { exercise: 'split_squat', label: 'felt_strongest' },
        { exercise: 'leg_press', label: 'effective' },
        { exercise: 'back_squat', label: 'moderate' },
      ],
    },
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ExerciseRecommendationDemo() {
  const { recommendation, isLoading, error, isFallback, fetchRecommendation, clear } =
    useExerciseRecommendation();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const handleRunScenario = async (scenario: Scenario) => {
    setSelectedScenario(scenario.id);
    clear();
    await fetchRecommendation(scenario.emgData, scenario.userContext);
  };

  const handleClear = () => {
    clear();
    setSelectedScenario(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Exercise Recommendation Demo</h1>
          <p className="text-gray-400">
            Test Gemini-powered exercise recommendations with various EMG scenarios.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scenarios */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Test Scenarios</h2>
            <div className="space-y-3">
              {TEST_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => handleRunScenario(scenario)}
                  disabled={isLoading}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedScenario === scenario.id
                      ? 'bg-purple-600/20 border-purple-500'
                      : 'bg-gray-800/50 border-gray-700 hover:border-purple-500/50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-semibold text-lg mb-1">{scenario.name}</div>
                  <div className="text-sm text-gray-400 mb-2">{scenario.description}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-blue-900/40 text-blue-300 px-2 py-1 rounded">
                      %MVC: {scenario.emgData.peakRmsPctMvc}%
                    </span>
                    <span className="bg-green-900/40 text-green-300 px-2 py-1 rounded">
                      RoR: {scenario.emgData.rateOfRiseMs}ms
                    </span>
                    <span className="bg-yellow-900/40 text-yellow-300 px-2 py-1 rounded">
                      Sym: {scenario.emgData.symmetryPct}%
                    </span>
                    <span className="bg-purple-900/40 text-purple-300 px-2 py-1 rounded">
                      Readiness: {scenario.userContext.readinessScore}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {recommendation && (
              <button
                onClick={handleClear}
                className="mt-4 w-full py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
              >
                Clear Recommendation
              </button>
            )}
          </div>

          {/* Result */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Recommendation Result</h2>
            {isLoading && <ExerciseRecommendationSkeleton />}
            {error && !isLoading && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
                <div className="text-4xl mb-2">⚠️</div>
                <div className="text-red-300 font-semibold mb-2">Error</div>
                <div className="text-sm text-gray-300">{error}</div>
              </div>
            )}
            {!isLoading && !error && !recommendation && (
              <div className="bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-xl p-12 text-center">
                <div className="text-4xl mb-4 opacity-50">🎯</div>
                <div className="text-gray-400">
                  Select a scenario to see the AI-powered recommendation
                </div>
              </div>
            )}
            {!isLoading && recommendation && (
              <ExerciseRecommendationCard
                recommendation={recommendation}
                onAccept={() => alert('Accepted! This would start the exercise in the real app.')}
                onViewAlternatives={() => alert('View alternatives modal would open here.')}
                isFallback={isFallback}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
