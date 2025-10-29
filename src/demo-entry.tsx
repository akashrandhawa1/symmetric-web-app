/**
 * Demo Entry Point for Live Coaching System
 *
 * Standalone demo accessible at /live-coaching-demo.html
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LiveCoachingDemo from './screens/LiveCoachingDemo';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <LiveCoachingDemo />
  </StrictMode>
);
