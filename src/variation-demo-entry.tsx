/**
 * Entry Point for Variation Engine Demo
 *
 * Standalone demo accessible at /variation-demo.html
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import VariationDemo from './screens/VariationDemo';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <VariationDemo />
  </StrictMode>
);
