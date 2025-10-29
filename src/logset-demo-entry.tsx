/**
 * LogSetCard Demo Entry Point
 *
 * Standalone demo showing the LogSetCard slide-up panel integration.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { RestScreen } from './screens/RestScreen';

function LogSetDemo() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            LogSetCard Slide-Up Demo
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Watch the panel slide up automatically after 500ms
          </p>
        </div>
      </div>

      {/* Demo Content */}
      <RestScreen
        exerciseName="Barbell Squat"
        setNumber={1}
        restSeconds={90}
        onTimerEnd={() => console.log('⏰ Timer complete!')}
        onSetSaved={(data) => {
          console.log('💾 Set saved:', data);
          alert(`Set logged!\n\nExercise: ${data.exercise}\nWeight: ${data.weight} lb`);
        }}
      />

      {/* Instructions */}
      <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-2">
          Demo Instructions
        </h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>✨ Panel auto-shows after 500ms</li>
          <li>👆 Click "Log Set" to reopen</li>
          <li>🖱️ Click outside to dismiss</li>
          <li>💾 "Save Set" closes panel</li>
          <li>📊 Check console for data</li>
        </ul>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LogSetDemo />
  </React.StrictMode>
);
