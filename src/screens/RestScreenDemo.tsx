/**
 * RestScreenDemo Component
 *
 * Demo page for testing the RestScreen with LogSetCard slide-up panel integration.
 * Allows testing different scenarios and configurations.
 *
 * @module screens/RestScreenDemo
 */

import React, { useState } from 'react';
import { RestScreen } from './RestScreen';

export function RestScreenDemo() {
  const [key, setKey] = useState(0);
  const [exerciseName, setExerciseName] = useState('Barbell Squat');
  const [setNumber, setSetNumber] = useState(1);
  const [restSeconds, setRestSeconds] = useState(90);

  const handleReset = () => {
    setKey((prev) => prev + 1);
  };

  const handleTimerEnd = () => {
    console.log('⏰ Timer ended!');
  };

  const handleSetSaved = (data: any) => {
    console.log('💾 Set saved:', data);
    alert(`Set logged!\n\nReps: ${data.reps}\nWeight: ${data.weight} lbs\nEffort: ${data.effort}/10\nNotes: ${data.notes || 'None'}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Control Panel */}
      <div className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Rest Screen + LogSetCard Demo
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Test the slide-up panel integration
              </p>
            </div>

            {/* Configuration Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="exercise" className="block text-sm font-medium text-gray-700 mb-1">
                  Exercise Name
                </label>
                <input
                  id="exercise"
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="setNum" className="block text-sm font-medium text-gray-700 mb-1">
                  Set Number
                </label>
                <input
                  id="setNum"
                  type="number"
                  min="1"
                  value={setNumber}
                  onChange={(e) => setSetNumber(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="rest" className="block text-sm font-medium text-gray-700 mb-1">
                  Rest Time (seconds)
                </label>
                <input
                  id="rest"
                  type="number"
                  min="10"
                  max="600"
                  value={restSeconds}
                  onChange={(e) => setRestSeconds(parseInt(e.target.value) || 90)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Reset Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RestScreen Component */}
      <div key={key}>
        <RestScreen
          exerciseName={exerciseName}
          setNumber={setNumber}
          restSeconds={restSeconds}
          onTimerEnd={handleTimerEnd}
          onSetSaved={handleSetSaved}
        />
      </div>

      {/* Instructions Panel */}
      <div className="fixed bottom-4 right-4 max-w-sm">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            Demo Instructions
          </h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Panel auto-appears after 500ms delay</li>
            <li>• Click "Log Set" to manually show panel</li>
            <li>• Click backdrop to dismiss panel</li>
            <li>• Swipe down to dismiss panel</li>
            <li>• "Save Set" button closes panel</li>
            <li>• Check console for saved data</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default RestScreenDemo;
