/**
 * Demo Entry Point for Plan View Component
 *
 * Standalone demo accessible at /plan-demo.html
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PlanDemo from './screens/PlanDemo';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <PlanDemo />
  </StrictMode>
);
