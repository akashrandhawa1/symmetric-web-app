
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import PlanRevealMinimalDemo from './screens/PlanRevealMinimalDemo';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Check for demo mode via URL parameter
const urlParams = new URLSearchParams(window.location.search);
const isDemoMode = urlParams.get('demo') === 'plan-minimal';

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    {isDemoMode ? <PlanRevealMinimalDemo /> : <App />}
  </StrictMode>
);
