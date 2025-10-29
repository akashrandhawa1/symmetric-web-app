/**
 * Demo Entry Point for Workout Complete Coach Feedback
 *
 * Standalone demo accessible at /workout-complete-demo.html
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkoutCompleteDemo } from './screens/WorkoutCompleteDemo';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <WorkoutCompleteDemo />
  </StrictMode>
);
