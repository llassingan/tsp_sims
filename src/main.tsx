/**
 * main.tsx — React Application Entry Point
 *
 * Finds the #root element in index.html and renders the <App /> component
 * inside React.StrictMode. StrictMode enables additional development-time
 * checks (double-rendering, deprecated API warnings) without affecting
 * production behavior.
 *
 * Throws if the #root mount point is missing — this is a fatal bootstrap
 * error that indicates a missing or malformed index.html.
 *
 * @module main
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
