/**
 * Demo Entry Point for Exercise Recommendation System
 *
 * Standalone demo accessible at /exercise-recommendation-demo.html
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ExerciseRecommendationDemo } from './screens/ExerciseRecommendationDemo';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <ExerciseRecommendationDemo />
  </StrictMode>
);
