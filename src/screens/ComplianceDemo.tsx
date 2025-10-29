/**
 * Compliance Engine Demo/Test Screen
 *
 * Interactive demo to test the compliance engine with different scenarios.
 * Access via: updateAppScreen('complianceDemo')
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { scoreCompliance, type CoachAsk, type SetSnapshot } from '../lib/compliance';
import { ComplianceToast, useComplianceToast } from '../components/ComplianceToast';

type Scenario = {
  name: string;
  description: string;
  asks: CoachAsk[];
  before: SetSnapshot;
  after: SetSnapshot;
};

const scenarios: Scenario[] = [
  {
    name: '✅ Perfect Compliance',
    description: 'Coach asks +2.5%, user applies it and hits target window',
    asks: [{ kind: 'weight', deltaPct: 2.5 }],
    before: { loadKg: 100, reps: 6, rir: 2 },
    after: { loadKg: 102.5, reps: 5, rir: 1 },
  },
  {
    name: '✅ Self-Adjust Success',
    description: 'Coach asks -5%, user keeps same weight but hits target (good instinct)',
    asks: [{ kind: 'weight', deltaPct: -5 }],
    before: { loadKg: 100, reps: 3, rir: 0 },
    after: { loadKg: 100, reps: 5, rir: 1 },
  },
  {
    name: '❌ Wrong Weight + Missed Target',
    description: 'Coach asks +2.5%, user goes too heavy (110kg) and fails',
    asks: [{ kind: 'weight', deltaPct: 2.5 }],
    before: { loadKg: 100, reps: 6, rir: 2 },
    after: { loadKg: 110, reps: 3, rir: 0 },
  },
  {
    name: '⚠️ Went Too Light',
    description: 'Coach asks +2.5%, user applies it but has too many reps left',
    asks: [{ kind: 'weight', deltaPct: 2.5 }],
    before: { loadKg: 100, reps: 6, rir: 2 },
    after: { loadKg: 102.5, reps: 8, rir: 4 },
  },
  {
    name: '💪 With EMG Data',
    description: 'Perfect compliance with EMG corroboration',
    asks: [{ kind: 'weight', deltaPct: 2.5 }],
    before: { loadKg: 100, reps: 6, rir: 2 },
    after: { loadKg: 102.5, reps: 5, rir: 1, rmsDropPct: 25, rorDropPct: 30 },
  },
  {
    name: '🏋️ Dumbbell Tolerance',
    description: 'Fixed dumbbell with nearest available size (22.5kg instead of 21kg)',
    asks: [{ kind: 'weight', deltaPct: 5 }],
    before: { loadKg: 20, reps: 6, rir: 2, implementIsFixedDumbbell: true },
    after: { loadKg: 22.5, reps: 5, rir: 1, implementIsFixedDumbbell: true },
  },
  {
    name: '⏱️ Weight + Rest',
    description: 'Multiple asks: weight change and rest duration',
    asks: [
      { kind: 'weight', deltaPct: 2.5 },
      { kind: 'rest', seconds: 120 },
    ],
    before: { loadKg: 100, reps: 6, rir: 2 },
    after: { loadKg: 102.5, reps: 5, rir: 1, restSec: 115 },
  },
];

export const ComplianceDemoScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [result, setResult] = useState<ReturnType<typeof scoreCompliance> | null>(null);
  const { toast, showToast, dismissToast } = useComplianceToast();

  const runScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    const complianceResult = scoreCompliance(scenario.asks, scenario.before, scenario.after);
    setResult(complianceResult);

    // Show toast
    const outcome: 'hit' | 'early' | 'late' | 'under' = (() => {
      const { reps, rir = 3 } = scenario.after;
      if (reps >= 5 && reps <= 6 && rir <= 2) return 'hit';
      if (reps < 5) return 'under';
      if (reps > 8) return 'late';
      return 'early';
    })();

    const weightAsk = scenario.asks.find(a => a.kind === 'weight') as Extract<CoachAsk, { kind: 'weight' }> | undefined;

    showToast(
      complianceResult.listened ? 'success' : 'neutral',
      {
        exercise: 'Squat',
        changePct: weightAsk?.deltaPct ?? 0,
        reps: scenario.after.reps,
        rir: scenario.after.rir,
        outcome,
        lockedInKg: complianceResult.listened ? scenario.after.loadKg : undefined,
      }
    );
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getFacetColor = (score: number): string => {
    if (score === -1) return 'bg-gray-700 text-gray-400';
    if (score >= 80) return 'bg-emerald-900/50 text-emerald-300 border-emerald-500/30';
    if (score >= 70) return 'bg-green-900/50 text-green-300 border-green-500/30';
    if (score >= 50) return 'bg-yellow-900/50 text-yellow-300 border-yellow-500/30';
    return 'bg-red-900/50 text-red-300 border-red-500/30';
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold">Compliance Engine Test</h1>
          <p className="text-sm text-gray-400">Interactive demo with 7 scenarios</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scenarios.map((scenario, idx) => (
            <motion.button
              key={idx}
              onClick={() => runScenario(scenario)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selectedScenario === scenario
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <h3 className="font-semibold mb-1">{scenario.name}</h3>
              <p className="text-xs text-gray-400">{scenario.description}</p>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="px-2 py-1 bg-gray-700 rounded">
                  {scenario.before.loadKg}kg → {scenario.after.loadKg}kg
                </span>
                <span className="px-2 py-1 bg-gray-700 rounded">
                  {scenario.after.reps} reps
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Results */}
        {result && selectedScenario && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4"
          >
            {/* Score Card */}
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">
                    {result.listened ? '✅ Listened' : '❌ Did Not Listen'}
                  </h2>
                  <p className="text-sm text-gray-400">
                    Overall Score: <span className={`font-bold text-lg ${getScoreColor(result.score)}`}>
                      {result.score}/100
                    </span>
                  </p>
                </div>
                <div className="text-6xl">{result.listened ? '🎯' : '⚠️'}</div>
              </div>

              {/* Facets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {Object.entries(result.facets).map(([facet, score]) => (
                  <div
                    key={facet}
                    className={`p-3 rounded-lg border ${getFacetColor(score)}`}
                  >
                    <div className="text-xs uppercase font-semibold mb-1 opacity-75">
                      {facet}
                    </div>
                    <div className="text-2xl font-bold">
                      {score === -1 ? 'N/A' : score}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reasons */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase text-gray-400">Detailed Breakdown:</h3>
                {result.reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-gray-800/50 rounded text-sm font-mono"
                  >
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            {/* Set Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold uppercase text-gray-400 mb-3">Before Set</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-400">Load:</span> {selectedScenario.before.loadKg}kg</div>
                  <div><span className="text-gray-400">Reps:</span> {selectedScenario.before.reps}</div>
                  <div><span className="text-gray-400">RIR:</span> {selectedScenario.before.rir ?? 'N/A'}</div>
                </div>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold uppercase text-gray-400 mb-3">After Set</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-400">Load:</span> {selectedScenario.after.loadKg}kg</div>
                  <div><span className="text-gray-400">Reps:</span> {selectedScenario.after.reps}</div>
                  <div><span className="text-gray-400">RIR:</span> {selectedScenario.after.rir ?? 'N/A'}</div>
                  {selectedScenario.after.rmsDropPct && (
                    <div><span className="text-gray-400">RMS:</span> {selectedScenario.after.rmsDropPct}%</div>
                  )}
                  {selectedScenario.after.restSec && (
                    <div><span className="text-gray-400">Rest:</span> {selectedScenario.after.restSec}s</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        {!result && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">🧪</div>
            <h3 className="text-lg font-semibold mb-2">Select a Scenario Above</h3>
            <p className="text-sm text-gray-400">
              Click any scenario to see how the compliance engine scores it.
              Watch for the toast notification at the top!
            </p>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <ComplianceToast
          mode={toast.mode}
          slots={toast.slots}
          onDismiss={dismissToast}
          autoDismissMs={8000}
        />
      )}
    </div>
  );
};
