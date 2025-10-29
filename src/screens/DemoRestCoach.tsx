/**
 * Demo screen for Rest Screen Coach.
 *
 * Provides a dropdown selector to test different fixture scenarios.
 * Demonstrates the complete RestCoach component with various edge cases.
 *
 * @module screens/DemoRestCoach
 */

import React, { useState } from 'react';
import { RestCoach } from '@/components/coach/RestCoach';
import { allFixtures } from '@/mocks/coachFixtures';

export function DemoRestCoach() {
  const [selectedFixtureIndex, setSelectedFixtureIndex] = useState(0);
  const [key, setKey] = useState(0);

  const currentFixture = allFixtures[selectedFixtureIndex];

  const handleFixtureChange = (index: number) => {
    setSelectedFixtureIndex(index);
    setKey((prev) => prev + 1); // Force remount to trigger new fetch
  };

  const handleDecision = (decision: { decision: 'did' | 'skip' | 'override'; reason_code?: string }) => {
    console.log('User decision:', decision);
    alert(`Decision: ${decision.decision}${decision.reason_code ? ` (${decision.reason_code})` : ''}`);
  };

  const handleTimerEnd = () => {
    console.log('Timer complete!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Fixture Selector */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Rest Screen Coach Demo
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Select a scenario to test the coach component
              </p>
            </div>
            <div className="flex-shrink-0">
              <label htmlFor="fixture-select" className="block text-sm font-medium text-gray-700 mb-1">
                Test Scenario
              </label>
              <select
                id="fixture-select"
                value={selectedFixtureIndex}
                onChange={(e) => handleFixtureChange(Number(e.target.value))}
                className="block w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {allFixtures.map((fixture, index) => (
                  <option key={index} value={index}>
                    {fixture.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Fixture Details Panel */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Scenario: {currentFixture.name}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Request Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Request Context</h3>
              <div className="bg-gray-50 rounded p-3 text-xs font-mono space-y-1">
                <div>
                  <span className="text-gray-600">Set:</span>{' '}
                  <span className="text-gray-900">{currentFixture.request.set_telemetry.set_index}</span>
                </div>
                <div>
                  <span className="text-gray-600">Reps:</span>{' '}
                  <span className="text-gray-900">{currentFixture.request.set_telemetry.rep_count}</span>
                </div>
                <div>
                  <span className="text-gray-600">Fatigue Rep:</span>{' '}
                  <span className="text-gray-900">
                    {currentFixture.request.set_telemetry.fatigue_rep ?? 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Symmetry:</span>{' '}
                  <span className="text-gray-900">
                    {currentFixture.request.set_telemetry.symmetry_pct}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Signal Confidence:</span>{' '}
                  <span className="text-gray-900">
                    {(currentFixture.request.set_telemetry.signal_confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Pain Flag:</span>{' '}
                  <span className="text-gray-900">
                    {currentFixture.request.set_telemetry.pain_flag}/10
                  </span>
                </div>
              </div>
            </div>

            {/* Expected Response Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Expected Advice</h3>
              <div className="bg-gray-50 rounded p-3 text-xs font-mono space-y-1">
                <div>
                  <span className="text-gray-600">Type:</span>{' '}
                  <span className="text-gray-900">{currentFixture.response.advice_type}</span>
                </div>
                <div>
                  <span className="text-gray-600">Effort Δ:</span>{' '}
                  <span className="text-gray-900">{currentFixture.response.effort_delta ?? 'None'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Rest:</span>{' '}
                  <span className="text-gray-900">{currentFixture.response.rest_seconds ?? 'None'}s</span>
                </div>
                <div>
                  <span className="text-gray-600">Confidence:</span>{' '}
                  <span className="text-gray-900">
                    {(currentFixture.response.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                {currentFixture.response.projection && (
                  <div>
                    <span className="text-gray-600">Projection:</span>{' '}
                    <span className="text-gray-900">
                      +{currentFixture.response.projection.delta_hit_rate_pct}%
                      (CI: {(currentFixture.response.projection.ci * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}
                {currentFixture.response.safety.suppress_load_calls && (
                  <div>
                    <span className="text-amber-600 font-semibold">⚠ Safety: Suppress Load Calls</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              {currentFixture.response.telemetry_tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RestCoach Component */}
      <div key={key}>
        <RestCoach
          request={currentFixture.request}
          onDecision={handleDecision}
          onTimerEnd={handleTimerEnd}
        />
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Demo Instructions
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Select different scenarios from the dropdown to test various edge cases</li>
            <li>• Watch the timer countdown and observe button interactions</li>
            <li>• Click "Skip" or "Do anyway" on scenarios that ask for reasons to test the modal</li>
            <li>• Check browser console for telemetry event logs</li>
            <li>• Projection chips appear only when CI ≥ 0.7</li>
            <li>• Safety banners show for check_signal advice or when suppress_load_calls is true</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DemoRestCoach;
