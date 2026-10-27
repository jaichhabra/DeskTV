import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { report } from './api';
import './styles/tokens.css';
import './styles/app.css';

window.addEventListener('error', (e) => report(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => report(e.reason));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
